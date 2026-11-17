import { requireUser } from "@/lib/supabase/server";

export default async function Home() {
  const { user } = await requireUser();
  return <main>{user.email}</main>;
}
