import { useState, useMemo, useEffect } from "react";
import { Save } from "lucide-react";
import { z } from "zod";
import { useAuthStore } from "../store/authStore";
import {
  useCreateProject,
  useCategories,
  useProjectsByCategory,
  usePrograms,
} from "../hooks/project";
import { useUsers } from "../hooks/user";
import LocationPicker from "./LocationPicker";
import { useParams } from "react-router-dom";

const projectFormSchema = z.object({
  program: z
    .string({ required_error: "Program is required" })
    .trim()
    .min(1, "Program is required"),
  title: z
    .string({ required_error: "Project title is required" })
    .trim()
    .min(1, "Project title is required"),
  category: z
    .string({ required_error: "Category is required" })
    .trim()
    .min(1, "Category is required"),
  projectScope: z
    .string({ required_error: "Project Scope is required" })
    .trim()
    .min(1, "Project Scope is required"),
  siteId: z
    .string({ required_error: "Site ID is required" })
    .trim()
    .min(1, "Site ID is required"),
  tawalId: z
    .string({ required_error: "Tawal ID is required" })
    .trim()
    .min(1, "Tawal ID is required"),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  teamLead: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.coerce.number().min(0, "Budget must be at least 0").optional(),
  spent: z.coerce.number().min(0, "Spent must be at least 0").optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  latitude: z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .min(-90, "Latitude must be between -90 and 90")
        .max(90, "Latitude must be between -90 and 90"),
    ])
    .optional(),
  longitude: z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .min(-180, "Longitude must be between -180 and 180")
        .max(180, "Longitude must be between -180 and 180"),
    ])
    .optional(),
});

