import { expect, test } from "@playwright/test";
import { collectClientErrors, expectNoClientErrors } from "../support/client-errors";
import { installMockPetLogApi } from "../support/mock-api";

const routes = [
  { path: "/", text: "꾸꾸의 오늘" },
  { path: "/record", text: "기록 입력" },
  { path: "/timeline", text: "기록 타임라인" },
  { path: "/analysis", text: "분석 리포트" },
  { path: "/profile", text: "프로필" },
  { path: "/schedule", text: "일정" },
  { path: "/notifications", text: "알림" },
];

test.describe("app smoke", () => {
  for (const route of routes) {
    test(`${route.path} renders without client errors`, async ({ page }) => {
      const errors = collectClientErrors(page);
      await installMockPetLogApi(page);

      await page.goto(route.path);

      await expect(page.locator("body")).toContainText(route.text);
      expectNoClientErrors(errors);
    });
  }
});
