import { getCareActionHref } from "./action-navigation";
import type { AiInsight } from "./types";

export type ActionableAnalysisInsight = {
  actionHref: string;
  detail: string;
  id: string;
  title: string;
  tone: "red" | "orange" | "green";
};

function getAnalysisInsightTone(severity: AiInsight["severity"]): ActionableAnalysisInsight["tone"] {
  if (severity === "alert") {
    return "red";
  }
  if (severity === "notice") {
    return "orange";
  }
  return "green";
}

export function buildActionableAnalysisInsights(insights: AiInsight[]): ActionableAnalysisInsight[] {
  return insights.map((insight, idx) => ({
    actionHref: getCareActionHref(insight.actionHref, "/timeline"),
    detail: insight.reason,
    id: `insight-${idx}`,
    title: insight.title,
    tone: getAnalysisInsightTone(insight.severity),
  }));
}
