// Persona test driver: one browser action per call, so an agent can read the screen,
// decide in character, and act. State lives in the app (DB) + a per-persona browser profile.
// Usage: node scripts/persona/driver.mjs <P1|P2|P3> <command> [args...]
//   login | state | answer "<text>" | finish | wait-draft | redraft
//   preview "<테마 이름|->" "<폰트 이름|->"            (look only, nothing saved)
//   save "<제목|->" "<본문|->" "<테마|->" "<폰트|->"   (apply in one go, then 저장; "-" = keep)
//   goto <path> | shot <name>
// Each call reopens the browser at the last URL, so unsaved edits never carry over.
// Env: BASE_URL (default http://localhost:3200), NEXT_PUBLIC_SUPABASE_URL,
//      NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (local Supabase only).
import { chromium, devices } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  // local Supabase demo keys (not secrets); same source as playwright.config.ts
  const { execSync } = await import("node:child_process");
  const s = JSON.parse(
    execSync("supabase status -o json", { stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, PATH: `${process.env.HOME}/.docker/bin:${process.env.PATH}` } }).toString(),
  );
  process.env.NEXT_PUBLIC_SUPABASE_URL = s.API_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = s.ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = s.SERVICE_ROLE_KEY;
}
const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const OUT = process.env.PERSONA_OUT ?? ".superpowers/persona";
const PERSONAS = {
  P1: { email: "p1-doyoon@persona.local", device: devices["iPhone 13"] },
  P2: { email: "p2-mikyung@persona.local", device: devices["Galaxy S9+"] },
  P3: { email: "p3-seoyeon@persona.local", device: { viewport: { width: 1440, height: 900 } } },
};

const [id, cmd, ...args] = process.argv.slice(2);
const P = PERSONAS[id];
if (!P || !cmd) {
  console.error("usage: driver.mjs <P1|P2|P3> <command> [args]");
  process.exit(2);
}
mkdirSync(`${OUT}/${id}`, { recursive: true });

const ctx = await chromium.launchPersistentContext(`${OUT}/${id}/profile`, {
  ...P.device,
  locale: "ko-KR",
  timezoneId: "Asia/Seoul",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const urlFile = `${OUT}/${id}/url.txt`;
if (!["login", "state", "goto"].includes(cmd) && existsSync(urlFile)) await page.goto(readFileSync(urlFile, "utf8"));
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

async function screen(label) {
  await page.waitForLoadState("networkidle").catch(() => {});
  const text = await page.locator("main").innerText().catch(() => page.locator("body").innerText());
  const buttons = await page.getByRole("button").evaluateAll((bs) =>
    bs.map((b) => `${b.textContent.trim()}${b.disabled ? " (비활성)" : ""}`).filter(Boolean),
  );
  const shot = `${OUT}/${id}/${Date.now()}-${label}.png`;
  await page.screenshot({ path: shot, fullPage: true });
  writeFileSync(urlFile, page.url());
  console.log(`URL: ${page.url()}\n--- 화면 텍스트 ---\n${text}\n--- 버튼 ---\n${buttons.join(" | ")}\n--- 스크린샷: ${shot}`);
  if (errors.length) console.log(`--- 콘솔 오류 ---\n${errors.join("\n")}`);
}

async function waitIdle() {
  // a reply is done when the textarea is enabled again (chat) and the network is quiet
  await page.waitForTimeout(500);
  await page.waitForFunction(() => !document.querySelector("textarea")?.disabled, null, { timeout: 90_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 90_000 }).catch(() => {});
}

try {
  switch (cmd) {
    case "login": {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const pw = "persona-password-123";
      const { error } = await admin.auth.admin.createUser({ email: P.email, password: pw, email_confirm: true });
      if (error && !/already|registered/i.test(error.message)) throw error;
      const jar = [];
      const ssr = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: { getAll: () => [], setAll: (cs) => cs.forEach((c) => jar.push(c)) },
      });
      const res = await ssr.auth.signInWithPassword({ email: P.email, password: pw });
      if (res.error) throw res.error;
      await ctx.addCookies(jar.map(({ name, value }) => ({ name, value, domain: "localhost", path: "/", expires: Math.floor(Date.now() / 1000) + 7 * 86400 })));
      await page.goto(BASE + "/");
      await page.waitForTimeout(1500);
      await screen("login");
      break;
    }
    case "state":
      await page.goto(BASE + "/");
      await page.waitForTimeout(1500);
      await screen("state");
      break;
    case "goto":
      await page.goto(BASE + (args[0] ?? "/"));
      await screen("goto");
      break;
    case "answer": {
      if (!page.url().includes("/chat")) await page.goto(BASE + "/chat");
      await page.waitForFunction(() => !document.querySelector("textarea")?.disabled, null, { timeout: 15_000 });
      await page.locator("textarea").fill(args[0] ?? "");
      await page.getByRole("button", { name: /보내기|전송/ }).click();
      await waitIdle();
      await screen("answer");
      break;
    }
    case "finish":
      if (!page.url().includes("/chat")) await page.goto(BASE + "/chat");
      await page.getByRole("button", { name: "이제 일기 쓰기" }).click();
      await page.waitForURL(/\/diary\//, { timeout: 15_000 });
    // falls through: wait for the draft
    case "wait-draft":
      await page.waitForTimeout(1000);
      await page.waitForFunction(() => {
        const t = document.querySelector("label input:not([type=radio])");
        return t && !t.disabled;
      }, null, { timeout: 120_000 }).catch(() => {});
      await screen("draft");
      console.log("--- 제목 칸 ---\n" + (await page.getByLabel("제목").inputValue().catch(() => "")));
      console.log("--- 본문 칸 ---\n" + (await page.getByLabel("본문").inputValue().catch(() => "")));
      break;
    case "redraft":
      await page.getByRole("button", { name: /초안 만들기|다시 시도/ }).click();
      await page.waitForTimeout(1000);
      await page.waitForFunction(() => !document.querySelector("label input:not([type=radio])")?.disabled, null, { timeout: 120_000 }).catch(() => {});
      await screen("redraft");
      break;
    case "preview":
    case "save": {
      const [a, b, c, d] = cmd === "preview" ? [undefined, undefined, args[0], args[1]] : args;
      if (a && a !== "-") await page.getByLabel("제목").fill(a);
      if (b && b !== "-") await page.getByLabel("본문").fill(b);
      if (c && c !== "-") await page.getByRole("radiogroup", { name: "테마" }).getByRole("radio", { name: c }).check({ force: true });
      if (d && d !== "-") await page.getByRole("radiogroup", { name: "글꼴" }).getByRole("radio", { name: d }).check({ force: true });
      if (cmd === "save") {
        await page.getByRole("button", { name: "저장" }).click();
        await page.waitForTimeout(1500);
      }
      await screen(cmd);
      break;
    }
    case "shot":
      await screen(args[0] ?? "shot");
      break;
    default:
      throw new Error(`unknown command ${cmd}`);
  }
} finally {
  await ctx.close();
}
