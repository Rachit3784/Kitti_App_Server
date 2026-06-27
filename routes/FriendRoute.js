import express from "express";
import {verifyToken } from "../Middleware/JwtVerify.js";
import FriendsController from "../controller/FriendController.js";
import { GetChatHistory, getChatList, uploadChatMedia } from "../controller/ChatController.js";
import { uploads } from "../config/MulterSetup.js";
import { createStory, getStories, viewStory, deleteStory } from "../controller/StoryController.js";

const friendrouter = express.Router();

// All relationship interactions require an authenticated user session
friendrouter.use(verifyToken);

// Mutative State Operations
friendrouter.post("/accept", FriendsController.acceptRequest);
friendrouter.post("/unfollow", FriendsController.unfollowUser);
friendrouter.post("/follow", FriendsController.followUser);
friendrouter.post("/reject", FriendsController.deleteRequest);
friendrouter.post("/remove-follower", FriendsController.removeFollower);
friendrouter.post("/block", FriendsController.blockUser);
friendrouter.post("/unblock", FriendsController.unblockUser);

// Profile Visit Relationship State Check
friendrouter.get("/state/:targetUserId", FriendsController.getProfileRelationState);
friendrouter.get("/followers/:targetUserId", FriendsController.getFollowers);
friendrouter.get("/following/:targetUserId", FriendsController.getFollowing);
friendrouter.get("/contacts", verifyToken, FriendsController.getContacts);
// Add this line alongside your existing friend routes
friendrouter.get("/chat-list", verifyToken,getChatList);
friendrouter.get('/:friendId', verifyToken, GetChatHistory);
friendrouter.post("/upload-media", verifyToken, uploads.single("file"), uploadChatMedia);

// Stories
friendrouter.get("/stories/all", verifyToken, getStories);
friendrouter.post("/stories/create", verifyToken, uploads.single("file"), createStory);
friendrouter.post("/stories/view/:storyId", verifyToken, viewStory);
friendrouter.delete("/stories/:storyId", verifyToken, deleteStory);

export default friendrouter;