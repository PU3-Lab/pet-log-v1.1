import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { workspaceFile } from "./sprint-test-utils";

test("스프린트 14: 모바일 QA 기준 뷰포트와 산출물 위치가 문서화되어 있다", () => {
  const report = readFileSync(workspaceFile("_workspace/mobile-ui-qa-report.md"), "utf8");

  assert.ok(report.includes("320x740"));
  assert.ok(report.includes("375x812"));
  assert.ok(report.includes("430x932"));
  assert.ok(report.includes("_workspace/qa-screenshots/"));
});

test("스프린트 14 엣지: QA 보고서는 favicon 404가 기능 오류가 아님을 기록한다", () => {
  const report = readFileSync(workspaceFile("_workspace/mobile-ui-qa-report.md"), "utf8");

  assert.ok(report.includes("favicon 404 로그가 확인되었지만 앱 기능 오류는 아닙니다"));
});
