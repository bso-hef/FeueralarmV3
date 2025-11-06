require("dotenv").config();

const http = require("http");
const debug = require("debug")("node-angular");
const app = require("./app");
const normalizePort = (val) => {
  const port = process.env.PORT || 3000;

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
};

const onError = (error) => {
  if (error.syscall !== "listen") {
    throw error;
  }
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + port;
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privilges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already is use");
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + port;
  debug("Listening on " + bind);
};

const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

const server = http.createServer(app);
server.on("error", onError);
server.on("listening", onListening);

// Socket.io initialisieren
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

// Socket-Handler laden
require("./routes/sockets")(io);

server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 Listening on all network interfaces (0.0.0.0:${port})`);
  console.log(`🌐 Access from network: http://18.193.97.54:${port}`);
});
