import {Friend} from "../models/FriendSchema.js";
import { Users } from "../models/UserSchema.js";
import Notification from "../models/FriendNotificationSchema.js";
import mongoose from "mongoose";

// Helper utility to safely compute the primary custom string id and position matching structures
const getRelationshipDetails = (idA, idB) => {
  const strA = idA.toString();
  const strB = idB.toString();
  const isU1 = strA < strB;
  
  return {
    customId: isU1 ? `${strA}_${strB}` : `${strB}_${strA}`,
    u1: isU1 ? idA : idB,
    u2: isU1 ? idB : idA,
    isUser1: isU1
  };
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getUserUsername = async (userId) => {
  const user = await Users.findById(userId).select("username");
  return user ? user.username : "Someone";
};

const FriendsController = {



  followUser: async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const { targetUserId } = req.body;

      if (currentUserId.toString() === targetUserId.toString()) {
        return res.status(400).json({ message: "You cannot follow yourself." });
      }

      const targetUser = await Users.findById(targetUserId);
      if (!targetUser) return res.status(404).json({ message: "Target user not found." });

      const { customId, u1, u2, isUser1 } = getRelationshipDetails(currentUserId, targetUserId);
      let relation = await Friend.findById(customId);

      if (relation) {
        if (relation.relationStatus === "blocked") {
          return res.status(403).json({ message: "Action restricted. Interaction is blocked." });
        }

        const alreadyFollowing = isUser1 ? relation.user1Following : relation.user2Following;
        if (alreadyFollowing) {
          return res.status(400).json({ message: "You are already following this user." });
        }

        if (relation.relationStatus === "pending" && relation.requestFrom.equals(currentUserId)) {
          return res.status(400).json({ message: "Follow request is already pending verification." });
        }
      }

      // CONDITION A: Target Account is Public -> Grant Immediate Auto-Acceptance
      if (targetUser.accountType?.toLowerCase() === "public") {
        if (!relation) {
          relation = new Friend({
            _id: customId,
            user1: u1,
            user2: u2,
            requestFrom: currentUserId,
            requestTo: targetUserId,
            user1Following: isUser1 ? true : false,
            user2Following: isUser1 ? false : true,
            relationStatus: "accepted",
            lastActionBy: currentUserId
          });
        } else {
          // Relation existed because target already follows current user
          if (isUser1) relation.user1Following = true;
          else relation.user2Following = true;

          relation.relationStatus = "accepted";
          relation.lastActionBy = currentUserId;
        }

        await relation.save();

        // Create follow accept notification
        const senderUsername = await getUserUsername(currentUserId);
        const notification = await Notification.create({
          recipient: targetUserId,
          sender: currentUserId,
          type: "follow_accept",
          description: `${senderUsername} started following you.`,
          relatedRelationshipId: customId
        });

        const populatedNotif = await notification.populate("sender", "username fullname profile accountType");
        const mappedNotif = {
          _id: populatedNotif._id,
          type: populatedNotif.type,
          description: populatedNotif.description,
          sender: {
            _id: populatedNotif.sender._id.toString(),
            username: populatedNotif.sender.username,
            name: populatedNotif.sender.fullname,
            accountType: populatedNotif.sender.accountType?.toLowerCase() === "public" ? "public" : "private",
            profilePicture: populatedNotif.sender.profile
          },
          isRead: populatedNotif.isRead,
          createdAt: populatedNotif.createdAt,
          actionButtonType: "following"
        };

        const io = req.app.get("socketio");
        if (io) {
          io.to(targetUserId.toString()).emit("new_notification", mappedNotif);
          io.to(targetUserId.toString()).emit("relationship_change", { senderId: currentUserId.toString(), buttonText: "Follow Back" });
        }

        return res.status(200).json({ message: "Successfully followed user.", status: "accepted" });
      }

      // CONDITION B: Target Account is Private -> Drop into Pending State
      if (!relation) {
        relation = new Friend({
          _id: customId,
          user1: u1,
          user2: u2,
          requestFrom: currentUserId,
          requestTo: targetUserId,
          relationStatus: "pending",
          lastActionBy: currentUserId
        });
      } else {
        relation.requestFrom = currentUserId;
        relation.requestTo = targetUserId;
        relation.relationStatus = "pending";
        relation.lastActionBy = currentUserId;
      }

      await relation.save();

      // Create follow request notification
      const senderUsername = await getUserUsername(currentUserId);
      const notification = await Notification.create({
        recipient: targetUserId,
        sender: currentUserId,
        type: "follow_request",
        description: `${senderUsername} requested to follow you.`,
        relatedRelationshipId: customId
      });

      const populatedNotif = await notification.populate("sender", "username fullname profile accountType");
      const mappedNotif = {
        _id: populatedNotif._id,
        type: populatedNotif.type,
        description: populatedNotif.description,
        sender: {
          _id: populatedNotif.sender._id.toString(),
          username: populatedNotif.sender.username,
          name: populatedNotif.sender.fullname,
          accountType: populatedNotif.sender.accountType?.toLowerCase() === "public" ? "public" : "private",
          profilePicture: populatedNotif.sender.profile
        },
        isRead: populatedNotif.isRead,
        createdAt: populatedNotif.createdAt,
        actionButtonType: "confirm_reject_split"
      };

      const io = req.app.get("socketio");
      if (io) {
        io.to(targetUserId.toString()).emit("new_notification", mappedNotif);
        io.to(targetUserId.toString()).emit("relationship_change", { senderId: currentUserId.toString(), buttonText: "Confirm" });
      }

      return res.status(200).json({ message: "Follow request sent successfully.", status: "pending" });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * INTERACTION 2: ACCEPT INBOUND FOLLOW REQUEST
   * Handles: Target User (B) confirming incoming subscription request from Requester (A).
   */
  acceptRequest: async (req, res) => {
    try {
      const currentUserId = req.user._id; 
      const { requesterId } = req.body;

      const { customId, isUser1 } = getRelationshipDetails(currentUserId, requesterId);
      const relation = await Friend.findById(customId);

      if (!relation || relation.relationStatus !== "pending" || !relation.requestTo.equals(currentUserId)) {
        return res.status(404).json({ message: "No active pending request found to confirm." });
      }

      // Turn on follow flag for the requester
      if (isUser1) {
        relation.user2Following = true; // requester is user2
      } else {
        relation.user1Following = true; // requester is user1
      }

      relation.relationStatus = "accepted";
      relation.lastActionBy = currentUserId;
      await relation.save();

      // Update inbound follow request notification
      await Notification.findOneAndUpdate(
        { recipient: currentUserId, sender: requesterId, type: "follow_request" },
        { description: "You confirmed the request." }
      );

      // Create new follow accept notification for the requester
      const senderUsername = await getUserUsername(currentUserId);
      const notification = await Notification.create({
        recipient: requesterId,
        sender: currentUserId,
        type: "follow_accept",
        description: `${senderUsername} accepted your follow request.`,
        relatedRelationshipId: customId
      });

      const populatedNotif = await notification.populate("sender", "username fullname profile accountType");
      const mappedNotif = {
        _id: populatedNotif._id,
        type: populatedNotif.type,
        description: populatedNotif.description,
        sender: {
          _id: populatedNotif.sender._id.toString(),
          username: populatedNotif.sender.username,
          name: populatedNotif.sender.fullname,
          accountType: populatedNotif.sender.accountType?.toLowerCase() === "public" ? "public" : "private",
          profilePicture: populatedNotif.sender.profile
        },
        isRead: populatedNotif.isRead,
        createdAt: populatedNotif.createdAt,
        actionButtonType: "following"
      };

      const io = req.app.get("socketio");
      if (io) {
        io.to(requesterId.toString()).emit("new_notification", mappedNotif);
        io.to(requesterId.toString()).emit("relationship_change", { senderId: currentUserId.toString(), buttonText: "Following" });
        io.to(currentUserId.toString()).emit("relationship_change", { senderId: requesterId.toString(), buttonText: "Following" });
      }

      return res.status(200).json({ message: "Follow request approved successfully." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * INTERACTION 3: UNFOLLOW USER
   * Handles: Current User (A) breaking off their follow channel subscription to Target User (B).
   */
  unfollowUser: async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const { targetUserId } = req.body;

      const { customId, isUser1 } = getRelationshipDetails(currentUserId, targetUserId);
      const relation = await Friend.findById(customId);

      if (!relation) return res.status(404).json({ message: "Active link records not found." });

      if (isUser1) relation.user1Following = false;
      else relation.user2Following = false;

      relation.lastActionBy = currentUserId;

      // Clean up verification: If mutual channels are now zeroed out, check if there's an inbound pending request
      let purged = false;
      if (!relation.user1Following && !relation.user2Following) {
        if (relation.relationStatus === "pending" && relation.requestFrom.equals(targetUserId)) {
          // Inbound pending request from target to current user should remain active
          await relation.save();
        } else {
          await Friend.deleteOne({ _id: customId });
          purged = true;
        }
      } else {
        // If one of the directions is still following, ensure the status is accepted
        if (relation.relationStatus === "pending") {
          relation.relationStatus = "accepted";
        }
        await relation.save();
      }

      // Delete any follow notifications between them where sender is current user
      await Notification.deleteMany({
        recipient: targetUserId,
        sender: currentUserId,
        type: { $in: ["follow_request", "follow_accept"] }
      });

      const io = req.app.get("socketio");
      if (io) {
        io.to(targetUserId.toString()).emit("relationship_change", { senderId: currentUserId.toString() });
        io.to(currentUserId.toString()).emit("relationship_change", { senderId: targetUserId.toString() });
      }

      return res.status(200).json({ message: purged ? "Successfully unfollowed user. Document cleaned up." : "Successfully unfollowed user." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * INTERACTION 4: REJECT / DELETE INBOUND REQUEST
   * Handles: User B deleting a pending request sent by User A.
   */
  deleteRequest: async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const { requesterId } = req.body;

      const { customId } = getRelationshipDetails(currentUserId, requesterId);
      const relation = await Friend.findById(customId);

      if (!relation || relation.relationStatus !== "pending" || !relation.requestTo.equals(currentUserId)) {
        return res.status(404).json({ message: "Pending request sequence map not found." });
      }

      let purged = false;
      if (relation.user1Following || relation.user2Following) {
        relation.relationStatus = "accepted";
        await relation.save();
      } else {
        await Friend.deleteOne({ _id: customId });
        purged = true;
      }

      // Update the incoming follow request notification
      await Notification.findOneAndUpdate(
        { recipient: currentUserId, sender: requesterId, type: "follow_request" },
        { description: "You deleted the request." }
      );

      const io = req.app.get("socketio");
      if (io) {
        io.to(requesterId.toString()).emit("relationship_change", { senderId: currentUserId.toString() });
        io.to(currentUserId.toString()).emit("relationship_change", { senderId: requesterId.toString() });
      }

      return res.status(200).json({ message: "Follow request dismissed." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * INTERACTION 5: REMOVE FOLLOWER
   * Handles: User B drops Follower A out of their followers list.
   */
  removeFollower: async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const { followerId } = req.body;

      const { customId, isUser1 } = getRelationshipDetails(currentUserId, followerId);
      const relation = await Friend.findById(customId);

      if (!relation) return res.status(404).json({ message: "Relationship mapping record missing." });

      // Kill the inbound track channel flag belonging to followerId
      if (isUser1) relation.user2Following = false;
      else relation.user1Following = false;

      relation.lastActionBy = currentUserId;

      let purged = false;
      if (!relation.user1Following && !relation.user2Following) {
        if (relation.relationStatus === "pending" && relation.requestFrom.equals(currentUserId)) {
          // Outbound pending request from current user to follower should remain active
          await relation.save();
        } else {
          await Friend.deleteOne({ _id: customId });
          purged = true;
        }
      } else {
        // If one of the directions is still following, ensure the status is accepted
        if (relation.relationStatus === "pending" && relation.requestFrom.equals(followerId)) {
          relation.relationStatus = "accepted";
        }
        await relation.save();
      }

      // Delete any follow notifications between them where sender is follower
      await Notification.deleteMany({
        recipient: currentUserId,
        sender: followerId,
        type: { $in: ["follow_request", "follow_accept"] }
      });

      const io = req.app.get("socketio");
      if (io) {
        io.to(followerId.toString()).emit("relationship_change", { senderId: currentUserId.toString() });
        io.to(currentUserId.toString()).emit("relationship_change", { senderId: followerId.toString() });
      }

      return res.status(200).json({ message: purged ? "Follower successfully dropped. Document cleaned up." : "Follower successfully dropped from your account profile." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * INTERACTION 6: UNIVERSAL SYSTEM BLOCK
   * Handles: User A blocking User B. Overrides all tracking indicators.
   */
  blockUser: async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const { targetUserId } = req.body;

      const { customId, u1, u2 } = getRelationshipDetails(currentUserId, targetUserId);
      let relation = await Friend.findById(customId);

      if (!relation) {
        relation = new Friend({ _id: customId, user1: u1, user2: u2 });
      }

      relation.user1Following = false;
      relation.user2Following = false;
      relation.relationStatus = "blocked";
      relation.blockedBy = currentUserId;
      relation.requestFrom = currentUserId;
      relation.requestTo = targetUserId;
      relation.lastActionBy = currentUserId;

      await relation.save();

      // Delete all notifications between them
      await Notification.deleteMany({
        $or: [
          { recipient: targetUserId, sender: currentUserId },
          { recipient: currentUserId, sender: targetUserId }
        ]
      });

      const io = req.app.get("socketio");
      if (io) {
        io.to(targetUserId.toString()).emit("relationship_change", { senderId: currentUserId.toString(), isBlocked: true });
        io.to(currentUserId.toString()).emit("relationship_change", { senderId: targetUserId.toString(), isBlocked: true });
      }

      return res.status(200).json({ message: "User successfully blocked." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * INTERACTION 7: SYSTEM UNBLOCK
   * Handles: User A unblocking User B. Restores clean-slate configuration setup.
   */
  unblockUser: async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const { targetUserId } = req.body;

      const { customId } = getRelationshipDetails(currentUserId, targetUserId);
      const relation = await Friend.findById(customId);

      if (!relation || relation.relationStatus !== "blocked") {
        return res.status(404).json({ message: "No active blocking history record found." });
      }

      if (!relation.blockedBy.equals(currentUserId)) {
        return res.status(403).json({ message: "Access Denied. You are not authorized to unblock this user profile." });
      }

      await Friend.deleteOne({ _id: customId });

      const io = req.app.get("socketio");
      if (io) {
        io.to(targetUserId.toString()).emit("relationship_change", { senderId: currentUserId.toString(), isBlocked: false, buttonText: "Follow" });
        io.to(currentUserId.toString()).emit("relationship_change", { senderId: targetUserId.toString(), isBlocked: false, buttonText: "Follow" });
      }

      return res.status(200).json({ message: "User successfully unblocked." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * LOOKUP INTERACTION: COMPUTE RELATIONSHIP LOOKUP STATE
   * Triggered when: Current User visits Target User profile page.
   * Compiles dynamic variables directly consumed by React Native client layout.
   */
  getProfileRelationState: async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const { targetUserId } = req.params;

      if (!isValidId(targetUserId)) {
        return res.status(400).json({ message: "Invalid target user ID format." });
      }

      const userDoc = await Users.findById(targetUserId).select("username fullname accountType profile");
      if (!userDoc) return res.status(404).json({ message: "User profile not found." });

      const followersCount = await Friend.countDocuments({
        $or: [
          { user1: targetUserId, user2Following: true },
          { user2: targetUserId, user1Following: true }
        ]
      });

      const followingCount = await Friend.countDocuments({
        $or: [
          { user1: targetUserId, user1Following: true },
          { user2: targetUserId, user2Following: true }
        ]
      });

      const targetUser = {
        _id: userDoc._id.toString(),
        username: userDoc.username,
        name: userDoc.fullname,
        accountType: userDoc.accountType?.toLowerCase() === "public" ? "public" : "private",
        profilePicture: userDoc.profile,
        followersCount,
        followingCount,
        createdAt: userDoc._id.getTimestamp()
      };

      const { customId, isUser1 } = getRelationshipDetails(currentUserId, targetUserId);
      const relation = await Friend.findById(customId);

      // Default Clean-Slate values (Zero interaction history fallback)
      let buttonText = "Follow";
      let canViewContent = targetUser.accountType === "public";
      let inboundPendingRequest = false;
      let isBlocked = false;

      if (relation) {
        if (relation.relationStatus === "blocked") {
          isBlocked = true;
          canViewContent = false;
          buttonText = relation.blockedBy.toString() === currentUserId.toString() ? "Unblock" : "Follow";
        } else {
          const iFollowThem = isUser1 ? relation.user1Following : relation.user2Following;
          const theyFollowMe = isUser1 ? relation.user2Following : relation.user1Following;

          if (relation.relationStatus === "pending") {
            if (relation.requestFrom.toString() === currentUserId.toString()) {
              buttonText = "Requested";
              canViewContent = targetUser.accountType === "public";
            } else {
              inboundPendingRequest = true;
              canViewContent = iFollowThem || targetUser.accountType === "public";
              buttonText = iFollowThem ? "Following" : "Confirm";
            }
          } else if (relation.relationStatus === "accepted") {
            if (iFollowThem) {
              buttonText = "Following";
              canViewContent = true; 
            } else if (theyFollowMe) {
              buttonText = "Follow Back";
              canViewContent = targetUser.accountType === "public";
            }
          }
        }
      }

      return res.status(200).json({
        targetUser,
        relationshipState: {
          FriendId: relation ? relation._id : null,
          buttonText,
          canViewContent,
          inboundPendingRequest,
          isBlocked,
          iFollowThem: relation ? (isUser1 ? relation.user1Following : relation.user2Following) : false,
          theyFollowMe: relation ? (isUser1 ? relation.user2Following : relation.user1Following) : false,
        }
      });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  getFollowers: async (req, res) => {
    try {
      const { targetUserId } = req.params;
      const currentUserId = req.user._id;

      const relations = await Friend.find({
        $or: [
          { user1: targetUserId, user2Following: true },
          { user2: targetUserId, user1Following: true }
        ]
      }).populate("user1", "username fullname profile accountType")
        .populate("user2", "username fullname profile accountType");

      const list = await Promise.all(relations.map(async (rel) => {
        const isU1 = rel.user1._id.toString() === targetUserId;
        const followerUser = isU1 ? rel.user2 : rel.user1;

        const { customId, isUser1: isCurrU1 } = getRelationshipDetails(currentUserId, followerUser._id);
        const relBack = await Friend.findById(customId);
        let followBackState = "follow"; // "follow", "following", "requested"
        if (relBack) {
          if (relBack.relationStatus === "blocked") {
            followBackState = "blocked";
          } else {
            const iFollowThem = isCurrU1 ? relBack.user1Following : relBack.user2Following;
            if (relBack.relationStatus === "pending" && relBack.requestFrom.equals(currentUserId)) {
              followBackState = "requested";
            } else if (iFollowThem) {
              followBackState = "following";
            }
          }
        }

        return {
          _id: followerUser._id.toString(),
          username: followerUser.username,
          fullname: followerUser.fullname,
          profilePicture: followerUser.profile,
          accountType: followerUser.accountType?.toLowerCase() === "public" ? "public" : "private",
          followBackState
        };
      }));

      return res.status(200).json(list);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  getFollowing: async (req, res) => {
    try {
      const { targetUserId } = req.params;
      const currentUserId = req.user._id;

      const relations = await Friend.find({
        $or: [
          { user1: targetUserId, user1Following: true },
          { user2: targetUserId, user2Following: true }
        ]
      }).populate("user1", "username fullname profile accountType")
        .populate("user2", "username fullname profile accountType");

      const list = await Promise.all(relations.map(async (rel) => {
        const isU1 = rel.user1._id.toString() === targetUserId;
        const followedUser = isU1 ? rel.user2 : rel.user1;

        const { customId, isUser1: isCurrU1 } = getRelationshipDetails(currentUserId, followedUser._id);
        const relBack = await Friend.findById(customId);
        let followBackState = "follow"; // "follow", "following", "requested"
        if (relBack) {
          if (relBack.relationStatus === "blocked") {
            followBackState = "blocked";
          } else {
            const iFollowThem = isCurrU1 ? relBack.user1Following : relBack.user2Following;
            if (relBack.relationStatus === "pending" && relBack.requestFrom.equals(currentUserId)) {
              followBackState = "requested";
            } else if (iFollowThem) {
              followBackState = "following";
            }
          }
        }

        return {
          _id: followedUser._id.toString(),
          username: followedUser.username,
          fullname: followedUser.fullname,
          profilePicture: followedUser.profile,
          accountType: followedUser.accountType?.toLowerCase() === "public" ? "public" : "private",
          followBackState
        };
      }));

      return res.status(200).json(list);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  getContacts: async (req, res) => {
    try {
      const currentUserId = req.user._id;

      // Find all Friend docs where current user is involved, not blocked, and at least one is following
      const relations = await Friend.find({
        $and: [
          {
            $or: [
              { user1: currentUserId },
              { user2: currentUserId }
            ]
          },
          {
            $or: [
              { user1Following: true },
              { user2Following: true }
            ]
          }
        ],
        relationStatus: { $ne: "blocked" }
      }).populate("user1", "username fullname profile accountType")
        .populate("user2", "username fullname profile accountType");

      const contacts = relations.map((rel) => {
        if (!rel.user1 || !rel.user2) return null;

        const isUser1 = rel.user1._id.toString() === currentUserId.toString();
        const otherUser = isUser1 ? rel.user2 : rel.user1;
        const iFollowThem = isUser1 ? rel.user1Following : rel.user2Following;
        const theyFollowMe = isUser1 ? rel.user2Following : rel.user1Following;

        return {
          _id: otherUser._id.toString(),
          username: otherUser.username,
          fullname: otherUser.fullname,
          profilePicture: otherUser.profile,
          accountType: otherUser.accountType?.toLowerCase() === "public" ? "public" : "private",
          iFollowThem,
          theyFollowMe,
          FriendId: rel._id
        };
      }).filter(Boolean);

      return res.status(200).json(contacts);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};

export default FriendsController;