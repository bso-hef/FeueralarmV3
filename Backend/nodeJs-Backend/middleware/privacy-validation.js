function validateComment(comment) {
  if (!comment || comment.trim().length === 0) {
    return { valid: true };
  }

  const trimmedComment = comment.trim();

  // Pattern für Namen
  const namePattern = /\b[A-ZÄÖÜ][a-zäöüß]+ [A-ZÄÖÜ][a-zäöüß]+\b/;

  // Pattern für Geburtsdaten
  const datePattern = /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/;

  // Verdächtige Begriffe
  const suspiciousPatterns = [
    { pattern: /schüler.*name/i, message: "Schülernamen" },
    { pattern: /student.*name/i, message: "Studentennamen" },
    { pattern: /heißt/i, message: "Namen" },
    { pattern: /ist\s+\d+\s+jahre\s+alt/i, message: "Altersangaben" },
    { pattern: /geburtsdatum/i, message: "Geburtsdatum" },
    { pattern: /\badresse\b/i, message: "Adresse" },
    { pattern: /wohnt\s+(in|im|an)/i, message: "Wohnort" },
    { pattern: /telefon|handy|mobil/i, message: "Telefonnummer" },
    { pattern: /@.*\.(de|com|net|org)/i, message: "E-Mail" },
  ];

  if (namePattern.test(trimmedComment)) {
    return {
      valid: false,
      error: "Kommentar enthält möglicherweise Namen",
      code: "PRIVACY_NAME_DETECTED",
    };
  }

  if (datePattern.test(trimmedComment)) {
    return {
      valid: false,
      error: "Kommentar enthält ein Datum",
      code: "PRIVACY_DATE_DETECTED",
    };
  }

  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(trimmedComment)) {
      return {
        valid: false,
        error: `Kommentar enthält ${message}`,
        code: `PRIVACY_${message.toUpperCase().replace(/\s+/g, "_")}_DETECTED`,
      };
    }
  }

  if (trimmedComment.length > 500) {
    return {
      valid: false,
      error: "Kommentar ist zu lang (max. 500 Zeichen)",
      code: "COMMENT_TOO_LONG",
    };
  }

  return { valid: true };
}

/**
 * Express Middleware: Prüft Request-Body auf personenbezogene Daten
 */
function validatePrivacyMiddleware(req, res, next) {
  // Prüfe nur POST/PUT/PATCH Requests
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    return next();
  }

  // Prüfe ob comment im Body vorhanden
  if (req.body && req.body.comment) {
    const validation = validateComment(req.body.comment);

    if (!validation.valid) {
      console.warn(`⚠️ DSGVO: Request blockiert - ${validation.error}`);
      console.warn(`   Route: ${req.path}`);
      console.warn(`   User: ${req.user?.username || "unbekannt"}`);
      console.warn(`   Comment: "${req.body.comment}"`);

      return res.status(400).json({
        success: false,
        error: validation.error,
        code: validation.code,
        message: "DSGVO-Validierung: Bitte keine personenbezogenen Daten eingeben!",
      });
    }
  }

  // Prüfe andere Felder falls nötig
  // ... weitere Validierungen können hier hinzugefügt werden

  next();
}

/**
 * Logging-Sanitizer: Entfernt sensible Daten aus Logs
 */
function sanitizeLogData(data) {
  if (!data) return data;

  const sanitized = { ...data };

  // Entferne Passwörter
  if (sanitized.password) sanitized.password = "[REDACTED]";
  if (sanitized.pwd) sanitized.pwd = "[REDACTED]";
  if (sanitized.pass) sanitized.pass = "[REDACTED]";

  // Entferne Tokens
  if (sanitized.token) sanitized.token = "[REDACTED]";
  if (sanitized.jwt) sanitized.jwt = "[REDACTED]";
  if (sanitized.authorization) sanitized.authorization = "[REDACTED]";

  // Kürze lange Strings (vermutlich IDs oder Tokens)
  Object.keys(sanitized).forEach((key) => {
    if (typeof sanitized[key] === "string" && sanitized[key].length > 100) {
      sanitized[key] = sanitized[key].substring(0, 50) + "... [TRUNCATED]";
    }
  });

  return sanitized;
}

/**
 * Response-Sanitizer: Entfernt sensible Daten aus API-Responses
 */
function sanitizeResponse(data) {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(sanitizeResponse);

  const sanitized = { ...data };

  // Entferne sensible User-Felder
  if (sanitized.password) delete sanitized.password;
  if (sanitized.salt) delete sanitized.salt;
  if (sanitized.hash) delete sanitized.hash;

  // Entferne Token aus User-Objekten
  if (sanitized.token) delete sanitized.token;
  if (sanitized.refreshToken) delete sanitized.refreshToken;

  return sanitized;
}

module.exports = {
  validateComment,
  validatePrivacyMiddleware,
  sanitizeLogData,
  sanitizeResponse,
};
