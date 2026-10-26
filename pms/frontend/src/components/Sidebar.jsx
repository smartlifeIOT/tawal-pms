import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Radio,
  LineChart,
  UserCog,
  FileBarChart2,
  ClipboardList,
  MapPinned,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { usePrograms } from "../hooks/project";
import { useQueryClient } from "@tanstack/react-query";
import logo from "../assets/logo.png";
export default function Sidebar() {
  const { data: programs = [], isLoading } = usePrograms();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    queryClient.clear();
    logout();
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="Smart life" width={120} />
      </div>
      <nav
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "5px",
          overflowY: "auto",
          scrollbarWidth: "none",
        }}
      >
        {/* Dashboard — all roles */}
        <NavLink
          to="/"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        {/* All Projects — all roles */}
        <NavLink
          to="/projects"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <FolderKanban size={20} />
          <span>All Projects</span>
        </NavLink>

        {/* My Tasks — all roles */}
        <NavLink
          to="/tasks"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <ClipboardList size={20} />
          <span>My Tasks</span>
        </NavLink>

        {/* Analytics — Admin & PM */}
        {(user?.role === "Admin" || user?.role === "PM") && (
          <NavLink
            to="/analytics"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <LineChart size={20} />
            <span>Analytics</span>
          </NavLink>
        )}

        {/* Reports — Admin & PM */}
        {(user?.role === "Admin" || user?.role === "PM") && (
          <NavLink
            to="/reports"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <FileBarChart2 size={20} />
            <span>Reports</span>
          </NavLink>
        )}

        {/* Tools — all roles */}
        <div className="sidebar-heading">Tools</div>
        <NavLink
          to="/site-planner"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <MapPinned size={20} />
          <span>Site Planner</span>
        </NavLink>
        <NavLink
          to="/boq-processor"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <FileSpreadsheet size={20} />
          <span>BOQ Processor</span>
        </NavLink>

        {/* Program links */}
        <>
          <div className="sidebar-heading">Programs</div>
          {isLoading ? (
            <div
              style={{
                padding: "0.5rem 1.5rem",
                color: "#94a3b8",
                fontSize: "0.875rem",
              }}
            >
              Loading...
            </div>
          ) : programs.length > 0 ? (
            programs.map((program) => (
              <NavLink
                key={program._id}
                to={`/program/${encodeURIComponent(program.name)}`}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <Layers size={20} />
                <span>{program.name}</span>
              </NavLink>
            ))
          ) : (
            <div
              style={{
                padding: "0.5rem 1.5rem",
                color: "#94a3b8",
                fontSize: "0.875rem",
              }}
            >
              No programs
            </div>
          )}
        </>

        {/* Management section — Admin only */}
        {user?.role === "Admin" && (
          <>
            <div className="sidebar-heading">Management</div>
            <NavLink
              to="/programs"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Layers size={20} />
              <span>Manage Programs</span>
            </NavLink>
            <NavLink
              to="/categories"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <FolderKanban size={20} />
              <span>Manage Categories</span>
            </NavLink>
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <UserCog size={20} />
              <span>Manage Users</span>
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <UserCog size={20} />
              <span>Add User</span>
            </NavLink>
          </>
        )}
      </nav>
      <div
        style={{
          marginTop: "auto",
          paddingTop: "1rem",
          borderTopColor: "oklab(0.999994 0.0000455678 0.0000200868 / 0.1)",
          borderTopStyle: "solid",
          borderTopWidth: "0.8px",
        }}
      >
        <div
          style={{
            padding: "0.5rem 1.5rem",
            fontSize: "0.775rem",
            color: "#94a3b8",
          }}
        >
          Logged in as{" "}
          <strong style={{ color: "#f8fafc" }}>{user?.role}</strong>
        </div>
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
