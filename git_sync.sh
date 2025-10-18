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

echo "📦 Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

echo "📦 Installing backend dependencies..."
cd backend
npx prisma generate
npm install
npm run build
cd ..

echo "📁 Deploying frontend..."
sudo rm -rf /var/www/vapekhv.backup
sudo mv /var/www/vapekhv /var/www/vapekhv.backup 2>/dev/null || true
sudo mkdir -p /var/www/vapekhv
sudo cp -r frontend/dist/* /var/www/vapekhv/
sudo systemctl reload nginx

echo "🔄 Restarting backend..."
pm2 reload vapekhv-backend

echo "✅ Deployment complete!"