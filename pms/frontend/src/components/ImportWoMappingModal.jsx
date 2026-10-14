import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { apiInstance } from "../service";
import {
  readMappingWorkbook,
  analyseSheet,
  groupRowsByProject,
  buildSiteFile,
  safeFileName,
} from "../utils/mappingSplit";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
const UPLOAD_CONCURRENCY = 3;

const todayIso = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const th = {
  textAlign: "left",
  padding: "0.5rem 0.6rem",
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  position: "sticky",
  top: 0,
};
const td = {
  padding: "0.45rem 0.6rem",
  fontSize: "0.82rem",
  color: "#1e293b",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
};
const chip = {
  display: "inline-flex",
  padding: "0.2rem 0.55rem",
  borderRadius: "999px",
  fontSize: "0.75rem",
  fontWeight: 600,
  textDecoration: "none",
};

export default function ImportWoMappingModal({ isOpen, onClose }) {
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheetName, setSheetName] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [groups, setGroups] = useState([]);
  const [unmatchedIds, setUnmatchedIds] = useState([]);
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const running = Boolean(progress);

  const reset = () => {
    setFile(null);
    setWorkbook(null);
    setSheetName("");
    setAnalysis(null);
    setGroups([]);
    setUnmatchedIds([]);
    setDate(todayIso());
    setError("");
    setProgress(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    if (running) return;
    reset();
    onClose();
  };

  // Analyse a sheet and match its rows to projects
  const loadSheet = async (wb, name) => {
    setLoading(true);
    setError("");
    setGroups([]);
    setUnmatchedIds([]);
    setAnalysis(null);
    try {
      const a = analyseSheet(wb, name);
      if (!a.rows.length) throw new Error(`No data rows with a Site ID in "${name}".`);
      const ids = [...new Set(a.rows.flatMap((r) => r.ids))];
      const { data } = await apiInstance.post(`${API_BASE}/projects/lookup-sites`, { ids });
      const grouped = groupRowsByProject(a, data.data || []);
      setAnalysis(a);
      setGroups(grouped.groups);
      setUnmatchedIds(grouped.unmatchedIds);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not read the sheet.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setResult(null);
    try {
      const { wb, defaultSheet } = await readMappingWorkbook(f);
      setFile(f);
      setWorkbook(wb);
      setSheetName(defaultSheet);
      await loadSheet(wb, defaultSheet);
    } catch (err) {
      setFile(f);
      setWorkbook(null);
      setError(err.message || "Could not read the file.");
    }
  };

  const handleSheetChange = async (name) => {
    setSheetName(name);
    await loadSheet(workbook, name);
  };

  const handleImport = async () => {
    if (!groups.length) return;
    const total = groups.length;
    let done = 0;
    setProgress({ done, total });

    const items = [];
    const failed = [];
    const queue = [...groups];

    const worker = async () => {
      while (queue.length) {
        const { project, rowIndexes } = queue.shift();
        const idForName = project.siteId || project.tawalId || project.title;
        const fileName = `${safeFileName(idForName)}_WO_mapping.xlsx`;
        try {
          const siteFile = buildSiteFile(workbook, sheetName, analysis, rowIndexes, fileName);
          const formData = new FormData();
          formData.append("file", siteFile);
          const res = await apiInstance.post(`${API_BASE}/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          items.push({ projectId: project._id, fileUrl: res.data.url, fileName });
        } catch (err) {
          failed.push({
            project,
            reason: err.response?.data?.message || err.message || "Upload failed",
          });
        } finally {
          done += 1;
          setProgress({ done, total });
        }
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(UPLOAD_CONCURRENCY, total) }, worker),
      );

      let data = { updated: [], failed: [], updatedCount: 0 };
      if (items.length) {
        const res = await apiInstance.post(`${API_BASE}/projects/bulk/wo-request`, {
          date,
          items,
        });
        data = res.data;
      }

      const byId = new Map(groups.map((g) => [String(g.project._id), g.project]));
      const allFailed = [
        ...failed,
        ...(data.failed || []).map((f) => ({
          project: byId.get(String(f.projectId)) || { title: f.projectId },
          reason: f.reason,
        })),
      ];

      setResult({ updated: data.updated || [], failed: allFailed });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });

      if (data.updatedCount) toast.success(`Mapping files attached to ${data.updatedCount} site(s)`);
      else toast.error("No sites were updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update sites");
      setError(err.response?.data?.message || err.message || "Failed to update sites");
    } finally {
      setProgress(null);
    }
  };

  const replacing = groups.filter((g) => g.project.currentFileName).length;

  return (
    <div className="modal-overlay" onClick={handleClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "820px", width: "100%", margin: "0 1rem", padding: "1.5rem" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
              Import WO Mapping File
            </h3>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              Upload a sheet covering many sites (e.g. the BOQ Final Sheet). It is
              split into one file per site by Site ID, each file is attached to
              its project as the mapping file, and WO Request is set to{" "}
              <b>Requested</b>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFile}
          style={{ display: "none" }}
        />

        {!result && (
          <>
            {/* File + sheet + date */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end", marginTop: "1.1rem" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => inputRef.current?.click()}
                disabled={loading || running}
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {file ? "Choose another file" : "Choose sheet"}
              </button>

              {workbook && workbook.SheetNames.length > 1 && (
                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>
                  Sheet
                  <select
                    className="form-select"
                    value={sheetName}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    disabled={loading || running}
                    style={{ minWidth: "160px" }}
                  >
                    {workbook.SheetNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              )}

              {groups.length > 0 && (
                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>
                  WO Request date
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={running}
                  />
                </label>
              )}
            </div>

            {file && (
              <p style={{ display: "flex", alignItems: "center", gap: "0.35rem", margin: "0.75rem 0 0", fontSize: "0.85rem", color: "#334155" }}>
                <FileSpreadsheet size={15} color="#4f46e5" /> {file.name}
                {analysis && (
                  <span style={{ color: "#94a3b8" }}>
                    · {analysis.rows.length} rows · matched on{" "}
                    {analysis.idCols.map((c) => c.name).join(" / ")}
                  </span>
                )}
              </p>
            )}

            {error && (
              <div className="tool-alert tool-alert-danger" style={{ marginTop: "1rem" }}>
                <AlertCircle size={16} />
                <p style={{ margin: 0, color: "inherit" }}>{error}</p>
              </div>
            )}

            {/* Preview */}
            {groups.length > 0 && (
              <>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem", fontSize: "0.82rem", color: "#475569" }}>
                  <span><b style={{ color: "#16a34a" }}>{groups.length}</b> site{groups.length !== 1 ? "s" : ""} matched — one file each</span>
                  {replacing > 0 && (
                    <span><b style={{ color: "#b45309" }}>{replacing}</b> already have a mapping file (will be replaced)</span>
                  )}
                </div>
                <div style={{ maxHeight: "300px", overflow: "auto", border: "1px solid #e2e8f0", borderRadius: "0.5rem", marginTop: "0.6rem" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>Project</th>
                        <th style={th}>Site ID</th>
                        <th style={th}>Tawal ID</th>
                        <th style={th}>Rows</th>
                        <th style={th}>Current WO Request</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map(({ project, rowIndexes }) => (
                        <tr key={project._id}>
                          <td style={{ ...td, fontWeight: 600 }}>{project.title}</td>
                          <td style={td}>{project.siteId || "—"}</td>
                          <td style={td}>{project.tawalId || "—"}</td>
                          <td style={td}>{rowIndexes.length}</td>
                          <td style={{ ...td, fontSize: "0.78rem" }}>
                            {project.woRequestStatus}
                            {project.currentFileName && (
                              <span style={{ display: "block", color: "#b45309" }}>
                                replaces {project.currentFileName}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {analysis && !loading && groups.length === 0 && !error && (
              <div className="tool-alert tool-alert-danger" style={{ marginTop: "1rem" }}>
                <AlertCircle size={16} />
                <p style={{ margin: 0, color: "inherit" }}>
                  None of the IDs in this sheet match a project's Site ID or Tawal ID.
                </p>
              </div>
            )}

            {unmatchedIds.length > 0 && (
              <div style={{ marginTop: "0.9rem" }}>
                <p style={{ margin: "0 0 0.4rem", fontSize: "0.82rem", fontWeight: 600, color: "#b45309" }}>
                  No project found for {unmatchedIds.length} ID{unmatchedIds.length !== 1 ? "s" : ""} (skipped):
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", maxHeight: "90px", overflow: "auto" }}>
                  {unmatchedIds.map((id) => (
                    <span key={id} style={{ ...chip, background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}>
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {progress && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#475569", marginBottom: "0.35rem" }}>
                  <span>Uploading site files…</span>
                  <span>{progress.done}/{progress.total}</span>
                </div>
                <div style={{ height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${(progress.done / progress.total) * 100}%`, height: "100%", background: "#4f46e5", transition: "width 0.2s" }} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div className={`tool-alert ${result.updated.length ? "tool-alert-success" : "tool-alert-danger"}`}>
              {result.updated.length ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <p style={{ margin: 0, color: "inherit" }}>
                WO Request set to "Requested" with its own mapping file for{" "}
                {result.updated.length} site{result.updated.length !== 1 ? "s" : ""}.
              </p>
            </div>
            {result.updated.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", maxHeight: "160px", overflow: "auto" }}>
                {result.updated.map((p) => (
                  <Link
                    key={p._id}
                    to={`/projects/${p._id}`}
                    onClick={handleClose}
                    style={{ ...chip, background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe" }}
                  >
                    {p.siteId || "—"} · {p.title}
                  </Link>
                ))}
              </div>
            )}
            {result.failed.length > 0 && (
              <div>
                <p style={{ margin: "0 0 0.4rem", fontSize: "0.82rem", fontWeight: 600, color: "#dc2626" }}>
                  Failed for {result.failed.length} site{result.failed.length !== 1 ? "s" : ""}:
                </p>
                <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.8rem", color: "#7f1d1d" }}>
                  {result.failed.map((f, i) => (
                    <li key={i}>
                      {f.project?.siteId || f.project?.title}: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
          {result ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={reset}>
                Import another file
              </button>
              <button type="button" className="btn btn-primary" onClick={handleClose}>
                Done
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={running}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImport}
                disabled={!groups.length || loading || running || !date}
                style={{ opacity: !groups.length || loading || running || !date ? 0.5 : 1 }}
              >
                {running && <Loader2 size={15} className="animate-spin" />}
                Upload {groups.length || ""} file{groups.length === 1 ? "" : "s"} &amp; set Requested
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
