#!/usr/bin/env bash
# 커밋된 테스트 파일(tests/, supabase/tests/) 수정을 막는다. 새(미커밋) 테스트는 허용.
command -v jq >/dev/null || { echo "protect-tests: jq 필요" >&2; exit 2; }
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
f=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$f" ] && exit 0
rel="${f#"$root"/}"
# 순수 bash로 정규화: '.', 빈 조각 제거, '..' 접기
out=()
IFS=/ read -ra parts <<<"$rel"
for p in "${parts[@]}"; do
  case "$p" in ''|.) ;; ..) [ ${#out[@]} -gt 0 ] && unset 'out[${#out[@]}-1]' ;; *) out+=("$p") ;; esac
done
rel=$(IFS=/; echo "${out[*]}")
case "$rel" in
  tests/*|supabase/tests/*)
    if git -C "$root" ls-files --error-unmatch -- "$rel" >/dev/null 2>&1; then
      echo "커밋된 테스트 파일은 수정할 수 없습니다: $rel (테스트가 틀렸다면 사람에게 알리세요)" >&2
      exit 2
    fi ;;
esac
exit 0
