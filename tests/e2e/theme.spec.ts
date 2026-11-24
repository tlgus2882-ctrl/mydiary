import { expect, test, type Page } from "@playwright/test";
import { FONTS } from "@/lib/fonts";
import { THEMES } from "@/lib/themes";
import { answer, admin, finishButton, freshUser, localDate } from "./helpers/chat";

const night = THEMES.find((t) => t.id === "night")!;
const pen = FONTS.find((f) => f.id === "nanum-pen-script")!;
const jua = FONTS.find((f) => f.id === "jua")!;

const sheet = (p: Page) => p.getByTestId("diary-page");
const bg = (p: Page) => sheet(p).evaluate((e) => getComputedStyle(e).getPropertyValue("--diary-bg").trim());
const family = (p: Page) => sheet(p).evaluate((e) => getComputedStyle(e).fontFamily);

async function toEditor(page: Page, email: string) {
  const id = await freshUser(page, email);
  await admin().from("profiles").delete().eq("user_id", id);
  await page.goto("/chat");
  for (let n = 1; n <= 3; n++) await answer(page, `답 ${n}`, n);
  await finishButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/diary/${localDate()}$`));
  return id;
}

test("R9: 테마와 글꼴을 따로 바꾸면 바로 반영되고, 저장하면 새로고침해도 유지", async ({ page }) => {
  await toEditor(page, "theme-r9a@test.local");
  await expect(sheet(page)).toBeVisible();
  const before = await bg(page);

  await page.getByRole("radio", { name: night.name }).check();
  expect(await bg(page)).toBe(night.vars["--diary-bg"]);
  expect(await bg(page)).not.toBe(before);
  const fontBefore = await family(page);
  await page.getByRole("radio", { name: pen.name }).check();
  expect(await family(page)).toContain(pen.googleFamily);
  expect(await family(page)).not.toBe(fontBefore);
  expect(await bg(page)).toBe(night.vars["--diary-bg"]); // independent of the theme

  // font only changes, then save: theme saved too
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장했어요")).toBeVisible();
  await page.reload();
  expect(await bg(page)).toBe(night.vars["--diary-bg"]);
  expect(await family(page)).toContain(pen.googleFamily);
  await expect(page.getByRole("radio", { name: night.name })).toBeChecked();
});

test("R10: 첫 로드에서 전체 폰트 CSS는 선택된 1개, 나머지는 text= 미리보기만", async ({ page }) => {
  const urls: string[] = [];
  page.on("request", (r) => {
    if (r.url().startsWith("https://fonts.googleapis.com/css2")) urls.push(r.url());
  });
  await toEditor(page, "theme-r10@test.local");
  await expect(page.getByRole("radio", { name: jua.name })).toBeVisible();
  await expect.poll(() => urls.filter((u) => u.includes("text=")).length).toBeGreaterThanOrEqual(FONTS.length);
  const full = urls.filter((u) => !u.includes("text="));
  expect(full).toHaveLength(1);
  expect(full[0]).toContain("family=Gowun+Batang");
});

test("R9: 다른 조합으로 저장한 뒤 새 일기는 그 조합으로 시작", async ({ page }) => {
  const id = await toEditor(page, "theme-r9b@test.local");
  await page.getByRole("radio", { name: night.name }).check();
  await page.getByRole("radio", { name: jua.name }).check();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장했어요")).toBeVisible();
  const { data: p } = await admin().from("profiles").select("last_theme_id, last_font_id").eq("user_id", id).single();
  expect(p).toEqual({ last_theme_id: "night", last_font_id: "jua" });

  // a new diary: drop today's, then start over (the profile keeps the last combo)
  await admin().from("diaries").delete().eq("user_id", id);
  await page.goto("/chat");
  for (let n = 1; n <= 3; n++) await answer(page, `새 답 ${n}`, n);
  await finishButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/diary/${localDate()}$`));
  await expect(page.getByRole("radio", { name: night.name })).toBeChecked();
  await expect(page.getByRole("radio", { name: jua.name })).toBeChecked();
  expect(await bg(page)).toBe(night.vars["--diary-bg"]);
  const { data: rows } = await admin().from("diaries").select("theme_id, font_id").eq("user_id", id);
  expect(rows!.filter((r) => r.theme_id === "night" && r.font_id === "jua")).toHaveLength(1);
});
