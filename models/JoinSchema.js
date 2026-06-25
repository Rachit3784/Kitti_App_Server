import mongoose from "mongoose";

const JoinSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Groups",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postCount: {
      type: Number,
      default: 0,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Performance indices
JoinSchema.index({ groupId: 1, userId: 1 }, { unique: true });
JoinSchema.index({ userId: 1 });

export const JoinModel = mongoose.model("Join", JoinSchema);
