import { strict as assert } from "node:assert";
import test from "node:test";
import {
  appendMockChatbotExchange,
  getMockChatbotThreads,
  resetMockPetLogState,
} from "./server/mock-pet-log-store";

test("스프린트 11: 홈 챗봇 목업 질문은 대화방 교환으로 저장될 수 있다", () => {
  resetMockPetLogState();
  const exchange = appendMockChatbotExchange(undefined, "오늘 산책 줄여도 돼?", {
    answer: "최근 기록을 보고 짧게 나누는 것을 권장합니다.",
    referencedRecordIds: ["r2"],
    safetyNotice: "진단이 아닙니다.",
  });

  assert.equal(exchange?.userMessage.role, "user");
  assert.equal(exchange?.assistantMessage.role, "assistant");
  assert.equal(getMockChatbotThreads()[0]?.messages.length, 2);
});

test("스프린트 11 엣지: 없는 대화방 ID를 지정하면 교환을 저장하지 않는다", () => {
  resetMockPetLogState();
  const exchange = appendMockChatbotExchange("missing-thread", "질문", {
    answer: "답변",
    referencedRecordIds: [],
    safetyNotice: "진단이 아닙니다.",
  });

  assert.equal(exchange, null);
  assert.deepEqual(getMockChatbotThreads(), []);
});
