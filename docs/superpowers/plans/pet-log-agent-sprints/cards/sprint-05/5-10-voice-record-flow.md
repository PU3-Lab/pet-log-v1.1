# Card 5-10: Voice record input flow

**목표:** 음성 입력을 STT로 text 변환한 뒤 기록 입력 pipeline으로 전달한다.

**Files:**
- Modify: `src/presentation/http/speech_routes.py`
- Test: `tests/test_speech_entrypoints.py`

**완료 기준:**
- [ ] audio input은 STT provider를 거쳐 text로 변환된다.
- [ ] 변환된 text는 `PetLogAgentPipeline.handle()`에 전달된다.
- [ ] response는 기록 처리 결과를 반환한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_speech_entrypoints -v
```
