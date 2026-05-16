from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from composition import AppContext
from presentation.http.schemas import success_response


MAX_AUDIO_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_TTS_TEXT_LENGTH = 500
MAX_STT_TEXT_LENGTH = 500

logger = logging.getLogger(__name__)


class SpeechSynthesisRequest(BaseModel):
    text: str
    voice: str | None = None


class SpeechTextCorrectionRequest(BaseModel):
    text: str


def build_speech_router() -> APIRouter:
    router = APIRouter()

    @router.post("/api/v1/speech/transcriptions")
    async def handle_speech_transcription(
        http_request: Request,
        audio: UploadFile = File(...),
    ) -> dict[str, object]:
        content_type = audio.content_type or ""
        if not content_type.split(";")[0].strip().lower().startswith("audio/"):
            raise HTTPException(status_code=415, detail="Unsupported audio content type")

        audio_bytes = await audio.read(MAX_AUDIO_UPLOAD_BYTES + 1)
        await audio.close()
        if not audio_bytes:
            raise HTTPException(status_code=422, detail="Audio file must not be empty")
        if len(audio_bytes) > MAX_AUDIO_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Audio file is too large")

        context = _app_context(http_request)
        text = context.speech_to_text.transcribe(audio_bytes, content_type)
        corrected_text = _correct_speech_text(context, text)
        return success_response({"text": text, "corrected_text": corrected_text})

    @router.post("/api/v1/speech/text-corrections")
    async def handle_speech_text_correction(
        http_request: Request,
        correction_request: SpeechTextCorrectionRequest,
    ) -> dict[str, object]:
        text = correction_request.text.strip()
        if not text:
            raise HTTPException(status_code=422, detail="Text must not be empty")
        if len(text) > MAX_STT_TEXT_LENGTH:
            raise HTTPException(status_code=413, detail="Text is too long")

        corrected_text = _correct_speech_text(_app_context(http_request), text)
        return success_response({"text": text, "corrected_text": corrected_text})

    @router.post("/api/v1/speech/synthesis")
    async def handle_speech_synthesis(
        http_request: Request,
        synthesis_request: SpeechSynthesisRequest,
    ) -> Response:
        text = synthesis_request.text.strip()
        if not text:
            raise HTTPException(status_code=422, detail="Text must not be empty")
        if len(text) > MAX_TTS_TEXT_LENGTH:
            raise HTTPException(status_code=413, detail="Text is too long")

        context = _app_context(http_request)
        if context.text_to_speech is None:
            raise HTTPException(status_code=503, detail="Text-to-speech provider is not configured")

        try:
            audio = await run_in_threadpool(
                context.text_to_speech.synthesize,
                text,
                synthesis_request.voice,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Text-to-speech synthesis failed") from exc

        return Response(content=audio, media_type="audio/mpeg")

    return router


def _app_context(request: Request) -> AppContext:
    return request.app.state.app_context


def _correct_speech_text(context: AppContext, text: str) -> str:
    corrector = getattr(context, "speech_text_corrector", None)
    if corrector is None:
        return text

    try:
        corrected = corrector.correct(text, pet_names=_profile_names(context))
    except Exception:
        logger.exception("speech text correction failed")
        return text

    return corrected.strip() or text


def _profile_names(context: AppContext) -> tuple[str, ...]:
    profile_reader = getattr(context, "pet_profile_reader", None)
    if profile_reader is None or not hasattr(profile_reader, "list_pets"):
        return ()

    try:
        pets = profile_reader.list_pets()
    except Exception:
        logger.exception("speech text correction profile lookup failed")
        return ()

    names: list[str] = []
    for pet in pets:
        name = getattr(pet, "name", "")
        if isinstance(name, str):
            normalized = name.strip()
            if normalized and normalized not in names:
                names.append(normalized)
    return tuple(names)
