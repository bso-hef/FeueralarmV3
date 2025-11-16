const express = require("express");
const PostController = require("../controllers/posts");
const checkAuth = require("../middleware/check-auth");
const jwt = require("jsonwebtoken");

const router = express.Router();

/**
 * Helper-Funktion: Extrahiert User-Informationen aus dem JWT-Token
 */
function getUserFromToken(req) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    return {
      userId: decoded.userId,
      username: decoded.email || decoded.username,
    };
  } catch (error) {
    console.error("❌ Fehler beim Extrahieren der User-Daten:", error);
    return null;
  }
}

// ==========================================
// PUBLIC ROUTES (mit Auth)
// ==========================================

// Alle Posts abrufen
router.get("/", checkAuth, async (req, res) => {
  try {
    const alertId = req.query.alertId || (await PostController.getAlertId());
    const result = await PostController.fetchPosts(alertId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
      posts: [],
    });
  }
});

// Alarm erstellen
router.get("/alert", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const time = req.query.time;
    const day = req.query.day;

    const result = await PostController.alert({ token, time, day });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
      posts: [],
    });
  }
});

// Post aktualisieren (Status oder Kommentar)
// UAP 9.3.1: Mit User-Tracking für Audit-Logging
router.put("/:id", checkAuth, async (req, res) => {
  try {
    const user = getUserFromToken(req);

    const data = {
      id: req.params.id,
      status: req.body.status,
      comment: req.body.comment,
      // UAP 9.3.1: User-Informationen für Audit-Logging
      userId: user?.userId,
      username: user?.username,
    };

    const result = await PostController.updatePost(data);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
      posts: [],
    });
  }
});

// Post löschen (falls benötigt)
router.delete("/:id", checkAuth, async (req, res) => {
  try {
    // Implementierung folgt bei Bedarf
    res.status(501).json({
      success: false,
      msg: "Löschen von Posts ist aktuell nicht implementiert",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
});

module.exports = router;
