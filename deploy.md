### Deployment

Das Skript "./deploy.sh" führt beim Start automatisch diese Schritte auf der EC2 aus:

1. Erstellt bzw. übernimmt das Zielverzeichnis und setzt korrekte Rechte.
2. Klont das Repo neu oder aktualisiert den angegebenen Branch auf den neuesten Stand (git fetch/reset/clean).
3. Entfernt alte Build-Artefakte (z. B. node_modules, dist, build, .venv).
4. Installiert Abhängigkeiten (Node: pnpm/yarn/npm; Python: venv + pip) und führt den Build aus, falls vorhanden.
5. Startet den systemd-Service der Anwendung neu und zeigt den Status an.

Ergebnis: Die EC2 hat die aktuellste Version des Codes, bereinigt alte Dateien, baut die App und startet sie frisch.

```sh
./deploy.sh
```