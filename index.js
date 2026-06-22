import http from "http";
import { app } from "./app.js";
import { Server } from "socket.io";

const server = http.createServer(app);
const PORT = process.env.PORT || 4590;

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"]
  }
});

// Attach socket.io server instance to express app so it can be retrieved in controllers
app.set("socketio", io);

io.on("connection", (socket) => {
  console.log("Socket client connected:", socket.id);

  // Client registers room with their userId
  socket.on("register", (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`Socket ${socket.id} joined room ${userId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`server started at http://localhost:${PORT}`);
});