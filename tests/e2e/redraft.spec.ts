import { expect, test } from "@playwright/test";
import { admin, freshUser, localDate } from "./helpers/chat";

test("실패해 빈 채로 남은 초안 일기는 다시 열어도 [초안 만들기]로 만들 수 있다", async ({ page }) => {
  const userId = await freshUser(page, "redraft@test.local");
  const db = admin();
  const date = localDate();
  const { data, error } = await db
    .from("diaries")
    .insert({ user_id: userId, entry_date: date, status: "drafted", title: "", body: "" })
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

  await page.goto(`/diary/${date}`);
  const make = page.getByRole("button", { name: "초안 만들기" });
  await expect(make).toBeVisible();
  await make.click();
  await expect(page.getByLabel("제목")).toHaveValue("가짜 제목");
  await expect(page.getByLabel("본문")).toHaveValue("가짜 본문");
  await expect(make).toHaveCount(0);

  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장했어요")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("제목")).toHaveValue("가짜 제목");
  await expect(page.getByLabel("본문")).toHaveValue("가짜 본문");
  await expect(make).toHaveCount(0);
});
