from __future__ import annotations

import unittest

from domain.models import (
    CareContext,
    CareKnowledgeChunk,
    CareKnowledgeHit,
    PetProfile,
    StructuredRecordCandidate,
)
from infrastructure.llm.care_answer import CareAnswerProvider
from infrastructure.llm.image_record_understanding import ImageRecordUnderstandingProvider
from infrastructure.llm.pet_persona import PetPersonaResponder


class FakeTextModel:
    def __init__(self, response: object) -> None:
        self.response = response
        self.calls: list[list[tuple[str, str]]] = []

    def invoke(self, messages: list[tuple[str, str]]) -> object:
        self.calls.append(messages)
        return self.response


class FakeStructuredModel:
    def __init__(self, response: dict[str, object]) -> None:
        self.response = response
        self.calls: list[list[object]] = []

    def invoke(self, messages: list[object]) -> dict[str, object]:
        self.calls.append(messages)
        return self.response


class FakeKnowledgeRetriever:
    def __init__(self, hits: tuple[CareKnowledgeHit, ...] = ()) -> None:
        self.hits = hits
        self.calls: list[tuple[str, int]] = []

    def search(self, question: str, limit: int = 3) -> tuple[CareKnowledgeHit, ...]:
        self.calls.append((question, limit))
        return self.hits


class TextMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class TestLLMProviderContract(unittest.TestCase):
    def test_care_answer_provider_invokes_model_and_returns_answer(self):
        model = FakeTextModel(TextMessage("초코의 최근 기록을 보면 산책 시간을 조금씩 늘려보세요."))
        provider = CareAnswerProvider(api_key="test-key", model="test-model", chat_model=model)
        context = CareContext(pet=PetProfile(id="pet-1", name="초코", species="dog"))

        answer = provider.answer(context, "산책을 얼마나 해야 해?")

        self.assertIn("초코", answer)
        self.assertEqual(len(model.calls), 1)
        self.assertEqual(model.calls[0][0][0], "system")
        self.assertEqual(model.calls[0][1][0], "user")
        self.assertIn("진단을 단정하지 마세요", model.calls[0][0][1])

    def test_care_answer_provider_adds_knowledge_hits_to_prompt_when_configured(self):
        model = FakeTextModel(TextMessage("초코의 최근 기록을 보면 산책 시간을 조금씩 늘려보세요."))
        chunk = CareKnowledgeChunk(
            id="chunk-1",
            source_id="source-1",
            title="Dog walking guide",
            text="Young dogs may need shorter, more frequent walks.",
            source_url="https://example.org/dog-walking",
            content_hash="hash-1",
        )
        retriever = FakeKnowledgeRetriever((CareKnowledgeHit(chunk=chunk, score=0.87),))
        provider = CareAnswerProvider(
            api_key="test-key",
            model="test-model",
            chat_model=model,
            knowledge_retriever=retriever,
        )
        context = CareContext(pet=PetProfile(id="pet-1", name="초코", species="dog"))

        provider.answer(context, "산책을 얼마나 해야 해?")

        self.assertEqual(retriever.calls, [("산책을 얼마나 해야 해?", 3)])
        user_prompt = model.calls[0][1][1]
        self.assertIn("care_knowledge:", user_prompt)
        self.assertIn("Dog walking guide", user_prompt)
        self.assertIn("Young dogs may need shorter, more frequent walks.", user_prompt)
        self.assertIn("https://example.org/dog-walking", user_prompt)

    def test_care_answer_provider_requires_api_key(self):
        provider = CareAnswerProvider(api_key="")

        with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY"):
            provider.answer(CareContext(pet=PetProfile(id="pet-1", name="초코")), "질문")

    def test_pet_persona_responder_invokes_model_and_returns_response(self):
        model = FakeTextModel("나 초코야. 오늘은 천천히 쉬고 싶어.")
        responder = PetPersonaResponder(api_key="test-key", model="test-model", chat_model=model)
        context = CareContext(pet=PetProfile(id="pet-1", name="초코", personality="소심함"))

        response = responder.respond(context, "오늘 기분 어때?")

        self.assertIn("초코", response)
        self.assertEqual(len(model.calls), 1)
        self.assertIn("건강 판단을 직접 하지 마세요", model.calls[0][0][1])
        self.assertIn("소심함", model.calls[0][1][1])

    def test_pet_persona_responder_requires_api_key(self):
        responder = PetPersonaResponder(api_key="")

        with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY"):
            responder.respond(CareContext(pet=PetProfile(id="pet-1", name="초코")), "안녕")

    def test_image_record_understanding_provider_maps_structured_candidate(self):
        model = FakeStructuredModel(
            {
                "title": "사료를 조금 남김",
                "detail": "사진상 밥그릇에 사료가 일부 남아 있습니다.",
                "category": "meal",
                "status": "notice",
                "confidence": 0.72,
                "needs_confirmation": True,
                "measurements": ["사진 기반 추정"],
            }
        )
        provider = ImageRecordUnderstandingProvider(
            api_key="test-key",
            model="test-model",
            structured_model=model,
        )
        pet = PetProfile(id="pet-1", name="초코", species="dog")

        candidate = provider.understand(
            pet,
            image=b"fake-image",
            content_type="image/png",
            user_note="아침 식사 사진",
        )

        self.assertIsInstance(candidate, StructuredRecordCandidate)
        self.assertEqual(candidate.category, "meal")
        self.assertTrue(candidate.needs_confirmation)
        self.assertEqual(candidate.measurements, ("사진 기반 추정",))
        self.assertEqual(len(model.calls), 1)

    def test_image_record_understanding_provider_requires_api_key(self):
        provider = ImageRecordUnderstandingProvider(api_key="")

        with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY"):
            provider.understand(
                PetProfile(id="pet-1", name="초코"),
                image=b"fake-image",
                content_type="image/png",
            )


if __name__ == "__main__":
    unittest.main()
