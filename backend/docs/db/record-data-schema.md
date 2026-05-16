# Record Data Schema

## 목적

이 문서는 사용자가 자연어로 기록을 입력했을 때 데이터가 어떻게 분리되고, DB에는 어떤 형태로 저장되며, 1주일/30일 같은 기간 조회는 어떤 기준으로 가져오는지 정리한다.

## 전체 흐름

```text
사용자 입력 문장
  -> PetLogAgentInput
  -> RecordStructurer
  -> StructuredRecordBatch
     -> StructuredRecordCandidate tuple
  -> PetLogAgentPipeline
  -> RecordRepository.save_candidate()
  -> pet_records 여러 row
```

문장 하나에 여러 사건이 섞이면 `StructuredRecordBatch.candidates`에 여러 후보를 담는다. DB에는 batch가 그대로 저장되지 않고, 각 후보가 `pet_records`의 독립 row로 저장된다.

예:

```text
오늘 밥을 조금 먹고 산책은 못 했어
```

구조화 결과:

```text
StructuredRecordBatch
  candidates:
    - title: 식사
      detail: 밥을 조금 먹음
      category: meal
      status: notice
    - title: 산책
      detail: 산책을 하지 못함
      category: walk
      status: notice
```

DB 저장 결과:

```text
pet_records
  row 1: meal / 식사 / 밥을 조금 먹음 / notice
  row 2: walk / 산책 / 산책을 하지 못함 / notice
```

## Domain 구조

저장 전 후보:

```text
StructuredRecordCandidate
  title: str
  detail: str
  category: RecordCategory
  status: RecordStatus
  confidence: float
  needs_confirmation: bool
  measurements: tuple[str, ...]
```

한 입력에서 나온 후보 묶음:

```text
StructuredRecordBatch
  candidates: tuple[StructuredRecordCandidate, ...]
  needs_confirmation: bool
```

`StructuredRecordBatch.needs_confirmation`은 후보 중 하나라도 확인이 필요하면 `True`다. 이 경우 `PetLogAgentPipeline`은 바로 저장하지 않고 확인 단계로 돌린다.

저장된 기록:

```text
PetRecord
  id: str
  pet_id: str
  category: RecordCategory
  title: str
  detail: str
  status: RecordStatus
  recorded_at: str
  source: RecordInputSource
```

## DB 테이블

### 1. 반려동물 (pets)
사용자의 반려동물 프로필을 저장합니다.

```sql
CREATE TABLE IF NOT EXISTS pets (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT, -- 'local-user' 등 소유자 ID
    name TEXT NOT NULL,
    breed TEXT,
    species TEXT,
    age_label TEXT,
    sex_label TEXT,
    weight_label TEXT,
    birthday TEXT,
    personality TEXT,
    notes TEXT NOT NULL DEFAULT '[]',
    photo_file_id TEXT, -- files 테이블 참조
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);
```

### 2. 반려동물 기록 (pet_records)
구조화된 반려동물의 일상 기록을 저장합니다.

```sql
CREATE TABLE IF NOT EXISTS pet_records (
    id TEXT PRIMARY KEY,
    pet_id TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    status TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    source TEXT NOT NULL,
    batch_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pet_records_pet_recorded_at
    ON pet_records (pet_id, recorded_at);
```

### 3. 케어 일정 (care_schedules)
반려동물의 미래 일정을 저장합니다.

```sql
CREATE TABLE IF NOT EXISTS care_schedules (
    id TEXT PRIMARY KEY,
    pet_id TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    repeat_label TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    is_done INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_care_schedules_pet_due_date
    ON care_schedules (pet_id, due_date);
```

### 4. 알림 (notifications)
기록 누락, 위험 감지, 일정 리마인더 등을 저장합니다.

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    pet_id TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    action TEXT NOT NULL,
    action_href TEXT NOT NULL,
    due_label TEXT NOT NULL,
    tone TEXT NOT NULL,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_pet_created_at
    ON notifications (pet_id, created_at);
