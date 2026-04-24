# Terraform module — Dataform Sentinel

This module provisions a minimal, private Cloud Run deployment of Dataform Sentinel.

It creates:

- A dedicated service account
- `roles/dataform.editor` on every Dataform project listed in `dataform_projects`
- A Secret Manager secret holding your `config.yaml`
- A Cloud Run v2 service with the config mounted at `/etc/sentinel/config.yaml`
- (Optionally) an Artifact Registry repository when `image_source = "artifact_registry"`

Load balancing and IAP are **not** part of this module — see `examples/with-iap/`.

## Quickstart

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars
terraform init
terraform apply
```

Outputs:

| Output | Description |
| --- | --- |
| `service_url` | Cloud Run URL (may be internal-only depending on `ingress`) |
| `service_account_email` | SA used by the service |
| `resolved_image` | The image reference actually deployed |

## Variables

| Variable | Type | Default | Description |
| --- | --- | --- | --- |
| `project_id` | string | — | GCP project hosting the Cloud Run service |
| `region` | string | `europe-west1` | Region for Cloud Run, SM, AR |
| `service_name` | string | `dataform-sentinel` | Cloud Run service name |
| `image_source` | string | `ghcr` | `ghcr`, `artifact_registry`, or `custom` |
| `image_version` | string | `latest` | Tag, used when `image_source` ≠ `custom` |
| `github_owner` | string | — | Required when `image_source = "ghcr"` |
| `artifact_registry_repo` | string | `dataform-sentinel` | Required when `image_source = "artifact_registry"` |
| `custom_image` | string | — | Full image URL, required when `image_source = "custom"` |
| `config_yaml_path` | string | — | Local path to your `config.yaml` |
| `dataform_projects` | list(string) | — | Projects that need `roles/dataform.editor` |
| `min_instance_count` | number | `0` | |
| `max_instance_count` | number | `3` | |
| `ingress` | string | `INGRESS_TRAFFIC_INTERNAL_ONLY` | |
| `invoker_members` | list(string) | `[]` | IAM members granted `roles/run.invoker` |
| `refresh_interval_seconds` | number | `30` | Cosmetic — must match your `config.yaml` |
| `log_level` | string | `info` | Pino log level |

## Persona examples

### Public self-host (GHCR)

```hcl
project_id        = "my-project"
image_source      = "ghcr"
github_owner      = "awesome-org"
dataform_projects = ["my-project"]
config_yaml_path  = "../config.yaml"
```

### Internal hosting (Artifact Registry)

```hcl
project_id            = "my-project"
image_source          = "artifact_registry"
artifact_registry_repo = "dataform-sentinel"
image_version          = "v0.1.0"
dataform_projects      = ["my-project"]
config_yaml_path       = "../config.yaml"
```

Before `terraform apply`, push your image with `scripts/publish-internal.sh`.

### Custom image

```hcl
project_id        = "my-project"
image_source      = "custom"
custom_image      = "us-central1-docker.pkg.dev/my-project/internal/sentinel:v0.1.0"
dataform_projects = ["my-project"]
config_yaml_path  = "../config.yaml"
```

## Required IAM for the operator running `terraform apply`

- `roles/run.admin` on `project_id`
- `roles/iam.serviceAccountAdmin` on `project_id`
- `roles/secretmanager.admin` on `project_id`
- `roles/artifactregistry.admin` on `project_id` (only for `artifact_registry` mode)
- `roles/resourcemanager.projectIamAdmin` on every project in `dataform_projects`
