#!/usr/bin/env bash
set -euo pipefail

HOST="${PET_LOG_BACKEND_HOST:-127.0.0.1}"
PORT="${PET_LOG_BACKEND_PORT:-27893}"

cd "$(dirname "${BASH_SOURCE[0]}")/.."

exec uv run uvicorn main:app --reload --host "$HOST" --port "$PORT"
