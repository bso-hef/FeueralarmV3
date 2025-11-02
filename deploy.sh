#!/usr/bin/env bash
# Ein-Knopf-Deploy: Git-Pull auf EC2, Cleanup, Build, Service-Restart
# Usage: ./deploy.sh
set -euo pipefail

# ==== KONFIGURATION (anpassen) ====
REMOTE="my-ec2"                                    # SSH-Alias (siehe ~/.ssh/config)
APP_DIR="/var/www/feueralarm"                      # Zielpfad auf EC2
BRANCH="main"                                      # Branch
REPO_URL="git@github.com:MarlonH05/FeueralarmV3.git"            # SSH-Repo-URL (z. B. git@github.com:ORG/REPO.git)
SERVICE_NAME="feueralarm"                          # systemd-Service-Name (z. B. feueralarm)

# ==== SAFETY CHECKS ====
echo "[0/6] Checks..."
# Prüfen, dass der Alias auflösbar ist
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$REMOTE" "echo ok" >/dev/null 2>&1; then
  echo "SSH-Alias '$REMOTE' nicht erreichbar. Prüfe ~/.ssh/config (User, HostName, IdentityFile)."
  echo "Tipp: Teste manuell: ssh $REMOTE"
  exit 1
fi

echo "[1/6] Zielverzeichnis vorbereiten..."
ssh "$REMOTE" "sudo mkdir -p \"$APP_DIR\" && sudo chown -R \$USER \"$APP_DIR\""


if ssh "$REMOTE" "[ -d '$APP_DIR/.git' ]"; then
  echo "[2/6] Repo vorhanden – Update ($BRANCH)..."
  ssh "$REMOTE" "cd '$APP_DIR' && git fetch --all && git reset --hard origin/$BRANCH && git clean -fd"
else
echo "[2/6] Frischer Clone von $REPO_URL ($BRANCH)..."
ssh "$REMOTE" "sudo rm -rf \"$APP_DIR\" && sudo mkdir -p \"$APP_DIR\" && sudo chown -R \$USER \"$APP_DIR\""
ssh "$REMOTE" "git clone --branch \"$BRANCH\" \"$REPO_URL\" \"$APP_DIR\""

fi

echo "[3/6] Alte Artefakte löschen..."
ssh "$REMOTE" "cd '$APP_DIR' && rm -rf node_modules dist build .venv .cache || true"

echo "[4/6] Dependencies installieren..."
ssh "$REMOTE" "cd '$APP_DIR' && \
  if [ -f package.json ]; then \
    if command -v pnpm >/dev/null 2>&1; then pnpm i; \
    elif command -v yarn >/dev/null 2>&1; then yarn; \
    else npm ci; fi; \
  fi && \
  if [ -f requirements.txt ]; then \
    python3 -m venv .venv && . .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt; \
  fi"

echo "[5/6] Build (falls vorhanden)..."
ssh "$REMOTE" "cd '$APP_DIR' && [ -f package.json ] && npm run build || true"

echo "[6/6] Service neu starten..."
ssh "$REMOTE" "sudo systemctl daemon-reload || true; sudo systemctl restart '$SERVICE_NAME' || true; sudo systemctl status '$SERVICE_NAME' --no-pager || true"

echo "✅ Deploy abgeschlossen."
