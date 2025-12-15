#!/usr/bin/env bash
set -euo pipefail

# ========= KONFIG =========
REMOTE="my-ec3"
APP_ROOT="/var/www/Deployment"
REPO_DIR="$APP_ROOT/Repository"
FRONTEND_DIR="$REPO_DIR/Frontend"
WEBROOT="$FRONTEND_DIR/www"
BRANCH="smaller-updates-and-testing"
REPO_SSH="git@github.com:MarlonH05/FeueralarmV3.git"

echo "==> Check SSH-Verbindung zu $REMOTE"
ssh -o BatchMode=yes "$REMOTE" 'echo ok' >/dev/null

echo '==> Start Frontend'
ssh "$REMOTE" "
  sudo chown -R ubuntu:ubuntu /var/www/Deployment/Repository/Frontend
  cd /var/www/Deployment/Repository/Frontend
  sudo chown -R ubuntu:ubuntu www/
  sudo chmod -R 755 www/
  npx ng build --configuration=production
  sudo rsync -av --delete www/ /var/www/Deployment/Webserver/
  sudo nginx -t && sudo systemctl reload nginx
  ionic build --prod

  if sudo lsof -t -i:4200 > /dev/null 2>&1; then
    echo 'Killing existing process on port 4200...'
    sudo kill -9 \$(sudo lsof -t -i:4200)
  fi

  npm run start
"