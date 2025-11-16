/**
 * UAP 6.3.1: Export Routes mit Authentifizierung
 * UAP 6.3.2: Export-Formate (CSV, PDF, JSON)
 */

const express = require("express");
const ExportController = require("../controllers/export");
const checkAuth = require("../middleware/check-auth");
const checkExportPermission = require("../middleware/check-export-permission");

const router = express.Router();

// CSV Export
router.get("/alarms/:id/csv", checkAuth, checkExportPermission, ExportController.exportAlarmCSV);

// PDF Export
router.get("/alarms/:id/pdf", checkAuth, checkExportPermission, ExportController.exportAlarmPDF);

// JSON Export
router.get("/alarms/:id/json", checkAuth, checkExportPermission, ExportController.exportAlarmJSON);

// Alle Alarme als CSV
router.get("/alarms/all/csv", checkAuth, checkExportPermission, ExportController.exportAllAlarmsCSV);

// Aktive Alarme als CSV
router.get("/alarms/active/csv", checkAuth, checkExportPermission, ExportController.exportActiveAlarmsCSV);

// Statistiken
router.get("/alarms/:id/statistics", checkAuth, checkExportPermission, ExportController.getAlarmStatistics);

module.exports = router;
