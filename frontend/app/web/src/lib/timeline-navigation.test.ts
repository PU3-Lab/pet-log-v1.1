import { strict as assert } from "node:assert";
import test from "node:test";
import { getTimelineFilterHref, getTimelineRecordHref, parseTimelineFilter } from "./timeline-navigation";

test("타임라인 필터 링크를 생성한다", () => {
  assert.equal(getTimelineFilterHref("meal"), "/timeline?filter=meal");
  assert.equal(getTimelineFilterHref("behavior"), "/timeline?filter=behavior");
});

test("타임라인 기록 상세 링크는 recordId를 인코딩한다", () => {
  assert.equal(getTimelineRecordHref("record id/1"), "/timeline?recordId=record%20id%2F1");
});

test("지원하는 필터만 타임라인 필터로 파싱한다", () => {
  assert.equal(parseTimelineFilter("walk"), "walk");
  assert.equal(parseTimelineFilter("unknown"), "all");
  assert.equal(parseTimelineFilter(null), "all");
});
