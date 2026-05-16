#!/usr/bin/env bash
set -euo pipefail

# backend/scripts/azure-package.sh
# 펫로그 백엔드(FastAPI) Azure App Service 배포용 패키지 생성 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ARTIFACT_DIR="${ROOT_DIR}/.azure-deploy"
PACKAGE_DIR="${ARTIFACT_DIR}/package"
ZIP_PATH="${ARTIFACT_DIR}/pet-log-backend.zip"

echo "--- Packaging Backend ---"
cd "${ROOT_DIR}"

# 1. 의존성 파일 업데이트 (uv 사용)
if command -v uv >/dev/null 2>&1; then
  echo "Exporting requirements.txt from uv..."
  uv export --format requirements-txt --output-file requirements.txt
else
  echo "uv not found. Using existing requirements.txt if available."
fi

# 2. 패키지 디렉토리 준비
rm -rf "${PACKAGE_DIR}" "${ZIP_PATH}"
mkdir -p "${PACKAGE_DIR}"

# 3. 필수 파일 복사
echo "Copying source files..."
# src/ 폴더와 주요 .py 파일들 복사 (composition.py는 src/ 안에 있음)
cp -R src "${PACKAGE_DIR}/"
cp main.py "${PACKAGE_DIR}/"
cp db_schema.py "${PACKAGE_DIR}/"
cp requirements.txt "${PACKAGE_DIR}/"

# 4. Git에 포함되지 않는 로컬 파일/디렉토리 포함 (.env, .chroma_db)
if [ -f .env ]; then
  echo "Including .env in package..."
  cp .env "${PACKAGE_DIR}/"
else
  echo "Warning: .env not found. Using .env.example if exists."
  if [ -f .env.example ]; then cp .env.example "${PACKAGE_DIR}/.env"; fi
fi

if [ -d .chroma_db ]; then
  echo "Including .chroma_db (ChromaDB persistence) in package..."
  cp -R .chroma_db "${PACKAGE_DIR}/"
fi

# 5. ZIP 압축
if ! command -v zip >/dev/null 2>&1; then
  echo "Error: zip command is required." >&2
  exit 1
fi

echo "Creating ZIP package..."
(
  cd "${PACKAGE_DIR}"
  # __pycache__ 및 불필요한 파일 제외하고 압축
  zip -qr "${ZIP_PATH}" . -x "**/__pycache__/*" "**/.pytest_cache/*" "**/.ruff_cache/*"
)

echo "--- Backend package created: ${ZIP_PATH} ---"
