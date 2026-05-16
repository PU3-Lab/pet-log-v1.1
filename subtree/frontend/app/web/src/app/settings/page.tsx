"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PetIcon } from "@/components/pet-icons";
import { usePetLog } from "@/components/pet-log-provider";
import { Card, SectionHeader } from "@/components/ui";
import {
  createPetLogExport,
  getPetLogExportFileName,
  getResetDataSummary,
  getSettingsSummary,
  notificationPreferenceOptions,
} from "@/lib/settings";
import type { NotificationPreferences } from "@/lib/types";

type MenuIconName = ComponentProps<typeof PetIcon>["name"];

const categoryClasses = {
  기록: "bg-[#edf8ed] text-[#16804b]",
  주의: "bg-[#ffe9e6] text-[#be4c3c]",
  "행동 변화": "bg-[#fff2df] text-[#bb721e]",
  일정: "bg-[#eaf2ff] text-[#2e67a7]",
};

const categoryIcons = {
  기록: "record",
  주의: "alert",
  "행동 변화": "behavior",
  일정: "schedule",
} as const satisfies Record<keyof typeof categoryClasses, MenuIconName>;

const dataSummaryItems = [
  { icon: "profile", label: "프로필" },
  { icon: "record", label: "저장된 기록" },
  { icon: "schedule", label: "진행 중 일정" },
] as const satisfies ReadonlyArray<{ icon: MenuIconName; label: string }>;

const dataLinks = [
  { href: "/profile", icon: "profile", label: "프로필" },
  { href: "/timeline", icon: "timeline", label: "기록" },
  { href: "/schedule", icon: "schedule", label: "일정" },
] as const satisfies ReadonlyArray<{ href: string; icon: MenuIconName; label: string }>;

const settingPanelClass =
  "rounded-2xl border border-[#cdd8c6] bg-white p-4 shadow-[0_10px_28px_rgba(49,65,44,0.1)]";

