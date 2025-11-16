const Alert = require("../models/alert");
const Post = require("../models/post");
const { convertAlarmToCSV, convertAlarmsOverviewToCSV, generateAlarmPDF, formatDateForFilename } = require("../utils/export-helpers");

// ==========================================
// CSV EXPORT
// ==========================================

/**
 * Exportiert einen einzelnen Alarm als CSV
 * Route: GET /api/export/alarms/:id/csv
 */
exports.exportAlarmCSV = async (req, res) => {
  try {
    const alarmId = req.params.id;
    const username = req.userData.username;

    console.log(`📊 CSV-Export angefordert für Alarm ${alarmId} von User: ${username}`);

    // Lade Alarm
    const alarm = await Alert.findById(alarmId).lean();
    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm nicht gefunden",
      });
    }

    // Lade Posts
    const posts = await Post.find({ alert: alarmId }).sort({ class: 1 }).lean();

    // Konvertiere zu CSV
    const csvData = convertAlarmToCSV(alarm, posts);

    // Dateiname
    const filename = `Feueralarm_${formatDateForFilename(alarm.created)}.csv`;

    // BOM für korrekte Umlaute in Excel
    const csvWithBOM = "\uFEFF" + csvData;

    // Response Headers
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.send(csvWithBOM);

    console.log(`✅ CSV-Export erfolgreich: ${filename}`);
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

    // Lade Alarm
    const alarm = await Alert.findById(alarmId).lean();
    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm nicht gefunden",
      });
    }

    // Lade Posts
    const posts = await Post.find({ alert: alarmId }).sort({ class: 1 }).lean();

    // Generiere PDF
    const pdfBuffer = await generateAlarmPDF(alarm, posts);

    // Dateiname
    const filename = `Feueralarm_${formatDateForFilename(alarm.created)}.pdf`;

    // Response Headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);

    console.log(`✅ PDF-Export erfolgreich: ${filename}`);
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

    // Lade Alarm
    const alarm = await Alert.findById(alarmId).lean();
    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm nicht gefunden",
      });
    }

    // Lade Posts
    const posts = await Post.find({ alert: alarmId }).lean();

    // Export-Daten zusammenstellen
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

    // Dateiname
    const timestamp = formatDateForFilename(alarm.created);
    const filename = `Feueralarm_${timestamp}.json`;

    // Response Headers
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

    // Lade alle Alarme
    const alarms = await Alert.find().sort({ created: -1 }).lean();

    if (alarms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Keine Alarme gefunden",
      });
    }

    // Konvertiere zu CSV
    const csvData = convertAlarmsOverviewToCSV(alarms);

    // Dateiname
    const now = new Date();
    const filename = `Feueralarm_Übersicht_${formatDateForFilename(now.toISOString())}.csv`;

    // BOM für korrekte Umlaute
    const csvWithBOM = "\uFEFF" + csvData;

    // Response Headers
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.send(csvWithBOM);

    console.log(`✅ CSV-Export aller Alarme erfolgreich: ${filename}`);
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

    // Lade nur aktive Alarme
    const alarms = await Alert.find({ archived: false }).sort({ created: -1 }).lean();

    if (alarms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Keine aktiven Alarme gefunden",
      });
    }

    // Konvertiere zu CSV
    const csvData = convertAlarmsOverviewToCSV(alarms);

    // Dateiname
    const now = new Date();
    const filename = `Feueralarm_Aktiv_${formatDateForFilename(now.toISOString())}.csv`;

    // BOM für korrekte Umlaute
    const csvWithBOM = "\uFEFF" + csvData;

    // Response Headers
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.send(csvWithBOM);

    console.log(`✅ CSV-Export aktiver Alarme erfolgreich: ${filename}`);
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

    // Lade Alarm
    const alarm = await Alert.findById(alarmId).lean();
    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm nicht gefunden",
      });
    }

    // Lade Posts
    const posts = await Post.find({ alert: alarmId }).lean();

    // Berechne Statistiken
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
