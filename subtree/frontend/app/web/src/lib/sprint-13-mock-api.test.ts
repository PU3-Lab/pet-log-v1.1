import { strict as assert } from "node:assert";
import test from "node:test";
import {
  appendMockChatbotExchange,
  getMockChatbotThreads,
  getMockPetLogState,
  resetMockPetLogState,
  updateMockReadNotifications,
} from "./server/mock-pet-log-store";

test("스프린트 13: mock API 전환용 서버 상태는 앱 초기 상태와 읽음 상태를 제공한다", () => {
  resetMockPetLogState();
  const state = getMockPetLogState();
  const readIds = updateMockReadNotifications(["missing-stool", "missing-stool", 1 as unknown as string]);

  assert.equal(state.version, 1);
  assert.ok(state.records.length > 0);
  assert.ok(state.schedules.length > 0);
  assert.deepEqual(readIds, ["missing-stool"]);
});

test("스프린트 13 엣지: 서버 상태 reset은 챗봇 대화 이력도 초기화한다", () => {
  appendMockChatbotExchange(undefined, "질문", {
    answer: "답변",
    referencedRecordIds: [],
    safetyNotice: "진단이 아닙니다.",
  });
  resetMockPetLogState();

  assert.deepEqual(getMockChatbotThreads(), []);
});
