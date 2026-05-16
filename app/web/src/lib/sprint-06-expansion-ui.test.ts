import { strict as assert } from "node:assert";
import test from "node:test";
import { createPreparedInvite } from "./expansion-state";
import {
  getHospitalConnectSummary,
  getSharedCareSummary,
  getShoppingRecommendations,
} from "./expansion-features";
import { petProfile, records } from "./mock-data";

test("스프린트 6: 공동 관리, 병원 연계, 쇼핑 요약 데이터가 생성된다", () => {
  const invite = createPreparedInvite("가족 보호자", "기록 담당", 1_000);
  const sharedCare = getSharedCareSummary(petProfile, records, [invite]);
  const hospital = getHospitalConnectSummary(petProfile, records, "기침이 어제보다 잦음");
  const shopping = getShoppingRecommendations(petProfile, records);

  assert.ok(sharedCare.members.some((member) => member.name === "가족 보호자"));
  assert.ok(hospital.reportPreview.some((item) => item.includes("보호자 증상 메모")));
  assert.ok(shopping.some((item) => item.category === "사료"));
});

test("스프린트 6 엣지: 병원 메모가 비어 있으면 미입력 안내를 리포트에 포함한다", () => {
  const hospital = getHospitalConnectSummary(petProfile, [], "   ");

  assert.ok(hospital.reportPreview.includes("보호자 증상 메모: 아직 입력되지 않음"));
  assert.ok(hospital.reportPreview.includes("최근 기록: 기록 없음"));
});
