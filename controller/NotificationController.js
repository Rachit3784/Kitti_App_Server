import Notification from "../models/FriendNotificationSchema.js";
import {Friend} from "../models/FriendSchema.js";

const NotificationController = {
  /**
   * Fetch notifications for the logged-in user
   * Aggregates dynamic button actions based on the current state of the relationship
   */
  getMyNotifications: async (req, res) => {
    try {
      const currentUserId = req.user.userId || req.user._id;

      // Fetch notifications and populate sender information with correct UserSchema attributes
      const notifications = await Notification.find({ recipient: currentUserId })
        .populate("sender", "username fullname profile accountType")
        .sort({ createdAt: -1 });

      // Build the dynamic response list
      const updatedNotifications = await Promise.all(
        notifications.map(async (notif) => {
          let actionButtonType = "none"; // 'none', 'confirm_reject_split', 'following', 'follow'

          // If it's a follow request, check if the relationship status is still pending
          if (notif.type === "follow_request" && notif.relatedRelationshipId) {
            if (notif.description.startsWith("You confirmed") || notif.description.startsWith("You deleted")) {
              actionButtonType = "none";
            } else {
              const relation = await Friend.findById(notif.relatedRelationshipId);
              
              if (relation) {
                if (relation.relationStatus === "pending") {
                  actionButtonType = "confirm_reject_split";
                } else {
                  // If it was already accepted, find out if current user follows them back
                  const strId = currentUserId.toString();
                  const isUser1 = relation.user1.toString() === strId;
                  const iFollowThem = isUser1 ? relation.user1Following : relation.user2Following;
                  
                  actionButtonType = iFollowThem ? "following" : "follow";
                }
              }
            }
          }

          // Map populated sender fields to client TypeScript expectations (e.g. name, profilePicture)
          const senderInfo = notif.sender ? {
            _id: notif.sender._id.toString(),
            username: notif.sender.username,
            name: notif.sender.fullname,
            accountType: notif.sender.accountType?.toLowerCase() === "public" ? "public" : "private",
            profilePicture: notif.sender.profile
          } : null;

          return {
            _id: notif._id,
            type: notif.type,
            description: notif.description,
            sender: senderInfo,
            isRead: notif.isRead,
            createdAt: notif.createdAt,
            actionButtonType // Direct flag for the React Native UI to render buttons
          };
        })
      );

      return res.status(200).json(updatedNotifications);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (req, res) => {
    try {
      const currentUserId = req.user.userId || req.user._id;
      await Notification.updateMany({ recipient: currentUserId, isRead: false }, { isRead: true });
      return res.status(200).json({ message: "All notifications marked as read." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};

export default NotificationController;