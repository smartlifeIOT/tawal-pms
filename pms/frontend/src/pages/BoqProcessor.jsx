import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCheck,
  Download,
  LayoutDashboard,
  Loader2,
  RotateCcw,
  Search,
  Tag,
  X,
} from "lucide-react";
import UploadZone from "../components/boq/UploadZone";
import DataTable from "../components/boq/DataTable";
import MetricCard from "../components/boq/MetricCard";
import StepIndicator from "../components/boq/StepIndicator";
import {
  parseWorkbook,
  processWorkbook,
  buildOutputWorkbook,
  downloadWorkbook,
  extractTawalIds,
  extractAvailableCategories,
  findTawalIdKey,
  workbookToFile,
  extractStcIds,
} from "../utils/boqExcel";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiInstance } from "../service";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const todayIso = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const STEPS = [
  { label: "Upload", description: "Select workbook" },
  { label: "Configure", description: "Filter and preview" },
  { label: "Export", description: "Download results" },
];

const PREVIEW_COLS = [
  "TAWAL ID",
  "site Name",
  "RMS",
  "Expander",
  "Smart Meter",
  "Smart Lock for New Request",
  "New Smart Lock Cabinets",
];

// Cycles through for as many categories as Sheet 2 happens to have. The
// palette matches the status colours defined in index.css.
const CAT_COLORS = [
  "pill-mapping",
  "pill-integration",
  "pill-installation",
  "pill-completed",
  "pill-closeout",
  "pill-planning",
];

