import { LoginButton } from "./LoginButton";
import css from "./login.module.css";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className={css.main}>
      <section className={css.card}>
        <h1 className={css.name}>오늘의 일기</h1>
        <p className={css.desc}>질문에 답하다 보면 일기가 써져요</p>
        <LoginButton className={css.btn} />
        {error && <p role="alert">로그인하지 못했어요. 다시 시도해 주세요.</p>}
      </section>
    </main>
  );
}
