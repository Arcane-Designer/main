#!/bin/bash
# runs the Arc prompts through headless Codex, 4 at a time
C="/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex"
cd "/Users/nathanagellatly/Desktop/AI - Work/Other AI Projects/Arcane Designer for Claude/ad-redesign"
mkdir -p tools/arc-src/logs
run(){ f=$1; n=$(basename $f .md); refs=$(head -1 $f | sed -n 's/^<!-- refs: \(.*\) -->$/\1/p'); args=(); for r in $refs; do args+=(-i "$r"); done
  "$C" exec -s workspace-write --skip-git-repo-check "${args[@]}" < $f > tools/arc-src/logs/$n.log 2>&1; echo "$(date +%H:%M) $n exit $? $( [ -f tools/arc-src/out/$n.png ] && echo saved || echo MISSING)"; }
export -f run; export C
ls tools/arc-src/prompts-v3/*.md | xargs -P 4 -I{} bash -c 'run "{}"'
echo all-done
