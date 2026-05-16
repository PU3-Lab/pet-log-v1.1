# Card 5-11: Voice pet chat output flow

**목표:** 펫 대화 text 응답을 TTS로 변환해 음성 출력으로 반환한다.

**Files:**
- Modify: `src/presentation/http/speech_routes.py`
- Test: `tests/test_speech_entrypoints.py`

**완료 기준:**
- [ ] pet chat text response를 TTS provider에 전달한다.
- [ ] response는 text와 audio placeholder를 함께 반환한다.
- [ ] 건강 판단 질문 routing은 기존 `PetChatPipeline` 정책을 따른다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_speech_entrypoints -v
```
