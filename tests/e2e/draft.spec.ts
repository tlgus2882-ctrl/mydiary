import { expect, test, type Page } from "@playwright/test";
import { answer, finishButton, freshUser, localDate } from "./helpers/chat";

const title = (p: Page) => p.getByLabel("제목");
const body = (p: Page) => p.getByLabel("본문");
const save = (p: Page) => p.getByRole("button", { name: "저장" });

async function toEditor(page: Page, email: string) {
  await freshUser(page, email);
  await page.goto("/chat");
  for (let n = 1; n <= 3; n++) await answer(page, `답 ${n}`, n);
  await finishButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/diary/${localDate()}$`));
}

test("R5: 초안이 칸에 들어오고, 수정해 저장하면 새로고침해도 유지, 저장 뒤엔 새 대화 불가 (R6)", async ({ page }) => {
  await toEditor(page, "draft-r5@test.local");
  await expect(title(page)).toHaveValue("가짜 제목");
  await expect(body(page)).toHaveValue("가짜 본문");

  await body(page).fill("가짜 본문, 내가 고침");
  await save(page).click();
  await expect(page.getByText("저장했어요")).toBeVisible();

  await page.reload();
  await expect(title(page)).toHaveValue("가짜 제목");
  await expect(body(page)).toHaveValue("가짜 본문, 내가 고침");

  await page.goto("/");
  await expect(page).toHaveURL(new RegExp(`/diary/${localDate()}$`));
  await page.goto("/chat");
  await expect(page).toHaveURL(new RegExp(`/diary/${localDate()}$`));
});

test("R14: /api/draft가 500이면 빈 칸과 [다시 시도], 직접 써서 저장 가능", async ({ page }) => {
  await page.route("**/api/draft", (route) => route.fulfill({ status: 500, body: "boom" }));
  await toEditor(page, "draft-r14@test.local");
  await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  await expect(title(page)).toHaveValue("");
  await expect(body(page)).toHaveValue("");

  await title(page).fill("내 제목");
  await body(page).fill("내가 쓴 본문");
  await save(page).click();
  await expect(page.getByText("저장했어요")).toBeVisible();
  await page.reload();
  await expect(title(page)).toHaveValue("내 제목");
  await expect(body(page)).toHaveValue("내가 쓴 본문");
});

test("R14: [다시 시도]가 초안을 다시 만든다", async ({ page }) => {
  let fail = true;
  await page.route("**/api/draft", (route) => (fail ? route.fulfill({ status: 500, body: "boom" }) : route.fallback()));
  await toEditor(page, "draft-retry@test.local");
  await expect(title(page)).toHaveValue("");
  fail = false;
  await page.getByRole("button", { name: "다시 시도" }).click();
  await expect(title(page)).toHaveValue("가짜 제목");
  await expect(body(page)).toHaveValue("가짜 본문");
});
