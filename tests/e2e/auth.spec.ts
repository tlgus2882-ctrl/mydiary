import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/login";

test("미로그인으로 / 접근하면 /login으로 이동한다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Google로 계속하기" })).toBeVisible();
});

test("로그인하면 / 가 /login으로 리다이렉트되지 않는다", async ({ page }) => {
  await loginAs(page, "a@test.local");
  await page.goto("/");
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByText("a@test.local")).toBeVisible();
});

test("R8: 클라이언트에 서비스 키와 Anthropic 키가 노출되지 않는다", async ({ page }) => {
  const bodies: string[] = [];
  page.on("response", async (r) => {
    const ct = r.headers()["content-type"] ?? "";
    if (/javascript|html/.test(ct)) bodies.push(await r.text().catch(() => ""));
  });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Google로 계속하기" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(bodies.length).toBeGreaterThan(1);
  const all = bodies.join("\n");
  expect(all).not.toContain(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  expect(all).not.toContain("sk-ant-e2e-sentinel-DO-NOT-LEAK");
});
