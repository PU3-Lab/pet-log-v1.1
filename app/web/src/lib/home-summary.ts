import { categoryLabels } from "./record-constants";
import type { RecordCategory, RecordEntry, RecordStatus } from "./types";

export type HomeSummaryTone = "green" | "orange" | "red" | "blue";

export type HomeSummaryCategory = Extract<RecordCategory, "meal" | "walk" | "stool">;

export type HomeSummaryItem = {
  category: HomeSummaryCategory;
  label: string;
  value: string;
  state: string;
  tone: HomeSummaryTone;
};

export type RecentChange = {
  title: string;
  detail: string;
  label: string;
  tone: HomeSummaryTone;
};

const summaryCategories: Array<{ category: HomeSummaryCategory; label: string }> = [
  { category: "meal", label: "식사" },
  { category: "walk", label: "활동" },
  { category: "stool", label: "배변" },
];

const statusLabels: Record<RecordStatus, { label: string; tone: HomeSummaryTone }> = {
  normal: { label: "안정 기록", tone: "green" },
  notice: { label: "변화 있음", tone: "orange" },
  alert: { label: "주의 관찰", tone: "red" },
};

export function getTodaySummary(records: RecordEntry[]): HomeSummaryItem[] {
  return summaryCategories.map(({ category, label }) => {
    const latestRecord = records.find((record) => record.category === category);

    if (!latestRecord) {
      return {
        category,
        label,
        value: "기록 없음",
        state: "기록 필요",
        tone: "orange",
      };
    }

    if (latestRecord.status === "alert") {
      return {
        category,
        label,
        value: "주의",
        state: "관찰 필요",
        tone: "red",
      };
    }

    if (latestRecord.status === "notice") {
      return {
        category,
        label,
        value: "변화 있음",
        state: "확인 필요",
        tone: "orange",
      };
    }

    return {
      category,
      label,
      value: compactLabel(latestRecord.title),
      state: "안정",
      tone: "green",
    };
  });
}

export function getRecentChange(records: RecordEntry[]): RecentChange {
  const alertRecord = records.find((record) => record.status === "alert");
  if (alertRecord) {
    return {
      label: `${categoryLabels[alertRecord.category]} · 주의`,
      title: `${categoryLabels[alertRecord.category]} 관찰이 필요합니다`,
      detail: `${alertRecord.title} 기록이 있습니다. 같은 변화가 반복되거나 심해지면 기록을 모아 병원 상담을 권장합니다.`,
      tone: "red",
    };
  }

  const noticeRecord = records.find((record) => record.status === "notice");
  if (noticeRecord) {
    return {
      label: `${categoryLabels[noticeRecord.category]} · 변화`,
      title: `${categoryLabels[noticeRecord.category]} 변화가 보입니다`,
      detail: `${noticeRecord.title} 기록을 이어서 확인해보세요. 짧은 기록이 쌓이면 평소 패턴과 비교하기 쉬워집니다.`,
      tone: "orange",
    };
  }

  const latestRecord = records[0];
  if (!latestRecord) {
    return {
      label: "기록 대기",
      title: "최근 변화 기록이 없습니다",
      detail: "첫 기록을 남기면 식사, 활동, 배변 변화가 홈에서 바로 정리됩니다.",
      tone: "blue",
    };
  }

  return {
    label: `${categoryLabels[latestRecord.category]} · 안정`,
    title: "최근 흐름은 안정적으로 보입니다",
    detail: `${latestRecord.title} 등 최근 기록에서 큰 주의 신호는 보이지 않습니다. 같은 방식으로 기록을 이어가세요.`,
    tone: "green",
  };
}

export function getRecordStatusLabel(record: RecordEntry) {
  return statusLabels[record.status];
}

function compactLabel(value: string) {
  return value.length > 9 ? `${value.slice(0, 9)}...` : value;
}
