# Card 5-1: CLI input parser

**목표:** CLI 입력 문자열을 `PetLogAgentInput`으로 변환한다.

**Files:**
- Create: `src/presentation/cli/demo.py`
- Test: `tests/test_cli_demo.py`

**완료 기준:**
- [ ] pet id, pet name, text를 입력받아 `PetLogAgentInput`을 만든다.
- [ ] source는 `manual`을 사용한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_cli_demo -v
```
