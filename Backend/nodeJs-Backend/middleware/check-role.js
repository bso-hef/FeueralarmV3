/**
 * Middleware: Role-basierte Zugriffskontrolle
 *
 * Prüft ob der User eine bestimmte Rolle hat.
 * Muss NACH checkAuth verwendet werden!
 */

/**
 * Prüft ob User Admin ist
 */
const checkAdmin = (req, res, next) => {
  console.log("🔐 checkAdmin: Prüfe Admin-Rolle für User:", req.userData?.username, "Rolle:", req.userData?.role);

  if (!req.userData) {
    return res.status(401).json({
      success: false,
      message: "Nicht authentifiziert",
    });
  }

  if (req.userData.role !== "admin") {
    console.log("❌ Zugriff verweigert: User ist kein Admin");
    return res.status(403).json({
      success: false,
      message: "Zugriff verweigert: Admin-Rechte erforderlich",
    });
  }

  console.log("✅ Admin-Check erfolgreich");
  next();
};

/**
 * Prüft ob User Admin ODER Verwaltung ist
 */
const checkAdminOrVerwaltung = (req, res, next) => {
  console.log("🔐 checkAdminOrVerwaltung: Prüfe Rolle für User:", req.userData?.username, "Rolle:", req.userData?.role);

  if (!req.userData) {
    return res.status(401).json({
      success: false,
      message: "Nicht authentifiziert",
    });
  }

  const allowedRoles = ["admin", "verwaltung"];

  if (!allowedRoles.includes(req.userData.role)) {
    console.log("❌ Zugriff verweigert: User hat Rolle", req.userData.role, "benötigt:", allowedRoles);
    return res.status(403).json({
      success: false,
      message: "Zugriff verweigert: Admin- oder Verwaltungs-Rechte erforderlich",
    });
  }

  console.log("✅ Role-Check erfolgreich für Rolle:", req.userData.role);
  next();
};

/**
 * Generische Role-Check Factory
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    console.log("🔐 checkRole: Prüfe Rollen", allowedRoles, "für User:", req.userData?.username, "Rolle:", req.userData?.role);

    if (!req.userData) {
      return res.status(401).json({
        success: false,
        message: "Nicht authentifiziert",
      });
    }

    if (!allowedRoles.includes(req.userData.role)) {
      console.log("❌ Zugriff verweigert: User hat Rolle", req.userData.role, "benötigt eine von:", allowedRoles);
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert: Eine der folgenden Rollen erforderlich: ${allowedRoles.join(", ")}`,
      });
    }

    console.log("✅ Role-Check erfolgreich für Rolle:", req.userData.role);
    next();
  };
};

module.exports = {
  checkAdmin,
  checkAdminOrVerwaltung,
  checkRole,
};
