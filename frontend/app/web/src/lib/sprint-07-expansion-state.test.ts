import { strict as assert } from "node:assert";
import test from "node:test";
import { defaultExpansionState, normalizeExpansionState } from "./expansion-state";
import { resetMockPetLogState, updateMockExpansionState } from "./server/mock-pet-log-store";

test("스프린트 7: 확장 UI 상태는 부분 업데이트와 정규화를 지원한다", () => {
  resetMockPetLogState();
  const sharedCareState = updateMockExpansionState({
    sharedCare: { ...defaultExpansionState.sharedCare, inviteTarget: "가족", selectedRole: "읽기 전용" },
  });
  const mergedState = updateMockExpansionState({
    hospital: { ...defaultExpansionState.hospital, symptomMemo: "아침부터 기침", locationStatus: "ready" },
  });

  assert.equal(sharedCareState.sharedCare.selectedRole, "읽기 전용");
  assert.equal(mergedState.sharedCare.inviteTarget, "가족");
  assert.equal(mergedState.hospital.locationStatus, "ready");
});

test("스프린트 7 엣지: 잘못된 확장 상태 값은 기본값으로 정규화된다", () => {
  const normalized = normalizeExpansionState({
    sharedCare: { selectedRole: "잘못된 역할" },
    hospital: { locationStatus: "unknown" },
    shopping: { activeFilter: "없는 필터" },
  });

  assert.equal(normalized.sharedCare.selectedRole, "공동 보호자");
  assert.equal(normalized.hospital.locationStatus, "idle");
  assert.equal(normalized.shopping.activeFilter, "전체");
});
