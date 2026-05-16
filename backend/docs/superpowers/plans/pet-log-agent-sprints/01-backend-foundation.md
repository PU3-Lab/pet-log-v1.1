# Sprint 1: 실행 가능한 Backend 기반

**목표:** DB/LLM 없이 pipeline 객체를 만들 수 있고, in-memory 저장소가 interface 계약대로 동작한다.

**현재 상태:** 구현 완료, 커밋 전.

## Card 1. In-memory repositories

**Files:**
- Modify: `src/infrastructure/repositories/pet_profile_repository.py`
- Modify: `src/infrastructure/repositories/record_repository.py`
- Modify: `src/infrastructure/repositories/schedule_repository.py`
- Test: `tests/test_in_memory_repositories.py`

- [x] `PetProfileRepository(pets=(...))`가 `get_pet(pet_id)`로 프로필을 반환한다.
- [x] `RecordRepository(records=(...))`가 `list_recent`, `list_by_ids`, `save_candidate`를 지원한다.
- [x] `ScheduleRepository(due_items_by_pet_id={...})`가 pet별 due item을 반환한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_in_memory_repositories -v
```

## Card 2. Composition wiring

**Files:**
- Modify: `src/composition.py`
- Test: `tests/test_composition.py`

- [x] `build_pet_log_agent_pipeline()`이 `PetLogAgentPipeline` 인스턴스를 반환한다.
- [x] repository, agent, policy, structurer skeleton을 pipeline 생성자에 연결한다.
- [x] `PetLogAgentPipeline.handle()` 전체 실행은 Sprint 2 이후로 미룬다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_composition -v
```

## Sprint 1 완료 기준

- [x] repository 단위 테스트 통과
- [x] composition 테스트 통과
- [x] 전체 unittest 통과

**전체 검증 명령:**

```bash
uv run python -B -m unittest discover -s tests -v
```
