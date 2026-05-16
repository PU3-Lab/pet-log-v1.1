from __future__ import annotations

import unittest

from langchain.agents.middleware import (
    HumanInTheLoopMiddleware,
    ModelRetryMiddleware,
    PIIMiddleware,
    ToolCallLimitMiddleware,
    ToolRetryMiddleware,
)

from middleware import (
    build_model_retry_middleware,
    build_pii_validation_middleware,
    build_tool_approval_middleware,
    build_tool_call_limit_middleware,
    build_tool_retry_middleware,
)


class TestMiddlewareFactories(unittest.TestCase):
    def test_model_retry_factory_uses_conservative_retry_defaults(self):
        middleware = build_model_retry_middleware()

        self.assertIsInstance(middleware, ModelRetryMiddleware)
        self.assertEqual(2, middleware.max_retries)
        self.assertEqual("continue", middleware.on_failure)
        self.assertEqual(1.0, middleware.initial_delay)
        self.assertEqual(10.0, middleware.max_delay)
        self.assertFalse(middleware.jitter)

    def test_tool_retry_factory_can_target_specific_tools(self):
        middleware = build_tool_retry_middleware(tool_names=("get_pet_profile", "list_recent_records"))

        self.assertIsInstance(middleware, ToolRetryMiddleware)
        self.assertEqual(["get_pet_profile", "list_recent_records"], middleware._tool_filter)
        self.assertEqual(1, middleware.max_retries)
        self.assertEqual("continue", middleware.on_failure)
        self.assertEqual(0.5, middleware.initial_delay)
        self.assertEqual(5.0, middleware.max_delay)
        self.assertFalse(middleware.jitter)

    def test_tool_approval_factory_requires_approval_for_selected_tools_only(self):
        middleware = build_tool_approval_middleware(
            tool_names=("save_pet_record",),
            description_prefix="Pet log tool approval required",
        )

        self.assertIsInstance(middleware, HumanInTheLoopMiddleware)
        self.assertEqual("Pet log tool approval required", middleware.description_prefix)
        self.assertEqual(["save_pet_record"], list(middleware.interrupt_on))
        self.assertEqual(["approve", "reject"], middleware.interrupt_on["save_pet_record"]["allowed_decisions"])

    def test_tool_call_limit_factory_requires_a_limit(self):
        middleware = build_tool_call_limit_middleware(tool_name="save_pet_record", run_limit=3)

        self.assertIsInstance(middleware, ToolCallLimitMiddleware)
        self.assertEqual("save_pet_record", middleware.tool_name)
        self.assertEqual(3, middleware.run_limit)
        self.assertIsNone(middleware.thread_limit)
        self.assertEqual("continue", middleware.exit_behavior)

        with self.assertRaises(ValueError):
            build_tool_call_limit_middleware()

    def test_pii_validation_factory_redacts_input_by_default(self):
        middleware = build_pii_validation_middleware("email")

        self.assertIsInstance(middleware, PIIMiddleware)
        self.assertEqual("email", middleware.pii_type)
        self.assertEqual("redact", middleware.strategy)
        self.assertTrue(middleware.apply_to_input)
        self.assertFalse(middleware.apply_to_output)
        self.assertFalse(middleware.apply_to_tool_results)


if __name__ == "__main__":
    unittest.main()
