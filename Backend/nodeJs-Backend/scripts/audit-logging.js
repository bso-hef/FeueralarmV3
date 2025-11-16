const fs = require("fs");
const path = require("path");

// Patterns die auf problematisches Logging hinweisen
const PROBLEMATIC_PATTERNS = [
  {
    pattern: /console\.log.*\b(password|pwd|pass)\b/gi,
    severity: "CRITICAL",
    message: "Passwort wird geloggt",
  },
  {
    pattern: /console\.log.*\b(email|mail)\b/gi,
    severity: "HIGH",
    message: "E-Mail wird geloggt",
  },
  {
    pattern: /console\.log.*\b(username|user\.name)\b/gi,
    severity: "MEDIUM",
    message: "Benutzername wird geloggt",
  },
  {
    pattern: /console\.log.*\b(token|jwt|auth)\b/gi,
    severity: "CRITICAL",
    message: "Token/Auth-Daten werden geloggt",
  },
  {
    pattern: /console\.log.*\b(ip|ipaddress)\b/gi,
    severity: "MEDIUM",
    message: "IP-Adresse wird geloggt",
  },
  {
    pattern: /console\.log.*req\.body/gi,
    severity: "HIGH",
    message: "Request-Body wird komplett geloggt (könnte Passwörter enthalten)",
  },
  {
    pattern: /console\.log.*req\.headers/gi,
    severity: "MEDIUM",
    message: "Request-Headers werden geloggt (könnte Auth-Tokens enthalten)",
  },
];

// Dateien die geprüft werden sollen
const DIRECTORIES_TO_SCAN = ["controllers", "routes", "middleware", "models", "services", "utils"];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const issues = [];

  lines.forEach((line, index) => {
    PROBLEMATIC_PATTERNS.forEach(({ pattern, severity, message }) => {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: index + 1,
          severity,
          message,
          code: line.trim(),
        });
      }
    });
  });

  return issues;
}

function scanDirectory(dir) {
  let allIssues = [];

  if (!fs.existsSync(dir)) {
    console.log(`⚠️  Verzeichnis nicht gefunden: ${dir}`);
    return allIssues;
  }

  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      allIssues = allIssues.concat(scanDirectory(fullPath));
    } else if (file.endsWith(".js")) {
      const issues = scanFile(fullPath);
      allIssues = allIssues.concat(issues);
    }
  });

  return allIssues;
}

function auditLogging() {
  console.log("🔍 DSGVO UAP9.1.2: Logging-Audit gestartet");
  console.log("─".repeat(60));
  console.log("");

  const baseDir = path.join(__dirname, "..");
  let allIssues = [];

  DIRECTORIES_TO_SCAN.forEach((dir) => {
    const fullPath = path.join(baseDir, dir);
    console.log(`📁 Scanne ${dir}/...`);
    const issues = scanDirectory(fullPath);
    allIssues = allIssues.concat(issues);
  });

  // Gruppiere nach Severity
  const critical = allIssues.filter((i) => i.severity === "CRITICAL");
  const high = allIssues.filter((i) => i.severity === "HIGH");
  const medium = allIssues.filter((i) => i.severity === "MEDIUM");

  console.log("\n" + "─".repeat(60));
  console.log("\n📊 ERGEBNISSE:\n");

  // Critical Issues
  if (critical.length > 0) {
    console.log("🔴 CRITICAL (" + critical.length + " Probleme):");
    critical.forEach((issue) => {
      console.log(`\n   📍 ${issue.file}:${issue.line}`);
      console.log(`      ${issue.message}`);
      console.log(`      Code: ${issue.code}`);
    });
    console.log("");
  }

  // High Issues
  if (high.length > 0) {
    console.log("🟠 HIGH (" + high.length + " Probleme):");
    high.forEach((issue) => {
      console.log(`\n   📍 ${issue.file}:${issue.line}`);
      console.log(`      ${issue.message}`);
      console.log(`      Code: ${issue.code}`);
    });
    console.log("");
  }

  // Medium Issues
  if (medium.length > 0) {
    console.log("🟡 MEDIUM (" + medium.length + " Probleme):");
    medium.forEach((issue) => {
      console.log(`\n   📍 ${issue.file}:${issue.line}`);
      console.log(`      ${issue.message}`);
      console.log(`      Code: ${issue.code}`);
    });
    console.log("");
  }

  // Zusammenfassung
  console.log("─".repeat(60));
  console.log("\n📋 ZUSAMMENFASSUNG:");
  console.log(`   🔴 CRITICAL: ${critical.length}`);
  console.log(`   🟠 HIGH: ${high.length}`);
  console.log(`   🟡 MEDIUM: ${medium.length}`);
  console.log(`   📊 GESAMT: ${allIssues.length}`);

  if (allIssues.length === 0) {
    console.log("\n✅ Keine problematischen Logging-Statements gefunden!");
  } else {
    console.log("\n💡 EMPFEHLUNGEN:");
    console.log("   1. CRITICAL Issues sofort beheben (Passwörter, Tokens)");
    console.log("   2. HIGH Issues prüfen und ggf. entfernen");
    console.log("   3. MEDIUM Issues dokumentieren oder entfernen");
    console.log("   4. Erwäge strukturiertes Logging (z.B. Winston)");
  }

  // Export
  if (allIssues.length > 0) {
    const filename = `logging-audit-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(allIssues, null, 2));
    console.log(`\n💾 Vollständiger Report: ${filename}`);
  }

  console.log("");

  // Exit Code
  if (critical.length > 0) {
    console.log("❌ Audit fehlgeschlagen: CRITICAL Issues gefunden!");
    process.exit(1);
  } else {
    console.log("✅ Audit abgeschlossen!");
    process.exit(0);
  }
}

// Script ausführen
auditLogging();
