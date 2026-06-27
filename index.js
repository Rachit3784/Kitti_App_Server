import http from "http";
import { app } from "./app.js";
import { Server } from "socket.io";
import { CreateChat, UpdateChat } from "./controller/ChatController.js";
import {Friend} from "./models/FriendSchema.js";

const server = http.createServer(app);
const PORT = process.env.PORT || 4590;

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"]
  }
});

app.set("socketio", io);

const activeUser = {}; // Key: userId, Value: socketId

io.on("connection", (socket) => {
  console.log("Socket client connected:", socket.id);

  // 1. Register User
  socket.on("register", (userId) => {
    if (userId) {
      const userStrId = userId.toString();
      activeUser[userStrId] = socket.id; // Map userId to socketId
      socket.join(userStrId); 
      console.log(`User ${userStrId} is active with socket ${socket.id}`);
    }
  });

  // 2. Send Message
// 2. Send Message — with follower and block guards, and dynamic FriendId resolution
socket.on("send_message", async (data) => {
  let relation;
  if (data.FriendId) {
    relation = await Friend.findById(data.FriendId);
  } else {
    // Resolve custom FriendId using SenderId and RecieverId
    const strA = data.SenderId.toString();
    const strB = data.RecieverId.toString();
    const customId = strA < strB ? `${strA}_${strB}` : `${strB}_${strA}`;
    relation = await Friend.findById(customId);
    if (relation) {
      data.FriendId = relation._id;
    } else {
      // Create relationship if missing (optional fallback, but follow should cover it)
      relation = await Friend.create({
        _id: customId,
        user1: strA < strB ? data.SenderId : data.RecieverId,
        user2: strA < strB ? data.RecieverId : data.SenderId,
        requestFrom: data.SenderId,
        requestTo: data.RecieverId,
        relationStatus: "accepted",
        lastActionBy: data.SenderId
      });
      data.FriendId = relation._id;
    }
  }

  if (!relation) {
    socket.emit("message_error", { msg: "No relationship found. Cannot send message." });
    return;
  }

  // Blocks check
  if (relation.relationStatus === "blocked") {
    socket.emit("message_error", { msg: "Cannot send message. One of the accounts is blocked." });
    return;
  }

  // Either party must follow the other to allow chat
  const anyoneFollowing = relation.user1Following || relation.user2Following;
  if (!anyoneFollowing) {
    socket.emit("message_error", { msg: "At least one user must follow the other to chat." });
    return;
  }

  const resp = await CreateChat(data);
  if (resp.success) {
    const newChatMessage = resp.payload;

    const currentUserId = data.SenderId.toString();
    const isUser1 = relation.user1.toString() === currentUserId;

    // Build user-specific unread count updates
    const updateFields = {
      lastMessage: {
        chatId: newChatMessage._id,
        text: data.media?.dataType === "Post" ? "Shared a post" : (data.media?.Text || "Media File"),
        senderId: data.SenderId,
        timestamp: new Date(),
        status: "delivered"
      }
    };

    if (isUser1) {
      updateFields.user2UnreadCount = (relation.user2UnreadCount || 0) + 1;
    } else {
      updateFields.user1UnreadCount = (relation.user1UnreadCount || 0) + 1;
    }

    await Friend.findByIdAndUpdate(data.FriendId, {
      $set: updateFields
    });

    const receiverSocketId = activeUser[data?.RecieverId?.toString()];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("recieve_message", newChatMessage);
    }

    // Echo back to sender with server-confirmed payload
    socket.emit("message_sent", newChatMessage);
  }
});

// 3. Update Message Status (Seen)
socket.on("update_status", async (data) => {
  // data: { FriendId, SenderId, status: "seen" }
  const respp = await UpdateChat(data); 
  
  if (respp.success) {
    try {
      const relation = await Friend.findById(data.FriendId);
      if (relation) {
        // data.SenderId is the other person (the one who sent the messages)
        const isUser1 = relation.user1.toString() === data.SenderId.toString();
        const updateFields = {
          "lastMessage.status": "seen"
        };
        // Reset count for the person viewing (NOT data.SenderId)
        if (isUser1) {
          updateFields.user2UnreadCount = 0;
        } else {
          updateFields.user1UnreadCount = 0;
        }
        await Friend.findByIdAndUpdate(data.FriendId, {
          $set: updateFields
        });
        console.log(`Friend document ${data.FriendId} updated: unreadCount reset for viewer`);
      }
    } catch (err) {
      console.log("Error updating Friend schema on status update:", err);
    }

    // If sender online, send seen_message event
    const senderSocketId = activeUser[data?.SenderId?.toString()];
    if (senderSocketId) {
      io.to(senderSocketId).emit("seen_message", respp.payload);
    }
  }
});



  // 4. Fixed Disconnect Logic
  socket.on("disconnect", () => {
    // Socket.id se dhundho ki kaun sa user tha aur delete karo
    for (let userId in activeUser) {
      if (activeUser[userId] === socket.id) {
        console.log(`User ${userId} disconnected.`);
        delete activeUser[userId];
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});


