// Runs only in the "quota" project (server started with QUOTA_PER_USER=3).
import { expect, test } from "@playwright/test";
import { answer, finishButton, freshUser, localDate, messages, sendButton, textbox, usage } from "./helpers/chat";

test("R13: 사용자 상한에 닿으면 안내가 보이고 [이제 일기 쓰기]는 여전히 동작한다", async ({ page }) => {
  const id = await freshUser(page, "chat-quota@test.local");
  await page.goto("/chat");
  await answer(page, "답 1", 1);
  await answer(page, "답 2", 2); // QUOTA_PER_USER=3 leaves one call for the draft: 2 questions max

  await textbox(page).fill("답 3");
  await sendButton(page).click();
  await expect(page.getByText(/오늘 나눌 수 있는 대화를 모두 썼어요/)).toBeVisible();
  await expect(page.getByText("답 3", { exact: true })).toBeVisible();
  expect(await usage(id)).toBe(2);
  expect((await messages(id)).filter((m) => m.role === "user")).toHaveLength(3);

  await expect(finishButton(page)).toBeEnabled();
  await finishButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/diary/${localDate()}$`));
});
