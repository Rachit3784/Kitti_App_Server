import mongoose from "mongoose";

const StorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User"
  },
  mediaUrl: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ["Image", "Video"],
    default: "Image"
  },
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: []
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Automatically deletes the story after 24 hours (TTL index)
  }
});

export const Story = mongoose.model("Story", StorySchema);
