import { strict as assert } from "node:assert";
import test from "node:test";
import {
  getCareActionHref,
  getCareNotificationHref,
  getCareSuggestionHref,
  normalizeCareActionHref,
} from "./action-navigation";

test("에이전트가 내려준 케어 액션 링크를 실제 페이지 경로로 정규화한다", () => {
  assert.equal(getCareActionHref("/hospital"), "/hospital");
  assert.equal(getCareActionHref("/shop"), "/shopping");
  assert.equal(getCareActionHref("/schedules?petId=1#next"), "/schedule?petId=1#next");
});

test("제안 카드는 문구를 해석하지 않고 에이전트 actionHref를 따른다", () => {
  assert.equal(
    getCareSuggestionHref({
      action: "병원 예약과 쇼핑 모두 보기",
      actionHref: "/shopping",
      reason: "문구에는 여러 후보가 있지만 에이전트 선택은 쇼핑입니다.",
      title: "병원 예약 쇼핑",
    }),
    "/shopping",
  );
  assert.equal(
    getCareSuggestionHref({
      action: "병원 추천 보기",
      actionHref: "/record",
      reason: "병원 문구가 있어도 actionHref를 덮어쓰지 않습니다.",
      title: "병원 상담",
    }),
    "/record",
  );
});

test("알림 카드는 문구 우선순위 없이 API actionHref를 따른다", () => {
  assert.equal(
    getCareNotificationHref({
      action: "일정 확인",
      actionHref: "/schedule",
      category: "일정",
      detail: "예방접종 예정일이 가까워졌습니다. 병원 예약이나 접종 기록을 확인해보세요.",
      title: "종합백신 접종 시기가 다가옵니다",
    }),
    "/schedule",
  );
  assert.equal(
    getCareNotificationHref({
      action: "지금 예약하기",
      actionHref: "/hospital",
      detail: "필요한 용품 쇼핑도 함께 확인하세요.",
      title: "다음 케어 일정을 확인하세요",
    }),
    "/hospital",
  );
});

test("에이전트 링크가 없거나 지원하지 않으면 fallback 경로로 이동한다", () => {
  assert.equal(getCareActionHref(null), "/record");
  assert.equal(getCareActionHref(undefined, "/profile"), "/profile");
  assert.equal(getCareSuggestionHref({ action: "병원 추천 보기", title: "병원" }), "/record");
  assert.equal(getCareNotificationHref({ actionHref: "/missing", title: "알림" }, "/notifications"), "/notifications");
});

test("API가 내려준 알림 링크를 실제 페이지 경로로 정규화한다", () => {
  assert.equal(normalizeCareActionHref("/schedules"), "/schedule");
  assert.equal(normalizeCareActionHref("/schedules?petId=1#next"), "/schedule?petId=1#next");
  assert.equal(normalizeCareActionHref("/hospitals"), "/hospital");
  assert.equal(normalizeCareActionHref("/shop"), "/shopping");
});

test("지원하지 않는 알림 링크는 404 대신 fallback 경로로 보낸다", () => {
  assert.equal(normalizeCareActionHref("/missing"), "/record");
  assert.equal(normalizeCareActionHref("https://example.com"), "/record");
  assert.equal(normalizeCareActionHref("//example.com"), "/record");
  assert.equal(normalizeCareActionHref("/missing", "/notifications"), "/notifications");
});

test("최근 변화도 문구가 아니라 에이전트 actionHref를 정규화해서 쓴다", () => {
  assert.equal(getCareActionHref("/hospital", "/timeline"), "/hospital");
  assert.equal(getCareActionHref("/shop", "/timeline"), "/shopping");
  assert.equal(getCareActionHref("/missing", "/timeline"), "/timeline");
});
