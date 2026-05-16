import { strict as assert } from "node:assert";
import test from "node:test";
import { getRecentChange, getTodaySummary } from "./home-summary";
import { records } from "./mock-data";
import { getTimelineSummary } from "./timeline";

test("스프린트 9: 홈 상태판은 최근 기록과 주의 변화를 요약한다", () => {
  const summary = getTodaySummary(records);
  const change = getRecentChange(records);
  const timelineSummary = getTimelineSummary(records);

  assert.deepEqual(
    summary.map((item) => item.category),
    ["meal", "walk", "stool"],
  );
  assert.equal(change.tone, "red");
  assert.equal(timelineSummary.alertCount, 1);
  assert.ok(change.detail.includes("병원 상담"));
});

test("스프린트 9 엣지: 기록이 없으면 홈 상태판은 기록 필요 상태를 표시한다", () => {
  const summary = getTodaySummary([]);
  const change = getRecentChange([]);

  assert.ok(summary.every((item) => item.state === "기록 필요"));
  assert.equal(change.tone, "blue");
});