export default function BoqProcessor() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [workbookData, setWorkbookData] = useState(null);
  const [rawBuffer, setRawBuffer] = useState(null);
  const [fileName, setFileName] = useState("");
  const [tawalIds, setTawalIds] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectValue, setSelectValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("output");

  // WO Request sync (projects matched by STC ID)
  const queryClient = useQueryClient();
  const [woSync, setWoSync] = useState({ state: "idle" });

  // Filtered dropdown options based on search query
  const filteredDropdownIds = useMemo(() => {
    if (!searchQuery.trim()) return tawalIds;
    const q = searchQuery.trim().toLowerCase();
    return tawalIds.filter((id) => id.toLowerCase().includes(q));
  }, [tawalIds, searchQuery]);

  const handleFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const data = parseWorkbook(buffer);
      const tawalKey = findTawalIdKey(data.sheet1);
      const ids = tawalKey ? extractTawalIds(data.sheet1, tawalKey) : [];
      const cats = extractAvailableCategories(data.sheet2);
      setWorkbookData(data);
      setRawBuffer(buffer);
      setFileName(file.name);
      setTawalIds(ids);
      setAvailableCategories(cats);
      setSelectedCategories(cats); // all selected by default
      setSelectedIds([]);
      setStep(1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const addId = () => {
    if (!selectValue || selectedIds.includes(selectValue)) return;
    setSelectedIds((prev) => [...prev, selectValue]);
    setSelectValue("");
    setSearchQuery("");
  };

  const addAllFiltered = () => {
    const toAdd = filteredDropdownIds.filter((id) => !selectedIds.includes(id));
    if (!toAdd.length) return;
    setSelectedIds((prev) => [...prev, ...toAdd]);
    setSelectValue("");
    setSearchQuery("");
  };

  const removeId = (id) =>
    setSelectedIds((prev) => prev.filter((x) => x !== id));

  const filteredPreview = () => {
    if (!workbookData) return [];
    const tawalKey = findTawalIdKey(workbookData.sheet1);
    const rows = !selectedIds.length
      ? workbookData.sheet1
      : workbookData.sheet1.filter((r) =>
          selectedIds.includes(String(r[tawalKey ?? ""] ?? "").trim()),
        );
    return rows.map((r) => {
      const out = {};
      for (const col of PREVIEW_COLS) {
        const k = Object.keys(r).find(
          (key) => key.toLowerCase().trim() === col.toLowerCase().trim(),
        );
        out[col] = k ? r[k] : "";
      }
      return out;
    });
  };

  const outputFileName = () =>
    fileName.replace(/\.(xlsx|xls)$/i, "") + "_combined_output.xlsx";

  // Once the Final Sheet exists: upload the generated workbook, then mark the
  // WO Request as "Requested" (dated today, file attached) on every project
  // whose Site ID matches an STC ID from the sheet.
  const syncWoRequests = async (res) => {
    const stcIds = extractStcIds(res.outputRows);
    if (!stcIds.length) {
      setWoSync({
        state: "skipped",
        message: "No STC IDs found in the Final Sheet, so no projects were updated.",
      });
      return;
    }

    setWoSync({ state: "loading", stcIds });
    try {
      const wb = buildOutputWorkbook(rawBuffer, res.outputRows);
      const file = workbookToFile(wb, outputFileName());

      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await apiInstance.post(`${API_BASE}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { data } = await apiInstance.post(
        `${API_BASE}/projects/boq/wo-request`,
        {
          stcIds,
          fileUrl: uploadRes.data.url,
          fileName: uploadRes.data.fileName || file.name,
          date: todayIso(),
        },
      );

      setWoSync({ state: "done", stcIds, ...data });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      if (data.updatedCount > 0) {
        toast.success(data.message);
      } else {
        toast.error("No projects matched the STC IDs in this sheet");
      }
    } catch (e) {
      const message =
        e.response?.data?.message || e.message || "Failed to update projects";
      setWoSync({ state: "error", stcIds, message });
      toast.error(message);
    }
  };

  const handleGenerate = () => {
    if (!workbookData) return;
    if (selectedCategories.length === 0) {
      setError("Select at least one category to process.");
      return;
    }
    setLoading(true);
    setError(null);
    let res = null;
    try {
      res = processWorkbook(workbookData, selectedIds, selectedCategories);
      setResult(res);
      setActiveTab("output");
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    if (res) syncWoRequests(res);
  };

  const handleDownload = () => {
    if (!rawBuffer || !result) return;
    const wb = buildOutputWorkbook(rawBuffer, result.outputRows);
    downloadWorkbook(wb, outputFileName());
  };

  const handleReset = () => {
    setStep(0);
    setWorkbookData(null);
    setRawBuffer(null);
    setFileName("");
    setTawalIds([]);
    setAvailableCategories([]);
    setSelectedCategories([]);
    setSelectedIds([]);
    setResult(null);
    setWoSync({ state: "idle" });
    setError(null);
    setSelectValue("");
    setSearchQuery("");
  };

  const allCatsSelected =
    selectedCategories.length === availableCategories.length;
  const allIdsSelected =
    tawalIds.length > 0 && selectedIds.length === tawalIds.length;

  return (
    <div className="boq-page">
      <div className="boq-header">
        <StepIndicator steps={STEPS} current={step} />
        {step > 0 && (
          <button type="button" onClick={handleReset} className="tool-link-btn">
            <RotateCcw size={13} />
            Start over
          </button>
        )}
      </div>

      {error && (
        <div className="tool-alert tool-alert-danger">
          <AlertCircle size={16} />
          <p style={{ margin: 0, color: "inherit" }}>{error}</p>
        </div>
      )}

      {step === 0 && (
        <div className="boq-stack">
          <UploadZone onFile={handleFile} loading={loading} />

          <div className="glass-panel">
            <div className="tool-panel-title" style={{ marginBottom: "1rem" }}>
              <LayoutDashboard size={16} />
              Expected structure
            </div>
            <div className="boq-structure-grid">
              <div>
                <p className="boq-sheet-heading">
                  <span className="boq-sheet-number">1</span>
                  Site data
                </p>
                <ul className="boq-col-list">
                  {[
                    "TAWAL ID",
                    "RMS",
                    "Expander",
                    "Smart Meter",
                    "Smart Lock for New Request",
                    "plus the output columns",
                  ].map((c) => (
                    <li key={c}>
                      <span className="boq-col-dot" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="boq-sheet-heading">
                  <span className="boq-sheet-number alt">2</span>
                  Categories
                </p>
                <ul className="boq-col-list">
                  {[
                    "Categories column",
                    "RMS",
                    "Expander",
                    "Smart Meter",
                    "Smart Lock for New Request",
                  ].map((c, i) => (
                    <li key={c}>
                      <span
                        className="boq-col-dot alt"
                        style={{ visibility: i === 0 ? "hidden" : "visible" }}
                      />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 1 && workbookData && (
        <div className="boq-stack">
          {/* File info banner */}
          <div className="glass-panel flex-between" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div className="boq-file-icon">✓</div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {fileName}
                </p>
                <p className="tool-muted" style={{ margin: 0 }}>
                  {workbookData.sheet1.length} rows in sheet 1 ·{" "}
                  {workbookData.sheet2.length} category rows in sheet 2
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {workbookData.allSheetNames.map((n) => (
                <span key={n} className="badge-outline">
                  {n}
                </span>
              ))}
            </div>
          </div>

          {/* Category selection */}
          {availableCategories.length > 0 && (
            <div className="glass-panel">
              <div className="flex-between">
                <div className="tool-panel-title">
                  <Tag size={16} />
                  Categories to include
                  <span className="tool-count-pill">
                    {selectedCategories.length}/{availableCategories.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    allCatsSelected
                      ? setSelectedCategories([])
                      : setSelectedCategories([...availableCategories])
                  }
                  className="tool-link-btn"
                >
                  {allCatsSelected ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div className="boq-cat-grid">
                {availableCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`boq-cat-btn${isSelected ? " selected" : ""}`}
                    >
                      <span className="boq-cat-box">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>

              {selectedCategories.length === 0 && (
                <p className="boq-inline-warning">
                  <AlertCircle size={14} />
                  Select at least one category to generate output.
                </p>
              )}
            </div>
          )}

          {/* TAWAL ID filter */}
          <div className="glass-panel">
            <div className="flex-between">
              <div className="tool-panel-title">Filter by TAWAL ID</div>
              {tawalIds.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    allIdsSelected ? setSelectedIds([]) : setSelectedIds([...tawalIds])
                  }
                  className="tool-link-btn"
                >
                  {allIdsSelected ? "Clear all" : "Select all"}
                </button>
              )}
            </div>

            <div className="boq-search">
              <Search size={15} className="boq-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectValue("");
                }}
                placeholder="Search TAWAL IDs…"
                className="form-input"
                style={{ paddingLeft: "2.25rem" }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectValue("");
                  }}
                  className="boq-search-clear"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <div className="flex-between" style={{ marginTop: "0.6rem" }}>
                <p className="tool-muted" style={{ margin: 0 }}>
                  {filteredDropdownIds.length === 0
                    ? "No IDs match your search"
                    : `${filteredDropdownIds.length} ID${
                        filteredDropdownIds.length !== 1 ? "s" : ""
                      } matching`}
                </p>
                {filteredDropdownIds.length > 0 && (
                  <button
                    type="button"
                    onClick={addAllFiltered}
                    className="tool-link-btn"
                  >
                    Add all {filteredDropdownIds.length}
                  </button>
                )}
              </div>
            )}

            <div className="boq-picker">
              <div style={{ position: "relative", flex: 1 }}>
                <select
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                  className="form-select"
                  style={{ appearance: "none", paddingRight: "2.5rem" }}
                >
                  <option value="">
                    {searchQuery.trim()
                      ? filteredDropdownIds.length
                        ? `${filteredDropdownIds.length} result${
                            filteredDropdownIds.length !== 1 ? "s" : ""
                          } — pick one…`
                        : "No matches found"
                      : "Select a TAWAL ID…"}
                  </option>
                  {filteredDropdownIds.map((id) => (
                    <option
                      key={id}
                      value={id}
                      disabled={selectedIds.includes(id)}
                    >
                      {id}
                      {selectedIds.includes(id) ? " ✓" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={17} className="boq-select-caret" />
              </div>
              <button
                type="button"
                onClick={addId}
                disabled={!selectValue}
                className="btn btn-primary"
                style={{
                  opacity: selectValue ? 1 : 0.45,
                  cursor: selectValue ? "pointer" : "not-allowed",
                }}
              >
                Add
              </button>
            </div>

            {selectedIds.length > 0 ? (
              <div className="boq-chips">
                {selectedIds.map((id) => (
                  <span key={id} className="boq-chip">
                    {id}
                    <button
                      type="button"
                      onClick={() => removeId(id)}
                      aria-label={`Remove ${id}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="tool-muted" style={{ marginTop: "0.75rem" }}>
                No filter — all {workbookData.sheet1.length} rows will be
                processed.
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="glass-panel">
            <div className="flex-between">
              <div className="tool-panel-title">Preview</div>
              <span className="tool-count-pill">
                {filteredPreview().length} rows
              </span>
            </div>
            <DataTable rows={filteredPreview()} maxRows={10} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || selectedCategories.length === 0}
              className="btn btn-primary"
              style={{
                opacity: loading || selectedCategories.length === 0 ? 0.5 : 1,
                cursor:
                  loading || selectedCategories.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Generate combined output
              <ArrowRight size={15} />
            </button>
            {selectedCategories.length > 0 && (
              <p className="tool-muted" style={{ margin: 0 }}>
                Processing {selectedCategories.length} categor
                {selectedCategories.length !== 1 ? "ies" : "y"}
              </p>
            )}
          </div>
        </div>
      )}

      {step === 2 && result && workbookData && (
        <div className="boq-stack">
          <div className="boq-metrics">
            <MetricCard value={result.filteredCount} label="Filtered rows" />
            <MetricCard
              value={result.outputRows.length}
              label="Combined rows"
              accent
            />
            <MetricCard
              value={result.uniqueTawalIds.length}
              label="Unique TAWAL IDs"
            />
            <MetricCard
              value={result.uniqueCategories.length}
              label="Categories matched"
            />
          </div>

          {woSync.state !== "idle" && (
            <div className="glass-panel">
              <div className="flex-between">
                <div className="tool-panel-title">
                  <ClipboardCheck size={16} />
                  WO Request update
                  {woSync.state === "done" && (
                    <span className="tool-count-pill">
                      {woSync.updatedCount}/{woSync.stcIds.length}
                    </span>
                  )}
                </div>
                {woSync.state === "error" && (
                  <button
                    type="button"
                    onClick={() => syncWoRequests(result)}
                    className="tool-link-btn"
                  >
                    <RotateCcw size={13} />
                    Retry
                  </button>
                )}
              </div>

              {woSync.state === "loading" && (
                <p className="tool-muted" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Loader2 size={14} className="animate-spin" />
                  Attaching the mapping file and setting WO Request to
                  "Requested" for {woSync.stcIds.length} STC ID
                  {woSync.stcIds.length !== 1 ? "s" : ""}…
                </p>
              )}

              {woSync.state === "skipped" && (
                <p className="tool-muted">{woSync.message}</p>
              )}

              {woSync.state === "error" && (
                <div className="tool-alert tool-alert-danger" style={{ marginTop: "0.75rem" }}>
                  <AlertCircle size={16} />
                  <p style={{ margin: 0, color: "inherit" }}>{woSync.message}</p>
                </div>
              )}

              {woSync.state === "done" && (
                <>
                  {woSync.updated.length > 0 && (
                    <div className="tool-alert tool-alert-success" style={{ marginTop: "0.75rem" }}>
                      <Check size={16} />
                      <p style={{ margin: 0, color: "inherit" }}>
                        WO Request set to "Requested" (dated today, mapping
                        file attached) for {woSync.updated.length} project
                        {woSync.updated.length !== 1 ? "s" : ""}.
                      </p>
                    </div>
                  )}
                  {woSync.updated.length > 0 && (
                    <div className="boq-chips">
                      {woSync.updated.map((p) => (
                        <Link key={p._id} to={`/projects/${p._id}`} className="boq-chip" style={{ textDecoration: "none", paddingRight: "0.8rem" }}>
                          {p.siteId} · {p.title}
                        </Link>
                      ))}
                    </div>
                  )}
                  {woSync.unmatched.length > 0 && (
                    <>
                      <p className="boq-inline-warning">
                        <AlertCircle size={14} />
                        No project found with these STC IDs as Site ID:
                      </p>
                      <div className="boq-chips">
                        {woSync.unmatched.map((id) => (
                          <span key={id} className="boq-chip">{id}</span>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {result.uniqueCategories.length > 0 && (
            <div className="glass-panel">
              <div className="tool-panel-title" style={{ marginBottom: "0.75rem" }}>
                Categories matched
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {result.uniqueCategories.map((cat, i) => {
                  const idx = availableCategories.indexOf(cat);
                  const cls =
                    CAT_COLORS[(idx >= 0 ? idx : i) % CAT_COLORS.length];
                  return (
                    <span key={cat} className={`cell-badge ${cls}`}>
                      {cat}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="glass-panel">
            <div className="flex-between">
              <div className="tool-panel-title">Data preview</div>
              <div className="boq-tabs">
                {["output", "sheet1", "sheet2"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`boq-tab${activeTab === tab ? " active" : ""}`}
                  >
                    {tab === "output"
                      ? "Final Sheet"
                      : tab === "sheet1"
                        ? workbookData.sheet1Name
                        : workbookData.sheet2Name}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "output" && (
              <DataTable rows={result.outputRows} maxRows={20} highlightFirst />
            )}
            {activeTab === "sheet1" && (
              <DataTable rows={workbookData.sheet1} maxRows={20} />
            )}
            {activeTab === "sheet2" && (
              <DataTable rows={workbookData.sheet2} maxRows={20} />
            )}
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-primary"
            >
              <Download size={15} />
              Download workbook
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-outline"
            >
              Back to filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
