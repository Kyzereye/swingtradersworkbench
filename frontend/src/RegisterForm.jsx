import { useState } from "react";
import PasswordChecklist from "./PasswordChecklist.jsx";
import PasswordInput from "./PasswordInput.jsx";
import { isPasswordValid, passwordsMatch } from "./passwordRules.js";

export default function RegisterForm({ onGoLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const canSubmit = isPasswordValid(password) && passwordsMatch(password, confirmPassword);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      setSuccessMessage(data.message || "Check your email to verify your account.");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Sign up</h1>
          <p className="auth-intro">{successMessage}</p>
          {onGoLogin ? (
            <button type="button" className="auth-link-btn" onClick={onGoLogin}>
              Back to log in
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
      <h1 className="auth-title">Sign up</h1>
      <form onSubmit={handleSubmit}>
        <div className="sidebar-field">
          <label className="sidebar-field-label" htmlFor="register-email">
            <span>Email</span>
          </label>
          <input
            id="register-email"
            type="email"
            className="symbol-ac-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="sidebar-field" style={{ marginTop: "0.75rem" }}>
          <label className="sidebar-field-label" htmlFor="register-password">
            <span>Password</span>
          </label>
          <PasswordInput
            id="register-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="sidebar-field" style={{ marginTop: "0.75rem" }}>
          <label className="sidebar-field-label" htmlFor="register-confirm-password">
            <span>Verify password</span>
          </label>
          <PasswordInput
            id="register-confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <PasswordChecklist password={password} confirmPassword={confirmPassword} />

        {error ? <div className="error sidebar-error">{error}</div> : null}

        <button
          type="submit"
          className="disclaimer-accept-btn"
          style={{ marginTop: "0.75rem" }}
          disabled={submitting || !canSubmit}
        >
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      {onGoLogin ? (
        <p className="auth-switch">
          Already have an account?{" "}
          <button type="button" className="auth-link-btn" onClick={onGoLogin}>
            Log in
          </button>
        </p>
      ) : null}
      </div>
    </div>
  );
}
