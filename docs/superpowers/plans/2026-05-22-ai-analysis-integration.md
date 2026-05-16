# AI Analysis Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate AI-driven insights and suggestions into the global `PetLogProvider` context.

**Architecture:** Add `insights`, `suggestions`, and `isAnalysisLoading` states to `PetLogProvider`. Implement a `refreshAnalysis` function that fetches data from the API and update mutation functions to trigger this refresh.

**Tech Stack:** React (TypeScript), Axios

---

### Task 1: Update PetLogContextValue Interface

**Files:**
- Modify: `frontend/app/web/src/components/pet-log-provider.tsx`

- [ ] **Step 1: Add new fields to PetLogContextValue**

```typescript
type PetLogContextValue = {
  // ... existing fields
  insights: AiInsight[];
  suggestions: AiSuggestion[];
  isAnalysisLoading: boolean;
  refreshAnalysis: (petId: string) => Promise<void>;
  // ... remaining fields
};
```

### Task 2: Update PetLogProvider State and Functionality

**Files:**
- Modify: `frontend/app/web/src/components/pet-log-provider.tsx`

- [ ] **Step 1: Add state variables**

```typescript
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
```

- [ ] **Step 2: Implement refreshAnalysis**

```typescript
  const refreshAnalysis = useCallback(async (petId: string) => {
    setIsAnalysisLoading(true);
    try {
      const [insightsData, suggestionsData] = await Promise.all([
        fetchAiInsights(petId),
        fetchAiSuggestions(petId),
      ]);
      setInsights(insightsData.insights);
      setSuggestions(suggestionsData.suggestions);
    } catch (err) {
      console.error("[provider] AI 분석 로딩 실패:", err);
    } finally {
      setIsAnalysisLoading(false);
    }
  }, []);
```

### Task 3: Trigger refreshAnalysis in Mutations and Initial Load

**Files:**
- Modify: `frontend/app/web/src/components/pet-log-provider.tsx`

- [ ] **Step 1: Update loadInitialState**

Inside `loadInitialState`, call `refreshAnalysis(activePet.id)`.

- [ ] **Step 2: Update addRecord**

After `setRecords((current) => [record, ...current]);`, call `refreshAnalysis(profile.id)`. (Wait, `profile` state should have the current pet ID).

- [ ] **Step 3: Update updateRecord**

After updating `records` state, call `refreshAnalysis(profile.id)`.

- [ ] **Step 4: Update deleteRecord**

After `await deleteRecordApi(id);`, call `refreshAnalysis(profile.id)`.

### Task 4: Expose New States in Context Value

**Files:**
- Modify: `frontend/app/web/src/components/pet-log-provider.tsx`

- [ ] **Step 1: Update the useMemo value**

Add `insights`, `suggestions`, `isAnalysisLoading`, and `refreshAnalysis` to the `value` object and its dependency array.

### Task 5: Verification

**Files:**
- Create: `frontend/app/web/src/components/pet-log-provider-ai.test.tsx` (or similar)

- [ ] **Step 1: Write a test to verify state updates**

Create a simple test that mocks the API calls and checks if `insights` and `suggestions` are updated after a record is added.

- [ ] **Step 2: Run tests**

Run: `npm test` or specific test command.
