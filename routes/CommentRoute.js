import express from "express";
import { verifyToken } from "../Middleware/JwtVerify.js";
import { addComment, getComments, deleteComment, getUserComments } from "../controller/CommentController.js";

const router = express.Router();

// Add a comment to a post
router.post("/post/:postId", verifyToken, addComment);

// Get paginated comments for a post
router.get("/post/:postId", getComments);

// Delete a comment (owner only)
router.delete("/:commentId", verifyToken, deleteComment);

// Get all comments made by a user (for Activity screen)
router.get("/user/:userId", getUserComments);

export default router;
