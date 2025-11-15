const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

/**
 * AWS S3 Upload Service
 *
 * Handles file uploads to AWS S3 bucket
 * Supports: Photos, Documents, Notes
 */

class S3Service {
  constructor() {
    // AWS S3 Configuration
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "eu-central-1",
    });

    this.bucketName = process.env.AWS_S3_BUCKET_NAME || "feueralarm-attachments";
    this.cdnUrl = process.env.AWS_CDN_URL || `https://${this.bucketName}.s3.${process.env.AWS_REGION || "eu-central-1"}.amazonaws.com`;
  }

  /**
   * Upload a file to S3
   * @param {Buffer} fileBuffer - File content as Buffer
   * @param {string} filename - Original filename
   * @param {string} mimeType - MIME type
   * @param {string} folder - S3 folder (e.g., 'photos', 'documents', 'notes')
   * @returns {Promise<{url: string, key: string}>}
   */
  async uploadFile(fileBuffer, filename, mimeType, folder = "attachments") {
    try {
      const fileExtension = this.getFileExtension(filename);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const key = `${folder}/${uniqueFilename}`;

      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: "public-read", // Make file publicly accessible
        Metadata: {
          originalName: filename,
          uploadDate: new Date().toISOString(),
        },
      };

      console.log("📤 Uploading to S3:", key);

      const result = await this.s3.upload(params).promise();

      console.log("✅ Upload successful:", result.Location);

      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
      };
    } catch (error) {
      console.error("❌ S3 Upload Error:", error);
      throw new Error(`S3 Upload fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Upload a photo (JPEG/PNG)
   * @param {Buffer} photoBuffer - Photo as Buffer
   * @param {string} filename - Original filename
   * @returns {Promise<{url: string, key: string}>}
   */
  async uploadPhoto(photoBuffer, filename = "photo.jpg") {
    const mimeType = this.getMimeTypeFromFilename(filename);
    return this.uploadFile(photoBuffer, filename, mimeType, "photos");
  }

  /**
   * Upload a document (PDF, DOCX, TXT, etc.)
   * @param {Buffer} fileBuffer - Document as Buffer
   * @param {string} filename - Original filename
   * @returns {Promise<{url: string, key: string}>}
   */
  async uploadDocument(fileBuffer, filename) {
    const mimeType = this.getMimeTypeFromFilename(filename);
    return this.uploadFile(fileBuffer, filename, mimeType, "documents");
  }

  /**
   * Upload a text note
   * @param {string} noteContent - Text content
   * @param {string} title - Note title
   * @returns {Promise<{url: string, key: string}>}
   */
  async uploadNote(noteContent, title = "note") {
    const filename = `${this.sanitizeFilename(title)}.txt`;
    const noteBuffer = Buffer.from(noteContent, "utf-8");
    return this.uploadFile(noteBuffer, filename, "text/plain", "notes");
  }

  /**
   * Delete a file from S3
   * @param {string} key - S3 object key
   * @returns {Promise<void>}
   */
  async deleteFile(key) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
      };

      console.log("🗑️ Deleting from S3:", key);

      await this.s3.deleteObject(params).promise();

      console.log("✅ Delete successful:", key);
    } catch (error) {
      console.error("❌ S3 Delete Error:", error);
      throw new Error(`S3 Delete fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Get signed URL for temporary access (optional - für private files)
   * @param {string} key - S3 object key
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {string}
   */
  getSignedUrl(key, expiresIn = 3600) {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: expiresIn,
    };

    return this.s3.getSignedUrl("getObject", params);
  }

  /**
   * Check if bucket exists and is accessible
   * @returns {Promise<boolean>}
   */
  async checkBucketAccess() {
    try {
      await this.s3.headBucket({ Bucket: this.bucketName }).promise();
      console.log("✅ S3 Bucket accessible:", this.bucketName);
      return true;
    } catch (error) {
      console.error("❌ S3 Bucket not accessible:", error.message);
      return false;
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  getFileExtension(filename) {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0] : "";
  }

  getMimeTypeFromFilename(filename) {
    const ext = filename.split(".").pop()?.toLowerCase();

    const mimeTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
      md: "text/markdown",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-z0-9_\-\.]/gi, "_")
      .toLowerCase()
      .substring(0, 100);
  }
}

module.exports = new S3Service();
