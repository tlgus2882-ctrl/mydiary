import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginAs } from "./login";

export const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

// Log in and wipe this user's diaries and usage so every run starts clean.
export async function freshUser(page: Page, email: string): Promise<string> {
  await loginAs(page, email);
  const db = admin();
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const id = data.users.find((u) => u.email === email)!.id;
  await db.from("diaries").delete().eq("user_id", id);
  await db.from("usage_counters").delete().eq("user_id", id);
  return id;
}

export async function messages(userId: string) {
  const { data, error } = await admin()
    .from("diary_messages")
    .select("role, content, seq, diary_id")
    .eq("user_id", userId)
    .order("seq");
  if (error) throw error;
  return data;
}

export async function usage(userId: string): Promise<number> {
  const { data } = await admin().from("usage_counters").select("calls").eq("user_id", userId);
  return (data ?? []).reduce((s, r) => s + r.calls, 0);
}

export const fakeQuestion = (n: number) => `그때 기분이 어떠셨어요? (가짜 질문 ${n})`;
export const textbox = (page: Page) => page.getByRole("textbox");
export const sendButton = (page: Page) => page.getByRole("button", { name: "보내기" });
export const finishButton = (page: Page) => page.getByRole("button", { name: "이제 일기 쓰기" });
export const filledDots = (page: Page) => page.locator('[data-dot="on"]');

// Answer and wait for follow-up question n to finish streaming.
export async function answer(page: Page, text: string, n: number) {
  await textbox(page).fill(text);
  await sendButton(page).click();
  await expect(page.getByText(fakeQuestion(n), { exact: true })).toBeVisible();
  await expect(filledDots(page)).toHaveCount(n);
}

export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
