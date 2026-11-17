import Link from "next/link";
import css from "./nav.module.css";

export function NavLinks() {
  return (
    <nav className={css.nav}>
      <Link href="/diaries">지난 일기</Link>
      <Link href="/settings">설정</Link>
    </nav>
  );
}
