import { categoryLabels } from "./record-constants";
import type { RecordCategory, RecordEntry, RecordStatus } from "./types";

export type AnalysisRange = "weekly" | "monthly";

export type AnalysisTone = "green" | "orange" | "red" | "blue";

export type AnalysisCard = {
  id: RecordCategory;
  label: string;
  value: string;
  trend: string;
  tone: AnalysisTone;
};

export type AnalysisMetric = {
  id: Extract<RecordCategory, "meal" | "walk" | "stool" | "behavior">;
  label: string;
  unit: string;
  values: number[];
  trend: string;
  tone: AnalysisTone;
};

export type AnalysisMetricFilter = "all" | AnalysisMetric["id"];

export type AnalysisTrendSeries = Pick<AnalysisMetric, "id" | "label" | "values"> & {
  color: string;
};

export type AnalysisTrendChart = {
  title: string;
  detail: string;
  unit: string;
  tone: AnalysisTone;
  series: AnalysisTrendSeries[];
};

export type AnalysisReport = {
  period: string;
  title: string;
  cards: AnalysisCard[];
  insight: string;
};

export type AnalysisHighlight = {
  id: Extract<RecordCategory, "meal" | "walk" | "behavior">;
  label: string;
  title: string;
  detail: string;
  tone: AnalysisTone;
};

export type RiskRecordSummary = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  tone: AnalysisTone;
};

export type VetBrief = {
  title: string;
  detail: string;
  items: string[];
};

const reportCategories: RecordCategory[] = ["meal", "walk", "stool", "behavior"];
const metricCategories: AnalysisMetric["id"][] = ["meal", "walk", "stool", "behavior"];
const highlightCategories: AnalysisHighlight["id"][] = ["meal", "walk", "behavior"];
const metricChartColors: Record<AnalysisMetric["id"], string> = {
  meal: "#16804b",
  walk: "#df8f24",
  stool: "#a4651a",
  behavior: "#356aa8",
};

const statusView: Record<RecordStatus, { value: string; tone: AnalysisTone }> = {
  normal: { value: "안정", tone: "green" },
  notice: { value: "확인 필요", tone: "orange" },
  alert: { value: "주의", tone: "red" },
};

export function getAnalysisReport(records: RecordEntry[], range: AnalysisRange): AnalysisReport {
  const scopedRecords = getScopedRecords(records, range);
  const cards = reportCategories.map((category) => createReportCard(category, scopedRecords));
  const alertCount = scopedRecords.filter((record) => record.status === "alert").length;
  const noticeCount = scopedRecords.filter((record) => record.status === "notice").length;

  return {
    period: range === "weekly" ? "최근 7개 기록 기준" : "최근 30개 기록 기준",
    title: range === "weekly" ? "이번 주 기록 분석" : "이번 달 기록 분석",
    cards,
    insight: createInsight(scopedRecords.length, alertCount, noticeCount),
  };
}

export function getAnalysisHighlights(records: RecordEntry[], range: AnalysisRange): AnalysisHighlight[] {
  const scopedRecords = getScopedRecords(records, range);

  return highlightCategories.map((category) => createHighlight(category, scopedRecords));
}

export function getRiskRecords(records: RecordEntry[], range: AnalysisRange): RiskRecordSummary[] {
  const scopedRecords = getScopedRecords(records, range);
  const riskRecords = scopedRecords.filter((record) => record.status !== "normal").slice(0, 4);

  if (riskRecords.length === 0) {
    return [
      {
        id: "risk-empty",
        title: "이상 징후 기록 없음",
        detail: "선택한 기간에는 주의하거나 확인할 기록이 없습니다.",
        meta: range === "weekly" ? "최근 7개 기록 기준" : "최근 30개 기록 기준",
        tone: "blue",
      },
    ];
  }

  return riskRecords.map((record) => ({
    id: record.id,
    title: record.title,
    detail: record.detail,
    meta: `${record.date} ${record.time} · ${categoryLabels[record.category]} · ${statusView[record.status].value}`,
    tone: statusView[record.status].tone,
  }));
}

export function getAnalysisMetrics(records: RecordEntry[], range: AnalysisRange): AnalysisMetric[] {
  const scopedRecords = getScopedRecords(records, range);
  const uniqueDates = [...new Set(scopedRecords.map((r) => r.date))];
  const chartDates = uniqueDates.sort((a, b) => parseKoreanDate(a).getTime() - parseKoreanDate(b).getTime());

  return metricCategories.map((category) => {
    const categoryRecords = scopedRecords.filter((record) => record.category === category);
    const latest = categoryRecords[0];
    const count = categoryRecords.length;

    const values =
      chartDates.length > 0
        ? chartDates.map((date) => scopedRecords.filter((r) => r.date === date && r.category === category).length)
        : [0];

    return {
      id: category,
      label: categoryLabels[category],
      unit: "건",
      values,
      trend: latest ? `${count}건 · 최근 ${latest.time}` : "최근 기록 없음",
      tone: latest ? statusView[latest.status].tone : "blue",
    };
  });
}

export function getVisibleAnalysisMetrics(metrics: AnalysisMetric[], activeMetric: AnalysisMetricFilter): AnalysisMetric[] {
  if (activeMetric === "all") {
    return metrics;
  }

  return metrics.filter((metric) => metric.id === activeMetric);
}

