import { Story } from "../models/StorySchema.js";
import { Friend } from "../models/FriendSchema.js";
import { uploadBuffer } from "../config/ConnectCloudinary.js";

export const createStory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const mime = req.file.mimetype || "";
    let resource_type = "image";
    if (mime.startsWith("video/")) {
      resource_type = "video";
    }

    const uploadResult = await uploadBuffer(req.file.buffer, {
      folder: "stories",
      resource_type
    });

    const story = await Story.create({
      userId: req.user._id,
      mediaUrl: uploadResult.secure_url,
      mediaType: mime.startsWith("video/") ? "Video" : "Image"
    });

    const populated = await Story.findById(story._id).populate("userId", "username fullname profile");

    return res.status(201).json({
      success: true,
      story: populated
    });
  } catch (error) {
    console.error("Create story error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getStories = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all followings
    const followings = await Friend.find({
      $or: [
        { user1: currentUserId, user1Following: true },
        { user2: currentUserId, user2Following: true }
      ],
      relationStatus: { $ne: "blocked" }
    });

    const followingUserIds = followings.map(f => {
      return f.user1.toString() === currentUserId.toString() ? f.user2 : f.user1;
    });

    // Add current user's ID so they can see their own stories
    const userIds = [currentUserId, ...followingUserIds];

    const stories = await Story.find({
      userId: { $in: userIds }
    })
      .populate("userId", "username fullname profile")
      .sort({ createdAt: 1 }); // Oldest first to play in sequence

    const grouped = {};
    stories.forEach(story => {
      const u = story.userId;
      if (!u) return;
      const uId = u._id.toString();
      if (!grouped[uId]) {
        grouped[uId] = {
          userId: uId,
          username: u.username,
          fullname: u.fullname,
          profile: u.profile,
          stories: []
        };
      }
      grouped[uId].stories.push({
        _id: story._id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        viewed: story.viewedBy.some(v => v.toString() === currentUserId.toString()),
        createdAt: story.createdAt
      });
    });

    // Sort: current user's story first, then others
    const groupedList = Object.values(grouped);
    const myStories = groupedList.find(g => g.userId === currentUserId.toString());
    const otherStories = groupedList.filter(g => g.userId !== currentUserId.toString());

    // Compute whether a user's entire story list has been viewed
    const mapGroup = (group) => {
      const allViewed = group.stories.every(s => s.viewed);
      // Main image card shows the latest story in their group
      const latestStory = group.stories[group.stories.length - 1];
      return {
        ...group,
        viewed: allViewed,
        image: latestStory?.mediaUrl || group.profile || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
        name: group.fullname || group.username
      };
    };

    const result = [];
    if (myStories) {
      result.push({ ...mapGroup(myStories), isMe: true });
    }
    result.push(...otherStories.map(mapGroup));

    return res.status(200).json({ success: true, stories: result });
  } catch (error) {
    console.error("Get stories error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const currentUserId = req.user._id;

    await Story.findByIdAndUpdate(storyId, {
      $addToSet: { viewedBy: currentUserId }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const currentUserId = req.user._id;

    const story = await Story.findOne({ _id: storyId, userId: currentUserId });
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found or unauthorized" });
    }

    await Story.deleteOne({ _id: storyId });
    return res.status(200).json({ success: true, message: "Story deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
