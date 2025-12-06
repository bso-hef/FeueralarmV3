const Post = require("../models/post");
const Alert = require("../models/alert");
const untis = require("../untis/requests");
const permission = require("../middleware/check-permission");
const auditService = require("../service/audit.service");

/**
 * DSGVO UAP9.1.2: Validiert Kommentare auf personenbezogene Daten
 * Verhindert das Speichern von Schülernamen, Geburtsdaten und anderen sensiblen Informationen
 *
 * @param {string} comment - Der zu validierende Kommentar
 * @returns {Object} - { isValid: boolean, error?: string }
 */
function validateCommentForPrivacy(comment) {
  if (!comment || comment.trim().length === 0) {
    return { isValid: true };
  }

  const trimmedComment = comment.trim();

  // Pattern für mögliche Namen (z.B. "Max Müller", "Anna Schmidt")
  const namePattern = /\b[A-ZÄÖÜ][a-zäöüß]+ [A-ZÄÖÜ][a-zäöüß]+\b/;

  // Pattern für Geburtsdaten (z.B. "15.03.2005", "3.7.05")
  const datePattern = /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/;

  // Verdächtige Begriffe die auf personenbezogene Daten hinweisen
  const suspiciousPatterns = [
    { pattern: /schüler.*name/i, message: "enthält möglicherweise Schülernamen" },
    { pattern: /student.*name/i, message: "enthält möglicherweise Studentennamen" },
    { pattern: /heißt/i, message: 'enthält möglicherweise Namen (Wort "heißt")' },
    { pattern: /ist\s+\d+\s+jahre\s+alt/i, message: "enthält Altersangaben" },
    { pattern: /geburtsdatum/i, message: "enthält Geburtsdatum" },
    { pattern: /\badresse\b/i, message: "enthält Adressdaten" },
    { pattern: /wohnt\s+(in|im|an)/i, message: "enthält Wohnortangaben" },
    { pattern: /telefon|handy|mobil/i, message: "enthält Telefonnummern" },
    { pattern: /@.*\.(de|com|net|org)/i, message: "enthält E-Mail-Adressen" },
  ];

  // Prüfe auf Namen
  if (namePattern.test(trimmedComment)) {
    return {
      isValid: false,
      error: "Kommentar enthält möglicherweise Namen. Bitte keine Schülernamen verwenden!",
    };
  }

  // Prüfe auf Geburtsdaten
  if (datePattern.test(trimmedComment)) {
    return {
      isValid: false,
      error: "Kommentar enthält ein Datum. Bitte keine Geburtsdaten oder persönliche Daten eingeben!",
    };
  }

  // Prüfe auf verdächtige Begriffe
  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(trimmedComment)) {
      return {
        isValid: false,
        error: `Kommentar ${message}. Bitte nur allgemeine Informationen zur Situation eingeben!`,
      };
    }
  }

  // Prüfe Länge (optional: verhindert extrem lange Kommentare)
  if (trimmedComment.length > 500) {
    return {
      isValid: false,
      error: "Kommentar ist zu lang (max. 500 Zeichen)",
    };
  }

  return { isValid: true };
}

exports.getAlertId = async (data) => {
  if (data && data.alertId) return data.alertId;

  let alerts = await Alert.find({}).sort({ created: -1 });
  if (alerts.length > 0) return alerts[0]._id;
  else return null;
};

exports.fetchPosts = async (alertId) => {
  try {
    let fetchedPosts;

    if (alertId) fetchedPosts = await Post.find({ alert: alertId }).sort({ class: 1 });

    if (!fetchedPosts || fetchedPosts.length == 0)
      return {
        success: false,
        msg: "Keine Feueralarme gefunden.",
        posts: [],
      };

    return {
      success: true,
      msg: "Laden der Klassen war erfolgreich.",
      posts: fetchedPosts,
    };
  } catch (error) {
    return {
      success: false,
      msg: error.message,
      posts: [],
    };
  }
};

exports.fetchAlerts = async () => {
  try {
    let alerts = await Alert.find({});

    if (alerts.length > 0)
      return {
        success: true,
        msg: "Laden der Feueralarme war erfolgreich.",
        posts: alerts,
      };
    else
      return {
        success: false,
        msg: "Keine Feueralarme gefunden.",
        posts: [],
      };
  } catch (error) {
    return {
      success: false,
      msg: error.message,
      posts: [],
    };
  }
};

