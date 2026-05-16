from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from application.action_navigation import normalize_action_href
from application.agents.hospital import HospitalRecommendationResult
from application.dto import PetLogAgentResult
from domain.enums import RecordInputSource
from domain.models import (
    CareInsight,
    CareSuggestion,
    PetRecord,
    PlannedReminder,
    SafetyNotice,
    ShoppingRecommendation,
    StructuredRecordCandidate,
    VeterinaryHospitalRecommendation,
)


class PetLogRecordRequest(BaseModel):
    pet_id: str = Field(min_length=1)
    text: str = Field(min_length=1)
    source: RecordInputSource = "manual"
    confirm: bool = False

    @field_validator("text")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("text must not be blank")
        return stripped


class CareAnswerRequest(BaseModel):
    pet_id: str = Field(min_length=1)
    question: str = Field(min_length=1)

    @field_validator("pet_id", "question")
    @classmethod
    def reject_blank_care_answer(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("value must not be blank")
        return stripped


class PetChatRequest(BaseModel):
    pet_id: str = Field(min_length=1)
    message: str = Field(min_length=1)

    @field_validator("pet_id", "message")
    @classmethod
    def reject_blank_pet_chat(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("value must not be blank")
        return stripped


class HospitalRecommendationRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_meters: float | None = Field(default=None, ge=0, le=100000)
    location_source: str = Field(default="gps", min_length=1, max_length=32)
    radius_meters: int = Field(default=3000, ge=100, le=50000)
    max_results: int = Field(default=5, ge=1, le=20)
    language_code: str = Field(default="ko", min_length=2, max_length=8)
    region_code: str = Field(default="KR", min_length=2, max_length=2)
    open_now_only: bool = True
    emergency: bool = False
    text: str = ""


class RecordUpdateRequest(BaseModel):
    detail: str = Field(min_length=1)
    category: str = Field(min_length=1)
    title: str = Field(min_length=1)
    status: str = "normal"

    @field_validator("detail", "category", "title")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("value must not be blank")
        return stripped


class ScheduleCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    pet_id: str = Field(min_length=1)
    category: str = Field(min_length=1)
    title: str = Field(min_length=1)
    due_date: str = Field(alias="dueDate", min_length=1)
    repeat_label: str = Field(alias="repeatLabel", default="한 번")
    note: str = ""

    @field_validator("pet_id", "category", "title", "due_date")
    @classmethod
    def reject_blank_schedule(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("value must not be blank")
        return stripped


class ScheduleUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category: str | None = None
    title: str | None = None
    due_date: str | None = Field(alias="dueDate", default=None)
    repeat_label: str | None = Field(alias="repeatLabel", default=None)
    note: str | None = None
    is_done: bool | None = Field(alias="isDone", default=None)


class ProfileUpdateRequest(BaseModel):
    pet_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    breed: str = ""
    age: str = ""
    sex: str = ""
    weight: str = ""
    birthday: str = ""
    personality: str = ""
    notes: list[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def reject_blank_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped


class PetCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    species: str = "companion"
    breed: str = ""

    @field_validator("name")
    @classmethod
    def reject_blank_pet_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped


def success_response(data: dict[str, Any]) -> dict[str, Any]:
    return {"success": True, "data": data}


def hospital_recommendation_result_to_dict(
    result: HospitalRecommendationResult,
) -> dict[str, Any]:
    return {
        "current_time": result.current_time.isoformat(),
        "search_center": {
            "latitude": result.center_latitude,
            "longitude": result.center_longitude,
            "radius_meters": result.radius_meters,
            "location_source": result.location_source,
            "accuracy_meters": result.accuracy_meters,
            "emergency_mode": result.emergency_mode,
        },
        "recommendations": [
            _hospital_recommendation_to_dict(recommendation)
            for recommendation in result.recommendations
        ],
    }


def pet_log_agent_result_to_dict(result: PetLogAgentResult) -> dict[str, Any]:
    return {
        "candidates": [_candidate_to_dict(candidate) for candidate in result.candidates],
        "saved_records": [_record_to_dict(record) for record in result.saved_records],
        "needs_confirmation": result.record_batch.needs_confirmation,
        "safety_notices": [safety_notice_to_dict(notice) for notice in result.safety_notices],
        "suggestions": [suggestion_to_dict(suggestion) for suggestion in result.suggestions],
        "shopping_recommendations": [
            _shopping_recommendation_to_dict(recommendation)
            for recommendation in result.shopping_recommendations
        ],
        "reminders": [_reminder_to_dict(reminder) for reminder in result.reminders],
    }


def _candidate_to_dict(candidate: StructuredRecordCandidate) -> dict[str, Any]:
    return {
        "title": candidate.title,
        "detail": candidate.detail,
        "category": candidate.category,
        "status": candidate.status,
        "confidence": candidate.confidence,
        "needs_confirmation": candidate.needs_confirmation,
        "measurements": list(candidate.measurements),
    }


def _record_to_dict(record: PetRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "pet_id": record.pet_id,
        "category": record.category,
        "title": record.title,
        "detail": record.detail,
        "status": record.status,
        "recorded_at": record.recorded_at,
        "source": record.source,
        "batch_id": record.batch_id,
    }


def safety_notice_to_dict(notice: SafetyNotice) -> dict[str, Any]:
    return {
        "level": notice.level,
        "message": notice.message,
    }


def insight_to_dict(insight: CareInsight) -> dict[str, Any]:
    return {
        "severity": insight.severity,
        "title": insight.title,
        "reason": insight.reason,
        "sourceRecordIds": list(insight.source_record_ids),
        "actionHref": normalize_action_href(insight.action_href, fallback=None),
    }


def suggestion_to_dict(suggestion: CareSuggestion) -> dict[str, Any]:
    return {
        "title": suggestion.title,
        "action": suggestion.action,
        "reason": suggestion.reason,
        "severity": suggestion.severity,
        "source_record_ids": list(suggestion.source_record_ids),
        "actionHref": normalize_action_href(suggestion.action_href, fallback="/record") or "/record",
    }


def _shopping_recommendation_to_dict(recommendation: ShoppingRecommendation) -> dict[str, Any]:
    return shopping_recommendation_to_dict(recommendation)


def shopping_recommendation_to_dict(recommendation: ShoppingRecommendation) -> dict[str, Any]:
    return {
        "id": recommendation.id or recommendation.product_url or recommendation.query,
        "category": recommendation.category,
        "title": recommendation.title,
        "detail": recommendation.detail,
        "product_url": recommendation.product_url,
        "image_url": recommendation.image_url,
        "mall_name": recommendation.mall_name,
        "lowest_price": recommendation.lowest_price,
        "query": recommendation.query,
        "reason": recommendation.reason,
        "tone": recommendation.tone,
        "source_record_ids": list(recommendation.source_record_ids),
    }


def _hospital_recommendation_to_dict(recommendation: VeterinaryHospitalRecommendation) -> dict[str, Any]:
    return {
        "place_id": recommendation.place_id,
        "name": recommendation.name,
        "address": recommendation.address,
        "phone_number": recommendation.phone_number,
        "google_maps_url": recommendation.google_maps_url,
        "latitude": recommendation.latitude,
        "longitude": recommendation.longitude,
        "rating": recommendation.rating,
        "user_rating_count": recommendation.user_rating_count,
        "is_open_now": recommendation.is_open_now,
        "is_24_hours": recommendation.is_24_hours,
        "weekday_text": list(recommendation.weekday_text),
        "distance_meters": recommendation.distance_meters,
        "reason": recommendation.reason,
    }


def _reminder_to_dict(reminder: PlannedReminder) -> dict[str, Any]:
    return {
        "title": reminder.title,
        "due_date": reminder.due_date,
        "reason": reminder.reason,
    }
