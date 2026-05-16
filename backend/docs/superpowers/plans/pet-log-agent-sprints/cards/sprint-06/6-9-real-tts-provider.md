# Card 6-9: Real TTS provider

**목표:** 실제 TTS provider를 추가한다.

**Files:**
- Modify: `src/infrastructure/speech/text_to_speech.py`
- Test: `tests/test_speech_providers.py`

**완료 기준:**
- [x] 실제 provider는 `TextToSpeechInterface`를 충족한다.
- [x] mock provider와 composition에서 교체 가능하다.
- [x] provider별 voice/model 설정은 infrastructure 내부에 둔다.

**구현 상태:** `TextToSpeechProvider`는 `edge-tts`를 사용하고 기본 voice는 `ko-KR-SunHiNeural`이다. 테스트에서는 communicate factory를 주입해 네트워크 호출 없이 계약을 검증한다.

실제 edge-tts 호출은 기본 unittest에서 제외하고 아래 opt-in 통합 테스트로 확인한다.

```bash
RUN_SPEECH_INTEGRATION_TESTS=1 uv run python -B -m unittest tests.test_speech_provider_integration -v
```
