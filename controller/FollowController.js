import { FollowModel } from "../models/FollowSchema.js";
import { Users } from "../models/UserSchema.js";

// Toggle follow/unfollow a user
export const toggleFollow = async (req, res) => {
  try {
    const followerId = req.user._id;
    const { followingId } = req.body;

    if (!followingId) {
      return res.status(400).json({ success: false, message: "Target user ID (followingId) is required." });
    }

    if (followerId.toString() === followingId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself." });
    }

    const targetUser = await Users.findById(followingId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Target user not found." });
    }

    const existingFollow = await FollowModel.findOne({ followerId, followingId });

    if (existingFollow) {
      // Unfollow
      await FollowModel.findByIdAndDelete(existingFollow._id);
      return res.status(200).json({ success: true, isFollowing: false, message: "Unfollowed user successfully." });
    } else {
      // Follow
      await FollowModel.create({ followerId, followingId });
      return res.status(200).json({ success: true, isFollowing: true, message: "Followed user successfully." });
    }
  } catch (error) {
    console.error("toggleFollow error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// Check if current user is following a target user
export const checkFollowStatus = async (req, res) => {
  try {
    const followerId = req.user._id;
    const { targetUserId } = req.params;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "Target user ID is required." });
    }

    const isFollowing = await FollowModel.exists({ followerId, followingId: targetUserId });
    const followsBack = await FollowModel.exists({ followerId: targetUserId, followingId: followerId });

    return res.status(200).json({
      success: true,
      isFollowing: !!isFollowing,
      followsBack: !!followsBack
    });
  } catch (error) {
    console.error("checkFollowStatus error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};
