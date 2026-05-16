#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP_PATH="${ROOT_DIR}/.azure-deploy/pet-log-web.zip"

usage() {
  echo "Usage: npm run azure:deploy -- <resource-group> <app-name> [subscription]" >&2
}

RESOURCE_GROUP="${1:-}"
APP_NAME="${2:-}"
SUBSCRIPTION="${3:-}"

if [ -z "${RESOURCE_GROUP}" ] || [ -z "${APP_NAME}" ]; then
  usage
  exit 1
fi

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is required. Install it and run az login first." >&2
  exit 1
fi

if [ -n "${SUBSCRIPTION}" ]; then
  az account set --subscription "${SUBSCRIPTION}"
fi

bash "${ROOT_DIR}/scripts/azure-package.sh"

az webapp config set \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${APP_NAME}" \
  --startup-file "node server.js" \
  --output none

az webapp deploy \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${APP_NAME}" \
  --src-path "${ZIP_PATH}" \
  --type zip

echo "Deployed to: https://${APP_NAME}.azurewebsites.net"
