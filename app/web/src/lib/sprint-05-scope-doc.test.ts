import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { workspaceFile } from "./sprint-test-utils";

test("스프린트 5: MVP 이후 확장 범위는 문서에 분리되어 있다", () => {
  const plan = readFileSync(workspaceFile("_workspace/remaining-page-work.md"), "utf8");

  assert.ok(plan.includes("### 스프린트 5. MVP 이후 확장 정리"));
  assert.ok(plan.includes("지도, IoT, 지출 관리는 후순위 확장"));
  assert.ok(plan.includes("API, 백엔드, 데이터베이스 전환"));
});

test("스프린트 5 엣지: 제품화 후보와 MVP 완료 범위가 같은 문서에서 구분된다", () => {
  const plan = readFileSync(workspaceFile("_workspace/remaining-page-work.md"), "utf8");

  assert.ok(plan.includes("현재 MVP 완료 범위"));
  assert.ok(plan.includes("제품화 준비 후보"));
});