function ToggleMark({ active }: { active: boolean }) {
  return (
    <span
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${active ? "bg-[#16804b]" : "bg-[#cfd8ca]"}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
          active ? "left-6" : "left-1"
        }`}
      />
    </span>
  );
}

export default function SettingsPage() {
  const { profile, records, schedules, settings, updateSettings, resetPetLogData } = usePetLog();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const summary = useMemo(() => getSettingsSummary(settings), [settings]);
  const activeSchedules = useMemo(() => schedules.filter((schedule) => !schedule.isDone).length, [schedules]);
  const resetSummary = useMemo(() => getResetDataSummary(records, schedules), [records, schedules]);

  function toggleNotificationPreference(key: keyof NotificationPreferences) {
    updateSettings({
      ...settings,
      notificationPreferences: {
        ...settings.notificationPreferences,
        [key]: !settings.notificationPreferences[key],
      },
    });
  }

  function toggleAiInsight() {
    updateSettings({
      ...settings,
      aiInsightEnabled: !settings.aiInsightEnabled,
    });
  }

  function exportData() {
    const exportedAt = new Date().toISOString();
    const exportedPayload = createPetLogExport({ profile, records, schedules, settings, exportedAt });
    const fileName = getPetLogExportFileName(profile, exportedAt);
    const blob = new Blob([JSON.stringify(exportedPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setExportStatus(`${fileName} 파일로 준비했습니다.`);
  }

  function confirmReset() {
    resetPetLogData();
    setIsResetConfirmOpen(false);
    setExportStatus("");
  }

  return (
    <AppShell subtitle="알림과 AI 요약 관리" title="설정">
      <div className="space-y-5">
        <Card className="bg-gradient-to-br from-white to-[#edf8ed]">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#16804b]">
            <PetIcon className="h-4 w-4" name="settings" />
            현재 설정
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#1f2922]">알림 {summary.enabledNotificationCount}개 켜짐</h2>
          <p className="mt-2 text-sm leading-6 text-[#667262]">{summary.aiInsightLabel} 상태입니다.</p>
        </Card>

        <section>
          <SectionHeader title="알림" />
          <div className="space-y-3">
            {notificationPreferenceOptions.map((option) => {
              const active = settings.notificationPreferences[option.key];
              return (
                <button
                  aria-pressed={active}
                  className={`${settingPanelClass} w-full text-left`}
                  key={option.key}
                  onClick={() => toggleNotificationPreference(option.key)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${categoryClasses[option.category]}`}>
                        <PetIcon className="h-5 w-5" name={categoryIcons[option.category]} />
                      </span>
                      <span className="min-w-0">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${categoryClasses[option.category]}`}>
                          {option.category}
                        </span>
                        <h2 className="mt-3 text-sm font-black text-[#1f2922]">{option.label}</h2>
                        <p className="mt-1 text-xs font-semibold leading-5 text-[#667262]">{option.detail}</p>
                      </span>
                    </div>
                    <ToggleMark active={active} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <SectionHeader title="AI" />
          <button
            aria-pressed={settings.aiInsightEnabled}
            className={`${settingPanelClass} w-full text-left`}
            onClick={toggleAiInsight}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#edf8ed] text-[#16804b]">
                  <PetIcon className="h-5 w-5" name="sparkle" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#1f2922]">AI 요약과 케어 제안</p>
                  <p className="mt-1 text-sm leading-6 text-[#667262]">홈, 분석, 제안 화면의 해석형 문구를 표시합니다.</p>
                </div>
              </div>
              <ToggleMark active={settings.aiInsightEnabled} />
            </div>
          </button>
        </section>

        <section>
          <SectionHeader title="데이터" />
          <div className="space-y-3">
            <Card>
              <dl className="space-y-3 text-sm">
                {dataSummaryItems.map((item) => {
                  const value =
                    item.label === "프로필"
                      ? profile.name
                      : item.label === "저장된 기록"
                        ? `${records.length}개`
                        : `${activeSchedules}개`;

                  return (
                  <div className="flex justify-between gap-4 border-b border-[#edf1e9] pb-3 last:border-0 last:pb-0" key={item.label}>
                    <dt className="inline-flex items-center gap-2 font-bold text-[#778174]">
                      <PetIcon className="h-4 w-4 text-[#16804b]" name={item.icon} />
                      {item.label}
                    </dt>
                    <dd className="text-right font-semibold text-[#263022]">{value}</dd>
                  </div>
                  );
                })}
              </dl>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {dataLinks.map((item) => (
                  <Link
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#dce7d7] bg-[#f7fbf4] text-sm font-bold text-[#16804b]"
                    href={item.href}
                    key={item.href}
                  >
                    <PetIcon className="h-4 w-4" name={item.icon} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </Card>

            <div className={settingPanelClass}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#edf8ed] text-[#16804b]">
                    <PetIcon className="h-5 w-5" name="record" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#1f2922]">데이터 내보내기</p>
                    <p className="mt-1 text-sm leading-6 text-[#667262]">프로필, 기록, 일정, 설정을 JSON 파일로 저장합니다.</p>
                    {exportStatus ? <p className="mt-2 text-xs font-bold text-[#16804b]">{exportStatus}</p> : null}
                  </div>
                </div>
                <button
                  className="h-10 shrink-0 rounded-xl bg-[#16804b] px-3 text-sm font-black text-white"
                  onClick={exportData}
                  type="button"
                >
                  내보내기
                </button>
              </div>
            </div>

            <div className={settingPanelClass}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#ffe9e6] text-[#be4c3c]">
                    <PetIcon className="h-5 w-5" name="alert" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#1f2922]">{resetSummary.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[#667262]">{resetSummary.detail}</p>
                  </div>
                </div>
                <button
                  className="h-10 shrink-0 rounded-xl border border-[#f0c0b8] bg-[#fff4f2] px-3 text-sm font-black text-[#be4c3c]"
                  onClick={() => setIsResetConfirmOpen(true)}
                  type="button"
                >
                  초기화
                </button>
              </div>
              {isResetConfirmOpen ? (
                <div className="mt-4 rounded-xl border border-[#f0c0b8] bg-[#fff8f6] p-3">
                  <p className="text-sm font-bold leading-6 text-[#5b3934]">현재 브라우저에 저장된 변경사항을 기본 예시 데이터로 되돌립니다.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      className="h-10 rounded-xl border border-[#dce7d7] bg-white text-sm font-black text-[#667262]"
                      onClick={() => setIsResetConfirmOpen(false)}
                      type="button"
                    >
                      취소
                    </button>
                    <button className="h-10 rounded-xl bg-[#be4c3c] text-sm font-black text-white" onClick={confirmReset} type="button">
                      되돌리기
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
