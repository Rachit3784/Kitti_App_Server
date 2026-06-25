import { PostModel } from "../models/PostSchema.js";
import { GroupModel } from "../models/GroupSchema.js";
import { uploadBuffer, deleteFromCloudinary } from "../config/ConnectCloudinary.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { publicKey } from "../config/ENV_variable.js";
import { Users } from "../models/UserSchema.js";

// Helper to format the final output response cleanly for frontend
const formatPostResponse = (postObj) => {
    return {
        postId: postObj._id.toString(),
        id: postObj._id.toString(),
        userData: {
            userId: postObj.userId?._id?.toString() || postObj.userId?.toString(),
            username: postObj.userId?.username || "anonymous",
            userProfilePic: postObj.userId?.profile || ""
        },
        group: postObj.groupId ? {
            groupId: postObj.groupId?._id || postObj.groupId,
            groupPic: postObj.groupId?.groupPic || ""
        } : null,
        postedInGroup: postObj.postedInGroup || false,
        isSponsored: postObj.isSponsored || false,
        title: postObj.title,
        description: postObj.description,
        upvoteCount: postObj.upvoteCount || 0,
        comments: postObj.comments || 0,
        nr_of_comments: postObj.comments || 0,
        shares: postObj.shares || 0,
        views: postObj.views || 0,
        upvotedBy: postObj.upvotedBy || [],
        downvotedBy: postObj.downvotedBy || [],
        data: postObj.data || {}
    };
};

