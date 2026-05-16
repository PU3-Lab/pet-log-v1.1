# AI 구조화 기록 미리보기 및 에이전트 통합 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 키워드 기반의 구조화 로직을 백엔드 에이전트 기반으로 교체하고, 인사이트와 제안을 공통 컨텍스트(`PetLogProvider`)에서 관리하여 실시간으로 동기화합니다.

**Architecture:** 백엔드에 개별 에이전트 엔드포인트를 추가하고, 프론트엔드 `PetLogProvider`에서 전역 상태로 관리하며, 기록 저장 시 자동으로 분석 데이터를 갱신하는 워크플로우를 구축합니다.

**Tech Stack:** Python (FastAPI), TypeScript, Next.js, Tailwind CSS

---

### Task 1: 백엔드 AI 에이전트 엔드포인트 추가

**Files:**
- Modify: `backend/src/presentation/http/pet_log_routes.py`
- Modify: `backend/src/presentation/http/schemas.py`
- Test: `backend/tests/test_ai_endpoints.py`

- [ ] **Step 1: AI 응답 스키마 추가**

`backend/src/presentation/http/schemas.py`에 다음 함수들을 추가하거나 수정합니다.

```python
def safety_notice_to_dict(notice: SafetyNotice) -> dict[str, Any]:
    return {"level": notice.level, "message": notice.message}

def suggestion_to_dict(suggestion: CareSuggestion) -> dict[str, Any]:
    return {
        "title": suggestion.title,
        "action": suggestion.action,
        "reason": suggestion.reason,
        "source_record_ids": list(suggestion.source_record_ids),
    }
```

- [ ] **Step 2: 인사이트 및 제안 엔드포인트 구현**

`backend/src/presentation/http/pet_log_routes.py`의 `build_pet_log_router` 내부에 추가합니다.

```python
    @router.get("/api/v1/ai/insights")
    def get_ai_insights(http_request: Request, pet_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        recent_records = app_context.record_reader.list_recent(pet_id, lookback_days=30)
        # RiskDetectionAgent 사용 (실제 구현체에 따라 호출 방식 조정)
        notices = app_context.risk_detection_agent.detect("", recent_records)
        return success_response({"insights": [safety_notice_to_dict(n) for n in notices]})

    @router.get("/api/v1/ai/suggestions")
    def get_ai_suggestions(http_request: Request, pet_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        recent_records = app_context.record_reader.list_recent(pet_id, lookback_days=30)
        due_items = app_context.schedule_reader.list_due_items(pet_id, days_ahead=14)
        context = app_context.context_analysis_agent.analyze(
            app_context.pet_profile_reader.get_pet(pet_id), recent_records, due_items
        )
        # SuggestionAgent 사용
        suggestions = app_context.suggestion_agent.suggest(
            app_context.pet_profile_reader.get_pet(pet_id), context, ()
        )
        return success_response({"suggestions": [suggestion_to_dict(s) for s in suggestions]})
```

- [ ] **Step 3: 테스트 코드 작성 및 검증**
- [ ] **Step 4: 커밋**

---

### Task 2: 프론트엔드 API 클라이언트 및 타입 업데이트

**Files:**
- Modify: `frontend/app/web/src/lib/types.ts`
- Modify: `frontend/app/web/src/lib/api-client.ts`

- [ ] **Step 1: 타입 정의 업데이트**
`StructuredRecord`에 `candidates` 배열 지원을 추가합니다.

- [ ] **Step 2: API 함수 추가**
`api-client.ts`에 `fetchAiInsights`, `fetchAiSuggestions`를 추가합니다.

---

### Task 3: PetLogProvider 공통 컨텍스트 통합

**Files:**
- Modify: `frontend/app/web/src/components/pet-log-provider.tsx`

- [ ] **Step 1: 상태 및 초기 로직 추가**
`insights`, `suggestions`, `isAnalysisLoading` 상태를 추가하고, `useEffect`에서 초기 데이터를 로드합니다.

- [ ] **Step 2: refreshAnalysis 함수 구현**
기록 추가/삭제 성공 시 호출될 병렬 갱신 로직을 작성합니다.

---

### Task 4: 기록 페이지 UI 개편 (통합 요약 방식 B)

**Files:**
- Modify: `frontend/app/web/src/app/record/page.tsx`

- [ ] **Step 1: AI 미리보기 카드 UI 수정**
단일 항목 표시에서 `displayPreview.candidates`를 순회하며 리스트로 보여주는 구조로 변경합니다.

- [ ] **Step 2: 사용자 수정 및 최종 저장 로직 연결**
미리보기 단계에서 수정된 데이터를 반영하여 `addRecord`를 호출하도록 수정합니다.

---

### Task 5: 기존 키워드 기반 로직 제거 및 정리

**Files:**
- Modify: `frontend/app/web/src/lib/ai-insights.ts`
- Modify: `frontend/app/web/src/app/page.tsx` 등 관련 페이지

- [ ] **Step 1: 하드코딩된 규칙 제거**
- [ ] **Step 2: 에이전트 API 연동 확인**
