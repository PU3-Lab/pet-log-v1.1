# 펫로그 Agent 작업 카드 스프린트 계획

> **에이전트 작업자 필수 지침:** 이 계획을 실행할 때는 `superpowers:executing-plans`를 사용한다. 기능 구현은 `superpowers:test-driven-development`를 따른다. 단계 추적은 체크박스(`- [ ]`)로 한다.

**목표:** 펫로그 backend agent skeleton을 실제로 실행 가능한 기록 입력/분석/응답 파이프라인으로 확장한다.

**아키텍처:** 인프라 우선 전략으로 진행한다. 먼저 in-memory repository와 composition wiring으로 실행 가능한 기반을 만들고, 이후 mock/rule 기반 기능을 붙인 뒤 API/CLI와 실제 DB/LLM으로 교체한다. application/domain은 FastAPI, DB, OpenAI SDK에 직접 의존하지 않는다.

**기술 스택:** Python 3.12, 표준 라이브러리 `dataclasses`, `typing.Protocol`, `unittest`, `setuptools` `src` layout.

**기준 설계 문서:**
- `docs/superpowers/designs/pet-log-pipeline-interface-design.md`
- `docs/superpowers/designs/pet-log-pipeline/10-implementation-guide.md`

---

## 운영 규칙

- 스프린트는 기간이 아니라 작업 카드 묶음이다.
- 각 카드 완료 전 실패 테스트를 먼저 작성하고 실패를 확인한다.
- 각 카드 완료 후 `uv run python -B -m unittest discover -s tests -v`를 실행한다.
- application/domain에는 DB, FastAPI, OpenAI SDK import를 추가하지 않는다.
- 한 스프린트 완료 후 승인받고 다음 스프린트로 넘어간다.

---

## 스프린트 파일

| Sprint | 문서 | 목표 | 상태 |
| --- | --- | --- | --- |
| Sprint 1 | [01-backend-foundation.md](pet-log-agent-sprints/01-backend-foundation.md) | 실행 가능한 backend 기반 | 완료 |
| Sprint 2 | [02-core-record-flow.md](pet-log-agent-sprints/02-core-record-flow.md) | 자연어 기록 입력 end-to-end | 완료 |
| Sprint 3 | [03-rule-based-analysis.md](pet-log-agent-sprints/03-rule-based-analysis.md) | rule-based 분석/제안 | 완료 |
| Sprint 4 | [04-surface-pipelines.md](pet-log-agent-sprints/04-surface-pipelines.md) | 홈/케어 질문/펫 대화/병원 요약 | 완료 |
| Sprint 5 | [05-entrypoints.md](pet-log-agent-sprints/05-entrypoints.md) | CLI/API/STT/TTS 진입점 | 완료 |
| Sprint 6 | [06-real-infrastructure.md](pet-log-agent-sprints/06-real-infrastructure.md) | 실제 DB/LLM/STT/TTS/agent runtime 연결 | 완료 |

---

## 공통 완료 기준

- [x] 전체 테스트가 통과한다.

```bash
uv run python -B -m unittest discover -s tests -v
```

- [x] 목표 패키지 import가 통과한다.

```bash
uv run python -B -c "import application, agent_runtime, middleware, tools, infrastructure, presentation, composition; print('target imports ok')"
```

- [x] application/domain에서 금지 의존성을 import하지 않는다.

```bash
rg -n "fastapi|openai|sqlalchemy|sqlite|postgres|psycopg" src/application src/domain
```

기대 결과: 출력 없음.
