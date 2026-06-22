import express from "express";
import { verifyToken } from "../Middleware/JwtVerify.js";
import { uploads } from "../config/MulterSetup.js";
import { createPost, getFeed, getUserPosts, toggleVote, editPost, deletePost } from "../controller/PostController.js";

const router = express.Router();

// Route for creating a post (requires auth, accepts media file fields)
router.post(
    "/create",
    verifyToken,
    uploads.fields([
        { name: "media", maxCount: 10 },
        { name: "video", maxCount: 1 },
        { name: "audio", maxCount: 1 }
    ]),
    createPost
);

// Route for fetching paginated feed
router.get("/feed", getFeed);

// Route for fetching a specific user's posts
router.get("/user/:userId", getUserPosts);

// Route for upvoting/downvoting in real-time
router.post("/:postId/vote", verifyToken, toggleVote);

// Route for editing a post's title & description
router.put("/:postId", verifyToken, editPost);

// Route for deleting a post and cleaning up files
router.delete("/:postId", verifyToken, deletePost);

export default router;
