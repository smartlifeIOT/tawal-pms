export default function ProgressBar({ project, editMode, form }) {
  return (
    <div className="  glass-panel">
      {/* ── Dynamic Phase Progress Bar ── */}
      {(() => {
        const phases = [
          { key: "initiation", label: "Initiation", statusMatch: "Initiation" },
          { key: "mapping", label: "Mapping", statusMatch: "Mapping" },
          {
            key: "installation",
            label: "Installation",
            statusMatch: "Installation",
          },
          {
            key: "integration",
            label: "Integration",
            statusMatch: "Integration",
          },
          { key: "closeout", label: "Closeout", statusMatch: "Closeout" },
          { key: "completed", label: "Completed", statusMatch: "Completed" },
        ];
        const sourceData = editMode ? form : project;
        const currentStatus = sourceData?.status || "Initiation";
        //
        // Derive the active phase index directly from the status
        const activePhaseIdx = phases.findIndex(
          (p) => p.statusMatch === currentStatus,
        );

        return (
          <div style={{ marginBottom: "1rem" }}>
            {/* Percentage display */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  marginBottom: "0.5rem",
                }}
              >
                <h4 style={{ margin: "0", fontSize: "1rem" }}>Progress</h4>
              </div>
            </div>

            {/* Stepper track */}
            <div style={{ position: "relative", padding: "0 0 0.25rem 0" }}>
              {/* Background track line */}
              <div
                style={{
                  position: "absolute",
                  top: "14px",
                  left: "12px",
                  right: "12px",
                  height: "4px",
                  background: "#e2e8f0",
                  borderRadius: "2px",
                  zIndex: 0,
                }}
              />
              {/* Active fill line */}
              <div
                style={{
                  position: "absolute",
                  top: "14px",
                  left: "12px",
                  width:
                    activePhaseIdx >= phases.length - 1
                      ? "calc(100% - 24px)"
                      : activePhaseIdx < 0
                        ? "0%"
                        : `calc(${(activePhaseIdx / (phases.length - 1)) * 100}% * (1 - 24px / 100%) + 0px)`,
                  height: "4px",
                  background:
                    activePhaseIdx >= phases.length - 1
                      ? "linear-gradient(90deg, #10b981, #059669)"
                      : "linear-gradient(90deg, #6366f1, #4f46e5)",
                  borderRadius: "2px",
                  transition: "width 0.5s ease",
                  zIndex: 1,
                }}
              />
              {/* Phase dots + labels */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                {phases.map((phase, idx) => {
                  const isCompleted = activePhaseIdx > idx;
                  const isActive = activePhaseIdx === idx;
                  const isFuture = !isCompleted && !isActive;

                  let dotBg = "#cbd5e1";
                  let dotBorder = "#cbd5e1";
                  let dotShadow = "none";
                  let labelColor = "var(--text-secondary)";
                  let labelWeight = 400;

                  if (isCompleted) {
                    dotBg = "#10b981";
                    dotBorder = "#10b981";
                    labelColor = "#10b981";
                    labelWeight = 600;
                  } else if (isActive) {
                    dotBg = "#4f46e5";
                    dotBorder = "#4f46e5";
                    dotShadow = "0 0 0 4px rgba(79,70,229,0.2)";
                    labelColor = "#4f46e5";
                    labelWeight = 700;
                  }

                  return (
                    <div
                      key={phase.key}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      {/* Dot */}
                      <div
                        style={{
                          width: isActive ? "28px" : "24px",
                          height: isActive ? "28px" : "24px",
                          borderRadius: "50%",
                          background: dotBg,
                          border: `3px solid ${dotBorder}`,
                          boxShadow: dotShadow,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.3s ease",
                          marginBottom: "6px",
                        }}
                      >
                        {isCompleted ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : isActive ? (
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: "#fff",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: "#fff",
                            }}
                          />
                        )}
                      </div>
                      {/* Label */}
                      <span
                        style={{
                          fontSize: "0.5rem",
                          fontWeight: labelWeight,
                          color: labelColor,
                          textAlign: "center",
                          letterSpacing: "0.02em",
                          textTransform: "uppercase",
                          lineHeight: 1.2,
                          transition: "all 0.3s ease",
                        }}
                      >
                        {phase.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thin overall progress bar underneath */}
          </div>
        );
      })()}
    </div>
  );
}
