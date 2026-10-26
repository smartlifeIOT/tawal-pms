import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Folder,
  Loader,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  SaudiRiyal,
} from "lucide-react";

import { toast } from "react-hot-toast";
import { useStats } from "../hooks/project";
import { useProjectsHook } from "../hooks/project";
import { formatDate } from "../utils/date";
import { getCatBadge } from "../utils/helpers";
import ProjectCard from "../components/ProjectCard";
import { NavLink } from "react-router-dom";

const Dashboard = () => {
  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
  } = useProjectsHook();
  const projects = projectsData?.data || [];
  const limitedProjects = projects.slice(0, 6);
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useStats();

  // Loading and error handling
  if (projectsLoading || statsLoading)
    return (
      <div className="flex justify-center items-center h-full">Loading...</div>
    );
  if (projectsError || statsError)
    return <div className="text-red-500">Failed to load data.</div>;

  // Use stats for aggregated values
  const totalProjects = stats?.totalProjects || 0;
  const inProgressCount = stats?.inProgressCount || 0;
  const completedCount = stats?.completedCount || 0;
  const criticalCount = stats?.criticalCount || 0;
  const totalBudget = stats?.totalBudget || 0;

  // Use stats arrays for charts
  const PROGRAM_COLORS = [
    "#4f46e5",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#e11d48",
    "#f97316",
    "#14b8a6",
  ];
  const programData = (stats?.programData || []).map((p, idx) => ({
    ...p,
    color: PROGRAM_COLORS[idx % PROGRAM_COLORS.length],
    // Recharts Legend reads `fill` (not `color`) for icon colors
    fill: PROGRAM_COLORS[idx % PROGRAM_COLORS.length],
  }));
  const statusColorMap = {
    Initiation: "#94a3b8",
    Mapping: "#4f46e5",
    Installation: "#f59e0b",
    Integration: "#8b5cf6",
    Closeout: "#f97316",
    Completed: "#10b981",
  };
  const statusData = (stats?.statusData || []).map((s, idx) => ({
    ...s,
    fill:
      statusColorMap[s.name] ||
      ["#4f46e5", "#10b981", "#f59e0b", "#8b5cf6"][idx % 4],
  }));
  const budgetData = (stats?.budgetData || []).map((p) => ({
    name: p.title?.substring(0, 15) + "...",
    Budget: p.budget || 0,
    Spent: p.spent || 0,
  }));

  // Top Stats Data
  const topStats = [
    {
      title: "Total Projects",
      value: String(totalProjects),
      icon: <Folder size={20} color="#4f46e5" />,
      bg: "#eef2ff",
    },
    {
      title: "In Progress",
      value: String(inProgressCount),
      icon: <Loader size={20} color="#f59e0b" />,
      bg: "#fef3c7",
    },
    {
      title: "Completed",
      value: String(completedCount),
      icon: <ShieldCheck size={20} color="#10b981" />,
      bg: "#d1fae5",
    },
    {
      title: "Critical Priority",
      value: String(criticalCount),
      icon: <AlertTriangle size={20} color="#ef4444" />,
      bg: "#fee2e2",
    },
    {
      title: "Total  Allocated Budget",
      value: `  ${totalBudget.toLocaleString()}`,
      icon: <SaudiRiyal size={20} color="#8b5cf6" />,
      bg: "#ede9fe",
    },
  ];

  const getPriorityBadge = (prio) => {
    if (prio === "Critical") return "priority-critical";
    return "priority-high";
  };

  return (
    <div>
      {/* Top Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {topStats.map((stat, i) => (
          <div
            key={i}
            className="glass-panel"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                background: stat.bg,
                padding: "0.75rem",
                borderRadius: "0.5rem",
                display: "flex",
              }}
            >
              {stat.icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  lineHeight: "1.2",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  fontWeight: "500",
                }}
              >
                {stat.title}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "1.5rem",
          height: "320px",
          marginBottom: "2rem",
        }}
      >
        {/* Program Chart */}
        <div
          className="glass-panel"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <h3 style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
            Projects by Program
          </h3>
          <div style={{ flex: 1, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={programData}
                  cx="50%"
                  cy="40%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {programData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [val, "Projects"]} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "0.7rem", paddingTop: "4px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div
          className="glass-panel"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <h3 style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
            Status Distribution
          </h3>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickCount={5}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget vs Spent */}
        <div
          className="glass-panel"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <h3 style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
            Budget vs. Spent
          </h3>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={budgetData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                barGap={0}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 8, fill: "#64748b" }}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    fontSize: "12px",
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend
                  iconType="rect"
                  wrapperStyle={{ fontSize: "0.75rem", bottom: -5 }}
                />
                <Bar
                  dataKey="Budget"
                  fill="#a5b4fc"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                />
                <Bar
                  dataKey="Spent"
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Projects Title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.1rem" }}>Recent Projects</h2>
        <NavLink
          to="/projects"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            color: "var(--primary-color)",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          View All <ArrowRight size={16} />
        </NavLink>
      </div>

      {/* Recent Projects Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1.5rem",
        }}
      >
        {limitedProjects.map((proj, i) => (
          <ProjectCard
            proj={proj}
            key={i}
            i={i}
            getCatBadge={getCatBadge}
            getPriorityBadge={getPriorityBadge}
            formatDate={formatDate}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
