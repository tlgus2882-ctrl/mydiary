import { expect, test } from "@playwright/test";
import { admin, freshUser, localDate } from "./helpers/chat";

async function seed(userId: string, title: string, body: string) {
  const db = admin();
  const date = localDate();
  const { data, error } = await db
    .from("diaries")
    .insert({ user_id: userId, entry_date: date, status: "saved", title, body })
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
  return { id: data.id as string, date };
}

test("빈 채로 저장된 일기도 [초안 만들기]로 다시 만들 수 있다", async ({ page }) => {
  const userId = await freshUser(page, "redraft-saved@test.local");
  const { date } = await seed(userId, "", "");
  await page.goto(`/diary/${date}`);
  const make = page.getByRole("button", { name: "초안 만들기" });
  await make.click();
  await expect(page.getByLabel("제목")).toHaveValue("가짜 제목");
  await expect(page.getByLabel("본문")).toHaveValue("가짜 본문");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장했어요")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("제목")).toHaveValue("가짜 제목");
  await expect(page.getByLabel("본문")).toHaveValue("가짜 본문");
});

test("/api/draft: 본문이 있는 saved 일기는 409, 내용은 그대로", async ({ page }) => {
  const userId = await freshUser(page, "redraft-saved-body@test.local");
  const { id, date } = await seed(userId, "", "내 본문");
  const res = await page.request.post("/api/draft", { data: { date } });
  expect(res.status()).toBe(409);
  const { data } = await admin().from("diaries").select("status, title, body").eq("id", id).single();
  expect(data).toEqual({ status: "saved", title: "", body: "내 본문" });
});
