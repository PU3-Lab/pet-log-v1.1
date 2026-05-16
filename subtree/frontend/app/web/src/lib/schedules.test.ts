import { strict as assert } from "node:assert";
import { getScheduleStatus, getUpcomingSchedules } from "./schedules";
import type { CareSchedule } from "./types";

const schedules: CareSchedule[] = [
  {
    id: "future-checkup",
    category: "checkup",
    title: "정기 검진",
    dueDate: "2026-05-10",
    repeatLabel: "6개월마다",
    note: "최근 행동 기록을 함께 보여주기",
    isDone: false,
  },
  {
    id: "done-vaccine",
    category: "vaccination",
    title: "종합백신",
    dueDate: "2026-04-20",
    repeatLabel: "매년",
    note: "접종 완료",
    isDone: true,
  },
  {
    id: "due-medication",
    category: "medication",
    title: "심장사상충 약",
    dueDate: "2026-05-01",
    repeatLabel: "매월",
    note: "저녁 식사 후",
    isDone: false,
  },
];

assert.equal(getScheduleStatus(schedules[2], "2026-04-29").tone, "blue");
assert.equal(getScheduleStatus(schedules[2], "2026-04-29").label, "2일 후");
assert.equal(getScheduleStatus(schedules[1], "2026-04-29").label, "완료");

const upcoming = getUpcomingSchedules(schedules, "2026-04-29");
assert.deepEqual(
  upcoming.map((schedule) => schedule.id),
  ["due-medication", "future-checkup"],
);
