import mongoose from "mongoose";

// Generic Poll Option Schema
const PollOptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  votes: { type: Number, default: 0 }
});

// Fully Generalized Item Schema (For Carousel, StackCard, etc.)
const GenericItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, default: "" },       
  subtitle: { type: String, default: "" },    
  meta: { type: String, default: "" },        
  movieTitle: { type: String, default: "" },
  genreTag: { type: String, default: "" },
  releaseYear: { type: String, default: "" },
  bannerUrl: { type: String, default: "" }    
});

// Form Inputs Schema
const FormInputSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: "" }
});

const PostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User"
  },
  
  // Clean Setup: Only saving the reference of the community group
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Groups",
    default: null
  },
  
  postedInGroup: { type: Boolean, default: false },
  isSponsored: { type: Boolean, default: false },
  visibility: { type: String, enum: ["public", "private"], default: "public" },
  
  title: { type: String, required: true },
  description: { type: String, default: "" },
  
  // Counters
  upvoteCount: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
  downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
  
  // Flexible Dynamic Data Block
  data: {
    type: { type: String, required: true },
    section: { type: String, required: true }, 
    payload: {
      videoUrl: { type: String, default: "" },
      pdfUrl: { type: String, default: "" },
      audioUrl: { type: String, default: "" },
      audioImgUrl: { type: String, default: "" },
      bannerUrl: { type: String, default: "" },
      logoUrl: { type: String, default: "" },
      jobTitle: { type: String, default: "" },
      companyName: { type: String, default: "" },
      eligibility: { type: String, default: "" },
      
      brandName: { type: String, default: "" }, 
      headerTitle: { type: String, default: "" }, 
      subHeader: { type: String, default: "" },  

      buttonText: { type: String, default: "" },
      targetUrl: { type: String, default: "" },
      
      images: [{ type: String, default: [] }],
      points: [{ type: String, default: [] }], 
      links: [{ type: String, default: [] }],
      
      inputs: [FormInputSchema],
      carouselData: [GenericItemSchema], 
      
      pollDetails: {
        totalVotes: { type: Number, default: 0 },
        userVotedOptionId: { type: String, default: null },
        options: [PollOptionSchema]
      }
    }
  }
}, { timestamps: true });

export const PostModel = mongoose.model("Postss", PostSchema);