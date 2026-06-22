import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "ownerType"
  },

  ownerType: {
    type: String,
    required: true,
    enum: ["Users", "Stores", "Admin"]
  },

  name: { type: String, default: "" },

  addressType: {
    type: String,
    enum: ["home", "work", "others"],
    required: true
  },

  landmark: { type: String, default: "" },
  addressLine1: { type: String, default: "" },
  addressLine2: { type: String, default: "" },

  state: String,
  district: String,
  city: String,
  country: String,
  pincode: String,

  mobileNo: { type: [String], default: [] },

  /** 🔥 GEO LOCATION */
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  }

}, { timestamps: true });

AddressSchema.index({ location: "2dsphere" });

export const AddressModel = mongoose.model("Address", AddressSchema);
