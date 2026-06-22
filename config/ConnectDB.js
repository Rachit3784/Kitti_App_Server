import mongoose from "mongoose";


export const ConnectDB = async (Dburl)=>{
       try{
        await  mongoose.connect(Dburl).then(()=>{
            console.log("Successfully Connected with DB");
        })
       }catch(error){
        console.log("Error Connecting with database" , error);
       }
}
