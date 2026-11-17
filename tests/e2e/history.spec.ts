import { expect, test } from "@playwright/test";
import { admin, freshUser } from "./helpers/chat";

async function seed(userId: string, entry_date: string, title: string, body: string) {
  const db = admin();
  const { data, error } = await db
    .from("diaries")
    .insert({ user_id: userId, entry_date, title, body, status: "saved" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function seedMessages(userId: string, diaryId: string) {
  const rows = [
    { role: "assistant", content: "오늘 어떤 하루였어요?", seq: 1 },
    { role: "user", content: "산책을 오래 했어요", seq: 2 },
  ].map((r) => ({ ...r, diary_id: diaryId, user_id: userId }));
  const { error } = await admin().from("diary_messages").insert(rows);
  if (error) throw error;
}

test("R11: 지난 일기가 최신순으로 보이고, 열어 수정할 수 있고, 대화 기록은 접힌 읽기 전용", async ({ page }) => {
  const id = await freshUser(page, "history-r11@test.local");
  const older = await seed(id, "2026-01-05", "옛 제목", "옛 본문");
  await seed(id, "2026-01-10", "새 제목", "새 본문");
  await seedMessages(id, older);

  await page.goto("/diaries");
  const items = page.getByRole("listitem");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("2026-01-10");
  await expect(items.nth(0)).toContainText("새 제목");
  await expect(items.nth(1)).toContainText("2026-01-05");

  await items.nth(1).getByRole("link").click();
  await expect(page).toHaveURL(/\/diary\/2026-01-05$/);
  await expect(page.getByLabel("제목")).toHaveValue("옛 제목");

  const log = page.locator("details", { hasText: "대화 기록" });
  await expect(log).not.toHaveAttribute("open", "");
  await expect(page.getByText("산책을 오래 했어요")).toBeHidden();
  await log.getByText("대화 기록").click();
  await expect(page.getByText("산책을 오래 했어요")).toBeVisible();
  await expect(log.getByRole("textbox")).toHaveCount(0);

  await page.getByLabel("본문").fill("옛 본문 수정");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장했어요")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("본문")).toHaveValue("옛 본문 수정");
});

test("R7: 다른 사용자는 남의 일기 주소로 들어가도 내용을 볼 수 없다", async ({ page }) => {
  const a = await freshUser(page, "history-a@test.local");
  await seed(a, "2026-02-01", "A의 비밀 제목", "A의 비밀 본문");
  await freshUser(page, "history-b@test.local");

  const res = await page.goto("/diary/2026-02-01");
  expect(res?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText("A의 비밀");
  await expect(page.getByLabel("제목")).toHaveCount(0);
});

test("R12: 탈퇴 확인 문구 없이는 버튼이 꺼져 있고, 탈퇴하면 /login으로 가고 모든 데이터가 사라진다", async ({ page }) => {
  const id = await freshUser(page, "history-r12@test.local");
  const diary = await seed(id, "2026-03-01", "지울 일기", "지울 본문");
  await seedMessages(id, diary);
  const db = admin();
  await db.from("profiles").upsert({ user_id: id, last_theme_id: "x" });

  await page.goto("/settings");
  const button = page.getByRole("button", { name: "탈퇴" });
  await expect(button).toBeDisabled();
  await page.getByRole("textbox").fill("탈");
  await expect(button).toBeDisabled();
  await page.getByRole("textbox").fill("탈퇴");
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page).toHaveURL(/\/login$/);

  for (const table of ["diaries", "diary_messages", "profiles"]) {
    const { data, error } = await db.from(table).select("*").eq("user_id", id);
    expect(error).toBeNull();
    expect(data, table).toHaveLength(0);
  }
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  expect(users?.users.some((u) => u.id === id)).toBe(false);
});

test("R12: /api/account는 세션이 없으면 401, 확인 문구가 다르면 400", async ({ page, request }) => {
  const del = (confirm: string) => request.delete("/api/account", { data: { confirm } });
  expect((await del("탈퇴")).status()).toBe(401);
  await freshUser(page, "history-api@test.local");
  const res = await page.request.delete("/api/account", { data: { confirm: "no" } });
  expect(res.status()).toBe(400);
  expect((await page.request.delete("/api/account", { data: {} })).status()).toBe(400);
});
