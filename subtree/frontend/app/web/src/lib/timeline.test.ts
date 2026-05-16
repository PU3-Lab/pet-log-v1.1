import { strict as assert } from "node:assert";
import { getTimelineDetail, getTimelineEditCategory, getTimelineRecords, getTimelineSummary } from "./timeline";
import type { RecordEntry } from "./types";

const records: RecordEntry[] = [
  {
    id: "meal-1",
    date: "4월 29일",
    time: "08:20",
    category: "meal",
    categoryChoice: "all",
    title: "아침 45g",
    detail: "아침 사료 45g을 먹었어요.",
    status: "normal",
    structured: {
      sourceText: "아침 사료 45g을 먹었어요.",
      normalizedSummary: "아침 사료 45g",
      suggestedCategory: "meal",
      confidence: 0.9,
      measurements: [{ label: "급여량", value: "45g" }],
      needsConfirmation: false,
    },
  },
  {
    id: "walk-1",
    date: "4월 28일",
    time: "18:40",
    category: "walk",
    title: "저녁 산책 20분",
    detail: "공원 산책을 20분 했어요.",
    status: "notice",
  },
  {
    id: "stool-1",
    date: "4월 29일",
    time: "21:10",
    category: "stool",
    title: "무른 변",
    detail: "평소보다 무른 변을 1회 봤어요.",
    status: "alert",
  },
  {
    id: "auto-legacy-1",
    date: "4월 29일",
    time: "21:40",
    category: "meal",
    title: "복합 기록",
    detail: "사료 80%, 산책 30분, 배변 1회",
    status: "normal",
    structured: {
      sourceText: "사료 80%, 산책 30분, 배변 1회",
      normalizedSummary: "복합 기록",
      suggestedCategory: "meal",
      detectedCategories: ["meal", "walk", "stool"],
      confidence: 0.86,
      measurements: [],
      needsConfirmation: false,
    },
  },
];

const mealSearch = getTimelineRecords(records, { filter: "all", query: "45g" });
assert.deepEqual(
  mealSearch.map((record) => record.id),
  ["meal-1"],
);

const categorySearch = getTimelineRecords(records, { filter: "walk", query: "산책" });
assert.deepEqual(
  categorySearch.map((record) => record.id),
  ["walk-1"],
);

const summary = getTimelineSummary(records, "4월 29일");
assert.equal(summary.totalCount, 3);
assert.equal(summary.alertCount, 1);
assert.equal(summary.noticeLabel, "주의 1개");

const detail = getTimelineDetail(records[0]);
assert.equal(detail.statusLabel, "안정 기록");
assert.equal(detail.categoryLabel, "AI 자동");
assert.equal(detail.measurements[0]?.label, "급여량");

assert.equal(getTimelineEditCategory(records[0]), "all");
assert.equal(getTimelineEditCategory(records[1]), "walk");
assert.equal(getTimelineEditCategory(records[3]), "all");
