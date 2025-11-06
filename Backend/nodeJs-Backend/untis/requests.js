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

// Beispiel: Timetable anfragen, falls du das hier brauchst.
// Wir klonen den Basis-Body, damit wir Parameter dynamisch setzen können.
exports.getTimetable = async (session, overrides = {}) => {
  try {
    if (!session || !session.ok || !session.headers) return null;

    const body = clone(timetableBodyBase);
    // overrides z. B. { params: { element: { id: 123, type: 1 }, startDate: "20250101", endDate: "20250107" } }
    // flach mergen, je nach Bedarf:
    Object.assign(body, overrides);

    const resTT = await postUntis(requestURL, body, session.headers, "getTimetable");
    if (resTT.data && resTT.data.result) {
      return resTT.data.result;
    }
    return null;
  } catch {
    return null;
  }
};

// Beispiel für Multi-Threaded Posts – unverändert, aber Session wird jetzt von außen übergeben.
// Passe diese Funktion an, falls du hier intern noch auf requestHeader zugreifen wolltest.
exports.getPostsMultiThreaded = async (teachers, classes, rooms, day, time) => {
  // implementierung abhängig von deinem Worker-Setup
  // hier bleibt es wie bei dir, sofern du hier keinen direkten ENV-Zugriff brauchst
};
