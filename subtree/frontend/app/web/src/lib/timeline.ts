import { categoryLabels } from "./record-constants";
import { getRecordCategoryChoiceLabel } from "./record-input";
import type { ExtractedMeasurement, RecordCategory, RecordCategoryChoice, RecordEntry, RecordStatus } from "./types";

export type TimelineFilter = "all" | RecordCategory;

export type TimelineRecordQuery = {
  filter: TimelineFilter;
  query: string;
  date?: string;
};

const statusLabels: Record<RecordStatus, string> = {
  normal: "안정 기록",
  notice: "확인 필요",
  alert: "주의 기록",
};

const statusDetails: Record<RecordStatus, string> = {
  normal: "평소 범위 안의 기록으로 볼 수 있습니다.",
  notice: "최근 변화와 함께 한 번 더 확인하면 좋습니다.",
  alert: "반복되거나 심해지면 기록을 모아 병원 상담을 권장합니다.",
};

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function matchesQuery(record: RecordEntry, query: string) {
  if (!query) {
    return true;
  }

  const searchable = [
    record.title,
    record.detail,
    record.date,
    record.time,
    categoryLabels[record.category],
    getRecordCategoryChoiceLabel(getTimelineEditCategory(record)),
    record.structured?.normalizedSummary ?? "",
    ...(record.structured?.measurements.map((measurement) => `${measurement.label} ${measurement.value}`) ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
}

function extractDetailMeasurements(record: RecordEntry): ExtractedMeasurement[] {
  if (record.structured?.measurements.length) {
    return record.structured.measurements;
  }

  const matches = record.detail.match(/\d+(?:\.\d+)?\s?(?:g|kg|분|회)/g) ?? [];
  return matches.slice(0, 4).map((value) => ({ label: "수치", value }));
}

export function getTimelineRecords(records: RecordEntry[], query: TimelineRecordQuery) {
  const normalizedQuery = normalizeQuery(query.query);
  return records.filter((record) => {
    const filterMatched = query.filter === "all" || record.category === query.filter;
    const dateMatched = !query.date || record.date === query.date;
    return filterMatched && dateMatched && matchesQuery(record, normalizedQuery);
  });
}

export function getTimelineDates(records: RecordEntry[]) {
  return Array.from(new Set(records.map((record) => record.date)));
}

export function getTimelineSummary(records: RecordEntry[], date?: string) {
  const scopedRecords = date ? records.filter((record) => record.date === date) : records;
  const alertCount = scopedRecords.filter((record) => record.status === "alert").length;
  const noticeCount = scopedRecords.filter((record) => record.status === "notice").length;
  const noticeLabel = alertCount > 0 ? `주의 ${alertCount}개` : noticeCount > 0 ? `확인 ${noticeCount}개` : "안정";

  return {
    totalCount: scopedRecords.length,
    alertCount,
    noticeCount,
    noticeLabel,
  };
}

export function getTimelineDetail(record: RecordEntry) {
  const measurements = extractDetailMeasurements(record);
  const categoryChoice = getTimelineEditCategory(record);

  return {
    categoryLabel: categoryChoice === "all" ? getRecordCategoryChoiceLabel(categoryChoice) : categoryLabels[categoryChoice],
    statusLabel: statusLabels[record.status],
    statusDetail: statusDetails[record.status],
    measurements,
    aiSummary: record.structured?.normalizedSummary ?? record.title,
  };
}

export function getTimelineEditCategory(record: RecordEntry): RecordCategoryChoice {
  if (record.categoryChoice) {
    return record.categoryChoice;
  }

  return (record.structured?.detectedCategories?.length ?? 0) > 1 ? "all" : record.category;
}
