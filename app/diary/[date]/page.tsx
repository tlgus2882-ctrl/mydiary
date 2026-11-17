import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { Editor } from "./Editor";

export default async function DiaryPage({ params }: { params: Promise<{ date: string }> }) {
  const { supabase } = await requireUser();
  const { date } = await params;
  const { data, error } = await supabase
    .from("diaries")
    .select("id, status, title, body")
    .eq("entry_date", date)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return (
    <Editor
      key={data.id}
      id={data.id}
      date={date}
      initialTitle={data.title}
      initialBody={data.body}
      autoDraft={data.status === "in_progress"}
    />
  );
}
