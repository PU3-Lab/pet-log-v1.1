from __future__ import annotations

from langchain.agents.middleware import wrap_tool_call
from langchain_core.messages import ToolMessage


def build_agent_debug_middleware(agent_name: str):
    @wrap_tool_call
    def agent_debug_log(request, handler):
        try:
            return handler(request)
        except Exception as error:
            return ToolMessage(
                content=f"Tool error in {agent_name}: {type(error).__name__}",
                tool_call_id=request.tool_call["id"],
            )

    return agent_debug_log
