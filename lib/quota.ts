// consume_quota fails closed on bad limits; parse env strictly so a typo surfaces as an error.
export function quotaLimits(env: Record<string, string | undefined> = process.env) {
  const int = (v: string | undefined, fallback: number) => {
    if (v === undefined || v === "") return fallback;
    if (!/^-?\d+$/.test(v)) throw new Error(`quota limit must be an integer, got "${v}"`);
    return Number(v);
  };
  return { p_per_user: int(env.QUOTA_PER_USER, 20), p_global: int(env.QUOTA_GLOBAL, 500) };
}
