const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const Program = require("../models/Program");
const Category = require("../models/Category");
const { protect, authorize } = require("../middleware/auth");

// Helper: build base query based on role and optional filters
function buildBaseQuery(req) {
  const { role, email } = req.user;
  const fullAccessRoles = ["Admin", "Manager", "PM"];
  let query = fullAccessRoles.includes(role) ? {} : { teamMembers: email };

  const { program, category, status, region, city, from, to } = req.query;
  if (program && program !== "all") query.program = program;
  if (category && category !== "all") query.category = category;
  if (status && status !== "all") query.status = status;
  if (region && region !== "all")
    query.region = { $regex: region, $options: "i" };
  if (city && city !== "all") query.city = { $regex: city, $options: "i" };
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }
  return query;
}

// ─── GET /api/reports/summary ────────────────────────────────────────────────
// High-level KPIs + status/priority breakdown
router.get("/summary", protect, async (req, res) => {
  try {
    const query = buildBaseQuery(req);

    const [
      totalProjects,
      mappingCount,
      completedCount,
      closeoutCount,
      initiationCount,
      installationCount,
      criticalCount,
      highCount,
      budgetAgg,
      spentAgg,
      statusData,
      priorityData,
      categoryData,
      programData,
    ] = await Promise.all([
      Project.countDocuments(query),
      Project.countDocuments({ ...query, status: "Mapping" }),
      Project.countDocuments({ ...query, status: "Completed" }),
      Project.countDocuments({ ...query, status: "Closeout" }),
      Project.countDocuments({ ...query, status: "Initiation" }),
      Project.countDocuments({ ...query, status: "Installation" }),
      Project.countDocuments({ ...query, priority: "Critical" }),
      Project.countDocuments({ ...query, priority: "High" }),
      Project.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$budget" } } },
      ]),
      Project.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$spent" } } },
      ]),
      Project.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Project.aggregate([
        { $match: query },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Project.aggregate([
        { $match: query },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Project.aggregate([
        { $match: query },
        { $group: { _id: "$program", count: { $sum: 1 } } },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ["$_id", "Unassigned"] },
            count: 1,
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const { program, category } = req.query;
    let totalBudget = 0;
    if (category && category !== "all") {
      const catDoc = await Category.findOne({ name: category });
      totalBudget = catDoc?.budget || 0;
    } else if (program && program !== "all") {
      const progDoc = await Program.findOne({ name: program });
      totalBudget = progDoc?.budget || 0;
    } else {
      const progBudgetAgg = await Program.aggregate([
        { $group: { _id: null, total: { $sum: "$budget" } } },
      ]);
      totalBudget = progBudgetAgg[0]?.total || 0;
    }

    if (!totalBudget) {
      totalBudget = budgetAgg[0]?.total || 0;
    }

    const totalSpent = spentAgg[0]?.total || 0;
    const completionRate =
      totalProjects > 0
        ? Math.round((completedCount / totalProjects) * 100)
        : 0;
    const budgetUtilization =
      totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    res.json({
      totalProjects,
      mappingCount,
      completedCount,
      closeoutCount,
      initiationCount,
      installationCount,
      criticalCount,
      highCount,
      totalBudget,
      totalSpent,
      completionRate,
      budgetUtilization,
      statusData,
      priorityData,
      categoryData,
      programData,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/reports/pipeline ───────────────────────────────────────────────
// Module-level status breakdowns for Mapping, Installation, Integration, Closeout
router.get("/pipeline", protect, async (req, res) => {
  try {
    const query = buildBaseQuery(req);

    const [
      mappingWoRequest,
      mappingWoIssuance,
      mappingMaterialsRequest,
      installationTcnRequest,
      installationTeamsMobilization,
      installationTcnApproval,
      installationSiteInstallation,
      integrationAlarms,
      integrationAnnex,
      integrationTenants,
      closeoutPatTcn,
      closeoutPatStatus,
      closeoutInvoicing,
      closeoutCapitalisation,
    ] = await Promise.all([
      // Mapping
      Project.aggregate([
        { $match: query },
        { $group: { _id: "$mapping.woRequest.status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Project.aggregate([
        { $match: query },
        { $group: { _id: "$mapping.woIssuance.status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$mapping.materialsRequest.status",
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      // Installation
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$installation.tcnRequest.status",
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$installation.teamsMaterialsMobilization.status",
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$installation.tcnApproval.status",
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$installation.siteInstallation.status",
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      // Integration
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$integration.alarmsConfiguration.status",
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$integration.annexNumber.status",
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$integration.tenantsIntegration.status",
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      // Closeout
      Project.aggregate([
        { $match: query },
        { $group: { _id: "$closeout.patTcn.status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Project.aggregate([
        { $match: query },
        { $group: { _id: "$closeout.patStatus.status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Project.aggregate([
        { $match: query },
        { $group: { _id: "$closeout.invoicing.status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$closeout.capitalisationSheetUpdate.status",
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
    ]);

    res.json({
      mapping: {
        woRequest: mappingWoRequest,
        woIssuance: mappingWoIssuance,
        materialsRequest: mappingMaterialsRequest,
      },
      installation: {
        tcnRequest: installationTcnRequest,
        teamsMobilization: installationTeamsMobilization,
        tcnApproval: installationTcnApproval,
        siteInstallation: installationSiteInstallation,
      },
      integration: {
        alarmsConfiguration: integrationAlarms,
        annexNumber: integrationAnnex,
        tenantsIntegration: integrationTenants,
      },
      closeout: {
        patTcn: closeoutPatTcn,
        patStatus: closeoutPatStatus,
        invoicing: closeoutInvoicing,
        capitalisationSheet: closeoutCapitalisation,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/reports/budget ─────────────────────────────────────────────────
// Budget vs. spent per category + top over/under-budget projects
router.get("/budget", protect, async (req, res) => {
  try {
    const query = buildBaseQuery(req);

    const [
      categoryBudget,
      programBudget,
      topProjects,
      overBudgetCount,
      underBudgetCount,
    ] = await Promise.all([
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$category",
            budget: { $sum: "$budget" },
            spent: { $sum: "$spent" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            category: "$_id",
            budget: 1,
            spent: 1,
            count: 1,
            variance: { $subtract: ["$budget", "$spent"] },
          },
        },
        { $sort: { budget: -1 } },
      ]),
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$program",
            budget: { $sum: "$budget" },
            spent: { $sum: "$spent" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            program: { $ifNull: ["$_id", "Unassigned"] },
            budget: 1,
            spent: 1,
            count: 1,
            variance: { $subtract: ["$budget", "$spent"] },
          },
        },
        { $sort: { budget: -1 } },
      ]),
      Project.find(query)
        .sort({ budget: -1 })
        .limit(10)
        .select("title program budget spent category status")
        .lean(),
      Project.countDocuments({
        ...query,
        $expr: { $gt: ["$spent", "$budget"] },
      }),
      Project.countDocuments({
        ...query,
        $expr: { $lte: ["$spent", "$budget"] },
      }),
    ]);

    const projectsWithVariance = topProjects.map((p) => ({
      ...p,
      variance: (p.budget || 0) - (p.spent || 0),
      utilization: p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0,
    }));

    res.json({
      categoryBudget,
      programBudget,
      topProjects: projectsWithVariance,
      overBudgetCount,
      underBudgetCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/reports/timeline ───────────────────────────────────────────────
// Projects by month, by region, by city
router.get("/timeline", protect, async (req, res) => {
  try {
    const query = buildBaseQuery(req);

    const [byMonth, byRegion, byCity] = await Promise.all([
      Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
            budget: { $sum: "$budget" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        {
          $project: {
            _id: 0,
            year: "$_id.year",
            month: "$_id.month",
            count: 1,
            budget: 1,
            label: {
              $concat: [
                {
                  $arrayElemAt: [
                    [
                      "",
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ],
                    "$_id.month",
                  ],
                },
                " ",
                { $toString: "$_id.year" },
              ],
            },
          },
        },
      ]),
      Project.aggregate([
        { $match: { ...query, region: { $ne: null, $exists: true, $ne: "" } } },
        {
          $group: {
            _id: "$region",
            count: { $sum: 1 },
            budget: { $sum: "$budget" },
            spent: { $sum: "$spent" },
          },
        },
        { $project: { _id: 0, region: "$_id", count: 1, budget: 1, spent: 1 } },
        { $sort: { count: -1 } },
      ]),
      Project.aggregate([
        { $match: { ...query, city: { $ne: null, $exists: true, $ne: "" } } },
        {
          $group: {
            _id: "$city",
            count: { $sum: 1 },
            budget: { $sum: "$budget" },
          },
        },
        { $project: { _id: 0, city: "$_id", count: 1, budget: 1 } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
    ]);

    res.json({ byMonth, byRegion, byCity });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/reports/export ─────────────────────────────────────────────────
// Returns flat JSON suitable for CSV export (Admin & PM only)
router.get("/export", protect, authorize("Admin", "PM"), async (req, res) => {
  try {
    const query = buildBaseQuery(req);
    const projects = await Project.find(query)
      .select(
        "title program category status priority region city budget spent progress teamLead startDate endDate siteId tawalId createdAt mapping.woRequest.status mapping.woIssuance.status mapping.materialsRequest.status installation.tcnRequest.status installation.siteInstallation.status integration.alarmsConfiguration.status closeout.patStatus.status closeout.invoicing.status",
      )
      .lean();

    const rows = projects.map((p) => ({
      Title: p.title || "",
      Program: p.program || "",
      Category: p.category || "",
      Status: p.status || "",
      Priority: p.priority || "",
      Region: p.region || "",
      City: p.city || "",
      "Site ID": p.siteId || "",
      "Tawal ID": p.tawalId || "",
      "Team Lead": p.teamLead || "",
      Budget: p.budget || 0,
      Spent: p.spent || 0,
      "Budget Variance": (p.budget || 0) - (p.spent || 0),
      "Progress (%)": p.progress || 0,
      "Start Date": p.startDate
        ? new Date(p.startDate).toLocaleDateString()
        : "",
      "End Date": p.endDate ? new Date(p.endDate).toLocaleDateString() : "",
      "Created At": p.createdAt
        ? new Date(p.createdAt).toLocaleDateString()
        : "",
      "WO Request": p.mapping?.woRequest?.status || "",
      "WO Issuance": p.mapping?.woIssuance?.status || "",
      "Materials Request": p.mapping?.materialsRequest?.status || "",
      "TCN Request": p.installation?.tcnRequest?.status || "",
      "Site Installation": p.installation?.siteInstallation?.status || "",
      "Alarms Configuration": p.integration?.alarmsConfiguration?.status || "",
      "PAT Status": p.closeout?.patStatus?.status || "",
      Invoicing: p.closeout?.invoicing?.status || "",
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
