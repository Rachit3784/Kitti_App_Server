// import { FollowRequests } from "../models/FollowRequest.js";
// import { FriendsModel } from "../models/FriendSchema.js";

// // export const friendRequest = async (req, res) => {
// //     try {
// //         console.log("I am called");
// //         const { UserId, reqType, accountType, friendId } = req.query;
// //         console.log("Request Details:", UserId, reqType, accountType, friendId);

// //         // --- 1. Initial Validation ---
// //         if (!UserId || !reqType || !friendId || !accountType) {
// //             return res.status(400).json({ msg: "Details are missing", success: false });
// //         }

// //         // Standardize the connectionId: lexicographically smaller ID first
// //         const connectionId = UserId > friendId ? UserId + friendId : friendId + UserId;

// //         // --- 2. Public Account: Direct Following ---
// //         if (reqType === 'Following' && accountType === 'Public') {
            
// //             // CHECK 1: Is a connection already established?
// //             const existingConnection = await FriendsModel.findOne({
// //                 ConnectionId: connectionId,
// //                 SenderId: UserId, // Ensure the connection is sent by the current user
// //                 Type: { $in: ['Following'] } // Check if 'Following' exists in the Type array
// //             });

// //             if (existingConnection) {
// //                 // Correctly checks if the document exists (is not null)
// //                 return res.status(400).json({ msg: "Already Following", success: false });
// //             }

// //             // CREATE: Establish the direct "Following" relationship
// //             const friends = await FriendsModel.create({
// //                 SenderId: UserId,
// //                 RecieverId: friendId,
// //                 ConnectionId: connectionId,
// //                 Type: ["Following"], // Type must be an array
// //                 FollowBack: false,
// //                 messagePermission: true
// //             });

// //             if (!friends) {
// //                 return res.status(400).json({ msg: "Failed To Follow", success: false });
// //             }
            
// //             return res.status(200).json({ msg: "Following Successfully", success: true }); 
// //         }

// //         // --- 3. Private Account: Send Follow Request ---
// //         else if (reqType === 'Following' && accountType === 'Private') {
            
// //             // CHECK 1: Check for an existing established connection (already following)
// //             const existingConnection = await FriendsModel.findOne({
// //                 ConnectionId: connectionId,
// //                 SenderId: UserId,
// //                 Type: { $in: ['Following'] }
// //             });

// //             if (existingConnection) { 
// //                  return res.status(400).json({ msg: "Already Following (Accepted)", success: false });
// //             }

// //             // CHECK 2: Check for a pending request from this user to the friend
// //             const existingRequest = await FollowRequests.findOne({ 
// //                 RequestId: connectionId,
// //                 SenderId: UserId, // Request must be from the current user
// //                 RecieverId: friendId,
// //                 Status: 'Notified' // Check if it's currently pending
// //             });

// //             if (existingRequest) {
// //                 return res.status(400).json({ msg: "Already Requested", success: false });
// //             }
            
// //             // CREATE: Add the follow request
// //             const addFollowReq = await FollowRequests.create({
// //                 SenderId: UserId,
// //                 RecieverId: friendId,
// //                 RequestId: connectionId,
// //                 Status: 'Notified'
// //             });

// //             if (!addFollowReq) {
// //                 return res.status(400).json({ msg: "Failed To Send Follow Request", success: false });
// //             }

// //             return res.status(200).json({ msg: "Requested Successfully", success: true }); 
// //         }

// //         // --- 4. Follow Back Logic ---
// //         else if (reqType === 'FollowBack') {

// //             // We look for the original connection where 'friendId' was the Sender and 'UserId' is the Reciever.
// //             const existingFriendEntry = await FriendsModel.findOne({
// //                 ConnectionId: connectionId,
// //                 SenderId: friendId, 
// //                 RecieverId: UserId 
// //             });

// //             if (!existingFriendEntry) {
// //                  // Should only be called if the other user (friendId) is already following UserId
// //                  return res.status(404).json({ msg: "Original connection not found or invalid operation.", success: false });
// //             }
            
// //             if (existingFriendEntry.FollowBack === true) { 
// //                 return res.status(400).json({ msg: "Already Following Back", success: false });
// //             }

// //             // UPDATE: Set FollowBack to true on the existing connection
// //             const friend = await FriendsModel.findOneAndUpdate(
// //                 { 
// //                     ConnectionId: connectionId,
// //                     SenderId: friendId, // Find the document where friendId initiated the connection
// //                     RecieverId: UserId
// //                 }, 
// //                 { 
// //                     $set: { FollowBack: true } 
// //                 }, 
// //                 { 
// //                     new: true 
// //                 }
// //             );

