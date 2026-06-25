import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    fullname: {
        type: String,
        required: true
    },
    gender : {
        type : String,
        enum : ["male" , "female" , "others"],
        required : true
    },
    
    MobileNum : {
        type : String,
        default : ''
    },

    embeddings : {
        type : [Number],
        require : true,
    },
    
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },

    
    profile: {
        type: String,
        default: ""
    },

    randomNum: {
        type: String,
        required: true
    },
    accountType : {
        type : String,
        default : 'Private',
        enum : ['Private','Public']
    },
    LikedPost : [{
        type : mongoose.Schema.Types.ObjectId,
        default : null,
        ref : "Products"
    }],

    SharedPost : [{
        type : mongoose.Schema.Types.ObjectId,
        default : null,
        ref : "Products"
    }],
    CommentedPost : [{
        type : mongoose.Schema.Types.ObjectId,
        default : null,
        ref : "Products"
    }],


    productShared : [{
        type : mongoose.Schema.Types.ObjectId,
        default : null,
        ref : "Products"
    }],


    SearchQuery : [
        {
            type : String , 
            default : "" , 
            
        }
    ],
    UserKeyWord : [{
        type : String ,
        
        default : ""
    }],
    UserDescription : {
        type : String,
         
        default : ""
    },
    AddressId : {
        type : [mongoose.Schema.Types.ObjectId],
        default : []
    }
    

});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const Users = mongoose.model("User", UserSchema);
