interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        backgroundColor: "var(--color-text)",
        color: "var(--color-text-inverse)",
        padding: "0.75rem 1.25rem",
        borderRadius: "0.5rem",
        fontSize: "0.875rem",
        fontWeight: 500,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        animation: "slide-up 0.2s ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span>{message}</span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            fontSize: "1rem",
            opacity: 0.7,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
