#!/usr/bin/env bash
set -euo pipefail

# backend/scripts/deploy-docker.sh
# 로컬 도커를 사용하여 Azure ACR로 이미지 빌드 및 배포하는 스크립트

RESOURCE_GROUP="pet-log-rg"
ACR_NAME="petlogregkp"
IMAGE_NAME="pet-log-backend"
TAG="latest"
APP_NAME="pet-log-backend-v2" # v2로 업데이트

echo "--- 1. Azure ACR 로그인 ---"
az acr login --name "${ACR_NAME}"

echo "--- 2. 로컬 도커 이미지 빌드 (Azure용 amd64 플랫폼 강제) ---"
# Apple Silicon Mac에서도 Azure(amd64)에서 돌아가도록 플랫폼 지정
docker build --platform linux/amd64 -t "${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${TAG}" .

echo "--- 3. ACR로 이미지 푸시 ---"
docker push "${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${TAG}"

# 관리자 계정 활성화 및 비밀번호 가져오기
az acr update -n "${ACR_NAME}" --admin-enabled true
ACR_PASSWORD=$(az acr credential show --name "${ACR_NAME}" --query "passwords[0].value" -o tsv)

echo "--- 4. Azure Web App for Containers 생성 또는 업데이트 ---"
# 앱 서비스가 이미 존재하는지 확인
if ! az webapp show --name "${APP_NAME}" --resource-group "${RESOURCE_GROUP}" > /dev/null 2>&1; then
  echo "앱 서비스가 없습니다. 새로 생성합니다: ${APP_NAME}"
  az webapp create \
    --resource-group "${RESOURCE_GROUP}" \
    --plan "${PLAN_NAME}" \
    --name "${APP_NAME}" \
    --deployment-container-image-name "${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${TAG}"
fi

echo "기존 앱 서비스 업데이트: ${APP_NAME}"
az webapp config container set \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${APP_NAME}" \
  --container-image-name "${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${TAG}" \
  --container-registry-url "https://${ACR_NAME}.azurecr.io" \
  --container-registry-user "${ACR_NAME}" \
  --container-registry-password "${ACR_PASSWORD}"

echo "--- 배포 완료! ---"
echo "URL: https://${APP_NAME}.azurewebsites.net"
