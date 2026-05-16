import type { CareSchedule, ScheduleCategory, ScheduleStatus } from "./types";

export const scheduleCategoryLabels: Record<ScheduleCategory, string> = {
  vaccination: "예방접종",
  medication: "약 복용",
  checkup: "건강검진",
  grooming: "미용",
  food: "사료 변경",
};

function toDayValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return Number.NaN;
  }

  return Date.UTC(year, month - 1, day);
}

function formatToday(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getScheduleStatus(schedule: CareSchedule, today = formatToday()): ScheduleStatus {
  const dayDiff = Math.round((toDayValue(schedule.dueDate) - toDayValue(today)) / 86_400_000);

  if (schedule.isDone) {
    return { dayDiff, label: "완료", tone: "green" };
  }

  if (Number.isNaN(dayDiff)) {
    return { dayDiff: 0, label: "날짜 확인", tone: "orange" };
  }

  if (dayDiff < 0) {
    return { dayDiff, label: `${Math.abs(dayDiff)}일 지남`, tone: "red" };
  }

  if (dayDiff === 0) {
    return { dayDiff, label: "오늘", tone: "orange" };
  }

  if (dayDiff <= 3) {
    return { dayDiff, label: `${dayDiff}일 후`, tone: "blue" };
  }

  return { dayDiff, label: `${dayDiff}일 후`, tone: "green" };
}

export function getUpcomingSchedules(schedules: CareSchedule[], today = formatToday(), limit = 5) {
  return schedules
    .filter((schedule) => !schedule.isDone)
    .sort((a, b) => getScheduleStatus(a, today).dayDiff - getScheduleStatus(b, today).dayDiff)
    .slice(0, limit);
}

export function getScheduleSummary(schedules: CareSchedule[], today = formatToday()) {
  const upcoming = getUpcomingSchedules(schedules, today, schedules.length);
  const dueSoonCount = upcoming.filter((schedule) => {
    const dayDiff = getScheduleStatus(schedule, today).dayDiff;
    return dayDiff >= 0 && dayDiff <= 3;
  }).length;
  const overdueCount = upcoming.filter((schedule) => getScheduleStatus(schedule, today).dayDiff < 0).length;

  return {
    totalActive: upcoming.length,
    dueSoonCount,
    overdueCount,
    nextSchedule: upcoming[0],
  };
}
