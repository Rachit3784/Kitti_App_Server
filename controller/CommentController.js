import { CommentModel } from "../models/CommentSchema.js";
import { PostModel } from "../models/PostSchema.js";
import { Users } from "../models/UserSchema.js";

// ─── ADD COMMENT ────────────────────────────────────────────────────────────
export const addComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;
    const { text, gifUrl } = req.body;

    if (!text?.trim() && !gifUrl?.trim()) {
      return res.status(400).json({ success: false, message: "Comment must have text or a GIF." });
    }

    // Check post exists
    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    const comment = await CommentModel.create({
      postId,
      userId,
      text: text?.trim() || "",
      gifUrl: gifUrl?.trim() || ""
    });

    // Increment post comment counter
    await PostModel.findByIdAndUpdate(postId, { $inc: { comments: 1 } });

    // Populate user info for immediate return
    const populated = await CommentModel.findById(comment._id).populate("userId", "username profilePic");

    return res.status(201).json({ success: true, comment: populated });
  } catch (error) {
    console.error("addComment error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─── GET COMMENTS (PAGINATED) ────────────────────────────────────────────────
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      CommentModel.find({ postId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username profilePic"),
      CommentModel.countDocuments({ postId })
    ]);

    return res.status(200).json({
      success: true,
      comments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("getComments error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─── DELETE COMMENT ──────────────────────────────────────────────────────────
export const deleteComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { commentId } = req.params;

    const comment = await CommentModel.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found." });
    }

    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only delete your own comments." });
    }

    await CommentModel.findByIdAndDelete(commentId);

    // Decrement post comment counter (floor at 0)
    await PostModel.findByIdAndUpdate(comment.postId, { $inc: { comments: -1 } });

    return res.status(200).json({ success: true, message: "Comment deleted.", postId: comment.postId });
  } catch (error) {
    console.error("deleteComment error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─── GET USER COMMENTS (Activity Screen) ────────────────────────────────────
// Returns distinct posts the user has commented on, with the comments list
export const getUserComments = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get user's comments, newest first
    const userComments = await CommentModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("postId", "title description data userId upvoteCount comments")
      .lean();

    const total = await CommentModel.countDocuments({ userId });

    return res.status(200).json({
      success: true,
      comments: userComments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("getUserComments error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};
