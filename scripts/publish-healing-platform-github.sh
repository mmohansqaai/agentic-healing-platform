#!/usr/bin/env bash
# Create https://github.com/mmohansqaai/agentic-healing-platform and push
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_DIR="$ROOT/dist-packages/agentic-healing-platform"

echo "==> Extract healing platform (no Nova)"
node "$ROOT/scripts/extract-healing-platform-repo.mjs"

cd "$REPO_DIR"
echo "==> npm install"
npm install

echo "==> Build stack"
npm run build:healing-service

if [ ! -d .git ]; then
  git init -b main
fi

git add .
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "$(cat <<'EOF'
Initial commit: agentic-healing-platform monorepo.

All-in-one: ai-healing-sdk + healing-service + locator/LLM agents (no Nova).
EOF
)"
fi

GH="${GH:-gh}"
if ! "$GH" auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

if "$GH" repo view mmohansqaai/agentic-healing-platform >/dev/null 2>&1; then
  echo "==> Remote repo exists — pushing"
  gh auth setup-git
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/mmohansqaai/agentic-healing-platform.git"
  git push -u origin main --force
else
  "$GH" repo create mmohansqaai/agentic-healing-platform --public --source=. --remote=origin --push \
    --description "Agentic healing platform — service, agents, LLM recovery (no Nova)"
fi

echo ""
echo "Done: https://github.com/mmohansqaai/agentic-healing-platform"
