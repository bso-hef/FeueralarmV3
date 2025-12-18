/**
 * Firebase Cloud Messaging Service
 * Handles push notification delivery via Firebase Admin SDK
 *
 * UAP 5.2.1: Backend FCM Integration
 * UAP 5.2.2: Push-Benachrichtigungen bei Alarm/Statusänderungen
 */

const admin = require("firebase-admin");
const path = require("path");

class FCMService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initialize() {
    try {
      // Service Account aus Environment oder lokalem Pfad
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, "../firebase-service-account.json");

      const serviceAccount = require(serviceAccountPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

      this.initialized = true;
      console.log("✅ Firebase Admin SDK initialized");
      console.log(`📧 Service Account: ${serviceAccount.client_email}`);
      console.log(`🆔 Project ID: ${serviceAccount.project_id}`);
    } catch (error) {
      console.error("❌ Error initializing Firebase Admin SDK:", error.message);
      throw error;
    }
  }

  /**
   * Send notification to a single device
   * @param {string} fcmToken - Device FCM token
   * @param {object} notification - Notification data
   * @param {string} notification.title - Notification title
   * @param {string} notification.body - Notification body
   * @param {object} data - Additional data payload
   * @returns {Promise<string>} Message ID
   */
  async sendToDevice(fcmToken, notification, data = {}) {
    if (!this.initialized) {
      throw new Error("FCM Service not initialized");
    }

    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
          priority: "high",
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      console.log("✅ Notification sent successfully:", response);
      return response;
    } catch (error) {
      console.error("❌ Error sending notification:", error);
      throw error;
    }
  }

  /**
   * Send notification to multiple devices
   * @param {string[]} fcmTokens - Array of device FCM tokens
   * @param {object} notification - Notification data
   * @param {object} data - Additional data payload
   * @returns {Promise<object>} Batch response with success/failure counts
   */
  async sendToMultipleDevices(fcmTokens, notification, data = {}) {
    if (!this.initialized) {
      throw new Error("FCM Service not initialized");
    }

    if (!fcmTokens || fcmTokens.length === 0) {
      console.warn("⚠️ No FCM tokens provided");
      return { successCount: 0, failureCount: 0 };
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
          priority: "high",
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: fcmTokens,
        ...message,
      });

      console.log(`✅ Batch notification sent: ${response.successCount} success, ${response.failureCount} failed`);

      // Log failed tokens for cleanup
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`❌ Failed to send to token ${fcmTokens[idx]}:`, resp.error);
          }
        });
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      };
    } catch (error) {
      console.error("❌ Error sending batch notification:", error);
      throw error;
    }
  }

  /**
   * Send alarm notification
   * @param {string[]} fcmTokens - Device tokens to notify
   * @param {object} alarm - Alarm data
   * @returns {Promise<object>} Send result
   */
  async sendAlarmNotification(fcmTokens, alarm) {
    const notification = {
      title: "🔥 FEUERALARM!",
      body: `"Alarm ausgelöst"`,
    };

    const data = {
      type: "alarm",
      alarmId: alarm._id?.toString() || "",
      location: alarm.location || "",
      alarmType: alarm.alarmType || "",
      priority: "critical",
    };

    return this.sendToMultipleDevices(fcmTokens, notification, data);
  }

  /**
   * Send status change notification
   * @param {string[]} fcmTokens - Device tokens to notify
   * @param {object} statusData - Status change data
   * @returns {Promise<object>} Send result
   */
  async sendStatusChangeNotification(fcmTokens, statusData) {
    const notification = {
      title: "📢 Status-Änderung",
      body: statusData.message || "Der Alarm-Status wurde geändert",
    };

    const data = {
      type: "status_change",
      alarmId: statusData.alarmId?.toString() || "",
      oldStatus: statusData.oldStatus || "",
      newStatus: statusData.newStatus || "",
      priority: "normal",
    };

    return this.sendToMultipleDevices(fcmTokens, notification, data);
  }

  /**
   * Send test notification
   * @param {string} fcmToken - Device token
   * @returns {Promise<string>} Message ID
   */
  async sendTestNotification(fcmToken) {
    const notification = {
      title: "✅ Test erfolgreich",
      body: "Deine Push-Benachrichtigungen funktionieren!",
    };

    const data = {
      type: "test",
      priority: "normal",
    };

    return this.sendToDevice(fcmToken, notification, data);
  }

  /**
   * Validate FCM token
   * @param {string} fcmToken - Token to validate
   * @returns {Promise<boolean>} True if valid
   */
  async validateToken(fcmToken) {
    try {
      await this.sendToDevice(
        fcmToken,
        {
          title: "Token Validierung",
          body: "Dein Gerät wurde erfolgreich registriert",
        },
        {
          type: "validation",
        }
      );
      return true;
    } catch (error) {
      console.error("❌ Invalid FCM token:", error.message);
      return false;
    }
  }
}

// Singleton instance
const fcmService = new FCMService();

module.exports = fcmService;
