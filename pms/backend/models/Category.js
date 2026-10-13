const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },
    budget: {
      type: Number,
      default: 0,
      min: [0, "Budget must be at least 0"],
    },
    scopes: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Category", CategorySchema);
