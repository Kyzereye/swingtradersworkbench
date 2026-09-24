import { useState } from "react";
import PasswordInput from "./PasswordInput.jsx";

export default function LoginForm({ onGoRegister, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Sign in failed.");
        return;
      }
      onLoginSuccess(data.email);
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Log in</h1>
        <form onSubmit={handleSubmit}>
          <div className="sidebar-field">
            <label className="sidebar-field-label" htmlFor="login-email">
              <span>Email</span>
            </label>
            <input
              id="login-email"
              type="email"
              className="symbol-ac-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="sidebar-field" style={{ marginTop: "0.75rem" }}>
            <label className="sidebar-field-label" htmlFor="login-password">
              <span>Password</span>
            </label>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? <div className="error sidebar-error">{error}</div> : null}

          <button
            type="submit"
            className="disclaimer-accept-btn"
            style={{ marginTop: "0.75rem" }}
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account?{" "}
          <button type="button" className="auth-link-btn" onClick={onGoRegister}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
