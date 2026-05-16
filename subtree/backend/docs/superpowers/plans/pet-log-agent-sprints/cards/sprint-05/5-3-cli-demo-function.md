# Card 5-3: CLI demo function

**목표:** CLI demo 함수가 pipeline을 호출하고 formatted output을 반환한다.

**Files:**
- Modify: `src/presentation/cli/demo.py`
- Test: `tests/test_cli_demo.py`

**완료 기준:**
- [ ] demo 함수는 문자열 입력을 받아 pipeline을 호출한다.
- [ ] 반환값은 문자열이다.
- [ ] 비즈니스 로직은 presentation에 두지 않는다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_cli_demo -v
```
