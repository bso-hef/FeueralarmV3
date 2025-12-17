### Deployment

Das Skript "./deploy.sh" führt beim Start automatisch diese Schritte auf der EC2 aus:

1. Erstellt bzw. übernimmt das Zielverzeichnis und setzt korrekte Rechte.
2. Klont das Repo neu oder aktualisiert den angegebenen Branch auf den neuesten Stand (git fetch/reset/clean).
3. Entfernt alte Build-Artefakte (z. B. node_modules, dist, build, .venv).
4. Installiert Abhängigkeiten (Node: pnpm/yarn/npm; Python: venv + pip) und führt den Build aus, falls vorhanden.
5. Startet den systemd-Service der Anwendung neu und zeigt den Status an.

Ergebnis: Die EC2 hat die aktuellste Version des Codes, bereinigt alte Dateien, baut die App und startet sie frisch.

```sh
chmod +x deploy.sh
./deploy.sh
```

Endpoint: 18.193.97.54

```sh
chmod +x frontend.sh
./frontend.sh
```

Restart Frontend:                                                                                                                                           sudo chown -R $USER:$USER /var/www/Deployment/Repository/Frontend
cd /var/www/Deployment/Repository/Frontend
sudo chown -R $USER:$USER www/
sudo chmod -R 755 www/
npx ng build --configuration=production
sudo rsync -av --delete www/ /var/www/Deployment/Webserver/
sudo nginx -t && sudo systemctl reload nginx
ionic build --prod
npm run start

```sh
chmod +x backend.sh
./backend.sh
```

Backend:
mv Openapi.yaml openapi.yaml
pm2 restart backend
pm2 logs backend

Username: admin
Passwort: Admin2024!Secure

18.193.97.54

Username: lehrer4
Passwort: Lehrer2024!

Username: verwaltung Passwort: Verwaltung2024!

123Testing