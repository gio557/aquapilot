#!/bin/bash
# Auto-PR hook: sveglia Claude per creare una PR se il branch ha commit non coperti.
# Loop prevention: scrive il HEAD SHA in .claude/pr-created-for dopo ogni PR.

input=$(cat)

stop_hook_active=$(echo "$input" | jq -r '.stop_hook_active // "false"')
if [[ "$stop_hook_active" = "true" ]]; then
  exit 0
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

current_branch=$(git branch --show-current)
if [[ -z "$current_branch" ]] || [[ "$current_branch" == "main" ]]; then
  exit 0
fi

if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
  exit 0
fi

ahead=$(git rev-list origin/main..HEAD --count 2>/dev/null) || ahead=0
if [[ "$ahead" -eq 0 ]]; then
  exit 0
fi

repo_root=$(git rev-parse --show-toplevel)
current_sha=$(git rev-parse HEAD)
pr_for_sha=$(cat "$repo_root/.claude/pr-created-for" 2>/dev/null)
if [[ "$current_sha" == "$pr_for_sha" ]]; then
  exit 0
fi

msg="Branch '$current_branch' ha $ahead commit davanti a main e non risulta ancora coperto da una PR."
msg+=" Usa mcp__github__list_pull_requests (owner: gio557, repo: aquapilot, state: open) per verificare."
msg+=" Se nessuna PR copre questo branch, crea una PR (owner: gio557, repo: aquapilot,"
msg+=" head: '$current_branch', base: main) con titolo e descrizione sintetici del lavoro svolto."
msg+=" Al termine (PR creata o già esistente), scrivi il testo '$current_sha'"
msg+=" nel file '$repo_root/.claude/pr-created-for' per disabilitare questo check finché non arrivano nuovi commit."

echo "{\"systemMessage\": \"$msg\"}"
exit 2
