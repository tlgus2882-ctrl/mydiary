# 오늘의 일기

질문에 답하다 보면 일기가 써지는 앱. Claude가 하루를 묻고, 답을 모아 일기 초안을 써 줘요. 테마와 글꼴을 골라 저장하고 지난 일기를 다시 볼 수 있어요.

## 스택

Next.js 15 (App Router) · TypeScript · Supabase (Auth, Postgres, RLS) · Anthropic API · pnpm

## 로컬 실행

```bash
pnpm install
supabase start        # 로컬 Supabase (Docker 필요)
pnpm dev              # http://localhost:3000
```

`.env.local`에 필요한 환경 변수 (값은 `supabase status`에서 확인):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- `QUOTA_PER_USER`, `QUOTA_GLOBAL` (일일 대화 한도)
- `CLAUDE_FAKE=1` (선택: 실제 호출 없이 가짜 응답)

전체 이름은 `.env.example` 참고. Google 로그인은 Supabase Auth에 Google provider 설정이 필요해요.

## 테스트

```bash
pnpm test             # 단위 테스트
supabase db reset && supabase test db   # DB(RLS) 테스트
pnpm e2e              # Playwright E2E (프로덕션 빌드, CLAUDE_FAKE=1)
```
