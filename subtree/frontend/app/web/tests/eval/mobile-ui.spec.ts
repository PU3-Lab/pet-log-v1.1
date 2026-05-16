import { expect, test } from "@playwright/test";
import { collectClientErrors, expectNoClientErrors } from "../support/client-errors";
import { installMockPetLogApi } from "../support/mock-api";

const viewports = [
  { name: "small-mobile", width: 375, height: 812 },
  { name: "large-mobile", width: 430, height: 932 },
];

const routes = [
  { path: "/", text: "꾸꾸의 오늘" },
  { path: "/record", text: "기록 입력" },
  { path: "/timeline", text: "기록 타임라인" },
  { path: "/analysis", text: "분석 리포트" },
  { path: "/profile", text: "프로필" },
  { path: "/schedule", text: "일정" },
  { path: "/notifications", text: "알림" },
];

test.describe("mobile UI eval", () => {
  for (const viewport of viewports) {
    for (const route of routes) {
      test(`${viewport.name} ${route.path} has no horizontal overflow or client errors`, async ({ page }) => {
        const errors = collectClientErrors(page);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await installMockPetLogApi(page);

        await page.goto(route.path);

        await expect(page.locator("body")).toContainText(route.text);
        const overflow = await page.evaluate(() => {
          const root = document.documentElement;
          return Math.ceil(root.scrollWidth) - Math.ceil(root.clientWidth);
        });
        expect(overflow).toBeLessThanOrEqual(1);
        expectNoClientErrors(errors);
      });
    }
  }
});
