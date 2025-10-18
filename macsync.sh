#!/bin/bash
set -e

echo "🔄 Fetching latest changes..."
git fetch origin main

echo "📝 Changed files:"
git diff --name-status HEAD origin/main

echo ""
echo "📊 Commits to be pulled:"
git log --oneline HEAD..origin/main

echo ""
echo "🔄 Pulling changes (hard reset)..."
git reset --hard origin/main  # <-- ИЗМЕНЕНО

echo "✅ Deployment complete!"