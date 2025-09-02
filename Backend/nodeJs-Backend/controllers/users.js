const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

exports.createUser = (req, res, next) => {
  bcrypt.hash(req.body.password, 10)
    .then(hash => {
      let roleStr = "user";
      if (req.body.role && req.body.role == "imtheman") {
        roleStr = "admin";
      }
      const user = new User({
        email: req.body.email,
        password: hash,
        role: roleStr
      });
      user.save()
        .then(result => {
          res.status(201).json({
            message: 'User created!',
            result: result
          });
        })
        .catch(err => {
          res.status(500).json({
            message: "Invalid authentication credentials!"
          });
        });
    })
    .catch(err => {
      res.status(500).json({
        request: req.message,
        message: err.message
      })
    });
}

exports.userLogin = (req, res, next) => {
  let fetchedUser;
  User.findOne({ email: req.body.email })
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: "Invalid authentication credentials!", info: "erstes" });
      }
      fetchedUser = user;
      return bcrypt.compare(req.body.password, fetchedUser.password);
    })
    .then(result => {
      if (!result) {
        return res.status(404).json({ message: "Invalid authentication credentials!", info: "zweites" });
      }
      const token = jwt.sign({ email: fetchedUser.email, userId: fetchedUser._id, role: fetchedUser.role }, process.env.JWT_KEY, { expiresIn: "1h" });
      res.status(200).json({ token: token, expiresIn: 3600, userId: fetchedUser._id });
    })
    .catch(err => {
      return res.status(404).json({ message: "Invalid authentication credentials!", info: "drittes", shiet: fetchedUser });
    });
}
