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

  const [breakdownView, setBreakdownView] = useState("auto"); // "auto" | "program" | "category"

  const handleProgramFilterChange = (newProg) => {
    setProgramFilter(newProg);
    setBreakdownView("auto");
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
    setBreakdownView("auto");
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

  // Selected Program and Category objects
  const selectedProgramObj = useMemo(() => {
    if (!programFilter || programFilter === "All Programs") return null;
    return programs.find((p) => p.name === programFilter) || null;
  }, [programs, programFilter]);

  const selectedCategoryObj = useMemo(() => {
    if (!categoryFilter || categoryFilter === "All Categories") return null;
    return categories.find((c) => c.name === categoryFilter) || null;
  }, [categories, categoryFilter]);

  // Projects budget sum in current filtered view as fallback
  const projectsBudgetSum = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
  }, [filteredProjects]);

  // Total budget & subtitle logic based on active filters:
  // - If specific category selected: show selected category's budget
  // - If specific program selected: show selected program's budget
  // - By default (All Programs): show sum of all programs' budgets
  const { totalBudget, budgetSubtitle } = useMemo(() => {
    if (selectedCategoryObj) {
      const catBudget = selectedCategoryObj.budget || 0;
      return {
        totalBudget: catBudget > 0 ? catBudget : projectsBudgetSum,
        budgetSubtitle: `Category budget: ${selectedCategoryObj.name}`,
      };
    }

    if (selectedProgramObj) {
      const progBudget = selectedProgramObj.budget || 0;
      return {
        totalBudget: progBudget > 0 ? progBudget : projectsBudgetSum,
        budgetSubtitle: `Program budget: ${selectedProgramObj.name}`,
      };
    }

    // Default: sum of all program budgets
    const allProgramsBudget = programs.reduce(
      (sum, p) => sum + (p.budget || 0),
      0,
    );
    return {
      totalBudget:
        allProgramsBudget > 0 ? allProgramsBudget : projectsBudgetSum,
      budgetSubtitle: "Sum of all program budgets",
    };
  }, [selectedCategoryObj, selectedProgramObj, programs, projectsBudgetSum]);

  // KPIs
  const totalProjects = filteredProjects.length;
  const totalSpent = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + (p.spent || 0), 0);
  }, [filteredProjects]);
  const remaining = totalBudget - totalSpent;
  const totalUtilizedPercent =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Active breakdown: "program" by default, or "category" if a program filter is active
  const activeBreakdown = useMemo(() => {
    if (breakdownView !== "auto") return breakdownView;
    return programFilter === "All Programs" &&
      categoryFilter === "All Categories"
      ? "program"
      : "category";
  }, [breakdownView, programFilter, categoryFilter]);

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

  // Program Breakdown Data (for "By Program" view)
  const programsData = useMemo(() => {
    const map = {};
    programs.forEach((prog) => {
      map[prog.name] = {
        name: prog.name,
        budget: prog.budget || 0,
        spent: 0,
        count: 0,
        projectBudgetSum: 0,
      };
    });

    filteredProjects.forEach((p) => {
      const progName = p.program || "Unassigned";
      if (!map[progName]) {
        map[progName] = {
          name: progName,
          budget: 0,
          spent: 0,
          count: 0,
          projectBudgetSum: 0,
        };
      }
      map[progName].count++;
      map[progName].spent += p.spent || 0;
      map[progName].projectBudgetSum += p.budget || 0;
    });

    return Object.values(map)
      .map((item) => {
        const effectiveBudget =
          item.budget > 0 ? item.budget : item.projectBudgetSum;
        return {
          ...item,
          budget: effectiveBudget,
          percentUsed:
            effectiveBudget > 0
              ? Math.round((item.spent / effectiveBudget) * 100)
              : 0,
        };
      })
      .filter((item) => item.count > 0 || item.budget > 0)
      .sort((a, b) => b.budget - a.budget);
  }, [programs, filteredProjects]);

  // Category Breakdown Data (for "By Category" view)
  const categoriesData = useMemo(() => {
    const map = {};

    availableCategories.forEach((cat) => {
      map[cat.name] = {
        name: cat.name,
        program: cat.program,
        budget: cat.budget || 0,
        spent: 0,
        count: 0,
        projectBudgetSum: 0,
      };
    });

    filteredProjects.forEach((p) => {
      const catName = p.category || "Unassigned";
      if (!map[catName]) {
        map[catName] = {
          name: catName,
          program: p.program,
          budget: 0,
          spent: 0,
          count: 0,
          projectBudgetSum: 0,
        };
      }
      map[catName].count++;
      map[catName].spent += p.spent || 0;
      map[catName].projectBudgetSum += p.budget || 0;
    });

    let list = Object.values(map);

    if (categoryFilter && categoryFilter !== "All Categories") {
      list = list.filter((c) => c.name === categoryFilter);
    }

    return list
      .map((item) => {
        const effectiveBudget =
          item.budget > 0 ? item.budget : item.projectBudgetSum;
        return {
          ...item,
          budget: effectiveBudget,
          percentUsed:
            effectiveBudget > 0
              ? Math.round((item.spent / effectiveBudget) * 100)
              : 0,
        };
      })
      .filter((item) => item.count > 0 || item.budget > 0)
      .sort((a, b) => b.budget - a.budget);
  }, [availableCategories, filteredProjects, categoryFilter]);

  const currentBreakdownData =
    activeBreakdown === "program" ? programsData : categoriesData;

  const maxBreakdownBudget = Math.max(
    ...currentBreakdownData.map((d) => Math.max(d.budget, d.spent)),
    1,
  );

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
      </div>
      {/* FILTERS TOOLBAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          margin: "12px 0px",
        }}
      >
        {/* Program Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
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
            {budgetSubtitle}
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
        {/* Program / Category Budget vs Spend */}
        <div className="glass-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
                {activeBreakdown === "program"
                  ? "Program Budget vs Spend"
                  : `Category Budget vs Spend ${
                      programFilter !== "All Programs"
                        ? `(${programFilter})`
                        : ""
                    }`}
              </h3>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  marginTop: "0.2rem",
                }}
              >
                {activeBreakdown === "program"
                  ? "Allocated program budgets vs current spend"
                  : programFilter !== "All Programs"
                    ? `Categories under ${programFilter}`
                    : "All categories across programs"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              {/* Toggle By Program / By Category */}
              <div
                style={{
                  display: "flex",
                  background: "#f1f5f9",
                  borderRadius: "1.5rem",
                  padding: "0.2rem",
                  border: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  onClick={() => setBreakdownView("program")}
                  style={{
                    border: "none",
                    borderRadius: "1.2rem",
                    padding: "0.25rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    background:
                      activeBreakdown === "program" ? "#4f46e5" : "transparent",
                    color: activeBreakdown === "program" ? "#fff" : "#64748b",
                    transition: "all 0.15s ease",
                  }}
                >
                  By Program
                </button>
                <button
                  type="button"
                  onClick={() => setBreakdownView("category")}
                  style={{
                    border: "none",
                    borderRadius: "1.2rem",
                    padding: "0.25rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    background:
                      activeBreakdown === "category"
                        ? "#4f46e5"
                        : "transparent",
                    color: activeBreakdown === "category" ? "#fff" : "#64748b",
                    transition: "all 0.15s ease",
                  }}
                >
                  By Category
                </button>
              </div>

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
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
                      border: "1px solid #818cf8",
                      background: "#eef2ff",
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
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              overflowY: "auto",
              maxHeight: "18rem",
              padding: "0.5rem",
            }}
          >
            {currentBreakdownData.map((item) => (
              <div
                key={item.name}
                onClick={() => {
                  if (
                    activeBreakdown === "program" &&
                    item.name !== "Unassigned"
                  ) {
                    handleProgramFilterChange(item.name);
                  }
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "170px 1fr 100px",
                  gap: "1rem",
                  alignItems: "center",
                  cursor:
                    activeBreakdown === "program" && item.name !== "Unassigned"
                      ? "pointer"
                      : "default",
                  borderRadius: "0.35rem",
                  padding: "0.25rem",
                  transition: "background 0.15s ease",
                }}
                title={
                  activeBreakdown === "program" && item.name !== "Unassigned"
                    ? `Click to filter by ${item.name}`
                    : item.name
                }
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#1e293b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    {item.count} project{item.count !== 1 ? "s" : ""} •{" "}
                    <span
                      style={{
                        color: item.percentUsed > 100 ? "#ef4444" : "#64748b",
                        fontWeight: item.percentUsed > 100 ? 600 : 400,
                      }}
                    >
                      {item.percentUsed}% used
                    </span>
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
                      width: `${Math.min(
                        100,
                        (item.budget / maxBreakdownBudget) * 100,
                      )}%`,
                      background: "#eef2ff",
                      borderRadius: "4px",
                      border: "1px solid #c7d2fe",
                    }}
                  ></div>
                  {/* Spent Bar */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.min(
                        100,
                        (item.spent / maxBreakdownBudget) * 100,
                      )}%`,
                      background:
                        item.percentUsed > 100 ? "#ef4444" : "#4f46e5",
                      borderRadius: "4px",
                    }}
                  ></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#1e293b",
                    }}
                  >
                    {formatCurrency(item.budget)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {formatCurrency(item.spent)}
                  </div>
                </div>
              </div>
            ))}
            {currentBreakdownData.length === 0 && (
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "0.9rem",
                  padding: "1rem 0",
                }}
              >
                {activeBreakdown === "program"
                  ? "No programs found in this view."
                  : "No categories found in this view."}
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
