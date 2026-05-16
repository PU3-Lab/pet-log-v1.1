# CareAnswerProvider RAG 구현 Backlog

이 문서는 RAG skeleton 단계에서 의도적으로 제외한 실제 구현 작업을 정리한다.

## 1. Source 관리

- 영속 테이블 `care_knowledge_sources`를 추가한다.
- source URL, title, allowed domain, enabled flag, content hash, fetch status, timestamp를 저장한다.
- 네트워크 요청 전에 관리자 허용목록을 강제한다.
- private, loopback, link-local, 비 HTTP(S) 대상은 fetch 전에 거부한다.
- 허용 URL, 미허용 도메인, 잘못된 scheme, private network 대상 테스트를 추가한다.

## 2. URL Fetching과 Text Extraction

- `UrlCareKnowledgeIngestor.ingest()`를 구현한다.
- 승인된 URL만 timeout, byte limit, redirect limit, 명시적 user agent 조건으로 fetch한다.
- HTML에서 읽을 수 있는 title과 본문 텍스트를 추출한다.
- 공백을 정규화하고 boilerplate, navigation, script, 빈 content를 제거한다.
- 답변에서 출처를 인용할 수 있도록 모든 chunk에 `source_url`을 보존한다.
- unit test에서는 실제 네트워크를 호출하지 않고 fake HTTP client 응답으로 검증한다.

## 3. Chunking

- embedding 전에 deterministic chunking을 추가한다.
- 문단을 우선 보존하되 최대 문자 수 또는 token budget을 둔다.
- 답변 품질상 필요할 때만 인접 chunk 사이에 가벼운 overlap을 둔다.
- 정규화된 chunk text와 source URL로 `content_hash`를 계산한다.
- 재수집 시 hash가 같은 chunk는 다시 저장하지 않는다.
- 안정적인 chunk ID/hash, 빈 content, 긴 문서 테스트를 추가한다.

## 4. Embeddings

- `OpenAIEmbeddingProvider.embed()`를 구현한다.
- `OPENAI_API_KEY`와 `OPENAI_CARE_KNOWLEDGE_EMBEDDING_MODEL`을 사용한다.
- 기본 모델은 `text-embedding-3-small`을 유지한다.
- OpenAI 호출 전에 빈 입력을 검증한다.
- OpenAI SDK 사용은 infrastructure 내부에만 둔다.
- deterministic vector를 반환하는 fake embedding test와 API key 누락 테스트를 추가한다.

## 5. SQLite Persistence

- `care_knowledge_chunks` 저장소를 추가한다.
- chunk text, metadata, embedding model, embedding vector, content hash, timestamp를 저장한다.
- 첫 구현은 `CareKnowledgeRepository` 뒤에서 embedding JSON 또는 BLOB 저장으로 시작한다.
- vector 저장 방식은 교체 가능하게 유지해 이후 pgvector나 외부 vector DB로 옮길 때 infrastructure만 바뀌게 한다.
- save/list/update 동작과 변경 없는 chunk dedupe repository test를 추가한다.

## 6. Retrieval

- `CareKnowledgeRetriever.search()`를 구현한다.
- 보호자 질문을 embedding한다.
- repository에서 candidate chunk를 불러온다.
- cosine similarity로 chunk를 정렬한다.
- score와 source metadata를 포함한 상위 N개 `CareKnowledgeHit`을 반환한다.
- 색인된 chunk가 없으면 빈 tuple을 반환한다.
- ranking order, limit 처리, empty index, deterministic fake embedding 테스트를 추가한다.

## 7. CareAnswerProvider Prompt Integration

- retriever가 설정된 경우에만 `CareAnswerProvider.answer()`에서 retriever를 호출한다.
- 검색된 snippet을 source URL과 title과 함께 prompt에 넣는다.
- retriever가 없거나 검색 결과가 없으면 기존 no-RAG 답변 동작을 유지한다.
- 모델이 검색된 케어 지식을 일반 정보로만 사용하고, 진단이나 처방으로 단정하지 않도록 지시한다.
- referenced source metadata는 response DTO/API contract를 갱신한 뒤 노출한다.
- 기존 no-RAG 동작이 깨지지 않는 테스트를 추가한다.

## 8. HTTP와 운영

- auth/authorization이 준비된 뒤 admin-only ingestion entrypoint를 추가한다.
- guardian-facing client에는 임의 URL ingestion을 노출하지 않는다.
- source ingestion, chunk count, embedding model, retrieval hit count를 로그로 남긴다.
- 보호자 질문 전문이나 source text 전문은 로그에 남기지 않는다.
- 재수집과 모델 변경 절차를 runbook에 추가한다.

## 9. 품질과 안전성

- 자주 묻는 케어 질문에 대한 RAG regression fixture를 추가한다.
- 답변이 검색된 지식을 인용하되 의료적 확실성을 과장하지 않는지 검증한다.
- 위험 증상 질문에는 병원 상담 안내가 유지되는지 테스트한다.
- fetch된 page 안의 prompt injection 문구에 대한 테스트를 추가한다.
- fetch 실패, embedding 실패, empty retrieval fallback 동작을 추가한다.

## 권장 구현 순서

1. SQLite schema와 repository test.
2. fake embedding provider와 retriever ranking test.
3. fake HTTP client 기반 URL ingestion.
4. opt-in test 뒤의 OpenAI embedding provider integration.
5. `CareAnswerProvider` prompt integration.
6. admin ingestion endpoint 또는 CLI.
