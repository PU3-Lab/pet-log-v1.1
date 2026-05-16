from __future__ import annotations

import os
import unittest

from infrastructure.speech.speech_to_text import SpeechToTextProvider
from infrastructure.speech.text_to_speech import TextToSpeechProvider


RUN_INTEGRATION_TESTS = os.environ.get("RUN_SPEECH_INTEGRATION_TESTS") == "1"


@unittest.skipUnless(
    RUN_INTEGRATION_TESTS,
    "Set RUN_SPEECH_INTEGRATION_TESTS=1 to run real Whisper/edge-tts integration tests.",
)
class TestSpeechProviderIntegration(unittest.TestCase):
    def test_edge_tts_returns_real_audio_bytes(self):
        audio = TextToSpeechProvider().synthesize("안녕 초코야")

        self.assertGreater(len(audio), 1000)

    def test_whisper_medium_transcribes_edge_tts_audio(self):
        source_text = "초코야 밥 먹자"
        audio = TextToSpeechProvider().synthesize(source_text)

        transcript = SpeechToTextProvider(
            transcribe_options={"language": "ko"},
        ).transcribe(audio, "audio/mpeg")

        self.assertTrue(transcript)
        self.assertIn("초코", transcript)


if __name__ == "__main__":
    unittest.main()
