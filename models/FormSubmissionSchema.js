import mongoose from "mongoose";

const FormSubmissionSchema = new mongoose.Schema({
  formPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Postss",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  answers: {
    type: Map,
    of: String,
    required: true
  }
}, { timestamps: true });

// Dynamic indexes: enforce a user can only submit their details once per Form Post!
FormSubmissionSchema.index({ formPostId: 1, userId: 1 }, { unique: true });

export const FormSubmissionModel = mongoose.model("FormSubmissions", FormSubmissionSchema);
