from __future__ import annotations

from application.dto import PetChatResult


class PetChatPipeline:
    def __init__(
        self,
        context_builder,
        safety_guard,
        pet_persona_agent,
        lookback_days: int = 30,
    ) -> None:
        self._context_builder = context_builder
        self._safety_guard = safety_guard
        self._pet_persona_agent = pet_persona_agent
        self._lookback_days = lookback_days

    def chat(self, pet_id: str, message: str) -> PetChatResult:
        context = self._context_builder.build(pet_id, self._lookback_days)
        safety_notice = self._safety_guard.check(message)

        if safety_notice is not None:
            return PetChatResult(
                answer="",
                routed_to_care_question=True,
                safety_notice=safety_notice,
            )

        answer = self._pet_persona_agent.respond(context, message)
        return PetChatResult(answer=answer)
