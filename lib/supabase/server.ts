import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function createServerSupabase(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Server Component: cookies are read-only; middleware refreshes them.
          }
        },
      },
    },
  );
}

export async function requireUser(): Promise<{ supabase: SupabaseClient; user: User }> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser(); // server-verified, not getSession
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}
