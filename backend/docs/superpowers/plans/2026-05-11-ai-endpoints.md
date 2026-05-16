# AI Agent Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement backend endpoints for AI-powered health insights and care suggestions, replacing keyword-based logic with backend AI agents.

**Architecture:** Expose internal AI agents through `AppContext`, implement public schema conversion functions, and add new FastAPI endpoints that coordinate data retrieval and agent analysis.

**Tech Stack:** Python, FastAPI, Pydantic, LangGraph (underlying agents).

---

### Task 1: Expose AI Agents in AppContext

**Files:**
- Modify: `backend/src/composition.py`

- [ ] **Step 1: Add agents to AppContext dataclass**

```python
@dataclass(frozen=True)
class AppContext:
    pet_log_agent_pipeline: LangGraphPetLogAgentPipeline
    pet_profile_reader: PetProfileRepository
    speech_to_text: SpeechToTextProvider
    risk_detection_agent: RiskDetectionAgent  # Add this
    context_analysis_agent: ContextAnalysisAgent  # Add this
    suggestion_agent: SuggestionAgent  # Add this
    hospital_recommendation_agent: HospitalRecommendationAgent | None = None
    # ... rest
```

- [ ] **Step 2: Update build_app_context to provide agents**

```python
def build_app_context(database_path: str | None = None) -> AppContext:
    # ...
    risk_detection_agent = RiskDetectionAgent(RiskSignalPolicy())
    context_analysis_agent = ContextAnalysisAgent(PatternAnalyzer(), MissingRecordPolicy())
    suggestion_agent = SuggestionAgent(SuggestionComposer())
    
    pipeline = LangGraphPetLogAgentPipeline(
        record_structuring_agent=RecordStructuringAgent(_record_structurer()),
        record_history_reader=record_repository,
        schedule_context_reader=schedule_repository,
        context_analysis_agent=context_analysis_agent,
        risk_detection_agent=risk_detection_agent,
        record_repository=record_repository,
        suggestion_agent=suggestion_agent,
        # ...
    )
    return AppContext(
        pet_log_agent_pipeline=pipeline,
        pet_profile_reader=pet_profile_reader,
        speech_to_text=SpeechToTextProvider(),
        risk_detection_agent=risk_detection_agent,
        context_analysis_agent=context_analysis_agent,
        suggestion_agent=suggestion_agent,
        # ...
    )
```

### Task 2: Implement Public AI Response Schemas

**Files:**
- Modify: `backend/src/presentation/http/schemas.py`

- [ ] **Step 1: Make conversion functions public**

Rename `_safety_notice_to_dict` -> `safety_notice_to_dict`
Rename `_suggestion_to_dict` -> `suggestion_to_dict`

- [ ] **Step 2: Update callers in schemas.py**

Update `pet_log_agent_result_to_dict` to use the new names.

### Task 3: Write failing tests for AI Endpoints

**Files:**
- Create: `backend/tests/test_ai_endpoints.py`

- [ ] **Step 1: Create test file with failing tests**

```python
import unittest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from presentation.http.app import create_app
from domain.models import SafetyNotice, CareSuggestion, InsightSeverity

class FakeAppContext:
    def __init__(self):
        self.risk_detection_agent = MagicMock()
        self.context_analysis_agent = MagicMock()
        self.suggestion_agent = MagicMock()
        self.record_reader = MagicMock()
        self.schedule_reader = MagicMock()
        self.pet_profile_reader = MagicMock()
        self.pet_log_agent_pipeline = MagicMock()
        self.speech_to_text = MagicMock()

class TestAIEndpoints(unittest.TestCase):
    def test_get_insights_returns_safety_notices(self):
        context = FakeAppContext()
        context.record_reader.list_recent.return_value = []
        context.risk_detection_agent.detect.return_value = [
            SafetyNotice(level=InsightSeverity.HIGH, message="Danger!")
        ]
        
        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.get("/api/v1/ai/insights?pet_id=pet-1")
            
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["insights"][0]["message"], "Danger!")

    def test_get_suggestions_returns_care_suggestions(self):
        context = FakeAppContext()
        context.record_reader.list_recent.return_value = []
        context.schedule_reader.list_due_items.return_value = []
        context.context_analysis_agent.analyze.return_value = MagicMock()
        context.suggestion_agent.suggest.return_value = [
            CareSuggestion(title="Play", action="Go play", reason="Fun")
        ]
        
        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.get("/api/v1/ai/suggestions?pet_id=pet-1")
            
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["suggestions"][0]["title"], "Play")
```

- [ ] **Step 2: Run tests to verify they fail (404 Not Found)**

Run: `pytest backend/tests/test_ai_endpoints.py`

### Task 4: Implement AI Insight Endpoint

**Files:**
- Modify: `backend/src/presentation/http/pet_log_routes.py`

- [ ] **Step 1: Implement GET /api/v1/ai/insights**

```python
    @router.get("/api/v1/ai/insights")
    def get_insights(http_request: Request, pet_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.record_reader is None:
            raise HTTPException(status_code=500, detail="Record reader not configured")
        recent_records = app_context.record_reader.list_recent(pet_id, lookback_days=30)
        notices = app_context.risk_detection_agent.detect("", recent_records)
        return success_response({
            "insights": [safety_notice_to_dict(n) for n in notices]
        })
```

- [ ] **Step 2: Run tests to verify insights endpoint passes**

Run: `pytest backend/tests/test_ai_endpoints.py`

### Task 5: Implement AI Suggestion Endpoint

**Files:**
- Modify: `backend/src/presentation/http/pet_log_routes.py`

- [ ] **Step 1: Implement GET /api/v1/ai/suggestions**

```python
    @router.get("/api/v1/ai/suggestions")
    def get_suggestions(http_request: Request, pet_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.record_reader is None:
            raise HTTPException(status_code=500, detail="Record reader not configured")
        if app_context.schedule_reader is None:
            raise HTTPException(status_code=500, detail="Schedule reader not configured")
        
        try:
            pet = app_context.pet_profile_reader.get_pet(pet_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Pet not found") from exc

        recent_records = app_context.record_reader.list_recent(pet_id, lookback_days=30)
        due_items = app_context.schedule_reader.list_due_items(pet_id, days_ahead=14)
        
        analysis = app_context.context_analysis_agent.analyze(pet, recent_records, due_items)
        # Empty safety notices for suggestions endpoint for now
        suggestions = app_context.suggestion_agent.suggest(pet, analysis, ())
        
        return success_response({
            "suggestions": [suggestion_to_dict(s) for s in suggestions]
        })
```

- [ ] **Step 2: Run tests to verify suggestions endpoint passes**

Run: `pytest backend/tests/test_ai_endpoints.py`
