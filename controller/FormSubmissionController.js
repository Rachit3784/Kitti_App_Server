import { FormSubmissionModel } from "../models/FormSubmissionSchema.js";
import { PostModel } from "../models/PostSchema.js";
import mongoose from "mongoose";

// 1. Submit Details to a Form Post
export const submitForm = async (req, res) => {
  try {
    const userId = req.user._id;
    const { formPostId, answers } = req.body;

    if (!formPostId || !mongoose.Types.ObjectId.isValid(formPostId)) {
      return res.status(400).json({ success: false, message: "Invalid Form Post ID." });
    }

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ success: false, message: "Please provide valid answers." });
    }

    // Check if the Form Post exists and is actually a Form type post
    const post = await PostModel.findById(formPostId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Form post not found." });
    }

    if (post.data.type !== "Form") {
      return res.status(400).json({ success: false, message: "This post is not a Form." });
    }

    // Create the submission
    const newSubmission = await FormSubmissionModel.create({
      formPostId,
      userId,
      answers
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully!",
      submission: newSubmission
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this form."
      });
    }
    console.error("submitForm Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// 2. Get All Form Posts Created By The Logged-In User
export const getUserForms = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const query = { userId, "data.type": "Form" };

    const totalForms = await PostModel.countDocuments(query);
    const totalPages = Math.ceil(totalForms / limit);

    const forms = await PostModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      forms,
      totalPages,
      currentPage: page,
      nextPage: page < totalPages ? page + 1 : null
    });
  } catch (error) {
    console.error("getUserForms Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// 3. Get All Submissions For A Specific Form Post
export const getFormSubmissions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { formPostId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!formPostId || !mongoose.Types.ObjectId.isValid(formPostId)) {
      return res.status(400).json({ success: false, message: "Invalid Form Post ID." });
    }

    // Verify ownership: only the creator of the form post can view submissions!
    const post = await PostModel.findById(formPostId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Form post not found." });
    }

    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized access: You don't own this form post." });
    }

    const query = { formPostId };

    const totalSubmissions = await FormSubmissionModel.countDocuments(query);
    const totalPages = Math.ceil(totalSubmissions / limit);

    const submissionsRaw = await FormSubmissionModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "username email")
      .lean();

    // Map to simple structure for easy client consumption
    const submissions = submissionsRaw.map(sub => ({
      submissionId: sub._id.toString(),
      username: sub.userId?.username || "anonymous",
      email: sub.userId?.email || "N/A",
      answers: sub.answers ? (sub.answers instanceof Map ? Object.fromEntries(sub.answers) : sub.answers) : {},
      createdAt: sub.createdAt
    }));

    // Extract all field keys defined in the form input definitions for Excel parsing reference
    const formFields = post.data?.payload?.inputs || [];

    return res.status(200).json({
      success: true,
      submissions,
      formFields,
      totalPages,
      currentPage: page,
      nextPage: page < totalPages ? page + 1 : null
    });
  } catch (error) {
    console.error("getFormSubmissions Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
