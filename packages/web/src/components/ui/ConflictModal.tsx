interface ConflictModalProps {
  onReload: () => void;
  onSaveCopy: () => void;
}

export function ConflictModal({ onReload, onSaveCopy }: ConflictModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        animation: "fade-in 0.15s ease-out",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          maxWidth: "24rem",
          width: "90%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
      >
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
            color: "var(--color-text)",
          }}
        >
          Note changed on disk
        </h3>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            marginBottom: "1.25rem",
            lineHeight: 1.5,
          }}
        >
          This note was modified outside Scratch Web since you started editing.
          What would you like to do?
        </p>
        <div
          style={{ display: "flex", gap: "0.75rem", flexDirection: "column" }}
        >
          <button
            onClick={onReload}
            style={{
              width: "100%",
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: "var(--color-accent)",
              color: "var(--color-text-inverse)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload from disk
          </button>
          <button
            onClick={onSaveCopy}
            style={{
              width: "100%",
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--color-border)",
              backgroundColor: "transparent",
              color: "var(--color-text)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Save a copy
          </button>
        </div>
      </div>
    </div>
  );
}
