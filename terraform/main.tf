locals {
  ghcr_image              = "ghcr.io/${var.github_owner}/dataform-sentinel:${var.image_version}"
  artifact_registry_image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/dataform-sentinel:${var.image_version}"

  resolved_image = (
    var.image_source == "ghcr" ? local.ghcr_image :
    var.image_source == "artifact_registry" ? local.artifact_registry_image :
    var.custom_image
  )
}

# Conditionally create an Artifact Registry repo when using internal image hosting.
resource "google_artifact_registry_repository" "sentinel" {
  count = var.image_source == "artifact_registry" ? 1 : 0

  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_registry_repo
  format        = "DOCKER"
  description   = "Container images for dataform-sentinel"
}

# Service account used by Cloud Run.
resource "google_service_account" "sentinel" {
  project      = var.project_id
  account_id   = var.service_name
  display_name = "Dataform Sentinel service account"
}

# Roles the Sentinel SA needs on every monitored Dataform project.
#  - dataform.editor:    list + get + create workflow invocations (Run / Rerun).
#  - bigquery.jobUser:   the pipeline it triggers can create BQ jobs.
#  - bigquery.dataEditor: the pipeline can read source tables + write target
#                         tables. Narrow to specific datasets if desired.
locals {
  sentinel_project_roles = [
    "roles/dataform.editor",
    "roles/bigquery.jobUser",
    "roles/bigquery.dataEditor",
  ]
  sentinel_bindings = {
    for pair in flatten([
      for p in var.dataform_projects : [
        for r in local.sentinel_project_roles : {
          project = p
          role    = r
        }
      ]
    ]) : "${pair.project}/${pair.role}" => pair
  }
}

resource "google_project_iam_member" "sentinel_project_roles" {
  for_each = local.sentinel_bindings

  project = each.value.project
  role    = each.value.role
  member  = "serviceAccount:${google_service_account.sentinel.email}"
}

# Self-impersonation: strict-act-as requires the caller (Sentinel, running as
# this SA) to be able to impersonate the same SA as invocation actor.
resource "google_service_account_iam_member" "self_impersonation" {
  service_account_id = google_service_account.sentinel.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.sentinel.email}"
}

# Enable the Dataform API on every target project so the service agent exists.
resource "google_project_service" "dataform" {
  for_each = toset(var.dataform_projects)

  project                    = each.value
  service                    = "dataform.googleapis.com"
  disable_on_destroy         = false
  disable_dependent_services = false
}

# Look up each project's number so we can reference its Dataform service agent.
data "google_project" "dataform" {
  for_each = toset(var.dataform_projects)

  project_id = each.value
}

# Allow each project's Dataform service agent to mint tokens for the Sentinel
# SA. Required because Dataform executes pipelines as the SA we pass in
# InvocationConfig, which means its own agent must be able to mint auth tokens
# for it. Without this, every invocation fails with:
#   "service-<N>@gcp-sa-dataform does not have permission to generate tokens
#    for <sentinel-sa>"
resource "google_service_account_iam_member" "dataform_agent_token_creator" {
  for_each = toset(var.dataform_projects)

  service_account_id = google_service_account.sentinel.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.dataform[each.key].number}@gcp-sa-dataform.iam.gserviceaccount.com"

  depends_on = [google_project_service.dataform]
}

# Store config.yaml as a secret and mount it into the container.
resource "google_secret_manager_secret" "config" {
  project   = var.project_id
  secret_id = "${var.service_name}-config"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "config" {
  secret      = google_secret_manager_secret.config.id
  secret_data = file(var.config_yaml_path)
}

resource "google_secret_manager_secret_iam_member" "accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.config.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.sentinel.email}"
}

resource "google_cloud_run_v2_service" "sentinel" {
  project  = var.project_id
  name     = var.service_name
  location = var.region
  ingress  = var.ingress

  template {
    service_account = google_service_account.sentinel.email

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count
    }

    containers {
      image = local.resolved_image

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "SENTINEL_CONFIG_PATH"
        value = "/etc/sentinel/config.yaml"
      }
      env {
        name  = "LOG_LEVEL"
        value = var.log_level
      }

      # When the project enforces strict IAM act-as, Dataform invocations need
      # an explicit service account. By default we use the same SA the service
      # runs as (it already has roles/dataform.editor on every target project).
      env {
        name  = "SENTINEL_SERVICE_ACCOUNT"
        value = google_service_account.sentinel.email
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        # CPU always allocated when min_instance_count > 0.
        cpu_idle          = var.min_instance_count == 0
        startup_cpu_boost = true
      }

      volume_mounts {
        name       = "config"
        mount_path = "/etc/sentinel"
      }

      startup_probe {
        initial_delay_seconds = 3
        period_seconds        = 5
        failure_threshold     = 6
        timeout_seconds       = 3
        http_get {
          path = "/api/health"
        }
      }

      liveness_probe {
        period_seconds  = 30
        timeout_seconds = 5
        http_get {
          path = "/api/health"
        }
      }
    }

    volumes {
      name = "config"
      secret {
        secret       = google_secret_manager_secret.config.secret_id
        default_mode = 0444
        items {
          version = "latest"
          path    = "config.yaml"
          mode    = 0444
        }
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.accessor,
  ]
}

# Optional: grant roles/run.invoker to the configured members.
resource "google_cloud_run_v2_service_iam_member" "invokers" {
  for_each = toset(var.invoker_members)

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.sentinel.name
  role     = "roles/run.invoker"
  member   = each.value
}
