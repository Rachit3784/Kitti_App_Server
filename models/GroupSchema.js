import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  role: {
    type: String,
    enum: ["member", "moderator", "admin"],
    default: "member"
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false }); // Separately ID create karne ki zarurat nahi hai sub-document me

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Community name is required"],
    unique: true,
    trim: true,
    minlength: [3, "Community name must be at least 3 characters long"],
    maxlength: [30, "Community name cannot exceed 30 characters"]
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true // Example: "react-native-devs" (URL routing ke liye best hai)
  },
  title: {
    type: String,
    required: [true, "Community headline/title is required"],
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, "Description cannot be more than 500 characters"],
    default: ""
  },
  groupPic: {
    type: String,
    default: "https://res.cloudinary.com/demo/image/upload/v1/default_avatar.jpg" // Standard default avatar URL
  },
  bannerPic: {
    type: String,
    default: ""
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  privacyMode: {
    type: String,
    enum: ["public", "restricted", "private"], // Reddit style: Public (anyone), Restricted (only approved post), Private (invite only)
    default: "public"
  },
  
  // High-performance direct member management array (for quick lookups up to 10k members)
  members: [MemberSchema],
  
  // Counters for Analytics (Optimized for feed sorting without using .length)
  memberCount: {
    type: Number,
    default: 1
  },
  postCount: {
    type: Number,
    default: 0
  },
  
  // Rules array like Reddit communities
  rules: [{
    title: { type: String, required: true },
    desc: { type: String, default: "" }
  }],
  
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Performance Optimization Indexes (Industry Standard)
GroupSchema.index({ slug: 1 });
GroupSchema.index({ name: "text", description: "text" }); // Multi-field text index for searching communities

export const GroupModel = mongoose.model("Groups", GroupSchema);