import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { parseWoSheet, downloadWoTemplate } from "../utils/woSheet";
import { useImportIssuedWo } from "../hooks/project";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
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

export default function ImportIssuedWoModal({ isOpen, onClose }) {
  const inputRef = useRef(null);
  const importMutation = useImportIssuedWo();

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const validRows = rows.filter((r) => !r.error);
  const invalidRows = rows.filter((r) => r.error);
  const busy = parsing || importMutation.isPending;

  const reset = () => {
    setFileName("");
    setRows([]);
    setParseError("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    if (importMutation.isPending) return;
    reset();
    onClose();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setParseError("");
    setResult(null);
    try {
      const parsed = await parseWoSheet(file);
      setFileName(file.name);
      setRows(parsed.rows);
      if (!parsed.rows.length) setParseError("No data rows found in the sheet.");
    } catch (err) {
      setRows([]);
      setFileName(file.name);
      setParseError(err.message || "Could not read the file.");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  const handleImport = async () => {
    if (!validRows.length) return;
    try {
      const data = await importMutation.mutateAsync({
        rows: validRows.map(({ rowNumber, siteId, woNumber, date }) => ({
          rowNumber,
          siteId,
          woNumber,
          date,
        })),
      });
      setResult(data);
      if (data.updatedCount > 0) toast.success(data.message);
      else toast.error("No projects matched the Site IDs in the sheet");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to import WO sheet");
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "760px", width: "100%", margin: "0 1rem", padding: "1.5rem" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
              Import Issued WO sheet
            </h3>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              Columns: <b>Site ID</b>, <b>WO Number</b>, <b>Date</b>. Each
              matching project gets WO Issuance set to <b>Approved</b> with that
              WO Number and date.
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
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          style={{ display: "none" }}
        />

        {/* File picker */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1.1rem" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {parsing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {fileName ? "Choose another file" : "Choose sheet"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={downloadWoTemplate}>
            <Download size={15} /> Download template
          </button>
          {fileName && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", color: "#334155" }}>
              <FileSpreadsheet size={15} color="#4f46e5" /> {fileName}
            </span>
          )}
        </div>

        {parseError && (
          <div className="tool-alert tool-alert-danger" style={{ marginTop: "1rem" }}>
            <AlertCircle size={16} />
            <p style={{ margin: 0, color: "inherit" }}>{parseError}</p>
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && !result && (
          <>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", fontSize: "0.82rem", color: "#475569" }}>
              <span><b style={{ color: "#16a34a" }}>{validRows.length}</b> ready</span>
              {invalidRows.length > 0 && (
                <span><b style={{ color: "#dc2626" }}>{invalidRows.length}</b> with problems (will be skipped)</span>
              )}
            </div>
            <div style={{ maxHeight: "320px", overflow: "auto", border: "1px solid #e2e8f0", borderRadius: "0.5rem", marginTop: "0.6rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Row</th>
                    <th style={th}>Site ID</th>
                    <th style={th}>WO Number</th>
                    <th style={th}>Date</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowNumber} style={{ background: r.error ? "#fef2f2" : undefined }}>
                      <td style={{ ...td, color: "#94a3b8" }}>{r.rowNumber}</td>
                      <td style={td}>{r.siteId || "—"}</td>
                      <td style={{ ...td, wordBreak: "break-all" }}>{r.woNumber || "—"}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(r.date)}</td>
                      <td style={{ ...td, color: "#dc2626", fontSize: "0.75rem" }}>{r.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
              Dates are shown as DD/MM/YYYY. Typed dates are read day-first —
              check them before importing.
            </p>
          </>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div className={`tool-alert ${result.updatedCount ? "tool-alert-success" : "tool-alert-danger"}`}>
              {result.updatedCount ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <p style={{ margin: 0, color: "inherit" }}>{result.message}</p>
            </div>
            {result.updated.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", maxHeight: "140px", overflow: "auto" }}>
                {result.updated.map((p) => (
                  <Link
                    key={p._id}
                    to={`/projects/${p._id}`}
                    onClick={handleClose}
                    style={{ ...chip, background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe" }}
                  >
                    {p.siteId} · {p.title}
                  </Link>
                ))}
              </div>
            )}
            {result.notFound.length > 0 && (
              <div>
                <p style={{ margin: "0 0 0.4rem", fontSize: "0.82rem", fontWeight: 600, color: "#b45309" }}>
                  No project found with these Site IDs:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {result.notFound.map((id) => (
                    <span key={id} style={{ ...chip, background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}>
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(result.invalid.length > 0 || invalidRows.length > 0) && (
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                {invalidRows.length + result.invalid.length} row(s) skipped due to missing or invalid data.
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
          {result ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={reset}>
                Import another sheet
              </button>
              <button type="button" className="btn btn-primary" onClick={handleClose}>
                Done
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={importMutation.isPending}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImport}
                disabled={!validRows.length || busy}
                style={{ opacity: !validRows.length || busy ? 0.5 : 1 }}
              >
                {importMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                Update {validRows.length || ""} site{validRows.length === 1 ? "" : "s"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
