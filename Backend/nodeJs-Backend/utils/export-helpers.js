const { parse } = require("json2csv");
const PDFDocument = require("pdfkit");

// ==========================================
// CSV HELPERS
// ==========================================

/**
 * Konvertiert Alarm-Daten zu CSV-Format
 * @param {Object} alarm - Alarm-Objekt aus DB
 * @param {Array} posts - Posts-Array aus DB
 * @returns {String} CSV-String
 */
exports.convertAlarmToCSV = (alarm, posts) => {
  // CSV-Spalten definieren
  const fields = [
    { label: "Klasse", value: "class" },
    { label: "Lehrer", value: "teachers" },
    { label: "Status", value: "status" },
    { label: "Raum", value: "room" },
    { label: "Kommentar", value: "comment" },
  ];

  // Daten für CSV aufbereiten
  const data = posts.map((post) => ({
    class: post.class || "-",
    teachers: Array.isArray(post.teachers) ? post.teachers.join(", ") : "-",
    status: translateStatus(post.status),
    room: Array.isArray(post.room) ? post.room.join(", ") : "-",
    comment: post.comment || "-",
  }));

  // Zu CSV konvertieren (Semikolon für Excel Deutschland)
  const csv = parse(data, {
    fields,
    delimiter: ";",
    withBOM: false, // BOM wird später manuell hinzugefügt
  });

  return csv;
};

/**
 * Konvertiert alle Alarme zu CSV-Übersicht
 * @param {Array} alarms - Array von Alarm-Objekten
 * @returns {String} CSV-String
 */
exports.convertAlarmsOverviewToCSV = (alarms) => {
  const fields = [
    { label: "Alarm-ID", value: "alarmId" },
    { label: "Datum", value: "date" },
    { label: "Uhrzeit", value: "time" },
    { label: "Status", value: "status" },
    { label: "Anzahl Klassen", value: "classCount" },
    { label: "Vollständig", value: "complete" },
    { label: "Unvollständig", value: "incomplete" },
    { label: "Offen", value: "open" },
    { label: "Abschlussrate %", value: "completionRate" },
  ];

  const data = alarms.map((alarm) => {
    const date = new Date(alarm.created);
    return {
      alarmId: alarm._id.toString(),
      date: date.toLocaleDateString("de-DE"),
      time: date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
      status: alarm.archived ? "Archiviert" : "Aktiv",
      classCount: alarm.classCount || 0,
      complete: alarm.stats?.complete || 0,
      incomplete: alarm.stats?.incomplete || 0,
      open: alarm.stats?.undefined || 0,
      completionRate: calculateCompletionRate(alarm.stats),
    };
  });

  const csv = parse(data, {
    fields,
    delimiter: ";",
    withBOM: false,
  });

  return csv;
};

// ==========================================
// PDF HELPERS
// ==========================================

/**
 * Generiert PDF für einen Alarm
 * @param {Object} alarm - Alarm-Objekt
 * @param {Array} posts - Posts-Array
 * @returns {Promise<Buffer>} PDF als Buffer
 */
exports.generateAlarmPDF = (alarm, posts) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // PDF-Inhalt erstellen
      addPDFHeader(doc);
      addAlarmInfo(doc, alarm);
      addStatistics(doc, alarm, posts);
      addPostsTable(doc, posts);
      addPDFFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * PDF Header hinzufügen
 */
function addPDFHeader(doc) {
  doc.fontSize(24).font("Helvetica-Bold").text("Feueralarm-Bericht", { align: "center" });

  doc.moveDown(0.5);

  // Linie unter Header
  doc.strokeColor("#2980b9").lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();

  doc.moveDown(1);
}

/**
 * Alarm-Informationen hinzufügen
 */
