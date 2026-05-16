# Sprint 4: Surface Pipelines

**목표:** core agent 결과를 홈, 케어 질문, 펫 대화, 병원 요약 surface로 노출한다.

## 카드 파일

| Card | 문서 | 목표 | 상태 |
| --- | --- | --- | --- |
| 4-1 | [4-1-agent-result-repository.md](cards/sprint-04/4-1-agent-result-repository.md) | latest agent result repository | 완료 |
| 4-2 | [4-2-home-feed-composer.md](cards/sprint-04/4-2-home-feed-composer.md) | home feed composer | 완료 |
| 4-3 | [4-3-home-feed-pipeline.md](cards/sprint-04/4-3-home-feed-pipeline.md) | home feed pipeline | 완료 |
| 4-4 | [4-4-safety-guard.md](cards/sprint-04/4-4-safety-guard.md) | safety guard | 완료 |
| 4-5 | [4-5-care-answer-provider.md](cards/sprint-04/4-5-care-answer-provider.md) | care answer provider | 완료 |
| 4-6 | [4-6-care-question-pipeline.md](cards/sprint-04/4-6-care-question-pipeline.md) | care question pipeline | 완료 |
| 4-7 | [4-7-pet-persona-responder.md](cards/sprint-04/4-7-pet-persona-responder.md) | pet persona responder | 완료 |
| 4-8 | [4-8-pet-chat-routing.md](cards/sprint-04/4-8-pet-chat-routing.md) | pet chat health routing | 완료 |
| 4-9 | [4-9-hospital-report-composer.md](cards/sprint-04/4-9-hospital-report-composer.md) | hospital report composer | 완료 |
| 4-10 | [4-10-hospital-summary-pipeline.md](cards/sprint-04/4-10-hospital-summary-pipeline.md) | hospital summary pipeline | 완료 |

## Sprint 4 전체 검증 명령

```bash
uv run python -B -m unittest discover -s tests -v
```
