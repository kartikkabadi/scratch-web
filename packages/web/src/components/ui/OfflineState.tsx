export function OfflineState() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg-secondary)",
        color: "var(--color-text-muted)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ marginBottom: "1rem", opacity: 0.5 }}
      >
        <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 011.81-1.49M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
      </svg>
      <h2
        style={{
          fontSize: "1.125rem",
          fontWeight: 600,
          color: "var(--color-text)",
          marginBottom: "0.5rem",
        }}
      >
        Unable to reach Scratch
      </h2>
      <p style={{ fontSize: "0.875rem", maxWidth: "20rem", lineHeight: 1.5 }}>
        The Mac host or Tailscale connection is unavailable. Check your
        connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: "1.5rem",
          padding: "0.5rem 1rem",
          borderRadius: "0.375rem",
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Retry
      </button>
    </div>
  );
}
