from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from domain.models import (
    CareInsight,
    CareSuggestion,
    ContextAnalysisResult,
    PetProfile,
    PetRecord,
    PlannedReminder,
    SafetyNotice,
    ShoppingRecommendation,
    StructuredRecordBatch,
    StructuredRecordCandidate,
)


@dataclass(frozen=True)
class PetLogAgentInput:
    pet: PetProfile
    text: str
    source: str
    confirm: bool = False


@dataclass(frozen=True)
class PetLogAgentResult:
    candidates: tuple[StructuredRecordCandidate, ...]
    saved_records: tuple[PetRecord, ...] = ()
    context_analysis: ContextAnalysisResult | None = None
    safety_notices: tuple[SafetyNotice, ...] = field(default_factory=tuple)
    suggestions: tuple[CareSuggestion, ...] = field(default_factory=tuple)
    shopping_recommendations: tuple[ShoppingRecommendation, ...] = field(default_factory=tuple)
    reminders: tuple[PlannedReminder, ...] = field(default_factory=tuple)

    @property
    def record_batch(self) -> StructuredRecordBatch:
        return StructuredRecordBatch(candidates=self.candidates)

    @property
    def candidate(self) -> StructuredRecordCandidate | None:
        return self.candidates[0] if self.candidates else None

    @property
    def saved_record(self) -> PetRecord | None:
        return self.saved_records[0] if self.saved_records else None


@dataclass(frozen=True)
class HomeFeedResult:
    today_summary: str
    recent_changes: tuple[str, ...] = ()
    alerts: tuple[CareInsight, ...] = ()
    suggestion_cards: tuple[CareSuggestion, ...] = ()
    reminders: tuple[PlannedReminder, ...] = ()


@dataclass(frozen=True)
class CareQuestionResult:
    answer: str
    safety_notice: SafetyNotice | None = None
    referenced_record_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class PetChatResult:
    answer: str
    routed_to_care_question: bool = False
    safety_notice: SafetyNotice | None = None


@dataclass(frozen=True)
class HospitalSummaryResult:
    summary: str
    record_ids: tuple[str, ...] = ()
    safety_notice: SafetyNotice | None = None


@dataclass(frozen=True)
class RecordSummaryResult:
    summary: str
    record_ids: tuple[str, ...] = ()
    highlights: tuple[str, ...] = ()
    behavior_patterns: tuple[str, ...] = ()
    missing_record_notes: tuple[str, ...] = ()
    safety_notice: SafetyNotice | None = None


@dataclass(frozen=True)
class ProactiveQuestionResult:
    question: str
    reason: str
    source_record_ids: tuple[str, ...] = ()
    related_due_items: tuple[PlannedReminder, ...] = ()
    route: Literal["record_input", "care_question", "schedule"] = "record_input"


@dataclass(frozen=True)
class NotificationCandidate:
    title: str
    message: str
    kind: Literal["risk", "behavior_change", "schedule", "missing_record"]
    dedupe_key: str
    source_record_ids: tuple[str, ...] = ()
    due_date: str | None = None
    safety_notice: SafetyNotice | None = None
    action_href: str = "/record"
