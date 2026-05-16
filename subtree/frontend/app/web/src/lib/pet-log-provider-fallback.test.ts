import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const providerSource = readFileSync(new URL("../components/pet-log-provider.tsx", import.meta.url), "utf8");

test("PetLogProvider는 기록 화면에 mock 기록을 폴백으로 보여주지 않는다", () => {
  assert.equal(providerSource.includes("records as initialRecords"), false);
  assert.equal(providerSource.includes("setRecords(initialRecords)"), false);
  assert.equal(providerSource.includes("로컬 데모 상태"), false);
  assert.equal(providerSource.includes("로컬 예시 데이터"), false);
});

test("PetLogProvider는 pet이 없어도 더미 pet을 만들지 않고 빈 상태로 부팅한다", () => {
  assert.equal(providerSource.includes('throw new Error("등록된 반려동물이 없습니다.")'), false);
  assert.equal(providerSource.includes("setProfile(emptyProfile)"), true);
  assert.equal(providerSource.includes("setRecords([])"), true);
  assert.equal(providerSource.includes("setSchedules([])"), true);
});
