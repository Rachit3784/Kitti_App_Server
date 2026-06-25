import express from "express";
import { verifyToken } from "../Middleware/JwtVerify.js";
import {
  submitForm,
  getUserForms,
  getFormSubmissions
} from "../controller/FormSubmissionController.js";

const router = express.Router();

// 1. Submit to a Form Post
router.post("/submit", verifyToken, submitForm);

// 2. Get own forms created by logged-in user
router.get("/my-forms", verifyToken, getUserForms);

// 3. Get submissions for a specific form post (only owner can access)
router.get("/:formPostId/submissions", verifyToken, getFormSubmissions);

export default router;
