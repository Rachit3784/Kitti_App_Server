import express from "express";
import { verifyToken } from "../Middleware/JwtVerify.js";
import { uploads } from "../config/MulterSetup.js";
import { 
    createPost, 
    getFeed, 
    getUserPosts, 
    editPost, 
    deletePost, 
    searchPost,
    toggleVote,
    togglePollVote,
    getLikedPosts
} from "../controller/PostController.js";

const router = express.Router();

// 1. Route for creating a post (Supports full polymorphic media file tracking)
router.post(
    "/create",
    verifyToken,
    uploads.fields([
        { name: "media", maxCount: 10 }, // For Images, gallery, carousel items layout
        { name: "video", maxCount: 1 },  // For standalone video tracking streams
        { name: "audio", maxCount: 1 },  // For pod/music tracks configurations
        { name: "pdf", maxCount: 1 }     // ADDED: For processing system architectural PDFs/Docs raw formats
    ]),
    createPost
);

// 2. Route for fetching impression-fatigued, paginated feed
// Kept as POST so the client can comfortably pass parsed arrays/payload inside request body
router.route("/feed").get(getFeed).post(getFeed);

// 3. Route for dynamic keyword/regex search queries across posts
// Client format call example: /posts/search?query=react
router.get("/search", searchPost);

// 4. Route for fetching a specific user's profiles posts tracking
router.get("/user/:userId", getUserPosts);

// 5. Route for upvoting/downvoting — writes metrics into background pending throttling memory buffers
router.post("/:postId/vote", verifyToken, toggleVote);

// Route for poll voting
router.post("/:postId/poll-vote", verifyToken, togglePollVote);

// 6. Route for patching/editing post structural attributes dynamically
router.put("/:postId", verifyToken, editPost);

// 7. Route for dropping and wiping database posts alongside unlinking assets on Cloudinary core buckets
router.delete("/:postId", verifyToken, deletePost);

// 8. Route for fetching posts a user has upvoted (Activity Screen - Likes tab)
router.get("/liked/:userId", verifyToken, getLikedPosts);

export default router;