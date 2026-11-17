import { notFound } from "next/navigation";
import { DEFAULT_FONT_ID } from "@/lib/fonts";
import { DEFAULT_THEME_ID } from "@/lib/themes";
import { NavLinks } from "@/components/NavLinks";
import { requireUser } from "@/lib/supabase/server";
import css from "./diary.module.css";
import { Editor } from "./Editor";

export default async function DiaryPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { supabase } = await requireUser();
  const { date } = await params;
  const { data, error } = await supabase
    .from("diaries")
    .select("id, status, title, body, theme_id, font_id")
    .eq("entry_date", date)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const { data: msgs, error: msgError } = await supabase
    .from("diary_messages")
    .select("id, role, content")
    .eq("diary_id", data.id)
    .order("seq");
  if (msgError) throw msgError;
  return (
    <>
      <NavLinks />
      <Editor
        key={data.id}
        id={data.id}
        date={date}
        initialTitle={data.title}
        initialBody={data.body}
        initialThemeId={data.theme_id ?? DEFAULT_THEME_ID}
        initialFontId={data.font_id ?? DEFAULT_FONT_ID}
        autoDraft={data.status === "in_progress"}
      />
      {msgs.length > 0 && (
        <details className={css.log}>
          <summary>대화 기록</summary>
          {msgs.map((m) => (
            <p key={m.id} data-role={m.role}>
              {m.content}
            </p>
          ))}
        </details>
      )}
    </>
  );
}
