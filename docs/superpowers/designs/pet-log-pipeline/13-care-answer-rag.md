# CareAnswerProvider RAG

`CareAnswerProvider`는 보호자의 케어 질문에 답할 때 두 가지 context를 사용한다.

- `CareContext`: 반려동물 프로필, 최근 기록, 예정 리마인더.
- 케어 지식 검색: 관리자가 승인한 외부 케어 가이드 URL.

이 문서는 RAG 경계만 정의한다. URL fetching, HTML parsing, chunking, embedding 호출, vector search, 답변 prompt 주입은 구현하지 않는다.

## Source 정책

- v1은 외부 URL 또는 domain에 대해 관리자 허용목록을 사용한다.
- 보호자가 임의로 제출한 URL은 fetch하지 않는다.
- 답변이 케어 가이드 출처를 인용할 수 있도록 각 source는 원본 URL과 title을 보존한다.
- 의료 표현은 제한한다. 검색된 텍스트는 일반 안내에만 사용하고, 답변은 진단, 처방, 확정 표현을 하지 않는다.

## Data Shape

- `CareKnowledgeSource`: 승인된 외부 URL metadata.
- `CareKnowledgeChunk`: source URL과 content hash를 포함한 정규화 텍스트 chunk.
- `CareKnowledgeHit`: 검색된 chunk와 similarity score.

MVP 저장 대상은 SQLite다. 향후 구현에서 embedding vector는 JSON 또는 BLOB column으로 저장할 수 있다. 이 저장 방식은 repository/retriever 뒤의 implementation detail로 두어 나중에 pgvector 또는 외부 vector DB로 옮길 수 있게 한다.

## Flow

1. 관리자가 source URL/domain을 승인한다.
2. ingestion이 URL을 fetch하고, 읽을 수 있는 텍스트를 추출한 뒤 chunk로 나누어 저장한다.
3. embedding provider가 각 chunk의 OpenAI embedding을 생성한다.
4. retriever가 보호자 질문을 embedding하고 가장 관련 높은 chunk를 반환한다.
5. `CareAnswerProvider`가 선택된 snippet을 답변 prompt에 포함한다.

## Skeleton 경계

- skeleton에서 코드 레벨 RAG 경계는 Protocol interface가 아니라 `CareKnowledgeRetriever` 구체 skeleton 클래스로 둔다.
- `CareAnswerProvider`는 optional retriever dependency를 받을 수 있지만, retrieval 구현 전까지 답변 동작은 바꾸지 않는다.
- ingestion, embedding, persistence, ranking 구현 세부사항은 해당 구현 sprint 전까지 backlog 문서에만 둔다.

## Defaults

- Embedding model 기본값: `text-embedding-3-small`.
- 환경변수 override: `OPENAI_CARE_KNOWLEDGE_EMBEDDING_MODEL`.
- 기존 답변 model은 계속 `OPENAI_CARE_ANSWER_MODEL`로 제어한다.

## Deferred Work

- URL fetching과 SSRF 보호.
- HTML readability extraction.
- Chunking 전략.
- Embedding persistence.
- Similarity scoring과 top-k search.
- Citation 포함 prompt formatting.
- RAG 품질 테스트와 safety eval.
