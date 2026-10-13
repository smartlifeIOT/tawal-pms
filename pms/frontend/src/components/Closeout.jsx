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

export default function Closeout({
  project,
  editMode,
  setForm,
  form,
  getWoStatusColor,
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const isPatApproved = editMode
    ? form.closeout?.patStatus?.status === "Approved"
    : project.closeout?.patStatus?.status === "Approved" ||
      Boolean(project.closeout?.patStatus?.fileUrl);

  const currentFileUrl = editMode
    ? form.closeout?.patStatus?.fileUrl
    : project.closeout?.patStatus?.fileUrl;

  const currentFileName = editMode
    ? form.closeout?.patStatus?.fileName ||
      (currentFileUrl ? currentFileUrl.split("/").pop() : "")
    : project.closeout?.patStatus?.fileName ||
      (currentFileUrl ? currentFileUrl.split("/").pop() : "");

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verify it's a PDF
    if (
      !file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf"
    ) {
      toast.error("Please upload a valid PDF file");
      return;
    }

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
          closeout: {
            ...prev.closeout,
            patStatus: {
              ...prev.closeout?.patStatus,
              fileUrl: res.data.url,
              fileName: res.data.fileName || file.name,
            },
          },
        }));
        toast.success("GCL PDF file uploaded successfully");
      }
    } catch (error) {
      console.error("Upload failed", error);
      toast.error(
        error.response?.data?.message || "Failed to upload GCL PDF file",
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
      closeout: {
        ...prev.closeout,
        patStatus: {
          ...prev.closeout?.patStatus,
          fileUrl: "",
          fileName: "",
        },
      },
    }));
    toast.success("GCL PDF file removed");
  };

  return (
    <div className="glass-panel" style={{ padding: "1.5rem", width: "100%" }}>
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Closeout</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* 4.1 PAT TCN */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr  ",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              4.1 PAT TCN
            </label>
            {editMode ? (
              <input
                type="text"
                className="form-input"
                placeholder="PAT TCN Number"
                value={form.closeout?.patTcn?.number || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    closeout: {
                      ...form.closeout,
                      patTcn: {
                        ...form.closeout?.patTcn,
                        number: e.target.value,
                      },
                    },
                  })
                }
              />
            ) : (
              <div style={{ fontSize: "0.9rem" }}>
                {project.closeout?.patTcn?.number || "—"}
              </div>
            )}
          </div>
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Status
            </label>
            {editMode ? (
              <select
                className="form-select"
                value={form.closeout?.patTcn?.status || "Pending"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    closeout: {
                      ...form.closeout,
                      patTcn: {
                        ...form.closeout?.patTcn,
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
                      project.closeout?.patTcn?.status,
                    ),
                  }}
                >
                  {project.closeout?.patTcn?.status || "Pending"}
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
                value={form.closeout?.patTcn?.date || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    closeout: {
                      ...form.closeout,
                      patTcn: {
                        ...form.closeout?.patTcn,
                        date: e.target.value,
                      },
                    },
                  })
                }
              />
            ) : (
              <div style={{ fontSize: "0.9rem" }}>
                {project.closeout?.patTcn?.date
                  ? new Date(project.closeout.patTcn.date).toLocaleDateString()
                  : "—"}
              </div>
            )}
          </div>
        </div>

        {/* 4.2 PAT status */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "1rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            <div>
              <label className="form-label" style={{ fontWeight: 600 }}>
                4.2 PAT status
              </label>
              {editMode ? (
                <select
                  className="form-select"
                  value={form.closeout?.patStatus?.status || "Pending"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      closeout: {
                        ...form.closeout,
                        patStatus: {
                          ...form.closeout?.patStatus,
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
                        project.closeout?.patStatus?.status,
                      ),
                    }}
                  >
                    {project.closeout?.patStatus?.status || "Pending"}
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
                  value={form.closeout?.patStatus?.date || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      closeout: {
                        ...form.closeout,
                        patStatus: {
                          ...form.closeout?.patStatus,
                          date: e.target.value,
                        },
                      },
                    })
                  }
                />
              ) : (
                <div style={{ fontSize: "0.9rem" }}>
                  {project.closeout?.patStatus?.date
                    ? new Date(
                        project.closeout.patStatus.date,
                      ).toLocaleDateString()
                    : "—"}
                </div>
              )}
            </div>
          </div>

          {/* GCL PDF Upload / Preview Section (Appears when PAT status is Approved) */}
          {isPatApproved && (
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "0.5rem",
                padding: "0.85rem 1rem",
                marginTop: "0.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: currentFileUrl ? "0.5rem" : "0",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Paperclip size={15} color="#4f46e5" />
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: "#1e293b",
                    }}
                  >
                    GCL PDF File
                  </span>
                </div>

                {editMode && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                    {!currentFileUrl ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="btn btn-outline"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.8rem",
                          backgroundColor: "#ffffff",
                        }}
                      >
                        {uploading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />{" "}
                            Uploading PDF...
                          </>
                        ) : (
                          <>
                            <Upload size={14} /> Upload GCL PDF
                          </>
                        )}
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="btn btn-outline"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.75rem",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          {uploading ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Upload size={13} />
                          )}
                          Replace PDF
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          disabled={uploading}
                          className="btn btn-outline"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.75rem",
                            color: "#ef4444",
                            borderColor: "#fecaca",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* File Info display */}
              {currentFileUrl ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.35rem",
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
                      color="#ef4444"
                      style={{ flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: "0.82rem",
                        color: "#334155",
                        fontWeight: "500",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={currentFileName}
                    >
                      {currentFileName || "GCL_Document.pdf"}
                    </span>
                  </div>

                  <a
                    {...getFileLinkProps(currentFileUrl, currentFileName)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.78rem",
                      color: "#4f46e5",
                      fontWeight: "600",
                      textDecoration: "none",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "0.25rem",
                      backgroundColor: "#eef2ff",
                      flexShrink: 0,
                    }}
                  >
                    <ExternalLink size={13} /> View PDF
                  </a>
                </div>
              ) : (
                !editMode && (
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    No GCL PDF attached
                  </span>
                )
              )}
            </div>
          )}
        </div>

        {/* 4.3 Invoicing */}
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
              4.3 Invoicing
            </label>
            {editMode ? (
              <select
                className="form-select"
                value={form.closeout?.invoicing?.status || "Pending"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    closeout: {
                      ...form.closeout,
                      invoicing: {
                        ...form.closeout?.invoicing,
                        status: e.target.value,
                      },
                    },
                  })
                }
              >
                <option>Pending</option>
                <option>Completed</option>
              </select>
            ) : (
              <div style={{ fontSize: "0.8rem", display: "inline-block" }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: getWoStatusColor(
                      project.closeout?.invoicing?.status,
                    ),
                  }}
                >
                  {project.closeout?.invoicing?.status || "Pending"}
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
                value={form.closeout?.invoicing?.date || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    closeout: {
                      ...form.closeout,
                      invoicing: {
                        ...form.closeout?.invoicing,
                        date: e.target.value,
                      },
                    },
                  })
                }
              />
            ) : (
              <div style={{ fontSize: "0.9rem" }}>
                {project.closeout?.invoicing?.date
                  ? new Date(
                      project.closeout.invoicing.date,
                    ).toLocaleDateString()
                  : "—"}
              </div>
            )}
          </div>
        </div>

        {/* 4.4 Capitalisation Sheet update */}
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
              4.4 Capitalisation Sheet update
            </label>
            {editMode ? (
              <select
                className="form-select"
                value={
                  form.closeout?.capitalisationSheetUpdate?.status || "Pending"
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    closeout: {
                      ...form.closeout,
                      capitalisationSheetUpdate: {
                        ...form.closeout?.capitalisationSheetUpdate,
                        status: e.target.value,
                      },
                    },
                  })
                }
              >
                <option>Pending</option>
                <option>Completed</option>
              </select>
            ) : (
              <div style={{ fontSize: "0.8rem", display: "inline-block" }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: getWoStatusColor(
                      project.closeout?.capitalisationSheetUpdate?.status,
                    ),
                  }}
                >
                  {project.closeout?.capitalisationSheetUpdate?.status ||
                    "Pending"}
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
                value={form.closeout?.capitalisationSheetUpdate?.date || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    closeout: {
                      ...form.closeout,
                      capitalisationSheetUpdate: {
                        ...form.closeout?.capitalisationSheetUpdate,
                        date: e.target.value,
                      },
                    },
                  })
                }
              />
            ) : (
              <div style={{ fontSize: "0.9rem" }}>
                {project.closeout?.capitalisationSheetUpdate?.date
                  ? new Date(
                      project.closeout.capitalisationSheetUpdate.date,
                    ).toLocaleDateString()
                  : "—"}
              </div>
            )}
          </div>
        </div>

        {/* General Remarks */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
          <label className="form-label" style={{ fontWeight: 600 }}>
            ( Remarks )
          </label>
          {editMode ? (
            <textarea
              className="form-textarea"
              rows={2}
              value={form.closeout?.generalRemarks || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  closeout: {
                    ...form.closeout,
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
              {project.closeout?.generalRemarks || "—"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
