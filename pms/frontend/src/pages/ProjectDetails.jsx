import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiInstance } from "../service/index";
import {
  useDeleteProject,
  useProjectById,
  useUpdateProject,
  useCategories,
  usePrograms,
} from "../hooks/project";
import { useMemo } from "react";
import ConfirmModal from "../components/ConfirmModal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
} from "recharts";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { getCatBadge } from "../utils/helpers";
import {
  BanknoteArrowDown,
  Calendar,
  ChartNoAxesColumnIncreasing,
  SaudiRiyal,
  Users2,
} from "lucide-react";
import { getStatusColor, getWoStatusColor } from "../utils/statusColor";
import MapData from "../components/MapData";
import WorkOrder from "../components/WorkOrder";
import Installation from "../components/Installation";
import Integration from "../components/Integration";
import Closeout from "../components/Closeout";
import ProgressBar from "../components/ProgressBar";
import TeamMembers from "../components/TeamMembers";
import Budget_Spent from "../components/Budget_Spent";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: project, isLoading, isError } = useProjectById(id);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    mapping: { woRequest: {}, woIssuance: {}, materialsRequest: {} },
    installation: {
      tcnRequest: {},
      teamsMaterialsMobilization: {},
      tcnApproval: {},
      siteInstallation: {},
    },
    integration: {
      alarmsConfiguration: {},
      annexNumber: {},
      tenantsIntegration: {},
    },
    closeout: {
      patTcn: {},
      patStatus: {},
      invoicing: {},
      capitalisationSheetUpdate: {},
    },
  });
  const [saving, setSaving] = useState(false);
  const deleteMutation = useDeleteProject();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canViewUsersList = user?.role === "Admin" || user?.role === "PM";
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiInstance.get(`${API_BASE}/users`).then((r) => r.data),
    enabled: canViewUsersList,
  });
  const updateMutation = useUpdateProject();
  const { data: categories = [] } = useCategories();
  const { data: programs = [] } = usePrograms();
  const availableCategories = useMemo(() => {
    if (!form.program) return categories;
    return categories.filter(
      (cat) => !cat.program || cat.program === form.program,
    );
  }, [categories, form.program]);

  // Scopes available for the project's category (form.category takes precedence during edit)
  const categoryScopes = useMemo(() => {
    const selectedCategoryName = form?.category || project?.category;
    const cat = categories.find((c) => c.name === selectedCategoryName);
    return cat?.scopes || [];
  }, [categories, form?.category, project?.category]);

  const handleProgramChange = (newProgram) => {
    const validCats = categories.filter(
      (c) => !c.program || c.program === newProgram,
    );
    const isCatValid = validCats.some((c) => c.name === form.category);
    setForm((prev) => ({
      ...prev,
      program: newProgram,
      category: isCatValid ? prev.category : "",
      projectScope: isCatValid ? prev.projectScope : "",
    }));
  };

  const handleCategoryChange = (newCategory) => {
    const targetCat = categories.find((c) => c.name === newCategory);
    const scopes = targetCat?.scopes || [];
    const newScope = scopes.includes(form.projectScope)
      ? form.projectScope
      : "";
    setForm((prev) => ({
      ...prev,
      category: newCategory,
      projectScope: newScope,
    }));
  };

  React.useEffect(() => {
    if (project)
      setForm({
        program: project.program || "",
        category: project.category || "",
        title: project.title || "",
        description: project.description || "",
        projectScope: project.projectScope || "",
        status: project.status || "Initiation",
        priority: project.priority || "Low",
        progress: project.progress || 0,
        budget: project.budget || 0,
        siteId: project.siteId || "",
        tawalId: project.tawalId || "",
        spent: project.spent || 0,
        teamLead: project.teamLead || "",
        startDate: project.startDate
          ? new Date(project.startDate).toISOString().slice(0, 10)
          : "",
        endDate: project.endDate
          ? new Date(project.endDate).toISOString().slice(0, 10)
          : "",
        longitude: project.longitude ?? "",
        latitude: project.latitude ?? "",
        teamMembers: project.teamMembers || [],
        tags: (project.tags || []).join(", "),
        mapping: {
          woRequest: {
            status: project.mapping?.woRequest?.status || "Pending",
            date: project.mapping?.woRequest?.date
              ? new Date(project.mapping.woRequest.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.mapping?.woRequest?.remarks || "",
            fileUrl: project.mapping?.woRequest?.fileUrl || "",
            fileName: project.mapping?.woRequest?.fileName || "",
          },
          woIssuance: {
            woNumber: project.mapping?.woIssuance?.woNumber || "",
            status: project.mapping?.woIssuance?.status || "Pending",
            date: project.mapping?.woIssuance?.date
              ? new Date(project.mapping.woIssuance.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.mapping?.woIssuance?.remarks || "",
          },
          materialsRequest: {
            status: project.mapping?.materialsRequest?.status || "Pending",
            date: project.mapping?.materialsRequest?.date
              ? new Date(project.mapping.materialsRequest.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.mapping?.materialsRequest?.remarks || "",
          },
          generalRemarks: project.mapping?.generalRemarks || "",
        },
        installation: {
          tcnRequest: {
            tcnNumber: project.installation?.tcnRequest?.tcnNumber || "",
            status: project.installation?.tcnRequest?.status || "Pending",
            date: project.installation?.tcnRequest?.date
              ? new Date(project.installation.tcnRequest.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.installation?.tcnRequest?.remarks || "",
          },
          teamsMaterialsMobilization: {
            status:
              project.installation?.teamsMaterialsMobilization?.status ||
              "Pending",
            date: project.installation?.teamsMaterialsMobilization?.date
              ? new Date(project.installation.teamsMaterialsMobilization.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks:
              project.installation?.teamsMaterialsMobilization?.remarks || "",
          },
          tcnApproval: {
            status: project.installation?.tcnApproval?.status || "Pending",
            date: project.installation?.tcnApproval?.date
              ? new Date(project.installation.tcnApproval.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.installation?.tcnApproval?.remarks || "",
          },
          siteInstallation: {
            type: project.installation?.siteInstallation?.type || "RMS",
            status: project.installation?.siteInstallation?.status || "Pending",
            date: project.installation?.siteInstallation?.date
              ? new Date(project.installation.siteInstallation.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.installation?.siteInstallation?.remarks || "",
          },
          generalRemarks: project.installation?.generalRemarks || "",
        },
        integration: {
          alarmsConfiguration: {
            status:
              project.integration?.alarmsConfiguration?.status || "Pending",
            date: project.integration?.alarmsConfiguration?.date
              ? new Date(project.integration.alarmsConfiguration.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.integration?.alarmsConfiguration?.remarks || "",
          },
          annexNumber: {
            number: project.integration?.annexNumber?.number || "",
            status: project.integration?.annexNumber?.status || "Pending",
            date: project.integration?.annexNumber?.date
              ? new Date(project.integration.annexNumber.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.integration?.annexNumber?.remarks || "",
          },
          tenantsIntegration: {
            status:
              project.integration?.tenantsIntegration?.status || "Pending",
            date: project.integration?.tenantsIntegration?.date
              ? new Date(project.integration.tenantsIntegration.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.integration?.tenantsIntegration?.remarks || "",
          },
          generalRemarks: project.integration?.generalRemarks || "",
        },
        closeout: {
          patTcn: {
            number: project.closeout?.patTcn?.number || "",
            status: project.closeout?.patTcn?.status || "Pending",
            date: project.closeout?.patTcn?.date
              ? new Date(project.closeout.patTcn.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.closeout?.patTcn?.remarks || "",
          },
          patStatus: {
            status: project.closeout?.patStatus?.status || "Pending",
            date: project.closeout?.patStatus?.date
              ? new Date(project.closeout.patStatus.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.closeout?.patStatus?.remarks || "",
            fileUrl: project.closeout?.patStatus?.fileUrl || "",
            fileName: project.closeout?.patStatus?.fileName || "",
          },
          invoicing: {
            status: project.closeout?.invoicing?.status || "Pending",
            date: project.closeout?.invoicing?.date
              ? new Date(project.closeout.invoicing.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.closeout?.invoicing?.remarks || "",
          },
          capitalisationSheetUpdate: {
            status:
              project.closeout?.capitalisationSheetUpdate?.status || "Pending",
            date: project.closeout?.capitalisationSheetUpdate?.date
              ? new Date(project.closeout.capitalisationSheetUpdate.date)
                  .toISOString()
                  .slice(0, 10)
              : "",
            remarks: project.closeout?.capitalisationSheetUpdate?.remarks || "",
          },
          generalRemarks: project.closeout?.generalRemarks || "",
        },
      });
  }, [project]);

  const handleSave = async () => {
    // Validation checks
    if (
      form.mapping?.woRequest?.status === "Requested" &&
      (!form.mapping?.woRequest?.fileUrl ||
        !form.mapping?.woRequest?.fileUrl.trim())
    ) {
      toast.error("Please upload a Mapping File when WO Request is Requested");
      return;
    }

    if (
      form.mapping?.woIssuance?.status === "Approved" &&
      (!form.mapping?.woIssuance?.woNumber ||
        !form.mapping?.woIssuance?.woNumber.trim())
    ) {
      toast.error("Please enter a WO Number when WO Issuance is Approved");
      return;
    }

    try {
      setSaving(true);
      // Ensure tags are sent as an array and dates are preserved
      const payload = {
        ...form,
        program: form.program ? form.program.trim() : "",
        category: form.category ? form.category.trim() : "",
        projectScope: form.projectScope ? form.projectScope.trim() : "",
        tags:
          typeof form.tags === "string"
            ? form.tags
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : form.tags,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        longitude: form.longitude === "" ? undefined : Number(form.longitude),
        latitude: form.latitude === "" ? undefined : Number(form.latitude),
        mapping: {
          ...form.mapping,
          woRequest: {
            ...form.mapping?.woRequest,
            date: form.mapping?.woRequest?.date || null,
          },
          woIssuance: {
            ...form.mapping?.woIssuance,
            date: form.mapping?.woIssuance?.date || null,
          },
          materialsRequest: {
            ...form.mapping?.materialsRequest,
            date: form.mapping?.materialsRequest?.date || null,
          },
        },
        installation: {
          ...form.installation,
          tcnRequest: {
            ...form.installation?.tcnRequest,
            date: form.installation?.tcnRequest?.date || null,
          },
          teamsMaterialsMobilization: {
            ...form.installation?.teamsMaterialsMobilization,
            date: form.installation?.teamsMaterialsMobilization?.date || null,
          },
          tcnApproval: {
            ...form.installation?.tcnApproval,
            date: form.installation?.tcnApproval?.date || null,
          },
          siteInstallation: {
            ...form.installation?.siteInstallation,
            date: form.installation?.siteInstallation?.date || null,
          },
        },
        integration: {
          ...form.integration,
          alarmsConfiguration: {
            ...form.integration?.alarmsConfiguration,
            date: form.integration?.alarmsConfiguration?.date || null,
          },
          annexNumber: {
            ...form.integration?.annexNumber,
            date: form.integration?.annexNumber?.date || null,
          },
          tenantsIntegration: {
            ...form.integration?.tenantsIntegration,
            date: form.integration?.tenantsIntegration?.date || null,
          },
        },
        closeout: {
          ...form.closeout,
          patTcn: {
            ...form.closeout?.patTcn,
            date: form.closeout?.patTcn?.date || null,
          },
          patStatus: {
            ...form.closeout?.patStatus,
            date: form.closeout?.patStatus?.date || null,
            fileUrl: form.closeout?.patStatus?.fileUrl || "",
            fileName: form.closeout?.patStatus?.fileName || "",
          },
          invoicing: {
            ...form.closeout?.invoicing,
            date: form.closeout?.invoicing?.date || null,
          },
          capitalisationSheetUpdate: {
            ...form.closeout?.capitalisationSheetUpdate,
            date: form.closeout?.capitalisationSheetUpdate?.date || null,
          },
        },
      };
      await updateMutation.mutateAsync({ id, updates: payload });
      setEditMode(false);
    } catch (err) {
      console.error("Update failed", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    // open confirmation modal
    setConfirmOpen(true);
  };

  const performDelete = () => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setConfirmOpen(false);
        navigate("/projects");
      },
      onError: (err) => {
        console.error("Delete failed", err);
        setConfirmOpen(false);
      },
    });
  };

  if (isLoading) return <div style={{ padding: "2rem" }}>Loading...</div>;
  if (isError || !project)
    return (
      <div style={{ padding: "2rem", color: "red" }}>Project not found.</div>
    );

  // Role-based access (without status gate)
  const canAccessMapping = user.role === "Admin" || user.role === "PM";
  const canAccessInstallation = user.role === "Admin" || user.role === "PM";
  const canAccessIntegration = user.role === "Admin" || user.role === "PM";
  const canAccessCloseout = user.role === "Admin" || user.role === "PM";

  // Full editor: can edit project-level details (Admin or PM)
  const isFullEditor = user.role === "Admin" || user.role === "PM";

  // Any user who has access to at least one module can see the Edit button
  const canEdit = isFullEditor;

  return (
    <div className="">
      <div className="flex-between">
        <h2
          style={{
            margin: 0,
            fontSize: "1.25rem",
            textTransform: "capitalize",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          {project.title}
          {(form.program || project.program) && (
            <span
              style={{
                display: "inline-block",
                background: "#fef3c7",
                color: "#92400e",
                fontSize: "0.72rem",
                fontWeight: "600",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                border: "1px solid #fde68a",
              }}
            >
              {form.program || project.program}
            </span>
          )}
          {(form.category || project.category) && (
            <span
              className={`badge ${getCatBadge(form.category || project.category)}`}
            >
              {form.category || project.category}
            </span>
          )}
          {(form.projectScope || project.projectScope) && (
            <span
              style={{
                display: "inline-block",
                background: "#e0e7ff",
                color: "#3730a3",
                fontSize: "0.72rem",
                fontWeight: "600",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                border: "1px solid #c7d2fe",
              }}
            >
              {form.projectScope || project.projectScope}
            </span>
          )}
        </h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {canEdit && (
            <>
              {editMode ? (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setEditMode(false);
                      setForm({
                        program: project.program || "",
                        category: project.category || "",
                        title: project.title || "",
                        description: project.description || "",
                        projectScope: project.projectScope || "",
                        status: project.status || "Initiation",
                        priority: project.priority || "Low",
                        progress: project.progress || 0,
                        budget: project.budget || 0,
                        spent: project.spent || 0,
                        teamLead: project.teamLead || "",
                        startDate: project.startDate
                          ? new Date(project.startDate)
                              .toISOString()
                              .slice(0, 10)
                          : "",
                        endDate: project.endDate
                          ? new Date(project.endDate).toISOString().slice(0, 10)
                          : "",
                        longitude: project.longitude ?? "",
                        latitude: project.latitude ?? "",
                        teamMembers: project.teamMembers || [],
                        tags: (project.tags || []).join(", "),
                        mapping: {
                          woRequest: {
                            status:
                              project.mapping?.woRequest?.status || "Pending",
                            date: project.mapping?.woRequest?.date
                              ? new Date(project.mapping.woRequest.date)
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks: project.mapping?.woRequest?.remarks || "",
                          },
                          woIssuance: {
                            status:
                              project.mapping?.woIssuance?.status || "Pending",
                            date: project.mapping?.woIssuance?.date
                              ? new Date(project.mapping.woIssuance.date)
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks: project.mapping?.woIssuance?.remarks || "",
                          },
                          materialsRequest: {
                            status:
                              project.mapping?.materialsRequest?.status ||
                              "Pending",
                            date: project.mapping?.materialsRequest?.date
                              ? new Date(project.mapping.materialsRequest.date)
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks:
                              project.mapping?.materialsRequest?.remarks || "",
                          },
                          generalRemarks: project.mapping?.generalRemarks || "",
                        },
                        installation: {
                          tcnRequest: {
                            tcnNumber:
                              project.installation?.tcnRequest?.tcnNumber || "",
                            status:
                              project.installation?.tcnRequest?.status ||
                              "Pending",
                            date: project.installation?.tcnRequest?.date
                              ? new Date(project.installation.tcnRequest.date)
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks:
                              project.installation?.tcnRequest?.remarks || "",
                          },
                          teamsMaterialsMobilization: {
                            status:
                              project.installation?.teamsMaterialsMobilization
                                ?.status || "Pending",
                            date: project.installation
                              ?.teamsMaterialsMobilization?.date
                              ? new Date(
                                  project.installation
                                    .teamsMaterialsMobilization.date,
                                )
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks:
                              project.installation?.teamsMaterialsMobilization
                                ?.remarks || "",
                          },
                          tcnApproval: {
                            status:
                              project.installation?.tcnApproval?.status ||
                              "Pending",
                            date: project.installation?.tcnApproval?.date
                              ? new Date(project.installation.tcnApproval.date)
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks:
                              project.installation?.tcnApproval?.remarks || "",
                          },
                          siteInstallation: {
                            type:
                              project.installation?.siteInstallation?.type ||
                              "RMS",
                            status:
                              project.installation?.siteInstallation?.status ||
                              "Pending",
                            date: project.installation?.siteInstallation?.date
                              ? new Date(
                                  project.installation.siteInstallation.date,
                                )
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks:
                              project.installation?.siteInstallation?.remarks ||
                              "",
                          },
                          generalRemarks:
                            project.installation?.generalRemarks || "",
                        },
                        integration: {
                          alarmsConfiguration: {
                            status:
                              project.integration?.alarmsConfiguration
                                ?.status || "Pending",
                            date: project.integration?.alarmsConfiguration?.date
                              ? new Date(
                                  project.integration.alarmsConfiguration.date,
                                )
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks:
                              project.integration?.alarmsConfiguration
                                ?.remarks || "",
                          },
                          annexNumber: {
                            number:
                              project.integration?.annexNumber?.number || "",
                            status:
                              project.integration?.annexNumber?.status ||
                              "Pending",
                            date: project.integration?.annexNumber?.date
                              ? new Date(project.integration.annexNumber.date)
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks:
                              project.integration?.annexNumber?.remarks || "",
                          },
                          tenantsIntegration: {
                            status:
                              project.integration?.tenantsIntegration?.status ||
                              "Pending",
                            date: project.integration?.tenantsIntegration?.date
                              ? new Date(
                                  project.integration.tenantsIntegration.date,
                                )
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks:
                              project.integration?.tenantsIntegration
                                ?.remarks || "",
                          },
                          generalRemarks:
                            project.integration?.generalRemarks || "",
                        },
                        closeout: {
                          patTcn: {
                            number: project.closeout?.patTcn?.number || "",
                            status:
                              project.closeout?.patTcn?.status || "Pending",
                            date: project.closeout?.patTcn?.date
                              ? new Date(project.closeout.patTcn.date)
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks: project.closeout?.patTcn?.remarks || "",
                          },
                          patStatus: {
                            status:
                              project.closeout?.patStatus?.status || "Pending",
                            date: project.closeout?.patStatus?.date
                              ? new Date(project.closeout.patStatus.date)
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks: project.closeout?.patStatus?.remarks || "",
                          },
                          invoicing: {
                            status:
                              project.closeout?.invoicing?.status || "Pending",
                            date: project.closeout?.invoicing?.date
                              ? new Date(project.closeout.invoicing.date)
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks: project.closeout?.invoicing?.remarks || "",
                          },
                          capitalisationSheetUpdate: {
                            status:
                              project.closeout?.capitalisationSheetUpdate
                                ?.status || "Pending",
                            date: project.closeout?.capitalisationSheetUpdate
                              ?.date
                              ? new Date(
                                  project.closeout.capitalisationSheetUpdate
                                    .date,
                                )
                                  .toISOString()
                                  .slice(0, 10)
                              : "",
                            remarks:
                              project.closeout?.capitalisationSheetUpdate
                                ?.remarks || "",
                          },
                          generalRemarks:
                            project.closeout?.generalRemarks || "",
                        },
                      });
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-outline"
                  onClick={() => setEditMode(true)}
                >
                  Edit
                </button>
              )}
            </>
          )}
          {user?.role === "Admin" && (
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleteMutation.isLoading}
            >
              Delete
            </button>
          )}
          <ConfirmModal
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={performDelete}
            title={`Delete project: ${project.title}`}
            message={`Are you sure you want to permanently delete this project? This action cannot be undone.`}
            isLoading={deleteMutation.isLoading}
          />
        </div>
      </div>

      {/* Edit Classification Banner when in Edit Mode */}
      {editMode && isFullEditor && (
        <div
          className="glass-panel"
          style={{
            padding: "1rem 1.25rem",
            marginBottom: "1rem",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            border: "1.5px solid #c7d2fe",
            borderRadius: "0.75rem",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: "700",
              color: "#3730a3",
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span>Edit Project Hierarchy & Scope</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            <div>
              <label
                className="form-label"
                style={{
                  fontWeight: "600",
                  fontSize: "0.8rem",
                  color: "#475569",
                }}
              >
                Program
              </label>
              <select
                className="form-select"
                value={form.program || ""}
                onChange={(e) => handleProgramChange(e.target.value)}
                style={{
                  width: "100%",
                  background: "#fff",
                  marginTop: "0.25rem",
                }}
              >
                <option value="">— Select Program —</option>
                {programs.map((prog) => (
                  <option key={prog._id} value={prog.name}>
                    {prog.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="form-label"
                style={{
                  fontWeight: "600",
                  fontSize: "0.8rem",
                  color: "#475569",
                }}
              >
                Category
              </label>
              <select
                className="form-select"
                value={form.category || ""}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={!form.program}
                style={{
                  width: "100%",
                  background: "#fff",
                  marginTop: "0.25rem",
                }}
              >
                <option value="">
                  {!form.program
                    ? "— Select a Program First —"
                    : availableCategories.length === 0
                      ? "— No Categories in Program —"
                      : "— Select Category —"}
                </option>
                {availableCategories.map((cat) => (
                  <option key={cat._id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="form-label"
                style={{
                  fontWeight: "600",
                  fontSize: "0.8rem",
                  color: "#475569",
                }}
              >
                Project Scope
              </label>
              <select
                className="form-select"
                value={form.projectScope || ""}
                onChange={(e) =>
                  setForm({ ...form, projectScope: e.target.value })
                }
                disabled={!categoryScopes.length}
                style={{
                  width: "100%",
                  background: "#fff",
                  marginTop: "0.25rem",
                }}
              >
                <option value="">
                  {!form.category
                    ? "Select a category first"
                    : !categoryScopes.length
                      ? "No scopes defined for this category"
                      : "— Select Scope —"}
                </option>
                {categoryScopes.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      <div
        className="glass-panel"
        style={{ padding: "1.25rem 1.5rem", marginBottom: "1rem" }}
      >
        <div>
          <div
            style={{
              color: "black",
              marginTop: "0.35rem",
              fontSize: "0.9rem",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              width: "100%",
            }}
          >
            <div className="">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  borderRight: "1px solid #e5e7eb",
                  paddingRight: "1rem",
                }}
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {" "}
                  <ChartNoAxesColumnIncreasing width={16} /> Status:
                </span>
                <div
                  style={{
                    background: getStatusColor(project.status),
                    padding: "2px 10px",
                    color: "white",
                    fontWeight: "600",
                    borderRadius: "5px",
                  }}
                >
                  {project.status}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  borderRight: "1px solid #e5e7eb",
                  paddingRight: "1rem",
                }}
              >
                <BanknoteArrowDown width={16} />{" "}
                <div className="">
                  Allocated Budget :
                  <SaudiRiyal size={12} />{" "}
                  {project.budget?.toLocaleString() ?? 0}
                </div>
              </div>
              <div className=" " style={{ width: "100%" }}>
                <label className="form-label" style={{ fontWeight: "600" }}>
                  Project Scope
                </label>
                {editMode && isFullEditor ? (
                  <select
                    className="form-select"
                    value={form.projectScope || ""}
                    onChange={(e) =>
                      setForm({ ...form, projectScope: e.target.value })
                    }
                    disabled={!categoryScopes.length}
                    style={{ width: "100%", marginTop: "0.5rem" }}
                  >
                    <option value="">
                      {categoryScopes.length === 0
                        ? "No scopes defined for this category"
                        : "— Select scope —"}
                    </option>
                    {categoryScopes.map((scope) => (
                      <option key={scope} value={scope}>
                        {scope}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ marginTop: "0.5rem" }}>
                    {project.projectScope ? (
                      <span
                        style={{
                          display: "inline-block",
                          background: "#e0e7ff",
                          color: "#3730a3",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          padding: "0.3rem 0.85rem",
                          borderRadius: "9999px",
                          border: "1px solid #c7d2fe",
                        }}
                      >
                        {project.projectScope}
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                        —
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{ borderRight: "1px solid #e5e7eb", paddingRight: "1rem" }}
            >
              <div
                style={{
                  marginTop: "0.35rem",
                  fontSize: "0.875rem",
                }}
              >
                <Calendar size={14} /> Created :{" "}
                {new Date(project.createdAt).toLocaleDateString()}
              </div>
              <div>
                <Users2 size={14} /> Team Members :{" "}
                {editMode && isFullEditor ? (
                  <div
                    style={{
                      maxHeight: "130px",
                      overflowY: "auto",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.5rem",
                      padding: "0.5rem",
                      marginTop: "0.3rem",
                      background: "#ffffff",
                    }}
                  >
                    {usersLoading ? (
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        Loading users...
                      </div>
                    ) : (
                      users.map((u) => {
                        const userIdentifier = u.email || u.name;
                        const isChecked = (form.teamMembers || []).includes(
                          userIdentifier,
                        );
                        return (
                          <label
                            key={u._id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              fontSize: "0.8rem",
                              marginBottom: "0.25rem",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const currentMembers = form.teamMembers || [];
                                if (e.target.checked) {
                                  setForm({
                                    ...form,
                                    teamMembers: [
                                      ...currentMembers,
                                      userIdentifier,
                                    ],
                                  });
                                } else {
                                  setForm({
                                    ...form,
                                    teamMembers: currentMembers.filter(
                                      (m) => m !== userIdentifier,
                                    ),
                                  });
                                }
                              }}
                            />
                            <span>
                              {u.name} {u.email ? `(${u.email})` : ""}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: "12px" }}>
                    {" "}
                    {(project.teamMembers || []).join(", ") || "—"}
                  </span>
                )}
              </div>
            </div>
            <TeamMembers
              project={project}
              editMode={editMode}
              isFullEditor={isFullEditor}
              form={form}
              setForm={setForm}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr  ",
          gap: "0.5rem",
        }}
      >
        <div className="glass-panel" style={{ width: "100%" }}>
          <label
            className="form-label"
            style={{ fontSize: "1rem", fontWeight: "600" }}
          >
            Description
          </label>
          {editMode && isFullEditor ? (
            <textarea
              className="form-textarea"
              rows={20}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          ) : (
            <p
              style={{
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
                width: "350px",
                overflowWrap: "break-word",
                height: "350px",
                overflowY: "auto",
                fontSize: "0.8rem",
              }}
            >
              {project.description}
            </p>
          )}
        </div>

        <div className="">
          <div className=" glass-panel" style={{ minHeight: "100%" }}>
            <label
              className="form-label"
              style={{ fontSize: "1rem", fontWeight: "600" }}
            >
              Details{" "}
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr ",
                gap: "0.4rem",
                marginTop: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <label
                  className="form-label"
                  style={{ fontSize: "0.8rem", fontWeight: "600" }}
                >
                  Program
                </label>
                {editMode && isFullEditor ? (
                  <select
                    className="form-select"
                    value={form.program || ""}
                    onChange={(e) =>
                      setForm({ ...form, program: e.target.value })
                    }
                    style={{
                      fontSize: "0.8rem",
                      padding: "0.25rem 0.5rem",
                      maxWidth: "160px",
                    }}
                  >
                    <option value="">— Select Program —</option>
                    {programs.map((prog) => (
                      <option key={prog._id} value={prog.name}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "#4338ca",
                    }}
                  >
                    {project.program || "—"}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <label
                  className="form-label"
                  style={{ fontSize: "0.8rem", fontWeight: "600" }}
                >
                  Category
                </label>
                {editMode && isFullEditor ? (
                  <select
                    className="form-select"
                    value={form.category || ""}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    style={{
                      fontSize: "0.8rem",
                      padding: "0.25rem 0.5rem",
                      maxWidth: "160px",
                    }}
                  >
                    <option value="">— Select Category —</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: "0.8rem", fontWeight: "600" }}>
                    {project.category || "—"}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <label
                  className="form-label"
                  style={{ fontSize: "0.8rem", fontWeight: "600" }}
                >
                  Project Scope
                </label>
                {editMode && isFullEditor ? (
                  <select
                    className="form-select"
                    value={form.projectScope || ""}
                    onChange={(e) =>
                      setForm({ ...form, projectScope: e.target.value })
                    }
                    disabled={!categoryScopes.length}
                    style={{
                      fontSize: "0.8rem",
                      padding: "0.25rem 0.5rem",
                      maxWidth: "160px",
                    }}
                  >
                    <option value="">
                      {!form.category
                        ? "Select category"
                        : !categoryScopes.length
                          ? "No scopes"
                          : "— Select Scope —"}
                    </option>
                    {categoryScopes.map((scope) => (
                      <option key={scope} value={scope}>
                        {scope}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "#3730a3",
                    }}
                  >
                    {project.projectScope || "—"}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <label className="form-label">Team Lead</label>
                {editMode && isFullEditor ? (
                  <>
                    {usersLoading ? (
                      <select className="form-select" disabled>
                        <option>Loading users...</option>
                      </select>
                    ) : (
                      <select
                        className="form-select"
                        value={form.teamLead}
                        onChange={(e) =>
                          setForm({ ...form, teamLead: e.target.value })
                        }
                      >
                        <option value="">— Select team lead —</option>
                        {users.map((u) => (
                          <option key={u._id} value={u.name}>
                            {u.name} {u.email ? `(${u.email})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                ) : (
                  <div>{project.teamLead || "—"}</div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "0.4rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <label className="form-label">Start Date</label>
                {editMode && isFullEditor ? (
                  <input
                    type="date"
                    className="form-input"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />
                ) : (
                  <div style={{ fontSize: "0.8rem" }}>
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString()
                      : "—"}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <label className="form-label">End Date</label>
                {editMode && isFullEditor ? (
                  <input
                    type="date"
                    className="form-input"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                  />
                ) : (
                  <div style={{ fontSize: "0.8rem" }}>
                    {project.endDate
                      ? new Date(project.endDate).toLocaleDateString()
                      : "—"}
                  </div>
                )}
              </div>
            </div>

            <div
              className=""
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <label className="form-label" style={{ fontSize: "0.8rem" }}>
                Priority
              </label>
              {editMode && isFullEditor ? (
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              ) : (
                <div className="" style={{ display: "flex" }}>
                  <div
                    className={`priority-${project.priority.toLowerCase()}`}
                    style={{ fontSize: "0.8rem", padding: "1px 10px" }}
                  >
                    {project.priority}
                  </div>
                </div>
              )}
            </div>

            <div
              className=""
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginTop: "0.4rem",
              }}
            >
              <label className="form-label" style={{ fontSize: "0.8rem" }}>
                WO Request
              </label>
              <div
                className={`pill-${(project.mapping?.woRequest?.status || "pending").toLowerCase()}`}
                style={{ fontSize: "0.7rem", padding: "1px 10px" }}
              >
                {project.mapping?.woRequest?.status || "Pending"}
              </div>
            </div>

            <div
              className=""
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginTop: "0.4rem",
              }}
            >
              <label className="form-label" style={{ fontSize: "0.8rem" }}>
                Issued TCN
              </label>
              <div
                className={`pill-${(project.installation?.tcnRequest?.status || "pending").toLowerCase()}`}
                style={{ fontSize: "0.7rem", padding: "1px 10px" }}
              >
                {project.installation?.tcnRequest?.status || "Pending"}
              </div>
            </div>

            <div
              className=""
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginTop: "0.4rem",
              }}
            >
              <label className="form-label" style={{ fontSize: "0.8rem" }}>
                Site Installation
              </label>
              <div
                className={`pill-${(project.installation?.siteInstallation?.status || "pending").toLowerCase()}`}
                style={{ fontSize: "0.7rem", padding: "1px 10px" }}
              >
                {project.installation?.siteInstallation?.status || "Pending"}
              </div>
            </div>

            <div
              className=""
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginTop: "0.4rem",
              }}
            >
              <label className="form-label" style={{ fontSize: "0.8rem" }}>
                Integration
              </label>
              <div
                className={`pill-${(project.integration?.alarmsConfiguration?.status || "pending").toLowerCase()}`}
                style={{ fontSize: "0.7rem", padding: "1px 10px" }}
              >
                {project.integration?.alarmsConfiguration?.status || "Pending"}
              </div>
            </div>
            <div
              className=""
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginTop: "0.4rem",
              }}
            >
              <label className="form-label" style={{ fontSize: "0.8rem" }}>
                Region
              </label>
              <div
                className={`pill-${(project.region || "pending").toLowerCase()}`}
                style={{ fontSize: "0.7rem", padding: "1px 10px" }}
              >
                {project.region || "-"}
              </div>
            </div>
            <div
              className=""
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginTop: "0.4rem",
              }}
            >
              <label className="form-label" style={{ fontSize: "0.8rem" }}>
                City
              </label>
              <div
                className={`pill-${(project.region || "pending").toLowerCase()}`}
                style={{ fontSize: "0.7rem", padding: "1px 10px" }}
              >
                {project.city || "-"}
              </div>
            </div>
          </div>
        </div>
        <div>
          <ProgressBar
            editMode={editMode}
            form={form}
            project={project}
            setForm={setForm}
          />
          <Budget_Spent
            editMode={editMode}
            form={form}
            project={project}
            setForm={setForm}
          />
        </div>
      </div>
      <div className="" style={{ margin: "10px 0" }}>
        {project.latitude != null && project.longitude != null && (
          <MapData project={project} />
        )}
      </div>

      <div
        className=""
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        <WorkOrder
          project={project}
          editMode={editMode}
          setForm={setForm}
          form={form}
          getWoStatusColor={getWoStatusColor}
        />

        {/* admin pm and Coordinator  */}

        <Installation
          project={project}
          editMode={editMode}
          setForm={setForm}
          form={form}
          getWoStatusColor={getWoStatusColor}
        />

        <Integration
          project={project}
          editMode={editMode}
          setForm={setForm}
          form={form}
          getWoStatusColor={getWoStatusColor}
        />

        <Closeout
          project={project}
          editMode={editMode}
          setForm={setForm}
          form={form}
          getWoStatusColor={getWoStatusColor}
        />
      </div>
    </div>
  );
}
