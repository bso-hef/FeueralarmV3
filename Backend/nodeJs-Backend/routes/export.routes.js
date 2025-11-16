const express = require("express");
const ExportController = require("../controllers/export");
const checkAuth = require("../middleware/check-auth");
const checkExportPermission = require("../middleware/check-export-permission");

const router = express.Router();

/**
 * GET /api/export/alarms/:id/csv
 * Exportiert einen einzelnen Alarm als CSV-Datei
 *
 * @requires JWT Token in Authorization Header
 * @requires Role: admin oder verwaltung
 * @param {string} id - Alarm-ID
 * @returns {file} CSV-Datei zum Download
 */
router.get("/alarms/:id/csv", checkAuth, checkExportPermission, ExportController.exportAlarmCSV);

/**
 * GET /api/export/alarms/:id/pdf
 * Exportiert einen einzelnen Alarm als PDF-Datei
 *
 * @requires JWT Token in Authorization Header
 * @requires Role: admin oder verwaltung
 * @param {string} id - Alarm-ID
 * @returns {file} PDF-Datei zum Download
 */
router.get("/alarms/:id/pdf", checkAuth, checkExportPermission, ExportController.exportAlarmPDF);

/**
 * GET /api/export/alarms/:id/json
 * Exportiert einen einzelnen Alarm als JSON-Datei
 *
 * @requires JWT Token in Authorization Header
 * @requires Role: admin oder verwaltung
 * @param {string} id - Alarm-ID
 * @returns {file} JSON-Datei zum Download
 */
router.get("/alarms/:id/json", checkAuth, checkExportPermission, ExportController.exportAlarmJSON);

/**
 * GET /api/export/alarms/all/csv
 * Exportiert alle Alarme als CSV-Übersicht
 *
 * @requires JWT Token in Authorization Header
 * @requires Role: admin oder verwaltung
 * @returns {file} CSV-Datei mit allen Alarmen
 */
router.get("/alarms/all/csv", checkAuth, checkExportPermission, ExportController.exportAllAlarmsCSV);

/**
 * GET /api/export/alarms/active/csv
 * Exportiert nur aktive (nicht archivierte) Alarme als CSV
 *
 * @requires JWT Token in Authorization Header
 * @requires Role: admin oder verwaltung
 * @returns {file} CSV-Datei mit aktiven Alarmen
 */
router.get("/alarms/active/csv", checkAuth, checkExportPermission, ExportController.exportActiveAlarmsCSV);

// ==========================================
// ZUSÄTZLICHE EXPORT-OPTIONEN
// ==========================================

/**
 * GET /api/export/alarms/:id/statistics
 * Gibt Statistiken für einen Alarm als JSON zurück (kein Download)
 *
 * @requires JWT Token in Authorization Header
 * @requires Role: admin oder verwaltung
 * @param {string} id - Alarm-ID
 * @returns {json} Statistik-Daten
 */
router.get("/alarms/:id/statistics", checkAuth, checkExportPermission, ExportController.getAlarmStatistics);

module.exports = router;
