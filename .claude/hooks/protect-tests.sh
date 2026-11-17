#!/usr/bin/env bash
# 커밋된 테스트 파일(tests/, supabase/tests/) 수정을 막는다. 새(미커밋) 테스트는 허용.
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
f=$(jq -r '.tool_input.file_path // empty')
[ -z "$f" ] && exit 0
rel="${f#"$root"/}"
case "$rel" in
  tests/*|supabase/tests/*)
    if git -C "$root" ls-files --error-unmatch -- "$rel" >/dev/null 2>&1; then
      echo "커밋된 테스트 파일은 수정할 수 없습니다: $rel (테스트가 틀렸다면 사람에게 알리세요)" >&2
      exit 2
    fi ;;
esac
exit 0
