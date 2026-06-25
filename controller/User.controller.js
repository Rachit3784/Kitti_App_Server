import { Users } from "../models/UserSchema.js";

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { generateEmbedding } from "./EmbeddingCreation.js";
import mongoose from "mongoose";
import { SendOtpToUser } from "../utils/OtpMailer.js";
import { privateKey } from "../config/ENV_variable.js";


const htmlTemplate = (otp) => `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>kitti Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#0B1416;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B1416;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#1A282D;border-radius:16px;overflow:hidden;border:1px solid #2D3E44;">
          
          <!-- HEADER SECTION: BRAND LOGO -->
          <tr>
            <td style="padding:32px 32px 20px;text-align:center;border-bottom:1px solid #2D3E44;">
              <div style="display:inline-block;vertical-align:middle;margin-right:10px;">
                <!-- Minimalist Cat Logo simulation inside email client -->
                <span style="font-size:32px;line-height:1;">🐱</span>
              </div>
              <div style="display:inline-block;vertical-align:middle;font-size:36px;font-weight:900;letter-spacing:-1px;color:#FF4500;">
                kitti
              </div>
              <div style="font-size:13px;font-weight:500;color:#818384;margin-top:6px;letter-spacing:0.5px;">
                A community for bite-sized blogs & connections
              </div>
            </td>
          </tr>

          <!-- MAIN CONTENT SECTION -->
          <tr>
            <td style="padding:40px 32px 32px;color:#D7DADC;">
              <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:800;color:#D7DADC;letter-spacing:-0.3px;">
                Verify Your Account
              </h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#818384;font-weight:400;">
                Welcome to the community! Use the verification code below to complete your registration loop and step inside the world of seamless sharing.
              </p>
              
              <!-- OTP BOX DISPLAY -->
              <div style="margin:24px 0;padding:24px;border-radius:12px;background-color:#0B1416;border:1px solid #2D3E44;text-align:center;">
                <div style="font-size:12px;color:#818384;font-weight:700;margin-bottom:12px;letter-spacing:1px;text-transform:uppercase;">
                  Verification Code
                </div>
                <div style="font-family: 'Courier New', Courier, monospace;font-size:38px;letter-spacing:6px;font-weight:800;color:#FF4500;text-align:center;">
                  ${otp}
                </div>
                <div style="font-size:12px;color:#FF4500;margin-top:12px;font-weight:500;">
                  Valid for the next 3 minutes
                </div>
              </div>

              <!-- APP FEATURES PROMO GRID -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #2D3E44;padding-top:24px;">
                <tr>
                  <td style="font-size:14px;color:#818384;padding-bottom:12px;">
                    <strong style="color:#D7DADC;">📸 Share Posts & Media:</strong> Drop text updates, swipable galleries, or stream video loops natively.
                  </td>
                </tr>
                <tr>
                  <td style="font-size:14px;color:#818384;padding-bottom:12px;">
                    <strong style="color:#D7DADC;">💬 Connect & Chat:</strong> Stay synced with real-time direct messages with your friends and family.
                  </td>
                </tr>
                <tr>
                  <td style="font-size:14px;color:#818384;">
                    <strong style="color:#D7DADC;">🌐 Global Hot Feeds:</strong> Explore micro-blogs, read PDF designs, and engage with top trending streams.
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0 0;font-size:15px;color:#818384;line-height:1.6;">
                See you on the other side,<br/>
                <strong style="color:#FF4500;">Team kitti 🐾</strong>
              </p>
            </td>
          </tr>

          <!-- FOOTER DECREE SECTION -->
          <tr>
            <td style="padding:24px 32px;color:#565758;background-color:#0B1416;border-top:1px solid #2D3E44;text-align:center;font-size:12px;line-height:1.5;">
              If you didn't request this verification loop, you can safely disregard this message. Someone probably typed your email by mistake.
            </td>
          </tr>
        </table>

        <!-- APP RIGHTS RESERVED FOOTER -->
        <div style="max-width:600px;margin-top:20px;font-size:12px;color:#565758;text-align:center;font-weight:400;letter-spacing:0.3px;">
          © 2026 kitti inc. — Built for creators and developers. All rights reserved.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;


const generateOtp = () => {
  let j = '';
  for (let i = 0; i < 6; i++) {
    j += Math.floor(Math.random() * 10).toString();
  }
  return j;
};





const LocalOTP = new Map();
const LocalTimeouts = new Map();

export const CreateUser = async (req, res) => {
  try {
    const { username, fullname, email, password , gender, mobile } = req.body;

    // 1. Input validation
    if (!username || !fullname || !email || !password) {
      return res.status(400).json({ msg: "Details are missing" });
    }

    
    const exist = await Users.findOne({ email });
    if (exist) {
      return res.status(400).json({ msg: "User with this email already exists" });
    }

  
    const hashPassword = await bcrypt.hash(password, 10);
    const Otp =  generateOtp();
    const html = htmlTemplate(Otp)
    
    const result =  await SendOtpToUser({ otp : Otp, HTML: html, userEmail: email });

    
    if (!result) {
      return res.status(400).json({ msg: "Failed to send OTP email" });
    }

    
    LocalOTP.set(email, {
      myotp: Otp,
      username,
      fullname,
      hashPassword,
      gender,
      MobileNum: mobile || '',
    });

    
    const existingTimeout = LocalTimeouts.get(email);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      LocalTimeouts.delete(email);
    }

    const timeout = setTimeout(() => {
      LocalOTP.delete(email);
    }, 5 * 60 * 1000); // 2 minutes

    LocalTimeouts.set(email, timeout);

    // 9. Respond to client
    return res.status(200).json({
      msg: "OTP sent to your email",
      success : true
    });

  } catch (error) {
    console.error("CreateUser Error:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }
};




export const verifyUser = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const exist = LocalOTP.get(email);
    
    if (!exist) {
      return res.status(400).json({
        msg: "Invalid OTP or OTP expired",
      });
    }



    if (otp !== exist.myotp) {
      return res.status(400).json({
        msg: "Incorrect OTP",
      });
    }

    let randomNum = '';
    for (let i = 0; i < 5; i++) {
      randomNum += Math.floor(Math.random() * 10);
    }



    const data = await Users.create({
      username: exist.username,
      fullname: exist.fullname,
      password: exist.hashPassword,
      gender : exist.gender,
      email,
      MobileNum: exist.MobileNum || '',
      randomNum
    });




   



    



    
   
    
    const mytoken = jwt.sign(
      { userId: data._id, email, randomNum },
      privateKey,
      { expiresIn: '30d', algorithm : 'RS256'}
    );
   
  
    res.cookie('token', mytoken, {
      httpOnly: true,
    
    });

    
    LocalOTP.delete(email);
    LocalTimeouts.delete(email);
    
    return res.status(200).json({
      success: true,
      msg: "Account created successfully",
      detail : data ,
      
  token: mytoken
    });

    

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error"
    });
  }
};



export const LoginWithCookie = async (req,res)=>{

try{

  const decoded = req.user;

  if(decoded && decoded.userId){
    const findUser = await Users.findById(decoded.userId);
    if (findUser) {
      if (findUser.randomNum && findUser.randomNum !== decoded.randomNum) {
        return res.status(403).json({ msg: "Session expired or logged out", success: false });
      }
      return res.status(200).json({
        msg : "Logged In",
        userdata : findUser,
        success : true
      });
    }
  }
  
  return res.status(400).json({
    msg : "Failed to Logged In",
    success : false
  });

}catch(error){
  console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
      success : false
    });
}

}





export const LoginUser = async (req, res) => {
  try {

    const { email, password } = req.body;
    // 1. Input validation
    if (!email || !password) {
      return res.status(400).json({ msg: "Email or Password missing" });
    }

    // 2. Find user
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // 4. Generate new randomNum for session freshness
    let randomNum = '';
    for (let i = 0; i < 5; i++) {
      randomNum += Math.floor(Math.random() * 10);
    }

    user.randomNum = randomNum;
    await user.save();



    // 5. Generate token
    const mytoken = jwt.sign(
      { userId: user._id, email: user.email, randomNum },
      privateKey,
     { expiresIn: '30d', algorithm : 'RS256'}
    );


    
  

    // 6. Set cookie
    res.cookie('token', mytoken, {
      httpOnly: true,
      
    });

    return res.status(200).json({
      success: true,
      msg: "Login successful alalalala",
      detail : user,
      token : mytoken ,
        
     
    });
  } catch (error) {
    console.error("LoginUser Error:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

// ----------------- forgetPasswordRequest -----------------
export const forgetPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    // 1. Check if user exists
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "No account found with this email" });
    }

    // 2. Send OTP via email

    const otp = await generateOtp();
    const html = htmlTemplate(otp)
    const result = await SendOtpToUser({otp, HTML: html, userEmail: email })
    if (!result) {
      return res.status(400).json({ msg: "Failed to send OTP email" });
    }

    // 3. Store OTP in memory
    LocalOTP.set(email, { myotp: otp, userId: user._id });

    // Clear old timeout if exists
    const existingTimeout = LocalTimeouts.get(email);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      LocalTimeouts.delete(email);
    }

    // Expire OTP in 2 mins
    const timeout = setTimeout(() => {
      LocalOTP.delete(email);
    }, 5 * 60 * 1000);

    LocalTimeouts.set(email, timeout);

    return res.status(200).json({ msg: "OTP sent to your email", success: true });
  } catch (error) {
    console.error("forgetPasswordRequest Error:", error);
    return res.status(500).json({ msg: "Internal Server Error" , success : false});
  }
};

// ----------------- AccountRecover -----------------
export const AccountRecover = async (req, res) => {
  try {
    const { identifier } = req.body; // can be either email OR username

    if (!identifier) {
      return res.status(400).json({ msg: "Provide username or email" });
    }

    // Search by email OR username
    const user = await Users.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      return res.status(404).json({ msg: "Account not found", success: false });
    }

    return res.status(200).json({
      msg: "Found account",
      success: true,
      account: {
        username: user.username,
        email: user.email,
        profileUrl: user.profileUrl || null, // in case profile picture available
      }
    });
  } catch (error) {
    console.error("AccountRecover Error:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};




export const verifyForgetPassUserOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;


        const exist = LocalOTP.get(email);

        if (!exist) {
            return res.status(400).json({
                msg: "Invalid OTP or OTP expired", success: false
            });
        }

        if (otp !== exist.myotp) {
            return res.status(400).json({
                msg: "Incorrect OTP",
                success: false
            });
        }

        // ✅ IMPORTANT: Do not delete the OTP here. Mark it as verified instead.
        LocalOTP.set(email, { ...exist, verified: true });

        return res.status(200).json({ msg: "OTP has been verified", success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            msg: "Internal Server Error",
            success: false
        });
    }
};


export const actionOnforgetPass = async (req, res) => {
    try {
        const { email, password } = req.body;
        

        
        const exist = LocalOTP.get(email);
        
        // ✨ Check for both existence and the 'verified' flag
        if (!exist || !exist.verified) {
            return res.status(400).json({
                msg: "Invalid request, OTP not verified or timeout", 
                success: false
            });
        }

        let randomNum = '';
        for (let i = 0; i < 5; i++) {
            randomNum += Math.floor(Math.random() * 10);
        }
        
        let data;
        if (password) {
            const hashedPass = await bcrypt.hash(password, 10);
            data = await Users.findOneAndUpdate(
                { _id: exist.userId }, // Use the user ID from LocalOTP for a more secure lookup
                { $set: { password: hashedPass } },
                { new: true }
            );
        }
        
        if (!data) {
            return res.status(404).json({
                msg: "User not found or update failed.",
                success: false
            });
        }
       
        const mytoken = jwt.sign(
            { userId: data._id, email: data.email },
            privateKey,
            { expiresIn: '30d', algorithm : 'RS256'}
        );

        
        res.cookie('token', mytoken, {
            httpOnly: true,
            // secure: true, // uncomment in production
            // sameSite: 'Strict'
        });
        
        // ✅ Finally, clean up OTP and timeout after a successful password reset
        LocalOTP.delete(email);
        
        const existingTimeout = LocalTimeouts.get(email);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            LocalTimeouts.delete(email);
        }

        return res.status(200).json({
            success: true,
            msg: "Password updated successfully",
            detail: data,
            token: mytoken,
            
          
        });
        
    } catch(error) {
        console.error(error);
        return res.status(500).json({
            msg: "Internal Server Error",
            success: false
        });
    }
};



export const updateProfile = async (req,res)=>{

  
  try{


    const { userRole , userDescription , email } = req.body;

     if(!email) return res.status(400).json({msg : "email not exist" , success : false});
    if(!userRole && !userDescription ) return res.status(400).json({msg : "no detail provided" , success : false});

    const update = await Users.findOneAndUpdate({email : email} , {$push : {UserKeyWord : userRole } , $set : {UserDescription : userDescription} } , {new : true})



    if(!update) return res.status(400).json({msg : "No User Exist with this email" , success : false });

    return res.status(200).json({
      msg : "Details for Profile is Updated" , success : true , data : update
    })

  }catch(error){

console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
      success : false
    });

  }
}





export const UpdateUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { userId, UserDescription, UserKeyWord, accountType } = req.body;

    if (!userId) {
      await session.abortTransaction();
      return res.status(400).json({ msg: "Bad request - Missing userId", success: false });
    }

    const setFields = {};
    if (UserDescription !== undefined) setFields.UserDescription = UserDescription || "";
    if (UserKeyWord !== undefined) setFields.UserKeyWord = UserKeyWord || [];
    if (accountType !== undefined) setFields.accountType = accountType;

    if (UserDescription !== undefined || UserKeyWord !== undefined) {
      const desc = UserDescription || "";
      const kw = Array.isArray(UserKeyWord) ? UserKeyWord.join(",") : (UserKeyWord || "");
      const response = await generateEmbedding(desc + kw);
      if (response.success) {
        setFields.embeddings = response.embeddings;
      } else {
        throw new Error(response.msg || "Embedding generation failed");
      }
    }

    const user = await Users.findOneAndUpdate(
      { _id: userId },
      { $set: setFields },
      { new: true, session }
    );

    if (!user) {
      await session.abortTransaction();
      return res.status(400).json({ msg: "User not found or updated", success: false });
    }

    // await UserEmbedding.create(
    //   [
    //     {
    //       userId: user._id,
    //       embeddings: response.embeddings,
    //     },
    //   ],
    //   { session }
    // );

    await session.commitTransaction();

    return res.status(200).json({ msg: "User Updated", success: true , result : user  });

  } catch (error) {
    console.error("UpdateUser Error:", error);
    await session.abortTransaction();
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};




export const UserInfoSearch = async (req,res)=>{
  try{
    const {userId} = req.query;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({msg : 'Invalid userId' , success : false});
    }

    const FindUser = await Users.findById(userId).lean();
    if (!FindUser) {
      return res.status(404).json({msg : 'User not found' , success : false});
    }

    // Dynamic resolution of Friend model to prevent circular dependencies
    const FriendModel = mongoose.model("Friend");

    const followersCount = await FriendModel.countDocuments({
      $or: [
        { user1: userId, user2Following: true },
        { user2: userId, user1Following: true }
      ]
    });

    const followingCount = await FriendModel.countDocuments({
      $or: [
        { user1: userId, user1Following: true },
        { user2: userId, user2Following: true }
      ]
    });

    const userObj = {
      ...FindUser,
      followersCount,
      followingCount,
      createdAt: new mongoose.Types.ObjectId(userId).getTimestamp()
    };

    return res.status(200).json({msg : 'Fetched' , success : true , user : userObj});

  }catch(error){
    console.error(error)
    return res.status(500).json({msg : 'Internal Server Error' , success : false});
  }
}