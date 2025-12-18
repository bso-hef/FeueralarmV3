const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

// ==========================================
// USER SIGNUP
// ==========================================
exports.createUser = (req, res, next) => {
  bcrypt
    .hash(req.body.password, 10)
    .then((hash) => {
      let roleStr = "user";
      if (req.body.role && req.body.role == "imtheman") {
        roleStr = "admin";
      }
      const user = new User({
        username: req.body.username,
        password: hash,
        role: roleStr,
      });
      user
        .save()
        .then((result) => {
          res.status(201).json({
            message: "User created!",
            result: result,
          });
        })
        .catch((err) => {
          res.status(500).json({
            message: "Invalid authentication credentials!",
          });
        });
    })
    .catch((err) => {
      res.status(500).json({
        request: req.message,
        message: err.message,
      });
    });
};

// ==========================================
// USER LOGIN
// ==========================================
exports.userLogin = (req, res, next) => {
  let fetchedUser;
  User.findOne({ username: req.body.username })
    .then((user) => {
      if (!user) {
        res.status(404).json({ message: "Invalid authentication credentials!" });
        return Promise.reject("User not found");
      }
      fetchedUser = user;
      return bcrypt.compare(req.body.password, fetchedUser.password);
    })
    .then((result) => {
      if (!result) {
        res.status(404).json({ message: "Invalid authentication credentials!" });
        return Promise.reject("Invalid password");
      }
      const token = jwt.sign(
        {
          username: fetchedUser.username,
          userId: fetchedUser._id,
          role: fetchedUser.role,
        },
        process.env.JWT_KEY,
        { expiresIn: "14d" }
      );
      res.status(200).json({
        token: token,
        expiresIn: 1209600,
        userId: fetchedUser._id,
        username: fetchedUser.username,
      });
    })
    .catch((err) => {
      if (!res.headersSent) {
        console.error("Authentication error:", err && err.stack ? err.stack : err);
        const resp = { message: "An error occurred during authentication" };
        if (process.env.NODE_ENV !== "production" && err && err.message) {
          resp.error = err.message;
        }
        res.status(500).json(resp);
      }
    });
};

// ==========================================
// GET ALL USERS (Admin only)
// ==========================================
exports.getAllUsers = async (req, res, next) => {
  try {
    // Passwörter nicht zurückgeben
    const users = await User.find({}, { password: 0 }).sort({ username: 1 });

    res.status(200).json({
      message: "Users fetched successfully",
      users: users,
      count: users.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE USER (Admin only)
// ==========================================
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id, { password: 0 });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "User fetched successfully",
      user: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// ==========================================
// CREATE USER (Admin only)
// ==========================================
exports.createUserByAdmin = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;

    // DEBUG LOGS
    console.log("📥 Received request body:", req.body);
    console.log("📥 Extracted role:", role);
    console.log("📥 Role type:", typeof role);

    // Validierung
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    // Prüfen ob User bereits existiert
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    // User erstellen
    const newUser = new User({
      username: username,
      password: hashedPassword,
      role: role || "user",
    });

    const savedUser = await newUser.save();

    // Passwort nicht zurückgeben
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      message: "Error creating user",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE USER (Admin only)
// ==========================================
exports.updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { username, password, role } = req.body;

    // User finden
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Update-Objekt erstellen
    const updateData = {};

    if (username) {
      // Prüfen ob neuer Username bereits existiert
      const existingUser = await User.findOne({
        username: username,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(409).json({
          message: "Username already exists",
        });
      }
      updateData.username = username;
    }

    if (password) {
      // Neues Passwort hashen
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (role) {
      updateData.role = role;
    }

    // User aktualisieren
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      select: "-password",
    });

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      message: "Error updating user",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE USER (Admin only)
// ==========================================
exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Prüfen ob User der eingeloggte User ist
    if (userId === req.userData.userId) {
      return res.status(403).json({
        message: "You cannot delete yourself",
      });
    }

    // User löschen
    const result = await User.findByIdAndDelete(userId);

    if (!result) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "User deleted successfully",
      deletedUser: {
        _id: result._id,
        username: result.username,
      },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      message: "Error deleting user",
      error: error.message,
    });
  }
};

// ==========================================
// CREATE ADMIN USER (mit Secret)
// ==========================================
exports.createAdminUser = async (req, res, next) => {
  try {
    const { username, password, adminSecret } = req.body;

    // Admin Secret prüfen
    const ADMIN_SECRET = process.env.ADMIN_SECRET || "supersecret123";
    if (adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({
        message: "Invalid admin secret",
      });
    }

    // Validierung
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    // Prüfen ob User bereits existiert
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    // Admin User erstellen
    const newUser = new User({
      username: username,
      password: hashedPassword,
      role: "admin",
    });

    const savedUser = await newUser.save();

    // Passwort nicht zurückgeben
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "Admin user created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error creating admin user:", error);
    res.status(500).json({
      message: "Error creating admin user",
      error: error.message,
    });
  }
};
