import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        required : true,
        ref : "User"
    },
    type : {
        type  : String,
        enum : ['text','gallery','video','audio'],
        required : true
    },
    title : {
        type : String,
        required : true
    },
    description : {
        type : String ,
        default : ""
    },
    upvotes : {
        type : Number,
        default : 0
    },
    comments : {
        type : Number,
        default : 0
    },
    shares : {
        type : Number,
        default : 0
    },
    upvotedBy : {
        type : [mongoose.Schema.Types.ObjectId],
        ref : "User",
        default : []
    },
    downvotedBy : {
        type : [mongoose.Schema.Types.ObjectId],
        ref : "User",
        default : []
    },
    mediaUrls : {
        type : [String],
        default : []
    },
    videoUrl : {
        type : [String],
        default : []
    },
    audioName : {
        type : String,
        default : ""
    },
    audioUrl :{
        type : [String],
        default : []
    },
}, { timestamps: true })

export const PostModel = mongoose.model("Posts",PostSchema);