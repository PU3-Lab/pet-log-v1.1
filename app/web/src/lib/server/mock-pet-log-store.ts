import { defaultExpansionState, normalizeExpansionState } from "@/lib/expansion-state";
import { petProfile as initialProfile, records as initialRecords, schedules as initialSchedules } from "@/lib/mock-data";
import { defaultAppSettings } from "@/lib/settings";
import type {
  AppSettings,
  CareSchedule,
  ChatbotMessage,
  ChatbotThread,
  PetLogState,
  PetProfile,
  RecordCategory,
  RecordCategoryChoice,
  RecordEntry,
  ScheduleCategory,
  StructuredRecord,
} from "@/lib/types";
import type { ExpansionState } from "@/lib/expansion-state";
import type { ChatbotMessageResult } from "./pet-log-ai-service";

type NewRecordInput = {
  category: RecordCategory;
  categoryChoice?: RecordCategoryChoice;
  detail: string;
  structured: StructuredRecord;
};

type UpdateRecordInput = {
  category: RecordCategory;
  categoryChoice?: RecordCategoryChoice;
  detail: string;
  structured: StructuredRecord;
};

type NewScheduleInput = {
  category: ScheduleCategory;
  title: string;
  dueDate: string;
  repeatLabel: string;
  note: string;
};

