module.exports = (req, res, next) => {
  try {
    const role = req.userData.role;
    const username = req.userData.username;

    // Rollen die Export-Rechte haben
    // Admin und Verwaltung können exportieren
    const allowedRoles = ["admin", "verwaltung"];

    if (role && allowedRoles.includes(role)) {
      console.log(`✅ Export-Berechtigung gewährt für: ${username} (Rolle: ${role})`);
      next();
    } else {
      console.warn(`⚠️ Export-Zugriff verweigert für: ${username} (Rolle: ${role})`);
      throw new Error(`Rolle '${role}' hat keine Export-Berechtigung`);
    }
  } catch (error) {
    console.error(`❌ Export-Permission Fehler: ${error.message}`);
    res.status(403).json({
      success: false,
      message: "Sie haben keine Berechtigung für Export-Funktionen",
      detail: "Nur Administratoren und Verwaltungspersonal können Daten exportieren",
    });
  }
};

/**
 * Optional: Exportierbare Version für programmatische Checks
 */
module.exports.checkExportPermission = (userData) => {
  try {
    const allowedRoles = ["admin", "verwaltung"];

    if (userData.role && allowedRoles.includes(userData.role)) {
      return {
        hasPermission: true,
        message: "Export-Berechtigung vorhanden",
      };
    } else {
      return {
        hasPermission: false,
        message: "Keine Export-Berechtigung",
      };
    }
  } catch (error) {
    return {
      hasPermission: false,
      message: error.message,
    };
  }
};
