@echo off
setlocal

set "HOST=%PET_LOG_BACKEND_HOST%"
if "%HOST%"=="" set "HOST=127.0.0.1"

set "PORT=%PET_LOG_BACKEND_PORT%"
if "%PORT%"=="" set "PORT=27893"

cd /d "%~dp0.."

uv run uvicorn main:app --reload --host "%HOST%" --port "%PORT%"
