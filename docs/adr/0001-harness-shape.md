# ADR-0001: 하네스 형태

- 상태: 확정
- 날짜: 2026-11-17

## 맥락
Next.js + Supabase 일기 앱을 AI 하네스 규칙 아래 만든다.

## 결정
- 수준: MVP/데모, 마감 2026-12-01
- deny: `.env*` 읽기, `git push --force*`, `rm -rf*`, `supabase db reset --linked*`, `supabase db push`(원격 반영은 사람이), Supabase MCP의 `execute_sql`·`apply_migration`·`delete_branch`·`pause_project`
- 리뷰: 스펙·계획·구현 3회, 블로커 없으면 종료, 최대 2바퀴
- 같은 이슈가 3번 실패하면 멈추고 `progress.md`에 인계
- 비용: Anthropic 콘솔 월 한도는 사용자가 직접 설정 (값 미정). 앱 상한은 계획의 Global Constraints 값
- 테스트 보호: PreToolUse 훅(`.claude/hooks/protect-tests.sh`)만 쓴다(Edit deny 규칙은 Write까지 막아 새 테스트 작성이 불가능하므로 쓰지 않는다). 커밋된 테스트는 수정 불가, 새 테스트는 커밋 전까지 자유.

## 알려진 한계
Bash 명령(`sed -i`, 리다이렉션, `cat .env`)은 훅과 Read deny를 우회한다. 리뷰와 `git diff --exit-code <테스트 커밋> -- tests/` 게이트로 보완한다.

## 재검토 조건
발표 후 실제 사용자를 받기로 하면.

커밋된 테스트가 스펙과 다르게 틀린 경우, 사람(사용자)의 명시적 승인 후에만 수정한다 (푸시 전 로컬 커밋이면 커밋을 다시 쓰고, 푸시 후면 새 커밋으로 고친다).