const ProjectForm = ({
  isOpen,
  onClose,
  initialProgram = "",
  initialCategory = "",
}) => {
  const params = useParams();
  const selectProgramFromParams = params.programName || initialProgram;
  const SelectCategoryFroMParams = params.categoryName || initialCategory;
  const { user } = useAuthStore();
  const { mutate, isLoading, error } = useCreateProject();
  const { data: programs = [], isLoading: isProgramsLoading } = usePrograms();
  const { data: categories = [], isLoading: isCategoriesLoading } =
    useCategories();
  const canCreateProject = user?.role === "Admin" || user?.role === "Manager";
  const { data: users = [], isLoading: isUsersLoading } = useUsers(
    isOpen && canCreateProject,
  );
  const [validationError, setValidationError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    program: selectProgramFromParams || "",
    title: "",
    category: SelectCategoryFroMParams || "",
    projectScope: "",
    description: "",
    status: "Initiation",
    priority: "Low",
    progress: 0,
    teamLead: "",
    startDate: "",
    endDate: "",
    budget: 0,
    spent: 0,
    siteId: "",
    tawalId: "",
    region: "",
    city: "",
    longitude: "",
    latitude: "",
    teamMembers: [],
    tags: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        program:
          selectProgramFromParams || prev.program || programs[0]?.name || "",
        category: SelectCategoryFroMParams || prev.category || "",
      }));
    }
  }, [isOpen, selectProgramFromParams, SelectCategoryFroMParams, programs]);

  const availableCategories = useMemo(() => {
    if (!formData.program) return categories;
    return categories.filter(
      (cat) => !cat.program || cat.program === formData.program,
    );
  }, [categories, formData.program]);

  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.name === formData.category),
    [categories, formData.category],
  );

  const categoryBudget = selectedCategory?.budget || 0;

  const { data: categoryProjectsResponse } = useProjectsByCategory(
    formData.category,
    {
      enabled: !!formData.category,
    },
  );

  const existingCategoryAllocated = useMemo(() => {
    const projectsList =
      categoryProjectsResponse?.data || categoryProjectsResponse || [];
    return Array.isArray(projectsList)
      ? projectsList.reduce(
          (sum, project) => sum + Number(project.budget || 0),
          0,
        )
      : 0;
  }, [categoryProjectsResponse]);

  const currentProjectBudget = Number(formData.budget) || 0;
  const categoryAllocated = existingCategoryAllocated + currentProjectBudget;
  const remainingCategoryBudget = Math.max(
    0,
    categoryBudget - categoryAllocated,
  );

  if (!isOpen) return null;

  const handleFieldChange = (field, value, extraState = {}) => {
    setFormData((prev) => ({ ...prev, [field]: value, ...extraState }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const renderFieldError = (field) => {
    if (!fieldErrors[field]) return null;
    return (
      <span
        style={{
          color: "#ef4444",
          fontSize: "0.75rem",
          marginTop: "0.25rem",
          display: "block",
          fontWeight: "500",
        }}
      >
        {fieldErrors[field]}
      </span>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");
    setFieldErrors({});

    // Zod validation
    const validationResult = projectFormSchema.safeParse(formData);
    const errors = {};

    if (!validationResult.success) {
      validationResult.error.issues.forEach((issue) => {
        const fieldName = issue.path[0];
        if (fieldName && !errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      });
    }

    // Required project scope if category has defined scopes
    if (selectedCategory?.scopes?.length > 0 && !formData.projectScope) {
      errors.projectScope = "Project Scope is required for this category";
    }

    const parsedBudget = Number(formData.budget) || 0;
    const parsedSpent = Number(formData.spent) || 0;
    const parsedLongitude =
      formData.longitude === "" ? undefined : Number(formData.longitude);
    const parsedLatitude =
      formData.latitude === "" ? undefined : Number(formData.latitude);

    if (selectedCategory) {
      const remainingBudget = Math.max(
        0,
        categoryBudget - existingCategoryAllocated,
      );
      if (parsedBudget > remainingBudget) {
        errors.budget = `Project budget cannot exceed remaining category budget: ₡${remainingBudget.toLocaleString()}`;
      }
    }

    if (parsedSpent > parsedBudget) {
      errors.spent = "Spent cannot be greater than project budget.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const parsedData = {
      ...formData,
      budget: parsedBudget,
      spent: parsedSpent,
      categoryBudget,
      longitude: parsedLongitude,
      latitude: parsedLatitude,
      tags: formData.tags
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
    };

    mutate(parsedData, {
      onSuccess: () => {
        onClose();
        setFieldErrors({});
        setFormData({
          program: selectProgramFromParams || programs[0]?.name || "",
          title: "",
          category: "",
          projectScope: "",
          description: "",
          status: "Initiation",
          priority: "Low",
          progress: 0,
          teamLead: "",
          startDate: "",
          endDate: "",
          budget: 0,
          spent: 0,
          siteId: "",
          tawalId: "",
          region: "",
          city: "",
          longitude: "",
          latitude: "",
          teamMembers: [],
          tags: "",
        });
      },
    });
  };

  const formStyles = {
    label: {
      display: "block",
      fontSize: "0.8rem",
      fontWeight: "600",
      color: "#64748b",
      marginBottom: "0.4rem",
    },
    input: {
      width: "100%",
      padding: "0.6rem",
      border: "1px solid #e2e8f0",
      borderRadius: "0.4rem",
      fontSize: "0.875rem",
      fontFamily: "inherit",
    },
    gridRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "1rem",
      marginBottom: "1rem",
    },
  };

  const getInputStyle = (field, extraStyle = {}) => ({
    ...formStyles.input,
    ...extraStyle,
    borderColor: fieldErrors[field] ? "#ef4444" : "#e2e8f0",
  });

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ overflowY: "auto", padding: "2rem 0" }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "600px",
          margin: "auto",
          padding: "0",
          overflow: "hidden",
        }}
      >
        <div
          style={{ padding: "1.5rem", maxHeight: "90vh", overflowY: "auto" }}
        >
          {user?.role === "Admin" || user?.role === "Manager" ? (
            <form onSubmit={handleSubmit} noValidate>
              <h3 className="text-xl font-bold mb-8 text-center">
                New Project
              </h3>
              <div style={formStyles.gridRow}>
                <div>
                  <label style={formStyles.label}>Program *</label>
                  <select
                    style={getInputStyle("program")}
                    value={formData.program}
                    onChange={(e) => {
                      const nextProg = e.target.value;
                      const validCats = categories.filter(
                        (c) => !c.program || c.program === nextProg,
                      );
                      const catValid = validCats.some(
                        (c) => c.name === formData.category,
                      );
                      handleFieldChange("program", nextProg, {
                        category: catValid ? formData.category : "",
                        projectScope: catValid ? formData.projectScope : "",
                      });
                    }}
                    disabled={isProgramsLoading}
                  >
                    <option value="" disabled>
                      {isProgramsLoading
                        ? "Loading programs..."
                        : "Select Program"}
                    </option>
                    {programs.map((prog) => (
                      <option key={prog._id} value={prog.name}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                  {renderFieldError("program")}
                </div>
                <div>
                  <label style={formStyles.label}>Category *</label>
                  <select
                    style={getInputStyle("category")}
                    value={formData.category}
                    onChange={(e) =>
                      handleFieldChange("category", e.target.value, {
                        projectScope: "",
                      })
                    }
                    disabled={isCategoriesLoading || !formData.program}
                  >
                    <option value="" disabled>
                      {isCategoriesLoading
                        ? "Loading categories..."
                        : !formData.program
                          ? "Select a program first"
                          : availableCategories.length === 0
                            ? "No categories in this program"
                            : "Select category"}
                    </option>
                    {availableCategories.map((cat) => (
                      <option key={cat._id} value={cat.name}>
                        {cat.name} — &#x20C1;{" "}
                        {cat.budget?.toLocaleString() ?? 0}
                      </option>
                    ))}
                  </select>
                  {renderFieldError("category")}
                </div>
              </div>

              <div style={formStyles.gridRow}>
                <div>
                  <label style={formStyles.label}>Project Title *</label>
                  <input
                    type="text"
                    style={getInputStyle("title")}
                    placeholder="e.g. RMS Dashboard v2"
                    value={formData.title}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                  />
                  {renderFieldError("title")}
                </div>
                <div>
                  <label style={formStyles.label}>Project Scope *</label>
                  <select
                    style={getInputStyle("projectScope")}
                    value={formData.projectScope}
                    onChange={(e) =>
                      handleFieldChange("projectScope", e.target.value)
                    }
                    disabled={
                      !formData.category || !selectedCategory?.scopes?.length
                    }
                  >
                    <option value="">
                      {!formData.category
                        ? "Select a category first"
                        : !selectedCategory?.scopes?.length
                          ? "No scopes defined for this category"
                          : "— Select scope —"}
                    </option>
                    {(selectedCategory?.scopes || []).map((scope) => (
                      <option key={scope} value={scope}>
                        {scope}
                      </option>
                    ))}
                  </select>
                  {renderFieldError("projectScope")}
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={formStyles.label}>Description</label>
                <textarea
                  style={getInputStyle("description", {
                    minHeight: "80px",
                    resize: "vertical",
                  })}
                  placeholder="Brief project description..."
                  value={formData.description}
                  onChange={(e) =>
                    handleFieldChange("description", e.target.value)
                  }
                ></textarea>
                {renderFieldError("description")}
              </div>

              <div style={formStyles.gridRow}>
                <div>
                  <label style={formStyles.label}>Site ID *</label>
                  <input
                    type="text"
                    style={getInputStyle("siteId")}
                    placeholder="e.g. STC-12345"
                    value={formData.siteId}
                    onChange={(e) =>
                      handleFieldChange("siteId", e.target.value)
                    }
                  />
                  {renderFieldError("siteId")}
                </div>
                <div>
                  <label style={formStyles.label}>Tawal ID *</label>
                  <input
                    type="text"
                    style={getInputStyle("tawalId")}
                    placeholder="e.g. TAW-98765"
                    value={formData.tawalId}
                    onChange={(e) =>
                      handleFieldChange("tawalId", e.target.value)
                    }
                  />
                  {renderFieldError("tawalId")}
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <div>
                  <label style={formStyles.label}>Priority</label>
                  <select
                    style={getInputStyle("priority")}
                    value={formData.priority}
                    onChange={(e) =>
                      handleFieldChange("priority", e.target.value)
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                  {renderFieldError("priority")}
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <div>
                  <label style={formStyles.label}>Team Lead</label>
                  <select
                    style={getInputStyle("teamLead")}
                    value={formData.teamLead}
                    onChange={(e) =>
                      handleFieldChange("teamLead", e.target.value)
                    }
                    disabled={isUsersLoading}
                  >
                    <option value="">Select Team Lead</option>
                    {users.map((u) => (
                      <option key={u._id} value={u.name}>
                        {u.name} -{" "}
                        <span style={{ fontSize: "0.7rem" }}>{u.role}</span>
                      </option>
                    ))}
                  </select>
                  {renderFieldError("teamLead")}
                </div>
              </div>

              <div style={formStyles.gridRow}>
                <div>
                  <label style={formStyles.label}>Start Date</label>
                  <input
                    type="date"
                    style={getInputStyle("startDate")}
                    value={formData.startDate}
                    onChange={(e) =>
                      handleFieldChange("startDate", e.target.value)
                    }
                  />
                  {renderFieldError("startDate")}
                </div>
                <div>
                  <label style={formStyles.label}>Due Date</label>
                  <input
                    type="date"
                    style={getInputStyle("endDate")}
                    value={formData.endDate}
                    onChange={(e) =>
                      handleFieldChange("endDate", e.target.value)
                    }
                  />
                  {renderFieldError("endDate")}
                </div>
              </div>

              <div style={formStyles.gridRow}>
                <div>
                  <label style={formStyles.label}>Budget (&#x20C1;)</label>
                  <input
                    type="number"
                    style={getInputStyle("budget")}
                    min="0"
                    placeholder="0"
                    value={formData.budget}
                    onChange={(e) =>
                      handleFieldChange("budget", e.target.value)
                    }
                  />
                  {renderFieldError("budget")}
                </div>
                <div>
                  <label style={formStyles.label}>Spent (&#x20C1;)</label>
                  <input
                    type="number"
                    style={getInputStyle("spent")}
                    min="0"
                    placeholder="0"
                    value={formData.spent}
                    onChange={(e) => handleFieldChange("spent", e.target.value)}
                  />
                  {renderFieldError("spent")}
                </div>
              </div>
              <div className="">
                {selectedCategory && formData.budget > 0 && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      color: "#cc3300",
                      fontSize: "0.9rem",
                      background: "#ffcc00",
                      padding: "0.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <b>Category budget:</b> &#x20C1;{" "}
                    {categoryBudget.toLocaleString()}.
                    <span>
                      {" "}
                      <b>Allocated:</b>&#x20C1;{" "}
                      {categoryAllocated.toLocaleString()}.
                    </span>
                    <span>
                      {" "}
                      <b>Remaining:</b> &#x20C1;
                      {remainingCategoryBudget.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={formStyles.label}>Pick Location on Map</label>
                <LocationPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLocationChange={({ latitude, longitude, city, region }) => {
                    const updates = { latitude, longitude };
                    if (city !== undefined) updates.city = city;
                    if (region !== undefined) updates.region = region;
                    setFormData((prev) => ({ ...prev, ...updates }));
                    setFieldErrors((prev) => ({
                      ...prev,
                      latitude: "",
                      longitude: "",
                      city: "",
                      region: "",
                    }));
                  }}
                />
              </div>
              <div style={formStyles.gridRow}>
                <div>
                  <label style={formStyles.label}>Region</label>
                  <input
                    type="text"
                    style={getInputStyle("region")}
                    placeholder="e.g. Riyadh Region"
                    value={formData.region}
                    onChange={(e) =>
                      handleFieldChange("region", e.target.value)
                    }
                  />
                  {renderFieldError("region")}
                </div>
                <div>
                  <label style={formStyles.label}>City</label>
                  <input
                    type="text"
                    style={getInputStyle("city")}
                    placeholder="e.g. Riyadh"
                    value={formData.city}
                    onChange={(e) => handleFieldChange("city", e.target.value)}
                  />
                  {renderFieldError("city")}
                </div>
              </div>
              <div style={formStyles.gridRow}>
                <div>
                  <label style={formStyles.label}>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    style={getInputStyle("latitude")}
                    placeholder="e.g. 24.7136"
                    value={formData.latitude}
                    onChange={(e) =>
                      handleFieldChange("latitude", e.target.value)
                    }
                  />
                  {renderFieldError("latitude")}
                </div>
                <div>
                  <label style={formStyles.label}>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    style={getInputStyle("longitude")}
                    placeholder="e.g. 46.6753"
                    value={formData.longitude}
                    onChange={(e) =>
                      handleFieldChange("longitude", e.target.value)
                    }
                  />
                  {renderFieldError("longitude")}
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={formStyles.label}>
                  Team Members (Hold Ctrl/Cmd to select multiple)
                </label>
                <select
                  multiple
                  style={getInputStyle("teamMembers", { minHeight: "80px" })}
                  value={formData.teamMembers}
                  onChange={(e) => {
                    const vals = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    );
                    handleFieldChange("teamMembers", vals);
                  }}
                  disabled={isUsersLoading}
                >
                  {users.map((u) => (
                    <option key={u._id} value={u.email}>
                      {u.name} -- {u.email}
                    </option>
                  ))}
                </select>
                {renderFieldError("teamMembers")}
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <label style={formStyles.label}>Tags (comma-separated)</label>
                <input
                  type="text"
                  style={getInputStyle("tags")}
                  placeholder="e.g. IoT, API, dashboard"
                  value={formData.tags}
                  onChange={(e) => handleFieldChange("tags", e.target.value)}
                />
                {renderFieldError("tags")}
              </div>
              <div className="">
                {error && (
                  <div style={{ color: "#ef4444", marginBottom: "0.5rem" }}>
                    *
                    {error.response?.data?.message ||
                      error.message ||
                      String(error)}
                  </div>
                )}
                {validationError && (
                  <div
                    style={{
                      color: "#ef4444",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    *{validationError}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: "0.6rem 1.2rem",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#334155",
                    borderRadius: "0.4rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.6rem 1.2rem",
                    border: "none",
                    background: "#4f46e5",
                    color: "white",
                    borderRadius: "0.4rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Save size={16} /> {isLoading ? "Saving..." : "Save Project"}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p style={{ color: "#ef4444" }}>
                You do not have permission to create projects. Only Admins and
                Managers can perform this action.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "2rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectForm;
