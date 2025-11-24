// untis/requests.js
// Robuste Variante mit defensivem ENV-Parsing und besseren Fehlermeldungen

const { Worker, workerData } = require("worker_threads");
const Post = require("../models/post");
const axios = require("axios");
const os = require("os");

// Hilfsfunktionen für ENV
function requireEnv(name) {
  const val = process.env[name];
  if (val === undefined || val === null || val === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function parseEnvJson(name) {
  const raw = requireEnv(name);
  try {
    return JSON.parse(raw);
  } catch (e) {
    // Zeige einen gekürzten Ausschnitt an, damit man das fehlerhafte JSON sieht
    const preview = raw.length > 200 ? raw.slice(0, 200) + "..." : raw;
    throw new Error(`Invalid JSON in env ${name}: ${e.message}. Value preview: ${preview}`);
  }
}

// Pflicht-ENV laden (mit Guards)
const requestURL = requireEnv("UNTIS_API_KEY"); // Achtung: das ist laut deinem Code eine URL/Key als String

// JSON-ENV sicher parsen
const authBody = parseEnvJson("UNTIS_AUTH_BODY");
const authHeaderBase = parseEnvJson("UNTIS_AUTH_HEADER");
const teacherBody = parseEnvJson("UNTIS_TEACHERS_BODY");
const classesBody = parseEnvJson("UNTIS_CLASSES_BODY");
const roomsBody = parseEnvJson("UNTIS_ROOMS_BODY");
const timeUnitsBody = parseEnvJson("UNTIS_TIMEGRIDUNITS_BODY");
const timetableBodyBase = parseEnvJson("UNTIS_TIMETABLE_BODY");

// Wir erzeugen pro Session eine mutable Kopie der Header/Body-Objekte,
// damit wir Cookies setzen können, ohne die Basis zu beschädigen.
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const workerFile = "./untis/timeTableWorker.js";

// Zentrales Axios-POST mit besserem Fehler-Logging
async function postUntis(url, body, headersObj, label) {
  try {
    const res = await axios.post(url, body, headersObj);
    return res;
  } catch (err) {
    if (err.response) {
      console.error(`[UNTIS ${label}] HTTP ${err.response.status}`, {
        data: err.response.data,
        headers: err.response.headers,
      });
    } else if (err.request) {
      console.error(`[UNTIS ${label}] No response received`, { error: err.message });
    } else {
      console.error(`[UNTIS ${label}] Request setup error`, { error: err.message });
    }
    throw err;
  }
}

exports.getUntisSession = async () => {
  try {
    // Frische Kopien
    const headers = clone(authHeaderBase);

    const resAuth = await postUntis(requestURL, authBody, headers, "authenticate");

    if (resAuth.data && resAuth.data.result && resAuth.data.result.sessionId) {
      // Cookie für Folge-Requests setzen
      if (!headers.headers) headers.headers = {};
      headers.headers.Cookie = "JSESSIONID=" + resAuth.data.result.sessionId;

      // Wir geben die Header (inkl. Cookie) für weitere Calls zurück
      return { ok: true, headers };
    } else {
      console.warn("[UNTIS authenticate] Kein sessionId im Resultat");
      return { ok: false, headers: null };
    }
  } catch (e) {
    console.warn("[UNTIS authenticate] Fehler beim Auth-Request:", e.message);
    return { ok: false, headers: null };
  }
};

exports.getTeachers = async (session) => {
  try {
    if (!session || !session.ok || !session.headers) return null;
    const resTeachers = await postUntis(requestURL, teacherBody, session.headers, "getTeachers");

    if (resTeachers.data && resTeachers.data.result) {
      const teachers = {};
      for (const teacher of resTeachers.data.result) {
        teachers[teacher.id] = {
          name: teacher.name,
          foreName: teacher.foreName,
          lastName: teacher.longName,
        };
      }
      return teachers;
    }
    return null;
  } catch {
    return null;
  }
};

exports.getClasses = async (session) => {
  try {
    if (!session || !session.ok || !session.headers) return null;
    const resClasses = await postUntis(requestURL, classesBody, session.headers, "getClasses");

    if (resClasses.data && resClasses.data.result) {
      const classes = {};
      for (const clas of resClasses.data.result) {
        classes[clas.id] = {
          number: clas.name,
          name: clas.longName,
        };
      }
      return classes;
    }
    return null;
  } catch {
    return null;
  }
};

exports.getRooms = async (session) => {
  try {
    if (!session || !session.ok || !session.headers) return null;
    const resRooms = await postUntis(requestURL, roomsBody, session.headers, "getRooms");

    if (resRooms.data && resRooms.data.result) {
      const rooms = {};
      for (const room of resRooms.data.result) {
        rooms[room.id] = {
          name: room.name,
          longName: room.longName,
        };
      }
      return rooms;
    }
    return null;
  } catch {
    return null;
  }
};

exports.getTimeUnits = async (session) => {
  try {
    if (!session || !session.ok || !session.headers) return null;
    const resTimeUnits = await postUntis(requestURL, timeUnitsBody, session.headers, "getTimegridUnits");

    if (resTimeUnits.data && resTimeUnits.data.result) {
      const units = {};
      units["not listed"] = {};
      for (const day of resTimeUnits.data.result) {
        for (const unit of day.timeUnits) {
          if (!units[unit.startTime]) units[unit.startTime] = unit.name;
        }
      }
      return units;
    }
    return null;
  } catch {
    return null;
  }
};

// Timetable anfragen
exports.getTimetable = async (session, overrides = {}) => {
  try {
    if (!session || !session.ok || !session.headers) {
      console.warn("⚠️ getTimetable: Invalid session");
      return null;
    }

    const body = clone(timetableBodyBase);
    // overrides z. B. { params: { element: { id: 123, type: 1 }, startDate: "20250101", endDate: "20250107" } }
    Object.assign(body, overrides);

    console.log(`🔎 getTimetable request:`, JSON.stringify(body, null, 2));

    const resTT = await postUntis(requestURL, body, session.headers, "getTimetable");

    console.log(`📥 getTimetable response:`, resTT.data ? "Has data" : "No data");

    if (resTT.data && resTT.data.result) {
      return resTT.data.result;
    }
    return null;
  } catch (error) {
    console.error("❌ getTimetable error:", error.message);
    return null;
  }
};

/**
 * 🔧 NEUE IMPLEMENTIERUNG: Holt Stundenpläne für alle Lehrer und erstellt Posts
 * @param {Object} teachers - Objekt mit Lehrer-IDs als Keys
 * @param {Object} classes - Objekt mit Klassen-IDs als Keys
 * @param {Object} rooms - Objekt mit Raum-IDs als Keys
 * @param {Number} day - Datum im Format YYYYMMDD (z.B. 20251124)
 * @param {Number} time - Uhrzeit im Format HHMM (z.B. 0745)
 * @returns {Array} Array von Post-Objekten oder null
 */
exports.getPostsMultiThreaded = async (teachers, classes, rooms, day, time) => {
  try {
    // Session holen
    const session = await exports.getUntisSession();
    if (!session || !session.ok) {
      console.error("❌ No valid WebUntis session in getPostsMultiThreaded");
      return null;
    }

    const posts = [];
    const teacherIds = Object.keys(teachers);

    console.log(`📊 Fetching timetables for ${teacherIds.length} teachers...`);

    // Datum formatieren für WebUntis API
    const dateStr = day.toString();

    // Für jeden Lehrer den Stundenplan abrufen
    for (const teacherId of teacherIds) {
      try {
        console.log(`🔍 Fetching timetable for teacher ${teacherId}...`);

        // Timetable für diesen Lehrer abrufen
        const timetable = await exports.getTimetable(session, {
          params: {
            element: {
              id: parseInt(teacherId),
              type: 2, // 2 = Lehrer (1 = Klasse, 3 = Raum)
            },
            startDate: dateStr,
            endDate: dateStr,
          },
        });

        console.log(`📦 Timetable result for teacher ${teacherId}:`, timetable ? `${timetable.length} lessons` : "null");

        if (!timetable || timetable.length === 0) {
          continue;
        }

        console.log(`📚 Teacher ${teacherId}: Found ${timetable.length} lessons`);

        // Durch alle Unterrichtsstunden dieses Lehrers gehen
        for (const lesson of timetable) {
          // 🔧 DEBUG: Zeige alle Stunden
          console.log(`📋 Lesson: Start=${lesson.startTime}, End=${lesson.endTime}, Time=${time}`);

          // Prüfe ob diese Stunde zur gewünschten Zeit läuft
          if (lesson.startTime && lesson.endTime) {
            const lessonStart = lesson.startTime;
            const lessonEnd = lesson.endTime;

            // Prüfe ob die angegebene Zeit in diese Stunde fällt
            if (time >= lessonStart && time <= lessonEnd) {
              // Erstelle Post-Objekt
              const post = {
                // Lehrer
                teachers: lesson.te
                  ? lesson.te.map((t) => {
                      const teacher = teachers[t.id];
                      return teacher ? `${teacher.foreName || ""} ${teacher.lastName || teacher.name}`.trim() : `Teacher ${t.id}`;
                    })
                  : [`Teacher ${teacherId}`],

                // Klasse
                class:
                  lesson.kl && lesson.kl.length > 0
                    ? {
                        number: classes[lesson.kl[0].id]?.number || `Class ${lesson.kl[0].id}`,
                        name: classes[lesson.kl[0].id]?.name || `Class ${lesson.kl[0].id}`,
                      }
                    : {
                        number: "Unknown",
                        name: "Unknown Class",
                      },

                // Räume
                rooms: lesson.ro
                  ? lesson.ro.map((r) => ({
                      number: rooms[r.id]?.name || `Room ${r.id}`,
                      name: rooms[r.id]?.longName || rooms[r.id]?.name || `Room ${r.id}`,
                    }))
                  : [{ number: "Unknown", name: "Unknown Room" }],

                // Zeiten
                start: lessonStart,
                end: lessonEnd,
                day: day,

                // Status & Kommentar
                status: "invalid", // Standardstatus: offen
                comment: "",

                // Timestamps
                created: new Date(),
                updated: new Date(),
              };

              posts.push(post);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error fetching timetable for teacher ${teacherId}:`, error.message);
        // Weiter mit nächstem Lehrer
        continue;
      }
    }

    console.log(`✅ Found ${posts.length} ongoing classes`);
    return posts.length > 0 ? posts : null;
  } catch (error) {
    console.error("❌ Error in getPostsMultiThreaded:", error.message);
    return null;
  }
};

/**
 * 🔧 NEUE IMPLEMENTIERUNG: Verarbeitet die Posts-Liste (dedupliziert, sortiert)
 * @param {Array} posts - Array von Post-Objekten
 * @returns {Array} Verarbeitete Posts
 */
exports.getProcessedPostList = (posts) => {
  if (!posts || posts.length === 0) return [];

  // Deduplizierung nach Klasse (falls eine Klasse mehrfach vorkommt durch mehrere Lehrer)
  const uniquePosts = [];
  const seenClasses = new Set();

  for (const post of posts) {
    const classKey = post.class.number;

    if (!seenClasses.has(classKey)) {
      seenClasses.add(classKey);
      uniquePosts.push(post);
    } else {
      // Klasse existiert schon - füge ggf. zusätzliche Lehrer/Räume hinzu
      const existingPost = uniquePosts.find((p) => p.class.number === classKey);
      if (existingPost) {
        // Merge Lehrer
        for (const teacher of post.teachers) {
          if (!existingPost.teachers.includes(teacher)) {
            existingPost.teachers.push(teacher);
          }
        }
        // Merge Räume
        for (const room of post.rooms) {
          const roomExists = existingPost.rooms.some((r) => r.number === room.number);
          if (!roomExists) {
            existingPost.rooms.push(room);
          }
        }
      }
    }
  }

  // Sortiere nach Klassennummer
  uniquePosts.sort((a, b) => {
    if (a.class.number < b.class.number) return -1;
    if (a.class.number > b.class.number) return 1;
    return 0;
  });

  return uniquePosts;
};
