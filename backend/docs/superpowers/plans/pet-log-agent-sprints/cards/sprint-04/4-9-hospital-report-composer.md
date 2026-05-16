# Card 4-9: HospitalReportComposer

**목표:** 선택된 기록 목록을 병원 제출용 요약 문자열로 조립한다.

**Files:**
- Modify: `src/infrastructure/composers/hospital_report_composer.py`
- Test: `tests/test_hospital_summary_pipeline.py`

**완료 기준:**
- [ ] pet name을 포함한다.
- [ ] record title/detail/status를 포함한다.
- [ ] record id 목록을 결과에 보존한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_hospital_summary_pipeline -v
```
