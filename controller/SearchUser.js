import { Users } from "../models/UserSchema.js";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); 
}

export const UserSearch = async (req, res) => {
  try {
    let { q, page = 1, limit = 10 } = req.query;
    
    page = parseInt(page);
    limit = parseInt(limit);

    if (!q || typeof q !== "string" || q.trim() === "") {
      return res.status(200).json({ msg: "No query", data: [], success: true });
    }

    q = q.trim();
    const qLower = q.toLowerCase();
    const qEscaped = escapeRegex(q); 
    const regex = new RegExp(qEscaped, "i");

    const NOT_FOUND = 10000; 

    const users = await Users.aggregate([
      {
        $match: {
          $or: [{ username: { $regex: regex } }, { fullname: { $regex: regex } }]
        }
      },
      {
        $addFields: {
          usernameIndexRaw: { $indexOfBytes: [{ $toLower: "$username" }, qLower] },
          fullnameIndexRaw: { $indexOfBytes: [{ $toLower: "$fullname" }, qLower] }
        }
      },

      {
        $addFields: {
          usernameIndex: {
            $cond: [{ $lt: ["$usernameIndexRaw", 0] }, NOT_FOUND, "$usernameIndexRaw"]
          },
          fullnameIndex: {
            $cond: [{ $lt: ["$fullnameIndexRaw", 0] }, NOT_FOUND, "$fullnameIndexRaw"]
          }
        }
      },

      {
        $addFields: {
          usernameScore: {
            $switch: {
              branches: [
                { case: { $eq: [{ $toLower: "$username" }, qLower] }, then: 0 },
                { case: { $eq: ["$usernameIndex", 0] }, then: 1 }
              ],
              default: { $add: ["$usernameIndex", 2] }
            }
          },
          fullnameScore: {
            $switch: {
              branches: [
                { case: { $eq: [{ $toLower: "$fullname" }, qLower] }, then: 0 },
                { case: { $eq: ["$fullnameIndex", 0] }, then: 1 }
              ],
              default: { $add: ["$fullnameIndex", 2] }
            }
          }
        }
      },

      {
        $addFields: {
          relevancy: { $min: ["$usernameScore", "$fullnameScore"] }
        }
      },

      { $sort: { relevancy: 1 } },

      
      { $skip: (page - 1) * limit },
      { $limit: limit },

      {
        $project: {
          _id: 1,
          username: 1,
          fullname: 1,
          profile: 1,
          relevancy: 1,
          accountType : 1,
        }
      }
    ]);

    return res.status(200).json({
      msg: "User Fetched",
      data: users,
      page,
      limit,
      success: true
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal Server Error", success: false });
  }
};
