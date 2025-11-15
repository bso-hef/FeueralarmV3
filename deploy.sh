#!/usr/bin/env bash
set -euo pipefail

# ========= KONFIG =========
REMOTE="my-ec3"
APP_ROOT="/var/www/Deployment"
REPO_DIR="$APP_ROOT/Repository"
FRONTEND_DIR="$REPO_DIR/Frontend"
WEBROOT="$FRONTEND_DIR/www"                   # Webserver zeigt DIREKT hierhin
BRANCH="UAP-3.3.2-Sync-bei-Netzverfügbarkeit"
REPO_SSH="git@github.com:MarlonH05/FeueralarmV3.git"

echo "==> Check SSH-Verbindung zu $REMOTE"
ssh -o BatchMode=yes "$REMOTE" 'echo ok' >/dev/null

echo "==> Repo aktualisieren (Branch: $BRANCH)"
ssh "$REMOTE" "set -e; \
  if [ -d '$REPO_DIR/.git' ]; then \
    cd '$REPO_DIR' && git fetch --all && git checkout '$BRANCH' && git reset --hard origin/'$BRANCH' && git clean -fd && git pull --ff-only; \
  else \
    mkdir -p '$APP_ROOT' && cd '$APP_ROOT' && git clone '$REPO_SSH' 'Repository'; \
    cd '$REPO_DIR' && git checkout '$BRANCH'; \
  fi"

echo '==> Verzeichnisse sicherstellen'
ssh "$REMOTE" "set -e; sudo mkdir -p '$WEBROOT'; sudo chown -R \$USER '$APP_ROOT'"

echo '==> Package-Fixes anwenden'
ssh "$REMOTE" "set -e; cd '$FRONTEND_DIR'; \
  npm pkg set 'dependencies.zone.js=~0.14.10'; \
  npm pkg set 'dependencies.ngx-socket-io=4.6.0'; \
  npm pkg set 'dependencies.@auth0/angular-jwt=^5.2.0'; \
  node -e \"const fs=require('fs'); const p=require('./package.json'); if (p.dependencies && p.dependencies.zone) { delete p.dependencies.zone; } fs.writeFileSync('package.json', JSON.stringify(p, null, 2));\"; \
  rm -rf node_modules package-lock.json; \
  npm config set registry 'https://registry.npmjs.org/'; \
  export npm_config_cache='/home/ubuntu/.npm/_cacache'; \
  export TMPDIR='/home/ubuntu/tmp'; mkdir -p '\$TMPDIR'; \
  npm cache clean --force || true; \
  rm -rf /home/ubuntu/.npm/_cacache || true;"

echo '==> Dependencies installieren'
ssh "$REMOTE" "set -e; cd '$FRONTEND_DIR'; npm install --legacy-peer-deps"

echo '==> Build (production)'
ssh "$REMOTE" "set -e; cd '$FRONTEND_DIR'; npx ng build --configuration=production"

# Keine rsync-Phase nötig, Webserver zeigt auf $WEBROOT
echo '==> Rechte im Webroot (Repo-Build) setzen'
ssh "$REMOTE" "set -e; sudo chown -R www-data:www-data '$WEBROOT'; find '$WEBROOT' -type d -exec sudo chmod 755 {} \; ; find '$WEBROOT' -type f -exec sudo chmod 644 {} \;"

echo '==> Webserver reload'
ssh "$REMOTE" "set -e; \
  if systemctl is-active --quiet nginx; then sudo systemctl reload nginx; \
  elif systemctl is-active --quiet apache2; then sudo systemctl reload apache2; \
  else echo 'Hinweis: Kein nginx/apache2 aktiv'; fi"

echo '==> Deploy fertig.'
