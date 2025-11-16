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
  // UAP 9.3.1: User-Informationen für Audit-Logging
  let userId = data.userId;
  let username = data.username;

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
    let lastAlertId = await this.getAlertId();

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

    try {
      let result = await Post.updateOne({ _id: post._id }, post);

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

exports.alert = async (data) => {
  let debugging = false;

  let result = permission.checkPermission(data.token);

  if (!result.hasPermission)
    return {
      success: false,
      msg: result.message,
      posts: [],
    };

  if (debugging) console.log("start");

  try {
    busyWithUntis = true;

    if (!(await untis.getUntisSession()))
      return {
        success: false,
        msg: "Authentifizierung bei WebUntis ist fehlgeschlagen.",
        posts: [],
      };

    if (debugging) console.log("auth worked");

    let teachers = await untis.getTeachers();
    if (!teachers)
      return {
        success: false,
        msg: "Abrufen der Lehrer von WebUntis ist fehlgeschlagen.",
        posts: [],
      };

    if (debugging) console.log("teachers worked");

    let classes = await untis.getClasses();
    if (!classes)
      return {
        success: false,
        msg: "Abrufen der Klassen von WebUntis ist fehlgeschlagen.",
        posts: [],
      };

    if (debugging) console.log("classes worked");

    let rooms = await untis.getRooms();
    if (!rooms)
      return {
        success: false,
        msg: "Abrufen der Räume von WebUntis ist fehlgeschlagen.",
        posts: [],
      };

    if (debugging) console.log("rooms worked");

    let date = new Date();
    date.setHours(date.getHours() + 1);
    day = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    if (data.day) day = data.day;

    let time = date.getHours() * 100 + date.getMinutes();
    if (data.time && data.time > 0 && data.time < 2400) time = data.time;

    posts = await untis.getPostsMultiThreaded(teachers, classes, rooms, day, time);
    if (!posts)
      return {
        success: false,
        msg: "Es konnten keine laufenden Unterrichte gefunden werden.",
        posts: [],
      };

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
          success: true,
          msg: "Laden der Klassen war erfolgreich.",
          posts,
        };
      } catch (err) {
        Alert.deleteOne({ _id: alert._id });

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
  } catch (error) {
    console.log(error.message);
    return {
      success: false,
      msg: "Ein unerwartetes Problem ist aufgetreten. -> " + error.message,
      posts: [],
    };
  } finally {
    busyWithUntis = false;
  }
};
