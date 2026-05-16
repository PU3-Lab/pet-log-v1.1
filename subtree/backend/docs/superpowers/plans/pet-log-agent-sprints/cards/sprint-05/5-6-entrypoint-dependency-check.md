# Card 5-6: Entrypoint dependency check

**목표:** presentation 추가 후에도 application/domain 의존성 경계가 유지되는지 검증한다.

**Files:**
- Test: `tests/test_package_structure.py`

**완료 기준:**
- [x] application/domain에는 FastAPI import가 없다.
- [x] application/domain에는 DB client import가 없다.
- [x] application/domain에는 OpenAI SDK import가 없다.

**검증 명령:**

```bash
rg -n "fastapi|openai|sqlalchemy|sqlite|postgres|psycopg" src/application src/domain
uv run python -B -m unittest tests.test_package_structure -v
```
