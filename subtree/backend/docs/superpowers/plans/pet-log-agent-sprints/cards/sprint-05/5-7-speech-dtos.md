# Card 5-7: Speech request/response DTO

**목표:** 음성 입력/출력 entrypoint에서 사용할 DTO와 변환 정책을 정한다.

**Files:**
- Create: `src/presentation/http/speech_routes.py`
- Test: `tests/test_speech_entrypoints.py`

**완료 기준:**
- [ ] speech input request는 audio bytes 또는 file reference와 pet_id를 받는다.
- [ ] STT 결과 text는 `PetLogAgentInput.text`로 전달된다.
- [ ] TTS response는 audio bytes 또는 file reference를 반환한다.
- [ ] application/domain에는 audio transport 타입을 추가하지 않는다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_speech_entrypoints -v
```
