import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Layers, Plus, Search, Filter, FolderKanban } from "lucide-react";
import ProjectForm from "../components/ProjectForm";
import ProjectCard from "../components/ProjectCard";
import { useAuthStore } from "../store/authStore";
import {
  useProjectsByProgram,
  useCategories,
  usePrograms,
} from "../hooks/project";
import { useDebounce } from "../hooks/useDebounce";

export default function ProgramProjects() {
  const { programName: rawProgramName } = useParams();
  const programName = decodeURIComponent(rawProgramName || "");
  const { user } = useAuthStore();
  const canManage =
    user?.role === "Admin" || user?.role === "Manager" || user?.role === "PM";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const LIMIT = 20;

  const { data: programs = [] } = usePrograms();
  const currentProgram = programs.find(
    (p) => p.name.toLowerCase() === programName.toLowerCase(),
  );

  const { data: categories = [] } = useCategories();

  const { data: responseData, isLoading } = useProjectsByProgram(programName, {
    page,
    limit: LIMIT,
    category: categoryFilter,
    status: statusFilter,
    search: debouncedSearch,
  });

  const projects = responseData?.data || [];
  const totalPages = responseData?.meta?.totalPages || 1;
  const totalProjects = responseData?.meta?.total || 0;

  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  return (
    <div className="page-content" style={{ paddingBottom: "3rem" }}>
      {/* Program Header */}
      <div
        className="glass-panel"
        style={{
          padding: "1.5rem",
          marginBottom: "1.5rem",
          borderRadius: "0.75rem",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "#e0e7ff",
                  color: "#4338ca",
                }}
              >
                <Layers size={22} />
              </span>
              <div>
                <h1
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "800",
                    margin: 0,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {programName} Program
                </h1>
                <p
                  style={{
                    margin: "0.2rem 0 0",
                    fontSize: "0.85rem",
                    color: "#64748b",
                  }}
                >
                  {currentProgram?.description ||
                    "Manage and monitor all projects grouped under this program."}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: "1rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "9999px",
                  background: "#f1f5f9",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  color: "#334155",
                }}
              >
                <FolderKanban size={14} color="#64748b" />
                <span>
                  {totalProjects} {totalProjects === 1 ? "Project" : "Projects"}
                </span>
              </div>

              {currentProgram?.budget > 0 && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.3rem 0.8rem",
                    borderRadius: "9999px",
                    background: "#ecfdf5",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: "#065f46",
                  }}
                >
                  <span>
                    Program Budget: &#x20C1;{" "}
                    {currentProgram.budget.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {canManage && (
            <button
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.6rem 1.2rem",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
              }}
            >
              <Plus size={18} /> New Project
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder="Search projects by title, Site ID, or Tawal ID..."
            value={searchQuery}
            onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
            style={{
              width: "100%",
              padding: "0.55rem 1rem 0.55rem 2.2rem",
              borderRadius: "0.5rem",
              border: "1px solid #e2e8f0",
              background: "white",
              outline: "none",
              fontSize: "0.875rem",
            }}
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) =>
            handleFilterChange(setCategoryFilter)(e.target.value)
          }
          style={{
            padding: "0.55rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #e2e8f0",
            background: "white",
            outline: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            minWidth: "160px",
          }}
        >
          <option value="All Categories">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
          style={{
            padding: "0.55rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #e2e8f0",
            background: "white",
            outline: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
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
      </div>

      {/* Projects Grid / Content */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            borderRadius: "0.75rem",
          }}
        >
          <Layers size={48} color="#94a3b8" style={{ marginBottom: "1rem" }} />
          <h3
            style={{ fontSize: "1.1rem", fontWeight: "600", color: "#334155" }}
          >
            No projects found in {programName}
          </h3>
          <p
            style={{
              color: "#64748b",
              fontSize: "0.875rem",
              maxWidth: "400px",
              margin: "0.5rem auto 1.5rem",
            }}
          >
            {searchQuery ||
            categoryFilter !== "All Categories" ||
            statusFilter !== "All Statuses"
              ? "No projects match your active search and filter criteria."
              : "Get started by creating your first project under this program."}
          </p>
          {canManage && (
            <button
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Plus size={16} /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {projects.map((project, idx) => (
            <ProjectCard key={project._id || idx} proj={project} i={idx} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "1rem",
            marginTop: "2.5rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--surface-border, #e2e8f0)",
          }}
        >
          <button
            className="btn btn-outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: "0.4rem 1rem", fontSize: "0.875rem" }}
          >
            ← Previous
          </button>
          <span
            style={{
              fontSize: "0.875rem",
              color: "var(--text-secondary, #64748b)",
              fontWeight: "600",
            }}
          >
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: "0.4rem 1rem", fontSize: "0.875rem" }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Modal for creating a project under this program */}
      <ProjectForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialProgram={programName}
      />
    </div>
  );
}
