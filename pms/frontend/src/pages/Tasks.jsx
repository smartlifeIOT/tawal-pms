import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { useProjectsHook } from "../hooks/project";
import { apiInstance } from "../service";
import { getWoStatusColor, getStatusColor } from "../utils/statusColor";
import { getCatBadge } from "../utils/helpers";
import Spinner from "../components/Spinner";
import WorkOrder from "../components/WorkOrder";
import Installation from "../components/Installation";
import Integration from "../components/Integration";
import Closeout from "../components/Closeout";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FolderOpen,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

// status -> module key
const MODULE_FOR_STATUS = {
  Initiation: "mapping",
  Installation: "installation",
  Integration: "integration",
  Closeout: "closeout",
};

// module key -> roles that handle it (Admin/PM handle all)
const ROLES_FOR_MODULE = {
  mapping: ["Logistics"],
  installation: ["Coordinator"],
  integration: ["Integration & Support"],
  closeout: ["Document Controller", "Closeout"],
};

const MODULE_META = {
  mapping: { label: "Mapping & Approvals", Component: WorkOrder },
  installation: { label: "Installation", Component: Installation },
  integration: { label: "Integration", Component: Integration },
  closeout: { label: "Closeout", Component: Closeout },
};

const toDateInputValue = (v) =>
  v ? new Date(v).toISOString().slice(0, 10) : "";

// Derive tasks for the given role from the projects the user can see
function deriveTasks(projects, role) {
  const isAdminOrPM = role === "Admin" || role === "PM";
  const tasks = [];
  for (const project of projects) {
    const module = MODULE_FOR_STATUS[project.status];
    if (!module) continue; // "Mapping" / "Completed" have no active module task
    const allowed =
      isAdminOrPM || (ROLES_FOR_MODULE[module] || []).includes(role);
    if (allowed) {
      tasks.push({ project, module });
    }
  }
  return tasks;
}

// Build the initial form shape for a module (matches the module components)
function buildInitialForm(module, project) {
  switch (module) {
    case "mapping":
      return {
        mapping: {
          woRequest: {
            status: project.mapping?.woRequest?.status || "Pending",
            date: toDateInputValue(project.mapping?.woRequest?.date),
            remarks: project.mapping?.woRequest?.remarks || "",
          },
          woIssuance: {
            status: project.mapping?.woIssuance?.status || "Pending",
            date: toDateInputValue(project.mapping?.woIssuance?.date),
            remarks: project.mapping?.woIssuance?.remarks || "",
          },
          materialsRequest: {
            status: project.mapping?.materialsRequest?.status || "Pending",
            date: toDateInputValue(project.mapping?.materialsRequest?.date),
            remarks: project.mapping?.materialsRequest?.remarks || "",
          },
          generalRemarks: project.mapping?.generalRemarks || "",
        },
      };
    case "installation":
      return {
        installation: {
          tcnRequest: {
            tcnNumber: project.installation?.tcnRequest?.tcnNumber || "",
            status: project.installation?.tcnRequest?.status || "Pending",
            date: toDateInputValue(project.installation?.tcnRequest?.date),
            remarks: project.installation?.tcnRequest?.remarks || "",
          },
          teamsMaterialsMobilization: {
            status:
              project.installation?.teamsMaterialsMobilization?.status ||
              "Pending",
            date: toDateInputValue(
              project.installation?.teamsMaterialsMobilization?.date,
            ),
            remarks:
              project.installation?.teamsMaterialsMobilization?.remarks || "",
          },
          tcnApproval: {
            status: project.installation?.tcnApproval?.status || "Pending",
            date: toDateInputValue(project.installation?.tcnApproval?.date),
            remarks: project.installation?.tcnApproval?.remarks || "",
          },
          siteInstallation: {
            type: project.installation?.siteInstallation?.type || "RMS",
            status: project.installation?.siteInstallation?.status || "Pending",
            date: toDateInputValue(
              project.installation?.siteInstallation?.date,
            ),
            remarks: project.installation?.siteInstallation?.remarks || "",
          },
          generalRemarks: project.installation?.generalRemarks || "",
        },
      };

    case "integration":
      return {
        integration: {
          alarmsConfiguration: {
            status:
              project.integration?.alarmsConfiguration?.status || "Pending",
            date: toDateInputValue(
              project.integration?.alarmsConfiguration?.date,
            ),
            remarks: project.integration?.alarmsConfiguration?.remarks || "",
          },
          annexNumber: {
            number: project.integration?.annexNumber?.number || "",
            status: project.integration?.annexNumber?.status || "Pending",
            date: toDateInputValue(project.integration?.annexNumber?.date),
            remarks: project.integration?.annexNumber?.remarks || "",
          },
          tenantsIntegration: {
            status:
              project.integration?.tenantsIntegration?.status || "Pending",
            date: toDateInputValue(
              project.integration?.tenantsIntegration?.date,
            ),
            remarks: project.integration?.tenantsIntegration?.remarks || "",
          },
          generalRemarks: project.integration?.generalRemarks || "",
        },
      };
    case "closeout":
      return {
        closeout: {
          patTcn: {
            number: project.closeout?.patTcn?.number || "",
            status: project.closeout?.patTcn?.status || "Pending",
            date: toDateInputValue(project.closeout?.patTcn?.date),
            remarks: project.closeout?.patTcn?.remarks || "",
          },
          patStatus: {
            status: project.closeout?.patStatus?.status || "Pending",
            date: toDateInputValue(project.closeout?.patStatus?.date),
            remarks: project.closeout?.patStatus?.remarks || "",
          },
          invoicing: {
            status: project.closeout?.invoicing?.status || "Pending",
            date: toDateInputValue(project.closeout?.invoicing?.date),
            remarks: project.closeout?.invoicing?.remarks || "",
          },
          capitalisationSheetUpdate: {
            status:
              project.closeout?.capitalisationSheetUpdate?.status || "Pending",
            date: toDateInputValue(
              project.closeout?.capitalisationSheetUpdate?.date,
            ),
            remarks: project.closeout?.capitalisationSheetUpdate?.remarks || "",
          },
          generalRemarks: project.closeout?.generalRemarks || "",
        },
      };
    default:
      return {};
  }
}

