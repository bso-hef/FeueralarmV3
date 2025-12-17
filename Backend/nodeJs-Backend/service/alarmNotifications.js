/**
 * Alarm Service Extension for FCM Integration
 * Add this to your existing alarmService.js or create as separate file
 *
 * UAP 5.2.2: Push-Benachrichtigungen bei Alarm/Statusänderungen
 */

const FCMDevice = require("../models/FCMDevice");
const fcmService = require("./fcmService");

/**
 * Send push notifications when alarm is triggered
 * @param {object} alarm - Alarm document
 * @param {object[]} recipients - Users to notify (optional, defaults to all active users)
 */
async function notifyAlarmTriggered(alarm, recipients = null) {
  try {
    let userIds;

    if (recipients && recipients.length > 0) {
      // Notify specific users
      userIds = recipients.map((user) => user._id);
    } else {
      // Notify all users with active devices
      // You might want to filter by role or permissions here
      const User = require("../models/user");
      const allUsers = await User.find({ isActive: true }).select("_id");
      userIds = allUsers.map((user) => user._id);
    }

    // Get FCM tokens for users with alarm notifications enabled
    const fcmTokens = await FCMDevice.getTokensWithPreference(userIds, "alarms");

    if (fcmTokens.length === 0) {
      console.warn("⚠️ No devices with alarm notifications enabled");
      return;
    }

    console.log(`📤 Sending alarm notification to ${fcmTokens.length} devices`);

    // Send notification
    const result = await fcmService.sendAlarmNotification(fcmTokens, alarm);

    console.log(`✅ Alarm notification sent: ${result.successCount} success, ${result.failureCount} failed`);

    return result;
  } catch (error) {
    console.error("❌ Error sending alarm notification:", error);
    // Don't throw - notification failures shouldn't block alarm creation
  }
}

/**
 * Send push notifications when alarm status changes
 * @param {object} alarm - Alarm document
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {object[]} recipients - Users to notify (optional)
 */
async function notifyAlarmStatusChange(alarm, oldStatus, newStatus, recipients = null) {
  try {
    let userIds;

    if (recipients && recipients.length > 0) {
      userIds = recipients.map((user) => user._id);
    } else {
      // Notify all users
      const User = require("../models/user");
      const allUsers = await User.find({ isActive: true }).select("_id");
      userIds = allUsers.map((user) => user._id);
    }

    // Get FCM tokens for users with status change notifications enabled
    const fcmTokens = await FCMDevice.getTokensWithPreference(userIds, "statusChanges");

    if (fcmTokens.length === 0) {
      console.warn("⚠️ No devices with status change notifications enabled");
      return;
    }

    const statusData = {
      alarmId: alarm._id,
      oldStatus,
      newStatus,
      message: `Alarm-Status geändert: ${oldStatus} → ${newStatus}`,
    };

    console.log(`📤 Sending status change notification to ${fcmTokens.length} devices`);

    const result = await fcmService.sendStatusChangeNotification(fcmTokens, statusData);

    console.log(`✅ Status change notification sent: ${result.successCount} success, ${result.failureCount} failed`);

    return result;
  } catch (error) {
    console.error("❌ Error sending status change notification:", error);
  }
}

module.exports = {
  notifyAlarmTriggered,
  notifyAlarmStatusChange,
};
