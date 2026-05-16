"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PetIcon } from "@/components/pet-icons";
import { usePetLog } from "@/components/pet-log-provider";
import { Card, Pill, SectionHeader } from "@/components/ui";
import { getScheduleStatus, getScheduleSummary, getUpcomingSchedules, scheduleCategoryLabels } from "@/lib/schedules";
import type { ScheduleCategory, ScheduleTone } from "@/lib/types";

const categoryOptions = Object.entries(scheduleCategoryLabels) as Array<[ScheduleCategory, string]>;
const repeatOptions = ["한 번", "매월", "6개월마다", "매년", "필요할 때"];

const toneClasses: Record<ScheduleTone, string> = {
  green: "bg-[#edf8ed] text-[#16804b]",
  orange: "bg-[#fff2df] text-[#bb721e]",
  red: "bg-[#ffe9e6] text-[#be4c3c]",
  blue: "bg-[#eaf2ff] text-[#2e67a7]",
};

const scheduleCategoryIcons: Record<ScheduleCategory, "syringe" | "medical" | "hospital" | "sparkle" | "meal"> = {
  vaccination: "syringe",
  medication: "medical",
  checkup: "hospital",
  grooming: "sparkle",
  food: "meal",
};

function todayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SchedulePage() {
  const { schedules, addSchedule, toggleScheduleDone, deleteSchedule } = usePetLog();
  const [category, setCategory] = useState<ScheduleCategory>("vaccination");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(todayInputValue());
  const [repeatLabel, setRepeatLabel] = useState("한 번");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const summary = useMemo(() => getScheduleSummary(schedules), [schedules]);
  const upcomingSchedules = useMemo(() => getUpcomingSchedules(schedules, undefined, 10), [schedules]);
  const doneSchedules = useMemo(() => schedules.filter((schedule) => schedule.isDone), [schedules]);

  function saveSchedule() {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("일정 이름을 입력해주세요.");
      return;
    }
    if (!dueDate) {
      setError("예정일을 선택해주세요.");
      return;
    }

    addSchedule({
      category,
      title: nextTitle,
      dueDate,
      repeatLabel,
      note,
    });
    setTitle("");
    setNote("");
    setRepeatLabel("한 번");
    setError("");
  }

  return (
    <AppShell subtitle="일정 기반 리마인더" title="일정">
      <div className="space-y-5">
        <Card className="bg-gradient-to-br from-white to-[#eaf2ff]">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2e67a7]">
            <PetIcon className="h-4 w-4" name="schedule" />
            다가오는 케어
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#1f2922]">{summary.totalActive}개</h2>
          <p className="mt-2 text-sm leading-6 text-[#667262]">
            {summary.nextSchedule
              ? `${summary.nextSchedule.title} 일정이 가장 먼저 다가옵니다.`
              : "예정된 일정이 없습니다. 접종이나 약 복용 일정을 추가해보세요."}
          </p>
	          <div className="mt-4 grid grid-cols-3 gap-2">
	            <div className="rounded-2xl bg-white/75 p-3">
                <PetIcon className="h-4 w-4 text-[#16804b]" name="schedule" />
	              <p className="text-xs font-bold text-[#778174]">진행 중</p>
	              <p className="mt-1 text-lg font-black text-[#1f2922]">{summary.totalActive}개</p>
	            </div>
	            <div className="rounded-2xl bg-white/75 p-3">
                <PetIcon className="h-4 w-4 text-[#bb721e]" name="bell" />
	              <p className="text-xs font-bold text-[#778174]">3일 내</p>
	              <p className="mt-1 text-lg font-black text-[#1f2922]">{summary.dueSoonCount}개</p>
            </div>
            <div className="rounded-2xl bg-white/75 p-3">
              <PetIcon className="h-4 w-4 text-[#be4c3c]" name="alert" />
              <p className="text-xs font-bold text-[#778174]">지연</p>
              <p className="mt-1 text-lg font-black text-[#be4c3c]">{summary.overdueCount}개</p>
            </div>
          </div>
        </Card>

        <section>
          <SectionHeader title="일정 추가" />
          <Card>
            <div className="space-y-4">
	              <div>
	                <p className="mb-2 text-xs font-bold text-[#778174]">분류</p>
	                <div className="grid grid-cols-2 gap-2">
	                  {categoryOptions.map(([value, label]) => (
	                    <Pill active={category === value} className="w-full px-2 text-xs" key={value} onClick={() => setCategory(value)}>
                        <span className="inline-flex items-center gap-1.5">
                          <PetIcon className="h-3.5 w-3.5" name={scheduleCategoryIcons[value]} />
	                      {label}
                        </span>
	                    </Pill>
	                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-[#778174]">일정 이름</span>
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-[#dde6d6] bg-white px-3 text-sm font-semibold text-[#263022] outline-none focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15"
                  onChange={(event) => {
                    setTitle(event.target.value);
                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="예: 종합백신 접종"
                  value={title}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold text-[#778174]">예정일</span>
                  <input
                    className="mt-1 h-11 w-full rounded-xl border border-[#dde6d6] bg-white px-3 text-sm font-semibold text-[#263022] outline-none focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15"
                    onChange={(event) => setDueDate(event.target.value)}
                    type="date"
                    value={dueDate}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[#778174]">반복</span>
                  <select
                    className="mt-1 h-11 w-full rounded-xl border border-[#dde6d6] bg-white px-3 text-sm font-semibold text-[#263022] outline-none focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15"
                    onChange={(event) => setRepeatLabel(event.target.value)}
                    value={repeatLabel}
                  >
                    {repeatOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-[#778174]">메모</span>
                <textarea
                  className="mt-1 min-h-20 w-full resize-none rounded-xl border border-[#dde6d6] bg-white p-3 text-sm leading-6 text-[#263022] outline-none focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15"
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="복용 시간, 병원에 보여줄 기록 등을 적어두세요."
                  value={note}
                />
              </label>
              {error ? <p className="text-sm font-semibold text-[#be4c3c]">{error}</p> : null}
              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#16804b] text-base font-bold text-white shadow-[0_8px_22px_rgba(22,128,75,0.25)]"
                onClick={saveSchedule}
                type="button"
              >
                <PetIcon className="h-5 w-5" name="plus" />
                일정 저장
              </button>
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="예정된 일정" />
          <div className="space-y-3">
            {upcomingSchedules.map((schedule) => {
              const status = getScheduleStatus(schedule);
              return (
                <Card className="p-4" key={schedule.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${toneClasses[status.tone]}`}>{status.label}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f3ed] px-2.5 py-1 text-xs font-bold text-[#667262]">
                          <PetIcon className="h-3.5 w-3.5" name={scheduleCategoryIcons[schedule.category]} />
                          {scheduleCategoryLabels[schedule.category]}
                        </span>
                      </div>
                      <h2 className="mt-3 text-base font-black text-[#1f2922]">{schedule.title}</h2>
                      <p className="mt-1 text-sm font-semibold text-[#667262]">
                        {schedule.dueDate} · {schedule.repeatLabel}
                      </p>
                      {schedule.note ? <p className="mt-2 text-sm leading-6 text-[#667262]">{schedule.note}</p> : null}
                    </div>
                    <button className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#16804b]" onClick={() => toggleScheduleDone(schedule.id)} type="button">
                      <PetIcon className="h-4 w-4" name="check" />
                      완료
                    </button>
                  </div>
                </Card>
              );
            })}
            {upcomingSchedules.length === 0 ? (
              <Card className="p-5 text-center">
                <h2 className="text-sm font-bold text-[#1f2922]">예정된 일정이 없습니다.</h2>
                <p className="mt-2 text-sm leading-6 text-[#667262]">접종, 약 복용, 건강검진 일정을 추가하면 알림에 반영됩니다.</p>
              </Card>
            ) : null}
          </div>
        </section>

        {doneSchedules.length > 0 ? (
          <section>
            <SectionHeader title="완료한 일정" />
            <div className="space-y-3">
              {doneSchedules.map((schedule) => (
                <Card className="p-4 opacity-80" key={schedule.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#778174]">
                        <PetIcon className="h-3.5 w-3.5 text-[#16804b]" name={scheduleCategoryIcons[schedule.category]} />
                        {scheduleCategoryLabels[schedule.category]}
                      </p>
                      <h2 className="mt-1 text-sm font-black text-[#1f2922]">{schedule.title}</h2>
                    </div>
                    <div className="flex shrink-0 gap-3 text-sm font-bold">
                      <button className="text-[#16804b]" onClick={() => toggleScheduleDone(schedule.id)} type="button">
                        되돌리기
                      </button>
                      <button className="text-[#be4c3c]" onClick={() => deleteSchedule(schedule.id)} type="button">
                        삭제
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
