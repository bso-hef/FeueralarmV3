module.exports = (req, res, next) => {
  try {
    const role = req.userData.role;
    const username = req.userData.username;

    // Erlaubte Rollen
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
