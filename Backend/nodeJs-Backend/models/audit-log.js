const mongoose = require("mongoose");

/**
 * UAP 9.3.1: Audit-Log Model
 * Dokumentiert wer wann welchen Status gesetzt hat
 */
const auditLogSchema = mongoose.Schema({
  // Wer hat die Änderung vorgenommen
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  username: {
    type: String,
    required: true,
  },

  // Wann wurde die Änderung vorgenommen
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true, // Index für schnellere Abfragen
  },

  // Was wurde geändert
  entityType: {
    type: String,
    enum: ["Post", "Alert", "User", "Attachment"],
    required: true,
    index: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  // Welche Aktion wurde durchgeführt
  action: {
    type: String,
    enum: ["status_changed", "comment_added", "comment_updated", "alert_created", "alert_archived", "attachment_added", "attachment_deleted"],
    required: true,
  },

  // Details der Änderung
  changes: {
    field: { type: String }, // z.B. "status", "comment"
    oldValue: { type: mongoose.Schema.Types.Mixed }, // Alter Wert
    newValue: { type: mongoose.Schema.Types.Mixed }, // Neuer Wert
  },

  // Zusätzliche Metadaten (z.B. Alert-ID bei Posts)
  metadata: {
    alertId: { type: mongoose.Schema.Types.ObjectId, ref: "Alert" },
    className: { type: String },
    classNumber: { type: String },
  },
});

// Compound Index für effiziente Abfragen nach Entity
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
