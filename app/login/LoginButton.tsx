"use client";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function LoginButton({ className }: { className?: string }) {
  const login = () =>
    createBrowserSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  return (
    <button className={className} onClick={login}>
      Google로 계속하기
    </button>
  );
}
