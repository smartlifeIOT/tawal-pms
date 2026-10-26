const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const Program = require("../models/Program");
const Project = require("../models/Project");
const { protect, authorize } = require("../middleware/auth");

// Get categories based on role
router.get("/", protect, async (req, res) => {
  try {
    const { role, email } = req.user;
    const { search, program } = req.query;
    const fullAccessRoles = ["Admin", "Manager", "PM"];

    let query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    if (program && program !== "All Programs") {
      query.program = program;
    }

    let categories;
    if (fullAccessRoles.includes(role)) {
      categories = await Category.find(query).sort({ name: 1 });
    } else {
      // Find projects where the user is a team member
      const userProjects = await Project.find({ teamMembers: email }).select(
        "category",
      );
      const userCategoryNames = [
        ...new Set(userProjects.map((p) => p.category)),
      ];

      const andClauses = [{ name: { $in: userCategoryNames } }];
      if (search) {
        andClauses.push({ name: { $regex: search, $options: "i" } });
      }
      if (program && program !== "All Programs") {
        andClauses.push({ program });
      }

      query = { $and: andClauses };
      categories = await Category.find(query).sort({ name: 1 });
    }

    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new category - admin only
router.post("/", protect, authorize("Admin"), async (req, res) => {
  try {
    const { name, budget = 0, program } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }
    if (!program || !program.trim()) {
      return res.status(400).json({ message: "Program is required" });
    }

    const catBudget = Number(budget) || 0;
    if (catBudget < 0) {
      return res.status(400).json({ message: "Budget must be at least 0" });
    }

    const trimmedProgram = program.trim();
    const prog = await Program.findOne({
      name: new RegExp(`^${trimmedProgram.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (!prog) {
      return res.status(404).json({ message: "Selected program does not exist" });
    }

    // Validation: Category budget cannot exceed program budget
    if (catBudget > prog.budget) {
      return res.status(400).json({
        message: `Category budget (₡${catBudget.toLocaleString()}) cannot exceed program budget of ₡${prog.budget.toLocaleString()}`,
      });
    }

    // Validation: Category budget cannot exceed remaining program budget (budget minus projects allocated under this program)
    const progProjects = await Project.find({ program: prog.name });
    const totalAllocated = progProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const remainingBudget = Math.max(0, prog.budget - totalAllocated);
    if (catBudget > remainingBudget) {
      return res.status(400).json({
        message: `Category budget (₡${catBudget.toLocaleString()}) cannot exceed remaining program budget of ₡${remainingBudget.toLocaleString()} (Total: ₡${prog.budget.toLocaleString()}, Projects Allocated: ₡${totalAllocated.toLocaleString()})`,
      });
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({
      program: prog.name,
      name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (existing) {
      return res.status(400).json({
        message: `Category "${trimmedName}" already exists under program "${prog.name}"`,
      });
    }

    const category = await Category.create({
      name: trimmedName,
      program: prog.name,
      programBudget: prog.budget,
      budget: catBudget,
    });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a category - admin only
router.put("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const { name, budget, program } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    let targetProgName = category.program;
    let targetProgBudget = category.programBudget;

    if (program && program.trim() && program.trim() !== category.program) {
      const trimmedProg = program.trim();
      const prog = await Program.findOne({
        name: new RegExp(`^${trimmedProg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });
      if (!prog) {
        return res.status(404).json({ message: "Selected program does not exist" });
      }
      targetProgName = prog.name;
      targetProgBudget = prog.budget;
    } else if (!targetProgBudget && targetProgName) {
      const prog = await Program.findOne({ name: targetProgName });
      if (prog) targetProgBudget = prog.budget;
    }

    const newCatBudget = budget !== undefined ? Number(budget) : category.budget;
    if (newCatBudget < 0) {
      return res.status(400).json({ message: "Budget must be at least 0" });
    }

    if (targetProgBudget !== undefined && targetProgBudget > 0) {
      if (newCatBudget > targetProgBudget) {
        return res.status(400).json({
          message: `Category budget (₡${newCatBudget.toLocaleString()}) cannot exceed program budget of ₡${targetProgBudget.toLocaleString()}`,
        });
      }

      // Validation: Category budget cannot exceed remaining program budget (excluding other projects under this program)
      const otherProjects = await Project.find({
        program: targetProgName,
        category: { $ne: category.name },
      });
      const otherAllocated = otherProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
      const remainingBudget = Math.max(0, targetProgBudget - otherAllocated);
      if (newCatBudget > remainingBudget) {
        return res.status(400).json({
          message: `Category budget (₡${newCatBudget.toLocaleString()}) cannot exceed remaining program budget of ₡${remainingBudget.toLocaleString()} (Total: ₡${targetProgBudget.toLocaleString()}, Other Projects Allocated: ₡${otherAllocated.toLocaleString()})`,
        });
      }
    }

    const oldName = category.name;
    if (name && name.trim()) {
      const trimmedName = name.trim();
      const existing = await Category.findOne({
        program: targetProgName,
        name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        _id: { $ne: category._id },
      });
      if (existing) {
        return res.status(400).json({
          message: `Another category with this name already exists in program "${targetProgName}"`,
        });
      }
      category.name = trimmedName;

      // Cascade update projects with the old category name
      if (oldName !== trimmedName) {
        await Project.updateMany(
          { category: oldName },
          { $set: { category: trimmedName } },
        );
      }
    }

    // Cascade update projects if program changed
    if (targetProgName && category.program !== targetProgName) {
      category.program = targetProgName;
      category.programBudget = targetProgBudget;
      await Project.updateMany(
        { category: category.name },
        { $set: { program: targetProgName } },
      );
    } else {
      category.programBudget = targetProgBudget;
    }

    category.budget = newCatBudget;
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a category - admin only
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    await category.deleteOne();
    res.json({ message: "Category removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a scope to a category - admin only
router.post("/:id/scopes", protect, authorize("Admin"), async (req, res) => {
  try {
    const { scope } = req.body;
    if (!scope || !scope.trim())
      return res.status(400).json({ message: "Scope name is required" });

    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    const scopeTrimmed = scope.trim();

    // Check for duplicate (case-insensitive)
    const exists = category.scopes.some(
      (s) => s.toLowerCase() === scopeTrimmed.toLowerCase()
    );
    if (exists)
      return res
        .status(400)
        .json({ message: `Scope "${scopeTrimmed}" already exists in this category` });

    category.scopes.push(scopeTrimmed);
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove a scope from a category - admin only
router.delete(
  "/:id/scopes/:scopeName",
  protect,
  authorize("Admin"),
  async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category)
        return res.status(404).json({ message: "Category not found" });

      const scopeName = decodeURIComponent(req.params.scopeName);
      category.scopes = category.scopes.filter(
        (s) => s.toLowerCase() !== scopeName.toLowerCase()
      );
      await category.save();
      res.json(category);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
