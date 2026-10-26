import { useState, useEffect, useMemo, Fragment } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pen,
  Plus,
  SaudiRiyal,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
  useAddCategoryScope,
  useDeleteCategoryScope,
  usePrograms,
  useProjectsHook,
} from "../hooks/project";
import ConfirmModal from "../components/ConfirmModal";
import { useDebounce } from "../hooks/useDebounce";

export default function Categories() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("All Programs");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const { data: programs = [], isLoading: isProgramsLoading } = usePrograms();
  const { data: categories = [], isLoading } = useCategories(
    debouncedSearchQuery,
    programFilter,
  );

  // Fetch all categories without search filter to populate lists
  const { data: allCategories = [] } = useCategories("", "All Programs");

  // Fetch all projects to calculate active project budget allocations per program
  const { data: projectsData } = useProjectsHook({ limit: "all" });
  const allProjects = projectsData?.data || [];

  const { mutate: createCategory, isLoading: isCreating } = useCreateCategory();
  const { mutate: deleteCategory, isLoading: isDeleting } = useDeleteCategory();
  const { mutate: updateCategory, isLoading: isUpdating } = useUpdateCategory();
  const { mutate: addScope, isLoading: isAddingScope } = useAddCategoryScope();
  const { mutate: deleteScope } = useDeleteCategoryScope();

  // Create form state
  const [selectedProgram, setSelectedProgram] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newCatBudget, setNewCatBudget] = useState("");
  const [formError, setFormError] = useState("");

  // Edit row state
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingBudget, setEditingBudget] = useState("");
  const [editingCat, setEditingCat] = useState("");
  const [editingProg, setEditingProg] = useState("");
  const [editingError, setEditingError] = useState("");

  const [catToDelete, setCatToDelete] = useState(null);

  // Scope panel state
  const [expandedScopes, setExpandedScopes] = useState({});
  const [newScopeInput, setNewScopeInput] = useState({});

  // Auto-select first program when programs load
  useEffect(() => {
    if (!selectedProgram && programs.length > 0) {
      setSelectedProgram(programs[0].name);
    }
  }, [programs, selectedProgram]);

  // Compute active project budget allocation for currently selected program in the create form
  const currentProgram = useMemo(() => {
    return programs.find((p) => p.name === selectedProgram);
  }, [programs, selectedProgram]);

  const projectsUnderSelectedProg = useMemo(() => {
    if (!selectedProgram) return [];
    return allProjects.filter((p) => p.program === selectedProgram);
  }, [allProjects, selectedProgram]);

  const allocatedUnderSelectedProg = useMemo(() => {
    return projectsUnderSelectedProg.reduce(
      (sum, p) => sum + (p.budget || 0),
      0,
    );
  }, [projectsUnderSelectedProg]);

  const remainingProgBudget = useMemo(() => {
    if (!currentProgram) return 0;
    return Math.max(
      0,
      (currentProgram.budget || 0) - allocatedUnderSelectedProg,
    );
  }, [currentProgram, allocatedUnderSelectedProg]);

  const toggleScopePanel = (catId) =>
    setExpandedScopes((prev) => ({ ...prev, [catId]: !prev[catId] }));

  const handleAddScope = (cat) => {
    const scope = (newScopeInput[cat._id] || "").trim();
    if (!scope) return;
    addScope(
      { id: cat._id, scope },
      {
        onSuccess: () =>
          setNewScopeInput((prev) => ({ ...prev, [cat._id]: "" })),
      },
    );
  };

  const handleAdd = (e) => {
    e.preventDefault();
    setFormError("");

    if (!selectedProgram) {
      setFormError("Please select a program for this category");
      return;
    }
    if (!newCat.trim()) {
      setFormError("Category name is required");
      return;
    }

    const budgetVal = Number(newCatBudget) || 0;
    if (budgetVal < 0) {
      setFormError("Budget must be at least 0");
      return;
    }

    if (currentProgram && budgetVal > currentProgram.budget) {
      const msg = `Category budget (₡${budgetVal.toLocaleString()}) cannot exceed the program budget of ₡${(currentProgram.budget || 0).toLocaleString()}`;
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (currentProgram && budgetVal > remainingProgBudget) {
      const msg = `Category budget (₡${budgetVal.toLocaleString()}) cannot exceed remaining program budget of ₡${remainingProgBudget.toLocaleString()} (Total program budget: ₡${(currentProgram.budget || 0).toLocaleString()}, Projects Allocated: ₡${allocatedUnderSelectedProg.toLocaleString()})`;
      setFormError(msg);
      toast.error(msg);
      return;
    }

    createCategory(
      {
        name: newCat.trim(),
        budget: budgetVal,
        program: selectedProgram,
      },
      {
        onSuccess: () => {
          setNewCat("");
          setNewCatBudget("");
          setFormError("");
        },
        onError: (err) => {
          setFormError(err.response?.data?.message || "Failed to create category");
        },
      },
    );
  };

  const handleStartEdit = (cat) => {
    setEditingCategoryId(cat._id);
    setEditingCat(cat.name ?? "");
    setEditingBudget(cat.budget?.toString() ?? "0");
    setEditingProg(cat.program || (programs[0]?.name || ""));
    setEditingError("");
  };

  const handleUpdate = (id, catName, budgetStr, progName) => {
    setEditingError("");
    const budgetValue = Number(budgetStr || 0);

    if (budgetValue < 0) {
      setEditingError("Budget must be at least 0");
      return;
    }

    const targetProg = programs.find((p) => p.name === progName);
    if (targetProg) {
      if (budgetValue > targetProg.budget) {
        const msg = `Budget cannot exceed program budget of ₡${(targetProg.budget || 0).toLocaleString()}`;
        setEditingError(msg);
        toast.error(msg);
        return;
      }

      // Check remaining budget among other projects in this program
      const otherProjectsAllocated = allProjects
        .filter((p) => p.program === progName && p.category !== cat.name)
        .reduce((sum, p) => sum + (p.budget || 0), 0);
      const remainingForEdit = Math.max(
        0,
        (targetProg.budget || 0) - otherProjectsAllocated,
      );

      if (budgetValue > remainingForEdit) {
        const msg = `Budget cannot exceed remaining program budget of ₡${remainingForEdit.toLocaleString()} (Allocated to other projects: ₡${otherProjectsAllocated.toLocaleString()})`;
        setEditingError(msg);
        toast.error(msg);
        return;
      }
    }

    updateCategory(
      {
        id,
        name: catName.trim(),
        budget: budgetValue,
        program: progName,
      },
      {
        onSuccess: () => {
          setEditingCategoryId(null);
          setEditingBudget("");
          setEditingCat("");
          setEditingProg("");
          setEditingError("");
        },
        onError: (err) => {
          setEditingError(err.response?.data?.message || "Failed to update category");
        },
      },
    );
  };

  if (user?.role !== "Admin") {
    return (
      <div className="page-content">
        <h2 className="text-2xl font-bold mb-6">Manage Categories</h2>
        <p className="text-red-500">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Manage Categories</h2>
          <p className="text-sm text-gray-500 mt-1">
            Categories belong to programs. A category's budget cannot exceed the program budget.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "1000px" }}>
        {/* Create Category Form */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            marginBottom: "1.75rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div
            style={{
              fontSize: "0.9rem",
              fontWeight: "600",
              color: "#334155",
              marginBottom: "1rem",
            }}
          >
            Create New Category Under Program
          </div>

          <form
            onSubmit={handleAdd}
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.5fr 1fr auto",
              gap: "0.75rem",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#475569",
                  marginBottom: "0.35rem",
                }}
              >
                Program *
              </label>
              <select
                value={selectedProgram}
                onChange={(e) => {
                  setSelectedProgram(e.target.value);
                  setFormError("");
                }}
                disabled={isCreating || isProgramsLoading}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.5rem",
                  background: "#fff",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              >
                <option value="" disabled>
                  {isProgramsLoading ? "Loading programs..." : "Select Program"}
                </option>
                {programs.map((prog) => (
                  <option key={prog._id} value={prog.name}>
                    {prog.name} (₡{(prog.budget || 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#475569",
                  marginBottom: "0.35rem",
                }}
              >
                Category Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Civil Scope"
                value={newCat}
                onChange={(e) => {
                  setNewCat(e.target.value);
                  setFormError("");
                }}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.5rem",
                  background: "#fff",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
                disabled={isCreating}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#475569",
                  marginBottom: "0.35rem",
                }}
              >
                Category Budget (SAR) *
              </label>
              <input
                type="text"
                placeholder="0"
                value={newCatBudget}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setNewCatBudget(value);
                    setFormError("");
                  }
                }}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  border:
                    Number(newCatBudget) > remainingProgBudget && remainingProgBudget >= 0
                      ? "1px solid #ef4444"
                      : "1px solid #cbd5e1",
                  borderRadius: "0.5rem",
                  background: "#fff",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
                disabled={isCreating}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isCreating || !newCat.trim() || !selectedProgram}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.58rem 1.2rem",
                  background: "#4f46e5",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor:
                    isCreating || !newCat.trim() || !selectedProgram
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    isCreating || !newCat.trim() || !selectedProgram ? 0.6 : 1,
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={16} /> Add Category
              </button>
            </div>
          </form>

          {/* Program budget summary pill */}
          {currentProgram && (
            <div
              style={{
                marginTop: "0.85rem",
                padding: "0.65rem 0.9rem",
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                fontSize: "0.78rem",
              }}
            >
              <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                <div>
                  <span style={{ color: "#64748b" }}>Program: </span>
                  <strong style={{ color: "#1e293b" }}>{currentProgram.name}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Program Budget: </span>
                  <strong style={{ color: "#1e293b" }}>
                    ₡{(currentProgram.budget || 0).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Projects Allocated: </span>
                  <strong style={{ color: "#6366f1" }}>
                    ₡{allocatedUnderSelectedProg.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Remaining Available: </span>
                  <strong
                    style={{
                      color: remainingProgBudget > 0 ? "#10b981" : "#ef4444",
                    }}
                  >
                    ₡{remainingProgBudget.toLocaleString()}
                  </strong>
                </div>
              </div>

              {Number(newCatBudget) > remainingProgBudget && (
                <span
                  style={{
                    color: "#dc2626",
                    fontWeight: "600",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <AlertCircle size={14} /> Budget exceeds remaining program budget!
                </span>
              )}
            </div>
          )}

          {formError && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.6rem 0.9rem",
                borderRadius: "0.5rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: "0.8rem",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <AlertCircle size={15} />
              {formError}
            </div>
          )}
        </div>

        {/* Search & Program Filter Controls */}
        <div
          style={{
            marginBottom: "1rem",
            display: "grid",
            gridTemplateColumns: "1fr 220px",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Search categories by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 1rem",
              border: "1px solid #cbd5e1",
              borderRadius: "0.5rem",
              background: "#fff",
              outline: "none",
              fontSize: "0.875rem",
            }}
          />

          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.85rem",
              border: "1px solid #cbd5e1",
              borderRadius: "0.5rem",
              background: "#fff",
              outline: "none",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#334155",
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

        {/* Categories Table */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "0.5rem",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div
              style={{
                padding: "2.5rem",
                textAlign: "center",
                color: "#64748b",
                fontSize: "0.9rem",
              }}
            >
              No categories found.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0",
                    fontSize: "0.775rem",
                  }}
                >
                  <th
                    style={{
                      padding: "1rem 1.25rem",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Category Name
                  </th>
                  <th
                    style={{
                      padding: "1rem 1.25rem",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Program
                  </th>
                  <th
                    style={{
                      padding: "1rem 1.25rem",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Scopes
                  </th>
                  <th
                    style={{
                      padding: "1rem 1.25rem",
                      textAlign: "right",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Budget
                  </th>
                  <th
                    style={{
                      padding: "1rem 1.25rem",
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, i) => (
                  <Fragment key={cat._id}>
                    <tr
                      style={{
                        fontSize: "0.875rem",
                        borderBottom: expandedScopes[cat._id]
                          ? "none"
                          : i < categories.length - 1
                            ? "1px solid #f1f5f9"
                            : "none",
                        backgroundColor: expandedScopes[cat._id]
                          ? "#fafbff"
                          : "#fff",
                      }}
                    >
                      {/* Category Name Column */}
                      <td
                        style={{
                          padding: "0.9rem 1.25rem",
                          color: "#334155",
                          fontWeight: "500",
                        }}
                      >
                        {editingCategoryId === cat._id ? (
                          <input
                            type="text"
                            value={editingCat}
                            onChange={(e) => {
                              setEditingCat(e.target.value);
                              setEditingError("");
                            }}
                            style={{
                              width: "140px",
                              padding: "0.4rem 0.6rem",
                              border: "1px solid #cbd5e1",
                              borderRadius: "0.35rem",
                              fontSize: "0.85rem",
                            }}
                          />
                        ) : (
                          <span style={{ textTransform: "capitalize" }}>
                            {cat.name}
                          </span>
                        )}
                      </td>

                      {/* Program Column */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        {editingCategoryId === cat._id ? (
                          <select
                            value={editingProg}
                            onChange={(e) => {
                              setEditingProg(e.target.value);
                              setEditingError("");
                            }}
                            style={{
                              padding: "0.4rem 0.6rem",
                              border: "1px solid #cbd5e1",
                              borderRadius: "0.35rem",
                              fontSize: "0.85rem",
                              background: "#fff",
                            }}
                          >
                            {programs.map((p) => (
                              <option key={p._id} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.25rem 0.65rem",
                              borderRadius: "9999px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              background: "#e0e7ff",
                              color: "#4338ca",
                              border: "1px solid #c7d2fe",
                            }}
                          >
                            {cat.program || "—"}
                          </span>
                        )}
                      </td>

                      {/* Scopes toggle Column */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <button
                          type="button"
                          onClick={() => toggleScopePanel(cat._id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontSize: "0.78rem",
                            fontWeight: "500",
                            color: "#4f46e5",
                            background: "#eef2ff",
                            border: "1px solid #c7d2fe",
                            borderRadius: "0.35rem",
                            padding: "0.3rem 0.65rem",
                            cursor: "pointer",
                          }}
                        >
                          {expandedScopes[cat._id] ? (
                            <ChevronDown size={13} />
                          ) : (
                            <ChevronRight size={13} />
                          )}
                          {cat.scopes?.length || 0} scope
                          {(cat.scopes?.length || 0) !== 1 ? "s" : ""}
                        </button>
                      </td>

                      {/* Budget Column */}
                      <td
                        style={{
                          padding: "0.9rem 1.25rem",
                          textAlign: "right",
                          color: "#475569",
                          fontWeight: "600",
                        }}
                      >
                        {editingCategoryId === cat._id ? (
                          <input
                            type="text"
                            value={editingBudget}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                setEditingBudget(value);
                                setEditingError("");
                              }
                            }}
                            style={{
                              width: "110px",
                              padding: "0.4rem 0.6rem",
                              border: "1px solid #cbd5e1",
                              borderRadius: "0.35rem",
                              textAlign: "right",
                              fontSize: "0.85rem",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <SaudiRiyal size={15} />{" "}
                            {(cat.budget ?? 0).toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td
                        style={{
                          padding: "0.9rem 1.25rem",
                          textAlign: "center",
                        }}
                      >
                        {editingCategoryId === cat._id ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "0.35rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                gap: "0.5rem",
                              }}
                            >
                              <button
                                onClick={() =>
                                  handleUpdate(
                                    cat._id,
                                    editingCat,
                                    editingBudget,
                                    editingProg,
                                  )
                                }
                                disabled={isUpdating}
                                style={{
                                  background: "#10b981",
                                  border: "none",
                                  color: "white",
                                  padding: "0.4rem 0.75rem",
                                  borderRadius: "0.35rem",
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                  fontWeight: "600",
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCategoryId(null);
                                  setEditingBudget("");
                                  setEditingCat("");
                                  setEditingProg("");
                                  setEditingError("");
                                }}
                                style={{
                                  background: "#f8fafc",
                                  border: "1px solid #cbd5e1",
                                  color: "#334155",
                                  padding: "0.4rem 0.75rem",
                                  borderRadius: "0.35rem",
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                  fontWeight: "600",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                            {editingError && (
                              <span
                                style={{
                                  color: "#dc2626",
                                  fontSize: "0.72rem",
                                  fontWeight: "500",
                                  maxWidth: "200px",
                                }}
                              >
                                {editingError}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <button
                              onClick={() => handleStartEdit(cat)}
                              disabled={isUpdating}
                              title="Edit Category"
                              style={{
                                background: "#eef2ff",
                                border: "1px solid #c7d2fe",
                                color: "#4338ca",
                                padding: "0.45rem 0.7rem",
                                borderRadius: "0.35rem",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                              }}
                            >
                              <Pen className="w-4 h-4" size={14} />
                            </button>
                            <button
                              onClick={() => setCatToDelete(cat)}
                              disabled={isDeleting}
                              title="Delete Category"
                              style={{
                                background: "#fee2e2",
                                border: "1px solid #fca5a5",
                                color: "#dc2626",
                                padding: "0.45rem 0.7rem",
                                borderRadius: "0.35rem",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: "500",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Scopes Panel */}
                    {expandedScopes[cat._id] && (
                      <tr
                        style={{
                          borderBottom:
                            i < categories.length - 1
                              ? "1px solid #e2e8f0"
                              : "none",
                          backgroundColor: "#f8faff",
                        }}
                      >
                        <td
                          colSpan={5}
                          style={{ padding: "0.5rem 1.5rem 1rem 2.5rem" }}
                        >
                          {/* Scope tags */}
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.4rem",
                              marginBottom: "0.75rem",
                              minHeight: "28px",
                            }}
                          >
                            {(cat.scopes || []).length === 0 ? (
                              <span
                                style={{
                                  fontSize: "0.78rem",
                                  color: "#94a3b8",
                                  fontStyle: "italic",
                                }}
                              >
                                No scopes yet — add one below
                              </span>
                            ) : (
                              (cat.scopes || []).map((scope) => (
                                <span
                                  key={scope}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    background: "#e0e7ff",
                                    color: "#3730a3",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    padding: "0.25rem 0.5rem 0.25rem 0.7rem",
                                    borderRadius: "9999px",
                                    border: "1px solid #c7d2fe",
                                  }}
                                >
                                  {scope}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteScope({
                                        id: cat._id,
                                        scopeName: scope,
                                      })
                                    }
                                    title="Remove scope"
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      color: "#6366f1",
                                      display: "flex",
                                      alignItems: "center",
                                      padding: 0,
                                      lineHeight: 1,
                                    }}
                                  >
                                    <X size={11} strokeWidth={2.5} />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>

                          {/* Add scope form */}
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="text"
                              placeholder="New scope name..."
                              value={newScopeInput[cat._id] || ""}
                              onChange={(e) =>
                                setNewScopeInput((prev) => ({
                                  ...prev,
                                  [cat._id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddScope(cat);
                                }
                              }}
                              style={{
                                padding: "0.4rem 0.75rem",
                                border: "1px solid #c7d2fe",
                                borderRadius: "0.4rem",
                                fontSize: "0.8rem",
                                outline: "none",
                                background: "#fff",
                                width: "220px",
                              }}
                              disabled={isAddingScope}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddScope(cat)}
                              disabled={
                                isAddingScope ||
                                !(newScopeInput[cat._id] || "").trim()
                              }
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                background: "#4f46e5",
                                color: "white",
                                border: "none",
                                borderRadius: "0.4rem",
                                padding: "0.4rem 0.85rem",
                                fontSize: "0.78rem",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              <Plus size={13} /> Add Scope
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!catToDelete}
        onClose={() => setCatToDelete(null)}
        onConfirm={() => {
          deleteCategory(catToDelete._id, {
            onSuccess: () => setCatToDelete(null),
          });
        }}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${catToDelete?.name}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