// Build the PUT payload for a module (dates -> null, matching ProjectDetails)
function buildModulePayload(module, form) {
  const m = form[module];
  switch (module) {
    case "mapping":
      return {
        mapping: {
          ...m,
          woRequest: {
            ...m.woRequest,
            date: m.woRequest?.date || null,
          },
          woIssuance: {
            ...m.woIssuance,
            date: m.woIssuance?.date || null,
          },
          materialsRequest: {
            ...m.materialsRequest,
            date: m.materialsRequest?.date || null,
          },
        },
      };
    case "installation":
      return {
        installation: {
          ...m,
          tcnRequest: { ...m.tcnRequest, date: m.tcnRequest?.date || null },
          teamsMaterialsMobilization: {
            ...m.teamsMaterialsMobilization,
            date: m.teamsMaterialsMobilization?.date || null,
          },
          tcnApproval: { ...m.tcnApproval, date: m.tcnApproval?.date || null },
          siteInstallation: {
            ...m.siteInstallation,
            date: m.siteInstallation?.date || null,
          },
        },
      };
    case "integration":
      return {
        integration: {
          ...m,
          alarmsConfiguration: {
            ...m.alarmsConfiguration,
            date: m.alarmsConfiguration?.date || null,
          },
          annexNumber: {
            ...m.annexNumber,
            date: m.annexNumber?.date || null,
          },
          tenantsIntegration: {
            ...m.tenantsIntegration,
            date: m.tenantsIntegration?.date || null,
          },
        },
      };
    case "closeout":
      return {
        closeout: {
          ...m,
          patTcn: { ...m.patTcn, date: m.patTcn?.date || null },
          patStatus: { ...m.patStatus, date: m.patStatus?.date || null },
          invoicing: { ...m.invoicing, date: m.invoicing?.date || null },
          capitalisationSheetUpdate: {
            ...m.capitalisationSheetUpdate,
            date: m.capitalisationSheetUpdate?.date || null,
          },
        },
      };
    default:
      return {};
  }
}
function TaskItem({ task }) {
  const { project, module } = task;
  const meta = MODULE_META[module];
  const Component = meta.Component;
  const queryClient = useQueryClient();

  const [form, setForm] = useState(() => buildInitialForm(module, project));
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = buildModulePayload(module, form);
      await apiInstance.put(`${API_BASE}/projects/${project._id}`, payload);
      toast.success(`${meta.label} task submitted successfully`);
      setExpanded(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ marginBottom: "1rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "1rem",
          alignItems: "center",
          padding: "0rem 1.5rem",
          cursor: "pointer",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
            {project.title}
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginTop: "0.25rem",
            }}
          >
            <span className={`badge ${getCatBadge(project.category)}`}>
              {project.category}
            </span>{" "}
            · {meta.label}
          </div>
        </div>
        <div style={{ fontSize: "12px" }}>
          <p>Site ID: {project.siteId}</p>
          <p>Tawal ID: {project.tawalId}</p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            justifyContent: "flex-end",
          }}
        >
          <span
            style={{
              background: getStatusColor(project.status),
              padding: "2px 10px",
              color: "#fff",
              fontWeight: "600",
              borderRadius: "5px",
              fontSize: "0.75rem",
            }}
          >
            {project.status}
          </span>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: " 1.5rem 1.5rem" }}>
          <Component
            project={project}
            editMode
            setForm={setForm}
            form={form}
            getWoStatusColor={getWoStatusColor}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
              marginTop: "1rem",
              borderTop: "1px solid var(--surface-border)",
              paddingTop: "1rem",
            }}
          >
            <button
              className="btn btn-outline"
              onClick={() => setExpanded(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <Send size={16} style={{ marginRight: "0.35rem" }} />
              {submitting ? "Submitting..." : "Submit Task"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuthStore();
  const {
    data: projectsData,
    isLoading,
    error,
  } = useProjectsHook({
    page: 1,
    limit: 500,
  });
  const projects = projectsData?.data || [];

  const tasks = useMemo(
    () => deriveTasks(projects, user?.role),
    [projects, user?.role],
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>
            My Tasks ({tasks.length})
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Tasks assigned to your role based on the current project phase.
          </p>
        </div>
        <ClipboardList size={28} color="var(--text-secondary)" />
      </div>

      {isLoading ? (
        <Spinner size="lg" text="Loading your tasks..." />
      ) : error ? (
        <div style={{ color: "red", textAlign: "center", padding: "3rem" }}>
          Failed to load tasks.
        </div>
      ) : tasks.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "#64748b",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <FolderOpen size={48} color="#94a3b8" />
          </div>
          <p style={{ fontSize: "1.1rem" }}>
            No tasks assigned to you right now.
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            When a project moves into a phase handled by your role, it will
            appear here for you to complete.
          </p>
        </div>
      ) : (
        tasks.map((task) => (
          <TaskItem key={`${task.project._id}-${task.module}`} task={task} />
        ))
      )}
    </div>
  );
}
