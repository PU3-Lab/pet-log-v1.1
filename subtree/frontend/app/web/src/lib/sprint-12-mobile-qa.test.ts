import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { workspaceFile } from "./sprint-test-utils";

test("스프린트 12: 모바일 UI QA 산출물이 핵심 화면과 오버플로 결과를 기록한다", () => {
  const report = readFileSync(workspaceFile("_workspace/mobile-ui-qa-report.md"), "utf8");

  assert.ok(report.includes("홈, 기록 입력, 분석, 타임라인, 프로필, 병원 연계, 쇼핑"));
  assert.ok(report.includes("가로 오버플로가 발생하지 않았습니다"));
  assert.ok(report.includes("홈 챗봇 바텀시트"));
});

test("스프린트 12 엣지: 실기기 Safari 검증은 별도 후보로 남아 있다", () => {
  const report = readFileSync(workspaceFile("_workspace/mobile-ui-qa-report.md"), "utf8");

  assert.ok(report.includes("실제 iOS Safari 주소창과 키보드 동작"));
});
