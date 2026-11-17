# 진행 상황

## 현재 (2026-11-17 세션 종료 시점)
- beta에 머지 완료: Task 1~9 + Task 9b(화면 다듬기, 계획에 추가). 기능은 로컬에서 모두 동작 (단위 39, DB pgTAP, E2E 38 통과, 가짜 Claude 모드 기준).
- 다음 할 일: **Task 10 배포 + 스모크** (계획 문서 Task 10), 그다음 **전체 브랜치 최종 리뷰**, 그다음 beta → main (사용자 확인 후).
- 실행 방식: superpowers subagent-driven-development. 진행 원장(상세 기록, 판정, 미뤄 둔 작은 이슈 목록): `.superpowers/sdd/2026-11-17-diary-app/progress.md` (gitignore, 로컬에만 있음). 이어서 할 때 그 원장부터 읽는다.

## Task 10에서 사용자가 직접 할 일
- Supabase 원격 프로젝트 확인(`supabase link`는 사용자 확인 후), 마이그레이션 원격 반영 `supabase db push`는 사용자가 실행.
- Supabase 대시보드: Google 공급자 켜기(Google Cloud OAuth 클라이언트), 이메일 가입 끄기, Site URL·Redirect URL에 Vercel 운영·프리뷰 주소.
- Vercel: 프로젝트 연결, 환경변수 값 입력 (README의 목록. 운영에는 `CLAUDE_FAKE`를 넣지 않는다).
- 실제 Claude API로 대화 한 번 수동 확인 (아직 가짜 모드로만 테스트됨).

## 인계 (3번 실패 시 작성)
- 이슈:
- 시도한 것:
- 막힌 이유:
- 다음에 해볼 것:

## 결정 / 메모
- consume_quota는 서버(service_role) 전용 (사용자 승인). 상한 값 누락 시 실패.
- tests/** Edit deny 제거, 커밋된 테스트 보호는 훅만 (사용자 승인). 틀린 커밋 테스트는 사람 승인 후에만 수정.
- Supabase CLI는 이 맥에서 `PATH="$HOME/.docker/bin:$PATH"` 필요.
- E2E는 `next build --turbopack && next start`로 돈다 (dev 모드는 느리고 불안정).
