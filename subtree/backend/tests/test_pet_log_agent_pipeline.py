from __future__ import annotations

import unittest

from application.dto import PetLogAgentInput
from application.pipelines.pet_log_graph import LangGraphPetLogAgentPipeline
from application.pipelines.pet_log_agent import PetLogAgentPipeline
from domain.enums import RecordInputSource
from domain.models import (
    CareSuggestion,
    ContextAnalysisResult,
    PetProfile,
    PetRecord,
    PlannedReminder,
    ShoppingRecommendation,
    StructuredRecordBatch,
    StructuredRecordCandidate,
)


class FakeRecordStructuringAgent:
    def __init__(self, batch: StructuredRecordBatch) -> None:
        self._batch = batch

    def structure(self, input: PetLogAgentInput) -> StructuredRecordBatch:
        return self._batch


class FakeRecordRepository:
    def __init__(self) -> None:
        self.saved_candidates: list[StructuredRecordCandidate] = []
        self.saved_sources: list[RecordInputSource] = []

    def list_recent(self, pet_id: str, lookback_days: int) -> tuple[PetRecord, ...]:
        return ()

    def list_by_ids(self, pet_id: str, record_ids: tuple[str, ...]) -> tuple[PetRecord, ...]:
        return ()

    def save_candidate(
        self,
        pet_id: str,
        candidate: StructuredRecordCandidate,
        source: RecordInputSource = "ai_preview",
        batch_id: str | None = None,
    ) -> PetRecord:
        self.saved_candidates.append(candidate)
        self.saved_sources.append(source)
        return PetRecord(
            id=f"record-{len(self.saved_candidates)}",
            pet_id=pet_id,
            category=candidate.category,
            title=candidate.title,
            detail=candidate.detail,
            status=candidate.status,
            recorded_at="2026-05-08T09:00:00Z",
            source=source,
            batch_id=batch_id,
        )


class FakeScheduleContextReader:
    def list_due_items(self, pet_id: str, days_ahead: int) -> tuple[PlannedReminder, ...]:
        return ()


class FakeContextAnalysisAgent:
    def analyze(
        self,
        pet: PetProfile,
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
    ) -> ContextAnalysisResult:
        return ContextAnalysisResult()


class FakeRiskDetectionAgent:
    def detect(self, text: str, records: tuple[PetRecord, ...]) -> tuple[object, ...]:
        return ()


class FakeSuggestionAgent:
    def suggest(
        self,
        pet: PetProfile,
        context: ContextAnalysisResult,
        safety_notices: tuple[object, ...],
    ) -> tuple[CareSuggestion, ...]:
        return (
            CareSuggestion(
                title="식사 관리",
                action="식사량을 꾸준히 확인하세요.",
                reason="최근 식사 기록이 있어요.",
                source_record_ids=("record-1",),
            ),
        )


class FakeReminderAgent:
    def __init__(self) -> None:
        self.records: tuple[PetRecord, ...] = ()

    def plan(
        self,
        pet: PetProfile,
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
    ) -> tuple[PlannedReminder, ...]:
        self.records = records
        return ()


class FakeShoppingAgent:
    def __init__(self) -> None:
        self.records: tuple[PetRecord, ...] = ()
        self.suggestions: tuple[CareSuggestion, ...] = ()

    def recommend(
        self,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...] = (),
    ) -> tuple[ShoppingRecommendation, ...]:
        self.records = records
        self.suggestions = suggestions
        return (
            ShoppingRecommendation(
                title="반려견 사료",
                product_url="https://shopping.example/products/food",
                image_url="https://shopping.example/products/food.jpg",
                mall_name="sample mall",
                lowest_price=12000,
                query="반려견 사료",
                reason="식사 기록과 관련된 상품 추천",
                source_record_ids=tuple(record.id for record in records),
            ),
        )


