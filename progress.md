# 진행 상황

## 현재 (2026-11-24)
- **운영 배포 완료:** https://mydiary-sigma.vercel.app (main, v1 PR #30 → v2 PR #55, 페르소나 개선 반영). 프리뷰에서 실제 Claude API 스모크 통과 (`docs/smoke/2026-11-24.md`), 최종 전체 리뷰 통과.
- 남은 확인: 다른 구글 계정으로 남의 일기 URL 접근 → 404 (운영 미실시). 초안 도중 이탈 후 서버 저장이 Vercel에서 끝까지 되는지 (미확인, 필요하면 next/server `after()`).
- 미뤄 둔 작은 이슈 목록은 최종 리뷰 분류 기준 "나중에 해도 됨"만 남음 (빈 질문 재시도 시 사용량 1회 추가 차감 등).
- 배포: `beta` 푸시 → Vercel 프리뷰 자동, `main` 머지 → 운영 자동. CLI 수동 배포는 항상 `vercel deploy --target preview`.

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
