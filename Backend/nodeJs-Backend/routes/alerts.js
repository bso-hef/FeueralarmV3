const express = require("express");
const AlertController = require("../controllers/alerts");
const checkAuth = require("../middleware/check-auth");
const checkPermission = require("../middleware/check-permission");

const router = express.Router();

// ==========================================
// PUBLIC ROUTES (mit Auth)
// ==========================================

// Alle Alarme abrufen
router.get("/", checkAuth, AlertController.getAllAlerts);

router.get("/current", checkAuth, AlertController.getCurrentAlert);
// Einzelnen Alarm abrufen
router.get("/:id", checkAuth, AlertController.getAlertById);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Alarm löschen (Admin only)
router.delete("/:id", checkAuth, checkPermission, AlertController.deleteAlert);

// Alarm archivieren (Admin only)
router.put("/:id/archive", checkAuth, checkPermission, AlertController.archiveAlert);

module.exports = router;
