import { GroupModel } from "../models/GroupSchema.js";
import { PostModel } from "../models/PostSchema.js";
import { Users } from "../models/UserSchema.js";
import { JoinModel } from "../models/JoinSchema.js";

// ─── CREATE COMMUNITY ────────────────────────────────────────────────────────
export const createGroup = async (req, res) => {
  try {
    const creatorId = req.user._id;
    const { name, title, description, privacyMode } = req.body;

    if (!name || !title) {
      return res.status(400).json({ success: false, message: "Community name and title are required." });
    }

    const creator = await Users.findById(creatorId);
    if (!creator) {
      return res.status(404).json({ success: false, message: "Creator user not found." });
    }

    if (creator.accountType !== "Public") {
      return res.status(403).json({ success: false, message: "Only Public accounts can create communities." });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await GroupModel.findOne({ $or: [{ name }, { slug }] });
    if (existing) {
      return res.status(400).json({ success: false, message: "A community with this name or slug already exists." });
    }

    const newGroup = await GroupModel.create({
      name,
      slug,
      title,
      description: description || "",
      creatorId,
      privacyMode: privacyMode || "public",
      members: [{ userId: creatorId, role: "admin" }],
      memberCount: 1,
      postCount: 0
    });

    await JoinModel.create({ groupId: newGroup._id, userId: creatorId });

    return res.status(201).json({
      success: true,
      message: "Community created successfully!",
      group: newGroup
    });
  } catch (error) {
    console.error("createGroup Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─── JOIN COMMUNITY ──────────────────────────────────────────────────────────
export const joinGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Community not found." });
    }

    const alreadyMember = await JoinModel.exists({ groupId, userId });
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: "You are already a member of this community." });
    }

    await JoinModel.create({ groupId, userId });

    group.memberCount += 1;
    await group.save();

    return res.status(200).json({ success: true, message: "Joined community successfully!", memberCount: group.memberCount });
  } catch (error) {
    console.error("joinGroup error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─── LEAVE COMMUNITY ─────────────────────────────────────────────────────────
export const leaveGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Community not found." });
    }

    if (group.creatorId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: "Community owner cannot leave. Delete the community instead." });
    }

    const joinRecord = await JoinModel.findOneAndDelete({ groupId, userId });
    if (!joinRecord) {
      return res.status(400).json({ success: false, message: "You are not a member of this community." });
    }

    group.memberCount = Math.max(0, group.memberCount - 1);
    await group.save();

    return res.status(200).json({ success: true, message: "Left community.", memberCount: group.memberCount });
  } catch (error) {
    console.error("leaveGroup error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─── GET MY COMMUNITIES (communities I created) ───────────────────────────────
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await GroupModel.find({ creatorId: userId })
      .select("name slug title description groupPic memberCount postCount createdAt privacyMode")
      .sort({ createdAt: -1 })
      .lean();

    // For each group, fetch recent posts count and member list summary
    const enriched = await Promise.all(
      groups.map(async (g) => {
        const postCount = await PostModel.countDocuments({ groupId: g._id });
        return { ...g, postCount };
      })
    );

    return res.status(200).json({ success: true, groups: enriched });
  } catch (error) {
    console.error("getMyGroups error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─── GET COMMUNITY DETAILS + POSTS (for management screen) ───────────────────
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const group = await GroupModel.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ success: false, message: "Community not found." });
    }

    const [posts, totalPosts] = await Promise.all([
      PostModel.find({ groupId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username profilePic")
        .lean(),
      PostModel.countDocuments({ groupId })
    ]);

    return res.status(200).json({
      success: true,
      group,
      posts,
      totalPosts,
      page,
      totalPages: Math.ceil(totalPosts / limit)
    });
  } catch (error) {
    console.error("getGroupDetails error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─── DELETE COMMUNITY POST (owner only) ──────────────────────────────────────
export const deleteCommunityPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, postId } = req.params;

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Community not found." });
    }

    if (group.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Only the community owner can delete posts." });
    }

    const post = await PostModel.findOne({ _id: postId, groupId });
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found in this community." });
    }

    await PostModel.findByIdAndDelete(postId);
    await GroupModel.findByIdAndUpdate(groupId, { $inc: { postCount: -1 } });
    await JoinModel.findOneAndUpdate(
      { groupId, userId: post.userId },
      { $inc: { postCount: -1 } }
    );

    return res.status(200).json({ success: true, message: "Post removed from community." });
  } catch (error) {
    console.error("deleteCommunityPost error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─── DELETE ENTIRE COMMUNITY ──────────────────────────────────────────────────
export const deleteGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Community not found." });
    }

    if (group.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Only the community owner can delete it." });
    }

    // Delete all posts in this community
    const deleteResult = await PostModel.deleteMany({ groupId });

    // Delete all membership records
    await JoinModel.deleteMany({ groupId });

    // Delete the group itself
    await GroupModel.findByIdAndDelete(groupId);

    return res.status(200).json({
      success: true,
      message: `Community deleted along with ${deleteResult.deletedCount} posts.`
    });
  } catch (error) {
    console.error("deleteGroup error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─── CHECK MEMBERSHIP ────────────────────────────────────────────────────────
export const checkMembership = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const group = await GroupModel.findById(groupId).select("memberCount name title groupPic");
    if (!group) {
      return res.status(404).json({ success: false, message: "Community not found." });
    }

    const isMember = await JoinModel.exists({ groupId, userId });
    return res.status(200).json({ success: true, isMember: !!isMember, memberCount: group.memberCount, group });
  } catch (error) {
    console.error("checkMembership error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─── GET JOINED COMMUNITIES ──────────────────────────────────────────────────
export const getJoinedGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const joins = await JoinModel.find({ userId }).populate("groupId", "name slug title description groupPic memberCount postCount");
    const groups = joins.map(j => j.groupId).filter(Boolean);
    return res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error("getJoinedGroups error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};
