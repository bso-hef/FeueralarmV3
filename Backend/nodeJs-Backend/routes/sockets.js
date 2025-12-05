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
      socket.username = decoded.username || decoded.email || "unknown";
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

    // ==========================================
    // ALERT EVENT - Alarm auslösen
    // ==========================================
    socket.on("alert", async (data) => {
      console.log("🚨 Alert received from:", socket.email);

      // Mutex acquire - verhindert Race Conditions
      const release = await untisLock.acquire();

      try {
        // Füge userId und email hinzu
        data.userId = socket.userId;
        data.email = socket.email;
        data.role = socket.role;

        let res = await PostController.alert(data);

        if (res.message === "OK") {
          console.log("✅ Alert processed successfully");
          console.log(`📤 Sending ${res.teachers.length} posts to all clients`);

          // ✅ NEU: Sende "alarmStarted" Event an ALLE Clients
          io.emit("alarmStarted", {
            success: true,
            message: "Neuer Alarm wurde ausgelöst",
            triggeredBy: socket.email,
            timestamp: new Date().toISOString(),
          });

          // Sende Posts an alle Clients
          io.emit("emitPosts", {
            success: true,
            message: "Alarm erfolgreich ausgelöst",
            posts: res.teachers,
          });

          console.log("📡 Broadcast 'alarmStarted' sent to all clients");
        } else {
          console.error("❌ Alert processing failed:", res.message);
          socket.emit("error", { message: res.message });
        }
      } catch (error) {
        console.error("❌ Error processing alert:", error);
        socket.emit("error", { message: "Internal server error" });
      } finally {
        release();
      }
    });

    // ==========================================
    // UPDATE POST - Status ändern
    // ==========================================
    socket.on("updatePost", async (data) => {
      console.log("📝 === updatePost received ===");
      console.log("📝 From:", socket.email);
      console.log("📝 Data:", data);

      try {
        // Füge User-Informationen hinzu
        const updateData = {
          id: data.id,
          status: data.status,
          comment: data.comment,
          userId: socket.userId,
          username: socket.username,
        };

        console.log("📝 Calling PostController.updatePost with:", updateData);

        let res = await PostController.updatePost(updateData);

        console.log("📝 UpdatePost result:", res);

        if (res.success) {
          console.log("✅ Post updated successfully");
          console.log(`📤 Broadcasting update to all clients`);

          // ✅ Sende Update an ALLE Clients (inkl. Sender)
          io.emit("emitUpdate", {
            success: true,
            ...res.posts[0], // Der aktualisierte Post
          });

          // ✅ NEU: Sende "alarmUpdated" Event für Real-time Sync
          io.emit("alarmUpdated", {
            success: true,
            postId: data.id,
            updatedBy: socket.email,
            timestamp: new Date().toISOString(),
          });

          // Bestätigung an Sender
          socket.emit("updateSuccess", {
            success: true,
            message: "Post erfolgreich aktualisiert",
          });

          console.log("📡 Broadcast 'alarmUpdated' sent to all clients");
        } else {
          console.error("❌ Post update failed:", res.msg);
          socket.emit("updateError", {
            success: false,
            message: res.msg,
          });
        }
      } catch (error) {
        console.error("❌ Error updating post:", error);
        socket.emit("updateError", {
          success: false,
          message: "Internal server error",
        });
      }
    });

    // ==========================================
    // UPDATE COMMENT - Kommentar ändern
    // ==========================================
    socket.on("updateComment", async (data) => {
      console.log("💬 === updateComment received ===");
      console.log("💬 From:", socket.email);
      console.log("💬 Data:", data);

      try {
        const updateData = {
          id: data.id,
          comment: data.comment,
          userId: socket.userId,
          username: socket.username,
        };

        console.log("💬 Calling PostController.updatePost with:", updateData);

        let res = await PostController.updatePost(updateData);

        if (res.success) {
          console.log("✅ Comment updated successfully");

          // Sende Update an ALLE Clients
          io.emit("emitUpdate", {
            success: true,
            ...res.posts[0],
          });

          // ✅ NEU: Sende "alarmUpdated" Event
          io.emit("alarmUpdated", {
            success: true,
            postId: data.id,
            updatedBy: socket.email,
            type: "comment",
            timestamp: new Date().toISOString(),
          });

          socket.emit("updateSuccess", {
            success: true,
            message: "Kommentar erfolgreich aktualisiert",
          });

          console.log("📡 Broadcast 'alarmUpdated' (comment) sent to all clients");
        } else {
          console.error("❌ Comment update failed:", res.msg);
          socket.emit("updateError", {
            success: false,
            message: res.msg,
          });
        }
      } catch (error) {
        console.error("❌ Error updating comment:", error);
        socket.emit("updateError", {
          success: false,
          message: "Internal server error",
        });
      }
    });

    // ==========================================
    // GET POSTS - Aktuelle Posts abrufen
    // ==========================================
    socket.on("getPosts", async () => {
      console.log("📋 getPosts received from:", socket.email);

      try {
        const alertId = await PostController.getAlertId({});
        let res = await PostController.fetchPosts(null);

        if (res.success) {
          console.log(`✅ Sending ${res.posts.length} posts to ${socket.email}`);
          socket.emit("emitPosts", {
            success: true,
            message: "Posts erfolgreich geladen",
            posts: res.posts,
          });
        } else {
          console.error("❌ getPosts failed:", res.msg);
          socket.emit("error", { message: res.msg });
        }
      } catch (error) {
        console.error("❌ Error getting posts:", error);
        socket.emit("error", { message: "Internal server error" });
      }
    });

    // ==========================================
    // ALARM BEENDEN EVENT (Optional - für später)
    // ==========================================
    socket.on("endAlarm", async (data) => {
      console.log("🔚 endAlarm received from:", socket.email);

      try {
        // Sende "alarmEnded" Event an alle Clients
        io.emit("alarmEnded", {
          success: true,
          message: "Alarm wurde beendet",
          endedBy: socket.email,
          timestamp: new Date().toISOString(),
        });

        console.log("📡 Broadcast 'alarmEnded' sent to all clients");
      } catch (error) {
        console.error("❌ Error ending alarm:", error);
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
