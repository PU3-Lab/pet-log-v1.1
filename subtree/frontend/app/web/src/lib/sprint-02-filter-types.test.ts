import { strict as assert } from "node:assert";
import test from "node:test";
import { getAnalysisMetrics, getAnalysisTrendChart, getVisibleAnalysisMetrics } from "./analysis-summary";
import { getCommunityPosts } from "./community";
import { communityPosts, records } from "./mock-data";

test("스프린트 2: 필터와 선택 UI용 데이터 조회가 실제 목록을 줄인다", () => {
  const metrics = getAnalysisMetrics(records, "weekly");
  const walkMetrics = getVisibleAnalysisMetrics(metrics, "walk");
  const walkChart = getAnalysisTrendChart(metrics, "walk");
  const behaviorPosts = getCommunityPosts(communityPosts, { feed: "인기글", board: "행동 고민" });

  assert.deepEqual(walkMetrics.map((metric) => metric.id), ["walk"]);
  assert.deepEqual(walkChart.series.map((series) => series.id), ["walk"]);
  assert.ok(behaviorPosts.every((post) => post.board === "행동 고민" && post.feeds.includes("인기글")));
});

test("스프린트 2 엣지: 일치하지 않는 커뮤니티 필터 조합은 빈 목록을 반환한다", () => {
  const posts = getCommunityPosts(communityPosts, { feed: "인기글", board: "유기동물" });

  assert.deepEqual(posts, []);
});
