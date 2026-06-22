import express from "express";
import NotificationController from "../controller/NotificationController.js";
import { verifyToken } from "../Middleware/JwtVerify.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", NotificationController.getMyNotifications);
router.put("/read-all", NotificationController.markAllAsRead);

export default router;