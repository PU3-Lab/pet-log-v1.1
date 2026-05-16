import { strict as assert } from "node:assert";
import { petProfile, records, schedules } from "./mock-data";
import {
  createPetLogExport,
  defaultAppSettings,
  defaultNotificationPreferences,
  getEnabledNotificationCategories,
  getResetDataSummary,
  getSettingsSummary,
} from "./settings";

const disabledRecordPreferences = {
  ...defaultNotificationPreferences,
  missingRecord: false,
};

assert.deepEqual(getEnabledNotificationCategories(disabledRecordPreferences), ["주의", "일정"]);

const summary = getSettingsSummary({
  notificationPreferences: disabledRecordPreferences,
  aiInsightEnabled: false,
});

assert.equal(summary.enabledNotificationCount, 2);
assert.equal(summary.aiInsightLabel, "AI 요약 꺼짐");

const exportData = createPetLogExport({
  profile: petProfile,
  records,
  schedules,
  settings: defaultAppSettings,
  exportedAt: "2026-04-29T09:00:00.000Z",
});

assert.equal(exportData.appName, "Pet Log");
assert.equal(exportData.version, 1);
assert.equal(exportData.exportedAt, "2026-04-29T09:00:00.000Z");
assert.equal(exportData.summary.profileName, "코코");
assert.equal(exportData.summary.recordCount, records.length);
assert.equal(exportData.summary.scheduleCount, schedules.length);
assert.deepEqual(exportData.records, records);

const resetSummary = getResetDataSummary(records, schedules);

assert.equal(resetSummary.title, "저장 데이터 초기화");
assert.equal(resetSummary.detail, `기록 ${records.length}개와 일정 ${schedules.length}개를 기본 예시 데이터로 되돌립니다.`);