function addAlarmInfo(doc, alarm) {
  doc.fontSize(14).font("Helvetica-Bold").text("Alarm-Informationen", { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica");

  const date = new Date(alarm.created);
  const info = [
    { label: "Datum:", value: date.toLocaleDateString("de-DE") },
    { label: "Uhrzeit:", value: date.toLocaleTimeString("de-DE") },
    { label: "Status:", value: alarm.archived ? "Archiviert" : "Aktiv" },
    { label: "Anzahl Klassen:", value: alarm.classCount || 0 },
  ];

  info.forEach((item) => {
    doc.font("Helvetica-Bold").text(item.label, { continued: true, width: 150 });
    doc.font("Helvetica").text(" " + item.value);
  });

  doc.moveDown(1);
}

/**
 * Statistiken hinzufügen
 */
function addStatistics(doc, alarm, posts) {
  doc.fontSize(14).font("Helvetica-Bold").text("Statistiken", { underline: true });

  doc.moveDown(0.5);

  const stats = calculateStatistics(posts);

  // Statistik-Box mit Hintergrund
  const boxY = doc.y;
  doc.rect(50, boxY, 495, 80).fillAndStroke("#ecf0f1", "#bdc3c7");

  doc.fillColor("#000000");
  doc.y = boxY + 10;

  doc.fontSize(11).font("Helvetica");

  const statItems = [`Gesamt: ${stats.total}`, `Vollständig: ${stats.complete} (${stats.completePercent}%)`, `Unvollständig: ${stats.incomplete} (${stats.incompletePercent}%)`, `Offen: ${stats.open} (${stats.openPercent}%)`];

  statItems.forEach((item, index) => {
    doc.text(item, 60, boxY + 15 + index * 18);
  });

  doc.y = boxY + 90;
  doc.moveDown(1);
}

/**
 * Posts-Tabelle hinzufügen
 */
function addPostsTable(doc, posts) {
  doc.fontSize(14).font("Helvetica-Bold").text("Klassenübersicht", { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(10);

  // Tabellen-Header
  const tableTop = doc.y;
  const colWidths = [80, 150, 100, 80, 85];
  const headers = ["Klasse", "Lehrer", "Status", "Raum", "Kommentar"];

  // Header-Hintergrund
  doc.rect(50, tableTop, 495, 20).fillAndStroke("#2980b9", "#2c3e50");

  // Header-Text
  doc.fillColor("#ffffff").font("Helvetica-Bold");
  let xPos = 55;
  headers.forEach((header, i) => {
    doc.text(header, xPos, tableTop + 5, { width: colWidths[i] });
    xPos += colWidths[i];
  });

  doc.fillColor("#000000").font("Helvetica");

  // Tabellen-Zeilen
  let yPos = tableTop + 25;

  posts.forEach((post, index) => {
    // Alternierend gefärbte Zeilen
    if (index % 2 === 0) {
      doc.rect(50, yPos - 5, 495, 20).fillAndStroke("#f8f9fa", "#dee2e6");
    }

    doc.fillColor("#000000");

    const row = [post.class || "-", Array.isArray(post.teachers) ? post.teachers.join(", ") : "-", translateStatus(post.status), Array.isArray(post.room) ? post.room.join(", ") : "-", post.comment || "-"];

    xPos = 55;
    row.forEach((cell, i) => {
      doc.text(cell.substring(0, 30), xPos, yPos, { width: colWidths[i], height: 15 });
      xPos += colWidths[i];
    });

    yPos += 20;

    // Neue Seite bei Bedarf
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }
  });

  doc.moveDown(2);
}

/**
 * PDF Footer hinzufügen
 */
function addPDFFooter(doc) {
  const pages = doc.bufferedPageRange();

  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);

    // Footer-Linie
    doc
      .strokeColor("#bdc3c7")
      .lineWidth(1)
      .moveTo(50, 792 - 50)
      .lineTo(545, 792 - 50)
      .stroke();

    // Seitenzahl
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#7f8c8d")
      .text(`Seite ${i + 1} von ${pages.count}`, 50, 792 - 40, {
        align: "center",
      });

    // Erstellungsdatum
    const now = new Date();
    doc.text(`Erstellt am ${now.toLocaleDateString("de-DE")} um ${now.toLocaleTimeString("de-DE")}`, 50, 792 - 28, { align: "center" });
  }
}

// ==========================================
// UTILITY HELPERS
// ==========================================

/**
 * Übersetzt Status-Codes in lesbare Texte
 */
function translateStatus(status) {
  const statusMap = {
    complete: "Vollständig",
    incomplete: "Unvollständig",
    undefined: "Offen",
    invalid: "Ungültig",
  };

  return statusMap[status] || "Unbekannt";
}

/**
 * Berechnet Statistiken aus Posts
 */
function calculateStatistics(posts) {
  const total = posts.length;
  const complete = posts.filter((p) => p.status === "complete").length;
  const incomplete = posts.filter((p) => p.status === "incomplete").length;
  const open = posts.filter((p) => !p.status || p.status === "undefined").length;

  return {
    total,
    complete,
    incomplete,
    open,
    completePercent: total > 0 ? Math.round((complete / total) * 100) : 0,
    incompletePercent: total > 0 ? Math.round((incomplete / total) * 100) : 0,
    openPercent: total > 0 ? Math.round((open / total) * 100) : 0,
  };
}

/**
 * Berechnet Completion Rate aus Stats-Objekt
 */
function calculateCompletionRate(stats) {
  if (!stats || !stats.total || stats.total === 0) return 0;
  return Math.round((stats.complete / stats.total) * 100);
}

/**
 * Formatiert Datum für Dateinamen (YYYY-MM-DD_HH-mm)
 */
exports.formatDateForFilename = (dateString) => {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}_${hours}-${minutes}`;
  } catch (error) {
    return "export";
  }
};
