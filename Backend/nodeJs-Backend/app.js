require("dotenv").config();

const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const userRoutes = require("./routes/users");
const alertRoutes = require("./routes/alerts");
const postRoutes = require("./routes/posts"); // UAP 9.3.1: Posts mit Audit-Logging
const auditLogRoutes = require("./routes/audit-logs"); // UAP 9.3.2: Audit-Logs Ansicht
const attachmentRoutes = require("./routes/attachments.routes");
const exportRoutes = require("./routes/export"); // UAP 6.3: Export-API

// UAP 7.2.1: OpenAPI Spezifikation laden
const swaggerDocument = YAML.load(path.join(__dirname, "openapi.yaml"));

const app = express();

mongoose
  .connect(process.env.MONGO_ATLAS_CONNECTION_STRING)
  .then(() => {
    console.log("Connected to database!");
  })
  .catch(() => {
    console.log("Connection failed!");
  });

app.use(bodyParser.json({ limit: "10mb" })); // ← ERWEITERT: Größeres Limit für Fotos
app.use(bodyParser.urlencoded({ extended: false, limit: "10mb" })); // ← ERWEITERT

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use("/api/users/", userRoutes);
app.use("/api/alerts/", alertRoutes);
app.use("/api/posts/", postRoutes); // ← UAP 9.3.1: Posts mit Audit-Logging
app.use("/api/audit-logs/", auditLogRoutes); // ← UAP 9.3.2: Audit-Logs Ansicht
app.use("/api/teachers/", attachmentRoutes); // ← NEU: Attachment Routes
app.use("/api/export/", exportRoutes); // ← UAP 6.3: Export-API mit Auth

// UAP 7.2.1: API-Dokumentation mit Swagger UI
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "FeueralarmV3 API Documentation",
  })
);

module.exports = app;
