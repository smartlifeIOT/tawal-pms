import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import {
  useProjectsHook,
  useCategories,
  useUploadProjectsBulk,
  useBulkDeleteProjects,
  useProjectFilters,
} from "../hooks/project";
import ProjectForm from "../components/ProjectForm";
import ConfirmModal from "../components/ConfirmModal";
import Spinner from "../components/Spinner";
import { formatDate } from "../utils/date";
import {
  Download,
  FolderOpen,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  Clock,
  ArrowRight,
  MapPin,
  FileSpreadsheet,
} from "lucide-react";
import ProjectCard from "../components/ProjectCard";
import { getCatBadge, getPriorityBadge } from "../utils/helpers";
import { getStatusColor } from "../utils/statusColor";
import toast from "react-hot-toast";
import { parseProjectsFile, exportToExcel, exportToCSV } from "../utils/parse";
import { useDebounce } from "../hooks/useDebounce";

const AllProjects = () => {
  const uploadProjectsData = useUploadProjectsBulk();
  const bulkDeleteMutation = useBulkDeleteProjects();

  const { user } = useAuthStore();
  const canManageProjects =
    user?.role === "Admin" || user?.role === "Manager" || user?.role === "PM";
  const canDeleteProjects = user?.role === "Admin" || user?.role === "Manager";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("projects_view_mode") || "grid";
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [regionFilter, setRegionFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Sync viewMode preference to localStorage
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem("projects_view_mode", mode);
  };

  // Reset page and selection when any filter changes
  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
    setSelectedIds([]);
  };

  const handleLimitChange = (val) => {
    setLimit(val === "All" ? "All" : Number(val));
    setPage(1);
    setSelectedIds([]);
  };

  const {
    data: projectsData,
    isLoading,
    error,
  } = useProjectsHook({
    search: debouncedSearchQuery,
    category: categoryFilter,
    status: statusFilter,
    priority: priorityFilter,
    region: regionFilter,
    city: cityFilter,
    page,
    limit,
  });

  const projects = projectsData?.data || [];
  const countOfProjects = projectsData?.meta?.total || 0;
  const totalPages = projectsData?.meta?.totalPages || 1;
  const { data: categories = [] } = useCategories();
  const { data: filters } = useProjectFilters();
  const regions = filters?.regions || [];
  const cities = filters?.cities || [];

  // Clear selections when page changes or data refreshes
  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => projects.some((p) => p._id === id)),
    );
  }, [projects]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSelectAllOnPage = () => {
    if (
      projects.length > 0 &&
      selectedIds.length === projects.length &&
      projects.every((p) => selectedIds.includes(p._id))
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(projects.map((p) => p._id));
    }
  };

  const isAllSelected =
    projects.length > 0 && projects.every((p) => selectedIds.includes(p._id));

  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkDeleteMutation.mutateAsync(selectedIds);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err) {
      console.error("Bulk delete error", err);
    }
  };

  if (isLoading) {
    return <Spinner size="lg" text="Loading projects..." />;
  }
  if (error) {
    return (
      <div style={{ color: "red", textAlign: "center", padding: "3rem" }}>
        Failed to load projects.
      </div>
    );
  }

  return (
    <div>
      {/* Header section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.25rem", margin: 0, fontWeight: "700" }}>
            All Projects ({countOfProjects ?? 0})
          </h1>

          {/* View Mode Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#e2e8f0",
              borderRadius: "0.45rem",
              padding: "2px",
              gap: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => handleViewModeChange("grid")}
              title="Grid View"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.35rem 0.65rem",
                borderRadius: "0.35rem",
                border: "none",
                background: viewMode === "grid" ? "#ffffff" : "transparent",
                color: viewMode === "grid" ? "#4f46e5" : "#64748b",
                fontWeight: viewMode === "grid" ? "600" : "500",
                fontSize: "0.8rem",
                cursor: "pointer",
                boxShadow:
                  viewMode === "grid" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <LayoutGrid size={15} />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("list")}
              title="List View"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.35rem 0.65rem",
                borderRadius: "0.35rem",
                border: "none",
                background: viewMode === "list" ? "#ffffff" : "transparent",
                color: viewMode === "list" ? "#4f46e5" : "#64748b",
                fontWeight: viewMode === "list" ? "600" : "500",
                fontSize: "0.8rem",
                cursor: "pointer",
                boxShadow:
                  viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <ListIcon size={15} />
              <span>List</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        {canManageProjects && (
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              + New Project
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                  const parsed = await parseProjectsFile(file);
                  if (!parsed || parsed.length === 0) {
                    toast.error("No valid projects found in the uploaded file");
                    return;
                  }
                  await uploadProjectsData.mutateAsync({ projects: parsed });
                } catch (err) {
                  const msg =
                    err?.response?.data?.message ||
                    err.message ||
                    "Failed to process or upload file";
                  toast.error(msg);
                } finally {
                  e.target.value = "";
                }
              }}
            />
            <button
              className="btn btn-secondary"
              onClick={() =>
                fileInputRef.current && fileInputRef.current.click()
              }
              disabled={uploadProjectsData.isPending}
              title="Upload Excel (.xlsx, .xls) or CSV (.csv)"
            >
              {uploadProjectsData.isPending ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <FileSpreadsheet size={15} /> Upload Excel / CSV
                </>
              )}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => exportToExcel(projects, "projects_export.xlsx")}
              title="Download as Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} /> Export Excel
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => exportToCSV(projects, "projects_export.csv")}
              title="Download as CSV (.csv)"
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
        )}
      </div>
      {/* Bulk Action Toolbar (When 1 or more projects are selected) */}
      {selectedIds.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#eef2ff",
            border: "1px solid #c7d2fe",
            borderRadius: "0.6rem",
            padding: "0.75rem 1.25rem",
            marginBottom: "1.25rem",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: "600",
                color: "#3730a3",
              }}
            >
              {selectedIds.length} project{selectedIds.length > 1 ? "s" : ""}{" "}
              selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{
                background: "none",
                border: "none",
                color: "#6366f1",
                fontSize: "0.82rem",
                fontWeight: "500",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Deselect All
            </button>
          </div>

          {canDeleteProjects && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.85rem",
                padding: "0.45rem 1rem",
              }}
            >
              <Trash2 size={15} />
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      {/* Filters Section */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "220px" }}>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 1rem",
              borderRadius: "0.4rem",
              border: "1px solid #e2e8f0",
              background: "white",
              outline: "none",
            }}
          />
        </div>

        <select
          value={regionFilter}
          onChange={(e) => handleFilterChange(setRegionFilter)(e.target.value)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.4rem",
            border: "1px solid #e2e8f0",
            background: "white",
            outline: "none",
            cursor: "pointer",
            minWidth: "140px",
            color: regionFilter === "" ? "#94a3b8" : "inherit",
          }}
        >
          <option value="">All Regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={cityFilter}
          onChange={(e) => handleFilterChange(setCityFilter)(e.target.value)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.4rem",
            border: "1px solid #e2e8f0",
            background: "white",
            outline: "none",
            cursor: "pointer",
            minWidth: "140px",
            color: cityFilter === "" ? "#94a3b8" : "inherit",
          }}
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) =>
            handleFilterChange(setCategoryFilter)(e.target.value)
          }
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.4rem",
            border: "1px solid #e2e8f0",
            background: "white",
            outline: "none",
            cursor: "pointer",
            minWidth: "140px",
          }}
        >
          <option value="All Categories">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.4rem",
            border: "1px solid #e2e8f0",
            background: "white",
            outline: "none",
            cursor: "pointer",
            minWidth: "140px",
          }}
        >
          <option value="All Statuses">All Statuses</option>
          <option value="Initiation">Initiation</option>
          <option value="Mapping">Mapping</option>
          <option value="Installation">Installation</option>
          <option value="Integration">Integration</option>
          <option value="Closeout">Closeout</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) =>
            handleFilterChange(setPriorityFilter)(e.target.value)
          }
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.4rem",
            border: "1px solid #e2e8f0",
            background: "white",
            outline: "none",
            cursor: "pointer",
            minWidth: "140px",
          }}
        >
          <option value="All Priorities">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      {/* Main Content Area: Empty State / Grid View / List View */}
      {projects.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "#64748b",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <FolderOpen size={48} color="#94a3b8" />
          </div>
          <p style={{ fontSize: "1.1rem" }}>No projects match your filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {projects.map((proj, i) => (
            <ProjectCard
              key={proj._id || i}
              proj={proj}
              i={i}
              selectable={canDeleteProjects}
              isSelected={selectedIds.includes(proj._id)}
              onToggleSelect={handleToggleSelect}
              getCatBadge={getCatBadge}
              getPriorityBadge={getPriorityBadge}
              formatDate={formatDate}
            />
          ))}
        </div>
      ) : (
        /* List View (Table Layout) */
        <div
          className="glass-panel"
          style={{
            padding: 0,
            overflowX: "auto",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  color: "#475569",
                  fontWeight: "600",
                }}
              >
                {canDeleteProjects && (
                  <th
                    style={{
                      padding: "0.85rem 1rem",
                      width: "40px",
                      textAlign: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={handleSelectAllOnPage}
                      style={{
                        width: "16px",
                        height: "16px",
                        cursor: "pointer",
                        accentColor: "#4f46e5",
                      }}
                      title="Select all on this page"
                    />
                  </th>
                )}
                <th style={{ padding: "0.85rem 1rem" }}>Project</th>
                <th style={{ padding: "0.85rem 1rem" }}>Category</th>
                <th style={{ padding: "0.85rem 1rem" }}>Scope</th>
                <th style={{ padding: "0.85rem 1rem" }}>Status</th>
                <th style={{ padding: "0.85rem 1rem" }}>Priority</th>
                <th style={{ padding: "0.85rem 1rem" }}>Progress</th>
                <th style={{ padding: "0.85rem 1rem" }}>Location</th>
                <th style={{ padding: "0.85rem 1rem" }}>End Date</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((proj) => {
                const isSelected = selectedIds.includes(proj._id);
                const statusProgressMap = {
                  Initiation: 0,
                  Mapping: 20,
                  Installation: 40,
                  Integration: 65,
                  Closeout: 85,
                  Completed: 100,
                };
                const computedProgress =
                  statusProgressMap[proj.status] !== undefined
                    ? statusProgressMap[proj.status]
                    : proj.progress || 0;

                const isCompleted = proj.status === "Completed";
                const endDate = proj.endDate ? new Date(proj.endDate) : null;
                const isOverdue =
                  endDate && !isCompleted && new Date() > endDate;

                return (
                  <tr
                    key={proj._id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: isSelected ? "#f8faff" : "#ffffff",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = "#fcfcfd";
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = "#ffffff";
                    }}
                  >
                    {canDeleteProjects && (
                      <td
                        style={{ padding: "0.85rem 1rem", textAlign: "center" }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(proj._id)}
                          style={{
                            width: "16px",
                            height: "16px",
                            cursor: "pointer",
                            accentColor: "#4f46e5",
                          }}
                        />
                      </td>
                    )}
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Link
                        to={`/projects/${proj._id}`}
                        style={{
                          fontWeight: "600",
                          color: "#1e293b",
                          textDecoration: "none",
                          display: "block",
                        }}
                      >
                        {proj.title}
                      </Link>
                      {(proj.siteId || proj.tawalId) && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#64748b",
                            marginTop: "2px",
                          }}
                        >
                          {proj.siteId && <span>Site: {proj.siteId} </span>}
                          {proj.tawalId && <span>• Tawal: {proj.tawalId}</span>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span className={`badge ${getCatBadge(proj.category)}`}>
                        {proj.category || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      {proj.projectScope ? (
                        <span
                          style={{
                            display: "inline-block",
                            background: "#e0e7ff",
                            color: "#3730a3",
                            fontSize: "0.72rem",
                            fontWeight: "600",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "9999px",
                            border: "1px solid #c7d2fe",
                          }}
                        >
                          {proj.projectScope}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.15rem 0.55rem",
                          borderRadius: "9999px",
                          fontSize: "0.72rem",
                          fontWeight: "500",
                          backgroundColor: getStatusColor(proj.status),
                          color: "white",
                        }}
                      >
                        {proj.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span className={getPriorityBadge(proj.priority)}>
                        {proj.priority}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", minWidth: "120px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: "6px",
                            backgroundColor: "#e2e8f0",
                            borderRadius: "9999px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${computedProgress}%`,
                              height: "100%",
                              backgroundColor: "#4f46e5",
                              borderRadius: "9999px",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          {computedProgress}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "#475569" }}>
                      {proj.region || proj.city ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                          }}
                        >
                          <MapPin size={13} color="#94a3b8" />
                          <span>
                            {[proj.region, proj.city]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      {proj.endDate ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            color: isOverdue ? "#ef4444" : "#64748b",
                            fontWeight: isOverdue ? "600" : "normal",
                          }}
                        >
                          <Clock size={13} />
                          <span>{formatDate(proj.endDate)}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <Link
                        to={`/projects/${proj._id}`}
                        className="btn btn-outline"
                        style={{
                          padding: "0.3rem 0.65rem",
                          fontSize: "0.78rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          textDecoration: "none",
                        }}
                      >
                        View <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <ProjectForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Projects"
        message={`Are you sure you want to delete ${selectedIds.length} selected project(s)? This action cannot be undone.`}
        isLoading={bulkDeleteMutation.isPending}
      />

      {/* Pagination & Limit Controls */}
      {countOfProjects > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginTop: "2rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--surface-border)",
          }}
        >
          {/* Left: Limit selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                fontWeight: "500",
              }}
            >
              Show per page:
            </span>
            <select
              value={limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "0.4rem",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#1e293b",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="All">All</option>
            </select>
            <span
              style={{
                fontSize: "0.82rem",
                color: "#64748b",
                marginLeft: "0.25rem",
              }}
            >
              (Total {countOfProjects} projects)
            </span>
          </div>

          {/* Right: Page navigation (shown when not viewing All and totalPages > 1) */}
          {limit !== "All" && totalPages > 1 && (
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <button
                className="btn btn-outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: "0.35rem 0.85rem", fontSize: "0.85rem" }}
              >
                ← Previous
              </button>
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                }}
              >
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: "0.35rem 0.85rem", fontSize: "0.85rem" }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AllProjects;
