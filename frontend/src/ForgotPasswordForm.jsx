import { useState } from "react";
import LoadingDots from "./LoadingDots.jsx";
import PasswordChecklist from "./PasswordChecklist.jsx";
import PasswordInput from "./PasswordInput.jsx";
import { isPasswordValid, passwordsMatch } from "./passwordRules.js";

export default function ForgotPasswordForm({ onGoLogin }) {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const canSubmit = isPasswordValid(newPassword) && passwordsMatch(newPassword, confirmNewPassword);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword, confirmNewPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Password reset failed.");
        return;
      }
      setSuccessMessage(data.message || "Check your email to confirm your new password.");
    } catch {
      setError("Password reset failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Reset password</h1>
          <p className="auth-intro">{successMessage}</p>
          <button type="button" className="auth-link-btn" onClick={onGoLogin}>
            Back to log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Reset password</h1>
        <p className="auth-intro">
          Enter your email and a new password. We&apos;ll email you a link to confirm the change.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="sidebar-field">
            <label className="sidebar-field-label" htmlFor="forgot-email">
              <span>Email</span>
            </label>
            <input
              id="forgot-email"
              type="email"
              className="symbol-ac-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="sidebar-field" style={{ marginTop: "0.75rem" }}>
            <label className="sidebar-field-label" htmlFor="forgot-new-password">
              <span>New password</span>
            </label>
            <PasswordInput
              id="forgot-new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="sidebar-field" style={{ marginTop: "0.75rem" }}>
            <label className="sidebar-field-label" htmlFor="forgot-confirm-password">
              <span>Verify new password</span>
            </label>
            <PasswordInput
              id="forgot-confirm-password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
          </div>

          <PasswordChecklist password={newPassword} confirmPassword={confirmNewPassword} />

          {error ? <div className="error sidebar-error">{error}</div> : null}

          <button
            type="submit"
            className="disclaimer-accept-btn"
            style={{ marginTop: "0.75rem" }}
            disabled={submitting || !canSubmit}
          >
            {submitting ? (
              <>
                Sending
                <LoadingDots />
              </>
            ) : (
              "Send confirmation link"
            )}
          </button>
        </form>

        <p className="auth-switch">
          Remembered it?{" "}
          <button type="button" className="auth-link-btn" onClick={onGoLogin}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
