import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { requireUser } from "@/lib/supabase/server";
import css from "./diaries.module.css";

const STATUS = { in_progress: "쓰는 중", drafted: "초안", saved: "저장됨" } as const;

export default async function DiariesPage() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("diaries")
    .select("id, entry_date, title, status")
    .order("entry_date", { ascending: false });
  if (error) throw error;
  return (
    <>
      <NavLinks />
      {data.length === 0 ? (
        <p className={css.empty}>아직 쓴 일기가 없어요.</p>
      ) : (
        <ul className={css.list}>
          {data.map((d) => (
            <li key={d.id} className={css.item}>
              <Link href={`/diary/${d.entry_date}`}>
                <span className={css.date}>{d.entry_date}</span>
                <span className={css.title}>{d.title || "(제목 없음)"}</span>
                <span className={css.badge}>{STATUS[d.status as keyof typeof STATUS]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
