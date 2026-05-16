# Card 6-18: 케어 지식문서 RAG skeleton

**목표:** `CareAnswerProvider`에 케어 지식문서 RAG를 붙이기 위한 문서와 skeleton 경계를 만든다.

**Files:**
- Create: `docs/superpowers/designs/pet-log-pipeline/13-care-answer-rag.md`
- Create: `docs/superpowers/designs/pet-log-pipeline/14-care-answer-rag-implementation-backlog.md`
- Modify: `src/domain/models.py`
- Modify: `src/application/interfaces/`
- Test: `tests/test_care_knowledge_rag_skeleton.py`

**완료 기준:**
- [x] 외부 URL 기반 케어 지식문서 RAG 설계 문서를 추가한다.
- [x] 관리자 허용목록 URL 정책을 문서화한다.
- [x] source, chunk, hit domain skeleton을 추가한다.
- [x] retrieval interface skeleton만 추가한다.
- [x] ingestion, embedding, persistence, ranking 구현 세부사항은 backlog 문서에만 둔다.
- [x] `CareAnswerProvider`는 RAG 의존성이 없어도 기존처럼 동작한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_care_knowledge_rag_skeleton -v
uv run python -B -m unittest discover -s tests
uv run ruff check .
```
