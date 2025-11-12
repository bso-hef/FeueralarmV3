# User Management API - Installation

## 📁 Dateien ersetzen

Ersetze die folgenden Dateien in deinem Backend:

1. **`controllers/users.js`** → Ersetze mit `users-controller.js`
2. **`routes/users.js`** → Ersetze mit `users-routes.js`

## 🔧 Verzeichnisstruktur

Stelle sicher, dass deine Struktur so aussieht:

```
backend/
├── controllers/
│   └── users.js          ← Neue Version
├── middleware/
│   ├── check-auth.js     ← Bereits vorhanden ✓
│   └── check-permission.js ← Bereits vorhanden ✓
├── models/
│   └── user.js           ← Bereits vorhanden ✓
├── routes/
│   └── users.js          ← Neue Version
├── app.js                ← Bereits vorhanden ✓
└── server.js             ← Bereits vorhanden ✓
```

## ✅ Neue API Endpoints

Nach der Installation hast du folgende Endpoints:

### Public (ohne Auth):
```
POST   /api/users/signup        - Neuen User registrieren
POST   /api/users/login         - Login
POST   /api/users/create-admin  - Admin erstellen (mit Secret)
```

### Protected (mit Auth + Admin):
```
GET    /api/users               - Alle User abrufen
GET    /api/users/:id           - Einzelnen User abrufen
PUT    /api/users/:id           - User bearbeiten
DELETE /api/users/:id           - User löschen
```

## 🔐 Environment Variable (Optional)

Füge zu deiner `.env` Datei hinzu:

```env
ADMIN_SECRET=dein-geheimes-secret-hier
```

Falls nicht gesetzt, wird `supersecret123` als Default verwendet.

## 🧪 Testen

### 1. Server neu starten:
```bash
npm run dev
```

### 2. Test im Frontend:
1. Logge dich als Admin ein
2. Klicke auf das People-Icon
3. Du solltest jetzt die User-Liste sehen!

## 📝 API Beispiele

### Alle User abrufen:
```bash
GET http://18.193.97.54/api/users
Authorization: Bearer <dein-token>
```

**Response:**
```json
{
  "message": "Users fetched successfully",
  "users": [
    {
      "_id": "...",
      "username": "admin",
      "role": "admin"
    },
    {
      "_id": "...",
      "username": "lehrer1",
      "role": "user"
    }
  ],
  "count": 2
}
```

### User erstellen:
```bash
POST http://18.193.97.54/api/users/signup
Authorization: Bearer <dein-admin-token>
Content-Type: application/json

{
  "username": "neuerlehrer",
  "password": "Passwort123!",
  "role": "user"
}
```

### User bearbeiten:
```bash
PUT http://18.193.97.54/api/users/<user-id>
Authorization: Bearer <dein-admin-token>
Content-Type: application/json

{
  "username": "neuer-name",
  "role": "admin"
}
```

### User löschen:
```bash
DELETE http://18.193.97.54/api/users/<user-id>
Authorization: Bearer <dein-admin-token>
```

## 🔒 Sicherheit

- ✅ Alle Admin-Routen sind mit `checkAuth` + `checkPermission` geschützt
- ✅ Passwörter werden mit bcrypt gehasht (10 Runden)
- ✅ Passwörter werden NIE in API-Responses zurückgegeben
- ✅ User kann sich nicht selbst löschen
- ✅ Usernames müssen unique sein

## 🐛 Troubleshooting

### "Cannot GET /api/users" (404)
→ Stelle sicher dass die neue `routes/users.js` korrekt eingebunden ist

### "You have no permission" (401)
→ Du bist nicht als Admin eingeloggt. Melde dich mit Admin-Credentials an.

### "User already exists" (409)
→ Der Username existiert bereits. Wähle einen anderen.

## 📦 Was wurde geändert?

### Controller (`controllers/users.js`):
- ✅ `getAllUsers()` - Alle User abrufen
- ✅ `getUser()` - Einzelnen User abrufen
- ✅ `createUserByAdmin()` - User erstellen (Admin)
- ✅ `updateUser()` - User bearbeiten
- ✅ `deleteUser()` - User löschen
- ✅ `createAdminUser()` - Admin erstellen mit Secret

### Routes (`routes/users.js`):
- ✅ `GET /` - Alle User
- ✅ `GET /:id` - Einzelner User
- ✅ `PUT /:id` - User bearbeiten
- ✅ `DELETE /:id` - User löschen
- ✅ Admin-Middleware auf allen geschützten Routen

## 🚀 Deployment

Nach dem Update auf dem Server:

```bash
# SSH auf Server
ssh user@18.193.97.54

# Zum Backend-Verzeichnis
cd /pfad/zu/deinem/backend

# Dateien hochladen
# (mit scp oder git pull)

# Server neu starten
pm2 restart all
# oder
npm run prod
```