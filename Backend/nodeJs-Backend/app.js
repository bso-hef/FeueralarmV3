const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const userRoutes = require("./routes/users");

const app = express();

//mongoose.connect("mongodb+srv://dbAdmin:" + process.env.MONGO_ATLAS_PW + "@cluster0.wxiww.mongodb.net/<dbname>?retryWrites=true&w=majority")
//mongoose.connect(process.env.MONGO_CONNECTION_STRING)
mongoose.connect(process.env.MONGO_ATLAS_CONNECTION_STRING)
  .then(() => {
    console.log('Connected to database!')
  })
  .catch(() => {
    console.log('Connection failed!')
  });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  next();
});

app.use("/api/users/", userRoutes);

module.exports = app;
