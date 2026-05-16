import unittest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from application.agents.care_action_navigation import CareActionRoutingAgent
from application.agents.context_analysis import ContextAnalysisAgent
from application.dto import CareQuestionResult, PetChatResult
from presentation.http.app import create_app
from domain.models import CareInsight, CareSuggestion, ContextAnalysisResult, PetProfile, PetRecord, PlannedReminder

class FakeAppContext:
    def __init__(self):
        self.risk_detection_agent = MagicMock()
        self.context_analysis_agent = MagicMock()
        self.suggestion_agent = MagicMock()
        self.record_reader = MagicMock()
        self.schedule_reader = MagicMock()
        self.pet_profile_reader = MagicMock()
        self.pet_log_agent_pipeline = MagicMock()
        self.speech_to_text = MagicMock()
        self.care_question_pipeline = None
        self.pet_chat_pipeline = None
        self.hospital_recommendation_agent = MagicMock()
        self.closed = False

    def close(self):
        self.closed = True

class TestAIEndpoints(unittest.TestCase):
    def test_get_insights_returns_agent_action_href(self):
        context = FakeAppContext()
        context.record_reader.list_recent.return_value = []
        context.schedule_reader.list_due_items.return_value = []
        context.pet_profile_reader.get_pet.return_value = PetProfile(id="pet-1", name="초코")
        context.context_analysis_agent.analyze.return_value = ContextAnalysisResult(
            insights=(
                CareInsight(
                    severity="notice",
                    title="병원 관찰",
                    reason="에이전트가 병원 화면에서 확인하도록 판단했습니다.",
                    action_href="/hospital",
                ),
            ),
        )
        
        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.get("/api/v1/ai/insights?pet_id=pet-1")
            
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertIn("insights", data)
        self.assertEqual(data["insights"][0]["title"], "병원 관찰")
        self.assertEqual(data["insights"][0]["actionHref"], "/hospital")
        context.pet_profile_reader.get_pet.assert_called_once_with("pet-1")
        context.record_reader.list_recent.assert_called_once_with("pet-1", lookback_days=30)
        context.schedule_reader.list_due_items.assert_called_once_with("pet-1", days_ahead=14)
        context.context_analysis_agent.analyze.assert_called_once()
        context.risk_detection_agent.detect.assert_not_called()

    def test_get_insights_requires_context_analysis_agent(self):
        context = FakeAppContext()
        context.context_analysis_agent = None

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.get("/api/v1/ai/insights?pet_id=pet-1")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["detail"], "Context analysis agent not configured")

    def test_get_insights_normalizes_invalid_agent_action_href(self):
        context = FakeAppContext()
        context.record_reader.list_recent.return_value = []
        context.schedule_reader.list_due_items.return_value = []
        context.pet_profile_reader.get_pet.return_value = PetProfile(id="pet-1", name="초코")
        context.context_analysis_agent.analyze.return_value = ContextAnalysisResult(
            insights=(
                CareInsight(
                    severity="notice",
                    title="잘못된 이동 경로",
                    reason="에이전트 응답에 외부 URL이 들어왔습니다.",
                    action_href="https://example.com/hospital",
                ),
            ),
        )

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.get("/api/v1/ai/insights?pet_id=pet-1")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["data"]["insights"][0]["actionHref"])

    def test_get_insights_falls_back_when_action_route_provider_fails(self):
        context = FakeAppContext()
        context.record_reader.list_recent.return_value = []
        context.schedule_reader.list_due_items.return_value = []
        context.pet_profile_reader.get_pet.return_value = PetProfile(id="pet-1", name="초코")
        context.context_analysis_agent = ContextAnalysisAgent(
            pattern_analyzer=_StaticPatternAnalyzer(
                CareInsight(
                    severity="notice",
                    title="병원 상담 필요",
                    reason="라우팅 provider 실패는 API 응답을 깨지 않아야 합니다.",
                )
            ),
            missing_record_policy=_StaticMissingRecordPolicy(),
            action_routing_agent=CareActionRoutingAgent(_FailingActionRouteDecisionProvider()),
        )

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.get("/api/v1/ai/insights?pet_id=pet-1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["insights"][0]["actionHref"], "/timeline")

    def test_get_suggestions_returns_care_suggestions(self):
        context = FakeAppContext()
        context.record_reader.list_recent.return_value = []
        context.schedule_reader.list_due_items.return_value = []
        context.pet_profile_reader.get_pet.return_value = PetProfile(id="pet-1", name="초코")
        context.context_analysis_agent.analyze.return_value = MagicMock()
        context.suggestion_agent.suggest.return_value = [
            CareSuggestion(title="Play", action="Go play", reason="Fun", action_href="/shopping")
        ]
        
        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.get("/api/v1/ai/suggestions?pet_id=pet-1")
            
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertIn("suggestions", data)
        self.assertEqual(data["suggestions"][0]["title"], "Play")
        self.assertEqual(data["suggestions"][0]["actionHref"], "/shopping")
        context.record_reader.list_recent.assert_called_once_with("pet-1", lookback_days=30)
        context.schedule_reader.list_due_items.assert_called_once_with("pet-1", days_ahead=14)
        context.suggestion_agent.suggest.assert_called_once()

    def test_get_suggestions_normalizes_invalid_agent_action_href(self):
        context = FakeAppContext()
        context.record_reader.list_recent.return_value = []
        context.schedule_reader.list_due_items.return_value = []
        context.pet_profile_reader.get_pet.return_value = PetProfile(id="pet-1", name="초코")
        context.context_analysis_agent.analyze.return_value = ContextAnalysisResult()
        context.suggestion_agent.suggest.return_value = [
            CareSuggestion(title="Bad", action="Open", reason="Invalid route", action_href="//example.com")
        ]

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.get("/api/v1/ai/suggestions?pet_id=pet-1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["suggestions"][0]["actionHref"], "/record")

    def test_post_care_answer_returns_pipeline_answer(self):
        context = FakeAppContext()
        context.pet_profile_reader.get_pet.return_value = PetProfile(id="pet-1", name="초코")
        context.care_question_pipeline = MagicMock()
        context.care_question_pipeline.ask.return_value = CareQuestionResult(
            answer="오늘 기록 기준으로는 물 섭취와 컨디션을 같이 봐주세요.",
            referenced_record_ids=("record-1",),
        )

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.post(
                "/api/v1/ai/care-answer",
                json={"pet_id": "pet-1", "question": "오늘 컨디션 어때?"},
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["answer"], "오늘 기록 기준으로는 물 섭취와 컨디션을 같이 봐주세요.")
        self.assertEqual(data["referencedRecordIds"], ["record-1"])
        context.pet_profile_reader.get_pet.assert_called_once_with("pet-1")
        context.care_question_pipeline.ask.assert_called_once_with("pet-1", "오늘 컨디션 어때?")

    def test_post_pet_chat_returns_pipeline_answer(self):
        context = FakeAppContext()
        context.pet_profile_reader.get_pet.return_value = PetProfile(id="pet-1", name="초코")
        context.pet_chat_pipeline = MagicMock()
        context.pet_chat_pipeline.chat.return_value = PetChatResult(answer="나 오늘 산책해서 기분 좋아!")

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.post(
                "/api/v1/ai/pet-chat",
                json={"pet_id": "pet-1", "message": "오늘 기분 어때?"},
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["answer"], "나 오늘 산책해서 기분 좋아!")
        self.assertFalse(data["routedToCareQuestion"])
        context.pet_profile_reader.get_pet.assert_called_once_with("pet-1")
        context.pet_chat_pipeline.chat.assert_called_once_with("pet-1", "오늘 기분 어때?")


class _StaticPatternAnalyzer:
    def __init__(self, *insights: CareInsight) -> None:
        self._insights = insights

    def analyze(self, pet: PetProfile, records: tuple[PetRecord, ...]) -> tuple[CareInsight, ...]:
        return self._insights


class _StaticMissingRecordPolicy:
    def detect_missing_records(self, pet: PetProfile, records: tuple[PetRecord, ...]) -> tuple[CareInsight, ...]:
        return ()


class _FailingActionRouteDecisionProvider:
    def decide_routes(
        self,
        *,
        pet: PetProfile,
        insights: tuple[CareInsight, ...],
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
        fallback: str,
    ) -> tuple[str | None, ...]:
        raise RuntimeError("action route provider unavailable")


if __name__ == "__main__":
    unittest.main()