// ─── THE ULTIMATE DYNAMIC CREATE POST CONTROLLER ──────────────────────────────
export const createPost = async (req, res) => {
    try {
        console.log("createPost request received for user:", req.user?._id);
        console.log("Received files fields:", req.files ? Object.keys(req.files) : "No files");
        if (req.files) {
            Object.keys(req.files).forEach(key => {
                console.log(`Field '${key}':`, req.files[key].map(f => ({ name: f.originalname, size: f.size })));
            });
        }
        const userId = req.user._id;

        // 1. Destructure text fields from body
        let { title, description, postedInGroup, isSponsored, visibility, groupId, data } = req.body;

        // Form-data handles objects as strings, so safe JSON parsing is required
        if (typeof data === "string") data = JSON.parse(data);

        // Basic structural validations
        if (!title || !data?.type || !data?.section) {
            return res.status(400).json({
                success: false,
                message: "Arre bhai! Title, data.type (e.g. 'Video', 'PDF') aur data.section (e.g. 'Poll') bhejna mandatory hai."
            });
        }

        // Initialize payload safely
        if (!data.payload) data.payload = {};

        // 2. MULTIMEDIA ENGINE: Upload incoming files dynamically to Cloudinary
        const files = req.files || {};

        // A. Handle Multiple Images (Gallery, Carousel, StackCard, Ads, Banner etc.)
        if (files.media && files.media.length > 0) {
            const imagePromises = files.media.map((file, idx) => {
                return uploadBuffer(file.buffer, {
                    folder: `posts/${userId}/images`,
                    resource_type: "image"
                });
            });
            const imageResults = await Promise.all(imagePromises);

            data.payload.images = data.payload.images || [];
            imageResults.forEach(result => {
                if (result?.secure_url) data.payload.images.push(result.secure_url);
            });
        }

        // B. Handle Single Video Upload
        if (files.video && files.video.length > 0) {
            const videoFile = files.video[0];
            const result = await uploadBuffer(videoFile.buffer, {
                folder: `posts/${userId}/videos`,
                resource_type: "video"
            });
            if (result?.secure_url) data.payload.videoUrl = result.secure_url;
        }

        // C. Handle Single Audio Upload
        if (files.audio && files.audio.length > 0) {
            const audioFile = files.audio[0];
            const result = await uploadBuffer(audioFile.buffer, {
                folder: `posts/${userId}/audios`,
                resource_type: "auto"
            });
            if (result?.secure_url) data.payload.audioUrl = result.secure_url;
        }

        // D. Handle Document/PDF Upload (Pure Cloudinary Raw Storage)
        if (files.pdf && files.pdf.length > 0) {
            const pdfFile = files.pdf[0];
            const result = await uploadBuffer(pdfFile.buffer, {
                folder: `posts/${userId}/documents`,
                resource_type: "raw" // Required for PDF formats inside Cloudinary
            });
            if (result?.secure_url) data.payload.pdfUrl = result.secure_url;
        }

        // 2.5 STACK / CAROUSEL MEDIA MAPPING: Map uploaded media files to slides in carouselData
        const typeUpper = data.type ? data.type.toUpperCase() : "";
        const sectionUpper = data.section ? data.section.toUpperCase() : "";
        if (
            (typeUpper === "STACKCARD" || typeUpper === "STACK" || typeUpper === "CAROUSEL" || (typeUpper === "AD" && (sectionUpper === "STACKCARD" || sectionUpper === "CAROUSEL"))) &&
            data.payload.carouselData &&
            data.payload.carouselData.length > 0
        ) {
            let imgIndex = 0;
            data.payload.carouselData = data.payload.carouselData.map(item => {
                const hasLocalUri = !item.bannerUrl || item.bannerUrl.startsWith("file://") || item.bannerUrl.startsWith("content://") || item.bannerUrl.startsWith("ph://");
                if (hasLocalUri && data.payload.images && imgIndex < data.payload.images.length) {
                    return { ...item, bannerUrl: data.payload.images[imgIndex++] };
                }
                return item;
            });
        }

        // 2.6 FORM BANNER & LOGO MEDIA MAPPING: Map uploaded media files to banner and logo
        if (typeUpper === "FORM") {
            let imgIndex = 0;
            const hasLocalBanner = data.payload.bannerUrl && (data.payload.bannerUrl.startsWith("file://") || data.payload.bannerUrl.startsWith("content://") || data.payload.bannerUrl.startsWith("ph://") || data.payload.bannerUrl === "");
            const hasLocalLogo = data.payload.logoUrl && (data.payload.logoUrl.startsWith("file://") || data.payload.logoUrl.startsWith("content://") || data.payload.logoUrl.startsWith("ph://") || data.payload.logoUrl === "");

            if (hasLocalBanner && data.payload.images && imgIndex < data.payload.images.length) {
                data.payload.bannerUrl = data.payload.images[imgIndex++];
            }
            if (hasLocalLogo && data.payload.images && imgIndex < data.payload.images.length) {
                data.payload.logoUrl = data.payload.images[imgIndex++];
            }
        }

        // 3. DATABASE SYNC: Mapping everything directly into MongoDB MongoDB
        const newPost = await PostModel.create({
            userId,
            groupId: groupId && mongoose.Types.ObjectId.isValid(groupId) ? groupId : null,
            title,
            description: description || "",
            postedInGroup: postedInGroup === "true" || postedInGroup === true,
            isSponsored: isSponsored === "true" || isSponsored === true,
            visibility: visibility || "public",

            // This now saves arrays (points, links), text fields (brandName, headerTitle), 
            // arrays of objects (inputs, carouselData) and custom blocks natively.
            data: {
                type: data.type,
                section: data.section,
                payload: {
                    // Multimedia URLs mapped dynamically above
                    videoUrl: data.payload.videoUrl || "",
                    pdfUrl: data.payload.pdfUrl || "",
                    audioUrl: data.payload.audioUrl || "",
                    audioImgUrl: data.payload.audioImgUrl || "",
                    bannerUrl: data.payload.bannerUrl || "",
                    logoUrl: data.payload.logoUrl || "",
                    jobTitle: data.payload.jobTitle || "",
                    companyName: data.payload.companyName || "",
                    eligibility: data.payload.eligibility || "",

                    // Document headers & metadata strings from clients
                    brandName: data.payload.brandName || "",
                    headerTitle: data.payload.headerTitle || "",
                    subHeader: data.payload.subHeader || "",
                    buttonText: data.payload.buttonText || "",
                    targetUrl: data.payload.targetUrl || "",

                    // Nested Array Structures passed directly from JSON strings
                    images: data.payload.images || [],
                    points: data.payload.points || [],
                    links: data.payload.links || [],
                    inputs: data.payload.inputs || [],
                    carouselData: data.payload.carouselData || [],

                    // Poll Object Blocks mapping
                    pollDetails: data.payload.pollDetails ? {
                        totalVotes: Number(data.payload.pollDetails.totalVotes) || 0,
                        userVotedOptionId: data.payload.pollDetails.userVotedOptionId || null,
                        options: data.payload.pollDetails.options || []
                    } : null
                }
            }
        });

        // 4. Update community group analytics if posted inside a group
        if (newPost.groupId) {
            await GroupModel.findByIdAndUpdate(newPost.groupId, { $inc: { postCount: 1 } });
        }

        // 5. Populate and execute Socket Broadcast
        const populatedPost = await newPost.populate([
            { path: "userId", select: "username profile" },
            { path: "groupId", select: "groupPic" }
        ]);

        const responseData = formatPostResponse(populatedPost.toObject());

        const io = req.app.get("socketio");
        if (io) io.emit("new_post", responseData);

        return res.status(201).json({
            success: true,
            message: "Mubarak ho! Post created successfully with full polymorphic support.",
            post: responseData
        });

    } catch (error) {
        console.error("createPost Comprehensive Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

// 2. GET FEED
const extractCloudinaryMeta = (url) => {
    if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) return null;

    try {
        // Example URL: https://res.cloudinary.com/demo/video/upload/v123456/posts/userid/video/file.mp4
        const parts = url.split("/");
        const uploadIndex = parts.indexOf("upload");
        if (uploadIndex === -1) return null;

        // Determine resource_type based on Cloudinary path structure
        let resource_type = "image";
        if (parts[uploadIndex - 1] === "video") resource_type = "video";
        if (parts[uploadIndex - 1] === "raw") resource_type = "raw";

        // Everything after version component (v12345678) is our public_id (excluding file extension)
        const pathParts = parts.slice(uploadIndex + 2);
        const fullPath = pathParts.join("/");
        const public_id = fullPath.substring(0, fullPath.lastIndexOf("."));

        return { public_id, resource_type };
    } catch (e) {
        console.error("Error parsing Cloudinary URL metadata:", e);
        return null;
    }
};

// 2. GET FEED (With full polymorphic adapter validation and privacy rules)
export const getFeed = async (req, res) => {
    try {
        const page = parseInt(req.body?.page || req.query?.page) || 1;
        const LIMIT = 10;

        let currentUserId = null;
        let followedUserIds = [];
        let isPrivateAccount = false;

        // Optionally decode token if present in headers
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
                const decode = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
                if (decode && (decode.userId || decode._id)) {
                    currentUserId = decode.userId || decode._id;
                }
            } catch (e) {
                console.log("Optional feed token verification failed/bypassed:", e.message);
            }
        }

        // Build database query filters
        let feedFilter = {};

        if (currentUserId) {
            // Get user account details to check if they are Private
            const userObj = await Users.findById(currentUserId).lean();
            if (userObj) {
                isPrivateAccount = userObj.accountType === "Private";
            }

            // Find users whom this user follows
            const FriendModel = mongoose.model("Friend");
            const followingRelations = await FriendModel.find({
                $or: [
                    { user1: currentUserId, user1Following: true },
                    { user2: currentUserId, user2Following: true }
                ],
                relationStatus: "accepted"
            }).lean();

            followedUserIds = followingRelations.map(rel => {
                return rel.user1.toString() === currentUserId.toString() ? rel.user2.toString() : rel.user1.toString();
            });

            // Also include own posts in feed
            followedUserIds.push(currentUserId.toString());

            feedFilter = {
                $or: [
                    { visibility: "public" },
                    { postedInGroup: true },
                    { userId: { $in: followedUserIds } }
                ]
            };

            // Private account: hide all sponsored ads
            if (isPrivateAccount) {
                feedFilter = {
                    $and: [
                        feedFilter,
                        { isSponsored: { $ne: true } },
                        { "data.type": { $ne: "Ad" } }
                    ]
                };
            }
        } else {
            // Default anonymous: only public & community posts
            feedFilter = {
                $or: [
                    { visibility: "public" },
                    { postedInGroup: true }
                ]
            };
        }

        const totalPosts = await PostModel.countDocuments(feedFilter);
        const totalPages = Math.ceil(totalPosts / LIMIT);

        const posts = await PostModel.find(feedFilter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * LIMIT)
            .limit(LIMIT)
            .populate("userId", "username profile")
            .populate("groupId", "name title groupPic")
            .lean();

        // Mapping array using our generic format formatter helper
        const formattedPosts = posts.map(post => ({
            postId: post._id.toString(),
            id: post._id.toString(),
            userData: {
                userId: post.userId?._id?.toString() || post.userId?.toString(),
                username: post.userId?.username || "anonymous",
                userProfilePic: post.userId?.profile || ""
            },
            group: post.groupId ? {
                groupId: post.groupId._id.toString(),
                groupPic: post.groupId.groupPic || "",
                name: post.groupId.name || "social",
                title: post.groupId.title || ""
            } : null,
            postedInGroup: post.postedInGroup || false,
            isSponsored: post.isSponsored || false,
            visibility: post.visibility || "public",
            title: post.title,
            description: post.description,
            upvoteCount: post.upvoteCount || 0,
            comments: post.comments || 0,
            nr_of_comments: post.comments || 0,
            shares: post.shares || 0,
            views: post.views || 0,
            upvotedBy: post.upvotedBy || [],
            downvotedBy: post.downvotedBy || [],
            data: post.data || {}
        }));

        return res.status(200).json({
            success: true,
            posts: formattedPosts,
            totalPages,
            currentPage: page,
            nextPage: page < totalPages ? page + 1 : null,
        });
    } catch (error) {
        console.error("getFeed Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 3. GET USER POSTS
export const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid User ID format." });
        }

        const posts = await PostModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate("userId", "username profile")
            .populate("groupId", "name title groupPic")
            .lean();

        const formattedPosts = posts.map(post => ({
            postId: post._id.toString(),
            id: post._id.toString(),
            userData: {
                userId: post.userId?._id?.toString() || post.userId?.toString(),
                username: post.userId?.username || "anonymous",
                userProfilePic: post.userId?.profile || ""
            },
            group: post.groupId ? {
                groupId: post.groupId._id.toString(),
                groupPic: post.groupId.groupPic || "",
                name: post.groupId.name || "social",
                title: post.groupId.title || ""
            } : null,
            postedInGroup: post.postedInGroup || false,
            isSponsored: post.isSponsored || false,
            title: post.title,
            description: post.description,
            upvoteCount: post.upvoteCount || 0,
            comments: post.comments || 0,
            nr_of_comments: post.comments || 0,
            shares: post.shares || 0,
            views: post.views || 0,
            upvotedBy: post.upvotedBy || [],
            downvotedBy: post.downvotedBy || [],
            data: post.data || {}
        }));

        return res.status(200).json({ success: true, posts: formattedPosts });
    } catch (error) {
        console.error("getUserPosts Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 6. DELETE POST (With Bulletproof Multi-type Cloudinary Asset Trash Processor)
export const deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid Post ID format." });
        }

        const post = await PostModel.findById(postId);
        if (!post) return res.status(404).json({ success: false, message: "Post not found." });

        // Access Authorization Validation
        if (post.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized deletion: You don't own this post." });
        }

        // ─── CLOUDINARY HARVEST CLEANER SYSTEM ───
        const rawUrlsToDestroy = [];

        if (post.data?.payload) {
            const p = post.data.payload;

            // Collect individual resource nodes safely
            if (p.videoUrl) rawUrlsToDestroy.push(p.videoUrl);
            if (p.audioUrl) rawUrlsToDestroy.push(p.audioUrl);
            if (p.pdfUrl) rawUrlsToDestroy.push(p.pdfUrl);
            if (p.bannerUrl) rawUrlsToDestroy.push(p.bannerUrl);
            if (p.logoUrl) rawUrlsToDestroy.push(p.logoUrl);
            if (p.audioImgUrl) rawUrlsToDestroy.push(p.audioImgUrl);

            // Flatten internal dynamic arrays
            if (p.images && p.images.length > 0) rawUrlsToDestroy.push(...p.images);
            if (p.carouselData && p.carouselData.length > 0) {
                p.carouselData.forEach(item => {
                    if (item.bannerUrl) rawUrlsToDestroy.push(item.bannerUrl);
                });
            }
        }

        // Processing destruction via matching payload signatures
        for (const url of rawUrlsToDestroy) {
            await deleteFromCloudinary(url)
                .catch((err) => console.error(`Failed to flush target asset: ${url}, Error:`, err.message));
        }

        // Decrement community group metadata tracker if verified
        if (post.groupId) {
            await GroupModel.findByIdAndUpdate(post.groupId, { $inc: { postCount: -1 } });
        }

        // Hard document drop from MongoDB collection
        await post.deleteOne();

        // Socket realtime update trigger
        const io = req.app.get("socketio");
        if (io) io.emit("delete_post", { postId });

        return res.status(200).json({
            success: true,
            message: "Database record and associated Cloudinary media completely unlinked & purged.",
            postId
        });
    } catch (error) {
        console.error("deletePost Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


// // 4. TOGGLE VOTE
// export const toggleVote = async (req, res) => {
//     try {
//         const { postId } = req.params;
//         const { direction } = req.body; 
//         const userId = req.user._id.toString();

//         const post = await PostModel.findById(postId);
// 4. TOGGLE VOTE
export const toggleVote = async (req, res) => {
    try {
        const { postId } = req.params;
        const direction = req.body.direction || req.body.voteType;
        const userId = req.user._id.toString();

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid Post ID format." });
        }

        const post = await PostModel.findById(postId);
        if (!post) return res.status(404).json({ success: false, message: "Post missing." });

        if (!post.upvotedBy) post.upvotedBy = [];
        if (!post.downvotedBy) post.downvotedBy = [];

        let upvotedByStrings = post.upvotedBy.map(id => id.toString());
        let downvotedByStrings = post.downvotedBy.map(id => id.toString());

        if (direction === "up") {
            if (upvotedByStrings.includes(userId)) {
                post.upvotedBy.pull(userId);
            } else {
                if (downvotedByStrings.includes(userId)) post.downvotedBy.pull(userId);
                post.upvotedBy.push(userId);
            }
        } else if (direction === "down") {
            if (downvotedByStrings.includes(userId)) {
                post.downvotedBy.pull(userId);
            } else {
                if (upvotedByStrings.includes(userId)) post.upvotedBy.pull(userId);
                post.downvotedBy.push(userId);
            }
        } else {
            return res.status(400).json({ success: false, message: "Invalid vote direction. Must be 'up' or 'down'." });
        }

        post.upvoteCount = post.upvotedBy.length - post.downvotedBy.length;
        await post.save();

        const responseData = {
            postId: post._id.toString(),
            upvoteCount: post.upvoteCount,
            upvotedBy: post.upvotedBy,
            downvotedBy: post.downvotedBy
        };

        const io = req.app.get("socketio");
        if (io) {
            io.emit("update_post", responseData);
        }

        return res.status(200).json({ success: true, ...responseData });
    } catch (error) {
        console.error("toggleVote Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5. EDIT POST
export const editPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { title, description, data } = req.body;
        const userId = req.user._id;

        const post = await PostModel.findById(postId);
        if (!post) return res.status(404).json({ success: false, message: "Post missing." });

        if (post.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized action." });
        }

        if (title) post.title = title;
        if (description !== undefined) post.description = description;
        if (data) post.data = { ...post.data, ...data };

        await post.save();
        const populatedPost = await post.populate([
            { path: "userId", select: "username profile" },
            { path: "groupId", select: "groupPic" }
        ]);

        const responseData = formatPostResponse(populatedPost.toObject());
        const io = req.app.get("socketio");
        if (io) io.emit("update_post", responseData);

        return res.status(200).json({ success: true, message: "Updated successfully.", post: responseData });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};



// 7. SEARCH POSTS
export const searchPost = async (req, res) => {
    try {
        const { query } = req.query;
        const page = parseInt(req.query?.page) || 1;
        const LIMIT = 10;

        if (!query) return res.status(400).json({ success: false, message: "Query term missing." });

        const searchRegex = new RegExp(query, "i");

        const filter = {
            $or: [
                { title: searchRegex },
                { description: searchRegex },
                { "data.type": searchRegex },
                { "data.payload.brandName": searchRegex }
            ]
        };

        const totalPosts = await PostModel.countDocuments(filter);
        const totalPages = Math.ceil(totalPosts / LIMIT);

        const posts = await PostModel.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * LIMIT)
            .limit(LIMIT)
            .populate("userId", "username profile")
            .populate("groupId", "groupPic")
            .lean();

        const formattedPosts = posts.map(p => formatPostResponse(p));

        return res.status(200).json({
            success: true,
            posts: formattedPosts,
            totalPages,
            currentPage: page,
            nextPage: page < totalPages ? page + 1 : null,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 8. TOGGLE POLL VOTE (Dynamic, direct DB update engine)
export const togglePollVote = async (req, res) => {
    try {
        const { postId } = req.params;
        const { optionId, action, oldOptionId } = req.body;

        if (!optionId) {
            return res.status(400).json({ success: false, message: "Option ID is required." });
        }
        if (!action || !["vote", "unvote", "switch"].includes(action)) {
            return res.status(400).json({ success: false, message: "Valid action ('vote', 'unvote', 'switch') is required." });
        }

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid Post ID format." });
        }

        const post = await PostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        const isPoll = post.data?.type === "Poll" || (post.data?.type === "Ad" && post.data?.section === "Poll");
        if (!isPoll || !post.data?.payload?.pollDetails) {
            return res.status(400).json({ success: false, message: "This post is not a Poll." });
        }

        const options = post.data.payload.pollDetails.options || [];
        let totalVotes = post.data.payload.pollDetails.totalVotes || 0;

        if (action === "vote") {
            // Increment count for chosen option
            post.data.payload.pollDetails.options = options.map(opt => {
                if (opt.id === optionId) {
                    return { ...opt, votes: (opt.votes || 0) + 1 };
                }
                return opt;
            });
            post.data.payload.pollDetails.totalVotes = totalVotes + 1;
        } else if (action === "unvote") {
            // Decrement count for chosen option
            post.data.payload.pollDetails.options = options.map(opt => {
                if (opt.id === optionId) {
                    return { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) };
                }
                return opt;
            });
            post.data.payload.pollDetails.totalVotes = Math.max(0, totalVotes - 1);
        } else if (action === "switch") {
            if (!oldOptionId) {
                return res.status(400).json({ success: false, message: "oldOptionId is required for switch action." });
            }
            // Decrement count for oldOptionId, increment count for optionId
            post.data.payload.pollDetails.options = options.map(opt => {
                if (opt.id === oldOptionId) {
                    return { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) };
                }
                if (opt.id === optionId) {
                    return { ...opt, votes: (opt.votes || 0) + 1 };
                }
                return opt;
            });
            // totalVotes stays the same
        }

        // Save post updates in DB
        post.markModified("data");
        await post.save();

        // Populate details for formatPostResponse
        const populatedPost = await post.populate([
            { path: "userId", select: "username profile" },
            { path: "groupId", select: "groupPic" }
        ]);

        const formattedPost = formatPostResponse(populatedPost.toObject());

        // Broadcast to other users
        const io = req.app.get("socketio");
        if (io) {
            io.emit("update_post", formattedPost);
        }

        return res.status(200).json({
            success: true,
            message: "Poll vote processed successfully.",
            post: formattedPost
        });

    } catch (error) {
        console.error("togglePollVote Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── GET LIKED POSTS (Activity Screen) ───────────────────────────────────────
export const getLikedPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        const [posts, total] = await Promise.all([
            PostModel.find({ upvotedBy: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("userId", "username profile")
                .lean(),
            PostModel.countDocuments({ upvotedBy: userId })
        ]);

        const formatted = posts.map(formatPostResponse);

        return res.status(200).json({
            success: true,
            posts: formatted,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("getLikedPosts error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};