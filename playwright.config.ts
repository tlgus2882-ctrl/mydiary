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

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "pnpm exec next dev -p 3100",
    url: "http://localhost:3100/",
    env,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
