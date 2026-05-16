import { strict as assert } from "node:assert";
import test from "node:test";
import {
  appendMockChatbotExchange,
  createMockChatbotThread,
  getMockChatbotThreads,
  resetMockPetLogState,
} from "./server/mock-pet-log-store";

test("스프린트 17: 챗봇 대화방 API 경계는 지정 thread에 메시지를 누적한다", () => {
  resetMockPetLogState();
  const thread = createMockChatbotThread("주의 기록 상담");
  const exchange = appendMockChatbotExchange(thread.id, "현관 앞 기다림이 늘었어", {
    answer: "반복 여부를 이어서 기록하세요.",
    referencedRecordIds: ["r5"],
    safetyNotice: "진단이 아닙니다.",
  });
  const threads = getMockChatbotThreads();

  assert.equal(exchange?.thread.id, thread.id);
  assert.equal(threads[0]?.id, thread.id);
  assert.deepEqual(threads[0]?.messages.map((message) => message.role), ["user", "assistant"]);
});

test("스프린트 17 엣지: 대화방 메시지는 최근 20개까지만 유지된다", () => {
  resetMockPetLogState();
  const thread = createMockChatbotThread("긴 대화");

  Array.from({ length: 11 }).forEach((_, index) => {
    appendMockChatbotExchange(thread.id, `질문 ${index}`, {
      answer: `답변 ${index}`,
      referencedRecordIds: [],
      safetyNotice: "진단이 아닙니다.",
    });
  });

  assert.equal(getMockChatbotThreads()[0]?.messages.length, 20);
});
