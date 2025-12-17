const express = require("express");
const UserController = require("../controllers/users");
const checkAuth = require("../middleware/check-auth");
const checkPermission = require("../middleware/check-permission");

const router = express.Router();

// ==========================================
// PUBLIC ROUTES (ohne Auth)
// ==========================================

// Benutzer registrieren (public signup)
router.post("/signup", UserController.createUser);

// Benutzer login
router.post("/login", UserController.userLogin);

// Admin-Benutzer erstellen (mit Secret)
router.post("/create-admin", UserController.createAdminUser);

// ==========================================
// PROTECTED ROUTES (mit Auth + Admin)
// ==========================================

// Benutzer erstellen (Admin only)
router.post("/", checkAuth, checkPermission, UserController.createUserByAdmin);

// Alle Benutzer abrufen (Admin only)
router.get("/", checkAuth, checkPermission, UserController.getAllUsers);

// Einzelnen Benutzer abrufen (Admin only)
router.get("/:id", checkAuth, checkPermission, UserController.getUser);

// Benutzer aktualisieren (Admin only)
router.put("/:id", checkAuth, checkPermission, UserController.updateUser);

// Benutzer löschen (Admin only)
router.delete("/:id", checkAuth, checkPermission, UserController.deleteUser);

module.exports = router;
