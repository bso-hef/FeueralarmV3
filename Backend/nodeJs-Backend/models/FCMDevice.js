/**
 * FCM Device Model
 * Manages FCM tokens for push notifications
 *
 * UAP 5.2.1: Token Registration & Management
 */

const mongoose = require("mongoose");

const fcmDeviceSchema = new mongoose.Schema(
  {
    // User reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // FCM Token
    fcmToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Device information
    deviceInfo: {
      platform: {
        type: String,
        enum: ["android", "ios", "web"],
        default: "android",
      },
      deviceId: String,
      deviceName: String,
      appVersion: String,
      osVersion: String,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Notification preferences
    notificationPreferences: {
      alarms: {
        type: Boolean,
        default: true,
      },
      statusChanges: {
        type: Boolean,
        default: true,
      },
      reminders: {
        type: Boolean,
        default: true,
      },
    },

    // Timestamps
    lastUsed: {
      type: Date,
      default: Date.now,
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
fcmDeviceSchema.index({ userId: 1, isActive: 1 });
fcmDeviceSchema.index({ fcmToken: 1 });

// Methods

/**
 * Update last used timestamp
 */
fcmDeviceSchema.methods.updateLastUsed = function () {
  this.lastUsed = new Date();
  return this.save();
};

/**
 * Deactivate device
 */
fcmDeviceSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

// Statics

/**
 * Register or update FCM token
 * @param {ObjectId} userId - User ID
 * @param {string} fcmToken - FCM token
 * @param {object} deviceInfo - Device information
 * @returns {Promise<FCMDevice>}
 */
fcmDeviceSchema.statics.registerToken = async function (userId, fcmToken, deviceInfo = {}) {
  try {
    // Check if token already exists
    let device = await this.findOne({ fcmToken });

    if (device) {
      // Update existing device
      device.userId = userId;
      device.deviceInfo = { ...device.deviceInfo, ...deviceInfo };
      device.isActive = true;
      device.lastUsed = new Date();
      await device.save();
      console.log(`✅ FCM token updated for user ${userId}`);
    } else {
      // Create new device
      device = await this.create({
        userId,
        fcmToken,
        deviceInfo,
        isActive: true,
      });
      console.log(`✅ New FCM token registered for user ${userId}`);
    }

    return device;
  } catch (error) {
    console.error("❌ Error registering FCM token:", error);
    throw error;
  }
};

/**
 * Get active tokens for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<string[]>} Array of FCM tokens
 */
fcmDeviceSchema.statics.getActiveTokensForUser = async function (userId) {
  const devices = await this.find({
    userId,
    isActive: true,
  }).select("fcmToken");

  return devices.map((device) => device.fcmToken);
};

/**
 * Get active tokens for multiple users
 * @param {ObjectId[]} userIds - Array of user IDs
 * @returns {Promise<string[]>} Array of FCM tokens
 */
fcmDeviceSchema.statics.getActiveTokensForUsers = async function (userIds) {
  const devices = await this.find({
    userId: { $in: userIds },
    isActive: true,
  }).select("fcmToken");

  return devices.map((device) => device.fcmToken);
};

/**
 * Get active tokens with notification preferences
 * @param {ObjectId[]} userIds - Array of user IDs
 * @param {string} notificationType - Type of notification (alarms, statusChanges, reminders)
 * @returns {Promise<string[]>} Array of FCM tokens
 */
fcmDeviceSchema.statics.getTokensWithPreference = async function (userIds, notificationType) {
  const query = {
    userId: { $in: userIds },
    isActive: true,
  };

  // Add notification preference filter
  query[`notificationPreferences.${notificationType}`] = true;

  const devices = await this.find(query).select("fcmToken");
  return devices.map((device) => device.fcmToken);
};

/**
 * Remove token
 * @param {string} fcmToken - FCM token to remove
 * @returns {Promise<void>}
 */
fcmDeviceSchema.statics.removeToken = async function (fcmToken) {
  await this.deleteOne({ fcmToken });
  console.log(`✅ FCM token removed: ${fcmToken}`);
};

/**
 * Deactivate old devices (not used for 90 days)
 * @returns {Promise<number>} Number of deactivated devices
 */
fcmDeviceSchema.statics.deactivateOldDevices = async function () {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const result = await this.updateMany(
    {
      lastUsed: { $lt: ninetyDaysAgo },
      isActive: true,
    },
    {
      isActive: false,
    }
  );

  console.log(`✅ Deactivated ${result.modifiedCount} old devices`);
  return result.modifiedCount;
};

const FCMDevice = mongoose.model("FCMDevice", fcmDeviceSchema);

module.exports = FCMDevice;
