/**
 * FCM Routes
 * API endpoints for FCM token management and notifications
 *
 * UAP 5.2.1: Token Registration
 * UAP 5.2.2: Push-Benachrichtigungen
 */

const express = require("express");
const router = express.Router();
const FCMDevice = require("../models/FCMDevice");
const fcmService = require("../service/fcmService");
const checkAuth = require("../middleware/check-auth");

/**
 * POST /api/fcm/register
 * Register or update FCM token for a device
 */
router.post("/register", checkAuth, async (req, res) => {
  try {
    const { fcmToken, deviceInfo } = req.body;
    const userId = req.userData.userId;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM Token ist erforderlich",
      });
    }

    // Register token in database
    const device = await FCMDevice.registerToken(userId, fcmToken, deviceInfo);

    // Send test notification to verify token
    try {
      await fcmService.sendTestNotification(fcmToken);
    } catch (error) {
      console.warn("⚠️ Failed to send test notification:", error.message);
      // Don't fail registration if test notification fails
    }

    res.status(200).json({
      success: true,
      message: "FCM Token erfolgreich registriert",
      device: {
        id: device._id,
        fcmToken: device.fcmToken,
        deviceInfo: device.deviceInfo,
        registeredAt: device.registeredAt,
      },
    });
  } catch (error) {
    console.error("❌ Error registering FCM token:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Registrieren des FCM Tokens",
      error: error.message,
    });
  }
});

/**
 * PUT /api/fcm/preferences
 * Update notification preferences for current device
 */
router.put("/preferences", checkAuth, async (req, res) => {
  try {
    const { fcmToken, preferences } = req.body;
    const userId = req.userData.userId;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM Token ist erforderlich",
      });
    }

    const device = await FCMDevice.findOne({ userId, fcmToken });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Gerät nicht gefunden",
      });
    }

    // Update preferences
    device.notificationPreferences = {
      ...device.notificationPreferences,
      ...preferences,
    };

    await device.save();

    res.status(200).json({
      success: true,
      message: "Benachrichtigungs-Einstellungen aktualisiert",
      preferences: device.notificationPreferences,
    });
  } catch (error) {
    console.error("❌ Error updating preferences:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Aktualisieren der Einstellungen",
      error: error.message,
    });
  }
});

/**
 * GET /api/fcm/devices
 * Get all registered devices for current user
 */
router.get("/devices", checkAuth, async (req, res) => {
  try {
    const userId = req.userData.userId;

    const devices = await FCMDevice.find({ userId, isActive: true }).select("-__v").sort({ lastUsed: -1 });

    res.status(200).json({
      success: true,
      devices: devices.map((device) => ({
        id: device._id,
        deviceInfo: device.deviceInfo,
        notificationPreferences: device.notificationPreferences,
        lastUsed: device.lastUsed,
        registeredAt: device.registeredAt,
      })),
    });
  } catch (error) {
    console.error("❌ Error fetching devices:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Abrufen der Geräte",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/fcm/unregister
 * Unregister FCM token
 */
router.delete("/unregister", checkAuth, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.userData.userId;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM Token ist erforderlich",
      });
    }

    const device = await FCMDevice.findOne({ userId, fcmToken });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Gerät nicht gefunden",
      });
    }

    await device.deactivate();

    res.status(200).json({
      success: true,
      message: "FCM Token erfolgreich entfernt",
    });
  } catch (error) {
    console.error("❌ Error unregistering token:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Entfernen des Tokens",
      error: error.message,
    });
  }
});

/**
 * POST /api/fcm/test
 * Send test notification
 */
router.post("/test", checkAuth, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.userData.userId;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM Token ist erforderlich",
      });
    }

    // Verify token belongs to user
    const device = await FCMDevice.findOne({ userId, fcmToken });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Gerät nicht gefunden",
      });
    }

    await fcmService.sendTestNotification(fcmToken);

    res.status(200).json({
      success: true,
      message: "Test-Benachrichtigung gesendet",
    });
  } catch (error) {
    console.error("❌ Error sending test notification:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Senden der Test-Benachrichtigung",
      error: error.message,
    });
  }
});

module.exports = router;
