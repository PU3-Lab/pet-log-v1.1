from __future__ import annotations

import unittest
from unittest.mock import patch

from infrastructure.llm.preload import preload_configured_llm_providers


class TestLLMPreload(unittest.TestCase):
    def test_preload_prepares_local_runtime_when_autostart_is_enabled_without_eager_load(self):
        prepared: list[str] = []

        with patch.dict("os.environ", {"LOCAL_LLM_AUTOSTART": "1"}, clear=True), patch(
            "infrastructure.llm.preload.ensure_local_gemma_runtime",
            lambda: prepared.append("prepared"),
        ):
            preload_configured_llm_providers()

        self.assertEqual(prepared, ["prepared"])


if __name__ == "__main__":
    unittest.main()
