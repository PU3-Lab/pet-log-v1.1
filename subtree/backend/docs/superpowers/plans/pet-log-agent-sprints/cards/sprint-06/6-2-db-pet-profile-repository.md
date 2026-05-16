# Card 6-2: Pet profile DB repository

**목표:** 실제 DB 기반 pet profile repository를 구현한다.

**Files:**
- Modify: `src/infrastructure/repositories/pet_profile_repository.py`
- Test: `tests/test_database_repositories.py`

**완료 기준:**
- [x] DB row를 `PetProfile`로 변환한다.
- [x] 없는 pet_id는 명시적 예외를 발생시킨다.
- [x] application/domain에는 DB client import를 추가하지 않는다.

**구현 상태:** `tests/test_database_repositories.py`가 SQLite row에서 `PetProfile`을 읽는 경로를 검증한다. 없는 pet은 repository에서 `KeyError`로 실패하고 HTTP route에서는 404로 변환한다.
