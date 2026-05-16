import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

test("AI 미리보기 로딩 테두리는 카드 레이아웃을 유지하며 얇은 테두리 애니메이션을 사용한다", () => {
  const loadingBorderRule = css.match(/\.pet-log-loading-border\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const loadingBeforeRule = css.match(/\.pet-log-loading-border::before\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const loadingAfterRule = css.match(/\.pet-log-loading-border::after\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.ok(loadingBorderRule.includes("isolation: isolate"));
  assert.ok(loadingBorderRule.includes("padding-box"));
  assert.ok(loadingBorderRule.includes("border-box"));
  assert.ok(!loadingBorderRule.includes("padding: 20px"));
  assert.ok(!loadingBorderRule.includes("margin: -4px"));
  assert.ok(loadingBorderRule.includes("pet-log-border-glide"));
  assert.ok(loadingBeforeRule.includes("radial-gradient"));
  assert.ok(loadingBeforeRule.includes("pet-log-border-sheen"));
  assert.ok(loadingAfterRule.includes("pet-log-border-breathe"));
  assert.ok(css.includes("@property --pet-log-border-angle"));
  assert.ok(css.includes("@keyframes pet-log-border-glide"));
  assert.ok(css.includes("@keyframes pet-log-border-breathe"));
});

test("기록 텍스트 정리 버튼 테두리는 버튼 배경을 유지하며 로딩 테두리 애니메이션을 재사용한다", () => {
  const correctionBorderRule = css.match(/\.pet-log-text-cleaning-button-border\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.ok(correctionBorderRule.includes("linear-gradient(#fff, #fff) padding-box"));
  assert.ok(correctionBorderRule.includes("conic-gradient"));
  assert.ok(correctionBorderRule.includes("var(--pet-log-border-angle)"));
  assert.ok(correctionBorderRule.includes("border-box !important"));
});
