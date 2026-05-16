# Card 4-10: HospitalSummaryPipeline

**목표:** pet profile, record history, hospital report composer를 연결한다.

**Files:**
- Test: `tests/test_hospital_summary_pipeline.py`

**완료 기준:**
- [ ] 선택된 record id 목록으로 기록을 조회한다.
- [ ] `HospitalSummaryResult`를 반환한다.
- [ ] 없는 record id는 조용히 제외하거나 repository 정책을 따른다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_hospital_summary_pipeline -v
```
