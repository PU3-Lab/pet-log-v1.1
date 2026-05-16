from __future__ import annotations

import json
import os
import subprocess
import threading
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit, urlunsplit

from infrastructure.llm.local_settings import local_gemma_model


DEFAULT_LOCAL_LLM_RUNTIME = "ollama"
DEFAULT_OLLAMA_OPENAI_BASE_URL = "http://127.0.0.1:11434/v1"
DEFAULT_GEMMA_STARTUP_TIMEOUT_SECONDS = 15.0

_started_process: subprocess.Popen[bytes] | None = None
_started_command: list[str] | None = None
_downloaded_model_keys: set[tuple[str, str]] = set()
_download_lock = threading.Lock()


def should_autostart_local_gemma() -> bool:
    return os.environ.get("LOCAL_LLM_AUTOSTART", "").lower() in {"1", "true", "yes"}


def should_autopull_local_gemma_model() -> bool:
    return os.environ.get("GEMMA_AUTO_PULL", "").lower() in {"1", "true", "yes"}


def should_preload_local_gemma_model() -> bool:
    return os.environ.get("GEMMA_PRELOAD", "").lower() in {"1", "true", "yes"}


def local_llm_runtime() -> str:
    runtime = os.environ.get("LOCAL_LLM_RUNTIME", DEFAULT_LOCAL_LLM_RUNTIME).lower().replace("-", "_")
    if runtime != "ollama":
        raise RuntimeError("LOCAL_LLM_RUNTIME must be `ollama`.")
    return runtime


def local_gemma_base_url() -> str:
    local_llm_runtime()
    configured_base_url = os.environ.get("GEMMA_BASE_URL")
    if configured_base_url:
        return configured_base_url
    return DEFAULT_OLLAMA_OPENAI_BASE_URL


def ensure_local_gemma_runtime() -> None:
    if not should_autostart_local_gemma():
        return

    base_url = local_gemma_base_url()
    if _is_openai_compatible_server_ready(base_url):
        _download_model_if_enabled()
        _preload_model_if_enabled(base_url)
        return

    _start_local_server()
    _wait_for_server(base_url)
    _download_model_if_enabled()
    _preload_model_if_enabled(base_url)


def _download_model_if_enabled() -> None:
    if not should_autopull_local_gemma_model():
        return

    runtime = local_llm_runtime()
    model = local_gemma_model()
    cache_key = (runtime, model)
    with _download_lock:
        if cache_key in _downloaded_model_keys:
            return

        _download_model(runtime, model)
        _downloaded_model_keys.add(cache_key)


def _download_model(runtime: str, model: str) -> None:
    commands = _download_commands(model)
    missing_commands: list[str] = []
    try:
        for command in commands:
            try:
                subprocess.run(command, check=True)
                return
            except FileNotFoundError:
                missing_commands.append(command[0])
    except subprocess.CalledProcessError as error:
        raise RuntimeError(f"Failed to download local Gemma model for {runtime}.") from error

    required_commands = " or ".join(f"`{command}`" for command in missing_commands)
    raise RuntimeError(f"GEMMA_AUTO_PULL=1 requires {required_commands} to be installed for {runtime}.")


def _download_commands(model: str) -> list[list[str]]:
    return [["ollama", "pull", model]]


def _preload_model_if_enabled(base_url: str) -> None:
    if not should_preload_local_gemma_model():
        return

    try:
        _post_chat_completion(base_url)
    except urllib.error.URLError as error:
        raise RuntimeError(f"Failed to preload local Gemma model `{local_gemma_model()}`.") from error


def _post_chat_completion(base_url: str) -> None:
    payload = json.dumps(
        {
            "model": local_gemma_model(),
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 1,
            "temperature": 0,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        _join_base_url(base_url, "chat/completions"),
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    timeout = float(os.environ.get("GEMMA_PRELOAD_TIMEOUT", "120"))
    with urllib.request.urlopen(request, timeout=timeout):
        return


def _start_local_server() -> None:
    global _started_command, _started_process
    command = _server_command()
    if _started_process is not None and _started_process.poll() is None and _started_command == command:
        return

    try:
        _started_process = subprocess.Popen(
            command,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        _started_command = command
    except FileNotFoundError as error:
        raise RuntimeError(
            f"LOCAL_LLM_AUTOSTART=1 requires `{command[0]}` to be installed for {local_llm_runtime()}."
        ) from error


def _server_command() -> list[str]:
    return ["ollama", "serve"]


def _host_and_port_from_base_url(base_url: str) -> tuple[str, str]:
    split = urlsplit(base_url)
    host = split.hostname or "127.0.0.1"
    if split.port is not None:
        return host, str(split.port)
    if split.scheme == "https":
        return host, "443"
    return host, "80"


def _wait_for_server(base_url: str) -> None:
    timeout = float(os.environ.get("GEMMA_STARTUP_TIMEOUT", DEFAULT_GEMMA_STARTUP_TIMEOUT_SECONDS))
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if _is_openai_compatible_server_ready(base_url):
            return
        time.sleep(0.25)

    raise RuntimeError(f"Local Gemma runtime did not become ready at {base_url} within {timeout:.1f}s.")


def _is_openai_compatible_server_ready(base_url: str) -> bool:
    request = urllib.request.Request(_join_base_url(base_url, "models"), method="GET")
    try:
        with urllib.request.urlopen(request, timeout=1.0) as response:
            return 200 <= response.status < 500
    except (OSError, urllib.error.URLError):
        return False


def _join_base_url(base_url: str, suffix: str) -> str:
    split = urlsplit(base_url)
    path = split.path.rstrip("/") + "/" + suffix.lstrip("/")
    return urlunsplit((split.scheme, split.netloc, path, split.query, split.fragment))
