import { defineConfig } from "@playwright/test";
import { execSync } from "node:child_process";

// Local Supabase demo keys (not secrets); no .env file is needed for E2E.
const st = JSON.parse(
  execSync("supabase status -o json", {
    env: { ...process.env, PATH: `${process.env.HOME}/.docker/bin:${process.env.PATH}` },
    stdio: ["ignore", "pipe", "ignore"],
  }).toString(),
);
const env = {
  NEXT_PUBLIC_SUPABASE_URL: st.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: st.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: st.SERVICE_ROLE_KEY,
  CLAUDE_FAKE: "1",
  ANTHROPIC_MODEL: "fake-model",
  ANTHROPIC_API_KEY: "sk-ant-e2e-sentinel-DO-NOT-LEAK",
  QUOTA_PER_USER: "20",
  QUOTA_GLOBAL: "500",
};
Object.assign(process.env, env); // test helpers read these too

const server = (port: number, extra: Record<string, string> = {}) => ({
  // Production server: no on-demand compiles (timing flakes) and no dev overlay elements in the DOM.
  command: `pnpm exec next build --turbopack && pnpm exec next start -p ${port}`,
  url: `http://localhost:${port}/`,
  env: { ...env, ...extra },
  reuseExistingServer: false,
  timeout: 300_000,
});

export default defineConfig({
  testDir: "tests/e2e",
  projects: [
    { name: "default", testIgnore: /quota\.spec\.ts/, use: { baseURL: "http://localhost:3100" } },
    // R13 needs a tiny per-user limit; a separate server (and build dir) keeps it out of the other tests.
    { name: "quota", testMatch: /quota\.spec\.ts/, use: { baseURL: "http://localhost:3101" } },
  ],
  webServer: [server(3100), server(3101, { QUOTA_PER_USER: "3", NEXT_DIST_DIR: ".next-quota" })],
});
