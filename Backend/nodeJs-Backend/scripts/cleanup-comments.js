const mongoose = require("mongoose");
require("dotenv").config();

// Validierungsfunktion (identisch mit posts.js)
function validateCommentForPrivacy(comment) {
  if (!comment || comment.trim().length === 0) {
    return { isValid: true };
  }

  const trimmedComment = comment.trim();

  const namePattern = /\b[A-ZÄÖÜ][a-zäöüß]+ [A-ZÄÖÜ][a-zäöüß]+\b/;
  const datePattern = /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/;

  const suspiciousPatterns = [
    { pattern: /schüler.*name/i, message: "Schülernamen" },
    { pattern: /student.*name/i, message: "Studentennamen" },
    { pattern: /heißt/i, message: 'Namen (Wort "heißt")' },
    { pattern: /ist\s+\d+\s+jahre\s+alt/i, message: "Altersangaben" },
    { pattern: /geburtsdatum/i, message: "Geburtsdatum" },
    { pattern: /\badresse\b/i, message: "Adressdaten" },
    { pattern: /wohnt\s+(in|im|an)/i, message: "Wohnortangaben" },
    { pattern: /telefon|handy|mobil/i, message: "Telefonnummern" },
    { pattern: /@.*\.(de|com|net|org)/i, message: "E-Mail-Adressen" },
  ];

  if (namePattern.test(trimmedComment)) {
    return { isValid: false, reason: "Namen erkannt" };
  }

  if (datePattern.test(trimmedComment)) {
    return { isValid: false, reason: "Datum erkannt" };
  }

  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(trimmedComment)) {
      return { isValid: false, reason: message };
    }
  }

  return { isValid: true };
}

async function cleanupComments() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const autoFix = args.includes("--auto-fix");

  console.log("🔍 DSGVO UAP9.1.2: Datenbank-Cleanup gestartet");
  console.log(`Mode: ${isDryRun ? "DRY-RUN (keine Änderungen)" : autoFix ? "AUTO-FIX (automatisch bereinigen)" : "INTERAKTIV"}`);
  console.log("─".repeat(60));

  try {
    // Verbinde mit Datenbank
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/feueralarm";
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Datenbankverbindung hergestellt");

    // Lade Post-Model
    const Post = require("../models/post");

    // Finde alle Posts mit Kommentaren
    const posts = await Post.find({
      comment: { $exists: true, $ne: "", $ne: " " },
    });

    console.log(`\n📊 Gefunden: ${posts.length} Posts mit Kommentaren\n`);

    let problematicPosts = [];
    let checkedCount = 0;

    // Prüfe jeden Post
    for (const post of posts) {
      checkedCount++;
      const validation = validateCommentForPrivacy(post.comment);

      if (!validation.isValid) {
        problematicPosts.push({
          id: post._id,
          class: post.class,
          comment: post.comment,
          reason: validation.reason,
          created: post.created,
        });

        console.log(`⚠️  Post ${post._id}`);
        console.log(`   Klasse: ${post.class}`);
        console.log(`   Kommentar: "${post.comment}"`);
        console.log(`   Problem: ${validation.reason}`);
        console.log(`   Erstellt: ${post.created}`);
        console.log("");

        if (autoFix && !isDryRun) {
          // Automatisch bereinigen
          post.comment = "[Kommentar entfernt - enthielt personenbezogene Daten]";
          await post.save();
          console.log("   ✅ Automatisch bereinigt\n");
        }
      }

      // Fortschritt anzeigen
      if (checkedCount % 100 === 0) {
        console.log(`   ... ${checkedCount}/${posts.length} geprüft`);
      }
    }

    // Zusammenfassung
    console.log("─".repeat(60));
    console.log("\n📋 ZUSAMMENFASSUNG:");
    console.log(`   Geprüft: ${posts.length} Posts`);
    console.log(`   Problematisch: ${problematicPosts.length} Posts`);

    if (isDryRun) {
      console.log("\n⚠️  DRY-RUN Modus: Keine Änderungen vorgenommen");
      console.log("   Führe das Script ohne --dry-run aus um zu bereinigen");
    } else if (autoFix) {
      console.log(`\n✅ ${problematicPosts.length} Posts automatisch bereinigt`);
    } else if (problematicPosts.length > 0) {
      console.log("\n💡 Nächste Schritte:");
      console.log("   1. Prüfe die Liste manuell");
      console.log("   2. Führe mit --auto-fix aus zum automatischen Bereinigen");
      console.log("   3. Oder bereinige manuell in der Datenbank");
    } else {
      console.log("\n✅ Keine problematischen Kommentare gefunden!");
    }

    // Export der problematischen Posts
    if (problematicPosts.length > 0 && !autoFix) {
      const fs = require("fs");
      const filename = `problematic-comments-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(problematicPosts, null, 2));
      console.log(`\n💾 Liste exportiert nach: ${filename}`);
    }
  } catch (error) {
    console.error("❌ Fehler:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Datenbankverbindung geschlossen");
  }
}

// Script ausführen
cleanupComments()
  .then(() => {
    console.log("\n✅ Cleanup abgeschlossen!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fehler:", error);
    process.exit(1);
  });
