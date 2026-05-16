from __future__ import annotations

from domain.models import CareContext


class PetPersonaAgent:
    def __init__(self, responder) -> None:
        self._responder = responder

    def respond(self, context: CareContext, message: str) -> str:
        return self._responder.respond(context, message)
