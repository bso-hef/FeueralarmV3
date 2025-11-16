const AuditLog = require("../models/audit-log");

/**
 * UAP 9.3.1: Audit-Logging Service
 * Zentrale Funktionalität zum Loggen von Änderungen
 */

/**
 * Loggt eine Status-Änderung
 * @param {Object} params
 * @param {String} params.userId - ID des Users der die Änderung vorgenommen hat
 * @param {String} params.username - Username des Users
 * @param {String} params.entityType - Typ der Entity (Post, Alert, etc.)
 * @param {String} params.entityId - ID der Entity
 * @param {String} params.action - Art der Änderung
 * @param {Object} params.changes - Details der Änderung (field, oldValue, newValue)
 * @param {Object} params.metadata - Zusätzliche Metadaten
 */
async function logChange({ userId, username, entityType, entityId, action, changes, metadata = {} }) {
  try {
    const auditEntry = await AuditLog.create({
      userId,
      username,
      timestamp: new Date(),
      entityType,
      entityId,
      action,
      changes,
      metadata,
    });

    console.log(`✅ Audit-Log erstellt: ${action} von ${username} auf ${entityType} ${entityId}`);
    return auditEntry;
  } catch (error) {
    console.error("❌ Fehler beim Erstellen des Audit-Logs:", error);
    // Wir werfen den Fehler NICHT weiter, damit die eigentliche Aktion nicht fehlschlägt
    // Audit-Logging sollte nicht-blockierend sein
    return null;
  }
}

/**
 * Loggt eine Status-Änderung an einem Post
 */
async function logStatusChange({ userId, username, postId, oldStatus, newStatus, alertId, className, classNumber }) {
  return logChange({
    userId,
    username,
    entityType: "Post",
    entityId: postId,
    action: "status_changed",
    changes: {
      field: "status",
      oldValue: oldStatus,
      newValue: newStatus,
    },
    metadata: {
      alertId,
      className,
      classNumber,
    },
  });
}

/**
 * Loggt eine Kommentar-Änderung
 */
async function logCommentChange({ userId, username, postId, oldComment, newComment, action, alertId, className, classNumber }) {
  return logChange({
    userId,
    username,
    entityType: "Post",
    entityId: postId,
    action: action || "comment_updated",
    changes: {
      field: "comment",
      oldValue: oldComment,
      newValue: newComment,
    },
    metadata: {
      alertId,
      className,
      classNumber,
    },
  });
}

/**
 * Loggt die Erstellung eines Alarms
 */
async function logAlertCreated({ userId, username, alertId, classCount }) {
  return logChange({
    userId,
    username,
    entityType: "Alert",
    entityId: alertId,
    action: "alert_created",
    changes: {
      field: "created",
      oldValue: null,
      newValue: "created",
    },
    metadata: {
      classCount,
    },
  });
}

/**
 * Loggt das Archivieren eines Alarms
 */
async function logAlertArchived({ userId, username, alertId }) {
  return logChange({
    userId,
    username,
    entityType: "Alert",
    entityId: alertId,
    action: "alert_archived",
    changes: {
      field: "archived",
      oldValue: false,
      newValue: true,
    },
  });
}

/**
 * Ruft Audit-Logs für eine bestimmte Entity ab
 */
async function getAuditLogs({ entityType, entityId, limit = 100 }) {
  try {
    const logs = await AuditLog.find({
      entityType,
      entityId,
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate("userId", "username role")
      .lean();

    return logs;
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Audit-Logs:", error);
    return [];
  }
}

/**
 * Ruft alle Audit-Logs mit Filter ab (für Admin-Ansicht)
 */
async function getAllAuditLogs({ startDate, endDate, entityType, action, userId, limit = 1000, skip = 0 }) {
  try {
    const filter = {};

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    if (entityType) filter.entityType = entityType;
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(limit).skip(skip).populate("userId", "username role").lean();

    const total = await AuditLog.countDocuments(filter);

    return {
      logs,
      total,
      limit,
      skip,
    };
  } catch (error) {
    console.error("❌ Fehler beim Abrufen aller Audit-Logs:", error);
    return { logs: [], total: 0, limit, skip };
  }
}

module.exports = {
  logChange,
  logStatusChange,
  logCommentChange,
  logAlertCreated,
  logAlertArchived,
  getAuditLogs,
  getAllAuditLogs,
};
