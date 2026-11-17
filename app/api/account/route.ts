import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export async function DELETE(req: Request) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser(); // server-verified
  if (!data.user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { confirm?: unknown } | null;
  if (body?.confirm !== "탈퇴") return Response.json({ error: "bad_confirm" }, { status: 400 });

  // id comes from the verified session, never from the request body; cascades remove all rows
  const { error } = await createAdminSupabase().auth.admin.deleteUser(data.user.id);
  if (error) return Response.json({ error: "delete_failed" }, { status: 500 });
  await supabase.auth.signOut(); // clears the session cookies; the token's user is gone, so ignore its result
  return Response.json({ ok: true });
}
