import e from "express";
import { verifyToken } from "../Middleware/JwtVerify.js";
import { CheckProfile, friendRequest } from "../controller/UserAction.js";

export const UserAction = e.Router();

UserAction.post('/frient-request' , verifyToken , friendRequest)
UserAction.get('/check-profile' , verifyToken ,  CheckProfile)
