const express = require("express");
const auditService = require("../service/audit.service");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

// ==========================================
// AUDIT-LOG ROUTES
// ==========================================

/**
 * GET /api/audit-logs
 * Ruft alle Audit-Logs mit Filteroptionen ab
 * Query-Parameter:
 * - startDate: ISO-String (optional)
 * - endDate: ISO-String (optional)
 * - entityType: "Post" | "Alert" | "User" | "Attachment" (optional)
 * - action: "status_changed" | "comment_added" | ... (optional)
 * - userId: ObjectId (optional)
 * - limit: Number (default: 100, max: 1000)
 * - skip: Number (default: 0)
 */
router.get("/", checkAuth, async (req, res) => {
  try {
    const { startDate, endDate, entityType, action, userId, limit, skip } = req.query;

    const result = await auditService.getAllAuditLogs({
      startDate,
      endDate,
      entityType,
      action,
      userId,
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0,
    });

    res.status(200).json({
      success: true,
      message: "Audit-Logs erfolgreich geladen",
      logs: result.logs,
      pagination: {
        total: result.total,
        limit: result.limit,
        skip: result.skip,
        hasMore: result.skip + result.logs.length < result.total,
      },
    });
  } catch (error) {
    console.error("❌ Fehler beim Laden der Audit-Logs:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Audit-Logs",
      error: error.message,
    });
  }
});

/**
 * GET /api/audit-logs/entity/:entityType/:entityId
 * Ruft Audit-Logs für eine bestimmte Entity ab
 */
router.get("/entity/:entityType/:entityId", checkAuth, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const logs = await auditService.getAuditLogs({
      entityType,
      entityId,
      limit,
    });

    res.status(200).json({
      success: true,
      message: `Audit-Logs für ${entityType} erfolgreich geladen`,
      logs,
    });
  } catch (error) {
    console.error("❌ Fehler beim Laden der Entity-Logs:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Entity-Logs",
      error: error.message,
    });
  }
});

/**
 * GET /api/audit-logs/stats
 * Ruft Statistiken über Audit-Logs ab
 */
router.get("/stats", checkAuth, async (req, res) => {
  try {
    const AuditLog = require("../models/audit-log");

    // Gesamtanzahl
    const total = await AuditLog.countDocuments();

    // Nach Action gruppieren
    const byAction = await AuditLog.aggregate([{ $group: { _id: "$action", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);

    // Nach EntityType gruppieren
    const byEntityType = await AuditLog.aggregate([{ $group: { _id: "$entityType", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);

    // Letzte 24 Stunden
    const last24h = await AuditLog.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    // Top Users
    const topUsers = await AuditLog.aggregate([{ $group: { _id: "$username", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        last24h,
        byAction,
        byEntityType,
        topUsers,
      },
    });
  } catch (error) {
    console.error("❌ Fehler beim Laden der Statistiken:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Statistiken",
      error: error.message,
    });
  }
});

module.exports = router;
