import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  Plus,
  Pen,
  Trash2,
  X,
  Check,
  FolderKanban,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import {
  usePrograms,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
} from "../hooks/project";
import ConfirmModal from "../components/ConfirmModal";
import { useDebounce } from "../hooks/useDebounce";

export default function Programs() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const { data: programs = [], isLoading } = usePrograms(debouncedSearchQuery);
  const { mutate: createProgram, isLoading: isCreating } = useCreateProgram();
  const { mutate: updateProgram, isLoading: isUpdating } = useUpdateProgram();
  const { mutate: deleteProgram, isLoading: isDeleting } = useDeleteProgram();

  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [programToDelete, setProgramToDelete] = useState(null);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingBudget, setEditingBudget] = useState("");
  const [editingDesc, setEditingDesc] = useState("");

  const handleStartEdit = (program) => {
    setEditingId(program._id);
    setEditingName(program.name);
    setEditingBudget(program.budget?.toString() || "0");
    setEditingDesc(program.description || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingBudget("");
    setEditingDesc("");
  };

  const handleSaveEdit = (id) => {
    if (!editingName.trim()) return;
    updateProgram(
      {
        id,
        name: editingName.trim(),
        budget: Number(editingBudget) || 0,
        description: editingDesc.trim(),
      },
      {
        onSuccess: () => {
          handleCancelEdit();
        },
      },
    );
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createProgram(
      {
        name: newName.trim(),
        budget: Number(newBudget) || 0,
        description: newDesc.trim(),
      },
      {
        onSuccess: () => {
          setNewName("");
          setNewBudget("");
          setNewDesc("");
        },
      },
    );
  };

  if (user?.role !== "Admin" && user?.role !== "Manager") {
    return (
      <div className="page-content">
        <h2 className="text-2xl font-bold mb-4">Manage Programs</h2>
        <p className="text-red-500">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingBottom: "3rem" }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Manage Programs</h2>
          <p
            style={{
              color: "#64748b",
              fontSize: "0.875rem",
              margin: "0.25rem 0 0",
            }}
          >
            Create and organize project programs to group and track initiatives.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "900px" }}>
        {/* Create Program Form */}
        <form
          onSubmit={handleAdd}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 2fr auto",
            gap: "0.75rem",
            marginBottom: "1.5rem",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="New Program Name (e.g. ABCD)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{
              padding: "0.6rem 1rem",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              background: "#fff",
              fontSize: "0.875rem",
            }}
            disabled={isCreating}
          />
          <input
            type="text"
            placeholder="Budget (&#x20C1;)"
            value={newBudget}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                setNewBudget(val);
              }
            }}
            style={{
              padding: "0.6rem 1rem",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              background: "#fff",
              fontSize: "0.875rem",
            }}
            disabled={isCreating}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            style={{
              padding: "0.6rem 1rem",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              background: "#fff",
              fontSize: "0.875rem",
            }}
            disabled={isCreating}
          />
          <button
            type="submit"
            disabled={isCreating || !newName.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.6rem 1.2rem",
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: isCreating || !newName.trim() ? "not-allowed" : "pointer",
              fontWeight: "600",
              fontSize: "0.875rem",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={18} /> Add Program
          </button>
        </form>

        {/* Search */}
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Search programs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 1rem",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              background: "#fff",
              outline: "none",
              fontSize: "0.875rem",
            }}
          />
        </div>

        {/* Programs Table */}
        <div
          style={{
            background: "#fff",
            borderRadius: "0.5rem",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          {isLoading ? (
            <div
              style={{
                padding: "2.5rem",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              Loading programs...
            </div>
          ) : programs.length === 0 ? (
            <div
              style={{
                padding: "2.5rem",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              No programs found. Create your first program above!
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    color: "#475569",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "0.85rem 1rem", fontWeight: "600" }}>
                    Program Name
                  </th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: "600" }}>
                    Description
                  </th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: "600" }}>
                    Projects
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 1rem",
                      fontWeight: "600",
                      textAlign: "right",
                    }}
                  >
                    Budget
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 1rem",
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => {
                  const isEditing = editingId === program._id;
                  return (
                    <tr
                      key={program._id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Name */}
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          fontWeight: "600",
                          color: "#1e293b",
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            style={{
                              padding: "0.35rem 0.6rem",
                              borderRadius: "0.35rem",
                              border: "1px solid #cbd5e1",
                              width: "100%",
                              fontSize: "0.875rem",
                            }}
                          />
                        ) : (
                          <Link
                            to={`/program/${encodeURIComponent(program.name)}`}
                            style={{
                              color: "#4338ca",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                            }}
                          >
                            <Layers size={16} />
                            <span>{program.name}</span>
                          </Link>
                        )}
                      </td>

                      {/* Description */}
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          color: "#64748b",
                          maxWidth: "260px",
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingDesc}
                            onChange={(e) => setEditingDesc(e.target.value)}
                            placeholder="Description"
                            style={{
                              padding: "0.35rem 0.6rem",
                              borderRadius: "0.35rem",
                              border: "1px solid #cbd5e1",
                              width: "100%",
                              fontSize: "0.875rem",
                            }}
                          />
                        ) : (
                          program.description || (
                            <span style={{ color: "#cbd5e1" }}>—</span>
                          )
                        )}
                      </td>

                      {/* Project count */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <Link
                          to={`/program/${encodeURIComponent(program.name)}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "9999px",
                            background: "#f1f5f9",
                            color: "#334155",
                            fontSize: "0.775rem",
                            fontWeight: "600",
                            textDecoration: "none",
                          }}
                        >
                          <FolderKanban size={13} color="#64748b" />
                          <span>{program.projectCount || 0}</span>
                        </Link>
                      </td>

                      {/* Budget */}
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          color: "#334155",
                          fontWeight: "600",
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingBudget}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                setEditingBudget(val);
                              }
                            }}
                            style={{
                              padding: "0.35rem 0.6rem",
                              borderRadius: "0.35rem",
                              border: "1px solid #cbd5e1",
                              width: "100px",
                              textAlign: "right",
                              fontSize: "0.875rem",
                            }}
                          />
                        ) : (
                          <span>
                            &#x20C1; {(program.budget || 0).toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        style={{ padding: "0.85rem 1rem", textAlign: "center" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "0.5rem",
                          }}
                        >
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(program._id)}
                                disabled={isUpdating}
                                style={{
                                  background: "#10b981",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "0.35rem",
                                  padding: "0.35rem 0.6rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                }}
                                title="Save"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                style={{
                                  background: "#94a3b8",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "0.35rem",
                                  padding: "0.35rem 0.6rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                }}
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <Link
                                to={`/program/${encodeURIComponent(program.name)}`}
                                style={{
                                  background: "#f1f5f9",
                                  color: "#475569",
                                  border: "none",
                                  borderRadius: "0.35rem",
                                  padding: "0.35rem 0.5rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                }}
                                title="View Projects"
                              >
                                <ExternalLink size={15} />
                              </Link>
                              <button
                                onClick={() => handleStartEdit(program)}
                                style={{
                                  background: "#e0e7ff",
                                  color: "#4338ca",
                                  border: "none",
                                  borderRadius: "0.35rem",
                                  padding: "0.35rem 0.5rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                }}
                                title="Edit"
                              >
                                <Pen size={15} />
                              </button>
                              {user?.role === "Admin" && (
                                <button
                                  onClick={() => setProgramToDelete(program)}
                                  disabled={isDeleting}
                                  style={{
                                    background: "#fee2e2",
                                    color: "#ef4444",
                                    border: "none",
                                    borderRadius: "0.35rem",
                                    padding: "0.35rem 0.5rem",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                  }}
                                  title="Delete"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!programToDelete}
        onClose={() => setProgramToDelete(null)}
        onConfirm={() => {
          if (programToDelete) {
            deleteProgram(programToDelete._id, {
              onSuccess: () => setProgramToDelete(null),
            });
          }
        }}
        title="Delete Program"
        message={`Are you sure you want to delete program "${programToDelete?.name}"? Any linked projects will have their program unassigned.`}
        confirmText="Delete Program"
        cancelText="Cancel"
      />
    </div>
  );
}
