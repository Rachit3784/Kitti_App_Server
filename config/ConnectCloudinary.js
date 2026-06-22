import {v2 as cloudinary} from "cloudinary"
import { Cloudinary_API_Key, Cloudinary_Name, Cloudinary_Secret } from "./ENV_Variable.js";


 cloudinary.config({
    api_key : Cloudinary_API_Key,
    api_secret : Cloudinary_Secret,
    cloud_name : Cloudinary_Name
});




export const uploadBuffer = (buffer , option = {})=>{
    return new Promise((resolve,reject)=>{
        const stream = cloudinary.uploader.upload_stream(option,(error,result)=>{
            if(error) reject(error)
                else resolve(result)
        });

        stream.end(buffer);
    })
}




export const deleteFromCloudinary = async (imageUrl) => {
  try {
    // Extract public ID from full Cloudinary URL
    const parts = imageUrl.split("/upload/")[1];
    const publicId = parts.split(".")[0]; // removes file extension (.jpg, .png, etc.)

    await cloudinary.uploader.destroy(publicId , { invalidate: true });
    console.log("Deleted from Cloudinary:", imageUrl);
    
    return true;
  } catch (err) {
    console.log("Cloudinary delete failed:", imageUrl, err.message);
    return false;
  }
};


export {cloudinary}

