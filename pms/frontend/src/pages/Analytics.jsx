import { useState, useMemo } from "react";
import { useProjectsHook, useCategories, usePrograms } from "../hooks/project";
import { NavLink } from "react-router-dom";
import { RotateCcw } from "lucide-react";

const formatCurrency = (value) => {
  return `﷼ ${Number(value || 0).toLocaleString("en-US")}`;
};

export default function Analytics() {
  const { data: projectsData, isLoading } = useProjectsHook({ limit: "all" });
  const projects = projectsData?.data || [];
  const { data: programs = [] } = usePrograms();
  const { data: categories = [] } = useCategories();

  const [filter, setFilter] = useState("All"); // All, Active, Completed
  const [programFilter, setProgramFilter] = useState("All Programs");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  // Filter categories to only those in the selected program
  const availableCategories = useMemo(() => {
    if (!programFilter || programFilter === "All Programs") return categories;
    return categories.filter(
      (cat) => !cat.program || cat.program === programFilter,
    );
  }, [categories, programFilter]);

  const handleProgramFilterChange = (newProg) => {
    setProgramFilter(newProg);
    if (newProg !== "All Programs" && categoryFilter !== "All Categories") {
      const matchingCats = categories.filter(
        (c) => !c.program || c.program === newProg,
      );
      if (!matchingCats.some((c) => c.name === categoryFilter)) {
        setCategoryFilter("All Categories");
      }
    }
  };

  const handleResetFilters = () => {
    setFilter("All");
    setProgramFilter("All Programs");
    setCategoryFilter("All Categories");
  };

  const hasActiveFilters =
    filter !== "All" ||
    programFilter !== "All Programs" ||
    categoryFilter !== "All Categories";

  // Filter projects based on status, program, and category
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Status filter
      if (filter === "Completed" && p.status !== "Completed") return false;
      if (
        filter === "Active" &&
        (p.status === "Completed" || p.status === "Closeout")
      )
        return false;

      // Program filter
      if (
        programFilter &&
        programFilter !== "All Programs" &&
        p.program !== programFilter
      )
        return false;

      // Category filter
      if (
        categoryFilter &&
        categoryFilter !== "All Categories" &&
        p.category !== categoryFilter
      )
        return false;

      return true;
    });
  }, [projects, filter, programFilter, categoryFilter]);

  // KPIs
  const totalProjects = filteredProjects.length;
  const totalBudget = filteredProjects.reduce(
    (sum, p) => sum + (p.budget || 0),
    0,
  );
  const totalSpent = filteredProjects.reduce(
    (sum, p) => sum + (p.spent || 0),
    0,
  );
  const remaining = totalBudget - totalSpent;
  const totalUtilizedPercent =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Status Distribution
  const statusCounts = {
    Initiation: 0,
    Mapping: 0,
    Installation: 0,
    Integration: 0,
    Closeout: 0,
    Completed: 0,
  };

  filteredProjects.forEach((p) => {
    if (statusCounts[p.status] !== undefined) {
      statusCounts[p.status]++;
    }
  });
  const maxStatusCount = Math.max(...Object.values(statusCounts), 1);

  // Category Breakdown
  const categoryMap = {};
  filteredProjects.forEach((p) => {
    if (!categoryMap[p.category]) {
      categoryMap[p.category] = { count: 0, budget: 0, spent: 0 };
    }
    categoryMap[p.category].count++;
    categoryMap[p.category].budget += p.budget || 0;
    categoryMap[p.category].spent += p.spent || 0;
  });

  const categoriesData = Object.keys(categoryMap)
    .map((key) => ({
      name: key,
      ...categoryMap[key],
      percentUsed:
        categoryMap[key].budget > 0
          ? Math.round((categoryMap[key].spent / categoryMap[key].budget) * 100)
          : 0,
    }))
    .sort((a, b) => b.budget - a.budget);
  // changes

  const maxCategoryBudget = Math.max(...categoriesData.map((c) => c.budget), 1);

  const getStatusColor = (status) => {
    switch (status) {
      case "Initiation":
        return "#94a3b8"; // Gray
      case "Mapping":
        return "#4f46e5"; // Indigo
      case "Installation":
        return "#f59e0b"; // Amber
      case "Integration":
        return "#8b5cf6"; // Purple
      case "Closeout":
        return "#f97316"; // Orange
      case "Completed":
        return "#10b981"; // Green
      default:
        return "#94a3b8";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return { color: "#ef4444", border: "1px solid #fecaca" };
      case "high":
        return { color: "#f59e0b", border: "1px solid #fde68a" };
      case "medium":
        return { color: "#3b82f6", border: "1px solid #bfdbfe" };
      case "low":
        return { color: "#64748b", border: "1px solid #e2e8f0" };
      default:
        return { color: "#64748b", border: "1px solid #e2e8f0" };
    }
  };

  if (isLoading) {
    return <div style={{ padding: "2rem" }}>Loading Analytics...</div>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
        color: "#1e293b",
      }}
    >
      {/* HEADER & FILTERS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
            Analytics
          </h1>
          <p
            style={{
              color: "#64748b",
              marginTop: "0.35rem",
              fontSize: "0.9rem",
            }}
          >
            Track spend against allocated budgets across programs, categories,
            and projects.
          </p>
        </div>

        {/* FILTERS TOOLBAR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {/* Program Filter */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: "600",
                color: "#475569",
              }}
            >
              Program:
            </span>
            <select
              value={programFilter}
              onChange={(e) => handleProgramFilterChange(e.target.value)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: "0.45rem",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: "500",
                color: "#1e293b",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="All Programs">All Programs</option>
              {programs.map((prog) => (
                <option key={prog._id} value={prog.name}>
                  {prog.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: "600",
                color: "#475569",
              }}
            >
              Category:
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: "0.45rem",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: "500",
                color: "#1e293b",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="All Categories">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Toggle */}
          <div
            style={{
              display: "flex",
              backgroundColor: "#fff",
              borderRadius: "2rem",
              padding: "0.2rem",
              border: "1px solid #cbd5e1",
            }}
          >
            {["All", "Active", "Completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? "#4f46e5" : "transparent",
                  color: filter === f ? "#fff" : "#64748b",
                  border: "none",
                  borderRadius: "1.5rem",
                  padding: "0.35rem 0.9rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              title="Reset all filters"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.45rem 0.75rem",
                borderRadius: "0.45rem",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#64748b",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Indicators */}
      {hasActiveFilters && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            fontSize: "0.8rem",
          }}
        >
          <span style={{ color: "#64748b", fontWeight: "500" }}>
            Active Filters:
          </span>
          {programFilter !== "All Programs" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                background: "#ecfdf5",
                color: "#065f46",
                fontWeight: "600",
                border: "1px solid #a7f3d0",
              }}
            >
              Program: {programFilter}
            </span>
          )}
          {categoryFilter !== "All Categories" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                background: "#e0e7ff",
                color: "#3730a3",
                fontWeight: "600",
                border: "1px solid #c7d2fe",
              }}
            >
              Category: {categoryFilter}
            </span>
          )}
          {filter !== "All" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                background: "#fef3c7",
                color: "#92400e",
                fontWeight: "600",
                border: "1px solid #fde68a",
              }}
            >
              Status: {filter}
            </span>
          )}
          <span style={{ color: "#94a3b8" }}>
            ({totalProjects} project{totalProjects !== 1 ? "s" : ""} match)
          </span>
        </div>
      )}

      {/* KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {/* PROJECTS */}
        <div className="glass-panel">
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            PROJECTS
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: "0.25rem",
            }}
          >
            {totalProjects}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            In current view
          </div>
        </div>

        {/* TOTAL BUDGET */}
        <div className="glass-panel">
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            TOTAL BUDGET
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: "0.25rem",
            }}
          >
            {formatCurrency(totalBudget)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            Sum of project budgets
          </div>
        </div>

        {/* TOTAL SPENT */}
        <div className="glass-panel">
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            TOTAL SPENT
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: "0.25rem",
            }}
          >
            {formatCurrency(totalSpent)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            {totalUtilizedPercent}% utilized
          </div>
        </div>

        {/* REMAINING */}
        <div className="glass-panel">
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            REMAINING
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: "0.25rem",
            }}
          >
            {formatCurrency(remaining)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Available</div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2.5fr 1fr",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {/* Category Budget vs Spend */}
        <div className="glass-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
              Category Budget vs Spend
            </h3>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                fontSize: "0.75rem",
                color: "#64748b",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                    border: "1px solid #4f46e5",
                    background: "transparent",
                  }}
                ></div>
                Allocated
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                    background: "#4f46e5",
                  }}
                ></div>
                Spent
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              overflowY: "auto",
              maxHeight: "10rem",
              padding: "0.5rem",
            }}
          >
            {categoriesData.map((cat) => (
              <div
                key={cat.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 1fr 80px",
                  gap: "1rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#1e293b",
                    }}
                  >
                    {cat.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    {cat.count} project{cat.count !== 1 ? "s" : ""} •
                    {cat.percentUsed}% used
                  </div>
                </div>
                {/* Custom Bar */}
                <div
                  style={{
                    width: "100%",
                    height: "20px",
                    background: "#f8fafc",
                    borderRadius: "4px",
                    position: "relative",
                  }}
                >
                  {/* Allocated Bar */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${(cat.budget / maxCategoryBudget) * 100}%`,
                      background: "#eef2ff",
                      borderRadius: "4px",
                    }}
                  ></div>
                  {/* Spent Bar */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${(cat.spent / maxCategoryBudget) * 100}%`,
                      background: "#4f46e5",
                      borderRadius: "4px",
                    }}
                  ></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#1e293b",
                    }}
                  >
                    {formatCurrency(cat.budget)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {formatCurrency(cat.spent)}
                  </div>
                </div>
              </div>
            ))}
            {categoriesData.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                No categories found in this view.
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="glass-panel">
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              margin: "0 0 1.5rem 0",
            }}
          >
            Status Distribution
          </h3>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flex: 1,
              paddingBottom: "1rem",
              borderBottom: "1px dashed #e2e8f0",
            }}
          >
            {Object.keys(statusCounts).map((status) => {
              const count = statusCounts[status];
              const heightPercent =
                maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
              return (
                <div
                  key={status}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "40px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    {count}
                  </div>
                  <div
                    style={{
                      width: "32px",
                      height: `${Math.max(heightPercent, 2)}px`,
                      background: getStatusColor(status),
                      borderRadius: "6px 6px 0 0",
                      transition: "height 0.5s ease",
                    }}
                  ></div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "0.75rem",
            }}
          >
            {Object.keys(statusCounts).map((status) => (
              <div
                key={status}
                style={{
                  width: "40px",
                  textAlign: "center",
                  fontSize: "0.6rem",
                  color: "#64748b",
                }}
              >
                {status}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PROJECT BREAKDOWN TABLE */}
      <div className="glass-panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "1.5rem",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
            Project Breakdown
          </h3>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
            ( {filteredProjects.length} of {projects.length} projects )
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <th
                style={{
                  padding: "0.75rem 1.5rem",
                  textAlign: "left",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Project
              </th>
              <th
                style={{
                  padding: "0.75rem 1.5rem",
                  textAlign: "left",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Program
              </th>
              <th
                style={{
                  padding: "0.75rem 1.5rem",
                  textAlign: "left",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Category
              </th>
              <th
                style={{
                  padding: "0.75rem 1.5rem",
                  textAlign: "left",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: "0.75rem 1.5rem",
                  textAlign: "left",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Priority
              </th>
              <th
                style={{
                  padding: "0.75rem 1.5rem",
                  textAlign: "left",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Progress
              </th>
              <th
                style={{
                  padding: "0.75rem 1.5rem",
                  textAlign: "left",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Budget
              </th>
              <th
                style={{
                  padding: "0.75rem 1.5rem",
                  textAlign: "left",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Spent
              </th>
              <th
                style={{
                  padding: "0.75rem 1.5rem",
                  textAlign: "left",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Utilization
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p) => {
              const utilPercent =
                p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
              const utilColor =
                utilPercent > 90
                  ? "#ef4444"
                  : utilPercent > 75
                    ? "#f59e0b"
                    : "#10b981";

              return (
                <tr key={p._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 600,
                      }}
                    >
                      <NavLink
                        to={`/projects/${p._id}`}
                        style={{
                          color: "#1e293b",
                          textDecoration: "none",
                          textTransform: "capitalize",
                        }}
                      >
                        {p.title.length > 15 ? (
                          <> {p.title.slice(0, 15)}...</>
                        ) : (
                          p.title
                        )}
                      </NavLink>
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                        marginTop: "2px",
                      }}
                    >
                      {p.teamLead || "Unassigned"}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "1rem 1.5rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: "#e0e7ff",
                        color: "#4338ca",
                        border: "1px solid #c7d2fe",
                      }}
                    >
                      {p.program || "—"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "1rem 1.5rem",
                      fontSize: "0.85rem",
                      color: "#475569",
                    }}
                  >
                    {p.category}
                  </td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: getStatusColor(p.status),
                        color: "#fff",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        fontWeight: 500,
                        ...getPriorityColor(p.priority),
                        backgroundColor: "transparent",
                      }}
                    >
                      {p.priority || "Medium"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem 1.5rem", width: "120px" }}>
                    <div
                      style={{
                        width: "100%",
                        height: "6px",
                        backgroundColor: "#f1f5f9",
                        borderRadius: "3px",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${p.progress || 0}%`,
                          backgroundColor: "#4f46e5",
                          borderRadius: "3px",
                        }}
                      ></div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "1rem 1.5rem",
                      fontSize: "0.85rem",
                      color: "#475569",
                    }}
                  >
                    {formatCurrency(p.budget)}
                  </td>
                  <td
                    style={{
                      padding: "1rem 1.5rem",
                      fontSize: "0.85rem",
                      color: "#475569",
                    }}
                  >
                    {formatCurrency(p.spent)}
                  </td>
                  <td
                    style={{
                      padding: "1rem 1.5rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: utilColor,
                    }}
                  >
                    {utilPercent}%
                  </td>
                </tr>
              );
            })}
            {filteredProjects.length === 0 && (
              <tr>
                <td
                  colSpan="9"
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#94a3b8",
                  }}
                >
                  No projects match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
