import { expect, test } from "@playwright/test";
import {
  admin,
  answer,
  fakeQuestion,
  filledDots,
  finishButton,
  freshUser,
  localDate,
  messages,
  sendButton,
  textbox,
  usage,
} from "./helpers/chat";

test("R1: 첫 질문은 고정 문구, 선택지 버튼 없이 textarea 입력", async ({ page }) => {
  await freshUser(page, "chat-r1@test.local");
  await page.goto("/chat");
  await expect(page.getByText("오늘 하루는 어떠셨나요?", { exact: true })).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(1);
  await expect(page.getByRole("main").getByRole("button")).toHaveCount(2); // 보내기, 이제 일기 쓰기 뿐
  await expect(sendButton(page)).toBeVisible();
  await expect(finishButton(page)).toBeVisible();
});

test("/ 는 오늘 일기가 없으면 /chat 으로 간다", async ({ page }) => {
  await freshUser(page, "chat-home@test.local");
  await page.goto("/");
  await expect(page).toHaveURL(/\/chat$/);
});

test("R2·R4·진행 점: 3번째 후속 질문 뒤 [이제 일기 쓰기] 활성, 6번째 뒤엔 질문 없이 초안으로", async ({ page }) => {
  const id = await freshUser(page, "chat-r2@test.local");
  await page.goto("/chat");
  await expect(filledDots(page)).toHaveCount(0);
  await expect(page.locator("[data-dot]")).toHaveCount(6);

  await answer(page, "회사에서 회의가 길었어요", 1);
  await answer(page, "좀 지쳤어요", 2);
  await expect(finishButton(page)).toBeDisabled();
  await answer(page, "저녁엔 산책했어요", 3);
  await expect(finishButton(page)).toBeEnabled();
  await answer(page, "답 4", 4);
  await answer(page, "답 5", 5);
  await answer(page, "답 6", 6);

  await textbox(page).fill("답 7");
  await sendButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/diary/${localDate()}$`));

  const msgs = await messages(id);
  expect(msgs.filter((m) => m.role === "assistant")).toHaveLength(7); // 첫 질문 + 후속 6
  expect(msgs.filter((m) => m.role === "user")).toHaveLength(7);
  expect(msgs.some((m) => m.content === fakeQuestion(7))).toBe(false);
});

test("[이제 일기 쓰기]를 누르면 /diary/<date>로 간다", async ({ page }) => {
  await freshUser(page, "chat-finish@test.local");
  await page.goto("/chat");
  for (let n = 1; n <= 3; n++) await answer(page, `답 ${n}`, n);
  await finishButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/diary/${localDate()}$`));
});

test("RF3: 공백만이면 전송 비활성, 2001자면 안내 + 전송 불가, 서버도 400", async ({ page }) => {
  await freshUser(page, "chat-rf3@test.local");
  await page.goto("/chat");
  await textbox(page).fill("   \n  ");
  await expect(sendButton(page)).toBeDisabled();
  await textbox(page).fill("가".repeat(2001));
  await expect(sendButton(page)).toBeDisabled();
  await expect(page.getByText(/2000자/)).toBeVisible();
  await textbox(page).fill("가".repeat(2000));
  await expect(sendButton(page)).toBeEnabled();

  const post = (answer: string) =>
    page.request.post("/api/chat", { data: { date: localDate(), answer, clientTurnId: crypto.randomUUID() } });
  expect((await post("   ")).status()).toBe(400);
  expect((await post("가".repeat(2001))).status()).toBe(400);
  const badDate = await page.request.post("/api/chat", {
    data: { date: "2000-01-01", answer: "안녕", clientTurnId: crypto.randomUUID() },
  });
  expect(badDate.status()).toBe(400);
});

test("미로그인 /api/chat 은 401", async ({ playwright, baseURL }) => {
  const ctx = await playwright.request.newContext({ baseURL });
  const res = await ctx.post("/api/chat", { data: { date: localDate(), answer: "안녕", clientTurnId: "x" } });
  expect(res.status()).toBe(401);
  await ctx.dispose();
});

test("RF1: 한글 조합 중 Enter는 전송하지 않고, 조합이 끝난 뒤 Enter는 전송한다", async ({ page }) => {
  await freshUser(page, "chat-rf1@test.local");
  await page.goto("/chat");
  let posts = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/chat")) posts++;
  });
  const box = textbox(page);
  await box.fill("안녕");
  await box.press("Shift+Enter");
  await expect(box).toHaveValue("안녕\n");
  await box.fill("안녕");
  await box.evaluate((el) => {
    el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(500);
  expect(posts).toBe(0);
  await expect(box).toHaveValue("안녕");

  await box.evaluate((el) => el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "녕" })));
  await box.press("Enter");
  await expect(page.getByText(fakeQuestion(1), { exact: true })).toBeVisible();
  expect(posts).toBe(1);
  await expect(page.getByText("안녕", { exact: true })).toHaveCount(1);
});

