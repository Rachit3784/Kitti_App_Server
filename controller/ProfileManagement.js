import { Users } from "../models/UserSchema.js";
import { deleteFromCloudinary, uploadBuffer } from "../config/ConnectCloudinary.js";

export const ChangeProfile  =  async (req,res)=>{
    try{
        const {customerId} = req.body;

        if(!customerId) return res.status(400).json({msg : "Details is missing" , success : false});

            const coverFile =  Array.isArray(req.files?.profilePhoto) && req.files.profilePhoto.length > 0
        ? req.files.profilePhoto[0]
        : null;

    if (!coverFile) {
      return res.status(400).json({
        success: false,
        msg: "Cover image file missing in request.",
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const baseName = coverFile.originalname.split(".")[0];
    const publicId = `profilePhoto_${customerId}_${baseName}_${dateStr}_${Math.random()}`;
    
    const uploadRes = await uploadBuffer(coverFile.buffer, {
      folder: `profilePhoto/${customerId}`,
      public_id: publicId,
    });

    if (!uploadRes?.secure_url) {
      return res.status(400).json({
        success: false,
        msg: "Failed to upload image to Cloudinary.",
      });
    }
    
   
       const User = await Users.findByIdAndUpdate( customerId ,  { $set : {
profile: uploadRes.secure_url,
       }} , {new : true})

       
       if(!User){

          await deleteFromCloudinary(publicId)
        return res.status(400).json({msg : "Failed To Upload Product" , success : false});
       }

       

        

         
         if(User){
            
return res.status(200).json({msg : "Profile Added Successfully" , success : true , ProfileURL : User.profile});

         }
         
         
    }catch(error){
        console.error(error)
        return res.status(500).json({msg : "Internal Server Error" , success : false});
    }
}

export const ChangeBio = async (req,res)=>{
   try{
 const {name , mobileNum , customerId} = req.body;
    if(!name || !mobileNum) return res.status(400).json({msg : 'Details is missing' , success : false})

        const updateUserInfo = await Users.findByIdAndUpdate(customerId , {$set : {fullname : name ,MobileNum : mobileNum } } , {new : true});

        if(!updateUserInfo) return res.status(400).json({msg : 'Failed To Fetch' , success : false});

        return res.status(200).json({msg : 'Changed the info' , success : true ,fullname : updateUserInfo.fullname ,mobileNum : updateUserInfo.MobileNum});

   }catch(error){
  console.error(error)
 return res.status(500).json({msg : 'Internal server Error' , success : false});
   }
}