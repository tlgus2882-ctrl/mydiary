import { expect, test } from "@playwright/test";
import { admin, answer, filledDots, finishButton, freshUser, localDate } from "./helpers/chat";

const HINT = "질문 3개에 답하면 일기를 쓸 수 있어요";
const WELCOME = "다시 와 주셨네요. 오늘 하루만 편하게 적어 보아요.";
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDate(d);
};
async function seed(userId: string, entry_date: string, body: string, status = "saved") {
  const { error } = await admin().from("diaries").insert({ user_id: userId, entry_date, title: "t", body, status });
  if (error) throw error;
}

test("#36: 힌트는 후속 질문 3개 전에 보이고 이후 사라지며, n/6 텍스트가 있다", async ({ page }) => {
  await freshUser(page, "guide-hint@test.local");
  await page.goto("/chat");
  await expect(page.getByText(HINT)).toBeVisible();
  await expect(page.getByText("0/6", { exact: true })).toBeVisible();
  await expect(finishButton(page)).toBeDisabled();
  await answer(page, "하나", 1);
  await expect(page.getByText("1/6", { exact: true })).toBeVisible();
  await answer(page, "둘", 2);
  await answer(page, "셋", 3);
  await expect(filledDots(page)).toHaveCount(3);
  await expect(finishButton(page)).toBeEnabled();
  await expect(page.getByText(HINT)).toHaveCount(0);
});

test("#37: 마지막 일기가 3일 전이면 환영 문구, 어제면 없다", async ({ page }) => {
  const id = await freshUser(page, "guide-welcome@test.local");
  await seed(id, daysAgo(3), "예전 본문");
  await page.goto("/chat");
  await expect(page.getByText(WELCOME)).toBeVisible();

  await admin().from("diaries").delete().eq("user_id", id);
  await seed(id, daysAgo(1), "어제 본문");
  await page.goto("/chat");
  await expect(page.getByRole("textbox", { name: "답변" })).toBeVisible();
  await expect(page.getByText(WELCOME)).toHaveCount(0);
});

test("#39: 일기 목록에 본문 미리보기(40자 + …)가 보이고, 빈 본문이면 없다", async ({ page }) => {
  const id = await freshUser(page, "guide-preview@test.local");
  await seed(id, "2026-04-01", "가".repeat(60));
  await seed(id, "2026-04-02", "");
  await page.goto("/diaries");
  const items = page.getByRole("listitem");
  await expect(items.nth(1)).toContainText("가".repeat(40) + "…");
  await expect(items.nth(1)).not.toContainText("가".repeat(41));
  await expect(items.nth(0).locator("[data-preview]")).toHaveCount(0);
  await expect(items.nth(1).locator("[data-chip]")).toHaveCount(1);
});
