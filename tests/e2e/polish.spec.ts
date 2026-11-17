import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/login";

test("/login?error=1 에 오류 안내가 보이고 평소에는 없다", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Google로 계속하기" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.goto("/login?error=1");
  await expect(page.getByRole("alert")).toContainText("로그인하지 못했어요");
});

test("설정: 네트워크 오류면 탈퇴 실패 안내를 보인다", async ({ page }) => {
  await loginAs(page, "polish@test.local");
  await page.route("**/api/account", (r) => r.abort());
  await page.goto("/settings");
  await page.getByLabel("탈퇴 확인").fill("탈퇴");
  await page.getByRole("button", { name: "탈퇴", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("탈퇴하지 못했어요");
});
