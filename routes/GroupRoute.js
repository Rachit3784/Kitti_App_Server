import express from "express";
import { verifyToken } from "../Middleware/JwtVerify.js";
import {
  createGroup,
  joinGroup,
  leaveGroup,
  getMyGroups,
  getGroupDetails,
  deleteCommunityPost,
  deleteGroup,
  checkMembership,
  getJoinedGroups
} from "../controller/GroupController.js";

const router = express.Router();

// Get communities I joined
router.get("/joined", verifyToken, getJoinedGroups);

// Create a new community
router.post("/create", verifyToken, createGroup);

// Join a community
router.post("/:groupId/join", verifyToken, joinGroup);

// Leave a community
router.post("/:groupId/leave", verifyToken, leaveGroup);

// Get communities I created (My Communities screen)
router.get("/mine", verifyToken, getMyGroups);

// Get community details + its posts (management screen)
router.get("/:groupId/details", verifyToken, getGroupDetails);

// Check if I am a member of a community
router.get("/:groupId/membership", verifyToken, checkMembership);

// Delete a specific post inside a community (owner only)
router.delete("/:groupId/posts/:postId", verifyToken, deleteCommunityPost);

// Delete an entire community + its posts (owner only)
router.delete("/:groupId", verifyToken, deleteGroup);

export default router;
