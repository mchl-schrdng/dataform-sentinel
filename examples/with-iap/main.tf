#
# Optional example: put the Cloud Run service behind a global HTTPS Load Balancer
# with Identity-Aware Proxy (IAP). Suitable for enterprise deployments.
#
# Prerequisites:
#  1. The root module from ../../terraform/ has already been applied so the
#     Cloud Run service exists.
#  2. You have an OAuth consent screen configured in the same project.
#  3. You have a domain whose A/AAAA record you can point at the LB IP.
#

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.20, < 7.0"
    }
  }
}

variable "project_id"      { type = string }
variable "region"          { type = string, default = "europe-west1" }
variable "service_name"    { type = string, default = "dataform-sentinel" }
variable "domain"          { type = string }
variable "iap_support_email" { type = string }
variable "iap_members" {
  description = "Members (user: / group:) allowed through IAP."
  type        = list(string)
  default     = []
}

data "google_cloud_run_v2_service" "sentinel" {
  project  = var.project_id
  location = var.region
  name     = var.service_name
}

resource "google_compute_region_network_endpoint_group" "sentinel" {
  project               = var.project_id
  region                = var.region
  name                  = "${var.service_name}-neg"
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = var.service_name
  }
}

resource "google_iap_brand" "default" {
  project           = var.project_id
  support_email     = var.iap_support_email
  application_title = "Dataform Sentinel"
}

resource "google_iap_client" "default" {
  display_name = "Dataform Sentinel"
  brand        = google_iap_brand.default.name
}

resource "google_compute_backend_service" "sentinel" {
  project               = var.project_id
  name                  = "${var.service_name}-backend"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  protocol              = "HTTPS"

  backend {
    group = google_compute_region_network_endpoint_group.sentinel.id
  }

  iap {
    enabled              = true
    oauth2_client_id     = google_iap_client.default.client_id
    oauth2_client_secret = google_iap_client.default.secret
  }
}

resource "google_compute_url_map" "sentinel" {
  project         = var.project_id
  name            = "${var.service_name}-urlmap"
  default_service = google_compute_backend_service.sentinel.id
}

resource "google_compute_managed_ssl_certificate" "sentinel" {
  project = var.project_id
  name    = "${var.service_name}-cert"
  managed {
    domains = [var.domain]
  }
}

resource "google_compute_target_https_proxy" "sentinel" {
  project          = var.project_id
  name             = "${var.service_name}-proxy"
  url_map          = google_compute_url_map.sentinel.id
  ssl_certificates = [google_compute_managed_ssl_certificate.sentinel.id]
}

resource "google_compute_global_address" "sentinel" {
  project = var.project_id
  name    = "${var.service_name}-ip"
}

resource "google_compute_global_forwarding_rule" "sentinel" {
  project               = var.project_id
  name                  = "${var.service_name}-fr"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  target                = google_compute_target_https_proxy.sentinel.id
  ip_address            = google_compute_global_address.sentinel.address
  port_range            = "443"
}

resource "google_iap_web_backend_service_iam_member" "accessors" {
  for_each = toset(var.iap_members)

  project             = var.project_id
  web_backend_service = google_compute_backend_service.sentinel.name
  role                = "roles/iap.httpsResourceAccessor"
  member              = each.value
}

output "load_balancer_ip" {
  value = google_compute_global_address.sentinel.address
}

output "url" {
  value = "https://${var.domain}"
}