// //             if (!friend) {
// //                 return res.status(400).json({ msg: "Failed To FollowBack", success: false });
// //             }

// //             // Corrected success response status
// //             return res.status(200).json({ msg: "Successfully followback", success: true });
// //         } 
        
// //         // --- 5. Unhandled Request ---
        
// //         return res.status(400).json({ msg: "Invalid Request Type or Account Type combination", success: false });

// //     } catch (error) {
// //         console.error("Error in friendRequest:", error);
// //         return res.status(500).json({
// //             msg: "Internal Server Error", 
// //             success: false,
// //             error: error.message
// //         });
// //     }
// // }


// export const friendRequest = async (req, res) => {
//     try {

//         const { UserId, reqType, accountType, friendId } = req.query;

//         if (!UserId || !reqType || !friendId || !accountType) {
//             return res.status(400).json({ msg: "Details are missing", success: false });
//         }

//         const connectionId = UserId > friendId ? UserId + friendId : friendId + UserId;

//         // FETCH existing connection (any direction)
//         const existingConnection = await FriendsModel.findOne({ ConnectionId: connectionId });
//         const pendingRequest = await FollowRequests.findOne({ RequestId: connectionId, Status: "Notified" });

//         // ----------------------------------------------------
//         // 1. PUBLIC ACCOUNT → DIRECT FOLLOW
//         // ----------------------------------------------------
//         if (reqType === "Following" && accountType === "Public") {

//             // Already following?
//             if (existingConnection) {
//                 // Check if user already follows
//                 if (existingConnection.SenderId.toString() === UserId) {
//                     return res.status(400).json({ msg: "Already Following", success: false });
//                 }

//                 // User is follower, now trying to follow back
//                 // ✔ This becomes FollowBack
//                 await FriendsModel.findOneAndUpdate(
//                     { ConnectionId: connectionId },
//                     {
//                         $set: {
//                             FollowBack: true,
//                             Type: ["Following", "Follower"] // 🔥 Fix Type update
//                         }
//                     }
//                 );

//                 return res.status(200).json({ msg: "FollowBack Successful", success: true });
//             }

//             // Create new follow (one-way)
//             await FriendsModel.create({
//                 SenderId: UserId,
//                 RecieverId: friendId,
//                 ConnectionId: connectionId,
//                 Type: ["Following"],
//                 FollowBack: false
//             });

//             return res.status(200).json({ msg: "Following Successfully", success: true });
//         }


//         // ----------------------------------------------------
//         // 2. PRIVATE ACCOUNT → SEND FOLLOW REQUEST
//         // ----------------------------------------------------
//         if (reqType === "Following" && accountType === "Private") {

//             // Already following?
//             if (existingConnection && existingConnection.SenderId.toString() === UserId) {
//                 return res.status(400).json({ msg: "Already Following", success: false });
//             }

//             // Already requested?
//             if (pendingRequest && pendingRequest.SenderId.toString() === UserId) {
//                 return res.status(400).json({ msg: "Already Requested", success: false });
//             }

//             // Reverse request exists → Prevent weird reverse double-request
//             if (pendingRequest && pendingRequest.RecieverId.toString() === UserId) {
//                 return res.status(400).json({
//                     msg: "User has already requested you. Accept instead.",
//                     success: false
//                 });
//             }

//             // Create request
//             await FollowRequests.create({
//                 SenderId: UserId,
//                 RecieverId: friendId,
//                 RequestId: connectionId
//             });

//             return res.status(200).json({ msg: "Request Sent", success: true });
//         }


//         // ----------------------------------------------------
//         // 3. ACCEPT REQUEST (PRIVATE)
//         // ----------------------------------------------------
//         if (reqType === "Accept") {

//             if (!pendingRequest) {
//                 return res.status(404).json({ msg: "No such request exists", success: false });
//             }

//             if (pendingRequest.RecieverId.toString() !== UserId) {
//                 return res.status(403).json({ msg: "Not allowed", success: false });
//             }

//             // Accept: remove request
//             await FollowRequests.deleteOne({ _id: pendingRequest._id });

//             // Create follow
//             await FriendsModel.create({
//                 SenderId: pendingRequest.SenderId,
//                 RecieverId: pendingRequest.RecieverId,
//                 ConnectionId: connectionId,
//                 Type: ["Following"],
//                 FollowBack: false
//             });

