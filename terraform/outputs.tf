output "service_url" {
  description = "Public (or internal) URL of the Cloud Run service."
  value       = google_cloud_run_v2_service.sentinel.uri
}

output "service_account_email" {
  description = "Service account used by the Cloud Run service."
  value       = google_service_account.sentinel.email
}

output "resolved_image" {
  description = "Image actually deployed — useful when debugging image-source selection."
  value       = local.resolved_image
}
