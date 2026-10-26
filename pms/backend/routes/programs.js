const express = require("express");
const router = express.Router();
const Program = require("../models/Program");
const Category = require("../models/Category");
const Project = require("../models/Project");
const { protect, authorize } = require("../middleware/auth");

// Get all programs (role-based)
router.get("/", protect, async (req, res) => {
  try {
    const { role, email } = req.user;
    const { search } = req.query;
    const fullAccessRoles = ["Admin", "Manager", "PM"];

    let query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    let programs;
    if (fullAccessRoles.includes(role)) {
      programs = await Program.find(query).sort({ name: 1 }).lean();
    } else {
      // Find projects where user is team member
      const userProjects = await Project.find({ teamMembers: email }).select(
        "program"
      );
      const userProgramNames = [
        ...new Set(userProjects.map((p) => p.program).filter(Boolean)),
      ];

      if (search) {
        query = {
          $and: [
            { name: { $regex: search, $options: "i" } },
            { name: { $in: userProgramNames } },
          ],
        };
      } else {
        query.name = { $in: userProgramNames };
      }

      programs = await Program.find(query).sort({ name: 1 }).lean();
    }

    // Attach project count for each program
    const programNames = programs.map((p) => p.name);
    const countAgg = await Project.aggregate([
      { $match: { program: { $in: programNames } } },
      { $group: { _id: "$program", count: { $sum: 1 } } },
    ]);
    const countMap = new Map();
    countAgg.forEach((c) => countMap.set(c._id, c.count));

    const programsWithCounts = programs.map((p) => ({
      ...p,
      projectCount: countMap.get(p.name) || 0,
    }));

    res.json(programsWithCounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single program by ID
router.get("/:id", protect, async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }
    const projectCount = await Project.countDocuments({ program: program.name });
    res.json({ ...program.toObject(), projectCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new program - Admin, Manager
router.post("/", protect, authorize("Admin", "Manager"), async (req, res) => {
  try {
    const { name, budget = 0, description = "" } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Program name is required" });
    }
    if (budget < 0) {
      return res.status(400).json({ message: "Budget must be at least 0" });
    }

    const trimmedName = name.trim();
    const existing = await Program.findOne({
      name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (existing) {
      return res.status(400).json({ message: "Program with this name already exists" });
    }

    const program = await Program.create({
      name: trimmedName,
      budget: Number(budget) || 0,
      description: String(description || "").trim(),
    });

    res.status(201).json(program);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a program - Admin, Manager
router.put("/:id", protect, authorize("Admin", "Manager"), async (req, res) => {
  try {
    const { name, budget, description } = req.body;
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const oldName = program.name;

    if (name && name.trim() && name.trim() !== oldName) {
      const trimmedName = name.trim();
      const existing = await Program.findOne({
        name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        _id: { $ne: program._id },
      });
      if (existing) {
        return res
          .status(400)
          .json({ message: "Another program with this name already exists" });
      }
      program.name = trimmedName;

      // Cascade update projects with the old program name
      await Project.updateMany(
        { program: oldName },
        { $set: { program: trimmedName } }
      );

      // Cascade update categories with the old program name
      await Category.updateMany(
        { program: oldName },
        { $set: { program: trimmedName } }
      );
    }

    if (budget !== undefined) {
      if (Number(budget) < 0) {
        return res.status(400).json({ message: "Budget must be at least 0" });
      }
      program.budget = Number(budget);

      // Cascade update categories programBudget
      await Category.updateMany(
        { program: program.name },
        { $set: { programBudget: program.budget } }
      );
    }

    if (description !== undefined) {
      program.description = String(description).trim();
    }

    await program.save();
    res.json(program);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a program - Admin only
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    // Unset program on associated projects and categories
    await Project.updateMany({ program: program.name }, { $set: { program: "" } });
    await Category.updateMany({ program: program.name }, { $set: { program: "" } });

    await program.deleteOne();
    res.json({ message: "Program removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
