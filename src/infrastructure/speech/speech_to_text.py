from __future__ import annotations

import os
import tempfile
from collections.abc import Callable, Mapping
from typing import Protocol

import whisper


DEFAULT_WHISPER_MODEL = "medium"
DEFAULT_TRANSCRIBE_OPTIONS: dict[str, object] = {"fp16": False}


class WhisperModel(Protocol):
    def transcribe(self, audio_path: str, **options: object) -> Mapping[str, object]:
        raise NotImplementedError


WhisperModelLoader = Callable[..., WhisperModel]


class SpeechToTextProvider:
    def __init__(
        self,
        *,
        model_name: str | None = None,
        model_loader: WhisperModelLoader | None = None,
        model_options: Mapping[str, object] | None = None,
        transcribe_options: Mapping[str, object] | None = None,
        model: WhisperModel | None = None,
    ) -> None:
        self._model_name = model_name or os.environ.get("WHISPER_MODEL", DEFAULT_WHISPER_MODEL)
        self._model_loader = model_loader or load_whisper_model
        self._model_options = dict(model_options or {})
        self._transcribe_options = {
            **DEFAULT_TRANSCRIBE_OPTIONS,
            **dict(transcribe_options or {}),
        }
        self._model = model

    def transcribe(self, audio: bytes, content_type: str) -> str:
        if not audio:
            raise ValueError("audio must not be empty.")

        suffix = suffix_for_content_type(content_type)
        with tempfile.NamedTemporaryFile(suffix=suffix) as audio_file:
            audio_file.write(audio)
            audio_file.flush()
            result = self._whisper_model().transcribe(audio_file.name, **self._transcribe_options)

        text = result.get("text")
        if not isinstance(text, str):
            raise RuntimeError("Whisper transcription result did not include text.")
        return text.strip()

    def _whisper_model(self) -> WhisperModel:
        if self._model is None:
            self._model = self._model_loader(self._model_name, **self._model_options)
        return self._model


def load_whisper_model(model_name: str, **options: object) -> WhisperModel:
    return whisper.load_model(model_name, **options)


def suffix_for_content_type(content_type: str) -> str:
    normalized = content_type.split(";")[0].strip().lower()
    suffixes = {
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/mp4": ".mp4",
        "audio/wav": ".wav",
        "audio/wave": ".wav",
        "audio/x-wav": ".wav",
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/x-m4a": ".m4a",
    }
    return suffixes.get(normalized, ".audio")
