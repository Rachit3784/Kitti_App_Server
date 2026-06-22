import mongoose from "mongoose";

const { Schema } = mongoose;

const UserActivitySchema = new Schema(
  {
    /* =========================
       USER REFERENCE
    ========================= */
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true, // one activity doc per user
    },

    /* =========================
       LOCATION SIGNALS
    ========================= */
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: "2dsphere",
      },
      city: String,
      state: String,
      country: String,
      updatedAt: Date,
    },

    /* =========================
       SEARCH ACTIVITY
    ========================= */
    searches: [
      {
        text: {
          type: String,
          trim: true,
        },
        count: {
          type: Number,
          default: 1,
        },
        lastSearchedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /* =========================
       PRODUCT INTERACTIONS
    ========================= */
    viewedProducts: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          index: true,
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    likedProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    cartProducts: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          default: 1,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /* =========================
       CATEGORY & BRAND SIGNALS
    ========================= */
    categoryAffinity: [
      {
        categoryId: {
          type: Schema.Types.ObjectId,
          ref: "Category",
        },
        score: {
          type: Number,
          default: 1,
        },
        lastInteractedAt: Date,
      },
    ],

    // brandAffinity: [
    //   {
    //     brandId: {
    //       type: Schema.Types.ObjectId,
    //       ref: "Brand",
    //     },
    //     score: {
    //       type: Number,
    //       default: 1,
    //     },
    //     lastInteractedAt: Date,
    //   },
    // ],

    /* =========================
       FEED MEMORY (IMPORTANT)
    ========================= */
    feedMemory: {
      shownProductIds: [
        {
          type: Schema.Types.ObjectId,
          ref: "Product",
        },
      ],
      shownBlockTypes: [
        {
          type: String, 
        },
      ],
      lastFeedAt: Date,
    },

  

    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   INDEX OPTIMIZATION
========================= */
UserActivitySchema.index({ userId: 1 });
UserActivitySchema.index({ "location.coordinates": "2dsphere" });

export default mongoose.model("UserActivity", UserActivitySchema);
