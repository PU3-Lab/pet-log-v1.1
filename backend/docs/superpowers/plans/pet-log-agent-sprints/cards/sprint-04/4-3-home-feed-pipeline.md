# Card 4-3: HomeFeedPipeline

**목표:** repository와 composer를 연결해 홈 피드 결과를 반환한다.

**Files:**
- Test: `tests/test_home_feed_pipeline.py`

**완료 기준:**
- [ ] `HomeFeedPipeline.build(pet_id)`가 `HomeFeedResult`를 반환한다.
- [ ] suggestion card와 alert가 비어 있어도 결과를 반환한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_home_feed_pipeline -v
```
