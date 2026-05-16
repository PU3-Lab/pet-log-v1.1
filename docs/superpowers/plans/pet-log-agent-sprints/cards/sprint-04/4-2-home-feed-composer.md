# Card 4-2: HomeFeedComposer

**목표:** core agent result와 due item을 `HomeFeedResult`로 조립한다.

**Files:**
- Modify: `src/infrastructure/composers/home_feed_composer.py`
- Test: `tests/test_home_feed_pipeline.py`

**완료 기준:**
- [ ] today_summary를 문자열로 반환한다.
- [ ] context insights를 alerts 또는 recent_changes로 반영한다.
- [ ] suggestions는 suggestion_cards로 반영한다.
- [ ] due item은 reminders로 반영한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_home_feed_pipeline -v
```