//             return res.status(200).json({ msg: "Request Accepted", success: true });
//         }


//         // ----------------------------------------------------
//         // 4. FOLLOW BACK (PUBLIC + PRIVATE)
//         // ----------------------------------------------------
//         if (reqType === "FollowBack") {

//             if (!existingConnection) {
//                 return res.status(400).json({ msg: "User must follow you first", success: false });
//             }

//             // Already FollowBack?
//             if (existingConnection.FollowBack) {
//                 return res.status(400).json({ msg: "Already FollowBack", success: false });
//             }

//             // Perform follow back
//             await FriendsModel.findOneAndUpdate(
//                 { ConnectionId: connectionId },
//                 {
//                     $set: {
//                         FollowBack: true,
//                         Type: ["Following", "Follower"] // 🔥 FIX MUTUAL FOLLOWING
//                     }
//                 }
//             );

//             return res.status(200).json({ msg: "FollowBack Successful", success: true });
//         }


//         return res.status(400).json({ msg: "Invalid Request Type", success: false });

//     } catch (error) {
//         console.log("Error in friendRequest:", error);
//         return res.status(500).json({ msg: "Server Error", success: false });
//     }
// };




// export const CheckProfile = async (req, res) => {
//     try {
//         const { UserId, friendId, accountType } = req.query;
//         if (!UserId || !friendId || !accountType)
//             return res.status(400).json({ msg: "Details Missing", success: false });

//         const connectionId =
//             String(UserId) > String(friendId)
//                 ? UserId + friendId
//                 : friendId + UserId;

//         const FollowStatus = await FriendsModel.findOne({ ConnectionId: connectionId });

//         // Helper safe-check convert IDs
//         const isSender = FollowStatus && FollowStatus.SenderId.toString() === UserId;
//         const isReceiver = FollowStatus && FollowStatus.RecieverId.toString() === UserId;

//         const FollowRequestStatus = await FollowRequests.findOne({ RequestId: connectionId });

//         // -----------------------------------------------------------
//         // PUBLIC ACCOUNT LOGIC
//         // -----------------------------------------------------------
//         if (accountType === "Public") {

//             if (!FollowStatus) {
//                 return res.status(200).json({ msg: "Not Following", success: true, status: "NotFollowing" });
//             }

//             if (isSender) {
//                 return res.status(200).json({ msg: "Following", success: true, status: "Following" });
//             }

//             // if receiver
//             if (isReceiver) {

//                 if (FollowStatus.FollowBack && !FollowStatus.Type.includes("Follower")) {
//                     return res.status(200).json({ msg: "Follow Back Requested", success: true, status: "Requested" });
//                 }

//                 if (FollowStatus.FollowBack && FollowStatus.Type.includes("Follower")) {
//                     return res.status(200).json({ msg: "Following", success: true, status: "Following" });
//                 }

//                 if (!FollowStatus.FollowBack) {
//                     return res.status(200).json({ msg: "Did not follow back", success: true, status: "FollowBack" });
//                 }
//             }
//         }

//         // -----------------------------------------------------------
//         // PRIVATE ACCOUNT LOGIC
//         // -----------------------------------------------------------
//         if (accountType === "Private") {

//             if (FollowRequestStatus) {
//                 if (FollowRequestStatus.SenderId.toString() === UserId) {
//                     return res.status(200).json({ msg: "Follow Requested", success: true, status: "Requested" });
//                 }

//                 if (FollowRequestStatus.RecieverId.toString() === UserId) {
//                     return res.status(200).json({ msg: "Follow Requested", success: true, status: "Accept" });
//                 }
//             }

//             // No pending request

//             if (!FollowStatus) {
//                 return res.status(200).json({ msg: "Not Following", success: true, status: "NotFollowing" });
//             }

//             if (isSender) {
//                 return res.status(200).json({ msg: "Following", success: true, status: "Following" });
//             }

//             if (isReceiver) {

//                 if (FollowStatus.FollowBack && !FollowStatus.Type.includes("Follower")) {
//                     return res.status(200).json({ msg: "Follow Back Requested", success: true, status: "Requested" });
//                 }

//                 if (FollowStatus.FollowBack && FollowStatus.Type.includes("Follower")) {
//                     return res.status(200).json({ msg: "Following", success: true, status: "Following" });
//                 }

