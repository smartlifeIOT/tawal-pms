import { useState, useRef } from "react";
import { apiInstance } from "../service";
import { getFileLinkProps } from "../utils/files";
import toast from "react-hot-toast";
import {
  FileText,
  Upload,
  ExternalLink,
  Trash2,
  Loader2,
  Paperclip,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export default function WorkOrder({
  project,
  editMode,
  setForm,
  form,
  getWoStatusColor,
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const isWoRequested = editMode
    ? form.mapping?.woRequest?.status === "Requested"
    : project.mapping?.woRequest?.status === "Requested" ||
      Boolean(project.mapping?.woRequest?.fileUrl);

  const currentFileUrl = editMode
    ? form.mapping?.woRequest?.fileUrl
    : project.mapping?.woRequest?.fileUrl;

  const currentFileName = editMode
    ? form.mapping?.woRequest?.fileName ||
      (currentFileUrl ? currentFileUrl.split("/").pop() : "")
    : project.mapping?.woRequest?.fileName ||
      (currentFileUrl ? currentFileUrl.split("/").pop() : "");

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await apiInstance.post(`${API_BASE}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.url) {
        setForm((prev) => ({
          ...prev,
          mapping: {
            ...prev.mapping,
            woRequest: {
              ...prev.mapping?.woRequest,
              fileUrl: res.data.url,
              fileName: res.data.fileName || file.name,
            },
          },
        }));
        toast.success("Mapping file uploaded successfully");
      }
    } catch (error) {
      console.error("Upload failed", error);
      toast.error(
        error.response?.data?.message || "Failed to upload mapping file",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = () => {
    setForm((prev) => ({
      ...prev,
      mapping: {
        ...prev.mapping,
        woRequest: {
          ...prev.mapping?.woRequest,
          fileUrl: "",
          fileName: "",
        },
      },
    }));
    toast.success("Mapping file removed");
  };

  return (
    <div className="glass-panel" style={{ padding: "1.5rem", width: "100%" }}>
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>
        Mapping & Approvals
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* WO Request */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isWoRequested ? "1fr 1fr" : "1fr 1fr",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              WO Request
            </label>
            {editMode ? (
              <select
                className="form-select"
                value={form.mapping?.woRequest?.status || "Pending"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    mapping: {
                      ...form.mapping,
                      woRequest: {
                        ...form.mapping?.woRequest,
                        status: e.target.value,
                      },
                    },
                  })
                }
              >
                <option value="Pending">Pending</option>
                <option value="Requested">Requested</option>
              </select>
            ) : (
              <div style={{ fontSize: "0.8rem", display: "inline-block" }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: getWoStatusColor(
                      project.mapping?.woRequest?.status,
                    ),
                  }}
                >
                  {project.mapping?.woRequest?.status || "Pending"}
                </span>{" "}
              </div>
            )}
          </div>
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Date
            </label>
            {editMode ? (
              <input
                type="date"
                className="form-input"
                value={form.mapping?.woRequest?.date || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    mapping: {
                      ...form.mapping,
                      woRequest: {
                        ...form.mapping?.woRequest,
                        date: e.target.value,
                      },
                    },
                  })
                }
              />
            ) : (
              <div style={{ fontSize: "0.9rem" }}>
                {project.mapping?.woRequest?.date
                  ? new Date(
                      project.mapping.woRequest.date,
                    ).toLocaleDateString()
                  : "—"}
              </div>
            )}
          </div>
        </div>

        {/* Mapping File Upload / Display (Shown when WO Request is Requested or file exists) */}
        {isWoRequested && (
          <div
            style={{
              border: "1px dashed #cbd5e1",
              borderRadius: "0.5rem",
              padding: "0.85rem 1rem",
              backgroundColor: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label
                className="form-label"
                style={{
                  fontWeight: 600,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.85rem",
                  color: "#334155",
                }}
              >
                <Paperclip size={15} color="#6366f1" />
                Mapping File{" "}
                {editMode && <span style={{ color: "#ef4444" }}>*</span>}
              </label>

              {currentFileUrl && (
                <a
                  {...getFileLinkProps(currentFileUrl, currentFileName)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    fontSize: "0.78rem",
                    color: "#4f46e5",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  View File <ExternalLink size={13} />
                </a>
              )}
            </div>

            {editMode ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip,.rar"
                />

                {currentFileUrl ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.4rem",
                      padding: "0.5rem 0.75rem",
                      gap: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        overflow: "hidden",
                      }}
                    >
                      <FileText
                        size={18}
                        color="#4f46e5"
                        style={{ flexShrink: 0 }}
                      />
                      <span
                        style={{
                          fontSize: "0.82rem",
                          color: "#1e293b",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "200px",
                        }}
                        title={currentFileName}
                      >
                        {currentFileName}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                          background: "none",
                          border: "1px solid #cbd5e1",
                          borderRadius: "0.3rem",
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          color: "#475569",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        {uploading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Upload size={12} />
                        )}
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        style={{
                          background: "none",
                          border: "1px solid #fecaca",
                          borderRadius: "0.3rem",
                          padding: "0.2rem 0.4rem",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          color: "#ef4444",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        title="Remove mapping file"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        width: "100%",
                        padding: "0.6rem",
                        backgroundColor: "#ffffff",
                        border: "1px dashed #94a3b8",
                        borderRadius: "0.4rem",
                        color: "#475569",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = "#6366f1";
                        e.currentTarget.style.color = "#4f46e5";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = "#94a3b8";
                        e.currentTarget.style.color = "#475569";
                      }}
                    >
                      {uploading ? (
                        <>
                          <Loader2
                            size={15}
                            className="animate-spin"
                            color="#4f46e5"
                          />
                          <span>Uploading file...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={15} color="#6366f1" />
                          <span>Click to upload Mapping File</span>
                        </>
                      )}
                    </button>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "#94a3b8",
                        display: "block",
                        marginTop: "0.25rem",
                      }}
                    >
                      Supports PDF, Excel, Word, CAD, Images, CSV (up to 50MB)
                    </span>
                    {!currentFileUrl && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "#ef4444",
                          display: "block",
                          marginTop: "0.3rem",
                          fontWeight: 500,
                        }}
                      >
                        * Mapping file is required when WO Request is Requested
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {currentFileUrl ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.4rem",
                      padding: "0.45rem 0.75rem",
                    }}
                  >
                    <FileText size={16} color="#4f46e5" />
                    <a
                      {...getFileLinkProps(currentFileUrl, currentFileName)}
                      style={{
                        fontSize: "0.82rem",
                        color: "#4f46e5",
                        textDecoration: "none",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "280px",
                      }}
                      title={currentFileName}
                    >
                      {currentFileName}
                    </a>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontStyle: "italic",
                    }}
                  >
                    No mapping file attached
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* WO Issuance */}
        {(() => {
          const isApproved = editMode
            ? form.mapping?.woIssuance?.status === "Approved"
            : project.mapping?.woIssuance?.status === "Approved";

          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isApproved ? "1fr 1fr 1fr" : "1fr 1fr",
                gap: "1rem",
                alignItems: "start",
                borderTop: "1px solid #e2e8f0",
                paddingTop: "1rem",
              }}
            >
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  WO Issuance
                </label>
                {editMode ? (
                  <select
                    className="form-select"
                    value={form.mapping?.woIssuance?.status || "Pending"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        mapping: {
                          ...form.mapping,
                          woIssuance: {
                            ...form.mapping?.woIssuance,
                            status: e.target.value,
                          },
                        },
                      })
                    }
                  >
                    <option>Pending</option>
                    <option>Approved</option>
                  </select>
                ) : (
                  <div style={{ fontSize: "0.8rem", display: "inline-block" }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: getWoStatusColor(
                          project.mapping?.woIssuance?.status,
                        ),
                      }}
                    >
                      {project.mapping?.woIssuance?.status || "Pending"}
                    </span>{" "}
                  </div>
                )}
              </div>
              {isApproved && (
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    WO Number{" "}
                    {editMode && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>
                  {editMode ? (
                    <div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter WO Number"
                        value={form.mapping?.woIssuance?.woNumber || ""}
                        style={{
                          borderColor:
                            !form.mapping?.woIssuance?.woNumber?.trim()
                              ? "#fca5a5"
                              : undefined,
                        }}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            mapping: {
                              ...form.mapping,
                              woIssuance: {
                                ...form.mapping?.woIssuance,
                                woNumber: e.target.value,
                              },
                            },
                          })
                        }
                      />
                      {!form.mapping?.woIssuance?.woNumber?.trim() && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "#ef4444",
                            display: "block",
                            marginTop: "0.2rem",
                          }}
                        >
                          WO Number is required when Approved
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.9rem" }}>
                      {project.mapping?.woIssuance?.woNumber || "—"}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Date
                </label>
                {editMode ? (
                  <input
                    type="date"
                    className="form-input"
                    value={form.mapping?.woIssuance?.date || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        mapping: {
                          ...form.mapping,
                          woIssuance: {
                            ...form.mapping?.woIssuance,
                            date: e.target.value,
                          },
                        },
                      })
                    }
                  />
                ) : (
                  <div style={{ fontSize: "0.9rem" }}>
                    {project.mapping?.woIssuance?.date
                      ? new Date(
                          project.mapping.woIssuance.date,
                        ).toLocaleDateString()
                      : "—"}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Materials Request */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr  ",
            gap: "1rem",
            alignItems: "start",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "1rem",
          }}
        >
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Materials Request
            </label>
            {editMode ? (
              <select
                className="form-select"
                value={form.mapping?.materialsRequest?.status || "Pending"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    mapping: {
                      ...form.mapping,
                      materialsRequest: {
                        ...form.mapping?.materialsRequest,
                        status: e.target.value,
                      },
                    },
                  })
                }
              >
                <option>Pending</option>
                <option>Approved</option>
              </select>
            ) : (
              <div style={{ fontSize: "0.8rem", display: "inline-block" }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: getWoStatusColor(
                      project.mapping?.materialsRequest?.status,
                    ),
                  }}
                >
                  {project.mapping?.materialsRequest?.status || "Pending"}
                </span>{" "}
              </div>
            )}
          </div>
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Date
            </label>
            {editMode ? (
              <input
                type="date"
                className="form-input"
                value={form.mapping?.materialsRequest?.date || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    mapping: {
                      ...form.mapping,
                      materialsRequest: {
                        ...form.mapping?.materialsRequest,
                        date: e.target.value,
                      },
                    },
                  })
                }
              />
            ) : (
              <div style={{ fontSize: "0.9rem" }}>
                {project.mapping?.materialsRequest?.date
                  ? new Date(
                      project.mapping.materialsRequest.date,
                    ).toLocaleDateString()
                  : "—"}
              </div>
            )}
          </div>
        </div>

        {/* General Remarks */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
          <label className="form-label" style={{ fontWeight: 600 }}>
            General Remarks
          </label>
          {editMode ? (
            <textarea
              className="form-textarea"
              rows={2}
              value={form.mapping?.generalRemarks || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  mapping: {
                    ...form.mapping,
                    generalRemarks: e.target.value,
                  },
                })
              }
            ></textarea>
          ) : (
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {project.mapping?.generalRemarks || "—"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
