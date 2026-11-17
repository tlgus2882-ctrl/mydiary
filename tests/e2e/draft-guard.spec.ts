import { expect, test } from "@playwright/test";
import { admin, freshUser, localDate } from "./helpers/chat";

// Seed a diary with `followUps` follow-up questions answered (assistant seq 0 = first question).
async function seed(userId: string, status: string, followUps: number, title = "", body = "") {
  const db = admin();
  const date = localDate();
  const { data, error } = await db
    .from("diaries")
    .insert({ user_id: userId, entry_date: date, status, title, body })
    .select("id")
    .single();
  if (error) throw error;
  const rows = [{ diary_id: data.id, user_id: userId, role: "assistant", content: "첫 질문", seq: 0 }];
  for (let n = 1; n <= followUps; n++) {
    rows.push({ diary_id: data.id, user_id: userId, role: "user", content: `답 ${n}`, seq: 2 * n - 1 });
    rows.push({ diary_id: data.id, user_id: userId, role: "assistant", content: `질문 ${n}`, seq: 2 * n });
  }
  const ins = await db.from("diary_messages").insert(rows);
  if (ins.error) throw ins.error;
  return { id: data.id as string, date };
}

const row = async (id: string) => (await admin().from("diaries").select("status, title, body").eq("id", id).single()).data;

test("/api/draft: 로그인 없으면 401", async ({ request }) => {
  const res = await request.post("/api/draft", { data: { date: localDate() } });
  expect(res.status()).toBe(401);
});

test("/api/draft: 이미 저장된 일기는 409, 내용은 그대로", async ({ page }) => {
  const uid = await freshUser(page, "guard-saved@test.local");
  const { id, date } = await seed(uid, "saved", 3, "내 제목", "내 본문");
  const res = await page.request.post("/api/draft", { data: { date } });
  expect(res.status()).toBe(409);
  expect(await row(id)).toEqual({ status: "saved", title: "내 제목", body: "내 본문" });
});

test("/api/draft: 후속 질문 2개뿐이면 400, 일기는 in_progress 그대로", async ({ page }) => {
  const uid = await freshUser(page, "guard-early@test.local");
  const { id, date } = await seed(uid, "in_progress", 2);
  const res = await page.request.post("/api/draft", { data: { date } });
  expect(res.status()).toBe(400);
  expect((await row(id))?.status).toBe("in_progress");
});

test("/api/draft: 초안이 비어 있지 않은 drafted 일기는 다시 만들지 않는다 (409)", async ({ page }) => {
  const uid = await freshUser(page, "guard-drafted@test.local");
  const { id, date } = await seed(uid, "drafted", 3, "t", "");
  const res = await page.request.post("/api/draft", { data: { date } });
  expect(res.status()).toBe(409);
  expect(await row(id)).toEqual({ status: "drafted", title: "t", body: "" });
});

test("/api/draft: 비어 있는 drafted 일기는 다시 시도 가능", async ({ page }) => {
  const uid = await freshUser(page, "guard-retry@test.local");
  const { id, date } = await seed(uid, "drafted", 3);
  const res = await page.request.post("/api/draft", { data: { date } });
  expect(res.status()).toBe(200);
  expect(await res.text()).toBe("가짜 제목\n가짜 본문");
  expect(await row(id)).toEqual({ status: "drafted", title: "가짜 제목", body: "가짜 본문" });
});
