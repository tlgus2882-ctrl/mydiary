"use client";
import { useEffect } from "react";
import { localDate } from "@/lib/date";

// Tells server components the browser's local date (R6). Reloads only when it was missing:
// pages render nothing until then, so a reload never races the user's typing.
export function TzDate() {
  useEffect(() => {
    const today = localDate();
    const current = document.cookie.match(/(?:^|; )tz-date=([^;]*)/)?.[1];
    if (current === today) return;
    document.cookie = `tz-date=${today}; path=/; samesite=lax`;
    // no loop if cookies are blocked
    if (!current && document.cookie.includes(`tz-date=${today}`)) location.reload();
  }, []);
  return null;
}
