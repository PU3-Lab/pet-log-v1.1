from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from application.dto import PetLogAgentInput, PetLogAgentResult
from composition import AppContext
from domain.models import CareSchedule, PetProfile, PetRecord
from presentation.http.schemas import (
    CareAnswerRequest,
    PetChatRequest,
    PetCreateRequest,
    PetLogRecordRequest,
    ProfileUpdateRequest,
    RecordUpdateRequest,
    ScheduleCreateRequest,
    ScheduleUpdateRequest,
    insight_to_dict,
    pet_log_agent_result_to_dict,
    suggestion_to_dict,
    success_response,
)


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
server_logger = logging.getLogger("uvicorn.error")


def build_pet_log_router() -> APIRouter:
    router = APIRouter()

    @router.get("/api/v1/me")
    def get_me() -> dict[str, object]:
        return success_response({
            "id": "local-user",
            "name": "현지 보호자",
            "email": "local@example.com",
        })

    @router.get("/api/v1/pets")
    def list_pets(http_request: Request) -> dict[str, object]:
        app_context = _app_context(http_request)
        pets = app_context.pet_profile_reader.list_pets()
        return success_response({
            "pets": [_profile_to_frontend_entry(pet) | {"id": pet.id} for pet in pets]
        })

    @router.post("/api/v1/pets")
    def create_pet(http_request: Request, request: PetCreateRequest) -> dict[str, object]:
        app_context = _app_context(http_request)
        pet = app_context.pet_profile_reader.create_pet(
            name=request.name,
            species=request.species,
            breed=request.breed or None,
        )
        return success_response(_profile_to_frontend_entry(pet) | {"id": pet.id})

    @router.get("/api/v1/pets/{pet_id}")
    def get_pet_detail(http_request: Request, pet_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        try:
            pet = app_context.pet_profile_reader.get_pet(pet_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Pet not found") from exc
        return success_response(_profile_to_frontend_entry(pet) | {"id": pet.id})

    @router.patch("/api/v1/pets/{pet_id}")
    def update_pet_detail(http_request: Request, pet_id: str, request: ProfileUpdateRequest) -> dict[str, object]:
        app_context = _app_context(http_request)
        try:
            pet = app_context.pet_profile_reader.update_profile(
                pet_id=pet_id,
                name=request.name or None,
                breed=request.breed or None,
                age_label=request.age or None,
                sex_label=request.sex or None,
                weight_label=request.weight or None,
                birthday=request.birthday or None,
                personality=request.personality or None,
                notes=tuple(request.notes) if request.notes is not None else None,
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Pet not found") from exc
        return success_response(_profile_to_frontend_entry(pet) | {"id": pet.id})

    @router.delete("/api/v1/pets/{pet_id}")
    def delete_pet(http_request: Request, pet_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        deleted = app_context.pet_profile_reader.delete_pet(pet_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Pet not found")
        return success_response({"id": pet_id})

    @router.get("/api/v1/pet-log/profile")
    def get_profile(http_request: Request, pet_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        try:
            pet = app_context.pet_profile_reader.get_pet(pet_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Pet not found") from exc
        return success_response(_profile_to_frontend_entry(pet))

    @router.get("/api/v1/pet-log/records")
    def list_records(
        http_request: Request,
        pet_id: str,
        category: str | None = None,
        lookback_days: int = 3650,
    ) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.record_reader is None:
            raise HTTPException(status_code=500, detail="Record reader not configured")
        records = app_context.record_reader.list_recent(pet_id, lookback_days=lookback_days)
        if category:
            records = tuple(r for r in records if r.category == category)
        return success_response({
            "records": [
                _record_to_frontend_entry(record)
                for record in sorted(records, key=lambda item: item.recorded_at, reverse=True)
            ]
        })

    @router.get("/api/v1/pet-log/records/{record_id}")
    def get_record(http_request: Request, record_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.record_reader is None:
            raise HTTPException(status_code=500, detail="Record reader not configured")
        record = app_context.record_reader.get_by_id(record_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Record not found")
        return success_response(_record_to_frontend_entry(record))

    @router.get("/api/v1/pet-log/schedules")
    def list_schedules(http_request: Request, pet_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.schedule_reader is None:
            raise HTTPException(status_code=500, detail="Schedule reader not configured")
        schedules = app_context.schedule_reader.list_for_pet(pet_id)
        return success_response({
            "schedules": [_schedule_to_frontend_entry(schedule) for schedule in schedules]
        })

    @router.post("/api/v1/pet-log/records")
    def handle_pet_log_record(http_request: Request, request: PetLogRecordRequest) -> dict[str, object]:
        app_context = _app_context(http_request)
        try:
            pet = app_context.pet_profile_reader.get_pet(request.pet_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Pet not found") from exc

        result = app_context.pet_log_agent_pipeline.handle(
            PetLogAgentInput(
                pet=pet,
                text=request.text,
                source=request.source,
                confirm=request.confirm,
            )
        )
        _log_pet_log_record_result(request, result)
        return success_response(pet_log_agent_result_to_dict(result))

    @router.patch("/api/v1/pet-log/records/{record_id}")
    def update_record(http_request: Request, record_id: str, request: RecordUpdateRequest) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.record_reader is None:
            raise HTTPException(status_code=500, detail="Record reader not configured")
        updated = app_context.record_reader.update(
            record_id, request.category, request.title, request.detail, request.status
        )
        if updated is None:
            raise HTTPException(status_code=404, detail="Record not found")
        return success_response(_record_to_frontend_entry(updated))

    @router.delete("/api/v1/pet-log/records/{record_id}")
    def delete_record(http_request: Request, record_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.record_reader is None:
            raise HTTPException(status_code=500, detail="Record reader not configured")
        deleted = app_context.record_reader.soft_delete(record_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Record not found")
        return success_response({"id": record_id})

    @router.post("/api/v1/pet-log/schedules")
    def create_schedule(http_request: Request, request: ScheduleCreateRequest) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.schedule_reader is None:
            raise HTTPException(status_code=500, detail="Schedule reader not configured")
        schedule = app_context.schedule_reader.create(
            pet_id=request.pet_id,
            category=request.category,
            title=request.title,
            due_date=request.due_date,
            repeat_label=request.repeat_label,
            note=request.note,
        )
        return success_response(_schedule_to_frontend_entry(schedule))

    @router.patch("/api/v1/pet-log/schedules/{schedule_id}")
    def update_schedule(http_request: Request, schedule_id: str, request: ScheduleUpdateRequest) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.schedule_reader is None:
            raise HTTPException(status_code=500, detail="Schedule reader not configured")
        updated = app_context.schedule_reader.update(
            schedule_id,
            category=request.category,
            title=request.title,
            due_date=request.due_date,
            repeat_label=request.repeat_label,
            note=request.note,
            is_done=request.is_done,
        )
        if updated is None:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return success_response(_schedule_to_frontend_entry(updated))

    @router.delete("/api/v1/pet-log/schedules/{schedule_id}")
    def delete_schedule(http_request: Request, schedule_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.schedule_reader is None:
            raise HTTPException(status_code=500, detail="Schedule reader not configured")
        deleted = app_context.schedule_reader.soft_delete(schedule_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return success_response({"id": schedule_id})

    @router.put("/api/v1/pet-log/profile")
    def update_profile(http_request: Request, request: ProfileUpdateRequest) -> dict[str, object]:
        app_context = _app_context(http_request)
        try:
            pet = app_context.pet_profile_reader.update_profile(
                pet_id=request.pet_id,
                name=request.name or None,
                breed=request.breed or None,
                age_label=request.age or None,
                sex_label=request.sex or None,
                weight_label=request.weight or None,
                birthday=request.birthday or None,
                personality=request.personality or None,
                notes=tuple(request.notes) if request.notes is not None else None,
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Pet not found") from exc
        return success_response(_profile_to_frontend_entry(pet))

    @router.get("/api/v1/ai/insights")
    def get_ai_insights(http_request: Request, pet_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.record_reader is None or app_context.schedule_reader is None:
            raise HTTPException(status_code=500, detail="Repository not configured")
        if app_context.context_analysis_agent is None:
            raise HTTPException(status_code=500, detail="Context analysis agent not configured")
        try:
            pet = app_context.pet_profile_reader.get_pet(pet_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Pet not found") from exc

        recent_records = app_context.record_reader.list_recent(pet_id, lookback_days=30)
        due_items = app_context.schedule_reader.list_due_items(pet_id, days_ahead=14)
        context = app_context.context_analysis_agent.analyze(pet, recent_records, due_items)
        insights = context.insights + context.missing_record_insights
        return success_response({"insights": [insight_to_dict(insight) for insight in insights]})

    @router.get("/api/v1/ai/suggestions")
    def get_ai_suggestions(http_request: Request, pet_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.record_reader is None or app_context.schedule_reader is None:
            raise HTTPException(status_code=500, detail="Repository not configured")
        if app_context.context_analysis_agent is None:
            raise HTTPException(status_code=500, detail="Context analysis agent not configured")
        if app_context.suggestion_agent is None:
            raise HTTPException(status_code=500, detail="Suggestion agent not configured")
        
        try:
            pet = app_context.pet_profile_reader.get_pet(pet_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Pet not found") from exc

        recent_records = app_context.record_reader.list_recent(pet_id, lookback_days=30)
        due_items = app_context.schedule_reader.list_due_items(pet_id, days_ahead=14)
        context = app_context.context_analysis_agent.analyze(pet, recent_records, due_items)
        suggestions = app_context.suggestion_agent.suggest(pet, context, ())
        return success_response({"suggestions": [suggestion_to_dict(s) for s in suggestions]})

    @router.post("/api/v1/ai/care-answer")
    def answer_care_question(http_request: Request, request: CareAnswerRequest) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.care_question_pipeline is None:
            raise HTTPException(status_code=500, detail="Care answer pipeline not configured")

        try:
            app_context.pet_profile_reader.get_pet(request.pet_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Pet not found") from exc

        result = app_context.care_question_pipeline.ask(request.pet_id, request.question)
        return success_response(
            {
                "answer": result.answer,
                "referencedRecordIds": list(result.referenced_record_ids),
                "safetyNotice": result.safety_notice.message if result.safety_notice else "",
            }
        )

    @router.post("/api/v1/ai/pet-chat")
    def chat_with_pet(http_request: Request, request: PetChatRequest) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.pet_chat_pipeline is None:
            raise HTTPException(status_code=500, detail="Pet chat pipeline not configured")

        try:
            app_context.pet_profile_reader.get_pet(request.pet_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Pet not found") from exc

        result = app_context.pet_chat_pipeline.chat(request.pet_id, request.message)
        return success_response(
            {
                "answer": result.answer,
                "routedToCareQuestion": result.routed_to_care_question,
                "safetyNotice": result.safety_notice.message if result.safety_notice else "",
            }
        )

    return router


def _app_context(request: Request) -> AppContext:
    return request.app.state.app_context


def _profile_to_frontend_entry(pet: PetProfile) -> dict[str, object]:
    profile = {
        "name": pet.name,
        "breed": pet.breed or "",
        "age": pet.age_label or "",
        "sex": pet.sex_label or "",
        "weight": pet.weight_label or "",
        "birthday": pet.birthday or "",
        "personality": pet.personality or "",
        "notes": list(pet.notes),
    }
    if pet.photo_file_id:
        profile["photoDataUrl"] = f"/api/v1/files/{pet.photo_file_id}"
    return profile


def _record_to_frontend_entry(record: PetRecord) -> dict[str, object]:
    return {
        "id": record.id,
        "date": _date_label(record.recorded_at),
        "time": _time_label(record.recorded_at),
        "recordedAt": record.recorded_at,
        "batchId": record.batch_id,
        "category": record.category,
        "title": record.title,
        "detail": record.detail,
        "status": record.status,
    }


def _schedule_to_frontend_entry(schedule: CareSchedule) -> dict[str, object]:
    return {
        "id": schedule.id,
        "category": schedule.category,
        "title": schedule.title,
        "dueDate": schedule.due_date,
        "repeatLabel": schedule.repeat_label,
        "note": schedule.note,
        "isDone": schedule.is_done,
    }


def _date_label(value: str) -> str:
    date_part = value.split("T", maxsplit=1)[0]
    parts = date_part.split("-")
    if len(parts) != 3:
        return ""
    return f"{int(parts[1])}월 {int(parts[2])}일"


def _time_label(value: str) -> str:
    if "T" not in value:
        return ""
    time_part = value.split("T", maxsplit=1)[1].replace("Z", "")
    parts = time_part.split(":", maxsplit=2)
    if len(parts) < 2:
        return ""
    return f"{parts[0]}:{parts[1]}"


def _log_pet_log_record_result(request: PetLogRecordRequest, result: PetLogAgentResult) -> None:
    first_candidate = result.candidate
    first_saved_record = result.saved_record
    message = (
        'record.result | pet_id=%s | source=%s | mode=%s | confirm=%s | candidates=%d | saved=%d | '
        'needs_confirmation=%s | first="%s" | saved_id=%s'
    )
    args = (
        request.pet_id,
        request.source,
        _result_mode(request, result),
        _yes_no(request.confirm),
        len(result.candidates),
        len(result.saved_records),
        _yes_no(result.record_batch.needs_confirmation),
        f"{first_candidate.category}: {first_candidate.title}" if first_candidate else "-",
        first_saved_record.id if first_saved_record else "-",
    )
    logger.info(message, *args)
    server_logger.info(message, *args)


def _result_mode(request: PetLogRecordRequest, result: PetLogAgentResult) -> str:
    if request.source == "ai_preview":
        return "preview"
    if result.saved_records:
        return "saved"
    if result.record_batch.needs_confirmation and not request.confirm:
        return "pending_confirmation"
    return "processed"


def _yes_no(value: bool) -> str:
    return "yes" if value else "no"