exports.updatePost = async (data) => {
  let id = data.id;
  let status = data.status;
  let comment = data.comment;
  let userId = data.userId;
  let username = data.username;

  console.log("📝 === updatePost START ===");
  console.log("📝 id:", id);
  console.log("📝 status:", status);
  console.log("📝 comment:", comment);

  // DSGVO UAP9.1.2: Validiere Kommentar auf personenbezogene Daten
  if (comment && comment.trim().length > 0) {
    const validation = validateCommentForPrivacy(comment);
    if (!validation.isValid) {
      console.warn(`⚠️ DSGVO: Kommentar-Validierung fehlgeschlagen für Post ${id}: ${validation.error}`);
      return {
        success: false,
        msg: `DSGVO-Validierung: ${validation.error}`,
        posts: [],
      };
    }
  }

  if (!validUpdateParams(id, status, comment))
    return {
      success: false,
      msg: "Die Update-Paramater waren ungültig.",
      posts: [],
    };

  try {
    let post = await Post.findById(id);

    console.log("📝 Post found:", post ? "YES" : "NO");
    console.log("📝 Post:", post);

    let lastAlertId = await this.getAlertId();

    console.log("📝 lastAlertId:", lastAlertId);
    console.log("📝 post.alert:", post?.alert);

    if (!post.alert.equals(lastAlertId))
      return {
        success: false,
        msg: "Diese Klasse ist bereits archiviert.",
        posts: [],
      };

    // UAP 9.3.1: Alte Werte für Audit-Log speichern
    const oldStatus = post.status;
    const oldComment = post.comment;

    let time = new Date();
    time.setHours(time.getHours() + 1);

    post.updated = time;
    post.status = status || post.status;
    post.comment = comment || post.comment;

    console.log("📝 About to update post with _id:", post._id);
    console.log("📝 New status:", status);
    console.log("📝 post object:", post);

    try {
      console.log("📝 === INSIDE TRY BLOCK ===");
      let result = await Post.updateOne({ _id: post._id }, post);
      console.log("📝 MongoDB updateOne result:", result);
      console.log("📝 result.n:", result.n);
      console.log("📝 result.nModified:", result.nModified);
      console.log("📝 result.ok:", result.ok);

      if (result.n > 0) {
        result = await Alert.updateOne({ _id: post.alert }, { updated: time });

        // NEU: Stats aktualisieren
        const AlertController = require("./alerts");
        await AlertController.updateAlertStats(post.alert);

        // UAP 9.3.1: Audit-Logging für Status-Änderung
        if (status && status !== oldStatus && userId && username) {
          await auditService.logStatusChange({
            userId,
            username,
            postId: post._id,
            oldStatus,
            newStatus: status,
            alertId: post.alert,
            className: post.class?.name,
            classNumber: post.class?.number,
          });
        }

        // UAP 9.3.1: Audit-Logging für Kommentar-Änderung
        if (comment && comment !== oldComment && userId && username) {
          const action = oldComment ? "comment_updated" : "comment_added";
          await auditService.logCommentChange({
            userId,
            username,
            postId: post._id,
            oldComment,
            newComment: comment,
            action,
            alertId: post.alert,
            className: post.class?.name,
            classNumber: post.class?.number,
          });
        }

        return {
          success: true,
          msg: "Update der Klasse war erfolgreich.",
          posts: [post],
        };
      } else
        return {
          success: false,
          msg: "Die Klasse konnte nicht upgedated werden.",
          posts: [],
        };
    } catch (err) {
      console.error("📝 === ERROR IN TRY BLOCK ===");
      console.error("📝 Error message:", err.message);
      console.error("📝 Error stack:", err.stack);
      return {
        success: false,
        msg: err.message,
        posts: [],
      };
    }
  } catch (err) {
    return {
      success: false,
      msg: err.message,
      posts: [],
    };
  }
};

function validUpdateParams(id, status, comment) {
  if (id && id !== "" && (status || comment)) {
    if (status) status = status.toLowerCase();

    return (status && (status === "invalid" || status === "complete" || status === "incomplete")) || (comment && comment.length > 0);
  } else return false;
}

