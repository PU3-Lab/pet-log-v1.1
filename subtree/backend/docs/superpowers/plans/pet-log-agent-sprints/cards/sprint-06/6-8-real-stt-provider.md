# Card 6-8: Real STT provider

**목표:** 실제 STT provider를 추가한다.

**Files:**
- Modify: `src/infrastructure/speech/speech_to_text.py`
- Test: `tests/test_speech_providers.py`

**완료 기준:**
- [x] 실제 provider는 `SpeechToTextInterface`를 충족한다.
- [x] mock provider와 composition에서 교체 가능하다.
- [x] provider별 인증/모델 설정은 infrastructure 내부에 둔다.

**구현 상태:** `SpeechToTextProvider`는 기본 `whisper medium` 모델을 사용한다. 테스트에서는 `model_loader` 또는 `model`을 주입해 실제 모델 다운로드 없이 계약을 검증한다.

실제 Whisper medium 호출은 기본 unittest에서 제외하고 아래 opt-in 통합 테스트로 확인한다.

```bash
RUN_SPEECH_INTEGRATION_TESTS=1 uv run python -B -m unittest tests.test_speech_provider_integration -v
```
