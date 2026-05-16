#!/usr/bin/env bash
set -euo pipefail

# backend/scripts/azure-deploy.sh
# 펫로그 백엔드(FastAPI) Azure App Service 배포 실행 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ZIP_PATH="${ROOT_DIR}/.azure-deploy/pet-log-backend.zip"

usage() {
  echo "Usage: bash scripts/azure-deploy.sh <resource-group> <app-name> [subscription]" >&2
  echo "Example: bash scripts/azure-deploy.sh pet-log-rg pet-log-backend-kp 'Azure for Students'" >&2
}

RESOURCE_GROUP="${1:-}"
APP_NAME="${2:-}"
SUBSCRIPTION="${3:-}"

if [ -z "${RESOURCE_GROUP}" ] || [ -z "${APP_NAME}" ]; then
  usage
  exit 1
fi

if ! command -v az >/dev/null 2>&1; then
  echo "Error: Azure CLI is required. Install it and run 'az login' first." >&2
  exit 1
fi

# 1. 구독 설정 (제공된 경우)
if [ -n "${SUBSCRIPTION}" ]; then
  echo "Setting Azure subscription to: ${SUBSCRIPTION}"
  az account set --subscription "${SUBSCRIPTION}"
fi

# 2. 패키징 실행
bash "${SCRIPT_DIR}/azure-package.sh"

# 3. 배포 실행
echo "Deploying to Azure App Service: ${APP_NAME}..."

# Python용 Startup command 설정 (Gunicorn 사용)
# --startup-file에 직접 명령어를 넣거나 Azure Portal에서 설정 가능
STARTUP_CMD="gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app"

echo "Setting startup command: ${STARTUP_CMD}"
az webapp config set \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${APP_NAME}" \
  --startup-file "${STARTUP_CMD}" \
  --output none

# ZIP 배포
az webapp deploy \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${APP_NAME}" \
  --src-path "${ZIP_PATH}" \
  --type zip

echo "--- Backend Deployed Successfully ---"
echo "URL: https://${APP_NAME}.azurewebsites.net"
echo "Health Check: https://${APP_NAME}.azurewebsites.net/health"
