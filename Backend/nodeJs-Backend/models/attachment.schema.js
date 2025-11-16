const mongoose = require("mongoose");

/**
 * Attachment Schema
 * Für Fotos, Dokumente und Notizen
 */
const attachmentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["photo", "document", "note"],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    key: {
      type: String, // S3 Key für Löschung
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
    },
    size: {
      type: Number, // in Bytes
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: String, // User ID
    },
  },
  { _id: false }
);

module.exports = { attachmentSchema };
