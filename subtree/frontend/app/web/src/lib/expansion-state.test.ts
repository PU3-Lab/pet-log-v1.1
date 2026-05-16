import { strict as assert } from "node:assert";
import {
  createPreparedInvite,
  defaultExpansionState,
  isExpansionState,
  normalizeExpansionState,
  toggleSavedRecommendation,
} from "./expansion-state";

assert.equal(defaultExpansionState.sharedCare.selectedRole, "공동 보호자");
assert.equal(defaultExpansionState.hospital.symptomMemo, "");
assert.equal(defaultExpansionState.hospital.currentLocation, undefined);
assert.deepEqual(defaultExpansionState.shopping.savedRecommendationIds, []);

const invite = createPreparedInvite(" family@example.com ", "기록 담당", 1234);
assert.equal(invite.id, "invite-1234");
assert.equal(invite.target, "family@example.com");
assert.equal(invite.role, "기록 담당");
assert.equal(invite.status, "초대 준비");

const savedOnce = toggleSavedRecommendation([], "food-sensitive");
assert.deepEqual(savedOnce, ["food-sensitive"]);
assert.deepEqual(toggleSavedRecommendation(savedOnce, "food-sensitive"), []);

assert.equal(
  isExpansionState({
    sharedCare: {
      inviteTarget: "",
      selectedRole: "읽기 전용",
      inviteDraftMessage: "",
      preparedInvites: [invite],
      notificationSharingEnabled: true,
    },
    hospital: {
      symptomMemo: "배변 상태가 평소와 다름",
      locationStatus: "blocked",
      selectedHospitalId: "care-vet",
      currentLocation: { lat: 37.5665, lng: 126.978 },
      checkedChecklistItems: ["최근 식사량 변화"],
    },
    shopping: {
      activeFilter: "건강 용품",
      expandedReasonId: "health-basic",
      savedRecommendationIds: ["health-basic"],
    },
  }),
  true,
);

const normalized = normalizeExpansionState({
  sharedCare: { selectedRole: "잘못된 역할", preparedInvites: "invalid" },
  hospital: { symptomMemo: 42, locationStatus: "ready" },
  shopping: { activeFilter: "잘못된 필터", savedRecommendationIds: ["health-basic"] },
});

assert.equal(normalized.sharedCare.selectedRole, "공동 보호자");
assert.equal(normalized.hospital.locationStatus, "ready");
assert.equal(normalized.hospital.currentLocation, undefined);
assert.equal(normalized.shopping.activeFilter, "전체");
assert.deepEqual(normalized.shopping.savedRecommendationIds, ["health-basic"]);

const normalizedWithLocation = normalizeExpansionState({
  hospital: {
    locationStatus: "ready",
    currentLocation: { lat: 37.5665, lng: 126.978 },
  },
});
assert.deepEqual(normalizedWithLocation.hospital.currentLocation, { lat: 37.5665, lng: 126.978 });

const normalizedWithInvalidLocation = normalizeExpansionState({
  hospital: {
    locationStatus: "ready",
    currentLocation: { lat: 120, lng: "invalid" },
  },
});
assert.equal(normalizedWithInvalidLocation.hospital.currentLocation, undefined);
