const PostController = require("../controllers/posts");
const jwt = require("jsonwebtoken");
const { Mutex } = require("async-mutex");

// Mutex für Thread-Safety bei WebUntis-Anfragen
const untisLock = new Mutex();

module.exports = (io) => {
  // Moderne JWT-Authentifizierung Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      // Token verifizieren
      const decoded = jwt.verify(token, process.env.JWT_KEY);

      // User-ID und Email im Socket speichern
      socket.userId = decoded.userId;
      socket.email = decoded.email || decoded.username || "unknown";
      socket.role = decoded.role;

      console.log(`✅ User authenticated: ${socket.email} (${socket.userId})`);
      next();
    } catch (error) {
      console.error("❌ Authentication failed:", error.message);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id} (User: ${socket.email})`);

    // Alert Event mit Mutex für Thread-Safety
    socket.on("alert", async (data) => {
      console.log("🚨 Alert received from:", socket.email);

      // Mutex acquire - verhindert Race Conditions
      const release = await untisLock.acquire();

      try {
        // 🔧 FIX: Füge userId und email hinzu (statt token)
        data.userId = socket.userId;
        data.email = socket.email;
        data.role = socket.role;

        let res = await PostController.alert(data);

        if (res.message === "OK") {
          console.log("✅ Alert processed successfully");
          console.log(`📤 Sending ${res.teachers.length} posts to all clients`);
          
          // 🔧 FIX: Sende emitPosts statt alert, damit Frontend es empfängt!
          io.emit("emitPosts", {
            success: true,
            message: "Alarm erfolgreich ausgelöst",
            posts: res.teachers,
          });
        } else {
          console.error("❌ Alert processing failed:", res.message);
          socket.emit("error", { message: res.message });
        }
      } catch (error) {
        console.error("❌ Error processing alert:", error);
        socket.emit("error", { message: "Internal server error" });
      } finally {
        // Mutex release - IMMER ausführen
        release();
      }
    });

    // Disconnect Event
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (Reason: ${reason})`);
    });

    // Error Event
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });
};