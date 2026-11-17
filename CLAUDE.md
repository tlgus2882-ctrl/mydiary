# MyDiary

수준: MVP/데모 (마감 2026-12-01). 결정 근거는 `docs/adr/0001-harness-shape.md`.

## 필수
세션 시작과 압축 뒤에 `progress.md`를 읽어라.

## 명령
- `pnpm test` : 단위 테스트
- `pnpm e2e` : Playwright E2E
- `supabase test db` : DB(RLS) 테스트

## 용어집 (새 이름 금지: "회원", "고객" 등)
- 일기 = `diary`
- 대화 메시지 = `diary_message`
- 후속 질문 = 첫 질문 이후 Claude가 하는 질문
- 사용자 = `user`

## 작업 흐름
이슈 -> 워크트리 -> `beta` 브랜치로 PR. `main`은 배포 확인 뒤에만 반영.
커밋된 테스트는 훅이 수정을 막는다. 같은 이슈가 3번 실패하면 멈추고 `progress.md`에 인계.
