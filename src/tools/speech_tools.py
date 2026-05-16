from __future__ import annotations


class SpeechTools:
    def __init__(
        self,
        speech_to_text,
        text_to_speech,
    ) -> None:
        self._speech_to_text = speech_to_text
        self._text_to_speech = text_to_speech

    def transcribe(self, audio: bytes, content_type: str) -> str:
        return self._speech_to_text.transcribe(audio, content_type)

    def synthesize(self, text: str, voice: str | None = None) -> bytes:
        return self._text_to_speech.synthesize(text, voice)
