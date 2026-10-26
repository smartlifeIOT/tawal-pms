const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const Category = require("../models/Category");
const Program = require("../models/Program");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// Get all projects (role-based)
router.get("/", protect, async (req, res) => {
  try {
    const { role, email } = req.user;
    const {
      search,
      category,
      program,
      status,
      priority,
      region,
      city,
      page,
      limit,
    } = req.query;
    const fullAccessRoles = ["Admin", "Manager", "PM"];

    let query = {};
    if (!fullAccessRoles.includes(role)) {
      // Restricted roles: only projects where the user's email is in teamMembersss
      query.teamMembers = email;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { siteId: { $regex: search, $options: "i" } },
        { tawalId: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "All Categories") {
      query.category = category;
    }
    if (program && program !== "All Programs") {
      query.program = program;
    }
    if (status && status !== "All Statuses") {
      query.status = status;
    }
    if (priority && priority !== "All Priorities") {
      query.priority = priority;
    }
    if (region && region.trim() !== "") {
      query.region = region.trim();
    }
    if (city && city.trim() !== "") {
      query.city = city.trim();
    }

    const isAll = String(limit).toLowerCase() === "all";
    const pageNum = isAll ? 1 : parseInt(page) || 1;
    const limitNum = isAll ? 0 : parseInt(limit) || 20;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;

    const total = await Project.countDocuments(query);
    let projectsQuery = Project.find(query).sort({ createdAt: -1 });
    if (limitNum > 0) {
      projectsQuery = projectsQuery.skip(skip).limit(limitNum);
    }
    const projects = await projectsQuery;

    res.status(200).json({
      meta: {
        total,
        page: pageNum,
        limit: limitNum > 0 ? limitNum : total,
        totalPages: limitNum > 0 ? Math.ceil(total / limitNum) || 1 : 1,
      },
      data: projects,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Handler: Get all projects without authentication (public access)
const getPublicProjects = async (req, res) => {
  try {
    const { search, category, program, status, priority, region, city } =
      req.query;

    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { siteId: { $regex: search, $options: "i" } },
        { tawalId: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "All Categories") {
      query.category = category;
    }
    if (program && program !== "All Programs") {
      query.program = program;
    }
    if (status && status !== "All Statuses") {
      query.status = status;
    }
    if (priority && priority !== "All Priorities") {
      query.priority = priority;
    }
    if (region && region.trim() !== "") {
      query.region = { $regex: region, $options: "i" };
    }
    if (city && city.trim() !== "") {
      query.city = { $regex: city, $options: "i" };
    }

    const projects = await Project.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      meta: {
        total: projects.length,
      },
      data: projects,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

router.get("/public/projects", getPublicProjects);
router.get("/public", getPublicProjects);

// Get projects by category (role-based)
router.get("/category/:category", protect, async (req, res) => {
  try {
    const { role, email } = req.user;
    const { page, limit } = req.query;
    const fullAccessRoles = ["Admin", "Manager", "PM"];

    let query = { category: req.params.category };
    if (!fullAccessRoles.includes(role)) {
      query.teamMembers = email;
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: projects,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get projects by program (role-based)
router.get("/program/:program", protect, async (req, res) => {
  try {
    const { role, email } = req.user;
    const { page, limit, category, status, priority, search } = req.query;
    const fullAccessRoles = ["Admin", "Manager", "PM"];

    let query = { program: req.params.program };
    if (!fullAccessRoles.includes(role)) {
      query.teamMembers = email;
    }

    if (category && category !== "All Categories") {
      query.category = category;
    }
    if (status && status !== "All Statuses") {
      query.status = status;
    }
    if (priority && priority !== "All Priorities") {
      query.priority = priority;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { siteId: { $regex: search, $options: "i" } },
        { tawalId: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      data: projects,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Stats endpoint (must be before ":id" route)
router.get("/stats", protect, async (req, res) => {
  try {
    const { role, email } = req.user;
    const fullAccessRoles = ["Admin", "Manager", "PM"];

    // Build base filter — restricted users only see their assigned projects
    const baseFilter = fullAccessRoles.includes(role)
      ? {}
      : { teamMembers: email };

    const totalProjects = await Project.countDocuments(baseFilter);
    const inProgressCount = await Project.countDocuments({
      ...baseFilter,
      status: { $in: ["Mapping", "Installation", "Integration"] },
    });
    const completedCount = await Project.countDocuments({
      ...baseFilter,
      status: "Completed",
    });
    const criticalCount = await Project.countDocuments({
      ...baseFilter,
      priority: "Critical",
    });
    const totalBudgetAgg = await Project.aggregate([
      { $match: baseFilter },
      { $group: { _id: null, totalBudget: { $sum: "$budget" } } },
    ]);
    const totalBudget = totalBudgetAgg[0] ? totalBudgetAgg[0].totalBudget : 0;
    const categoryData = await Project.aggregate([
      { $match: baseFilter },
      { $group: { _id: "$category", value: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: 1 } },
    ]);
    const statusData = await Project.aggregate([
      { $match: baseFilter },
      { $group: { _id: "$status", value: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: 1 } },
    ]);
    const budgetData = await Project.find(baseFilter)
      .sort({ budget: -1 })
      .limit(5)
      .select("title budget spent")
      .lean();
    res.status(200).json({
      totalProjects,
      inProgressCount,
      completedCount,
      criticalCount,
      totalBudget,
      categoryData,
      statusData,
      budgetData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Filters endpoint: distinct regions & cities (must be before /:id route)
router.get("/filters", protect, async (req, res) => {
  try {
    const { role, email } = req.user;
    const fullAccessRoles = ["Admin", "Manager", "PM"];
    const baseFilter = fullAccessRoles.includes(role)
      ? {}
      : { teamMembers: email };

    const [regions, cities, programs] = await Promise.all([
      Project.distinct("region", {
        ...baseFilter,
        region: { $nin: [null, ""] },
      }),
      Project.distinct("city", { ...baseFilter, city: { $nin: [null, ""] } }),
      Project.distinct("program", {
        ...baseFilter,
        program: { $nin: [null, ""] },
      }),
    ]);

    res.status(200).json({
      regions: regions.filter(Boolean).sort(),
      cities: cities.filter(Boolean).sort(),
      programs: programs.filter(Boolean).sort(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single project
router.get("/:id", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const ErrorResponse = require("../utils/errorResponse");

// Bulk add projects (Admin, Manager only)
router.post(
  "/bulk",
  protect,
  authorize("Admin", "Manager"),
  async (req, res, next) => {
    try {
      let projects = req.body.projects ?? req.body;

      if (!Array.isArray(projects)) {
        return next(new ErrorResponse("Projects must be an array", 400));
      }

      if (projects.length === 0) {
        return next(new ErrorResponse("At least one project is required", 400));
      }

      const validatedProjects = [];

      // Pre-fetch all categories once for fast case-insensitive lookup
      const allCategories = await Category.find().lean();
      const categoryMap = new Map();
      allCategories.forEach((cat) => {
        categoryMap.set(cat.name.trim().toLowerCase(), cat);
      });

      // Pre-fetch all programs once for fast case-insensitive lookup
      const allPrograms = await Program.find().lean();
      const programMap = new Map();
      allPrograms.forEach((prog) => {
        programMap.set(prog.name.trim().toLowerCase(), prog);
      });

      // Fetch all existing user emails once for fast validation
      const existingUserEmails = new Set(
        (await User.find().select("email").lean()).map((u) =>
          u.email.toLowerCase(),
        ),
      );

      // Check for duplicate projects (same title AND category) within the uploaded batch
      const seenBatchKeys = new Set();
      const duplicateInBatch = [];

      // Track siteId and tawalId to prevent batch duplicate key errors
      const seenSiteIds = new Set();
      const seenTawalIds = new Set();

      for (const p of projects) {
        const title = (p.title || p.name || "").trim();
        const category = (p.category || "").trim();
        const siteId = (p.siteId || "").trim();
        const tawalId = (p.tawalId || "").trim();

        if (!title) continue;

        const key = `${title.toLowerCase()}:::${category.toLowerCase()}`;
        if (seenBatchKeys.has(key)) {
          duplicateInBatch.push(
            category ? `"${title}" (${category})` : `"${title}"`,
          );
        } else {
          seenBatchKeys.add(key);
        }

        if (siteId) {
          if (seenSiteIds.has(siteId.toLowerCase())) {
            return next(
              new ErrorResponse(
                `Duplicate Site ID "${siteId}" found in uploaded batch`,
                400,
              ),
            );
          }
          seenSiteIds.add(siteId.toLowerCase());
        }

        if (tawalId) {
          if (seenTawalIds.has(tawalId.toLowerCase())) {
            return next(
              new ErrorResponse(
                `Duplicate Tawal ID "${tawalId}" found in uploaded batch`,
                400,
              ),
            );
          }
          seenTawalIds.add(tawalId.toLowerCase());
        }
      }

      if (duplicateInBatch.length > 0) {
        const uniqueDups = [...new Set(duplicateInBatch)];
        return next(
          new ErrorResponse(
            `Duplicate project(s) under the same category found in the uploaded file: ${uniqueDups.join(", ")}`,
            400,
          ),
        );
      }

      // Check for projects that already exist with the same title AND category in the database
      const dbCheckConditions = projects
        .map((p) => {
          const title = (p.title || p.name || "").trim();
          const category = (p.category || "").trim();
          if (!title) return null;

          const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const condition = {
            title: new RegExp(`^${escapedTitle}$`, "i"),
          };
          if (category) {
            const escapedCat = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            condition.category = new RegExp(`^${escapedCat}$`, "i");
          }
          return condition;
        })
        .filter(Boolean);

      if (dbCheckConditions.length > 0) {
        const existingProjects = await Project.find({
          $or: dbCheckConditions,
        })
          .select("title category")
          .lean();

        if (existingProjects.length > 0) {
          const existingFormatted = existingProjects
            .map((p) =>
              p.category ? `"${p.title}" (${p.category})` : `"${p.title}"`,
            )
            .join(", ");
          return next(
            new ErrorResponse(
              `The following project(s) already exist under the same category in the system: ${existingFormatted}`,
              400,
            ),
          );
        }
      }

      // Check if siteId or tawalId already exist in database
      if (seenSiteIds.size > 0) {
        const siteRegexes = Array.from(seenSiteIds).map(
          (s) =>
            new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        );
        const existingSites = await Project.find({
          siteId: { $in: siteRegexes },
        })
          .select("siteId")
          .lean();
        if (existingSites.length > 0) {
          const ids = existingSites.map((p) => p.siteId).join(", ");
          return next(
            new ErrorResponse(
              `Project(s) with Site ID(s) already exist in system: ${ids}`,
              400,
            ),
          );
        }
      }

      if (seenTawalIds.size > 0) {
        const tawalRegexes = Array.from(seenTawalIds).map(
          (s) =>
            new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        );
        const existingTawals = await Project.find({
          tawalId: { $in: tawalRegexes },
        })
          .select("tawalId")
          .lean();
        if (existingTawals.length > 0) {
          const ids = existingTawals.map((p) => p.tawalId).join(", ");
          return next(
            new ErrorResponse(
              `Project(s) with Tawal ID(s) already exist in system: ${ids}`,
              400,
            ),
          );
        }
      }

      // Validate each project
      for (let i = 0; i < projects.length; i++) {
        const projectData = { ...projects[i] };
        if (projectData.name && !projectData.title) {
          projectData.title = projectData.name;
        }

        const {
          program,
          category,
          projectScope = "",
          scope = "",
          budget = 0,
          spent = 0,
          teamMembers = [],
          teamLead,
        } = projectData;

        if (!projectData.title || String(projectData.title).trim() === "") {
          return next(
            new ErrorResponse(`Project at index ${i} requires a title`, 400),
          );
        }

        projectData.title = String(projectData.title).trim();

        // Validate Program if provided
        let targetProg = null;
        if (program && String(program).trim() !== "") {
          const progKey = String(program).trim().toLowerCase();
          targetProg = programMap.get(progKey);
          if (!targetProg) {
            const availableProgs = Array.from(programMap.values())
              .map((p) => p.name)
              .join(", ");
            return next(
              new ErrorResponse(
                `Project "${projectData.title}" (row ${i + 1}): Program "${program}" does not exist. Available programs: ${availableProgs || "None"}`,
                400,
              ),
            );
          }
          projectData.program = targetProg.name;
        }

        // Validate teamLead email exists in database
        if (typeof teamLead === "string" && teamLead.trim() !== "") {
          const teamLeadEmail = teamLead.trim().toLowerCase();
          if (!existingUserEmails.has(teamLeadEmail)) {
            return next(
              new ErrorResponse(
                `Project "${projectData.title}" has a team lead with an invalid user email: ${teamLead}`,
                400,
              ),
            );
          }
          projectData.teamLead = teamLead.trim();
        }

        // Validate teamMembers emails exist in database
        if (Array.isArray(teamMembers) && teamMembers.length > 0) {
          const invalidEmails = teamMembers.filter(
            (email) =>
              !existingUserEmails.has(String(email).trim().toLowerCase()),
          );
          if (invalidEmails.length > 0) {
            return next(
              new ErrorResponse(
                `Project "${projectData.title}" contains invalid user email(s): ${invalidEmails.join(", ")}`,
                400,
              ),
            );
          }
        }

        const scopeToUse = String(projectScope || scope || "").trim();

        if (category && String(category).trim() !== "") {
          const catKey = String(category).trim().toLowerCase();
          const cat = categoryMap.get(catKey);

          if (!cat) {
            const availableCats = Array.from(categoryMap.values())
              .map((c) => c.name)
              .join(", ");
            return next(
              new ErrorResponse(
                `Category "${category}" does not exist for project "${projectData.title}". Available categories: ${availableCats || "None"}`,
                400,
              ),
            );
          }

          projectData.category = cat.name;

          // If project did not specify program, auto-assign from category if category has one
          if (!projectData.program && cat.program) {
            projectData.program = cat.program;
            targetProg = programMap.get(cat.program.trim().toLowerCase());
          }

          // If both program and category are provided, verify category belongs to that program
          if (
            projectData.program &&
            cat.program &&
            cat.program.trim().toLowerCase() !== projectData.program.toLowerCase()
          ) {
            return next(
              new ErrorResponse(
                `Project "${projectData.title}" (row ${i + 1}): Category "${cat.name}" belongs to program "${cat.program}", but program "${projectData.program}" was specified in the file`,
                400,
              ),
            );
          }

          if (budget > cat.budget) {
            return next(
              new ErrorResponse(
                `Project "${projectData.title}" (row ${i + 1}) budget (${budget}) cannot exceed category budget (${cat.budget})`,
                400,
              ),
            );
          }

          if (spent > cat.budget) {
            return next(
              new ErrorResponse(
                `Project "${projectData.title}" (row ${i + 1}) spent (${spent}) cannot exceed category budget (${cat.budget})`,
                400,
              ),
            );
          }

          projectData.categoryBudget = cat.budget;

          // Scope Validation against Category scopes
          const catScopes = cat.scopes || [];
          if (scopeToUse !== "") {
            if (catScopes.length > 0) {
              const matchedScope = catScopes.find(
                (s) => s.trim().toLowerCase() === scopeToUse.toLowerCase(),
              );
              if (!matchedScope) {
                return next(
                  new ErrorResponse(
                    `Project "${projectData.title}": Scope "${scopeToUse}" is invalid for category "${cat.name}". Valid scope(s) under "${cat.name}": ${catScopes.join(", ")}`,
                    400,
                  ),
                );
              }
              projectData.projectScope = matchedScope;
            } else {
              projectData.projectScope = scopeToUse;
            }
          } else {
            projectData.projectScope = "";
          }
        } else if (scopeToUse !== "") {
          projectData.projectScope = scopeToUse;
        }

        // Program is required for every project
        if (!projectData.program || String(projectData.program).trim() === "") {
          const availableProgs = Array.from(programMap.values())
            .map((p) => p.name)
            .join(", ");
          return next(
            new ErrorResponse(
              `Project "${projectData.title}" (row ${i + 1}) requires a program. Please specify a valid program column. Available programs: ${availableProgs || "None"}`,
              400,
            ),
          );
        }

        // Validate budget against program budget
        if (targetProg && targetProg.budget > 0) {
          if (budget > targetProg.budget) {
            return next(
              new ErrorResponse(
                `Project "${projectData.title}" (row ${i + 1}) budget (${budget}) cannot exceed program budget (${targetProg.budget}) of program "${targetProg.name}"`,
                400,
              ),
            );
          }
          if (spent > targetProg.budget) {
            return next(
              new ErrorResponse(
                `Project "${projectData.title}" (row ${i + 1}) spent (${spent}) cannot exceed program budget (${targetProg.budget}) of program "${targetProg.name}"`,
                400,
              ),
            );
          }
        }

        validatedProjects.push(projectData);
      }

      if (validatedProjects.length === 0) {
        return res.status(400).json({
          message: "No valid projects to add",
        });
      }

      // Create all valid projects
      const createdProjects = await Project.insertMany(validatedProjects);

      res.status(201).json({
        message: `${createdProjects.length} project(s) created successfully`,
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
);

// BOQ processor → mark WO Request as "Requested" for every project whose
// Site ID matches an STC ID from the generated sheet, set the BOQ date and
// attach the generated workbook as the mapping file.
router.post(
  "/boq/wo-request",
  protect,
  authorize(
    "Admin",
    "Manager",
    "PM",
    "Logistics",
    "Coordinator",
    "Integration & Support",
    "Document Controller",
    "Closeout",
  ),
  async (req, res) => {
    try {
      const { stcIds, fileUrl, fileName, date } = req.body;

      if (!Array.isArray(stcIds) || stcIds.length === 0) {
        return res
          .status(400)
          .json({ message: "No STC IDs were provided from the BOQ sheet" });
      }
      if (!fileUrl || !String(fileUrl).trim()) {
        return res
          .status(400)
          .json({ message: "Mapping file is required to request a WO" });
      }

      const cleanIds = [
        ...new Set(stcIds.map((id) => String(id ?? "").trim()).filter(Boolean)),
      ];
      const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const idRegexes = cleanIds.map(
        (id) => new RegExp(`^${escape(id)}$`, "i"),
      );

      const boqDate = date ? new Date(date) : new Date();
      if (Number.isNaN(boqDate.getTime())) {
        return res.status(400).json({ message: "Invalid BOQ date" });
      }

      const projects = await Project.find({ siteId: { $in: idRegexes } });

      const updated = [];
      for (const project of projects) {
        project.set("mapping.woRequest.status", "Requested");
        project.set("mapping.woRequest.date", boqDate);
        project.set("mapping.woRequest.fileUrl", String(fileUrl).trim());
        project.set(
          "mapping.woRequest.fileName",
          String(fileName || "").trim() || String(fileUrl).split("/").pop(),
        );
        // save() (not updateMany) so the status-progression pre-save hook runs
        await project.save();
        updated.push({
          _id: project._id,
          title: project.title,
          siteId: project.siteId,
          status: project.status,
        });
      }

      const matchedIds = new Set(
        projects.map((p) =>
          String(p.siteId || "")
            .trim()
            .toLowerCase(),
        ),
      );
      const unmatched = cleanIds.filter(
        (id) => !matchedIds.has(id.toLowerCase()),
      );

      res.status(200).json({
        message: `WO Request set to "Requested" for ${updated.length} project(s)`,
        updatedCount: updated.length,
        updated,
        unmatched,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Import Issued WO sheet → bulk set WO Issuance to "Approved" with the
// WO Number and date from the sheet, matching projects by Site ID.
// Body: { rows: [{ siteId, woNumber, date: "YYYY-MM-DD" }] }
router.post(
  "/bulk/wo-issuance",
  protect,
  authorize("Admin", "Manager", "PM"),
  async (req, res) => {
    try {
      const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
      if (rows.length === 0) {
        return res
          .status(400)
          .json({ message: "The sheet has no rows to import" });
      }

      const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const invalid = [];
      const bySite = new Map(); // last row wins for duplicate Site IDs

      rows.forEach((row, i) => {
        const rowNo = row.rowNumber || i + 2;
        const siteId = String(row.siteId ?? "").trim();
        const woNumber = String(row.woNumber ?? "").trim();
        const date = row.date ? new Date(row.date) : null;

        if (!siteId)
          return invalid.push({ row: rowNo, reason: "Missing Site ID" });
        if (!woNumber)
          return invalid.push({
            row: rowNo,
            siteId,
            reason: "Missing WO Number",
          });
        if (row.date && Number.isNaN(date.getTime()))
          return invalid.push({ row: rowNo, siteId, reason: "Invalid date" });

        bySite.set(siteId.toLowerCase(), { siteId, woNumber, date });
      });

      const entries = [...bySite.values()];
      const projects = entries.length
        ? await Project.find({
            siteId: {
              $in: entries.map((e) => new RegExp(`^${escape(e.siteId)}$`, "i")),
            },
          })
        : [];

      const updated = [];
      const matched = new Set();
      for (const project of projects) {
        const key = String(project.siteId || "")
          .trim()
          .toLowerCase();
        const entry = bySite.get(key);
        if (!entry) continue;
        matched.add(key);

        project.set("mapping.woIssuance.status", "Approved");
        project.set("mapping.woIssuance.woNumber", entry.woNumber);
        if (entry.date) project.set("mapping.woIssuance.date", entry.date);
        // save() so the status-progression pre-save hook runs
        await project.save();

        updated.push({
          _id: project._id,
          title: project.title,
          siteId: project.siteId,
          woNumber: entry.woNumber,
          status: project.status,
        });
      }

      const notFound = entries
        .filter((e) => !matched.has(e.siteId.toLowerCase()))
        .map((e) => e.siteId);

      res.status(200).json({
        message: `WO Issuance updated for ${updated.length} project(s)`,
        updatedCount: updated.length,
        updated,
        notFound,
        invalid,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Import WO Mapping File (step 1): find projects whose Site ID or Tawal ID
// matches any of the IDs found in the uploaded sheet.
// Body: { ids: ["STC-100", "T-123", ...] }
router.post(
  "/lookup-sites",
  protect,
  authorize("Admin", "Manager", "PM"),
  async (req, res) => {
    try {
      const ids = [
        ...new Set(
          (Array.isArray(req.body.ids) ? req.body.ids : [])
            .map((id) => String(id ?? "").trim())
            .filter(Boolean),
        ),
      ];
      if (!ids.length) return res.status(200).json({ data: [] });

      const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regexes = ids.map((id) => new RegExp(`^${escape(id)}$`, "i"));

      const projects = await Project.find({
        $or: [{ siteId: { $in: regexes } }, { tawalId: { $in: regexes } }],
      })
        .select("title siteId tawalId mapping.woRequest status")
        .lean();

      res.status(200).json({
        data: projects.map((p) => ({
          _id: p._id,
          title: p.title,
          siteId: p.siteId || "",
          tawalId: p.tawalId || "",
          status: p.status,
          woRequestStatus: p.mapping?.woRequest?.status || "Pending",
          currentFileName: p.mapping?.woRequest?.fileName || "",
        })),
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Import WO Mapping File (step 2): each project gets its own split file.
// Sets WO Request → "Requested", the given date, and attaches the file.
// Body: { date: "YYYY-MM-DD", items: [{ projectId, fileUrl, fileName }] }
router.post(
  "/bulk/wo-request",
  protect,
  authorize("Admin", "Manager", "PM"),
  async (req, res) => {
    try {
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      if (!items.length) {
        return res.status(400).json({ message: "No sites to update" });
      }

      const date = req.body.date ? new Date(req.body.date) : new Date();
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date" });
      }

      const updated = [];
      const failed = [];
      for (const item of items) {
        const fileUrl = String(item.fileUrl || "").trim();
        if (!item.projectId || !fileUrl) {
          failed.push({
            projectId: item.projectId,
            reason: "Missing project or file",
          });
          continue;
        }
        try {
          const project = await Project.findById(item.projectId);
          if (!project) {
            failed.push({
              projectId: item.projectId,
              reason: "Project not found",
            });
            continue;
          }
          project.set("mapping.woRequest.status", "Requested");
          project.set("mapping.woRequest.date", date);
          project.set("mapping.woRequest.fileUrl", fileUrl);
          project.set(
            "mapping.woRequest.fileName",
            String(item.fileName || "").trim() || fileUrl.split("/").pop(),
          );
          await project.save(); // runs the status-progression hook
          updated.push({
            _id: project._id,
            title: project.title,
            siteId: project.siteId,
            status: project.status,
          });
        } catch (err) {
          failed.push({ projectId: item.projectId, reason: err.message });
        }
      }

      res.status(200).json({
        message: `WO Request set to "Requested" for ${updated.length} project(s)`,
        updatedCount: updated.length,
        updated,
        failed,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Create a new project (Admin, Manager only)
router.post("/", protect, authorize("Admin", "Manager"), async (req, res) => {
  try {
    const {
      category,
      program = "",
      projectScope = "",
      scope = "",
      siteId,
      tawalId,
      budget = 0,
      spent = 0,
    } = req.body;
    req.body.program = String(program || "").trim();
    const scopeToUse = String(projectScope || scope || "").trim();

    if (category) {
      const cat = await Category.findOne({
        name: new RegExp(
          `^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i",
        ),
      });
      if (!cat)
        return res
          .status(400)
          .json({ message: "Selected category does not exist" });
      if (budget > cat.budget) {
        return res
          .status(400)
          .json({ message: "Project budget cannot exceed category budget" });
      }
      if (spent > cat.budget) {
        return res
          .status(400)
          .json({ message: "Project spent cannot exceed category budget" });
      }
      req.body.categoryBudget = cat.budget;
      req.body.category = cat.name;

      const catScopes = cat.scopes || [];
      if (scopeToUse !== "") {
        if (catScopes.length > 0) {
          const matchedScope = catScopes.find(
            (s) => s.trim().toLowerCase() === scopeToUse.toLowerCase(),
          );
          if (!matchedScope) {
            return res.status(400).json({
              message: `Scope "${scopeToUse}" is invalid for category "${cat.name}". Valid scope(s): ${catScopes.join(", ")}`,
            });
          }
          req.body.projectScope = matchedScope;
        } else {
          req.body.projectScope = scopeToUse;
        }
      }
    } else if (scopeToUse !== "") {
      req.body.projectScope = scopeToUse;
    }

    // Site ID & Tawal ID must be unique — reject duplicates on create
    if (siteId && siteId.trim() !== "") {
      const existingSite = await Project.findOne({ siteId: siteId.trim() });
      if (existingSite) {
        return res.status(400).json({
          message: `A project with Site ID "${siteId.trim()}" already exists`,
        });
      }
    }
    if (tawalId && tawalId.trim() !== "") {
      const existingTawal = await Project.findOne({ tawalId: tawalId.trim() });
      if (existingTawal) {
        return res.status(400).json({
          message: `A project with Tawal ID "${tawalId.trim()}" already exists`,
        });
      }
    }

    const project = new Project(req.body);
    const newProject = await project.save();
    res.status(201).json(newProject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk update projects (program, category, projectScope) - Admin, Manager, PM
const handleBulkUpdate = async (req, res) => {
  try {
    const ids =
      req.body.ids ||
      req.body.projectIds ||
      (Array.isArray(req.body) ? req.body : []);

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        message: "Please provide an array of project IDs to update",
      });
    }

    const { program, category, projectScope } = req.body;

    if (!program && !category) {
      return res.status(400).json({
        message: "Please provide at least a program or category to update",
      });
    }

    const updateFields = {};

    if (program !== undefined && String(program).trim() !== "") {
      const trimmedProgram = String(program).trim();
      const prog = await Program.findOne({
        name: new RegExp(
          `^${trimmedProgram.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i",
        ),
      });
      if (!prog) {
        return res.status(404).json({
          message: `Program "${trimmedProgram}" not found`,
        });
      }
      updateFields.program = prog.name;
    }

    if (category !== undefined && String(category).trim() !== "") {
      const trimmedCategory = String(category).trim();
      const cat = await Category.findOne({
        name: new RegExp(
          `^${trimmedCategory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i",
        ),
      });
      if (!cat) {
        return res.status(404).json({
          message: `Category "${trimmedCategory}" not found`,
        });
      }

      // Check if any selected project has budget exceeding this category's budget
      const overbudgetProjects = await Project.find({
        _id: { $in: ids },
        budget: { $gt: cat.budget },
      }).select("title budget");

      if (overbudgetProjects.length > 0) {
        return res.status(400).json({
          message: `Cannot assign category "${cat.name}" (budget ₡${(cat.budget || 0).toLocaleString()}): ${overbudgetProjects.length} selected project(s) exceed category budget (${overbudgetProjects.map((p) => `"${p.title}": ₡${(p.budget || 0).toLocaleString()}`).slice(0, 3).join(", ")}${overbudgetProjects.length > 3 ? "..." : ""})`,
        });
      }

      updateFields.category = cat.name;
      updateFields.categoryBudget = cat.budget || 0;

      // If program was not explicitly provided, use the category's assigned program
      if (!updateFields.program && cat.program) {
        updateFields.program = cat.program;
      }

      // Handle projectScope if provided
      if (projectScope !== undefined) {
        const trimmedScope = String(projectScope).trim();
        if (trimmedScope !== "") {
          const catScopes = cat.scopes || [];
          if (catScopes.length > 0) {
            const matchedScope = catScopes.find(
              (s) => s.trim().toLowerCase() === trimmedScope.toLowerCase(),
            );
            if (!matchedScope) {
              return res.status(400).json({
                message: `Scope "${trimmedScope}" is invalid for category "${cat.name}". Valid scope(s): ${catScopes.join(", ")}`,
              });
            }
            updateFields.projectScope = matchedScope;
          } else {
            updateFields.projectScope = trimmedScope;
          }
        } else {
          updateFields.projectScope = "";
        }
      }
    } else if (projectScope !== undefined) {
      updateFields.projectScope = String(projectScope).trim();
    }

    const result = await Project.updateMany(
      { _id: { $in: ids } },
      { $set: updateFields },
    );

    res.status(200).json({
      message: `${result.modifiedCount} project(s) updated successfully`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

router.post(
  "/bulk-update",
  protect,
  authorize("Admin", "Manager", "PM"),
  handleBulkUpdate,
);
router.put(
  "/bulk-update",
  protect,
  authorize("Admin", "Manager", "PM"),
  handleBulkUpdate,
);

// Update a project (roles that can edit at least one module — aligned with frontend)
router.put(
  "/:id",
  protect,
  authorize(
    "Admin",
    "Manager",
    "PM",
    "Logistics",
    "Coordinator",
    "Integration & Support",
    "Document Controller",
    "Closeout",
  ),
  async (req, res, next) => {
    try {
      const {
        category,
        projectScope = "",
        scope = "",
        budget = 0,
        spent = 0,
      } = req.body;
      const scopeToUse = String(projectScope || scope || "").trim();

      if (req.body.program !== undefined) {
        req.body.program = String(req.body.program || "").trim();
      }

      if (category) {
        const cat = await Category.findOne({
          name: new RegExp(
            `^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
        });
        if (!cat)
          return res
            .status(400)
            .json({ message: "Selected category does not exist" });
        if (budget > cat.budget) {
          return res
            .status(400)
            .json({ message: "Project budget cannot exceed category budget" });
        }
        if (spent > cat.budget) {
          return res
            .status(400)
            .json({ message: "Project spent cannot exceed category budget" });
        }
        req.body.categoryBudget = cat.budget;
        req.body.category = cat.name;

        const catScopes = cat.scopes || [];
        if (scopeToUse !== "") {
          if (catScopes.length > 0) {
            const matchedScope = catScopes.find(
              (s) => s.trim().toLowerCase() === scopeToUse.toLowerCase(),
            );
            if (!matchedScope) {
              return res.status(400).json({
                message: `Scope "${scopeToUse}" is invalid for category "${cat.name}". Valid scope(s): ${catScopes.join(", ")}`,
              });
            }
            req.body.projectScope = matchedScope;
          } else {
            req.body.projectScope = scopeToUse;
          }
        } else {
          req.body.projectScope = "";
        }
      } else if (scopeToUse !== "") {
        req.body.projectScope = scopeToUse;
      } else if (projectScope !== undefined) {
        req.body.projectScope = "";
      }

      if (
        req.body.mapping?.woRequest?.status === "Requested" &&
        (!req.body.mapping?.woRequest?.fileUrl ||
          !req.body.mapping?.woRequest?.fileUrl.trim())
      ) {
        return res.status(400).json({
          message: "Mapping file is required when WO Request is Requested",
        });
      }
      //working
      if (
        req.body.mapping?.woIssuance?.status === "Approved" &&
        (!req.body.mapping?.woIssuance?.woNumber ||
          !req.body.mapping?.woIssuance?.woNumber.trim())
      ) {
        return res.status(400).json({
          message: "WO Number is required when WO Issuance is Approved",
        });
      }

      const project = await Project.findById(req.params.id);
      if (!project)
        return res.status(404).json({ message: "Project not found" });

      Object.assign(project, req.body);
      await project.save();

      res.status(200).json(project);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
);

// Bulk delete projects (Admin, Manager only) - must be before /:id route
router.post(
  "/bulk-delete",
  protect,
  authorize("Admin", "Manager"),
  async (req, res) => {
    try {
      const ids =
        req.body.ids ||
        req.body.projectIds ||
        (Array.isArray(req.body) ? req.body : []);

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          message: "Please provide an array of project IDs to delete",
        });
      }

      const result = await Project.deleteMany({ _id: { $in: ids } });
      res.status(200).json({
        message: `${result.deletedCount} project(s) deleted successfully`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

router.delete(
  "/bulk",
  protect,
  authorize("Admin", "Manager"),
  async (req, res) => {
    try {
      const ids =
        req.body.ids ||
        req.body.projectIds ||
        (Array.isArray(req.body) ? req.body : []);

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          message: "Please provide an array of project IDs to delete",
        });
      }

      const result = await Project.deleteMany({ _id: { $in: ids } });
      res.status(200).json({
        message: `${result.deletedCount} project(s) deleted successfully`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Delete a project (Admin, Manager)
router.delete(
  "/:id",
  protect,
  authorize("Admin", "Manager"),
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project)
        return res.status(404).json({ message: "Project not found" });
      await project.deleteOne();
      res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

module.exports = router;
