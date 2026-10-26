const mongoose = require("mongoose");

const ProgramSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Program name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    budget: {
      type: Number,
      default: 0,
      min: [0, "Budget must be at least 0"],
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Program || mongoose.model("Program", ProgramSchema);
