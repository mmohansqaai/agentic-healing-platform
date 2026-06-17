#!/usr/bin/env bash
# Create https://github.com/mmohansqaai/ai-healing-sdk and push (run after: gh auth login)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_DIR="$ROOT/dist-packages/ai-healing-sdk-repo"

echo "==> Extract fresh standalone tree"
node "$ROOT/scripts/extract-healing-sdk-repo.mjs"

cd "$REPO_DIR"
echo "==> Install & build"
npm install
npm run build

if [ ! -d .git ]; then
  git init -b main
fi

git add .
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "$(cat <<'EOF'
Initial commit: ai-healing-sdk standalone package.

Plug-and-play Playwright self-healing SDK extracted from SelfHealingPlaywrightFramework.
EOF
)"
fi

GH="${GH:-gh}"
if ! "$GH" auth status >/dev/null 2>&1; then
  echo ""
  echo "Not logged in. Run:  gh auth login"
  echo "Then re-run:       npm run publish:healing-sdk-github"
  exit 1
fi

if "$GH" repo view mmohansqaai/ai-healing-sdk >/dev/null 2>&1; then
  echo "==> Remote repo exists — pushing"
  gh auth setup-git
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/mmohansqaai/ai-healing-sdk.git"
  git push -u origin main --force
else
  echo "==> Creating public repo mmohansqaai/ai-healing-sdk"
  "$GH" repo create mmohansqaai/ai-healing-sdk --public --source=. --remote=origin --push \
    --description "Plug-and-play agentic self-healing SDK for Playwright"
fi

echo ""
echo "Done: https://github.com/mmohansqaai/ai-healing-sdk"
