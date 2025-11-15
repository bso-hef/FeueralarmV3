const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const s3Service = require("../services/s3.service");
const Post = require("../models/Post"); // Dein Teacher/Post Model

/**
 * POST /api/teachers/:id/photos
 * Upload ein Foto für einen Teacher
 */
router.post("/:id/photos", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { photo, filename } = req.body;

    if (!photo) {
      return res.status(400).json({
        success: false,
        error: "Kein Foto bereitgestellt",
      });
    }

    // Base64 zu Buffer konvertieren
    const photoBuffer = Buffer.from(photo, "base64");

    // Upload zu S3
    const uploadResult = await s3Service.uploadPhoto(photoBuffer, filename || `photo_${Date.now()}.jpg`);

    // Speichere Attachment in MongoDB
    const attachment = {
      id: require("uuid").v4(),
      type: "photo",
      url: uploadResult.url,
      key: uploadResult.key,
      filename: filename || "photo.jpg",
      mimeType: "image/jpeg",
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user.userId,
    };

    // Update Post/Teacher mit neuem Attachment
    await Post.findByIdAndUpdate(id, {
      $push: { attachments: attachment },
    });

    console.log("✅ Foto hochgeladen:", uploadResult.url);

    res.json({
      success: true,
      url: uploadResult.url,
      filename: attachment.filename,
      attachment,
    });
  } catch (error) {
    console.error("❌ Fehler beim Foto-Upload:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Fehler beim Hochladen",
    });
  }
});

/**
 * POST /api/teachers/:id/files
 * Upload eine Datei für einen Teacher
 */
router.post("/:id/files", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { file, filename, mimeType } = req.body;

    if (!file || !filename) {
      return res.status(400).json({
        success: false,
        error: "Datei oder Filename fehlt",
      });
    }

    // Base64 zu Buffer konvertieren
    const fileBuffer = Buffer.from(file, "base64");

    // Upload zu S3
    const uploadResult = await s3Service.uploadDocument(fileBuffer, filename);

    // Bestimme Type basierend auf Dateiendung
    const ext = filename.split(".").pop()?.toLowerCase();
    const type = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? "photo" : ext === "txt" ? "note" : "document";

    // Speichere Attachment in MongoDB
    const attachment = {
      id: require("uuid").v4(),
      type,
      url: uploadResult.url,
      key: uploadResult.key,
      filename,
      mimeType: mimeType || s3Service.getMimeTypeFromFilename(filename),
      size: fileBuffer.length,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user.userId,
    };

    // Update Post/Teacher mit neuem Attachment
    await Post.findByIdAndUpdate(id, {
      $push: { attachments: attachment },
    });

    console.log("✅ Datei hochgeladen:", uploadResult.url);

    res.json({
      success: true,
      url: uploadResult.url,
      filename: attachment.filename,
      attachment,
    });
  } catch (error) {
    console.error("❌ Fehler beim Datei-Upload:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Fehler beim Hochladen",
    });
  }
});

/**
 * GET /api/teachers/:id/attachments
 * Lade alle Attachments für einen Teacher
 */
router.get("/:id/attachments", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Teacher nicht gefunden",
      });
    }

    res.json({
      success: true,
      attachments: post.attachments || [],
    });
  } catch (error) {
    console.error("❌ Fehler beim Laden der Attachments:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Fehler beim Laden",
    });
  }
});

/**
 * DELETE /api/teachers/:id/attachments/:attachmentId
 * Lösche ein Attachment
 */
router.delete("/:id/attachments/:attachmentId", authenticateToken, async (req, res) => {
  try {
    const { id, attachmentId } = req.params;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Teacher nicht gefunden",
      });
    }

    // Finde Attachment
    const attachment = post.attachments?.find((a) => a.id === attachmentId);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: "Attachment nicht gefunden",
      });
    }

    // Lösche aus S3
    if (attachment.key) {
      await s3Service.deleteFile(attachment.key);
    }

    // Entferne aus MongoDB
    await Post.findByIdAndUpdate(id, {
      $pull: { attachments: { id: attachmentId } },
    });

    console.log("✅ Attachment gelöscht:", attachmentId);

    res.json({
      success: true,
      message: "Attachment erfolgreich gelöscht",
    });
  } catch (error) {
    console.error("❌ Fehler beim Löschen:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Fehler beim Löschen",
    });
  }
});

module.exports = router;
