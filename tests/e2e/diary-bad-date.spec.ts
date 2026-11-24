import { expect, test } from "@playwright/test";
import { freshUser } from "./helpers/chat";

test("/diary/<not a date> is a 404, not a 500", async ({ page }) => {
  await freshUser(page, "bad-date@test.local");
  for (const d of ["not-a-date", "2026-02-30"]) {
    const res = await page.goto(`/diary/${d}`);
    expect(res!.status()).toBe(404);
  }
});
