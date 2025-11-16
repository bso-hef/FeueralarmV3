const Alert = require("../models/alert");
const Post = require("../models/post");

exports.exportAlarmCSV = async (req, res) => {
  try {
    const alarmId = req.params.id;
    const username = req.userData.username;

    console.log(`📊 CSV-Export angefordert für Alarm ${alarmId} von User: ${username}`);

    // TODO: In UAP 6.3.2 implementieren
    res.status(501).json({
      success: false,
      message: "CSV-Export wird in UAP 6.3.2 implementiert",
      info: {
        alarmId,
        requestedBy: username,
        requestedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ CSV-Export Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim CSV-Export",
      error: error.message,
    });
  }
};

// ==========================================
// PDF EXPORT
// ==========================================

/**
 * Exportiert einen einzelnen Alarm als PDF
 * Route: GET /api/export/alarms/:id/pdf
 */
exports.exportAlarmPDF = async (req, res) => {
  try {
    const alarmId = req.params.id;
    const username = req.userData.username;

    console.log(`📄 PDF-Export angefordert für Alarm ${alarmId} von User: ${username}`);

    // TODO: In UAP 6.3.2 implementieren
    res.status(501).json({
      success: false,
      message: "PDF-Export wird in UAP 6.3.2 implementiert",
      info: {
        alarmId,
        requestedBy: username,
        requestedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ PDF-Export Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim PDF-Export",
      error: error.message,
    });
  }
};

// ==========================================
// JSON EXPORT
// ==========================================

/**
 * Exportiert einen einzelnen Alarm als JSON
 * Route: GET /api/export/alarms/:id/json
 */
exports.exportAlarmJSON = async (req, res) => {
  try {
    const alarmId = req.params.id;
    const username = req.userData.username;

    console.log(`📋 JSON-Export angefordert für Alarm ${alarmId} von User: ${username}`);

    // Lade Alarm-Daten
    const alarm = await Alert.findById(alarmId).lean();
    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm nicht gefunden",
      });
    }

    const posts = await Post.find({ alert: alarmId }).lean();

    // JSON-Export ist einfach - funktioniert bereits!
    const exportData = {
      export: {
        format: "JSON",
        timestamp: new Date().toISOString(),
        exportedBy: username,
        userId: req.userData.userId,
      },
      alarm,
      posts,
      statistics: {
        total: posts.length,
        complete: posts.filter((p) => p.status === "complete").length,
        incomplete: posts.filter((p) => p.status === "incomplete").length,
        undefined: posts.filter((p) => !p.status || p.status === "undefined").length,
      },
    };

    // Dateiname für Download
    const timestamp = new Date(alarm.created).toISOString().slice(0, 16).replace(/:/g, "-");
    const filename = `Feueralarm_${timestamp}.json`;

    // Response Headers für Download
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.json(exportData);

    console.log(`✅ JSON-Export erfolgreich: ${filename}`);
  } catch (error) {
    console.error("❌ JSON-Export Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim JSON-Export",
      error: error.message,
    });
  }
};

// ==========================================
// ALLE ALARME ALS CSV
// ==========================================

/**
 * Exportiert alle Alarme als CSV-Übersicht
 * Route: GET /api/export/alarms/all/csv
 */
exports.exportAllAlarmsCSV = async (req, res) => {
  try {
    const username = req.userData.username;

    console.log(`📊 CSV-Export aller Alarme angefordert von User: ${username}`);

    // TODO: In UAP 6.3.2 implementieren
    res.status(501).json({
      success: false,
      message: "CSV-Export aller Alarme wird in UAP 6.3.2 implementiert",
      info: {
        requestedBy: username,
        requestedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ CSV-Export Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim CSV-Export",
      error: error.message,
    });
  }
};

// ==========================================
// AKTIVE ALARME ALS CSV
// ==========================================

/**
 * Exportiert nur aktive Alarme als CSV
 * Route: GET /api/export/alarms/active/csv
 */
exports.exportActiveAlarmsCSV = async (req, res) => {
  try {
    const username = req.userData.username;

    console.log(`📊 CSV-Export aktiver Alarme angefordert von User: ${username}`);

    // TODO: In UAP 6.3.2 implementieren
    res.status(501).json({
      success: false,
      message: "CSV-Export aktiver Alarme wird in UAP 6.3.2 implementiert",
      info: {
        requestedBy: username,
        requestedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ CSV-Export Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim CSV-Export",
      error: error.message,
    });
  }
};

// ==========================================
// ALARM STATISTIKEN
// ==========================================

/**
 * Gibt Statistiken für einen Alarm zurück
 * Route: GET /api/export/alarms/:id/statistics
 */
exports.getAlarmStatistics = async (req, res) => {
  try {
    const alarmId = req.params.id;
    const username = req.userData.username;

    console.log(`📊 Statistik-Abfrage für Alarm ${alarmId} von User: ${username}`);

    const alarm = await Alert.findById(alarmId).lean();
    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm nicht gefunden",
      });
    }

    const posts = await Post.find({ alert: alarmId }).lean();

    const statistics = {
      alarmId: alarm._id,
      created: alarm.created,
      archived: alarm.archived,
      classCount: alarm.classCount,
      posts: {
        total: posts.length,
        complete: posts.filter((p) => p.status === "complete").length,
        incomplete: posts.filter((p) => p.status === "incomplete").length,
        undefined: posts.filter((p) => !p.status || p.status === "undefined").length,
      },
      completionRate: posts.length > 0 ? Math.round((posts.filter((p) => p.status === "complete").length / posts.length) * 100) : 0,
    };

    res.status(200).json({
      success: true,
      statistics,
      queriedBy: username,
      queriedAt: new Date().toISOString(),
    });

    console.log(`✅ Statistiken erfolgreich abgerufen`);
  } catch (error) {
    console.error("❌ Statistik-Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Abrufen der Statistiken",
      error: error.message,
    });
  }
};
