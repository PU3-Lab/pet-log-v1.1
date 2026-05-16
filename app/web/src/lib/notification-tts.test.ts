import { strict as assert } from "node:assert";
import test from "node:test";
import {
  buildNotificationSpeechBatchText,
  getNewUnreadNotificationsForSpeech,
  isBrowserAudioAutoplayBlocked,
  isSpeechSynthesisBackendUnavailable,
  notificationTtsStorageKey,
} from "./notification-tts";
import type { CareNotification } from "./types";

function notification(input: Partial<CareNotification> & Pick<CareNotification, "id">): CareNotification {
  return {
    id: input.id,
    category: input.category ?? "주의",
    title: input.title ?? "주의 기록 후속 확인이 필요합니다",
    detail: input.detail ?? "같은 변화가 이어지는지 오늘 한 번 더 확인해보세요.",
    action: input.action ?? "타임라인 보기",
    actionHref: input.actionHref ?? "/timeline",
    dueLabel: input.dueLabel ?? "오늘",
    tone: input.tone ?? "red",
    createdAt: input.createdAt ?? "2026-05-13T09:30:00",
    isRead: input.isRead ?? false,
  };
}

test("notification TTS batch text summarizes unread notification counts by category", () => {
  assert.equal(
    buildNotificationSpeechBatchText([
      notification({ id: "alert-1", category: "주의", title: "식사 알림" }),
      notification({ id: "alert-2", category: "주의", title: "산책 알림" }),
      notification({ id: "schedule-1", category: "일정", title: "검진 일정" }),
    ]),
    "주의 2개, 일정 1개. 총 3개의 알림이 있습니다. 알림을 확인하세요.",
  );
});

test("notification TTS batch text uses a fixed missing-record sentence for record accumulation", () => {
  assert.equal(
    buildNotificationSpeechBatchText([
      notification({ id: "record-1", category: "기록", title: "배변 상태를 기록해주세요" }),
      notification({ id: "alert-1", category: "주의", title: "주의 기록 후속 확인이 필요합니다" }),
    ]),
    "어제의 기록이 아직 없어요. 기억나는 내용을 남겨보세요. 주의 1개. 총 2개의 알림이 있습니다. 알림을 확인하세요.",
  );
});

test("notification TTS selects initial loaded unread notifications", () => {
  const items = [
    notification({ id: "already-spoken", createdAt: "2026-05-13T09:40:00" }),
    notification({ id: "initial-unread", createdAt: "2026-05-13T09:50:00" }),
    notification({ id: "initial-read", createdAt: "2026-05-13T10:00:00", isRead: true }),
  ];

  const selected = getNewUnreadNotificationsForSpeech({
    hasCompletedInitialLoad: false,
    knownNotificationIds: [],
    notifications: items,
    spokenNotificationIds: ["already-spoken"],
  });

  assert.deepEqual(selected.map((item) => item.id), ["initial-unread"]);
});

test("notification TTS selects only new unread and unspoken notifications in latest order", () => {
  const selected = getNewUnreadNotificationsForSpeech({
    hasCompletedInitialLoad: true,
    knownNotificationIds: ["known-unread"],
    notifications: [
      notification({ id: "known-unread", createdAt: "2026-05-13T09:30:00" }),
      notification({ id: "new-read", createdAt: "2026-05-13T09:40:00", isRead: true }),
      notification({ id: "already-spoken", createdAt: "2026-05-13T09:50:00" }),
      notification({ id: "new-late", createdAt: "2026-05-13T10:00:00" }),
      notification({ id: "new-early", createdAt: "2026-05-13T09:55:00" }),
    ],
    spokenNotificationIds: ["already-spoken"],
  });

  assert.deepEqual(selected.map((item) => item.id), ["new-late", "new-early"]);
});

test("notification TTS storage key is stable", () => {
  assert.equal(notificationTtsStorageKey, "pet-log-notification-tts-spoken-v1");
});

test("notification TTS detects browser autoplay blocks", () => {
  const error = new Error("play() failed because the user didn't interact with the document first.");
  error.name = "NotAllowedError";

  assert.equal(isBrowserAudioAutoplayBlocked(error), true);
  assert.equal(isBrowserAudioAutoplayBlocked(new Error("Backend synthesis failed")), false);
});

test("notification TTS detects unavailable backend synthesis errors", () => {
  assert.equal(isSpeechSynthesisBackendUnavailable({ response: { status: 502 } }), true);
  assert.equal(isSpeechSynthesisBackendUnavailable({ response: { status: 503 } }), true);
  assert.equal(isSpeechSynthesisBackendUnavailable({ response: { status: 504 } }), true);
  assert.equal(isSpeechSynthesisBackendUnavailable({ response: { status: 422 } }), false);
  assert.equal(isSpeechSynthesisBackendUnavailable(new Error("network failed")), false);
});
