import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import ProjectList from "./components/ProjectList";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Categories from "./pages/Categories";
import Sidebar from "./components/Sidebar";
import AllProjects from "./pages/AllProjects";
import Tasks from "./pages/Tasks";
import Users from "./pages/Users";
import ProjectDetails from "./pages/ProjectDetails";
import Unauthorized from "./pages/Unauthorized";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import SitePlanner from "./pages/SitePlanner";
import BoqProcessor from "./pages/BoqProcessor";
import Programs from "./pages/Programs";
import ProgramProjects from "./pages/ProgramProjects";

function Header() {
  const location = useLocation();
  const path = location.pathname;
  // Every branch below assigns a title; subtitle stays empty unless a
  // tool page sets its own.
  let title;
  let subtitle = "";
  if (path.startsWith("/program/")) {
    const prog = decodeURIComponent(path.split("/")[2] || "");
    title = `${prog} Program`;
    subtitle = `Projects and details for ${prog} program.`;
  } else if (path === "/programs") {
    title = "Manage Programs";
    subtitle = "Configure and manage project programs.";
  } else if (path.startsWith("/category/")) {
    const cat = path.split("/")[2];
    const formatted = cat.charAt(0).toUpperCase() + cat.slice(1);
    title = `${formatted} Projects`;
  } else if (path === "/") {
    title = "Dashboard";
  } else if (path === "/site-planner") {
    title = "Site Planner";
    subtitle = "Map your sites, draw zones and build an optimised day route.";
  } else if (path === "/boq-processor") {
    title = "BOQ Processor";
    subtitle = "Combine site data with the BOQ reference into one output sheet.";
  } else {
    title = "Projects";
  }
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
      }}
    >
      <div>
        <h1 style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>
          {title}
        </h1>
        <p style={{ fontSize: "0.775rem", color: "var(--text-secondary)" }}>
          {subtitle || `${title} overview and details.`}
        </p>
      </div>
    </div>
  );
}

function MainLayout() {
  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-content">
        <Header />
        <Routes>
          {/* All authenticated users can see dashboard & projects */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<AllProjects />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/program/:programName" element={<ProgramProjects />} />
          <Route path="/category/:categoryName" element={<ProjectList />} />
          <Route path="/analytics" element={<Analytics />} />

          {/* Tools — available to every authenticated role */}
          <Route path="/site-planner" element={<SitePlanner />} />
          <Route path="/boq-processor" element={<BoqProcessor />} />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["Admin", "PM"]}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* PM and above: can also access register (add user is admin-only but PM may need it) */}
          <Route
            path="/register"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "PM",
                  "Coordinator",
                  "Integration & Support",
                  "User",
                ]}
              >
                <Register />
              </ProtectedRoute>
            }
          />

          {/* Admin only */}
          <Route
            path="/programs"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                <Programs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <Categories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <Users />
              </ProtectedRoute>
            }
          />

          {/* Unauthorized & 404 Catch-all */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