```

### 5. 파일 (files)
프로필 사진 등 업로드된 파일 정보를 관리합니다.

```sql
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    pet_id TEXT,
    purpose TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_files_pet_purpose_created_at
    ON files (pet_id, purpose, created_at);
```

현재 저장되는 값:

| 컬럼 | 기준 |
| --- | --- |
| `id` | 저장 시 생성되는 record id |
| `pet_id` | 입력 대상 반려동물 id |
| `category` | 구조화 후보의 category |
| `title` | 구조화 후보의 title |
| `detail` | 구조화 후보의 detail |
| `status` | 구조화 후보의 status |
| `recorded_at` | 저장 시점 UTC ISO timestamp |
| `source` | 현재 저장 경로에서는 `ai_preview` |
| `batch_id` | 같은 원문 입력에서 분류되어 저장된 record 묶음 id |
| `created_at` | DB row 생성 시점 |
| `updated_at` | DB row 수정 시점 |
| `deleted_at` | soft delete 시점, 기본 `NULL` |

현재 DB에 저장하지 않는 값:

| 값 | 이유 |
| --- | --- |
| `StructuredRecordBatch` 자체 | batch는 저장 단위가 아니라 입력 분리 결과다. |
| `confidence` | 저장 전 구조화 신뢰도이며 현재 record table 컬럼이 없다. |
| `needs_confirmation` | 저장 여부 판단에만 쓰고, 저장된 record에는 남기지 않는다. |
| `measurements` | domain 후보에는 있으나 현재 record table 컬럼이 없다. |
| `original_text` | 현재 record table 컬럼이 없다. |

## LLM 구조화 입력

자연어 기록을 DB에 저장하기 전에는 `RecordStructurer`가 입력을 `StructuredRecordBatch`로 바꾼다. 이때 LLM에는 DB row가 아니라 `PetLogAgentInput` 기반 payload를 전달한다.

입력 payload:

```json
{
  "input": {
    "pet": {
      "id": "pet-1",
      "name": "초코",
      "breed": null,
      "species": "companion",
      "age_label": null,
      "personality": null,
      "notes": []
    },
    "text": "오늘 오전 8시에 초코가 사료 40g 중 15g만 먹고, 저녁 산책은 12분만 했고, 오른쪽 귀를 5번 긁었어.",
    "source": "manual",
    "confirm": false
  },
  "allowed_values": {
    "categories": ["meal", "walk", "stool", "medical", "behavior"],
    "statuses": ["normal", "notice", "alert"],
    "sources": ["manual", "voice", "ai_preview", "quick_action"]
  }
}
```

LLM structured output:

```json
{
  "candidates": [
    {
      "title": "식사",
      "detail": "오전 8시에 사료 40g 중 15g만 먹음",
      "category": "meal",
      "status": "notice",
      "confidence": 0.92,
      "needs_confirmation": false,
      "measurements": ["오전 8시", "사료 40g", "섭취 15g"]
    },
    {
      "title": "산책",
      "detail": "저녁 산책을 12분만 함",
      "category": "walk",
      "status": "notice",
      "confidence": 0.9,
      "needs_confirmation": false,
      "measurements": ["12분"]
    },
    {
      "title": "귀 긁음",
      "detail": "오른쪽 귀를 5번 긁음",
      "category": "medical",
      "status": "notice",
      "confidence": 0.82,
      "needs_confirmation": true,
      "measurements": ["오른쪽 귀", "5번"]
    }
  ]
}
```

이 결과가 domain의 `StructuredRecordBatch`로 변환된다. `source`가 `ai_preview`이면 미리보기 전용 호출로 보고 후보 신뢰도와 무관하게 저장하지 않는다. 실제 기록 저장은 `source`가 `manual` 또는 `voice`이고 저장 확정 경로를 통과할 때 각 candidate가 `pet_records` row로 저장된다.

미리보기와 저장 분리 확인:

```sql
SELECT id, pet_id, category, title, detail, status, recorded_at, source, batch_id
FROM pet_records
WHERE pet_id = 'pet_01JCM7V8H9Q2K4N6R8T0A1B2C3'
ORDER BY created_at DESC
LIMIT 5;
```

- 미리보기 호출 후에는 새 row가 늘지 않아야 한다.
- 저장 호출 후에는 `source`가 `ai_preview`가 아닌 새 row가 추가되어야 한다.

수동 smoke 확인:

```bash
uv run python -B scripts/smoke_record_input_to_db.py
```

이 스크립트는 자연어 문장을 `StructuredRecordBatch`로 구조화한 뒤 각 candidate를 `RecordRepository.save_candidate()`로 저장하고, 다시 `list_by_ids()`로 읽어 저장 결과를 확인한다.

Repository 변경사항 수동 smoke 확인:

```bash
uv run python -B scripts/smoke_repository_changes.py
```

이 스크립트는 `RecordRepository.list_recent()`의 `lookback_days` 필터와 `PetLogAgentResultRepository.get_latest()`의 pet_id별 조회/누락 처리를 출력으로 확인한다.

## Enum

```text
RecordCategory
  meal
  walk
  stool
  medical
  behavior

