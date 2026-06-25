import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Postss",
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  text: {
    type: String,
    default: ""
  },
  gifUrl: {
    type: String,
    default: ""
  }
}, { timestamps: true });

// Compound index for fast paginated comment fetching per post
CommentSchema.index({ postId: 1, createdAt: -1 });

export const CommentModel = mongoose.model("Comment", CommentSchema);
