import { strict as assert } from "node:assert";
import test from "node:test";
import { createPetLogStructuredRecord } from "./server/pet-log-ai-service";
import { restoreEnvValue } from "./sprint-test-utils";

test("스프린트 18: 기록 구조화는 서버 AI provider 경계를 통해 mock 결과를 반환한다", async () => {
  const previousProvider = process.env.PET_LOG_AI_PROVIDER;
  process.env.PET_LOG_AI_PROVIDER = "mock";

  try {
    const structured = await createPetLogStructuredRecord({
      detail: "아침 사료 45g 먹고 산책 20분 했어요.",
      fallbackCategory: "meal",
    });

    assert.equal(structured.suggestedCategory, "meal");
    assert.deepEqual(structured.measurements, []);
  } finally {
    restoreEnvValue("PET_LOG_AI_PROVIDER", previousProvider);
  }
});

test("스프린트 18 엣지: OpenAI provider 설정이 불완전하면 mock 구조화로 fallback한다", async () => {
  const previousProvider = process.env.PET_LOG_AI_PROVIDER;
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.PET_LOG_AI_PROVIDER = "openai";
  delete process.env.OPENAI_API_KEY;

  try {
    const structured = await createPetLogStructuredRecord({
      detail: "산책 15분",
      fallbackCategory: "walk",
    });

    assert.equal(structured.suggestedCategory, "walk");
    assert.deepEqual(structured.measurements, []);
  } finally {
    restoreEnvValue("PET_LOG_AI_PROVIDER", previousProvider);
    restoreEnvValue("OPENAI_API_KEY", previousApiKey);
  }
});