test("RF2: 전송 버튼 연타해도 사용자 메시지는 화면·DB에 1개, 같은 clientTurnId 재전송은 상한도 한 번만", async ({ page }) => {
  const id = await freshUser(page, "chat-rf2@test.local");
  await page.goto("/chat");
  await textbox(page).fill("연타 테스트");
  await sendButton(page).dblclick();
  await expect(page.getByText(fakeQuestion(1), { exact: true })).toBeVisible();
  await expect(page.getByText("연타 테스트", { exact: true })).toHaveCount(1);
  expect((await messages(id)).filter((m) => m.role === "user")).toHaveLength(1);
  expect(await usage(id)).toBe(1);

  // Same turn sent twice (e.g. a retry after the response was lost): stored once, quota once, same question back.
  const body = { date: localDate(), answer: "두 번 보냄", clientTurnId: "rf2-same-turn" };
  const r1 = await page.request.post("/api/chat", { data: body });
  const r2 = await page.request.post("/api/chat", { data: body });
  expect(r1.status()).toBe(200);
  expect(r2.status()).toBe(200);
  expect(await r2.text()).toBe(await r1.text());
  expect(r2.headers()["x-follow-ups"]).toBe("2");
  const users = (await messages(id)).filter((m) => m.role === "user");
  expect(users.map((m) => m.content)).toEqual(["연타 테스트", "두 번 보냄"]);
  expect(await usage(id)).toBe(2);
});

test("스펙 10.1: 페이지를 닫았다 다시 열면 같은 대화가 이어진다", async ({ page, context }) => {
  await freshUser(page, "chat-resume@test.local");
  await page.goto("/chat");
  await answer(page, "첫 답", 1);
  await answer(page, "둘째 답", 2);
  await page.close();

  const again = await context.newPage();
  await again.goto("/chat");
  await expect(again.getByText("첫 답", { exact: true })).toBeVisible();
  await expect(again.getByText(fakeQuestion(2), { exact: true })).toBeVisible();
  await expect(filledDots(again)).toHaveCount(2);
  await answer(again, "셋째 답", 3);
});

test("R14·RF5: 응답 도중 연결이 끊겨도 내 답은 남고 [다시 시도]로 다음 질문을 받는다", async ({ page }) => {
  const id = await freshUser(page, "chat-r14@test.local");
  await page.goto("/chat");
  await answer(page, "첫 답", 1);

  let cut = false;
  await page.route("**/api/chat", async (route) => {
    if (cut) return route.continue();
    cut = true;
    await route.fetch(); // the server handles it, but the response never reaches the page
    await route.abort("connectionreset");
  });
  await textbox(page).fill("끊긴 답");
  await sendButton(page).click();
  const retry = page.getByRole("button", { name: "다시 시도" });
  await expect(retry).toBeVisible();
  await expect(page.getByText("끊긴 답", { exact: true })).toBeVisible();
  await expect(page.getByText(fakeQuestion(2), { exact: true })).toHaveCount(0);

  await retry.click();
  await expect(page.getByText(fakeQuestion(2), { exact: true })).toBeVisible();
  await expect(retry).toHaveCount(0);
  await expect(page.getByText("끊긴 답", { exact: true })).toHaveCount(1);
  const msgs = await messages(id);
  expect(msgs.filter((m) => m.role === "user").map((m) => m.content)).toEqual(["첫 답", "끊긴 답"]);
  expect(msgs.filter((m) => m.role === "assistant")).toHaveLength(3);
  expect(await usage(id)).toBe(2); // retry replayed the stored question instead of calling Claude again
});

test("RF4: 대화 도중 자정이 지나도 같은 일기에 이어진다", async ({ page }) => {
  const id = await freshUser(page, "chat-rf4@test.local");
  const start = new Date();
  await page.clock.install({ time: start });
  await page.goto("/chat");
  await answer(page, "자정 전 답", 1);

  const nextDay = new Date(start);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 5, 0, 0);
  await page.clock.setSystemTime(nextDay);
  await answer(page, "자정 후 답", 2);

  const { data: diaries } = await admin().from("diaries").select("id, entry_date").eq("user_id", id);
  expect(diaries).toHaveLength(1);
  expect(diaries![0].entry_date).toBe(localDate(start));
  const msgs = await messages(id);
  expect(msgs.every((m) => m.diary_id === diaries![0].id)).toBe(true);
  expect(msgs.filter((m) => m.role === "user")).toHaveLength(2);
});

test("R6: 그날 일기가 이미 초안/저장이면 새 대화는 409, / 는 그 일기로 간다", async ({ page }) => {
  const id = await freshUser(page, "chat-r6@test.local");
  const date = localDate();
  const { error } = await admin().from("diaries").insert({ user_id: id, entry_date: date, status: "saved" });
  expect(error).toBeNull();
  const res = await page.request.post("/api/chat", {
    data: { date, answer: "또 쓰기", clientTurnId: crypto.randomUUID() },
  });
  expect(res.status()).toBe(409);
  await page.goto("/");
  await expect(page).toHaveURL(new RegExp(`/diary/${date}$`));
  await page.goto("/chat");
  await expect(page).toHaveURL(new RegExp(`/diary/${date}$`));
});
