import mongoose from "mongoose"

const ChatSchema = new mongoose.Schema({
    FriendId : {
        type : String,
        require : true,
         ref: "Friend",
    },
    SenderId : {
        type : mongoose.Schema.Types.ObjectId,
        require : true,
         ref: "User", 
    },
    RecieverId : {
        type : mongoose.Schema.Types.ObjectId,
        require : true,
         ref: "User",
    },
    media : {
        dataType : {
            type : String,
            enum : ["Video","Audio","Text","Post","Image"],
            require : true
        },
        Text : {
            type : String,
            default : ""
        },
        ImageUrl : {
            type : String,
            default : ""
        },
        VideoUrl : {
            type : String,
            default : ""
        },
        AudioUrl : {
            type : String,
            default : ""
        },
        PostId : {
            type : mongoose.Schema.Types.ObjectId,
            ref: "Postss",
            default : null,
        }

    },
    status : {
        type : String ,
        enum : ["seen","delivered"]
    }

}, { timestamps: true })


export const Chats = mongoose.model("Chats",ChatSchema);

