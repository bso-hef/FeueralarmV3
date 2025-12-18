/**
 * Alarm Notifications Service
 * Push-Benachrichtigungen bei Alarm-Trigger und Alarm-Ende
 *
 * UAP 5.2.2: Push-Benachrichtigungen
 */

const FCMDevice = require("../models/FCMDevice");
const fcmService = require("./fcmService");

/**
 * Send push notifications when alarm is triggered
 * Sendet an ALLE registrierten Geräte
 * @param {object} alarm - Alarm document
 */
async function notifyAlarmTriggered(alarm) {
  try {
    console.log("📱 notifyAlarmTriggered called for alarm:", alarm._id);

    // DEBUG: Zeige Collection und DB Info
    const mongoose = require("mongoose");
    console.log("🔍 Connected to DB:", mongoose.connection.name);
    console.log("🔍 Connection state:", mongoose.connection.readyState);
    console.log("🔍 DB host:", mongoose.connection.host);

    // Hole ALLE aktiven FCM Tokens (ohne User-Filter)
    console.log("🔍 Querying FCMDevice.find({ isActive: true })...");
    const allDevices = await FCMDevice.find({ isActive: true });

    console.log(`🔍 Raw query result: ${allDevices.length} devices found`);
    if (allDevices.length > 0) {
      console.log("🔍 First device sample:", JSON.stringify(allDevices[0].toObject(), null, 2));
    }

    const fcmTokens = allDevices.map((device) => device.fcmToken);
    console.log(`📱 Found ${fcmTokens.length} active devices to notify`);
    console.log(
      `📱 FCM Tokens:`,
      fcmTokens.map((t) => t.substring(0, 20) + "...")
    );

    if (fcmTokens.length === 0) {
      console.warn("⚠️ No active devices found for notifications");
      // DEBUG: Versuche ALLE Devices zu finden
      const anyDevices = await FCMDevice.find({});
      console.log(`🔍 Total devices in DB (any query): ${anyDevices.length}`);
      return;
    }

    console.log(`📤 Sending alarm notification to ${fcmTokens.length} devices`);

    // Send notification
    const result = await fcmService.sendAlarmNotification(fcmTokens, alarm);

    console.log(`✅ Alarm notification sent: ${result.successCount} success, ${result.failureCount} failed`);

    return result;
  } catch (error) {
    console.error("❌ Error sending alarm notification:", error);
    console.error("❌ Stack trace:", error.stack);
    // Don't throw - notification failures shouldn't block alarm creation
  }
}

/**
 * Send push notifications when alarm is ended/archived
 * Sendet an ALLE registrierten Geräte
 * @param {object} alarm - Alarm document
 */
async function notifyAlarmEnded(alarm) {
  try {
    console.log("📱 notifyAlarmEnded called for alarm:", alarm._id);

    // Hole ALLE aktiven FCM Tokens
    const allDevices = await FCMDevice.find({ isActive: true }).select("fcmToken");
    const fcmTokens = allDevices.map((device) => device.fcmToken);

    console.log(`📱 Found ${fcmTokens.length} active devices to notify`);

    if (fcmTokens.length === 0) {
      console.warn("⚠️ No active devices found for notifications");
      return;
    }

    console.log(`📤 Sending alarm ended notification to ${fcmTokens.length} devices`);

    // Verwende Status-Change Notification mit "Alarm beendet" Message
    const statusData = {
      alarmId: alarm._id,
      oldStatus: "active",
      newStatus: "ended",
      message: "Alarm wurde beendet",
    };

    const result = await fcmService.sendStatusChangeNotification(fcmTokens, statusData);

    console.log(`✅ Alarm ended notification sent: ${result.successCount} success, ${result.failureCount} failed`);

    return result;
  } catch (error) {
    console.error("❌ Error sending alarm ended notification:", error);
  }
}

module.exports = {
  notifyAlarmTriggered,
  notifyAlarmEnded,
};
