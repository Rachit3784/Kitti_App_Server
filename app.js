import e from "express";

import dotenv from "dotenv"

import { Dburl } from "./config/ENV_variable.js";
import cookieParser from 'cookie-parser'
import cors from 'cors'

import { ConnectDB } from "./config/ConnectDB.js";

import {UserRouter} from "./routes/User.routes.js";
import {ProfileRouter} from "./routes/ProfileManagementRoute.js";
import friendrouter from "./routes/FriendRoute.js";
import notificationrouter from "./routes/NotificationRoutes.js";
import postrouter from "./routes/PostRoute.js";

dotenv.config();

export const app = e();

const start = async ()=>{
  // console.log("Hello")
    
    app.use(e.json());
    app.use(cookieParser());
app.use(cors({
  
  origin:[ 'http://192.168.152.1:5173' , 'http://localhost:5173' ,'exp://10.51.34.27:8081', '127.0.0.0.1'],
  
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


   app.use('/authenticate',UserRouter)
   app.use('/profile-manage',ProfileRouter)
   app.use('/friends',friendrouter)
   app.use('/notifications',notificationrouter)
   app.use('/posts', postrouter)

   await  ConnectDB(Dburl)
}


start();