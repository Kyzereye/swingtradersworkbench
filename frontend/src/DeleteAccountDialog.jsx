import { useEffect, useState } from "react";
import PasswordInput from "./PasswordInput.jsx";

export default function DeleteAccountDialog({ open, onClose, onDeleted }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleConfirm() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not delete account.");
        return;
      }
      onDeleted();
    } catch {
      setError("Could not delete account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="app-dialog-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="app-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="delete-account-title" className="app-dialog-title">
              Delete account
            </h2>
            <p className="app-dialog-subtitle">
              This permanently deletes your account and cannot be undone.
            </p>
          </div>
          <button
            type="button"
            className="app-dialog-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="app-dialog-body">
          <div className="sidebar-field">
            <label className="sidebar-field-label" htmlFor="delete-account-password">
              <span>Enter your password to confirm</span>
            </label>
            <PasswordInput
              id="delete-account-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <div className="error sidebar-error">{error}</div> : null}
        </div>

        <footer className="app-dialog-footer">
          <button type="button" className="app-dialog-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="app-dialog-primary"
            onClick={handleConfirm}
            disabled={submitting || !password}
          >
            {submitting ? "Deleting…" : "Delete my account"}
          </button>
        </footer>
      </div>
    </div>
  );
}
