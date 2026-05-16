# Card 6-15: Notification agent contract

**목표:** 이상/행동/일정/기록 누락 알림 후보 생성을 application 계약으로 고정한다.

## Files

- Modify: `src/application/dto.py`
- Modify: `src/application/interfaces/agents.py`
- Modify: `src/application/interfaces/policies.py`
- Modify: `src/application/interfaces/repositories.py` 또는 notification repository contract 위치
- Test: `tests/test_agent_skeletons.py`

## Planning basis

- 이상 징후 알림
- 행동 변화 알림
- 일정 알림
- 기록 누락 알림
- 병원 상담 권장 안전 문구

## Completion criteria

- [x] `NotificationCandidate` DTO 계약을 만든다.
- [x] `NotificationAgentInterface` 계약을 만든다.
- [x] 입력은 `PetProfile`, `ContextAnalysisResult`, `SafetyNotice` tuple, due schedule context를 포함한다.
- [x] 출력은 title, message, kind, dedupe key, source record ids, optional due date를 포함한다.
- [x] 알림 후보 생성과 실제 push/email 전송 책임을 분리한다.
- [x] 같은 원인으로 중복 알림이 반복되지 않도록 deterministic dedupe key를 둔다.
- [x] 위험 신호 문구는 진단이 아니라 병원 상담 안내로 제한한다.

**구현 상태:** `src/application/agents/notification.py`, `src/infrastructure/notifications/policy.py`에 class별 스텁을 추가했다. agent는 policy에 위임하고 실제 알림 후보 생성/전송 로직은 notification infrastructure에 둔다.

## Verification

```bash
uv run python -B -m unittest tests.test_agent_skeletons -v
```