export function getAnalysisTrendChart(metrics: AnalysisMetric[], activeMetric: AnalysisMetricFilter): AnalysisTrendChart {
  const visibleMetrics = getVisibleAnalysisMetrics(metrics, activeMetric);
  const primaryMetric = visibleMetrics[0];
  const isAll = activeMetric === "all";

  return {
    title: isAll ? "전체 변화" : primaryMetric?.label ?? "변화 추이",
    detail: isAll ? "식사 · 산책 · 배변 · 행동 흐름" : primaryMetric?.trend ?? "최근 기록 없음",
    unit: primaryMetric?.unit ?? "건",
    tone: getTrendChartTone(visibleMetrics),
    series: visibleMetrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      values: metric.values,
      color: metricChartColors[metric.id],
    })),
  };
}

export function getVetBrief(records: RecordEntry[]): VetBrief {
  const recentRecords = records.slice(0, 3);
  const hasAlert = records.some((record) => record.status === "alert");

  return {
    title: "병원 제출용 요약",
    detail: hasAlert
      ? "주의 기록이 포함되어 있습니다. 증상이 반복되거나 심해지면 이 요약과 원문 기록을 함께 병원 상담에 활용하세요."
      : "최근 기록에서 큰 주의 신호는 보이지 않습니다. 상담이 필요할 때 원문 기록을 함께 확인할 수 있습니다.",
    items:
      recentRecords.length > 0
        ? recentRecords.map((record) => `${record.date} ${record.time} · ${categoryLabels[record.category]} · ${record.title}`)
        : ["아직 제출용으로 정리할 기록이 없습니다."],
  };
}

function parseKoreanDate(dateStr: string): Date {
  const match = dateStr.match(/(\d+)월\s*(\d+)일/);
  if (!match) return new Date(0);
  const month = parseInt(match[1], 10) - 1;
  const day = parseInt(match[2], 10);
  const now = new Date();
  const date = new Date(now.getFullYear(), month, day);
  if (date > now) date.setFullYear(now.getFullYear() - 1);
  return date;
}

function getScopedRecords(records: RecordEntry[], range: AnalysisRange): RecordEntry[] {
  const days = range === "weekly" ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return records.filter((record) => parseKoreanDate(record.date) >= cutoff);
}

function getTrendChartTone(metrics: AnalysisMetric[]): AnalysisTone {
  if (metrics.some((metric) => metric.tone === "red")) {
    return "red";
  }

  if (metrics.some((metric) => metric.tone === "orange")) {
    return "orange";
  }

  return metrics.some((metric) => metric.tone === "green") ? "green" : "blue";
}

function createReportCard(category: RecordCategory, records: RecordEntry[]): AnalysisCard {
  const categoryRecords = records.filter((record) => record.category === category);
  const latest = categoryRecords[0];

  if (!latest) {
    return {
      id: category,
      label: categoryLabels[category],
      value: "기록 없음",
      trend: "판단 보류",
      tone: "blue",
    };
  }

  const status = statusView[latest.status];
  return {
    id: category,
    label: categoryLabels[category],
    value: status.value,
    trend: `${categoryRecords.length}건 · 최근 ${latest.time}`,
    tone: status.tone,
  };
}

function createHighlight(category: AnalysisHighlight["id"], records: RecordEntry[]): AnalysisHighlight {
  const categoryRecords = records.filter((record) => record.category === category);
  const latest = categoryRecords[0];

  if (!latest) {
    return {
      id: category,
      label: categoryLabels[category],
      title: "기록 없음",
      detail: `${categoryLabels[category]} 기록이 쌓이면 패턴을 더 정확히 볼 수 있습니다.`,
      tone: "blue",
    };
  }

  const alertCount = categoryRecords.filter((record) => record.status === "alert").length;
  const noticeCount = categoryRecords.filter((record) => record.status === "notice").length;

  if (alertCount > 0) {
    return {
      id: category,
      label: categoryLabels[category],
      title: "주의 패턴",
      detail: `${categoryLabels[category]}에서 주의 기록 ${alertCount}건이 있습니다. 최근 기록은 ${latest.time}의 "${latest.title}"입니다.`,
      tone: "red",
    };
  }

  if (noticeCount > 0) {
    return {
      id: category,
      label: categoryLabels[category],
      title: "확인 필요",
      detail: `${categoryLabels[category]}에서 확인 필요한 변화 ${noticeCount}건이 있습니다. ${latest.time} 기록을 이어서 관찰하세요.`,
      tone: "orange",
    };
  }

  return {
    id: category,
    label: categoryLabels[category],
    title: "안정 흐름",
    detail: `${categoryLabels[category]} 기록 ${categoryRecords.length}건이 안정 범위로 남아 있습니다.`,
    tone: "green",
  };
}

function createInsight(recordCount: number, alertCount: number, noticeCount: number) {
  if (recordCount === 0) {
    return "분석할 기록이 아직 없습니다. 식사, 산책, 배변 중 하나라도 남기면 변화 흐름을 볼 수 있습니다.";
  }

  if (alertCount > 0) {
    return `주의 기록 ${alertCount}건이 포함되어 있습니다. 같은 변화가 반복되는지 이어서 관찰하고 필요하면 병원 상담을 권장합니다.`;
  }

  if (noticeCount > 0) {
    return `확인 필요한 변화 ${noticeCount}건이 있습니다. 짧은 기록을 이어가면 평소 패턴과 비교하기 쉬워집니다.`;
  }

  return "최근 기록 흐름은 안정적으로 보입니다. 지금처럼 식사, 활동, 배변을 고르게 남기면 해석 정확도가 높아집니다.";
}
