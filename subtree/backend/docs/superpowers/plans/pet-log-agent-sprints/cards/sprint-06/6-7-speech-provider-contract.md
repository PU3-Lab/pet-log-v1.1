# Card 6-7: Speech provider contract test

**목표:** 실제 STT/TTS provider가 application interface 계약을 충족하는지 검증한다.

**Files:**
- Test: `tests/test_speech_providers.py`
- Test: `tests/test_speech_provider_integration.py`

**완료 기준:**
- [x] `SpeechToTextInterface` 계약 테스트를 만든다.
- [x] `TextToSpeechInterface` 계약 테스트를 만든다.
- [x] 네트워크가 필요한 테스트는 기본 unittest에서 분리한다.

**구현 상태:** 기본 unittest는 fake Whisper model과 fake edge-tts communicator를 주입해 네트워크 없이 검증한다. 실제 Whisper/edge-tts 호출은 `RUN_SPEECH_INTEGRATION_TESTS=1` opt-in 통합 테스트로 분리했다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_speech_providers -v
RUN_SPEECH_INTEGRATION_TESTS=1 uv run python -B -m unittest tests.test_speech_provider_integration -v
```
