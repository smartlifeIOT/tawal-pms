import React, { useState, useEffect, useMemo } from "react";
import { FolderKanban, Layers, X, Check, AlertCircle } from "lucide-react";
import { usePrograms, useCategories } from "../hooks/project";

export default function BulkUpdateProgramCategoryModal({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
  isLoading,
}) {
  const { data: programs = [], isLoading: isProgramsLoading } = usePrograms();
  const { data: categories = [], isLoading: isCategoriesLoading } =
    useCategories();

  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedScope, setSelectedScope] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Filter categories to only those belonging to the selected program
  const availableCategories = useMemo(() => {
    if (!selectedProgram) return categories;
    return categories.filter(
      (cat) => !cat.program || cat.program === selectedProgram,
    );
  }, [categories, selectedProgram]);

  // Scopes available for the currently selected category
  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.name === selectedCategory);
  }, [categories, selectedCategory]);

  const availableScopes = useMemo(() => {
    return selectedCategoryObj?.scopes || [];
  }, [selectedCategoryObj]);

  // When modal opens, preselect first program if available
  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      if (programs.length > 0 && !selectedProgram) {
        setSelectedProgram(programs[0].name);
      }
    }
  }, [isOpen, programs]);

  // When selectedProgram changes, verify if current selectedCategory belongs to the new program
  useEffect(() => {
    if (!selectedProgram) {
      setSelectedCategory("");
      setSelectedScope("");
      return;
    }
    const matching = categories.filter(
      (c) => !c.program || c.program === selectedProgram,
    );
    if (!matching.some((c) => c.name === selectedCategory)) {
      setSelectedCategory(matching[0]?.name || "");
      setSelectedScope("");
    }
  }, [selectedProgram, categories]);

  // When selectedCategory changes, verify scope
  useEffect(() => {
    if (
      selectedScope &&
      !availableScopes.includes(selectedScope)
    ) {
      setSelectedScope("");
    }
  }, [selectedCategory, availableScopes]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedProgram) {
      setErrorMsg("Please select a Program.");
      return;
    }

    if (!selectedCategory) {
      setErrorMsg("Please select a Category.");
      return;
    }

    onConfirm({
      program: selectedProgram,
      category: selectedCategory,
      projectScope: selectedScope,
    });
  };

  const currentProgramObj = programs.find((p) => p.name === selectedProgram);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "520px",
          width: "100%",
          padding: "2rem",
          margin: "1rem",
          borderRadius: "0.75rem",
          background: "#ffffff",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          disabled={isLoading}
          style={{
            position: "absolute",
            top: "1.25rem",
            right: "1.25rem",
            background: "none",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "0.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "0.6rem",
              background: "#eef2ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4f46e5",
            }}
          >
            <FolderKanban size={24} />
          </div>
          <div>
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: "700",
                color: "#0f172a",
                margin: 0,
              }}
            >
              Bulk Update Program & Category
            </h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#64748b",
                margin: "0.2rem 0 0",
              }}
            >
              Apply to <strong>{selectedCount}</strong> selected project{selectedCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Program Select */}
          <div style={{ marginBottom: "1.1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "#334155",
                marginBottom: "0.35rem",
              }}
            >
              Program *
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => {
                setSelectedProgram(e.target.value);
                setErrorMsg("");
              }}
              disabled={isProgramsLoading || isLoading}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "0.45rem",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: "0.875rem",
                color: "#1e293b",
                outline: "none",
              }}
            >
              <option value="" disabled>
                {isProgramsLoading ? "Loading programs..." : "— Select Program —"}
              </option>
              {programs.map((prog) => (
                <option key={prog._id} value={prog.name}>
                  {prog.name} (Budget: ₡{(prog.budget || 0).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Category Select */}
          <div style={{ marginBottom: "1.1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "#334155",
                marginBottom: "0.35rem",
              }}
            >
              Category *
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setErrorMsg("");
              }}
              disabled={isCategoriesLoading || !selectedProgram || isLoading}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "0.45rem",
                border: "1px solid #cbd5e1",
                background: !selectedProgram ? "#f8fafc" : "#ffffff",
                fontSize: "0.875rem",
                color: "#1e293b",
                outline: "none",
              }}
            >
              <option value="" disabled>
                {isCategoriesLoading
                  ? "Loading categories..."
                  : !selectedProgram
                    ? "Select a program first"
                    : availableCategories.length === 0
                      ? "No categories in this program"
                      : "— Select Category —"}
              </option>
              {availableCategories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name} — Budget: ₡{(cat.budget || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Project Scope Select (Optional) */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "#334155",
                marginBottom: "0.35rem",
              }}
            >
              Project Scope (Optional)
            </label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              disabled={availableScopes.length === 0 || isLoading}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "0.45rem",
                border: "1px solid #cbd5e1",
                background: availableScopes.length === 0 ? "#f8fafc" : "#ffffff",
                fontSize: "0.875rem",
                color: "#1e293b",
                outline: "none",
              }}
            >
              <option value="">
                {availableScopes.length === 0
                  ? "— No scopes defined for this category —"
                  : "— Keep existing / None —"}
              </option>
              {availableScopes.map((scope) => (
                <option key={scope} value={scope}>
                  {scope}
                </option>
              ))}
            </select>
          </div>

          {/* Live Preview Summary Card */}
          {selectedProgram && selectedCategory && (
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "0.5rem",
                padding: "0.85rem 1rem",
                marginBottom: "1.25rem",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ color: "#64748b", fontWeight: "500", marginBottom: "0.4rem" }}>
                Target Assignment:
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.2rem 0.65rem",
                    borderRadius: "9999px",
                    background: "#ecfdf5",
                    color: "#065f46",
                    fontWeight: "600",
                    border: "1px solid #a7f3d0",
                  }}
                >
                  Program: {selectedProgram}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.2rem 0.65rem",
                    borderRadius: "9999px",
                    background: "#e0e7ff",
                    color: "#3730a3",
                    fontWeight: "600",
                    border: "1px solid #c7d2fe",
                  }}
                >
                  Category: {selectedCategory}
                </span>
                {selectedScope && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.2rem 0.65rem",
                      borderRadius: "9999px",
                      background: "#fef3c7",
                      color: "#92400e",
                      fontWeight: "600",
                      border: "1px solid #fde68a",
                    }}
                  >
                    Scope: {selectedScope}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                marginBottom: "1.25rem",
                padding: "0.6rem 0.85rem",
                borderRadius: "0.45rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <AlertCircle size={15} />
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: "0.55rem 1.15rem",
                borderRadius: "0.45rem",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                fontWeight: "600",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedProgram || !selectedCategory}
              style={{
                padding: "0.55rem 1.35rem",
                borderRadius: "0.45rem",
                border: "none",
                background: "#4f46e5",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "0.85rem",
                cursor: isLoading || !selectedProgram || !selectedCategory ? "not-allowed" : "pointer",
                opacity: isLoading || !selectedProgram || !selectedCategory ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {isLoading ? (
                "Updating..."
              ) : (
                <>
                  <Check size={16} />
                  Update {selectedCount} Project{selectedCount > 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
