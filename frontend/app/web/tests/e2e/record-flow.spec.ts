import { expect, test } from "@playwright/test";
import { collectClientErrors, expectNoClientErrors } from "../support/client-errors";
import { installMockPetLogApi } from "../support/mock-api";

test("guardian can create a text record and see it on the timeline", async ({ page }) => {
  const errors = collectClientErrors(page);
  await installMockPetLogApi(page);
  const detail = "오늘 꾸꾸가 산책 20분 하고 사료 50g을 먹었어요.";
  const saveButton = page.getByRole("button", { name: "기록 저장하기" });

  await page.goto("/record");
  await expect(page.getByText("아침 사료 40g을 잘 먹었어요.")).toBeVisible();
  await expect(page.locator("textarea")).toBeVisible();
  await page.getByRole("button", { name: "텍스트 바로 입력" }).click();
  await expect(page.getByRole("button", { name: "텍스트 바로 입력" })).toHaveAttribute("aria-pressed", "true");
  await page.locator("textarea").fill(detail);
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  await expect(page.getByText("기록이 저장되었습니다.")).toBeVisible();
  await page.getByRole("link", { name: "타임라인 보기" }).click();

  await expect(page).toHaveURL(/\/timeline$/);
  await expect(page.getByText(detail)).toBeVisible();
  expectNoClientErrors(errors);
});
