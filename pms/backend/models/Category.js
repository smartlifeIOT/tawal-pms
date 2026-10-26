const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    program: {
      type: String,
      trim: true,
      default: "",
    },
    programBudget: {
      type: Number,
      default: 0,
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

CategorySchema.index({ program: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Category", CategorySchema);
