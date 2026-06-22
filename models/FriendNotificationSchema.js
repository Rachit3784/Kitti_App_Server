import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // The user who will receive the notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The user who triggered the notification
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["follow_request", "follow_accept", "like", "comment"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    // References the custom relationship string string ID ("smallerId_largerUserId") if type is follow_request/follow_accept
    relatedRelationshipId: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.model("Notification", notificationSchema);