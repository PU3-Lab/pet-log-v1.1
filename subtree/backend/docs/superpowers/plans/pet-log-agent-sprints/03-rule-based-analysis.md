# Sprint 3: Rule-based 분석/제안

**목표:** 최근 기록과 입력 문장 기반으로 위험 신호, insight, 제안, 리마인더를 생성한다.

## Card 6. RiskSignalPolicy
| Card | 문서 | 목표 | 상태 |
| --- | --- | --- | --- |
| 3-1 | [3-1-risk-keywords.md](cards/sprint-03/3-1-risk-keywords.md) | 위험 키워드 감지 | 완료 |
| 3-2 | [3-2-risk-safety-copy.md](cards/sprint-03/3-2-risk-safety-copy.md) | 위험 메시지 safety 문구 제한 | 완료 |
| 3-3 | [3-3-repeated-status-pattern.md](cards/sprint-03/3-3-repeated-status-pattern.md) | 반복 notice/alert 패턴 분석 | 완료 |
| 3-4 | [3-4-missing-record-insight.md](cards/sprint-03/3-4-missing-record-insight.md) | 기록 없음 누락 insight | 완료 |
| 3-5 | [3-5-insight-suggestions.md](cards/sprint-03/3-5-insight-suggestions.md) | insight 기반 suggestion | 완료 |
| 3-6 | [3-6-due-item-reminders.md](cards/sprint-03/3-6-due-item-reminders.md) | due item 기반 reminder | 완료 |

## Sprint 3 전체 검증 명령

```bash
uv run python -B -m unittest tests.test_risk_signal_policy tests.test_context_policies tests.test_suggestion_reminder_policies -v
uv run python -B -m unittest discover -s tests -v
```
