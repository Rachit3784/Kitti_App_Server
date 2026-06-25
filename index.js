import http from "http";
import { app } from "./app.js";
import { Server } from "socket.io";
import { PostModel } from "./models/PostSchema.js";
import mongoose from "mongoose";

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

// ─────────────────────────────────────────────────────────────────────────────
// THROTTLED VOTE BROADCASTER
// Runs every 4 seconds, drains pendingVoteUpdates map, and emits consolidated
// vote data only to clients subscribed to that specific post's socket room.
// This prevents N×M broadcast storms on heavy vote traffic.
// ─────────────────────────────────────────────────────────────────────────────
const VOTE_BROADCAST_INTERVAL_MS = 4000;


// ─────────────────────────────────────────────────────────────────────────────
// THROTTLED VIEW BUFFER & BULK WRITER
// Runs every 10 seconds, flushes accumulated views to MongoDB in a single query.
// ─────────────────────────────────────────────────────────────────────────────
const pendingViews = new Map();

setInterval(async () => {
  if (pendingViews.size === 0) return;

  const ops = [];
  for (const [postId, count] of pendingViews.entries()) {
    try {
      ops.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(postId) },
          update: { $inc: { views: count } }
        }
      });
    } catch (err) {
      console.error(`[ViewBuffer] Invalid postId to flush: ${postId}`);
    }
  }
  pendingViews.clear();

  if (ops.length === 0) return;

  try {
    await PostModel.bulkWrite(ops);
    console.log(`[ViewBuffer] Successfully flushed view increments for ${ops.length} posts.`);
  } catch (error) {
    console.error("[ViewBuffer] Error writing bulk views:", error);
  }
}, 10000);

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET CONNECTION HANDLER
// ─────────────────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("Socket client connected:", socket.id);

  // ── User registration (for DMs, notifications, relationship events) ────────
  socket.on("register", (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`Socket ${socket.id} joined user room ${userId}`);
    }
  });

  // ── Post room management (viewport-driven, for real-time vote updates) ─────
  // Client joins when a post enters the viewport (passes 300ms debounce)
  socket.on("join_post_room", ({ postId }) => {
    if (!postId) return;
    const roomName = `post:${postId}`;
    socket.join(roomName);
    console.log(`[PostRoom] ${socket.id} → JOINED ${roomName}`);
  });

  // Client leaves when a post exits the viewport
  socket.on("leave_post_room", ({ postId }) => {
    if (!postId) return;
    const roomName = `post:${postId}`;
    socket.leave(roomName);
    console.log(`[PostRoom] ${socket.id} → LEFT ${roomName}`);
  });

  // ── Real-time view logging (bulk-written to DB every 10 seconds) ───────────
  socket.on("post_viewed", ({ postId }) => {
    if (!postId) return;
    pendingViews.set(postId.toString(), (pendingViews.get(postId.toString()) || 0) + 1);
  });

  // ── Disconnect cleanup (Socket.io auto-removes from all rooms on disconnect) ─
  socket.on("disconnect", () => {
    console.log("Socket client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`server started at http://localhost:${PORT}`);
});