// 🔧 KORRIGIERTE exports.alert Funktion - Nutzt Socket-Auth statt Token
exports.alert = async (data) => {
  let debugging = true;

  // 🔧 FIX: Keine Token-Prüfung mehr - userId kommt bereits von Socket-Authentication
  // Permission wurde bereits durch Socket-Middleware geprüft
  if (!data.userId) {
    console.error("❌ Alert failed: No userId provided");
    return {
      success: false,
      msg: "Nicht authentifiziert",
      posts: [],
    };
  }

  console.log(`🚨 Processing alert from user: ${data.email || data.userId}`);

  if (debugging) console.log("start");

  try {
    busyWithUntis = true;

    // 🔧 FIX: Prüfe auf .ok Property
    const untisSession = await untis.getUntisSession();
    if (!untisSession || !untisSession.ok) {
      console.error("❌ WebUntis authentication failed");
      return {
        success: false,
        msg: "Authentifizierung bei WebUntis ist fehlgeschlagen.",
        posts: [],
      };
    }

    if (debugging) console.log("auth worked");

    // 🔧 FIX: Übergebe untisSession als Parameter
    let teachers = await untis.getTeachers(untisSession);
    if (!teachers) {
      console.error("❌ Failed to fetch teachers from WebUntis");
      return {
        success: false,
        msg: "Abrufen der Lehrer von WebUntis ist fehlgeschlagen.",
        posts: [],
      };
    }

    if (debugging) console.log("teachers worked");

    // 🔧 FIX: Übergebe untisSession als Parameter
    let classes = await untis.getClasses(untisSession);
    if (!classes) {
      console.error("❌ Failed to fetch classes from WebUntis");
      return {
        success: false,
        msg: "Abrufen der Klassen von WebUntis ist fehlgeschlagen.",
        posts: [],
      };
    }

    if (debugging) console.log("classes worked");

    // 🔧 FIX: Übergebe untisSession als Parameter
    let rooms = await untis.getRooms(untisSession);
    if (!rooms) {
      console.error("❌ Failed to fetch rooms from WebUntis");
      return {
        success: false,
        msg: "Abrufen der Räume von WebUntis ist fehlgeschlagen.",
        posts: [],
      };
    }

    if (debugging) console.log("rooms worked");

    let date = new Date();
    date.setHours(date.getHours() + 1);
    day = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    if (data.day) day = data.day;

    let time = date.getHours() * 100 + date.getMinutes();
    if (data.time && data.time > 0 && data.time < 2400) time = data.time;

    console.log(`📅 Fetching schedule for day: ${day}, time: ${time}`);

    posts = await untis.getPostsMultiThreaded(teachers, classes, rooms, day, time);
    if (!posts) {
      console.error("❌ No ongoing classes found");
      return {
        success: false,
        msg: "Es konnten keine laufenden Unterrichte gefunden werden.",
        posts: [],
      };
    }

    posts = untis.getProcessedPostList(posts);

    if (debugging) console.log("posts worked");

    try {
      let result = await Alert.updateMany({}, { archived: true });
      let timeStamp = posts[0].created;
      let alert = await Alert.create({
        classCount: posts.length,
        created: timeStamp,
        updated: timeStamp,
        stats: {
          total: posts.length,
          complete: 0,
          incomplete: 0,
          undefined: posts.length,
        },
      });

      console.log(`✅ Alert created with ${posts.length} classes`);

      try {
        for (let post of posts) post.alert = alert._id;
        result = await Post.create(posts);
        posts = result;

        let alerts = await Alert.find({}).sort({ created: 1 });
        let deletableAlerts = [];
        let maxAlerts = 50;

        for (let i = 0; i < alerts.length - maxAlerts; i++) {
          deletableAlerts.push(alerts[i]._id);
        }

        if (deletableAlerts.length > 0) {
          result = await Post.deleteMany({ alert: { $exists: false } });
          result = await Post.deleteMany({ alert: { $in: deletableAlerts } });
          if (result.ok == 1) result = await Alert.deleteMany({ _id: { $in: deletableAlerts } });
        }

        return {
          message: "OK", // ← WICHTIG: "message" statt "msg" für Socket-Handler
          teachers: posts,
        };
      } catch (err) {
        console.error("❌ Error creating posts:", err.message);
        Alert.deleteOne({ _id: alert._id });

        return {
          success: false,
          msg: err.message,
          posts: [],
        };
      }
    } catch (err) {
      console.error("❌ Error creating alert:", err.message);
      return {
        success: false,
        msg: err.message,
        posts: [],
      };
    }
  } catch (error) {
    console.error("❌ Unexpected error in alert:", error.message);
    return {
      success: false,
      msg: "Ein unerwartetes Problem ist aufgetreten. -> " + error.message,
      posts: [],
    };
  } finally {
    busyWithUntis = false;
  }
};
