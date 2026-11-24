import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const PASSWORD = "e2e-password-123";

export async function loginAs(page: Page, email: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error && !/already|registered/i.test(error.message)) throw error;

  // Let @supabase/ssr write the cookies itself (handles encoding + chunking).
  const jar: { name: string; value: string }[] = [];
  const ssr = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => [],
      setAll: (cs) => cs.forEach(({ name, value }) => jar.push({ name, value })),
    },
  });
  const res = await ssr.auth.signInWithPassword({ email, password: PASSWORD });
  if (res.error) throw res.error;

  await page.context().addCookies(
    jar.map((c) => ({ ...c, domain: "localhost", path: "/" })),
  );
}
