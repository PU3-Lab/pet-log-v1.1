import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { workspaceFile } from "./sprint-test-utils";

test("스프린트 19: 병원 연계 내 위치 지도 반영 계획이 문서화되어 있다", () => {
  const plan = readFileSync(workspaceFile("_workspace/remaining-page-work.md"), "utf8");

  assert.ok(plan.includes("### 스프린트 19. 병원 연계 내 위치 지도 반영"));
  assert.ok(plan.includes("geolocation 성공 시 현재 위도와 경도를 병원 연계 상태에 저장합니다."));
  assert.ok(plan.includes("구글맵 화면 안에 내 위치 마커와 병원 후보 마커를 함께 표시합니다."));
});

test("스프린트 19 엣지: 실제 주변 검색과 거리 계산은 후속 스프린트로 분리된다", () => {
  const plan = readFileSync(workspaceFile("_workspace/remaining-page-work.md"), "utf8");

  assert.ok(plan.includes("Google Places API"));
  assert.ok(plan.includes("실거리 및 소요 시간 계산은 후속 스프린트 후보로 분리합니다."));
});
