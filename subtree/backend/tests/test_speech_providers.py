from __future__ import annotations

import unittest
from pathlib import Path

from infrastructure.speech.speech_to_text import SpeechToTextProvider
from infrastructure.speech.speech_text_correction import SpeechTextCorrectionProvider
from infrastructure.speech.text_to_speech import TextToSpeechProvider


class FakeWhisperModel:
    def __init__(self, text: str) -> None:
        self.text = text
        self.calls: list[tuple[str, dict[str, object]]] = []

    def transcribe(self, audio_path: str, **options: object) -> dict[str, str]:
        self.calls.append((audio_path, options))
        self.seen_audio = Path(audio_path).read_bytes()
        return {"text": self.text}


class FakeEdgeCommunicate:
    calls: list[tuple[str, str]] = []

    def __init__(self, text: str, voice: str) -> None:
        self.text = text
        self.voice = voice
        self.calls.append((text, voice))

    async def save(self, audio_path: str) -> None:
        Path(audio_path).write_bytes(f"{self.voice}:{self.text}".encode("utf-8"))


class FakeCorrectionModel:
    def __init__(self, content: str) -> None:
        self.content = content
        self.messages: list[object] = []

    def invoke(self, messages: list[object], config: object | None = None) -> object:
        self.messages = messages
        return type("Message", (), {"content": self.content})()

    def with_fallbacks(self, fallbacks, *, exceptions_to_handle, exception_key=None):
        return self


class TestSpeechProviders(unittest.TestCase):
    def test_stt_uses_whisper_medium_by_default_and_transcribes_audio(self):
        created: list[dict[str, object]] = []
        model = FakeWhisperModel(" 산책 다녀왔어 ")

        def load_model(model_name: str, **kwargs: object) -> FakeWhisperModel:
            created.append({"model_name": model_name, "kwargs": kwargs})
            return model

        provider = SpeechToTextProvider(model_loader=load_model)

        result = provider.transcribe(b"audio-bytes", "audio/webm")

        self.assertEqual(result, "산책 다녀왔어")
        self.assertEqual(created, [{"model_name": "medium", "kwargs": {}}])
        self.assertEqual(model.seen_audio, b"audio-bytes")
        self.assertEqual(model.calls[0][1], {"fp16": False})

    def test_stt_can_override_model_and_transcribe_options(self):
        created: list[dict[str, object]] = []
        model = FakeWhisperModel("밥 먹었어")

        def load_model(model_name: str, **kwargs: object) -> FakeWhisperModel:
            created.append({"model_name": model_name, "kwargs": kwargs})
            return model

        provider = SpeechToTextProvider(
            model_name="small",
            model_loader=load_model,
            model_options={"device": "cpu"},
            transcribe_options={"language": "ko"},
        )

        result = provider.transcribe(b"audio", "audio/mpeg")

        self.assertEqual(result, "밥 먹었어")
        self.assertEqual(created, [{"model_name": "small", "kwargs": {"device": "cpu"}}])
        self.assertEqual(model.calls[0][1], {"fp16": False, "language": "ko"})

    def test_tts_uses_edge_tts_default_voice_and_returns_audio_bytes(self):
        FakeEdgeCommunicate.calls = []
        provider = TextToSpeechProvider(communicate_factory=FakeEdgeCommunicate)

        audio = provider.synthesize("안녕")

        self.assertEqual(audio, "ko-KR-SunHiNeural:안녕".encode("utf-8"))
        self.assertEqual(FakeEdgeCommunicate.calls, [("안녕", "ko-KR-SunHiNeural")])

    def test_tts_can_override_voice(self):
        FakeEdgeCommunicate.calls = []
        provider = TextToSpeechProvider(communicate_factory=FakeEdgeCommunicate)

        audio = provider.synthesize("초코야", voice="ko-KR-InJoonNeural")

        self.assertEqual(audio, "ko-KR-InJoonNeural:초코야".encode("utf-8"))
        self.assertEqual(FakeEdgeCommunicate.calls, [("초코야", "ko-KR-InJoonNeural")])

    def test_tts_reuses_cached_audio_for_same_text_and_voice(self):
        FakeEdgeCommunicate.calls = []
        provider = TextToSpeechProvider(communicate_factory=FakeEdgeCommunicate)

        first_audio = provider.synthesize(" 안녕 ")
        second_audio = provider.synthesize("안녕")
        different_voice_audio = provider.synthesize("안녕", voice="ko-KR-InJoonNeural")

        self.assertEqual(first_audio, second_audio)
        self.assertEqual(first_audio, "ko-KR-SunHiNeural:안녕".encode("utf-8"))
        self.assertEqual(different_voice_audio, "ko-KR-InJoonNeural:안녕".encode("utf-8"))
        self.assertEqual(
            FakeEdgeCommunicate.calls,
            [("안녕", "ko-KR-SunHiNeural"), ("안녕", "ko-KR-InJoonNeural")],
        )

    def test_tts_cache_evicts_oldest_audio_when_full(self):
        FakeEdgeCommunicate.calls = []
        provider = TextToSpeechProvider(communicate_factory=FakeEdgeCommunicate, max_cache_entries=1)

        provider.synthesize("첫째")
        provider.synthesize("둘째")
        provider.synthesize("첫째")

        self.assertEqual(
            FakeEdgeCommunicate.calls,
            [
                ("첫째", "ko-KR-SunHiNeural"),
                ("둘째", "ko-KR-SunHiNeural"),
                ("첫째", "ko-KR-SunHiNeural"),
            ],
        )

    def test_speech_text_correction_provider_returns_corrected_sentence(self):
        model = FakeCorrectionModel("오늘 아침 사료를 먹었어요.")
        provider = SpeechTextCorrectionProvider(api_key="test-key", chat_model=model)

        result = provider.correct("오늘 아침 사료를 먹었어")

        self.assertEqual(result, "오늘 아침 사료를 먹었어요.")
        self.assertIn("stt_text: 오늘 아침 사료를 먹었어", model.messages[1][1])

    def test_speech_text_correction_provider_uses_profile_names(self):
        model = FakeCorrectionModel("초코가 아침 사료를 먹었어요.")
        provider = SpeechTextCorrectionProvider(api_key="test-key", chat_model=model)

        result = provider.correct("쵸코가 아침 사료를 먹었어", pet_names=("초코",))

        self.assertEqual(result, "초코가 아침 사료를 먹었어요.")
        self.assertIn("registered_pet_names: 초코", model.messages[1][1])
        self.assertIn("프로필", model.messages[0][1])


if __name__ == "__main__":
    unittest.main()
