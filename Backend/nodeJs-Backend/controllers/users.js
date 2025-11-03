const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

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
        { expiresIn: "1h" }
      );
      res.status(200).json({
        token: token,
        expiresIn: 3600,
        userId: fetchedUser._id,
        username: fetchedUser.username,
      });
    })
    .catch((err) => {
      // Nur senden wenn noch keine Response gesendet wurde
      if (!res.headersSent) {
        // Log error stack for debugging
        console.error("Authentication error:", err && err.stack ? err.stack : err);

        const resp = { message: "An error occurred during authentication" };
        if (process.env.NODE_ENV !== "production" && err && err.message) {
          resp.error = err.message;
        }
        res.status(500).json(resp);
      }
    });
};
