const mongoose = require("mongoose");

const doubtSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },

    answer: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Index for faster sorting by posting date
doubtSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Doubt", doubtSchema);
