import { strict as assert } from "node:assert";
import test from "node:test";
import { getMockPetLogState } from "./server/mock-pet-log-store";
import { createPetLogChatbotMessage } from "./server/pet-log-ai-service";
import { restoreEnvValue } from "./sprint-test-utils";

test("스프린트 15: 서버 AI service mock provider는 안전 안내와 참고 기록을 반환한다", async () => {
  const previousProvider = process.env.PET_LOG_AI_PROVIDER;
  process.env.PET_LOG_AI_PROVIDER = "mock";

  try {
    const result = await createPetLogChatbotMessage({
      question: "최근 행동 괜찮아?",
      contextRecordIds: ["r5"],
      state: getMockPetLogState(),
    });

    assert.ok(result.answer.includes("최근 행동 괜찮아?"));
    assert.deepEqual(result.referencedRecordIds, ["r5"]);
    assert.ok(result.safetyNotice.includes("진단이 아닙니다"));
  } finally {
    restoreEnvValue("PET_LOG_AI_PROVIDER", previousProvider);
  }
});

test("스프린트 15 엣지: 참고 기록 ID가 없으면 빈 참고 목록으로 mock 답변을 만든다", async () => {
  const result = await createPetLogChatbotMessage({
    question: "기록이 없어도 답해?",
    contextRecordIds: ["missing-record"],
    state: getMockPetLogState(),
  });

  assert.deepEqual(result.referencedRecordIds, []);
  assert.ok(result.answer.includes("아직 참고할 최근 기록이 많지 않습니다"));
});
