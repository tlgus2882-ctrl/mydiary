// Minimal chainable stand-in for the supabase client used by route tests: every builder call returns
// the builder, awaiting it records the call and resolves rows from `tables` (selects) or null (writes).
type Call = { table: string; op: string; payload: unknown; filters: [string, unknown][] };

export function fakeSupabase(tables: Record<string, unknown[]>) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const q: Call & { single?: boolean } = { table, op: "select", payload: null, filters: [] };
    const write = (op: string) => (payload: unknown) => ((q.op = op), (q.payload = payload), b);
    const b: Record<string, unknown> = {
      select: () => b,
      order: () => b,
      in: () => b,
      eq: (k: string, v: unknown) => (q.filters.push([k, v]), b),
      maybeSingle: () => ((q.single = true), b),
      insert: write("insert"),
      update: write("update"),
      upsert: write("upsert"),
      then(res: (v: unknown) => unknown, rej: (e: unknown) => unknown) {
        calls.push(q);
        const rows = tables[table] ?? [];
        const data = q.op !== "select" ? null : q.single ? (rows[0] ?? null) : rows;
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
    };
    return b;
  };
  return { from, auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) }, calls };
}
