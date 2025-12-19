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

echo '==> Start Backend'
ssh "$REMOTE" "
  cd ..
  cd ..  
  cd /var/www/Deployment/Repository/Backend/nodeJs-Backend
  mv Openapi.yaml openapi.yaml
  pm2 restart backend
  pm2 logs backend
"