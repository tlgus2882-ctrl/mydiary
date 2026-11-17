#!/usr/bin/env bash
# 훅 경로 정규화 테스트: 임시 git 저장소 fixture.
HOOK="$(cd "$(dirname "$0")/../.." && pwd)/.claude/hooks/protect-tests.sh"
FIX=$(mktemp -d); trap 'rm -rf "$FIX"' EXIT
cd "$FIX" && git init -q && mkdir -p tests && touch tests/x.test.ts
git add -A && git -c user.email=t@t -c user.name=t commit -qm fixture

fail=0
check() { # 이름 입력JSON 기대종료코드 [stderr 포함 문구]
  local err code
  err=$(printf '%s' "$2" | CLAUDE_PROJECT_DIR="$FIX" bash "$HOOK" 2>&1 >/dev/null); code=$?
  if [ "$code" = "$3" ] && { [ -z "$4" ] || [[ "$err" == *"$4"* ]]; }; then echo "PASS $1"
  else echo "FAIL $1 (exit=$code, stderr=$err)"; fail=1; fi
}
check "./ 접두 차단"        '{"tool_input":{"file_path":"./tests/x.test.ts"}}' 2 "커밋된 테스트"
check ".. 우회 차단"        '{"tool_input":{"file_path":"tests/../tests/x.test.ts"}}' 2 "커밋된 테스트"
check "file_path 없음 허용" '{"tool_input":{}}' 0
exit $fail
