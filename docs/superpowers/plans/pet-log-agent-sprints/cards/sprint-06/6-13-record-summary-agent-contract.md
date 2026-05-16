# Card 6-13: Record summary agent contract

**목표:** 기획서의 누적 기록 기반 정리 요구를 application 계약으로 고정한다.

**Files:**
- Modify: `src/application/dto.py`
- Modify: `src/application/interfaces/agents.py`
- Modify: `src/application/interfaces/composers.py` 또는 provider 계약 위치
- Test: `tests/test_record_summary_agent.py`

**기획 근거:**
- 문제 행동 요약
- 최근 변화 정리
- 주간/월간 리포트
- 병원 제출용 요약
- 병원 연계의 증상 요약, 변화 기록 정리, 리포트 생성

**완료 기준:**
- [x] `RecordSummaryResult` DTO 계약을 만든다.
- [x] `RecordSummaryAgentInterface` 또는 `RecordSummaryComposerInterface` 계약을 만든다.
- [x] 입력은 `PetProfile`, `PetRecord` tuple, `ContextAnalysisResult`, due schedule context를 포함한다.
- [x] 출력은 summary text, source record ids, highlights, pattern notes, missing-record notes를 포함한다.
- [x] 위험 신호는 진단 문장이 아니라 `SafetyNotice` 또는 병원 상담 안내로 분리한다.
- [x] `HospitalSummaryPipeline`이 후속 단계에서 이 summary 계약을 재사용할 수 있게 경계를 명시한다.

**구현 상태:** `src/application/agents/record_summary.py`, `src/infrastructure/composers/record_summary_composer.py`에 class별 스텁을 추가했다. agent는 provider에 위임하고 실제 요약 로직은 provider/composer 구현체에 둔다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_record_summary_agent -v
```
