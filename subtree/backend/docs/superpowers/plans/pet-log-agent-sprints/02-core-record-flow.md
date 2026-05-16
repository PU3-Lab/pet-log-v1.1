# Sprint 2: Core 기록 입력 흐름

**목표:** 자연어 기록 입력이 구조화 후보로 변환되고, `PetLogAgentPipeline.handle()`이 저장된 기록을 포함한 결과를 반환한다.

## 카드 파일

| Card | 문서 | 목표 |
| --- | --- | --- |
| 2-1 | [2-1-record-structurer-basic.md](cards/sprint-02/2-1-record-structurer-basic.md) | 기본 구조화 후보 반환 |
| 2-2 | [2-2-record-structurer-keywords.md](cards/sprint-02/2-2-record-structurer-keywords.md) | 식사/산책 키워드 분류 |
| 2-3 | [2-3-record-structurer-confirmation.md](cards/sprint-02/2-3-record-structurer-confirmation.md) | 알 수 없는 입력 confirmation 처리 |
| 2-4 | [2-4-empty-policies.md](cards/sprint-02/2-4-empty-policies.md) | pipeline 실행용 빈 policy 구현 |
| 2-5 | [2-5-pipeline-save-path.md](cards/sprint-02/2-5-pipeline-save-path.md) | 저장 성공 경로 end-to-end |
| 2-6 | [2-6-pipeline-confirmation-path.md](cards/sprint-02/2-6-pipeline-confirmation-path.md) | confirmation 필요 시 미저장 경로 |

## Sprint 2 전체 검증 명령

```bash
uv run python -B -m unittest tests.test_record_structurer tests.test_empty_policies tests.test_pet_log_agent_pipeline -v
uv run python -B -m unittest discover -s tests -v
```
