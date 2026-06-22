import mongoose from "mongoose";

const friendSchema = new mongoose.Schema(
  {
    // Overriding default _id with a String format: "smallerUserId_largerUserId"
    _id: {
      type: String,
      required: true,
    },

    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    requestFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    user1Following: {
      type: Boolean,
      default: false,
    },
    user2Following: {
      type: Boolean,
      default: false,
    },

    relationStatus: {
      type: String,
      enum: ["pending", "accepted", "blocked"],
      default: "pending",
    },

    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastActionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  {
    timestamps: true,
    _id: false // Tells Mongoose not to automatically generate an default ObjectId for _id
  }
);

// High-speed lookup index for matching status criteria queries (e.g., getting pending lists)
friendSchema.index({ relationStatus: 1 });

export default mongoose.model("Friend", friendSchema);