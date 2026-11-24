import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { requireUser } from "@/lib/supabase/server";
import { DEFAULT_THEME_ID, THEMES } from "@/lib/themes";
import css from "./diaries.module.css";

const STATUS = { in_progress: "쓰는 중", drafted: "초안", saved: "저장됨" } as const;

export default async function DiariesPage() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("diaries")
    .select("id, entry_date, title, body, status, theme_id")
    .order("entry_date", { ascending: false });
  if (error) throw error;
  return (
    <>
      <NavLinks />
      {data.length === 0 ? (
        <p className={css.empty}>아직 쓴 일기가 없어요.</p>
      ) : (
        <ul className={css.list}>
          {data.map((d) => {
            const bg = (THEMES.find((t) => t.id === (d.theme_id ?? DEFAULT_THEME_ID)) ?? THEMES[0]).vars["--diary-bg"];
            const text = (d.body ?? "").replace(/\s+/g, " ").trim();
            const preview = [...text].length > 40 ? [...text].slice(0, 40).join("") + "…" : text;
            return (
            <li key={d.id} className={css.item}>
              <Link href={`/diary/${d.entry_date}`}>
                <span data-chip className={css.chip} style={{ background: bg }} aria-hidden />
                <span className={css.date}>{d.entry_date}</span>
                <span className={css.text}>
                  <span className={css.title}>{d.title || "(제목 없음)"}</span>
                  {preview && <span data-preview className={css.preview}>{preview}</span>}
                </span>
                <span className={css.badge}>{STATUS[d.status as keyof typeof STATUS]}</span>
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
