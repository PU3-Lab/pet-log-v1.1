import { strict as assert } from "node:assert";
import test from "node:test";
import { buildActionableAnalysisInsights } from "./analysis-navigation";

test("분석 AI 카드도 에이전트 actionHref를 보존하고 실제 페이지 경로로 정규화한다", () => {
  const insights = buildActionableAnalysisInsights([
    {
      actionHref: "/hospitals",
      reason: "병원 관찰이 필요합니다.",
      severity: "alert",
      title: "병원 관찰 필요",
    },
    {
      actionHref: "/schedules?petId=1#next",
      reason: "다음 예약을 확인해야 합니다.",
      severity: "notice",
      title: "예약 확인",
    },
    {
      actionHref: "/shop",
      reason: "필요한 용품을 확인하세요.",
      severity: "info",
      title: "용품 확인",
    },
  ]);

  assert.deepEqual(
    insights.map((insight) => insight.actionHref),
    ["/hospital", "/schedule?petId=1#next", "/shopping"],
  );
  assert.deepEqual(
    insights.map((insight) => insight.tone),
    ["red", "orange", "green"],
  );
});

test("분석 AI 카드의 에이전트 링크가 없으면 분석 맥락의 fallback으로 이동한다", () => {
  const [insight] = buildActionableAnalysisInsights([
    {
      actionHref: "/missing",
      reason: "지원하지 않는 경로는 fallback을 사용합니다.",
      severity: "info",
      title: "기록 확인",
    },
  ]);

  assert.equal(insight.actionHref, "/timeline");
});