RecordStatus
  normal
  notice
  alert

RecordInputSource
  manual
  voice
  ai_preview
  quick_action
```

## 조회 기준

기본 기록 조회 기준은 `pet_id`다.

```text
RecordRepository.list_recent(pet_id, lookback_days)
RecordRepository.list_by_ids(pet_id, record_ids)
```

현재 `list_recent()` 의도:

```sql
SELECT id, pet_id, category, title, detail, status, recorded_at, source, batch_id
FROM pet_records
WHERE pet_id = ?
  AND deleted_at IS NULL
  AND recorded_at >= ?
ORDER BY recorded_at, created_at;
```

기간 기준 조회는 `recorded_at`을 기준으로 잡는다.

```text
최근 7일
  cutoff = now - 7 days

최근 30일
  cutoff = now - 30 days
```

목표 쿼리:

```sql
SELECT id, pet_id, category, title, detail, status, recorded_at, source, batch_id
FROM pet_records
WHERE pet_id = ?
  AND deleted_at IS NULL
  AND recorded_at >= ?
ORDER BY recorded_at DESC, created_at DESC;
```

특정 기록 묶음 조회는 `pet_id + record_ids` 기준이다.

```sql
SELECT id, pet_id, category, title, detail, status, recorded_at, source, batch_id
FROM pet_records
WHERE pet_id = ?
  AND deleted_at IS NULL
  AND id IN (...);
```

반환 순서는 SQL row 순서가 아니라 요청한 `record_ids` 순서를 보존한다.

## 1주일/30일 조회 예시

현재 날짜가 `2026-05-08`이면:

```text
최근 7일 조회
  recorded_at >= 2026-05-01T00:00:00Z

최근 30일 조회
  recorded_at >= 2026-04-08T00:00:00Z
```

사용 예:

```text
list_recent("pet-1", lookback_days=7)
  -> pet-1의 최근 7일 기록

list_recent("pet-1", lookback_days=30)
  -> pet-1의 최근 30일 기록
```

## 현재 주의점

- `list_recent(pet_id, lookback_days)`는 interface에 기간 인자가 있지만, 현재 구현은 아직 날짜 필터를 적용하지 않는다.
- 저장 시 `recorded_at`은 UTC `Z` 포맷으로 생성하지만, seed 데이터에는 timezone 없는 ISO 문자열도 있다.
- 기간 조회를 정확하게 하려면 `recorded_at` 저장 포맷을 UTC ISO로 통일하는 것이 좋다.
- 한 입력에서 여러 카테고리 후보가 저장되면 같은 `batch_id`를 공유한다. 조회 UI는 이 값을 기준으로 여러 record를 한 카드로 조립할 수 있다.
- `original_text`, `confidence`, `measurements`를 저장하려면 별도 저장 전략을 추가로 설계해야 한다.
