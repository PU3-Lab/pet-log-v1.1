import { strict as assert } from "node:assert";
import { getCareNotifications } from "./notifications";
import type { CareSchedule, RecordEntry } from "./types";

const completeRecords: RecordEntry[] = [
  {
    id: "meal",
    date: "4월 29일",
    time: "08:20",
    category: "meal",
    title: "아침 45g",
    detail: "아침 사료 45g을 먹었어요.",
    status: "normal",
  },
  {
    id: "walk",
    date: "4월 29일",
    time: "10:20",
    category: "walk",
    title: "산책 20분",
    detail: "산책 20분을 했어요.",
    status: "normal",
  },
  {
    id: "stool",
    date: "4월 29일",
    time: "19:20",
    category: "stool",
    title: "배변 1회",
    detail: "배변 상태가 평소와 비슷했어요.",
    status: "normal",
  },
];

const schedules: CareSchedule[] = [
  {
    id: "heartworm",
    category: "medication",
    title: "심장사상충 약",
    dueDate: "2026-05-01",
    repeatLabel: "매월",
    note: "저녁 식사 후",
    isDone: false,
  },
];

const notifications = getCareNotifications(completeRecords, schedules, "2026-04-29");
assert.equal(notifications[0]?.id, "schedule-heartworm");
assert.equal(notifications[0]?.actionHref, "/schedule");
assert.equal(notifications[0]?.dueLabel, "2일 후");
