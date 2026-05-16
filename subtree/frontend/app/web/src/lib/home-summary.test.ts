import { strict as assert } from "node:assert";
import { getRecentChange, getRecordStatusLabel, getTodaySummary } from "./home-summary";
import type { RecordEntry } from "./types";

const baseRecord: RecordEntry = {
  id: "meal-1",
  date: "4월 29일",
  time: "08:20",
  category: "meal",
  title: "아침 45g",
  detail: "아침 사료 45g을 먹었어요.",
  status: "normal",
};

const summary = getTodaySummary([
  baseRecord,
  {
    ...baseRecord,
    id: "stool-alert",
    category: "stool",
    title: "무른 변 2회",
    detail: "평소보다 무른 변을 두 번 봤어요.",
    status: "alert",
  },
]);

assert.equal(summary.length, 3);
assert.equal(summary.find((item) => item.category === "meal")?.state, "안정");
assert.equal(summary.find((item) => item.category === "walk")?.state, "기록 필요");
assert.equal(summary.find((item) => item.category === "stool")?.tone, "red");

const recentAlert = getRecentChange([
  baseRecord,
  {
    ...baseRecord,
    id: "behavior-alert",
    category: "behavior",
    title: "현관 앞에서 낑낑거림",
    detail: "외출 준비를 보자 낑낑거림이 길어졌어요.",
    status: "alert",
  },
]);

assert.equal(recentAlert.tone, "red");
assert.ok(recentAlert.title.includes("관찰"));
assert.equal(getRecordStatusLabel(baseRecord).label, "안정 기록");
