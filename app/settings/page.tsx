import { NavLinks } from "@/components/NavLinks";
import { requireUser } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";
import css from "./settings.module.css";

export default async function SettingsPage() {
  const { user } = await requireUser();
  return (
    <>
      <NavLinks />
      <main className={css.main}>
        <h1>설정</h1>
        <p>{user.email}</p>
        <SettingsForm />
      </main>
    </>
  );
}
