#!/usr/bin/env bash
#
# Dataform Sentinel — interactive installer.
# Writes config.yaml and terraform/terraform.tfvars based on your answers.
#
set -euo pipefail

if [[ ${BASH_VERSINFO[0]:-0} -lt 4 ]]; then
  echo "This script requires bash 4+." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

say()  { printf "\033[1;36m▶\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m!\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
die()  { printf "\033[1;31m✗\033[0m %s\n" "$*" >&2; exit 1; }

prompt() {
  local label="$1" default="${2-}" answer
  if [[ -n "$default" ]]; then
    read -r -p "$label [$default]: " answer
    echo "${answer:-$default}"
  else
    read -r -p "$label: " answer
    echo "$answer"
  fi
}

prompt_required() {
  local label="$1" default="${2-}" answer
  while true; do
    answer="$(prompt "$label" "$default")"
    if [[ -n "$answer" ]]; then
      echo "$answer"
      return
    fi
    warn "Value required."
  done
}

check_prereqs() {
  say "Checking prerequisites"
  command -v gcloud    >/dev/null || die "gcloud not found"
  command -v terraform >/dev/null || die "terraform not found"
  gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q . \
    || die "Run: gcloud auth login"
  ok "gcloud and terraform are available"
}

enable_apis() {
  local proj="$1"
  say "Enabling required APIs on project: $proj"
  gcloud services enable --project "$proj" \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    dataform.googleapis.com \
    iamcredentials.googleapis.com
}

main() {
  check_prereqs

  say "1/5  General settings"
  PROJECT_ID="$(prompt_required 'Host project ID for Cloud Run')"
  REGION="$(prompt_required 'Region' 'europe-west1')"
  SERVICE_NAME="$(prompt_required 'Cloud Run service name' 'dataform-sentinel')"

  say "2/5  Image source"
  echo "  [1] Public GHCR image  (recommended for open-source)"
  echo "  [2] Internal Artifact Registry  (push from this machine)"
  echo "  [3] Custom image URL"
  IMAGE_CHOICE="$(prompt 'Choose 1, 2, or 3' '1')"
  case "$IMAGE_CHOICE" in
    1) IMAGE_SOURCE=ghcr
       GITHUB_OWNER="$(prompt_required 'GitHub owner (the one who published the image)')"
       IMAGE_VERSION="$(prompt 'Image tag' 'latest')"
       CUSTOM_IMAGE=""
       AR_REPO=""
       ;;
    2) IMAGE_SOURCE=artifact_registry
       AR_REPO="$(prompt 'Artifact Registry repo name' 'dataform-sentinel')"
       IMAGE_VERSION="$(prompt 'Image tag' 'v0.1.0')"
       GITHUB_OWNER=""
       CUSTOM_IMAGE=""
       ;;
    3) IMAGE_SOURCE=custom
       CUSTOM_IMAGE="$(prompt_required 'Full image URL incl. tag')"
       IMAGE_VERSION=""
       AR_REPO=""
       GITHUB_OWNER=""
       ;;
    *) die "Invalid choice: $IMAGE_CHOICE" ;;
  esac

  say "3/5  Dataform targets"
  DATAFORM_PROJECTS_CSV="$(prompt_required 'Dataform project IDs (comma-separated)')"
  INVOKERS_CSV="$(prompt 'IAM invoker members (comma-separated, blank for none)' '')"
  REFRESH="$(prompt 'UI refresh interval (seconds)' '30')"

  say "4/5  Repository list"
  TARGETS=()
  while true; do
    echo "  Add a repository to monitor? (y/n)"
    read -r -p "  > " MORE
    case "${MORE:-y}" in
      y|Y)
        KEY="$(prompt_required '    key (lowercase/digits/hyphens)')"
        NAME="$(prompt_required '    display name')"
        PROJ="$(prompt_required '    project_id')"
        LOC="$(prompt_required '    location' "$REGION")"
        REPO="$(prompt_required '    repository')"
        TARGETS+=("$KEY|$NAME|$PROJ|$LOC|$REPO")
        ;;
      *) break ;;
    esac
  done
  [[ ${#TARGETS[@]} -gt 0 ]] || die "At least one repository is required."

  enable_apis "$PROJECT_ID"
  for p in ${DATAFORM_PROJECTS_CSV//,/ }; do
    enable_apis "$p"
  done

  say "5/5  Writing files"
  CONFIG_PATH="$REPO_DIR/config.yaml"
  {
    echo "refresh_interval_seconds: $REFRESH"
    echo ""
    echo "targets:"
    for row in "${TARGETS[@]}"; do
      IFS='|' read -r KEY NAME PROJ LOC REPO <<< "$row"
      echo "  - key: $KEY"
      echo "    display_name: \"$NAME\""
      echo "    project_id: $PROJ"
      echo "    location: $LOC"
      echo "    repository: $REPO"
    done
  } > "$CONFIG_PATH"
  ok "Wrote $CONFIG_PATH"

  TFVARS_PATH="$REPO_DIR/terraform/terraform.tfvars"
  {
    echo "project_id   = \"$PROJECT_ID\""
    echo "region       = \"$REGION\""
    echo "service_name = \"$SERVICE_NAME\""
    echo ""
    echo "image_source = \"$IMAGE_SOURCE\""
    [[ -n "$GITHUB_OWNER" ]] && echo "github_owner = \"$GITHUB_OWNER\""
    [[ -n "$AR_REPO"      ]] && echo "artifact_registry_repo = \"$AR_REPO\""
    [[ -n "$CUSTOM_IMAGE" ]] && echo "custom_image = \"$CUSTOM_IMAGE\""
    [[ -n "$IMAGE_VERSION" ]] && echo "image_version = \"$IMAGE_VERSION\""
    echo ""
    echo "config_yaml_path = \"../config.yaml\""
    echo ""
    printf 'dataform_projects = ['
    IFS=',' read -ra DPA <<< "$DATAFORM_PROJECTS_CSV"
    for i in "${!DPA[@]}"; do
      p="${DPA[$i]// /}"
      [[ $i -gt 0 ]] && printf ", "
      printf '"%s"' "$p"
    done
    echo "]"
    if [[ -n "$INVOKERS_CSV" ]]; then
      printf 'invoker_members = ['
      IFS=',' read -ra INVS <<< "$INVOKERS_CSV"
      for i in "${!INVS[@]}"; do
        v="${INVS[$i]// /}"
        [[ $i -gt 0 ]] && printf ", "
        printf '"%s"' "$v"
      done
      echo "]"
    fi
    echo ""
    echo "min_instance_count = 0"
    echo "max_instance_count = 3"
    echo "ingress            = \"INGRESS_TRAFFIC_INTERNAL_ONLY\""
    echo "log_level          = \"info\""
  } > "$TFVARS_PATH"
  ok "Wrote $TFVARS_PATH"

  if [[ "$IMAGE_SOURCE" == "artifact_registry" ]]; then
    say "Publishing image to Artifact Registry"
    "$SCRIPT_DIR/publish-internal.sh" "$PROJECT_ID" "$REGION" "$AR_REPO" "$IMAGE_VERSION"
  fi

  say "Next steps"
  echo "  cd terraform"
  echo "  terraform init"
  echo "  terraform apply"
  echo ""
  RUN_NOW="$(prompt 'Run terraform apply now? (y/n)' 'n')"
  if [[ "$RUN_NOW" =~ ^[Yy]$ ]]; then
    (cd "$REPO_DIR/terraform" && terraform init && terraform apply)
  fi
}

main "$@"
