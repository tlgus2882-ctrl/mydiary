"use client";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const login = () =>
    createBrowserSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  return (
    <main>
      <button onClick={login}>Google로 계속하기</button>
    </main>
  );
}
