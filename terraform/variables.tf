variable "project_id" {
  description = "GCP project that hosts the Cloud Run service."
  type        = string
}

variable "region" {
  description = "Region for Cloud Run, Secret Manager, and Artifact Registry."
  type        = string
  default     = "europe-west1"
}

variable "service_name" {
  description = "Cloud Run service name."
  type        = string
  default     = "dataform-sentinel"
}

variable "image_source" {
  description = "Where to pull the container image: 'ghcr', 'artifact_registry', or 'custom'."
  type        = string
  default     = "ghcr"

  validation {
    condition     = contains(["ghcr", "artifact_registry", "custom"], var.image_source)
    error_message = "image_source must be one of: ghcr, artifact_registry, custom."
  }
}

variable "image_version" {
  description = "Image tag to deploy (ignored when image_source = 'custom')."
  type        = string
  default     = "latest"
}

variable "github_owner" {
  description = "GitHub owner for GHCR image (used when image_source = 'ghcr')."
  type        = string
  default     = ""
}

variable "artifact_registry_repo" {
  description = "Artifact Registry repository name (used when image_source = 'artifact_registry')."
  type        = string
  default     = "dataform-sentinel"
}

variable "custom_image" {
  description = "Full image reference, including tag (used when image_source = 'custom')."
  type        = string
  default     = ""
}

variable "config_yaml_path" {
  description = "Local path to the config.yaml that will be uploaded to Secret Manager."
  type        = string
}

variable "dataform_projects" {
  description = "GCP project IDs where the service account needs roles/dataform.editor."
  type        = list(string)
}

variable "min_instance_count" {
  description = "Minimum Cloud Run instances."
  type        = number
  default     = 0
}

variable "max_instance_count" {
  description = "Maximum Cloud Run instances."
  type        = number
  default     = 3
}

variable "ingress" {
  description = "Cloud Run ingress setting."
  type        = string
  default     = "INGRESS_TRAFFIC_INTERNAL_ONLY"
}

variable "invoker_members" {
  description = "IAM members granted roles/run.invoker on the service (e.g. user:alice@example.com)."
  type        = list(string)
  default     = []
}

variable "refresh_interval_seconds" {
  description = "Polling cadence surfaced to clients. Matches config.yaml."
  type        = number
  default     = 30
}

variable "log_level" {
  description = "LOG_LEVEL env var."
  type        = string
  default     = "info"
}
