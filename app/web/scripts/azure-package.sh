#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT_DIR="${ROOT_DIR}/.azure-deploy"
PACKAGE_DIR="${ARTIFACT_DIR}/package"
ZIP_PATH="${ARTIFACT_DIR}/pet-log-web.zip"

cd "${ROOT_DIR}"

if ! command -v zip >/dev/null 2>&1; then
  echo "zip command is required to create the Azure deploy package." >&2
  exit 1
fi

npm run build

rm -rf "${PACKAGE_DIR}" "${ZIP_PATH}"
mkdir -p "${PACKAGE_DIR}/.next"

cp -R .next/standalone/. "${PACKAGE_DIR}/"
cp -R .next/static "${PACKAGE_DIR}/.next/static"

if [ -d public ]; then
  cp -R public "${PACKAGE_DIR}/public"
fi

(
  cd "${PACKAGE_DIR}"
  zip -qr "${ZIP_PATH}" .
)

echo "Azure deploy package created: ${ZIP_PATH}"
