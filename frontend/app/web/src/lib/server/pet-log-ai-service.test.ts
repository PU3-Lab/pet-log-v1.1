import { strict as assert } from "node:assert";
import { createPetLogStructuredRecord } from "./pet-log-ai-service";

(async () => {
  const structured = await createPetLogStructuredRecord({
    detail: "아침 사료 45g 먹고 산책 20분 했어요.",
    fallbackCategory: "meal",
  });

  assert.equal(structured.sourceText, "아침 사료 45g 먹고 산책 20분 했어요.");
  assert.equal(structured.suggestedCategory, "meal");
  assert.deepEqual(structured.measurements, []);
  assert.equal(structured.needsConfirmation, false);
})();
