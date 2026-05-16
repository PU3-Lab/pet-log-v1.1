import { sortCareNotificationsByLatest } from "./notifications";
import type { CareNotification, CareNotificationCategory } from "./types";

export const notificationTtsStorageKey = "pet-log-notification-tts-spoken-v1";

type NewUnreadNotificationInput = {
  hasCompletedInitialLoad: boolean;
  knownNotificationIds: string[];
  notifications: CareNotification[];
  spokenNotificationIds: string[];
};

type HttpStatusError = {
  response?: {
    status?: unknown;
  };
};

const recordAccumulationSpeechText = "어제의 기록이 아직 없어요. 기억나는 내용을 남겨보세요.";
const countableSpeechCategories: CareNotificationCategory[] = ["주의", "행동 변화", "일정"];

export function buildNotificationSpeechBatchText(notifications: CareNotification[]) {
  const hasRecordAccumulationNotification = notifications.some((notification) => notification.category === "기록");
  const categorySummary = countableSpeechCategories
    .map((category) => {
      const count = notifications.filter((notification) => notification.category === category).length;
      return count > 0 ? `${category} ${count}개` : "";
    })
    .filter(Boolean)
    .join(", ");

  return [
    hasRecordAccumulationNotification ? recordAccumulationSpeechText : "",
    categorySummary ? `${categorySummary}.` : "",
    `총 ${notifications.length}개의 알림이 있습니다. 알림을 확인하세요.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function getNewUnreadNotificationsForSpeech({
  hasCompletedInitialLoad,
  knownNotificationIds,
  notifications,
  spokenNotificationIds,
}: NewUnreadNotificationInput) {
  const knownIds = new Set(knownNotificationIds);
  const spokenIds = new Set(spokenNotificationIds);
  return sortCareNotificationsByLatest(notifications).filter(
    (notification) =>
      !notification.isRead &&
      !spokenIds.has(notification.id) &&
      (!hasCompletedInitialLoad || !knownIds.has(notification.id)),
  );
}

export function parseSpokenNotificationIds(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

export function isBrowserAudioAutoplayBlocked(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    error.name === "NotAllowedError" ||
    message.includes("notallowederror") ||
    message.includes("user didn't interact") ||
    message.includes("user interaction")
  );
}

export function isSpeechSynthesisBackendUnavailable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const status = (error as HttpStatusError).response?.status;
  return status === 502 || status === 503 || status === 504;
}
