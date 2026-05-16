from __future__ import annotations

import unittest

from langchain.agents.middleware import (
    HumanInTheLoopMiddleware,
    ModelRetryMiddleware,
    PIIMiddleware,
    ToolCallLimitMiddleware,
    ToolRetryMiddleware,
)
from langchain_core.messages import ToolMessage

from agent_runtime.tool_registry import (
    PetLogToolDependencies,
    build_context_tools,
    build_pet_log_node_wiring,
    build_record_write_tools,
)
from middleware.logging import build_agent_debug_middleware


class FakeProfileRepository:
    def get_pet(self, pet_id: str) -> dict[str, str]:
        return {"pet_id": pet_id, "name": "Momo"}


class FakeRecordRepository:
    def __init__(self) -> None:
        self.saved_records: list[dict[str, str]] = []

    def list_recent(self, pet_id: str, lookback_days: int) -> list[dict[str, str]]:
        return [{"pet_id": pet_id, "summary": "ate breakfast", "lookback_days": str(lookback_days)}]

    def save_candidate(self, pet_id: str, candidate) -> dict[str, str]:
        record = {
            "pet_id": pet_id,
            "category": candidate.category,
            "title": candidate.title,
            "detail": candidate.detail,
            "status": candidate.status,
        }
        self.saved_records.append(record)
        return record


class FakeToolRequest:
    tool_call = {"id": "call-1", "name": "explode"}


class TestAgentRuntimeWiring(unittest.TestCase):
    def test_context_tools_are_langchain_tools_for_read_only_context_node(self):
        dependencies = PetLogToolDependencies(
            profile_repository=FakeProfileRepository(),
            record_repository=FakeRecordRepository(),
        )

        tools = build_context_tools(dependencies)
        tool_names = {tool.name for tool in tools}

        self.assertEqual({"get_pet_profile", "list_recent_records"}, tool_names)
        profile_tool = next(tool for tool in tools if tool.name == "get_pet_profile")
        records_tool = next(tool for tool in tools if tool.name == "list_recent_records")

        self.assertEqual({"pet_id": "pet-1", "name": "Momo"}, profile_tool.invoke({"pet_id": "pet-1"}))
        self.assertEqual(
            [{"pet_id": "pet-1", "summary": "ate breakfast", "lookback_days": "3"}],
            records_tool.invoke({"pet_id": "pet-1", "lookback_days": 3}),
        )

    def test_record_write_tools_are_kept_out_of_context_bundle(self):
        dependencies = PetLogToolDependencies(
            profile_repository=FakeProfileRepository(),
            record_repository=FakeRecordRepository(),
        )

        context_tool_names = {tool.name for tool in build_context_tools(dependencies)}
        write_tools = build_record_write_tools(dependencies)
        write_tool_names = {tool.name for tool in write_tools}

        self.assertNotIn("save_pet_record", context_tool_names)
        self.assertEqual({"save_pet_record"}, write_tool_names)

        save_tool = write_tools[0]
        self.assertEqual(
            {
                "pet_id": "pet-1",
                "category": "meal",
                "title": "Breakfast",
                "detail": "ate breakfast",
                "status": "normal",
            },
            save_tool.invoke(
                {
                    "pet_id": "pet-1",
                    "category": "meal",
                    "title": "Breakfast",
                    "detail": "ate breakfast",
                    "status": "normal",
                }
            ),
        )

    def test_node_wiring_declares_tools_and_middleware_by_node(self):
        dependencies = PetLogToolDependencies(
            profile_repository=FakeProfileRepository(),
            record_repository=FakeRecordRepository(),
        )

        wiring = build_pet_log_node_wiring(dependencies)

        self.assertEqual(
            ["get_pet_profile", "list_recent_records"],
            [tool.name for tool in wiring["load_context"].tools],
        )
        self.assertEqual(["save_pet_record"], [tool.name for tool in wiring["save_records"].tools])
        self.assertEqual([], [tool.name for tool in wiring["structure_record"].tools])
        self.assertIn("agent_debug_log", [middleware.name for middleware in wiring["load_context"].middleware])
        self.assertIn("agent_debug_log", [middleware.name for middleware in wiring["save_records"].middleware])

    def test_node_wiring_connects_agent_middleware_by_risk_boundary(self):
        dependencies = PetLogToolDependencies(
            profile_repository=FakeProfileRepository(),
            record_repository=FakeRecordRepository(),
        )

        wiring = build_pet_log_node_wiring(dependencies)

        self.assertTrue(
            any(isinstance(middleware, ModelRetryMiddleware) for middleware in wiring["structure_record"].middleware)
        )
        for node_name in ("load_context", "save_records"):
            middleware = wiring[node_name].middleware
            self.assertTrue(any(isinstance(item, ToolRetryMiddleware) for item in middleware), node_name)
            self.assertTrue(any(isinstance(item, ToolCallLimitMiddleware) for item in middleware), node_name)
            self.assertTrue(any(isinstance(item, PIIMiddleware) for item in middleware), node_name)

        self.assertFalse(
            any(isinstance(item, HumanInTheLoopMiddleware) for item in wiring["load_context"].middleware)
        )
        self.assertTrue(
            any(isinstance(item, HumanInTheLoopMiddleware) for item in wiring["save_records"].middleware)
        )

    def test_agent_debug_middleware_normalizes_tool_errors_without_raw_args(self):
        middleware = build_agent_debug_middleware("load_context")

        def failing_handler(_request: FakeToolRequest) -> ToolMessage:
            raise ValueError("raw secret payload should not leak")

        result = middleware.wrap_tool_call(FakeToolRequest(), failing_handler)

        self.assertIsInstance(result, ToolMessage)
        self.assertEqual("call-1", result.tool_call_id)
        self.assertIn("Tool error in load_context", result.content)
        self.assertIn("ValueError", result.content)
        self.assertNotIn("raw secret payload", result.content)


if __name__ == "__main__":
    unittest.main()
