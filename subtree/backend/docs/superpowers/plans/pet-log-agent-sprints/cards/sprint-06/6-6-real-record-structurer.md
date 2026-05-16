# Card 6-6: Real record structurer provider

**목표:** 실제 LLM 기반 record structurer를 추가한다.

**Files:**
- Modify: `src/infrastructure/llm/record_structuring/provider.py`
- Modify: `src/infrastructure/llm/record_structuring/model.py`
- Modify: `src/infrastructure/llm/record_structuring/schema.py`
- Modify: `src/infrastructure/llm/record_structuring/prompt.py`
- Modify: `src/infrastructure/llm/record_structuring/mapper.py`
- Test: `tests/test_llm_provider_contract.py`

**완료 기준:**
- [ ] 실제 provider는 `RecordStructurerInterface`를 충족한다.
- [ ] mock/rule provider와 composition에서 교체 가능하다.
- [ ] 네트워크가 필요한 테스트는 기본 unittest에서 분리한다.
