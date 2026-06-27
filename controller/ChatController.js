import { Chats } from "../models/ChatSchema.js";
import { Friend } from "../models/FriendSchema.js";
import { uploadBuffer } from "../config/ConnectCloudinary.js";


export const GetChatHistory = async (req, res) => {
  try {
    const { friendId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const total = await Chats.countDocuments({ FriendId: friendId });
    const messages = await Chats.find({ FriendId: friendId })
      .populate({
        path: "media.PostId",
        populate: {
          path: "userId",
          select: "username profile"
        }
      })
      .sort({ _id: -1 })  // Newest first, reversed in frontend
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      messages: messages.reverse(), // Oldest at top
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


export const CreateChat = async (data) => {
  try {
    const { SenderId, RecieverId, media, FriendId } = data;
    if (!SenderId || !RecieverId || !media) return { success: false };
    
    let chat = await Chats.create({
      FriendId,
      SenderId,
      RecieverId,
      media,
      status: "delivered" 
    });

    if (media.dataType === "Post" && media.PostId) {
      chat = await Chats.findById(chat._id).populate({
        path: "media.PostId",
        populate: {
          path: "userId",
          select: "username profile"
        }
      });
    }

    return { success: true, payload: chat };
  } catch (error) {
    console.log("Create chat error:", error);
    return { success: false };
  }
};

export const UpdateChat = async (data) => {
  try {
    const { FriendId, status } = data;
    if (!FriendId || !status) return { success: false };

    // Mark ALL unread messages in this room as seen
    await Chats.updateMany(
      { FriendId, status: { $ne: "seen" } },
      { $set: { status } }
    );

    return { success: true, payload: { FriendId, status } };
  } catch (error) {
    console.log("Status update error:", error);
    return { success: false };
  }
};


export const getChatList = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all Friend docs where current user is involved AND a lastMessage exists
    const relations = await Friend.find({
      $or: [
        { user1: currentUserId },
        { user2: currentUserId }
      ],
      "lastMessage.chatId": { $exists: true, $ne: null }  // Only actual conversations
    })
      .populate("user1", "username fullname profile")
      .populate("user2", "username fullname profile")
      .sort({ "lastMessage.timestamp": -1 }); // Most recent first

    const chatList = relations
      .map((rel) => {
        // Defensive check if populates failed
        if (!rel.user1 || !rel.user2) return null;

        const isUser1 = rel.user1._id.toString() === currentUserId.toString();
        const otherUser = isUser1 ? rel.user2 : rel.user1;
        const iFollowThem = isUser1 ? rel.user1Following : rel.user2Following;
        const theyFollowMe = isUser1 ? rel.user2Following : rel.user1Following;

        // Skip if blocked
        if (rel.relationStatus === "blocked") {
          return null;
        }

        // Skip if neither follows each other
        const anyoneFollowing = rel.user1Following || rel.user2Following;
        if (!anyoneFollowing) {
          return null;
        }

        // Compute user-specific unread count
        const unreadCount = isUser1 ? (rel.user1UnreadCount || 0) : (rel.user2UnreadCount || 0);

        return {
          id: rel._id,           // The Friend doc _id (used as FriendId / room id)
          FriendId: rel._id,
          name: otherUser.fullname || otherUser.username,
          username: otherUser.username,
          RecieverId: otherUser._id.toString(),
          image: otherUser.profile || null,
          lastMessage: rel.lastMessage || null,
          unreadCount,
          iFollowThem,
          theyFollowMe,
          relationStatus: rel.relationStatus,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ success: true, chatList });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const uploadChatMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const mime = req.file.mimetype || "";
    let folder = "chats";
    let resource_type = "auto";

    if (mime.startsWith("image/")) {
      resource_type = "image";
    } else if (mime.startsWith("video/")) {
      resource_type = "video";
    } else if (mime.startsWith("audio/")) {
      resource_type = "video"; // Cloudinary treats audio under 'video' resource_type
    }

    const uploadResult = await uploadBuffer(req.file.buffer, {
      folder,
      resource_type
    });

    let dataType = "Text";
    if (mime.startsWith("image/")) dataType = "Image";
    else if (mime.startsWith("video/")) dataType = "Video";
    else if (mime.startsWith("audio/")) dataType = "Audio";

    return res.status(200).json({
      success: true,
      url: uploadResult.secure_url,
      resource_type: dataType
    });
  } catch (error) {
    console.error("Upload chat media error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};