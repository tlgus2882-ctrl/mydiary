"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { localDate } from "@/lib/date";

// Tells server components the browser's local date (R6). The cookie expires at local midnight,
// so a new day starts with no cookie; a stale or missing one is replaced and the server components
// re-rendered (a soft refresh, so it never aborts a navigation in flight).
export function TzDate() {
  const router = useRouter();
  useEffect(() => {
    const today = localDate();
    const current = document.cookie.match(/(?:^|; )tz-date=([^;]*)/)?.[1];
    if (current === today) return;
    const d = new Date();
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    document.cookie = `tz-date=${today}; path=/; samesite=lax; expires=${midnight.toUTCString()}`;
    // no loop if cookies are blocked
    if (document.cookie.includes(`tz-date=${today}`)) router.refresh();
  }, [router]);
  return null;
}

// Server-side routing used the cookie's date; only follow it if that is still the browser's today
// (otherwise <TzDate> refreshes the cookie and re-renders).
export function GoIfToday({ date, to }: { date: string; to: string }) {
  const router = useRouter();
  useEffect(() => {
    if (localDate() === date) router.replace(to);
  }, [date, to, router]);
  return null;
}
