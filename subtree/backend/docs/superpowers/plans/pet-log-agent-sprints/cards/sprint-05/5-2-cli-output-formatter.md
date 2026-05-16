# Card 5-2: CLI output formatter

**목표:** `PetLogAgentResult`를 사람이 읽을 수 있는 문자열로 변환한다.

**Files:**
- Modify: `src/presentation/cli/demo.py`
- Test: `tests/test_cli_demo.py`

**완료 기준:**
- [ ] candidate title/category/status를 포함한다.
- [ ] saved record가 있으면 저장 완료 문구를 포함한다.
- [ ] confirmation 필요 시 확인 필요 문구를 포함한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_cli_demo -v
```
