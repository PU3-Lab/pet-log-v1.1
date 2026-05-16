import { getScheduleStatus, getUpcomingSchedules } from "./schedules";
import { defaultNotificationPreferences } from "./settings";
import type { CareNotification, CareSchedule, NotificationPreferences, RecordEntry } from "./types";

const recentRecordLimit = 7;

export type CareNotificationWithReadState = CareNotification & {
  isRead: boolean;
};

export type NotificationReadSummary = {
  totalCount: number;
  readCount: number;
  unreadCount: number;
  hasUnread: boolean;
};

function formatToday(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function notificationTimestamp(notification: CareNotification) {
  const match = notification.createdAt.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!match) {
    return 0;
  }

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
}

export function sortCareNotificationsByLatest(notifications: CareNotification[]) {
  return [...notifications].sort((left, right) => notificationTimestamp(right) - notificationTimestamp(left));
}

export function getCareNotifications(
  records: RecordEntry[],
  schedules: CareSchedule[] = [],
  today = formatToday(),
  preferences: NotificationPreferences = defaultNotificationPreferences,
): CareNotification[] {
  const recentRecords = records.slice(0, recentRecordLimit);
  const notifications: CareNotification[] = [];
  const todayStart = `${today}T00:00:00`;

  const alertRecord = recentRecords.find((record) => record.status === "alert");
  if (preferences.alert && alertRecord) {
    notifications.push({
      id: "follow-up-alert",
      category: "주의",
      title: "주의 기록 후속 확인이 필요합니다",
      detail: `${alertRecord.title} 기록이 있습니다. 같은 변화가 이어지는지 오늘 한 번 더 확인해보세요.`,
      action: "타임라인 보기",
      actionHref: "/timeline",
      dueLabel: "오늘",
      tone: "red",
      createdAt: `${today}T09:30:00`,
      isRead: false,
    });
  }

  if (preferences.missingRecord && !recentRecords.some((record) => record.category === "stool")) {
    notifications.push({
      id: "missing-stool",
      category: "기록",
      title: "배변 상태를 기록해주세요",
      detail: "최근 기록에서 배변 상태가 비어 있습니다. 색, 형태, 횟수를 짧게 남기면 변화 판단에 도움이 됩니다.",
      action: "기록하기",
      actionHref: "/record",
      dueLabel: "오늘",
      tone: "orange",
      createdAt: `${today}T09:20:00`,
      isRead: false,
    });
  }

  if (preferences.missingRecord && !recentRecords.some((record) => record.category === "walk")) {
    notifications.push({
      id: "missing-walk",
      category: "기록",
      title: "활동 기록을 추가해주세요",
      detail: "산책이나 놀이 기록이 없으면 식사와 행동 변화를 함께 해석하기 어렵습니다.",
      action: "기록하기",
      actionHref: "/record",
      dueLabel: "오늘",
      tone: "green",
      createdAt: `${today}T09:10:00`,
      isRead: false,
    });
  }

  if (preferences.schedule) {
    if (schedules.length > 0) {
      getUpcomingSchedules(schedules, today, 3).forEach((schedule) => {
        const status = getScheduleStatus(schedule, today);
        notifications.push({
          id: `schedule-${schedule.id}`,
          category: "일정",
          title: `${schedule.title} 일정이 다가옵니다`,
          detail: schedule.note || `${schedule.repeatLabel} 일정입니다. 필요한 준비를 확인해보세요.`,
          action: "일정 확인",
          actionHref: "/schedule",
          dueLabel: status.label,
          tone: status.tone,
          createdAt: schedule.dueDate ? `${schedule.dueDate}T00:00:00` : todayStart,
          isRead: false,
        });
      });
    } else {
      notifications.push({
        id: "vaccine-due",
        category: "일정",
        title: "종합백신 접종 시기가 다가옵니다",
        detail: "예방접종 예정일이 가까워졌습니다. 병원 예약이나 접종 기록을 확인해보세요.",
        action: "일정 확인",
        actionHref: "/schedule",
        dueLabel: "3일 후",
        tone: "blue",
        createdAt: todayStart,
        isRead: false,
      });
    }
  }

  return sortCareNotificationsByLatest(notifications);
}

export function getNotificationsWithReadState(
  notifications: CareNotification[],
  readNotificationIds: string[],
): CareNotificationWithReadState[] {
  const readIds = new Set(readNotificationIds);
  return notifications.map((notification) => ({
    ...notification,
    isRead: readIds.has(notification.id),
  }));
}

export function getNotificationReadSummary(notifications: CareNotificationWithReadState[]): NotificationReadSummary {
  const readCount = notifications.filter((notification) => notification.isRead).length;
  const totalCount = notifications.length;
  const unreadCount = totalCount - readCount;

  return {
    totalCount,
    readCount,
    unreadCount,
    hasUnread: unreadCount > 0,
  };
}

export function getUnreadNotificationCount(notifications: CareNotification[], readNotificationIds: string[]) {
  return getNotificationReadSummary(getNotificationsWithReadState(notifications, readNotificationIds)).unreadCount;
}