class TestPetLogAgentPipeline(unittest.TestCase):
    def test_saves_each_candidate_from_structured_record_batch(self) -> None:
        meal = StructuredRecordCandidate(
            title="식사",
            detail="밥을 조금 먹음",
            category="meal",
            status="notice",
            confidence=0.86,
            needs_confirmation=False,
        )
        walk = StructuredRecordCandidate(
            title="산책",
            detail="산책을 하지 못함",
            category="walk",
            status="notice",
            confidence=0.84,
            needs_confirmation=False,
        )
        batch = StructuredRecordBatch(candidates=(meal, walk))
        repository = FakeRecordRepository()
        reminder_agent = FakeReminderAgent()
        pipeline = self._pipeline(batch, repository, reminder_agent)

        result = pipeline.handle(
            PetLogAgentInput(
                pet=PetProfile(id="pet-1", name="초코"),
                text="오늘 밥을 조금 먹고 산책은 못 했어",
                source="manual",
            )
        )

        self.assertEqual(result.candidates, (meal, walk))
        self.assertEqual(tuple(record.title for record in result.saved_records), ("식사", "산책"))
        self.assertEqual(result.saved_records[0].batch_id, result.saved_records[1].batch_id)
        self.assertTrue(result.saved_records[0].batch_id)
        self.assertEqual(tuple(record.source for record in result.saved_records), ("manual", "manual"))
        self.assertEqual(repository.saved_candidates, [meal, walk])
        self.assertEqual(repository.saved_sources, ["manual", "manual"])
        self.assertEqual(tuple(record.title for record in reminder_agent.records), ("식사", "산책"))

    def test_confirmation_required_batch_does_not_save_records_without_confirm(self) -> None:
        candidate = StructuredRecordCandidate(
            title="식사",
            detail="밥을 거의 먹지 않음",
            category="meal",
            status="alert",
            confidence=0.7,
            needs_confirmation=True,
        )
        repository = FakeRecordRepository()
        pipeline = self._pipeline(StructuredRecordBatch(candidates=(candidate,)), repository)

        result = pipeline.handle(
            PetLogAgentInput(
                pet=PetProfile(id="pet-1", name="초코"),
                text="오늘 밥을 거의 안 먹었어",
                source="manual",
            )
        )

        self.assertEqual(result.candidates, (candidate,))
        self.assertEqual(result.saved_records, ())
        self.assertEqual(repository.saved_candidates, [])

    def test_ai_preview_source_does_not_save_even_when_candidate_is_confident(self) -> None:
        candidate = StructuredRecordCandidate(
            title="산책",
            detail="저녁 산책 20분",
            category="walk",
            status="normal",
            confidence=0.9,
            needs_confirmation=False,
        )
        repository = FakeRecordRepository()
        pipeline = self._pipeline(StructuredRecordBatch(candidates=(candidate,)), repository)

        result = pipeline.handle(
            PetLogAgentInput(
                pet=PetProfile(id="pet-1", name="초코"),
                text="저녁 산책 20분",
                source="ai_preview",
            )
        )

        self.assertEqual(result.candidates, (candidate,))
        self.assertEqual(result.saved_records, ())
        self.assertEqual(repository.saved_candidates, [])

    def test_langgraph_pipeline_matches_linear_pipeline_result(self) -> None:
        candidate = StructuredRecordCandidate(
            title="식사",
            detail="밥을 조금 먹음",
            category="meal",
            status="notice",
            confidence=0.86,
            needs_confirmation=False,
        )
        input = PetLogAgentInput(
            pet=PetProfile(id="pet-1", name="초코"),
            text="오늘 밥을 조금 먹었어",
            source="manual",
        )
        batch = StructuredRecordBatch(candidates=(candidate,))
        linear_repository = FakeRecordRepository()
        graph_repository = FakeRecordRepository()

        linear_result = self._pipeline(batch, linear_repository).handle(input)
        graph_result = self._graph_pipeline(batch, graph_repository).handle(input)

        self.assertEqual(graph_result.candidates, linear_result.candidates)
        self.assertEqual(
            tuple(record.batch_id is not None for record in graph_result.saved_records),
            tuple(record.batch_id is not None for record in linear_result.saved_records),
        )
        self.assertEqual(
            tuple((record.title, record.category, record.source) for record in graph_result.saved_records),
            tuple((record.title, record.category, record.source) for record in linear_result.saved_records),
        )
        self.assertEqual(graph_result.context_analysis, linear_result.context_analysis)
        self.assertEqual(graph_result.safety_notices, linear_result.safety_notices)
        self.assertEqual(graph_result.suggestions, linear_result.suggestions)
        self.assertEqual(graph_result.reminders, linear_result.reminders)
        self.assertEqual(graph_repository.saved_candidates, linear_repository.saved_candidates)

    def test_langgraph_pipeline_streams_node_updates(self) -> None:
        candidate = StructuredRecordCandidate(
            title="식사",
            detail="밥을 조금 먹음",
            category="meal",
            status="notice",
            confidence=0.86,
            needs_confirmation=False,
        )
        input = PetLogAgentInput(
            pet=PetProfile(id="pet-1", name="초코"),
            text="오늘 밥을 조금 먹었어",
            source="manual",
        )
        pipeline = self._graph_pipeline(StructuredRecordBatch(candidates=(candidate,)), FakeRecordRepository())

        updates = tuple(pipeline.stream_updates(input))
        updated_nodes = {node_name for update in updates for node_name in update}

        self.assertIn("structure_record", updated_nodes)
        self.assertIn("load_context", updated_nodes)
        self.assertIn("build_saved_result", updated_nodes)

    def test_langgraph_pipeline_logs_node_updates_during_handle(self) -> None:
        candidate = StructuredRecordCandidate(
            title="식사",
            detail="밥을 조금 먹음",
            category="meal",
            status="notice",
            confidence=0.86,
            needs_confirmation=False,
        )
        input = PetLogAgentInput(
            pet=PetProfile(id="pet-1", name="초코"),
            text="오늘 밥을 조금 먹었어",
            source="manual",
        )
        pipeline = self._graph_pipeline(StructuredRecordBatch(candidates=(candidate,)), FakeRecordRepository())

        with self.assertLogs("application.pipelines.pet_log_graph", level="INFO") as logs:
            pipeline.handle(input)

        log_output = "\n".join(logs.output)
        self.assertIn("pet_log_agent_graph_node_completed node=structure_record", log_output)
        self.assertIn("pet_log_agent_graph_node_completed node=build_saved_result", log_output)
        self.assertNotIn(input.text, log_output)

    def test_saved_records_are_used_for_shopping_recommendations(self) -> None:
        candidate = StructuredRecordCandidate(
            title="아침 식사",
            detail="사료를 조금 남겼어요.",
            category="meal",
            status="notice",
            confidence=0.86,
            needs_confirmation=False,
        )
        shopping_agent = FakeShoppingAgent()

        result = self._pipeline(
            StructuredRecordBatch(candidates=(candidate,)),
            FakeRecordRepository(),
            shopping_agent=shopping_agent,
        ).handle(
            PetLogAgentInput(
                pet=PetProfile(id="pet-1", name="초코", species="dog"),
                text="아침 사료를 조금 남겼어요.",
                source="manual",
            )
        )

        self.assertEqual(tuple(record.id for record in shopping_agent.records), ("record-1",))
        self.assertEqual(tuple(suggestion.title for suggestion in shopping_agent.suggestions), ("식사 관리",))
        self.assertEqual(result.shopping_recommendations[0].query, "반려견 사료")

    def _pipeline(
        self,
        batch: StructuredRecordBatch,
        repository: FakeRecordRepository,
        reminder_agent: FakeReminderAgent | None = None,
        shopping_agent: FakeShoppingAgent | None = None,
    ) -> PetLogAgentPipeline:
        reminder_agent = reminder_agent or FakeReminderAgent()
        return PetLogAgentPipeline(
            record_structuring_agent=FakeRecordStructuringAgent(batch),
            record_history_reader=repository,
            schedule_context_reader=FakeScheduleContextReader(),
            context_analysis_agent=FakeContextAnalysisAgent(),
            risk_detection_agent=FakeRiskDetectionAgent(),
            record_repository=repository,
            suggestion_agent=FakeSuggestionAgent(),
            reminder_agent=reminder_agent,
            shopping_agent=shopping_agent,
        )

    def _graph_pipeline(
        self,
        batch: StructuredRecordBatch,
        repository: FakeRecordRepository,
        reminder_agent: FakeReminderAgent | None = None,
        shopping_agent: FakeShoppingAgent | None = None,
    ) -> LangGraphPetLogAgentPipeline:
        reminder_agent = reminder_agent or FakeReminderAgent()
        return LangGraphPetLogAgentPipeline(
            record_structuring_agent=FakeRecordStructuringAgent(batch),
            record_history_reader=repository,
            schedule_context_reader=FakeScheduleContextReader(),
            context_analysis_agent=FakeContextAnalysisAgent(),
            risk_detection_agent=FakeRiskDetectionAgent(),
            record_repository=repository,
            suggestion_agent=FakeSuggestionAgent(),
            reminder_agent=reminder_agent,
            shopping_agent=shopping_agent,
        )


if __name__ == "__main__":
    unittest.main()