//                 return res.status(200).json({ msg: "Did not Follow Back", success: true, status: "FollowBack" });
//             }
//         }

//         return res.status(200).json({ msg: "Done", success: true });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ msg: "Internal Server Error", success: false });
//     }
// };


import mongoose from 'mongoose';
import { FriendRequests } from '../models/FollowRequest.js';
import { FriendsModel } from '../models/FriendSchema.js';
import { Users } from '../models/UserSchema.js';

const makeConnectionId = (a, b) => {
  const A = String(a);
  const B = String(b);
  return A > B ? A + B : B + A;
};

const computeMessagePermission = (senderAccountType, receiverAccountType, followDoc) => {
  if (senderAccountType === 'Public' && receiverAccountType === 'Public') {
    return !!followDoc;
  }

  if (senderAccountType === 'Private' && receiverAccountType === 'Private') {
    return !!(followDoc && followDoc.FollowBack === true);
  }

  if (senderAccountType === 'Private' && receiverAccountType === 'Public') {
    return !!followDoc;
  }

  if (senderAccountType === 'Public' && receiverAccountType === 'Private') {
    return !!followDoc;
  }

  return false;
};

export const friendRequest = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { UserId, reqType, accountType, friendId } = req.query;
    if (!UserId || !reqType || !friendId || !accountType) {
      return res.status(400).json({ msg: 'Details are missing', success: false });
    }

    const connectionId = makeConnectionId(UserId, friendId);

    const existingConnection = await FriendsModel.findOne({ ConnectionId: connectionId });
    const pendingRequest = await FollowRequests.findOne({
      RequestId: connectionId,
      Status: 'Notified',
    });

    const [userA, userB] = await Promise.all([
      Users.findById(UserId).select('accountType').lean(),
      Users.findById(friendId).select('accountType').lean(),
    ]);
    const userAType = userA?.accountType || 'Public';
    const userBType = userB?.accountType || 'Public';

    // FOLLOW (Public)
    if (reqType === 'Following' && accountType === 'Public') {
      if (existingConnection) {
        if (
          existingConnection.SenderId.toString() === UserId &&
          existingConnection.Type.includes('Following')
        ) {
          return res.status(400).json({ msg: 'Already Following', success: false });
        }

        const newMessagePermission = computeMessagePermission(
          userAType,
          userBType,
          { ...existingConnection.toObject(), FollowBack: true }
        );

        await FriendsModel.findOneAndUpdate(
          { ConnectionId: connectionId },
          {
            $set: {
              FollowBack: true,
              Type: ['Following', 'Follower'],
              messagePermission: newMessagePermission,
            },
          }
        );

        return res.status(200).json({ msg: 'FollowBack Successful', success: true });
      }

      const initialMessagePermission = computeMessagePermission(userAType, userBType, {
        FollowBack: false,
        Type: ['Following'],
      });

      await FriendsModel.create({
        SenderId: UserId,
        RecieverId: friendId,
        ConnectionId: connectionId,
        Type: ['Following'],
        FollowBack: false,
        messagePermission: initialMessagePermission,
        messagePermissionUpdatedAt: new Date(),
      });

      return res.status(200).json({ msg: 'Following Successfully', success: true });
    }

    // FOLLOW (Private) -> Request
    if (reqType === 'Following' && accountType === 'Private') {
      if (
        existingConnection &&
        existingConnection.SenderId.toString() === UserId &&
        existingConnection.Type.includes('Following')
      ) {
        return res.status(400).json({ msg: 'Already Following', success: false });
      }

      if (pendingRequest && pendingRequest.SenderId.toString() === UserId) {
        return res.status(400).json({ msg: 'Already Requested', success: false });
      }

      if (pendingRequest && pendingRequest.RecieverId.toString() === UserId) {
        return res
          .status(400)
          .json({ msg: 'User has already requested you. Accept instead.', success: false });
      }

      await FollowRequests.create({
        SenderId: UserId,
        RecieverId: friendId,
        RequestId: connectionId,
        Status: 'Notified',
        RequestedAt: new Date(),
      });

      return res.status(200).json({ msg: 'Request Sent', success: true });
    }

    // ACCEPT (Private)
    if (reqType === 'Accept') {
      if (!pendingRequest) {
        return res.status(404).json({ msg: 'No such request exists', success: false });
      }

      if (pendingRequest.RecieverId.toString() !== UserId) {
        return res.status(403).json({ msg: 'Not allowed', success: false });
      }

      await session.withTransaction(async () => {
        await FollowRequests.deleteOne({ _id: pendingRequest._id }).session(session);

        const existing = await FriendsModel.findOne({ ConnectionId: connectionId }).session(
          session
        );

        if (existing) {
          if (existing.SenderId.toString() === pendingRequest.SenderId.toString()) {
            const newMessagePermission = computeMessagePermission(
              userBType,
              userAType,
              { ...existing.toObject(), FollowBack: true }
            );

            await FriendsModel.findOneAndUpdate(
              { ConnectionId: connectionId },
              {
                $set: {
                  FollowBack: true,
                  Type: ['Following', 'Follower'],
                  messagePermission: newMessagePermission,
                },
              }
            ).session(session);
          } else {
            const simulated = { Type: ['Following'], FollowBack: false };
            const newMessagePermission = computeMessagePermission(
              userAType,
              userBType,
              simulated
            );

            await FriendsModel.findOneAndUpdate(
              { ConnectionId: connectionId },
              {
                $set: {
                  SenderId: pendingRequest.SenderId,
                  RecieverId: pendingRequest.RecieverId,
                  Type: ['Following'],
                  FollowBack: false,
                  messagePermission: newMessagePermission,
                },
              },
              { upsert: true }
            ).session(session);
          }
        } else {
          const simulated = { Type: ['Following'], FollowBack: false };
          const newMessagePermission = computeMessagePermission(
            userAType,
            userBType,
            simulated
          );

          await FriendsModel.create(
            [
              {
                SenderId: pendingRequest.SenderId,
                RecieverId: pendingRequest.RecieverId,
                ConnectionId: connectionId,
                Type: ['Following'],
                FollowBack: false,
                messagePermission: newMessagePermission,
                messagePermissionUpdatedAt: new Date(),
              },
            ],
            { session }
          );
        }
      });

      return res.status(200).json({ msg: 'Request Accepted', success: true });
    }

    // DECLINE
    if (reqType === 'Decline') {
      if (!pendingRequest) {
        return res.status(404).json({ msg: 'No such request exists', success: false });
      }
      if (pendingRequest.RecieverId.toString() !== UserId) {
        return res.status(403).json({ msg: 'Not allowed', success: false });
      }

      await FollowRequests.deleteOne({ _id: pendingRequest._id });
      return res.status(200).json({ msg: 'Request Declined', success: true });
    }

    // CANCEL REQUEST
    if (reqType === 'CancelRequest') {
      if (!pendingRequest) {
        return res
          .status(404)
          .json({ msg: 'No pending request to cancel', success: false });
      }
      if (pendingRequest.SenderId.toString() !== UserId) {
        return res.status(403).json({ msg: 'Not allowed', success: false });
      }
      await FollowRequests.deleteOne({ _id: pendingRequest._id });
      return res.status(200).json({ msg: 'Request Cancelled', success: true });
    }

    // UNFOLLOW
    if (reqType === 'Unfollow') {
      if (!existingConnection) {
        return res.status(404).json({ msg: 'Not following', success: false });
      }

      const isSender = existingConnection.SenderId.toString() === UserId;
      const isReceiver = existingConnection.RecieverId.toString() === UserId;

      if (isSender) {
        const newType = existingConnection.Type.filter((t) => t !== 'Following');

        if (newType.length === 0) {
          await FriendsModel.deleteOne({ ConnectionId: connectionId });
        } else {
          const newFollowBack = false;
          const newMessagePermission = computeMessagePermission(userAType, userBType, {
            Type: newType,
            FollowBack: newFollowBack,
          });

          await FriendsModel.findOneAndUpdate(
            { ConnectionId: connectionId },
            {
              $set: {
                Type: newType,
                FollowBack: newFollowBack,
                messagePermission: newMessagePermission,
              },
            }
          );
        }

        return res.status(200).json({ msg: 'Unfollowed', success: true });
      }

      if (isReceiver) {
        await FriendsModel.deleteOne({ ConnectionId: connectionId });
        return res.status(200).json({ msg: 'Relationship removed', success: true });
      }

      return res.status(400).json({ msg: 'Invalid Unfollow operation', success: false });
    }

    // FollowBack explicit
    if (reqType === 'FollowBack') {
      if (!existingConnection) {
        return res.status(400).json({ msg: 'User must follow you first', success: false });
      }

      if (
        existingConnection.SenderId.toString() === friendId &&
        existingConnection.RecieverId.toString() === UserId
      ) {
        if (existingConnection.FollowBack) {
          return res.status(400).json({ msg: 'Already FollowBack', success: false });
        }

        const newMessagePermission = computeMessagePermission(
          userAType,
          userBType,
          { ...existingConnection.toObject(), FollowBack: true }
        );

        await FriendsModel.findOneAndUpdate(
          { ConnectionId: connectionId },
          {
            $set: {
              FollowBack: true,
              Type: ['Following', 'Follower'],
              messagePermission: newMessagePermission,
            },
          }
        );
        return res.status(200).json({ msg: 'FollowBack Successful', success: true });
      }

      const newMessagePermission = computeMessagePermission(
        userAType,
        userBType,
        { ...existingConnection?.toObject(), FollowBack: true }
      );

      await FriendsModel.findOneAndUpdate(
        { ConnectionId: connectionId },
        {
          $set: {
            FollowBack: true,
            Type: ['Following', 'Follower'],
            messagePermission: newMessagePermission,
          },
        },
        { upsert: true }
      );
      return res.status(200).json({ msg: 'FollowBack Successful', success: true });
    }

    return res.status(400).json({ msg: 'Invalid Request Type', success: false });
  } catch (error) {
    console.error('Error in friendRequest:', error);
    return res
      .status(500)
      .json({ msg: 'Server Error', success: false, error: error.message });
  } finally {
    session.endSession();
  }
};

