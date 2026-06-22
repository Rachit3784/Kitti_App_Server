import { PostModel } from "../models/PostSchema.js";
import { uploadBuffer, deleteFromCloudinary } from "../config/ConnectCloudinary.js";
import mongoose from "mongoose";

// Create a new post (Supports text, gallery, video, audio)
export const createPost = async (req, res) => {
    try {
        const { type, title, description, audioName } = req.body;
        const userId = req.user._id;

        if (!type || !title) {
            return res.status(400).json({ success: false, message: "Type and Title are required." });
        }

        const mediaUrls = [];
        const videoUrl = [];
        const audioUrl = [];

        // Upload Gallery Images if any
        if (req.files?.media && req.files.media.length > 0) {
            const uploadPromises = req.files.media.map((file, idx) => {
                const publicId = `post_img_${userId}_${Date.now()}_${idx}`;
                return uploadBuffer(file.buffer, {
                    folder: `posts/${userId}/gallery`,
                    public_id: publicId,
                });
            });
            const uploadResults = await Promise.all(uploadPromises);
            uploadResults.forEach(result => {
                if (result?.secure_url) mediaUrls.push(result.secure_url);
            });
        }

        // Upload Video if any
        if (req.files?.video && req.files.video.length > 0) {
            const file = req.files.video[0];
            const publicId = `post_vid_${userId}_${Date.now()}`;
            const result = await uploadBuffer(file.buffer, {
                folder: `posts/${userId}/video`,
                public_id: publicId,
                resource_type: "video"
            });
            if (result?.secure_url) videoUrl.push(result.secure_url);
        }

        // Upload Audio if any
        if (req.files?.audio && req.files.audio.length > 0) {
            const file = req.files.audio[0];
            const publicId = `post_aud_${userId}_${Date.now()}`;
            const result = await uploadBuffer(file.buffer, {
                folder: `posts/${userId}/audio`,
                public_id: publicId,
                resource_type: "auto"
            });
            if (result?.secure_url) audioUrl.push(result.secure_url);
        }

        // Save to Database
        const newPost = await PostModel.create({
            userId,
            type,
            title,
            description: description || "",
            mediaUrls,
            videoUrl,
            audioUrl,
            audioName: audioName || "",
            upvotes: 0,
            comments: 0,
            shares: 0,
            upvotedBy: [],
            downvotedBy: []
        });

        // Populate user details for returning
        const populatedPost = await newPost.populate("userId", "username fullname profile");

        // Format to align with client-side expected keys
        const responseData = {
            ...populatedPost.toObject(),
            id: populatedPost._id.toString(),
            nr_of_comments: populatedPost.comments
        };

        // Broadcast the new post creation to all connected clients in real-time
        const io = req.app.get("socketio");
        if (io) {
            console.log("Broadcasting new post via Socket.io:", responseData.id);
            io.emit("new_post", responseData);
        }

        return res.status(201).json({
            success: true,
            message: "Post created successfully.",
            post: responseData
        });

    } catch (error) {
        console.error("createPost Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Retrieve paginated feed
export const getFeed = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalPosts = await PostModel.countDocuments();
        const posts = await PostModel.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("userId", "username fullname profile")
            .lean();

        // Format to ensure client compatibility (id and nr_of_comments mappings)
        const formattedPosts = posts.map(post => ({
            ...post,
            id: post._id.toString(),
            nr_of_comments: post.comments || 0,
            group: post.group || { name: "social", image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100" } // Fallback group
        }));

        return res.status(200).json({
            success: true,
            posts: formattedPosts,
            totalPages: Math.ceil(totalPosts / limit),
            currentPage: page,
            totalPosts
        });

    } catch (error) {
        console.error("getFeed Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Retrieve posts created by a specific user
export const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID." });
        }

        const posts = await PostModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate("userId", "username fullname profile")
            .lean();

        const formattedPosts = posts.map(post => ({
            ...post,
            id: post._id.toString(),
            nr_of_comments: post.comments || 0,
            group: post.group || { name: "social", image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100" } // Fallback group
        }));

        return res.status(200).json({
            success: true,
            posts: formattedPosts
        });

    } catch (error) {
        console.error("getUserPosts Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Toggle upvote/downvote on a post in real-time
export const toggleVote = async (req, res) => {
    try {
        const { postId } = req.params;
        const { voteType } = req.body; // 'upvote' or 'downvote'
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid post ID." });
        }

        const post = await PostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        // Initialize arrays if undefined
        if (!post.upvotedBy) post.upvotedBy = [];
        if (!post.downvotedBy) post.downvotedBy = [];

        const hasUpvoted = post.upvotedBy.some(id => id.toString() === userId.toString());
        const hasDownvoted = post.downvotedBy.some(id => id.toString() === userId.toString());

        if (voteType === "upvote") {
            if (hasUpvoted) {
                // Toggle off upvote
                post.upvotedBy = post.upvotedBy.filter(id => id.toString() !== userId.toString());
            } else if (hasDownvoted) {
                // If downvoted, remove downvote (brings score to 0), do not add upvote yet
                post.downvotedBy = post.downvotedBy.filter(id => id.toString() !== userId.toString());
            } else {
                // No prior vote, add upvote
                post.upvotedBy.push(userId);
            }
        } else if (voteType === "downvote") {
            if (hasDownvoted) {
                // Toggle off downvote
                post.downvotedBy = post.downvotedBy.filter(id => id.toString() !== userId.toString());
            } else if (hasUpvoted) {
                // If upvoted, remove upvote (brings score to 0), do not add downvote yet
                post.upvotedBy = post.upvotedBy.filter(id => id.toString() !== userId.toString());
            } else {
                // No prior vote, add downvote
                post.downvotedBy.push(userId);
            }
        }

        // Recalculate upvotes counter
        post.upvotes = post.upvotedBy.length - post.downvotedBy.length;
        await post.save();

        const responseData = {
            postId: post._id.toString(),
            upvotedBy: post.upvotedBy,
            downvotedBy: post.downvotedBy,
            upvotes: post.upvotes
        };

        // Emit Socket.io update to all connected clients in real-time
        const io = req.app.get("socketio");
        if (io) {
            console.log("Broadcasting post vote update:", responseData);
            io.emit("post_vote", responseData);
        }

        return res.status(200).json({
            success: true,
            message: "Vote casted successfully.",
            data: responseData
        });

    } catch (error) {
        console.error("toggleVote Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Edit post details (title and description)
export const editPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { title, description } = req.body;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid post ID." });
        }

        const post = await PostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        // Ownership validation
        if (post.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized: You are not the owner of this post." });
        }

        if (title) post.title = title;
        if (description !== undefined) post.description = description;

        await post.save();
        const populatedPost = await post.populate("userId", "username fullname profile");

        const responseData = {
            ...populatedPost.toObject(),
            id: populatedPost._id.toString(),
            nr_of_comments: populatedPost.comments || 0
        };

        // Broadcast post update
        const io = req.app.get("socketio");
        if (io) {
            console.log("Broadcasting post edit:", responseData.id);
            io.emit("update_post", responseData);
        }

        return res.status(200).json({
            success: true,
            message: "Post updated successfully.",
            post: responseData
        });

    } catch (error) {
        console.error("editPost Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Delete post and cleanup media from Cloudinary
export const deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid post ID." });
        }

        const post = await PostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        // Ownership validation
        if (post.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized: You are not the owner of this post." });
        }

        // Cleanup files from Cloudinary
        const filesToDestroy = [
            ...(post.mediaUrls || []),
            ...(post.videoUrl || []),
            ...(post.audioUrl || [])
        ];

        for (const fileUrl of filesToDestroy) {
            if (fileUrl && (fileUrl.startsWith("http://") || fileUrl.startsWith("https://"))) {
                await deleteFromCloudinary(fileUrl);
            }
        }

        await PostModel.findByIdAndDelete(postId);

        // Broadcast post deletion
        const io = req.app.get("socketio");
        if (io) {
            console.log("Broadcasting post deletion:", postId);
            io.emit("delete_post", { postId });
        }

        return res.status(200).json({
            success: true,
            message: "Post deleted successfully.",
            postId
        });

    } catch (error) {
        console.error("deletePost Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};