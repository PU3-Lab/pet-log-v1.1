# Card 5-8: Mock STT provider

**목표:** 네트워크 없이 음성 입력을 deterministic text로 변환하는 mock STT provider를 만든다.

**Files:**
- Create: `src/infrastructure/speech/speech_to_text.py`
- Test: `tests/test_speech_entrypoints.py`

**완료 기준:**
- [ ] `SpeechToTextProvider`는 `SpeechToTextInterface`를 충족한다.
- [ ] mock provider는 입력 audio placeholder를 고정 text로 변환한다.
- [ ] 실패 케이스는 명시적 예외를 발생시킨다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_speech_entrypoints -v
```
