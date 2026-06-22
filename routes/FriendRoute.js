import express from "express";
import {verifyToken } from "../Middleware/JwtVerify.js";
import FriendsController from "../controller/FriendController.js";

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

export default friendrouter;