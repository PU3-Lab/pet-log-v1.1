import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const shoppingPage = readFileSync(resolve(process.cwd(), "src/app/shopping/page.tsx"), "utf8");

test("쇼핑 추천 로딩은 상단 카드 테두리와 글자 웨이브 애니메이션을 사용한다", () => {
  const syncWaveRule = css.match(/\.pet-log-sync-wave > span\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const syncKeyframes = css.match(/@keyframes pet-log-sync-letter\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.ok(shoppingPage.includes("pet-log-loading-border"));
  assert.ok(shoppingPage.includes("pet-log-shopping-loading-border"));
  assert.ok(shoppingPage.includes("ShoppingSyncText"));
  assert.ok(shoppingPage.includes("상품 추천 동기화 중"));
  assert.ok(shoppingPage.includes("index * 120"));
  assert.ok(syncWaveRule.includes("display: inline-block"));
  assert.ok(syncWaveRule.includes("pet-log-sync-letter 2.7s"));
  assert.ok(syncKeyframes.includes("scale(1.28)"));
  assert.ok(syncKeyframes.includes("scale(0.94)"));
});
