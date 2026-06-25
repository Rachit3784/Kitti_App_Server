import express from "express";
import { verifyToken } from "../Middleware/JwtVerify.js";
import { toggleFollow, checkFollowStatus } from "../controller/FollowController.js";

const router = express.Router();

// Toggle follow/unfollow status
router.post("/toggle", verifyToken, toggleFollow);

// Check follow status of a user
router.get("/status/:targetUserId", verifyToken, checkFollowStatus);

export default router;
