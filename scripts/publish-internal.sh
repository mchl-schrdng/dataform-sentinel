#!/usr/bin/env bash
#
# Build and push the dataform-sentinel image to a private Artifact Registry
# in your own GCP project.
#
# Usage:
#   scripts/publish-internal.sh <project_id> <region> <ar_repo> <version>
#
set -euo pipefail

PROJECT_ID="${1:?project_id required}"
REGION="${2:?region required}"
AR_REPO="${3:?ar_repo required}"
VERSION="${4:?version required}"

IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/dataform-sentinel"

echo "▶ Ensuring Artifact Registry repo exists: $AR_REPO ($REGION)"
gcloud artifacts repositories describe "$AR_REPO" \
  --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1 \
  || gcloud artifacts repositories create "$AR_REPO" \
       --repository-format=docker \
       --location="$REGION" \
       --project="$PROJECT_ID"

echo "▶ Authenticating docker"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "▶ Building image: ${IMAGE_BASE}:${VERSION}"
docker build -t "${IMAGE_BASE}:${VERSION}" -t "${IMAGE_BASE}:latest" .

echo "▶ Pushing"
docker push "${IMAGE_BASE}:${VERSION}"
docker push "${IMAGE_BASE}:latest"

echo ""
echo "✓ Pushed ${IMAGE_BASE}:${VERSION}"
echo "✓ Pushed ${IMAGE_BASE}:latest"
