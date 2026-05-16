from __future__ import annotations

import unittest
from unittest.mock import patch

from infrastructure.llm import local_runtime
from infrastructure.llm.local_runtime import (
    ensure_local_gemma_runtime,
    local_gemma_base_url,
    should_autopull_local_gemma_model,
    should_autostart_local_gemma,
    should_preload_local_gemma_model,
)
from infrastructure.llm.model_factory import build_chat_openai_model


class FakeChatOpenAI:
    calls: list[dict[str, object]] = []

    def __init__(self, **kwargs: object) -> None:
        FakeChatOpenAI.calls.append(kwargs)


class TestLLMLocalRuntime(unittest.TestCase):
    def setUp(self) -> None:
        FakeChatOpenAI.calls = []
        local_runtime._downloaded_model_keys.clear()

    def test_ollama_autostart_uses_default_openai_compatible_base_url(self):
        with patch.dict("os.environ", {"LOCAL_LLM_AUTOSTART": "1"}, clear=True):
            self.assertTrue(should_autostart_local_gemma())
            self.assertEqual(local_gemma_base_url(), "http://127.0.0.1:11434/v1")

    def test_ollama_runtime_uses_default_openai_compatible_base_url(self):
        env = {
            "LOCAL_LLM_AUTOSTART": "1",
            "LOCAL_LLM_RUNTIME": "ollama",
        }
        with patch.dict("os.environ", env, clear=True):
            self.assertTrue(should_autostart_local_gemma())
            self.assertEqual(local_gemma_base_url(), "http://127.0.0.1:11434/v1")

    def test_model_builder_prepares_local_runtime_before_gemma_model_creation(self):
        prepared: list[str] = []
        env = {
            "LOCAL_LLM_AUTOSTART": "1",
            "GEMMA_MODEL": "google/gemma-4-E4B-it",
        }

        with patch.dict("os.environ", env, clear=True), patch(
            "infrastructure.llm.model_factory.ChatOpenAI",
            FakeChatOpenAI,
        ), patch(
            "infrastructure.llm.model_factory.ensure_local_gemma_runtime",
            lambda: prepared.append("prepared"),
        ):
            build_chat_openai_model("google/gemma-4-E4B-it", "local-gemma", 5.0)

        self.assertEqual(prepared, ["prepared"])
        self.assertEqual(
            FakeChatOpenAI.calls,
            [
                {
                    "model": "gemma4:e4b",
                    "api_key": "local-gemma",
                    "timeout": 5.0,
                    "base_url": "http://127.0.0.1:11434/v1",
                    "max_retries": 0,
                    "use_responses_api": False,
                }
            ],
        )

    def test_model_builder_normalizes_huggingface_gemma_name_for_ollama(self):
        with patch.dict(
            "os.environ",
            {"LOCAL_LLM_AUTOSTART": "1", "GEMMA_MODEL": "google/gemma-4-E4B-it"},
            clear=True,
        ), patch(
            "infrastructure.llm.model_factory.ChatOpenAI",
            FakeChatOpenAI,
        ), patch(
            "infrastructure.llm.model_factory.ensure_local_gemma_runtime",
            lambda: None,
        ):
            build_chat_openai_model("google/gemma-4-E4B-it", "local-gemma", 5.0)

        self.assertEqual(FakeChatOpenAI.calls[0]["model"], "gemma4:e4b")

    def test_auto_pull_is_opt_in(self):
        with patch.dict("os.environ", {"LOCAL_LLM_AUTOSTART": "1"}, clear=True):
            self.assertFalse(should_autopull_local_gemma_model())

        with patch.dict("os.environ", {"LOCAL_LLM_AUTOSTART": "1", "GEMMA_AUTO_PULL": "1"}, clear=True):
            self.assertTrue(should_autopull_local_gemma_model())

    def test_preload_is_opt_in(self):
        with patch.dict("os.environ", {"LOCAL_LLM_AUTOSTART": "1"}, clear=True):
            self.assertFalse(should_preload_local_gemma_model())

        with patch.dict("os.environ", {"LOCAL_LLM_AUTOSTART": "1", "GEMMA_PRELOAD": "1"}, clear=True):
            self.assertTrue(should_preload_local_gemma_model())

    def test_ensure_ollama_runtime_pulls_starts_and_warms_model_when_enabled(self):
        events: list[object] = []

        class FakeProcess:
            def poll(self):
                return None

        def fake_popen(command, **kwargs):
            events.append(("start", command))
            return FakeProcess()

        def fake_run(command, **kwargs):
            events.append(("pull", command))

        env = {
            "LOCAL_LLM_AUTOSTART": "1",
            "LOCAL_LLM_RUNTIME": "ollama",
            "GEMMA_AUTO_PULL": "1",
            "GEMMA_PRELOAD": "1",
            "GEMMA_MODEL": "gemma4:e4b",
        }
        with patch.dict("os.environ", env, clear=True), patch(
            "infrastructure.llm.local_runtime._is_openai_compatible_server_ready",
            side_effect=[False, True],
        ), patch(
            "infrastructure.llm.local_runtime.subprocess.run",
            fake_run,
        ), patch(
            "infrastructure.llm.local_runtime.subprocess.Popen",
            fake_popen,
        ), patch(
            "infrastructure.llm.local_runtime._post_chat_completion",
            lambda base_url: events.append(("warm", base_url)),
        ):
            ensure_local_gemma_runtime()

        self.assertEqual(
            events,
            [
                ("start", ["ollama", "serve"]),
                ("pull", ["ollama", "pull", "gemma4:e4b"]),
                ("warm", "http://127.0.0.1:11434/v1"),
            ],
        )

    def test_ensure_ollama_runtime_pulls_before_preload_when_server_is_already_ready(self):
        run_commands: list[list[str]] = []
        warmed_urls: list[str] = []

        def fake_run(command, **kwargs):
            run_commands.append(command)

        env = {
            "LOCAL_LLM_AUTOSTART": "1",
            "LOCAL_LLM_RUNTIME": "ollama",
            "GEMMA_AUTO_PULL": "1",
            "GEMMA_PRELOAD": "1",
            "GEMMA_MODEL": "gemma4:e4b",
        }
        with patch.dict("os.environ", env, clear=True), patch(
            "infrastructure.llm.local_runtime._is_openai_compatible_server_ready",
            return_value=True,
        ), patch(
            "infrastructure.llm.local_runtime.subprocess.run",
            fake_run,
        ), patch(
            "infrastructure.llm.local_runtime._post_chat_completion",
            lambda base_url: warmed_urls.append(base_url),
        ):
            ensure_local_gemma_runtime()

        self.assertEqual(run_commands, [["ollama", "pull", "gemma4:e4b"]])
        self.assertEqual(warmed_urls, ["http://127.0.0.1:11434/v1"])

    def test_ensure_ollama_runtime_pulls_model_once_per_process(self):
        run_commands: list[list[str]] = []

        def fake_run(command, **kwargs):
            run_commands.append(command)

        env = {
            "LOCAL_LLM_AUTOSTART": "1",
            "LOCAL_LLM_RUNTIME": "ollama",
            "GEMMA_AUTO_PULL": "1",
            "GEMMA_MODEL": "gemma4:e4b",
        }
        with patch.dict("os.environ", env, clear=True), patch(
            "infrastructure.llm.local_runtime._is_openai_compatible_server_ready",
            return_value=True,
        ), patch(
            "infrastructure.llm.local_runtime.subprocess.run",
            fake_run,
        ):
            ensure_local_gemma_runtime()
            ensure_local_gemma_runtime()

        self.assertEqual(run_commands, [["ollama", "pull", "gemma4:e4b"]])


if __name__ == "__main__":
    unittest.main()
