const socketio = require("socket.io");
const socketauth = require("socketio-jwt");
const PostController = require("../controllers/posts");

var busyWithUntis = false;

module.exports.listen = function(server) {
    var io = socketio.listen(server);

    io.on("connection", socketauth.authorize({
        secret: process.env.JWT_KEY,
        timeout: 5000
    }))
    .on("authenticated", (socket) => {        
        console.log("user is authenticated and logged in");
        socket.emit("emitSocketId", {
            success: true,
            msg: socket.id,
            posts: []
        });

        socket.on("disconnect", () => {
            console.log("user disconnected");
        });

        socket.on("alert", async (data) => {
            if (busyWithUntis) {
                socket.emit("emitError", {
                    success: true,
                    msg: "Es wurde bereits ein Feueralarm ausgelöst. Ihre Anwendung wird sich jeden Augenblick aktualisieren.",
                    posts: []
                });
                return;
            }

            let res = await PostController.alert(data);
            if (res.success) {
                try {
                    io.sockets.emit("emitPosts", res);
                    res = await PostController.fetchAlerts();
                    if (res.success) io.sockets.emit("emitAlerts", res);
                }
                catch (err) {
                    console.log(err.message);
                    socket.emit("emitError", {
                        success: false,
                        msg: err.message,
                        posts: []
                    });
                }
            }                
            else socket.emit("emitError", res);
        });

        socket.on("fetchAlerts", async (data) => {
            let res = await PostController.fetchAlerts();

            if (res.success)
                socket.emit("emitAlerts", res);
            else socket.emit("emitError", res);
        });

        socket.on("fetchPosts", async (data) => {
            alertId = await PostController.getAlertId(data);
            let res = await PostController.fetchPosts(alertId);
            
            if (res.success)
                socket.emit("emitPosts", res);
            else socket.emit("emitError", res);
        });

        socket.on("updatePost", async (data) => {
            let res = await PostController.updatePost(data);            

            if (res.success) {
                res.msg = socket.id;
                io.sockets.emit("emitUpdate", res);                
            }
            else socket.emit("emitError", res);
        });
    });
}