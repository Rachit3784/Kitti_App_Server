import eepress from "express";
// import { AccountRecover, actionOnforgetPass, CreateUser, forgetPasswordRequest, LoginUser, LoginWithCookie, UpdateUser, updateUserAgain, verifyForgetPassUserOTP, verifyUser } from "../controllers/User.controller.js";
import { verifyAdminToken, verifyToken } from "../Middleware/JwtVerify.js";
import { AccountRecover, actionOnforgetPass,LoginUser, CreateUser, forgetPasswordRequest, LoginWithCookie, UpdateUser, verifyForgetPassUserOTP, verifyUser, UserInfoSearch } from "../controller/User.controller.js";
import { UserSearch } from "../controller/SearchUser.js";

export const UserRouter = eepress.Router();


UserRouter.post('/register',CreateUser);
UserRouter.post('/verify',verifyUser);
UserRouter.post('/verifywithCookie',verifyToken,LoginWithCookie);
UserRouter.post('/login',LoginUser);
UserRouter.post('/forgetPass',forgetPasswordRequest);
UserRouter.post('/recoverAccount',AccountRecover);
UserRouter.post('/updateProfile',UpdateUser);
UserRouter.post('/verifyForgotUser',verifyForgetPassUserOTP);
UserRouter.post('/resetPass',actionOnforgetPass);
UserRouter.get('/find-user',UserSearch);
UserRouter.get('/fetch-user-info' ,verifyAdminToken, UserInfoSearch);


