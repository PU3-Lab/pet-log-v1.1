import { expect, test } from "@playwright/test";
import { installMockPetLogApi } from "../support/mock-api";

const routes = [
  { name: "home", path: "/", text: "꾸꾸의 오늘" },
  { name: "record", path: "/record", text: "기록 입력" },
  { name: "timeline", path: "/timeline", text: "기록 타임라인" },
  { name: "analysis", path: "/analysis", text: "분석 리포트" },
];

test.describe("visual artifact eval", () => {
  for (const route of routes) {
    test(`${route.name} mobile screenshot`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await installMockPetLogApi(page);

      await page.goto(route.path);
      await expect(page.locator("body")).toContainText(route.text);
      await page.screenshot({ path: testInfo.outputPath(`${route.name}-mobile.png`), fullPage: true });
    });
  }
});
