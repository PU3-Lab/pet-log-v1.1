import { strict as assert } from "node:assert";
import test from "node:test";
import { records, schedules } from "./mock-data";
import { getCareNotifications, getNotificationReadSummary, getNotificationsWithReadState } from "./notifications";
import { getScheduleSummary } from "./schedules";

test("스프린트 10: 보조 케어 화면 요약은 일정과 알림 상태를 계산한다", () => {
  const scheduleSummary = getScheduleSummary(schedules, "2026-05-01");
  const notifications = getCareNotifications(records, schedules, "2026-05-01");
  const readState = getNotificationsWithReadState(notifications, [notifications[0]?.id ?? ""]);
  const readSummary = getNotificationReadSummary(readState);

  assert.equal(scheduleSummary.dueSoonCount, 1);
  assert.ok(notifications.some((notification) => notification.category === "일정"));
  assert.equal(readSummary.totalCount, notifications.length);
  assert.equal(readSummary.hasUnread, notifications.length > 1);
});

test("스프린트 10 엣지: 기록 알림 선호를 끄면 일정 알림만 남는다", () => {
  const notifications = getCareNotifications(records, schedules, "2026-05-01", {
    missingRecord: false,
    alert: false,
    schedule: true,
  });

  assert.ok(notifications.length > 0);
  assert.ok(notifications.every((notification) => notification.category === "일정"));
});
