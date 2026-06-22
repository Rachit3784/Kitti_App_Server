import express from 'express'
import { ChangeBio, ChangeProfile } from '../controller/ProfileManagement.js';
import { verifyAdminToken } from '../Middleware/JwtVerify.js';
import { uploads } from '../config/MulterSetup.js';

export const ProfileRouter = express.Router();

ProfileRouter.post('/update-profile-photo',verifyAdminToken,uploads.fields([{ name: "profilePhoto", maxCount: 1 }]), ChangeProfile)
ProfileRouter.post('/update-profile-info',verifyAdminToken , ChangeBio)