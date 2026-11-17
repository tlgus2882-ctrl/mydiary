// Review fix round 1 for Task 6.
import { expect, test } from "@playwright/test";
import { FIRST_QUESTION } from "@/lib/conversation/rules";
import { admin, fakeQuestion, freshUser, localDate, messages, sendButton, textbox } from "./helpers/chat";

const HOUR = 3_600_000;
const dayBefore = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12);

test("fix 1: 다음 날이 되면 / 는 어제 날짜로 가지 않고 새 날의 /chat 으로 간다", async ({ page }) => {
  const id = await freshUser(page, "fix-tzdate@test.local");
  const start = new Date();
  const d = localDate(start);
  await admin().from("diaries").insert({ user_id: id, entry_date: d, status: "drafted" });
  await page.clock.install({ time: start });
  await page.goto("/");
  await expect(page).toHaveURL(new RegExp(`/diary/${d}$`));

  const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 0, 5);
  await page.clock.setSystemTime(next);
  await page.goto("/");
  await expect(page).toHaveURL(/\/chat$/);
});

test("fix 2: 첫 질문 없이 만들어진 일기도 seq 0 첫 질문이 채워지고 후속 질문 수가 맞다", async ({ page }) => {
  const id = await freshUser(page, "fix-seq0@test.local");
  const date = localDate();
  const { error } = await admin().from("diaries").insert({ user_id: id, entry_date: date });
  expect(error).toBeNull();

  const res = await page.request.post("/api/chat", {
    data: { date, answer: "첫 답", clientTurnId: crypto.randomUUID() },
  });
  expect(res.status()).toBe(200);
  expect(res.headers()["x-follow-ups"]).toBe("1");
  expect(await res.text()).toBe(fakeQuestion(1));
  const msgs = await messages(id);
  expect(msgs.map((m) => [m.seq, m.role])).toEqual([
    [0, "assistant"],
    [1, "user"],
    [2, "assistant"],
  ]);
  expect(msgs[0].content).toBe(FIRST_QUESTION);
});

test("fix 3: 어제 날짜 in_progress 일기가 6시간 넘게 멈춰 있으면 오늘 일기를 새로 시작한다", async ({ page }) => {
  const id = await freshUser(page, "fix-stale@test.local");
  const today = localDate();
  const yesterday = localDate(dayBefore(new Date()));
  const { data: old, error } = await admin()
    .from("diaries")
    .insert({ user_id: id, entry_date: yesterday, updated_at: new Date(Date.now() - 8 * HOUR).toISOString() })
    .select("id")
    .single();
  expect(error).toBeNull();

  const res = await page.request.post("/api/chat", {
    data: { date: today, answer: "오늘 답", clientTurnId: crypto.randomUUID() },
  });
  expect(res.status()).toBe(200);
  expect(res.headers()["x-diary-date"]).toBe(today);
  const { data: diaries } = await admin().from("diaries").select("id, entry_date").eq("user_id", id);
  const todays = diaries!.find((x) => x.entry_date === today)!;
  expect(todays).toBeTruthy();
  const msgs = await messages(id);
  expect(msgs.every((m) => m.diary_id === todays.id)).toBe(true);
  expect(msgs.some((m) => m.diary_id === old!.id)).toBe(false);
});

test("fix 3: 날짜 검사를 통과하지 못하는 날짜의 in_progress 일기는 이어 쓰지 않는다 (400)", async ({ page }) => {
  const id = await freshUser(page, "fix-olddate@test.local");
  await admin().from("diaries").insert({ user_id: id, entry_date: "2020-01-01" });
  const res = await page.request.post("/api/chat", {
    data: { date: "2020-01-01", answer: "옛날 답", clientTurnId: crypto.randomUUID() },
  });
  expect(res.status()).toBe(400);
  expect(await messages(id)).toHaveLength(0);
});

test("fix 4: 대화 중 그날 일기가 이미 초안이 되었으면 전송 시 /diary/<date>로 간다", async ({ page }) => {
  const id = await freshUser(page, "fix-409@test.local");
  const date = localDate();
  await page.goto("/chat");
  await expect(textbox(page)).toBeEnabled();
  await admin().from("diaries").insert({ user_id: id, entry_date: date, status: "drafted" });
  await textbox(page).fill("답");
  await sendButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/diary/${date}$`));
  await expect(page.getByRole("button", { name: "다시 시도" })).toHaveCount(0);
});
