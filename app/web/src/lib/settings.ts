import type {
  AppSettings,
  CareNotificationCategory,
  CareSchedule,
  NotificationPreferences,
  PetProfile,
  RecordEntry,
} from "./types";

type CreatePetLogExportInput = {
  profile: PetProfile;
  records: RecordEntry[];
  schedules: CareSchedule[];
  settings: AppSettings;
  exportedAt?: string;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  missingRecord: true,
  alert: true,
  schedule: true,
};

export const defaultAppSettings: AppSettings = {
  notificationPreferences: defaultNotificationPreferences,
  aiInsightEnabled: true,
};

export const notificationPreferenceOptions: Array<{
  key: keyof NotificationPreferences;
  category: CareNotificationCategory;
  label: string;
  detail: string;
}> = [
  {
    key: "missingRecord",
    category: "기록",
    label: "기록 누락 알림",
    detail: "배변, 산책처럼 빠진 케어 기록을 알려줍니다.",
  },
  {
    key: "alert",
    category: "주의",
    label: "주의 기록 후속 확인",
    detail: "이상 신호가 있는 기록을 한 번 더 확인하도록 알려줍니다.",
  },
  {
    key: "schedule",
    category: "일정",
    label: "일정 리마인더",
    detail: "접종, 약 복용, 검진 일정을 알림에 반영합니다.",
  },
];

export function getEnabledNotificationCategories(preferences: NotificationPreferences): CareNotificationCategory[] {
  return notificationPreferenceOptions
    .filter((option) => preferences[option.key])
    .map((option) => option.category);
}

export function getSettingsSummary(settings: AppSettings) {
  return {
    enabledNotificationCount: getEnabledNotificationCategories(settings.notificationPreferences).length,
    aiInsightLabel: settings.aiInsightEnabled ? "AI 요약 켜짐" : "AI 요약 꺼짐",
  };
}

export function createPetLogExport({
  profile,
  records,
  schedules,
  settings,
  exportedAt = new Date().toISOString(),
}: CreatePetLogExportInput) {
  return {
    appName: "Pet Log",
    version: 1,
    exportedAt,
    summary: {
      profileName: profile.name,
      recordCount: records.length,
      scheduleCount: schedules.length,
      aiInsightEnabled: settings.aiInsightEnabled,
    },
    profile,
    records,
    schedules,
    settings,
  };
}

export function getPetLogExportFileName(profile: PetProfile, exportedAt = new Date().toISOString()) {
  const datePart = exportedAt.slice(0, 10).replaceAll("-", "");
  const safeName = profile.name.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-") || "pet";
  return `pet-log-${safeName}-${datePart}.json`;
}

export function getResetDataSummary(records: RecordEntry[], schedules: CareSchedule[]) {
  return {
    title: "저장 데이터 초기화",
    detail: `기록 ${records.length}개와 일정 ${schedules.length}개를 기본 예시 데이터로 되돌립니다.`,
  };
}
