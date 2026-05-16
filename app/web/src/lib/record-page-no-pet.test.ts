import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const recordPageSource = readFileSync(new URL("../app/record/page.tsx", import.meta.url), "utf8");
const globalCssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("기록 화면은 등록된 pet이 없으면 AI 미리보기와 저장 API를 호출하지 않는다", () => {
  assert.ok(recordPageSource.includes("const hasActivePet = !!profile.id"));
  assert.ok(recordPageSource.includes("if (!hasActivePet)"));
  assert.ok(recordPageSource.includes("반려동물을 먼저 등록해주세요."));
  assert.ok(recordPageSource.includes("disabled={isSaving || !hasActivePet}"));
});

test("기록 저장 대기 중에는 저장 버튼 disabled 색상과 테두리 애니메이션을 표시한다", () => {
  assert.ok(recordPageSource.includes('isSaving ? "pet-log-loading-border pet-log-record-save-button-border" : ""'));
  assert.ok(recordPageSource.includes("disabled:text-white"));
  assert.ok(recordPageSource.includes('className="relative z-10 inline-flex items-center justify-center text-white"'));
  assert.ok(recordPageSource.includes('{isSaving ? "저장 중" : "기록 저장하기"}'));
  assert.ok(globalCssSource.includes(".pet-log-loading-border.pet-log-record-save-button-border"));
  assert.ok(globalCssSource.includes("color: #fff !important"));
  assert.ok(globalCssSource.includes("border: 1px solid transparent !important"));
  assert.ok(globalCssSource.includes("linear-gradient(#8ab99f, #8ab99f) padding-box"));
  assert.ok(globalCssSource.includes("pet-log-border-glide 1.25s linear infinite"));
  assert.ok(globalCssSource.includes("0 0 0 1px rgba(18, 92, 57, 0.14)"));
  assert.ok(globalCssSource.includes(".pet-log-loading-border.pet-log-record-save-button-border::after"));
  assert.ok(globalCssSource.includes("pet-log-record-save-border-pulse 1.2s ease-in-out infinite"));
});
