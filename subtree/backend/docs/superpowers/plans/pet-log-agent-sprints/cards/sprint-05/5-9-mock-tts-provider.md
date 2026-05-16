# Card 5-9: Mock TTS provider

**목표:** 네트워크 없이 text 응답을 deterministic audio placeholder로 변환하는 mock TTS provider를 만든다.

**Files:**
- Create: `src/infrastructure/speech/text_to_speech.py`
- Test: `tests/test_speech_entrypoints.py`

**완료 기준:**
- [ ] `TextToSpeechProvider`는 `TextToSpeechInterface`를 충족한다.
- [ ] mock provider는 text를 audio placeholder bytes로 변환한다.
- [ ] 빈 text는 명시적 예외를 발생시킨다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_speech_entrypoints -v
```
