import { strict as assert } from "node:assert";
import test from "node:test";
import { structureRecord } from "./ai-insights";
import { petProfile } from "./mock-data";
import {
  createMockRecord,
  deleteMockRecord,
  getMockPetLogState,
  resetMockPetLogState,
  updateMockProfile,
  updateMockRecord,
} from "./server/mock-pet-log-store";

test("스프린트 3: mock 저장소는 기록 CRUD와 프로필 정규화를 지원한다", () => {
  resetMockPetLogState();
  const detail = "저녁 산책 20분";
  const created = createMockRecord({
    category: "walk",
    detail,
    structured: structureRecord(detail, "walk"),
  });
  updateMockRecord(created.id, {
    category: "behavior",
    detail: "현관 앞에서 8분 기다림",
    structured: structureRecord("현관 앞에서 8분 기다림", "behavior"),
  });
  const updated = getMockPetLogState().records.find((record) => record.id === created.id);
  const profile = updateMockProfile({ ...petProfile, notes: ["  닭고기 알러지 의심  ", ""] });
  const deleted = deleteMockRecord(created.id);

  assert.equal(updated?.category, "behavior");
  assert.equal(updated?.title, "현관 앞에서 8분 기다림");
  assert.deepEqual(profile.notes, ["닭고기 알러지 의심"]);
  assert.equal(deleted, true);
});

test("스프린트 3 엣지: 존재하지 않는 기록 수정과 삭제는 저장소를 변경하지 않는다", () => {
  resetMockPetLogState();
  const before = getMockPetLogState();
  const updated = updateMockRecord("missing-record", {
    category: "meal",
    detail: "없는 기록",
    structured: structureRecord("없는 기록", "meal"),
  });
  const deleted = deleteMockRecord("missing-record");
  const after = getMockPetLogState();

  assert.equal(updated, null);
  assert.equal(deleted, false);
  assert.equal(after.records.length, before.records.length);
});
