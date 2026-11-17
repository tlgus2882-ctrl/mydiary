#!/usr/bin/env bash
# 훅 테스트: 임시 git 저장소를 만들어 커밋 순서와 무관하게 검증한다.
HOOK="$(cd "$(dirname "$0")/../.." && pwd)/.claude/hooks/protect-tests.sh"
FIX=$(mktemp -d); trap 'rm -rf "$FIX"' EXIT
cd "$FIX" && git init -q && mkdir -p tests supabase/tests
touch tests/x.test.ts supabase/tests/a.test.sql
git add -A && git -c user.email=t@t -c user.name=t commit -qm fixture

fail=0
check() { # 이름 경로 기대종료코드 [stderr 포함 문구]
  local err code
  err=$(printf '{"tool_input":{"file_path":"%s"}}' "$2" | CLAUDE_PROJECT_DIR="$FIX" bash "$HOOK" 2>&1 >/dev/null); code=$?
  if [ "$code" = "$3" ] && { [ -z "$4" ] || [[ "$err" == *"$4"* ]]; }; then echo "PASS $1"
  else echo "FAIL $1 (exit=$code, stderr=$err)"; fail=1; fi
}
check "커밋된 테스트 차단"        "tests/x.test.ts" 2 "커밋된 테스트"
check "커밋된 테스트 차단(절대경로)" "$FIX/tests/x.test.ts" 2 "커밋된 테스트"
check "커밋된 SQL 테스트 차단"    "supabase/tests/a.test.sql" 2 "커밋된 테스트"
check "새 테스트 허용"            "tests/unit/new.test.ts" 0
check "일반 파일 허용"            "lib/date.ts" 0
exit $fail