export const CheckProfile = async (req, res) => {
  try {
    const { UserId, friendId, accountType } = req.query;
    if (!UserId || !friendId || !accountType)
      return res.status(400).json({ msg: 'Details Missing', success: false });

    const connectionId = makeConnectionId(UserId, friendId);

    const followDoc = await FriendsModel.findOne({ ConnectionId: connectionId });
    const requestDoc = await FollowRequests.findOne({
      RequestId: connectionId,
      Status: 'Notified',
    });

    const followExists = !!followDoc;
    const isSender = followExists && followDoc.SenderId.toString() === UserId;
    const isReceiver = followExists && followDoc.RecieverId.toString() === UserId;

    if (accountType === 'Public') {
      if (!followExists) {
        return res
          .status(200)
          .json({ msg: 'Not Following', success: true, status: 'NotFollowing' });
      }

      if (isSender && followDoc.Type.includes('Following')) {
        if (followDoc.FollowBack && followDoc.Type.includes('Follower')) {
          return res
            .status(200)
            .json({ msg: 'Following', success: true, status: 'Following' });
        }
        return res
          .status(200)
          .json({ msg: 'Following', success: true, status: 'Following' });
      }

      if (isReceiver) {
        if (
          followDoc.FollowBack &&
          followDoc.Type.includes('Follower') &&
          followDoc.Type.includes('Following')
        ) {
          return res
            .status(200)
            .json({ msg: 'Following', success: true, status: 'Following' });
        }
        return res
          .status(200)
          .json({ msg: 'They follow you', success: true, status: 'FollowBack' });
      }

      return res
        .status(200)
        .json({ msg: 'Not Following', success: true, status: 'NotFollowing' });
    }

    if (accountType === 'Private') {
      if (requestDoc) {
        if (requestDoc.SenderId.toString() === UserId) {
          return res
            .status(200)
            .json({ msg: 'Follow Requested', success: true, status: 'Requested' });
        }
        if (requestDoc.RecieverId.toString() === UserId) {
          return res
            .status(200)
            .json({ msg: 'Follow Requested', success: true, status: 'Accept' });
        }
      }

      if (followExists) {
        if (isSender && followDoc.Type.includes('Following')) {
          return res
            .status(200)
            .json({ msg: 'Following', success: true, status: 'Following' });
        }
        if (isReceiver) {
          if (followDoc.FollowBack && followDoc.Type.includes('Follower')) {
            return res
              .status(200)
              .json({ msg: 'Following', success: true, status: 'Following' });
          }
          return res
            .status(200)
            .json({ msg: 'They follow you', success: true, status: 'FollowBack' });
        }
      }

      return res
        .status(200)
        .json({ msg: 'Not Following', success: true, status: 'NotFollowing' });
    }

    return res.status(400).json({ msg: 'Invalid accountType', success: false });
  } catch (error) {
    console.error('CheckProfile error:', error);
    return res.status(500).json({ msg: 'Internal Server Error', success: false });
  }
};
