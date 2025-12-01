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

    // Alert Event mit Mutex für Thread-Safety
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
        release();
      }
    });

    // ==========================================
    // UPDATE POST (NEU!)
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

          // Sende Update an ALLE Clients (inkl. Sender)
          io.emit("emitUpdate", {
            success: true,
            ...res.posts[0], // Der aktualisierte Post
          });

          // Bestätigung an Sender
          socket.emit("updateSuccess", {
            success: true,
            message: "Post erfolgreich aktualisiert",
          });
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

    // UPDATE COMMENT (NEU!)
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

          io.emit("emitUpdate", {
            success: true,
            ...res.posts[0],
          });

          socket.emit("updateSuccess", {
            success: true,
            message: "Kommentar erfolgreich aktualisiert",
          });
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

    // GET POSTS (NEU!)
    socket.on("getPosts", async () => {
      console.log("📋 getPosts received from:", socket.email);

      try {
        let res = await PostController.getPosts();

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
