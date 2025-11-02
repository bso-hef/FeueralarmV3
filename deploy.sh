#!/usr/bin/env bash
set -euo pipefail

# ========= KONFIG =========
REMOTE="my-ec2"                                 # SSH-Alias aus ~/.ssh/config
APP_ROOT="/var/www/feueralarm"                  # Basisverzeichnis auf EC2
REPO_DIR="$APP_ROOT/FeueralarmV3"               # Git-Repo auf EC2
FRONTEND_DIR="$REPO_DIR/Frontend"               # Angular/Ionic Frontend-Verzeichnis
WEBROOT="$APP_ROOT/Frontend/www"                # Zielverzeichnis für den Webserver
BRANCH="dev"                                    # Zu deployender Branch
REPO_SSH="git@github.com:MarlonH05/FeueralarmV3.git"  # Repo-URL (SSH)

echo "==> Check SSH-Verbindung zu $REMOTE"
ssh -o BatchMode=yes "$REMOTE" 'echo ok' >/dev/null

# ========= REPO HOLEN/UPDATEN (mit Reset, damit nie lokale Änderungen blockieren) =========
echo "==> Repo aktualisieren (Branch: $BRANCH)"
ssh "$REMOTE" "set -e; \
  if [ -d '$REPO_DIR/.git' ]; then \
    cd '$REPO_DIR' && \
    git fetch --all && \
    git checkout '$BRANCH' && \
    git reset --hard origin/'$BRANCH' && \
    git clean -fd && \
    git pull --ff-only; \
  else \
    mkdir -p '$APP_ROOT' && cd '$APP_ROOT' && git clone '$REPO_SSH'; \
    cd '$REPO_DIR' && git checkout '$BRANCH'; \
  fi"

# ========= VERZEICHNISSE SICHERSTELLEN =========
echo '==> Verzeichnisse sicherstellen'
ssh "$REMOTE" "set -e; sudo mkdir -p '$WEBROOT'; sudo chown -R \$USER '$APP_ROOT'"

# ========= PACKAGE-FIXES + INSTALL =========
# - zone.js auf ~0.14.10 (kompatibel zu Angular 18)
# - ngx-socket-io auf 4.6.0 (peer-Konflikte umgehen; falls weiterhin Konflikte, wird legacy-peer-deps genutzt)
# - @auth0/angular-jwt sicherstellen
# - ggf. fehlerhaften 'zone': { js: ... } Eintrag entfernen
echo '==> Package-Fixes anwenden und Dependencies installieren'
ssh "$REMOTE" "set -e; cd '$FRONTEND_DIR'; \
  npm pkg set 'dependencies.zone.js=~0.14.10'; \
  npm pkg set 'dependencies.ngx-socket-io=4.6.0'; \
  npm pkg set 'dependencies.@auth0/angular-jwt=^5.2.0'; \
  node -e \"const fs=require('fs');const p=require('./package.json'); if(p.dependencies && p.dependencies.zone){delete p.dependencies.zone;} fs.writeFileSync('package.json', JSON.stringify(p,null,2));\"; \
  node -e \"const p=require('./package.json'); console.log('zone.js aktuell:', p.dependencies['zone.js']); console.log('ngx-socket-io aktuell:', p.dependencies['ngx-socket-io']); console.log('angular-jwt aktuell:', p.dependencies['@auth0/angular-jwt']);\"; \
  rm -rf node_modules package-lock.json; \
  npm config set registry 'https://registry.npmjs.org/'; \
  npm cache clean --force; \
  npm install --legacy-peer-deps"

# ========= BUILD =========
echo '==> Build (production)'
ssh "$REMOTE" "set -e; cd '$FRONTEND_DIR'; npx ng build --configuration=production"

# ========= DEPLOY =========
# Dein Build schreibt direkt nach Frontend/www (nicht dist/*). Deshalb von www deployen.
echo "==> Deploy nach $WEBROOT (rsync --delete)"
ssh "$REMOTE" "set -e; rsync -av --delete '$FRONTEND_DIR'/www/ '$WEBROOT'/"

# ========= WEBSERVER RELOAD =========
echo '==> Webserver reload'
ssh "$REMOTE" "set -e; \
  if systemctl is-active --quiet nginx; then sudo systemctl reload nginx; \
  elif systemctl is-active --quiet apache2; then sudo systemctl reload apache2; \
  else echo 'Hinweis: Kein nginx/apache2 aktiv'; fi"

echo '==> Deploy fertig.'
