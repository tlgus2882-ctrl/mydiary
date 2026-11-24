import { expect, test } from "@playwright/test";
import { admin, freshUser, localDate } from "./helpers/chat";

async function seed(userId: string) {
  const db = admin();
  const date = localDate();
  const { data, error } = await db
    .from("diaries")
    .insert({ user_id: userId, entry_date: date, status: "saved", title: "옛 제목", body: "옛 본문" })
    .select("id")
    .single();
  if (error) throw error;
  const rows = [{ diary_id: data.id, user_id: userId, role: "assistant", content: "첫 질문", seq: 0 }];
  for (let n = 1; n <= 3; n++) {
    rows.push({ diary_id: data.id, user_id: userId, role: "user", content: `답 ${n}`, seq: 2 * n - 1 });
    rows.push({ diary_id: data.id, user_id: userId, role: "assistant", content: `질문 ${n}`, seq: 2 * n });
  }
  const ins = await db.from("diary_messages").insert(rows);
  if (ins.error) throw ins.error;
  return date;
}

test("내용이 있는 일기도 [초안 다시 만들기]로 확인 후 새 초안이 된다", async ({ page }) => {
  const userId = await freshUser(page, "redraft-overwrite@test.local");
  const date = await seed(userId);
  await page.goto(`/diary/${date}`);
  await expect(page.getByRole("button", { name: "초안 만들기", exact: true })).toHaveCount(0);
  page.once("dialog", async (d) => {
    expect(d.message()).toBe("지금 쓴 내용이 새 초안으로 바뀝니다. 계속할까요?");
    await d.accept();
  });
  await page.getByRole("button", { name: "초안 다시 만들기" }).click();
  await expect(page.getByLabel("제목")).toHaveValue("가짜 제목");
  await expect(page.getByLabel("본문")).toHaveValue("가짜 본문");
});

test("확인을 취소하면 내용이 그대로다", async ({ page }) => {
  const userId = await freshUser(page, "redraft-overwrite-cancel@test.local");
  const date = await seed(userId);
  await page.goto(`/diary/${date}`);
  page.once("dialog", (d) => void d.dismiss());
  await page.getByRole("button", { name: "초안 다시 만들기" }).click();
  await expect(page.getByLabel("제목")).toHaveValue("옛 제목");
});

test("좁은 화면에서는 꾸미기가 접혀 있고, 글씨 크기가 저장된다", async ({ page }) => {
  const userId = await freshUser(page, "ui-mobile@test.local");
  const date = await seed(userId);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/diary/${date}`);
  const toggle = page.getByRole("button", { name: "꾸미기" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("radiogroup", { name: "테마" })).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const body = page.getByLabel("본문");
  const before = await body.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  await page.getByRole("radio", { name: "크게" }).check();
  expect(await body.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThan(before);
  await page.reload();
  await page.getByRole("button", { name: "꾸미기" }).click();
  await expect(page.getByRole("radio", { name: "크게" })).toBeChecked();
});

test("[대화 기록 보기] 링크가 대화 기록을 연다", async ({ page }) => {
  const userId = await freshUser(page, "ui-log-link@test.local");
  const date = await seed(userId);
  await page.goto(`/diary/${date}`);
  await page.getByRole("link", { name: "대화 기록 보기" }).click();
  await expect(page.getByText("답 1")).toBeVisible();
});
