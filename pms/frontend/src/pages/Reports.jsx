import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiInstance } from "../service/index";
import { useAuthStore } from "../store/authStore";
import { useCategories, usePrograms } from "../hooks/project";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

import {
  FileBarChart2,
  TrendingUp,
  SaudiRiyal,
  Download,
  CheckCircle,
  AlertTriangle,
  Activity,
  ChevronRight,
  BarChart2,
  Layers,
  Globe,
  FileSpreadsheet,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE;

// ─── Colour palettes ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Initiation: "#94a3b8",
  Mapping: "#4f46e5",
  Installation: "#f59e0b",
  Integration: "#8b5cf6",
  Closeout: "#f97316",
  Completed: "#10b981",
};
const PRIORITY_COLORS = {
  Low: "#10b981",
  Medium: "#f59e0b",
  High: "#ea580c",
  Critical: "#dc2626",
};
const PIPELINE_STATUS_COLORS = {
  Approved: "#10b981",
  Completed: "#10b981",
  Pending: "#f59e0b",
  "In Progress": "#3b82f6",
  Rejected: "#ef4444",
  "N/A": "#94a3b8",
};
const CHART_PALETTE = [
  "#4f46e5",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#ec4899",
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, isCurrency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        fontSize: 13,
      }}
    >
      {label && (
        <p style={{ fontWeight: 600, marginBottom: 6, color: "#1e293b" }}>
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <p
          key={i}
          style={{ color: entry.color || entry.fill, margin: "2px 0" }}
        >
          {entry.name}:{" "}
          <strong>
            {isCurrency
              ? `⃁ ${Number(entry.value).toLocaleString()}`
              : entry.value}
          </strong>
        </p>
      ))}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "#4f46e5", trend }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)")
      }
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${color}18`,
          }}
        >
          <Icon size={20} color={color} />
        </div>
        {trend !== undefined && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: trend >= 0 ? "#10b981" : "#ef4444",
            }}
          >
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: "0.73rem", color: "#94a3b8", marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline mini bar ────────────────────────────────────────────────────────
function PipelineBar({ data, total }) {
  const statusOrder = [
    "Approved",
    "Completed",
    "In Progress",
    "Pending",
    "Rejected",
    "N/A",
  ];
  const sorted = [...(data || [])].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
  );
  return (
    <div>
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        {sorted.map((s, i) => (
          <div
            key={i}
            style={{
              width: `${total > 0 ? (s.count / total) * 100 : 0}%`,
              background: PIPELINE_STATUS_COLORS[s.status] || "#94a3b8",
              transition: "width 0.4s",
            }}
            title={`${s.status}: ${s.count}`}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
        {sorted.map((s, i) => (
          <span
            key={i}
            style={{
              fontSize: 11,
              color: "#475569",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: PIPELINE_STATUS_COLORS[s.status] || "#94a3b8",
                display: "inline-block",
              }}
            />
            {s.status}: <strong>{s.count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar({ filters, setFilters, programs, categories }) {
  const inputStyle = {
    padding: "0.4rem 0.75rem",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: "0.8rem",
    background: "#fff",
    color: "#1e293b",
    outline: "none",
    cursor: "pointer",
  };

  const availableCategories = useMemo(() => {
    if (!filters.program || filters.program === "all") return categories;
    return categories.filter(
      (c) => !c.program || c.program === filters.program,
    );
  }, [categories, filters.program]);

  const handleProgramChange = (prog) => {
    setFilters((f) => {
      const next = { ...f, program: prog };
      if (prog !== "all" && f.category !== "all") {
        const matching = categories.filter(
          (c) => !c.program || c.program === prog,
        );
        if (!matching.some((c) => c.name === f.category)) {
          next.category = "all";
        }
      }
      return next;
    });
  };

  const hasActiveFilters =
    filters.program !== "all" ||
    filters.category !== "all" ||
    filters.status !== "all" ||
    filters.from ||
    filters.to;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "0.75rem 1rem",
        marginBottom: "1.25rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Program filter */}
      <select
        style={inputStyle}
        value={filters.program}
        onChange={(e) => handleProgramChange(e.target.value)}
      >
        <option value="all">All Programs</option>
        {programs.map((p) => (
          <option key={p._id || p.name} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Category filter */}
      <select
        style={inputStyle}
        value={filters.category}
        onChange={(e) =>
          setFilters((f) => ({ ...f, category: e.target.value }))
        }
      >
        <option value="all">All Categories</option>
        {availableCategories.map((c) => (
          <option key={c._id || c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Status filter */}
      <select
        style={inputStyle}
        value={filters.status}
        onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
      >
        <option value="all">All Statuses</option>
        {[
          "Initiation",
          "Mapping",
          "Installation",
          "Integration",
          "Closeout",
          "Completed",
        ].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* From date */}
      <input
        type="date"
        style={inputStyle}
        value={filters.from}
        onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
        title="From date"
      />

      {/* To date */}
      <input
        type="date"
        style={inputStyle}
        value={filters.to}
        onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
        title="To date"
      />

      {hasActiveFilters && (
        <button
          style={{
            ...inputStyle,
            color: "#ef4444",
            borderColor: "#fee2e2",
            cursor: "pointer",
          }}
          onClick={() =>
            setFilters({
              program: "all",
              category: "all",
              status: "all",
              from: "",
              to: "",
            })
          }
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.5rem 1rem",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontSize: "0.82rem",
        fontWeight: 600,
        transition: "all 0.18s",
        background: active ? "#4f46e5" : "transparent",
        color: active ? "#fff" : "#64748b",
      }}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

// ─── Donut label ──────────────────────────────────────────────────────────────
const RADIAN = Math.PI / 180;
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyChart({ label = "No data available" }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: 180,
        color: "#94a3b8",
        gap: 8,
      }}
    >
      <BarChart2 size={32} strokeWidth={1} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <h3
      style={{
        fontSize: "0.85rem",
        fontWeight: 700,
        color: "#1e293b",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "0.75rem",
        paddingBottom: "0.4rem",
        borderBottom: "2px solid #4f46e5",
        display: "inline-block",
      }}
    >
      {children}
    </h3>
  );
}

// ─── Excel export helper ──────────────────────────────────────────────────────
function downloadExcel(data, filename) {
  if (!data?.length) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const colWidths = Object.keys(data[0]).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => (row[key] != null ? String(row[key]).length : 0)),
    );
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  worksheet["!cols"] = colWidths;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Projects Report");
  XLSX.writeFile(
    workbook,
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}

// ─── CSV export helper ────────────────────────────────────────────────────────
function downloadCSV(data, filename) {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h] ?? "";
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      })
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Reports() {
  const { user } = useAuthStore();
  const { data: programs = [] } = usePrograms();
  const { data: categories = [] } = useCategories();
  const [activeTab, setActiveTab] = useState("summary");
  const [filters, setFilters] = useState({
    program: "all",
    category: "all",
    status: "all",
    from: "",
    to: "",
  });
  const isFullEditor = user?.role === "Admin" || user?.role === "PM";

  // Build query string from filters
  const qs = new URLSearchParams();
  if (filters.program && filters.program !== "all")
    qs.set("program", filters.program);
  if (filters.category !== "all") qs.set("category", filters.category);
  if (filters.status !== "all") qs.set("status", filters.status);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  const qstr = qs.toString();

  const fetchWithFilters = useCallback(
    (path) =>
      apiInstance
        .get(`${API_BASE}/reports/${path}${qstr ? `?${qstr}` : ""}`)
        .then((r) => r.data),
    [qstr],
  );

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ["reports-summary", qstr],
    queryFn: () => fetchWithFilters("summary"),
    staleTime: 2 * 60 * 1000,
  });

  const { data: pipeline, isLoading: pipeLoading } = useQuery({
    queryKey: ["reports-pipeline", qstr],
    queryFn: () => fetchWithFilters("pipeline"),
    enabled: activeTab === "pipeline",
    staleTime: 2 * 60 * 1000,
  });

  const { data: budget, isLoading: budLoading } = useQuery({
    queryKey: ["reports-budget", qstr],
    queryFn: () => fetchWithFilters("budget"),
    enabled: activeTab === "budget",
    staleTime: 2 * 60 * 1000,
  });

  const { data: timeline, isLoading: timeLoading } = useQuery({
    queryKey: ["reports-timeline", qstr],
    queryFn: () => fetchWithFilters("timeline"),
    enabled: activeTab === "timeline",
    staleTime: 2 * 60 * 1000,
  });

  const { refetch: fetchExport, isFetching: exportLoading } = useQuery({
    queryKey: ["reports-export", qstr],
    queryFn: () => fetchWithFilters("export"),
    enabled: false,
  });

  const panel = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  };

  // Selected Program and Category objects
  const selectedProgramObj = useMemo(() => {
    if (!filters.program || filters.program === "all") return null;
    return programs.find((p) => p.name === filters.program) || null;
  }, [programs, filters.program]);

  const selectedCategoryObj = useMemo(() => {
    if (!filters.category || filters.category === "all") return null;
    return categories.find((c) => c.name === filters.category) || null;
  }, [categories, filters.category]);

  // Total budget & subtitle logic based on active filters (Program-centric)
  const { totalBudget, budgetSubtitle } = useMemo(() => {
    const backendTotal = summary?.totalBudget ?? 0;

    if (selectedCategoryObj) {
      const catBudget = selectedCategoryObj.budget || 0;
      return {
        totalBudget: catBudget > 0 ? catBudget : backendTotal,
        budgetSubtitle: `Category budget: ${selectedCategoryObj.name}`,
      };
    }

    if (selectedProgramObj) {
      const progBudget = selectedProgramObj.budget || 0;
      return {
        totalBudget: progBudget > 0 ? progBudget : backendTotal,
        budgetSubtitle: `Program budget: ${selectedProgramObj.name}`,
      };
    }

    const allProgramsBudget = programs.reduce(
      (sum, p) => sum + (p.budget || 0),
      0,
    );
    return {
      totalBudget:
        allProgramsBudget > 0 ? allProgramsBudget : backendTotal,
      budgetSubtitle: "Sum of all program budgets",
    };
  }, [selectedCategoryObj, selectedProgramObj, programs, summary?.totalBudget]);

  const totalSpent = summary?.totalSpent ?? 0;
  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  const budgetUtilization =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // ─── SUMMARY TAB ─────────────────────────────────────────────────────────────
  const SummaryTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* KPI Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.75rem",
        }}
      >
        <StatCard
          icon={Layers}
          label="Total Projects"
          value={summary?.totalProjects ?? "—"}
          color="#4f46e5"
        />
        <StatCard
          icon={Activity}
          label="Mapping"
          value={summary?.mappingCount ?? "—"}
          color="#3b82f6"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={summary?.completedCount ?? "—"}
          sub={`${summary?.completionRate ?? 0}% completion rate`}
          color="#10b981"
        />
        <StatCard
          icon={AlertTriangle}
          label="Critical Priority"
          value={summary?.criticalCount ?? "—"}
          color="#ef4444"
        />
      </div>

      {/* Budget KPI Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.75rem",
        }}
      >
        <StatCard
          icon={SaudiRiyal}
          label="Total Budget"
          color="#f59e0b"
          value={`⃁ ${totalBudget.toLocaleString()}`}
          sub={budgetSubtitle}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Spent"
          color="#8b5cf6"
          value={`⃁ ${totalSpent.toLocaleString()}`}
        />
        <StatCard
          icon={FileBarChart2}
          label="Budget Utilization"
          color="#06b6d4"
          value={`${budgetUtilization}%`}
          sub={`⃁ ${remainingBudget.toLocaleString()} remaining`}
        />
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {/* Status donut */}
        <div style={panel}>
          <SectionHeading>By Status</SectionHeading>
          {!summary?.statusData?.length ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={summary.statusData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={42}
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {summary.statusData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        STATUS_COLORS[entry.name] ||
                        CHART_PALETTE[i % CHART_PALETTE.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Priority bar */}
        <div style={panel}>
          <SectionHeading>By Priority</SectionHeading>
          {!summary?.priorityData?.length ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={summary.priorityData}
                layout="vertical"
                margin={{ left: 10 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {summary.priorityData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={PRIORITY_COLORS[entry.name] || CHART_PALETTE[i]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Program bar */}
        <div style={panel}>
          <SectionHeading>By Program</SectionHeading>
          {!summary?.programData?.length ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={summary.programData}
                margin={{ top: 4, right: 4, bottom: 40, left: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {summary.programData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category bar */}
        <div style={panel}>
          <SectionHeading>By Category</SectionHeading>
          {!summary?.categoryData?.length ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={summary.categoryData}
                margin={{ top: 4, right: 4, bottom: 40, left: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {summary.categoryData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_PALETTE[(i + 3) % CHART_PALETTE.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );

  // ─── PIPELINE TAB ─────────────────────────────────────────────────────────────
  const PipelineTab = () => {
    const total = summary?.totalProjects || 1;
    const modules = [
      {
        label: "Mapping & Approval",
        color: "#4f46e5",
        steps: [
          { name: "WO Request", data: pipeline?.mapping?.woRequest },
          { name: "WO Issuance", data: pipeline?.mapping?.woIssuance },
          {
            name: "Materials Request",
            data: pipeline?.mapping?.materialsRequest,
          },
        ],
      },
      {
        label: "Installation",
        color: "#3b82f6",
        steps: [
          { name: "TCN Request", data: pipeline?.installation?.tcnRequest },
          {
            name: "Teams Mobilization",
            data: pipeline?.installation?.teamsMobilization,
          },
          { name: "TCN Approval", data: pipeline?.installation?.tcnApproval },
          {
            name: "Site Installation",
            data: pipeline?.installation?.siteInstallation,
          },
        ],
      },
      {
        label: "Integration",
        color: "#10b981",
        steps: [
          {
            name: "Alarms Configuration",
            data: pipeline?.integration?.alarmsConfiguration,
          },
          { name: "Annex Number", data: pipeline?.integration?.annexNumber },
          {
            name: "Tenants Integration",
            data: pipeline?.integration?.tenantsIntegration,
          },
        ],
      },
      {
        label: "Closeout",
        color: "#f59e0b",
        steps: [
          { name: "PAT TCN", data: pipeline?.closeout?.patTcn },
          { name: "PAT Status", data: pipeline?.closeout?.patStatus },
          { name: "Invoicing", data: pipeline?.closeout?.invoicing },
          {
            name: "Capitalisation Sheet",
            data: pipeline?.closeout?.capitalisationSheet,
          },
        ],
      },
    ];

    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
      >
        {modules.map((mod) => (
          <div
            key={mod.label}
            style={{
              ...panel,
              borderTop: `4px solid ${mod.color}`,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                marginBottom: "1rem",
                color: "#1e293b",
              }}
            >
              {mod.label}
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {mod.steps.map((step) => (
                <div key={step.name}>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: 6,
                    }}
                  >
                    {step.name}
                  </div>
                  <PipelineBar data={step.data} total={total} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── BUDGET TAB ───────────────────────────────────────────────────────────────
  const BudgetTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Budget KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.75rem",
        }}
      >
        <StatCard
          icon={SaudiRiyal}
          label="Total Budget Allocated"
          color="#3b82f6"
          value={`⃁ ${totalBudget.toLocaleString()}`}
          sub={budgetSubtitle}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Spent"
          color="#10b981"
          value={`⃁ ${totalSpent.toLocaleString()}`}
        />
        <div
          style={{
            ...panel,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              color: "#64748b",
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            Budget Utilization
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                flex: 1,
                height: 12,
                background: "#e2e8f0",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 999,
                  transition: "width 0.6s",
                  width: `${Math.min(budgetUtilization, 100)}%`,
                  background:
                    budgetUtilization > 100
                      ? "#ef4444"
                      : budgetUtilization > 80
                        ? "#f59e0b"
                        : "#10b981",
                }}
              />
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: "1rem",
                color: "#1e293b",
                whiteSpace: "nowrap",
              }}
            >
              {budgetUtilization}%
            </span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11 }}>
            <span style={{ color: "#64748b" }}>
              Remaining: ⃁ {remainingBudget.toLocaleString()}
            </span>
            <span style={{ color: "#10b981" }}>
              ✓ On Budget: {budget?.underBudgetCount ?? "—"}
            </span>
            <span style={{ color: "#ef4444" }}>
              ✗ Over Budget: {budget?.overBudgetCount ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Budget vs Spent by Program */}
      <div style={panel}>
        <SectionHeading>Budget vs. Spent by Program</SectionHeading>
        {!budget?.programBudget?.length ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={budget.programBudget}
              margin={{ top: 4, right: 16, bottom: 40, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="program"
                tick={{ fontSize: 11 }}
                angle={-25}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip isCurrency />} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="budget"
                name="Budget"
                fill="#4f46e5"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="spent"
                name="Spent"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Budget vs Spent by Category */}
      <div style={panel}>
        <SectionHeading>Budget vs. Spent by Category</SectionHeading>
        {!budget?.categoryBudget?.length ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={budget.categoryBudget}
              margin={{ top: 4, right: 16, bottom: 40, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11 }}
                angle={-25}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip isCurrency />} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="budget"
                name="Budget"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="spent"
                name="Spent"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top projects table */}
      <div style={panel}>
        <SectionHeading>Top Projects by Budget</SectionHeading>
        {!budget?.topProjects?.length ? (
          <EmptyChart label="No project data" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  {[
                    "Project",
                    "Program",
                    "Category",
                    "Status",
                    "Budget (⃁)",
                    "Spent (⃁)",
                    "Utilization",
                    "Variance",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: 11,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {budget.topProjects.map((p, i) => (
                  <tr
                    key={p._id || i}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f8faff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }
                  >
                    <td
                      style={{
                        padding: "10px 12px",
                        fontWeight: 600,
                        color: "#1e293b",
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.title}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#475569" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 7px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: "#e0e7ff",
                          color: "#4338ca",
                        }}
                      >
                        {p.program || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#475569" }}>
                      {p.category || "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: `${STATUS_COLORS[p.status] || "#94a3b8"}20`,
                          color: STATUS_COLORS[p.status] || "#94a3b8",
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        color: "#1e293b",
                        fontWeight: 500,
                      }}
                    >
                      {(p.budget || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#1e293b" }}>
                      {(p.spent || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 60,
                            height: 6,
                            background: "#e2e8f0",
                            borderRadius: 999,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(p.utilization, 100)}%`,
                              height: "100%",
                              borderRadius: 999,
                              background:
                                p.utilization > 100
                                  ? "#ef4444"
                                  : p.utilization > 80
                                    ? "#f59e0b"
                                    : "#10b981",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, color: "#475569" }}>
                          {p.utilization}%
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontWeight: 600,
                        color: p.variance < 0 ? "#ef4444" : "#10b981",
                      }}
                    >
                      {p.variance < 0 ? "−" : "+"}
                      {Math.abs(p.variance).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ─── TIMELINE TAB ─────────────────────────────────────────────────────────────
  const TimelineTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Monthly area chart */}
      <div style={panel}>
        <SectionHeading>Projects Created per Month</SectionHeading>
        {!timeline?.byMonth?.length ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={timeline.byMonth}
              margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Projects"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#colorCount)"
                dot={{ r: 4, fill: "#4f46e5" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Region + City Row */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
      >
        {/* Region donut */}
        <div style={panel}>
          <SectionHeading>By Region</SectionHeading>
          {!timeline?.byRegion?.length ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={timeline.byRegion}
                  dataKey="count"
                  nameKey="region"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {timeline.byRegion.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name, props) => [
                    val,
                    props.payload?.region || name,
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(_, entry) => entry.payload?.region || entry.value}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* City table */}
        <div style={panel}>
          <SectionHeading>Top Cities</SectionHeading>
          {!timeline?.byCity?.length ? (
            <EmptyChart label="No city data" />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {timeline.byCity.map((c, i) => (
                <div
                  key={c.city || i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 0",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: CHART_PALETTE[i % CHART_PALETTE.length],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: "#fff",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                      }}
                    >
                      {c.city || "Unknown"}
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: "#e2e8f0",
                        borderRadius: 999,
                        marginTop: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 999,
                          width: `${timeline.byCity[0]?.count > 0 ? (c.count / timeline.byCity[0].count) * 100 : 0}%`,
                          background: CHART_PALETTE[i % CHART_PALETTE.length],
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      flexShrink: 0,
                    }}
                  >
                    {c.count} projects
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  const isLoading =
    sumLoading ||
    (activeTab === "pipeline" && pipeLoading) ||
    (activeTab === "budget" && budLoading) ||
    (activeTab === "timeline" && timeLoading);

  return (
    <div>
      {/* Page header updates */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Reports & Analytics
          </h2>
          <p
            style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#64748b" }}
          >
            Data-driven insights across all projects
          </p>
        </div>
        {isFullEditor && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={async () => {
                const { data } = await fetchExport();
                if (data?.length) {
                  downloadExcel(
                    data,
                    `pms-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
                  );
                }
              }}
              disabled={exportLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1.1rem",
                background: exportLoading ? "#e2e8f0" : "#10b981",
                color: exportLoading ? "#94a3b8" : "#fff",
                border: "none",
                borderRadius: 8,
                cursor: exportLoading ? "not-allowed" : "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "background 0.2s",
              }}
            >
              <FileSpreadsheet size={15} />
              {exportLoading ? "Exporting…" : "Export Excel"}
            </button>

            <button
              onClick={async () => {
                const { data } = await fetchExport();
                if (data?.length) {
                  downloadCSV(
                    data,
                    `pms-report-${new Date().toISOString().slice(0, 10)}.csv`,
                  );
                }
              }}
              disabled={exportLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1.1rem",
                background: exportLoading ? "#e2e8f0" : "#4f46e5",
                color: exportLoading ? "#94a3b8" : "#fff",
                border: "none",
                borderRadius: 8,
                cursor: exportLoading ? "not-allowed" : "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "background 0.2s",
              }}
            >
              <Download size={15} />
              {exportLoading ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        programs={programs}
        categories={categories}
      />

      {/* Tab nav */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          background: "#f1f5f9",
          borderRadius: 10,
          padding: "4px",
          marginBottom: "1.25rem",
          width: "fit-content",
        }}
      >
        <TabBtn
          active={activeTab === "summary"}
          onClick={() => setActiveTab("summary")}
          icon={FileBarChart2}
          label="Summary"
        />
        <TabBtn
          active={activeTab === "pipeline"}
          onClick={() => setActiveTab("pipeline")}
          icon={ChevronRight}
          label="Pipeline Health"
        />
        <TabBtn
          active={activeTab === "budget"}
          onClick={() => setActiveTab("budget")}
          icon={SaudiRiyal}
          label="Budget & Finance"
        />
        <TabBtn
          active={activeTab === "timeline"}
          onClick={() => setActiveTab("timeline")}
          icon={Globe}
          label="Timeline & Geography"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 300,
            color: "#94a3b8",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid #e2e8f0",
              borderTopColor: "#4f46e5",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: 13 }}>Loading report data…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {activeTab === "summary" && <SummaryTab />}
          {activeTab === "pipeline" && <PipelineTab />}
          {activeTab === "budget" && <BudgetTab />}
          {activeTab === "timeline" && <TimelineTab />}
        </>
      )}
    </div>
  );
}
