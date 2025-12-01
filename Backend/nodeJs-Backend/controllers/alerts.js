const Alert = require("../models/alert");
const Post = require("../models/post");
const auditService = require("../service/audit.service");

// ==========================================
// ALLE ALARME ABRUFEN
// ==========================================
exports.getAllAlerts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const alerts = await Alert.find()
      .sort({ created: -1 }) // Neueste zuerst
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Alert.countDocuments();

    res.status(200).json({
      success: true,
      message: "Alarme erfolgreich geladen",
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Fehler beim Laden der Alarme:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Alarme",
      error: error.message,
    });
  }
};
exports.getCurrentAlert = async (req, res) => {
  try {
    const alert = await Alert.findOne({ archived: false }).sort({ created: -1 }).lean();

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Kein aktiver Alarm gefunden",
      });
    }

    res.status(200).json({
      success: true,
      message: "Aktueller Alarm gefunden",
      alert,
    });
  } catch (error) {
    console.error("❌ Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Serverfehler",
    });
  }
};

// ==========================================
// EINZELNEN ALARM ABRUFEN
// ==========================================
exports.getAlertById = async (req, res) => {
  try {
    const alertId = req.params.id;

    const alert = await Alert.findById(alertId).lean();

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alarm nicht gefunden",
      });
    }

    // Posts für diesen Alarm laden
    const posts = await Post.find({ alert: alertId }).sort({ class: 1 }).lean();

    res.status(200).json({
      success: true,
      alert,
      posts,
    });
  } catch (error) {
    console.error("❌ Fehler beim Laden des Alarms:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden des Alarms",
      error: error.message,
    });
  }
};

// ==========================================
// ALARM LÖSCHEN
// ==========================================
exports.deleteAlert = async (req, res) => {
  try {
    const alertId = req.params.id;

    // Prüfe ob Alarm existiert
    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alarm nicht gefunden",
      });
    }

    // Lösche alle Posts des Alarms
    await Post.deleteMany({ alert: alertId });

    // Lösche Alarm
    await Alert.findByIdAndDelete(alertId);

    res.status(200).json({
      success: true,
      message: "Alarm und zugehörige Posts gelöscht",
    });
  } catch (error) {
    console.error("❌ Fehler beim Löschen:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Löschen des Alarms",
      error: error.message,
    });
  }
};

// ==========================================
// ALARM ARCHIVIEREN
// ==========================================
exports.archiveAlert = async (req, res) => {
  try {
    const alertId = req.params.id;

    const alert = await Alert.findByIdAndUpdate(alertId, { archived: true, updated: new Date() }, { new: true });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alarm nicht gefunden",
      });
    }

    // UAP 9.3.1: Audit-Logging für Archivierung
    if (req.userData) {
      await auditService.logAlertArchived({
        userId: req.userData.userId,
        username: req.userData.username,
        alertId: alert._id,
      });
    }

    res.status(200).json({
      success: true,
      message: "Alarm archiviert",
      alert,
    });
  } catch (error) {
    console.error("❌ Fehler beim Archivieren:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Archivieren",
      error: error.message,
    });
  }
};

// ==========================================
// STATISTIKEN AKTUALISIEREN (Helper)
// ==========================================
exports.updateAlertStats = async (alertId) => {
  try {
    const posts = await Post.find({ alert: alertId });

    const stats = {
      total: posts.length,
      complete: posts.filter((p) => p.status === "complete").length,
      incomplete: posts.filter((p) => p.status === "incomplete").length,
      undefined: posts.filter((p) => !p.status || p.status === "undefined").length,
    };

    await Alert.findByIdAndUpdate(alertId, { stats, updated: new Date() });

    console.log(`📊 Stats updated for alert ${alertId}:`, stats);
    return stats;
  } catch (error) {
    console.error("❌ Fehler beim Update der Stats:", error);
    return null;
  }
};
