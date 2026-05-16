import { strict as assert } from "node:assert";
import {
  getCareNotifications,
  getNotificationReadSummary,
  getNotificationsWithReadState,
  getUnreadNotificationCount,
  sortCareNotificationsByLatest,
} from "./notifications";
import { defaultNotificationPreferences } from "./settings";
import type { RecordEntry } from "./types";

const baseRecords: RecordEntry[] = [
  {
    id: "meal-1",
    date: "4월 29일",
    time: "08:20",
    category: "meal",
    title: "아침 45g",
    detail: "아침 사료 45g을 먹었어요.",
    status: "normal",
  },
];

const missingCare = getCareNotifications(baseRecords);
assert.ok(missingCare.some((notification) => notification.id === "missing-stool"));
assert.ok(missingCare.some((notification) => notification.id === "missing-walk"));

const readAwareMissingCare = getNotificationsWithReadState(missingCare, ["missing-stool"]);
assert.equal(readAwareMissingCare.find((notification) => notification.id === "missing-stool")?.isRead, true);
assert.equal(readAwareMissingCare.find((notification) => notification.id === "missing-walk")?.isRead, false);

const readSummary = getNotificationReadSummary(readAwareMissingCare);
assert.equal(readSummary.totalCount, missingCare.length);
assert.equal(readSummary.readCount, 1);
assert.equal(readSummary.unreadCount, missingCare.length - 1);
assert.equal(readSummary.hasUnread, true);
assert.equal(getUnreadNotificationCount(missingCare, ["missing-stool"]), missingCare.length - 1);

const disabledMissingRecordCare = getCareNotifications(baseRecords, [], "2026-04-29", {
  ...defaultNotificationPreferences,
  missingRecord: false,
});
assert.ok(!disabledMissingRecordCare.some((notification) => notification.category === "기록"));

const alertCare = getCareNotifications([
  {
    ...baseRecords[0],
    id: "behavior-alert",
    category: "behavior",
    title: "현관 앞에서 낑낑거림",
    detail: "외출 준비를 보자 10분 정도 낑낑거렸어요.",
    status: "alert",
  },
]);
assert.ok(alertCare.some((notification) => notification.id === "follow-up-alert"));

const fullCare = getCareNotifications([
  ...baseRecords,
  {
    id: "walk-1",
    date: "4월 29일",
    time: "10:10",
    category: "walk",
    title: "산책 20분",
    detail: "산책 20분을 했어요.",
    status: "normal",
  },
  {
    id: "stool-1",
    date: "4월 29일",
    time: "20:10",
    category: "stool",
    title: "배변 1회",
    detail: "배변 상태가 평소와 비슷했어요.",
    status: "normal",
  },
]);
assert.equal(fullCare[0]?.id, "vaccine-due");

const latestSortedCare = sortCareNotificationsByLatest([
  { ...missingCare[0], id: "older", createdAt: "2026-05-13T09:10:00" },
  { ...missingCare[0], id: "newer", createdAt: "2026-05-13T09:30:00" },
  { ...missingCare[0], id: "middle", createdAt: "2026-05-13T09:20:00" },
]);
assert.deepEqual(
  latestSortedCare.map((notification) => notification.id),
  ["newer", "middle", "older"],
);

const sqlDateSortedCare = sortCareNotificationsByLatest([
  { ...missingCare[0], id: "old-sql", createdAt: "2026-05-13 00:59:01" },
  { ...missingCare[0], id: "new-sql", createdAt: "2026-05-13 09:20:00" },
  { ...missingCare[0], id: "middle-sql", createdAt: "2026-05-13 09:10:00" },
]);
assert.deepEqual(
  sqlDateSortedCare.map((notification) => notification.id),
  ["new-sql", "middle-sql", "old-sql"],
);