type UpdateScheduleInput = Partial<{
  category: ScheduleCategory;
  title: string;
  dueDate: string;
  repeatLabel: string;
  note: string;
  isDone: boolean;
}>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function formatDateLabel(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatTimeLabel(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function createTitle(detail: string) {
  const firstLine = detail.trim().split(/\n|[.!?。]/)[0]?.trim() ?? "";
  if (firstLine.length <= 24) {
    return firstLine || "새 기록";
  }
  return `${firstLine.slice(0, 24)}...`;
}

function createInitialState(): PetLogState {
  return {
    version: 1,
    profile: clone(initialProfile),
    records: clone(initialRecords),
    schedules: clone(initialSchedules),
    settings: clone(defaultAppSettings),
    readNotificationIds: [],
    expansionState: clone(defaultExpansionState),
  };
}

let state = createInitialState();
let chatbotThreads: ChatbotThread[] = [];

export function getMockPetLogState() {
  return clone(state);
}

export function resetMockPetLogState() {
  state = createInitialState();
  chatbotThreads = [];
  return getMockPetLogState();
}

export function getMockChatbotThreads() {
  return clone(chatbotThreads);
}

export function createMockChatbotThread(title = "새 질문") {
  const now = new Date().toISOString();
  const thread: ChatbotThread = {
    id: `mock-chat-thread-${Date.now()}`,
    title: createTitle(title),
    createdAt: now,
    updatedAt: now,
    messages: [],
  };

  chatbotThreads = [thread, ...chatbotThreads];
  return clone(thread);
}

function getOrCreateMockChatbotThread(threadId: string | undefined, question: string) {
  if (threadId) {
    return chatbotThreads.find((thread) => thread.id === threadId) ?? null;
  }

  if (chatbotThreads[0]) {
    return chatbotThreads[0];
  }

  const thread = createMockChatbotThread(question);
  return chatbotThreads.find((item) => item.id === thread.id) ?? chatbotThreads[0];
}

export function appendMockChatbotExchange(threadId: string | undefined, question: string, result: ChatbotMessageResult) {
  const thread = getOrCreateMockChatbotThread(threadId, question);
  if (!thread) {
    return null;
  }

  const now = new Date();
  const createdAt = now.toISOString();
  const userMessage: ChatbotMessage = {
    id: `mock-chat-message-${now.getTime()}-user`,
    role: "user",
    content: question.trim(),
    createdAt,
  };
  const assistantMessage: ChatbotMessage = {
    id: `mock-chat-message-${now.getTime()}-assistant`,
    role: "assistant",
    content: result.answer,
    createdAt,
    referencedRecordIds: result.referencedRecordIds,
    safetyNotice: result.safetyNotice,
  };

  thread.title = thread.messages.length === 0 ? createTitle(question) : thread.title;
  thread.messages = [...thread.messages, userMessage, assistantMessage].slice(-20);
  thread.updatedAt = createdAt;
  chatbotThreads = [thread, ...chatbotThreads.filter((item) => item.id !== thread.id)];

  return {
    thread: clone(thread),
    userMessage: clone(userMessage),
    assistantMessage: clone(assistantMessage),
  };
}

export function updateMockProfile(input: PetProfile) {
  state.profile = {
    ...input,
    notes: input.notes.map((note) => note.trim()).filter(Boolean),
    photoDataUrl: input.photoDataUrl || undefined,
  };
  return clone(state.profile);
}

export function createMockRecord(input: NewRecordInput) {
  const now = new Date();
  const detail = input.detail.trim();
  const record: RecordEntry = {
    id: `mock-record-${now.getTime()}`,
    date: formatDateLabel(now),
    time: formatTimeLabel(now),
    category: input.category,
    categoryChoice: input.categoryChoice,
    title: createTitle(detail),
    detail,
    status: "normal",
    structured: input.structured,
  };

  state.records = [record, ...state.records];
  return clone(record);
}

export function updateMockRecord(id: string, input: UpdateRecordInput) {
  const detail = input.detail.trim();
  let updated: RecordEntry | null = null;
  state.records = state.records.map((record) => {
    if (record.id !== id) {
      return record;
    }

    updated = {
      ...record,
      category: input.category,
      categoryChoice: input.categoryChoice,
      detail,
      title: createTitle(detail),
      structured: input.structured,
    };
    return updated;
  });

  return updated ? clone(updated) : null;
}

export function deleteMockRecord(id: string) {
  const beforeCount = state.records.length;
  state.records = state.records.filter((record) => record.id !== id);
  return state.records.length !== beforeCount;
}

export function createMockSchedule(input: NewScheduleInput) {
  const now = new Date();
  const schedule: CareSchedule = {
    id: `mock-schedule-${now.getTime()}`,
    category: input.category,
    title: input.title.trim(),
    dueDate: input.dueDate,
    repeatLabel: input.repeatLabel.trim() || "한 번",
    note: input.note.trim(),
    isDone: false,
  };

  state.schedules = [schedule, ...state.schedules];
  return clone(schedule);
}

export function updateMockSchedule(id: string, input: UpdateScheduleInput) {
  let updated: CareSchedule | null = null;
  state.schedules = state.schedules.map((schedule) => {
    if (schedule.id !== id) {
      return schedule;
    }

    updated = {
      ...schedule,
      ...input,
      title: input.title === undefined ? schedule.title : input.title.trim(),
      repeatLabel: input.repeatLabel === undefined ? schedule.repeatLabel : input.repeatLabel.trim() || "한 번",
      note: input.note === undefined ? schedule.note : input.note.trim(),
    };
    return updated;
  });

  return updated ? clone(updated) : null;
}

export function deleteMockSchedule(id: string) {
  const beforeCount = state.schedules.length;
  state.schedules = state.schedules.filter((schedule) => schedule.id !== id);
  return state.schedules.length !== beforeCount;
}

export function updateMockSettings(input: AppSettings) {
  state.settings = {
    notificationPreferences: {
      missingRecord: input.notificationPreferences.missingRecord,
      alert: input.notificationPreferences.alert,
      schedule: input.notificationPreferences.schedule,
    },
    aiInsightEnabled: input.aiInsightEnabled,
  };
  return clone(state.settings);
}

export function updateMockReadNotifications(readNotificationIds: string[]) {
  state.readNotificationIds = Array.from(new Set(readNotificationIds.filter((id) => typeof id === "string")));
  return [...state.readNotificationIds];
}

export function updateMockExpansionState(input: Partial<ExpansionState>) {
  state.expansionState = normalizeExpansionState({
    sharedCare: {
      ...state.expansionState.sharedCare,
      ...input.sharedCare,
    },
    hospital: {
      ...state.expansionState.hospital,
      ...input.hospital,
    },
    shopping: {
      ...state.expansionState.shopping,
      ...input.shopping,
    },
  });
  return clone(state.expansionState);
}
