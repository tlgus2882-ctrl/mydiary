# ADR-0001: 하네스 형태

- 상태: 확정
- 날짜: 2026-11-17

## 맥락
Next.js + Supabase 일기 앱을 AI 하네스 규칙 아래 만든다.

## 결정
- 수준: MVP/데모, 마감 2026-12-01
- deny: `.env*` 읽기, `git push --force*`, `rm -rf*`, `supabase db reset --linked*`, `supabase db push`(원격 반영은 사람이), Supabase MCP의 `execute_sql`·`apply_migration`·`delete_branch`·`pause_project`, `Edit(tests/**)`, `Edit(supabase/tests/**)`
- 리뷰: 스펙·계획·구현 3회, 블로커 없으면 종료, 최대 2바퀴
- 같은 이슈가 3번 실패하면 멈추고 `progress.md`에 인계
- 비용: Anthropic 콘솔 월 한도는 사용자가 직접 설정 (값 미정). 앱 상한은 계획의 Global Constraints 값
- 테스트 보호: 커밋된 테스트 파일은 훅(`.claude/hooks/protect-tests.sh`)이 수정을 막는다. 새 테스트는 커밋 전까지 자유롭게 쓴다.

## 재검토 조건
발표 후 실제 사용자를 받기로 하면.
