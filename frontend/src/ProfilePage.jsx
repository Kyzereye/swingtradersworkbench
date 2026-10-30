import { useEffect, useState } from "react";
import PasswordChecklist from "./PasswordChecklist.jsx";
import PasswordInput from "./PasswordInput.jsx";
import DeleteAccountDialog from "./DeleteAccountDialog.jsx";
import { isPasswordValid, passwordsMatch } from "./passwordRules.js";

export default function ProfilePage({ onAccountDeleted, onEmailChanged }) {
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneMessage, setPhoneMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    fetch("/api/profile", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setEmail(data?.email || "");
        setEmailInput(data?.email || "");
        setPhoneNumber(data?.phoneNumber || "");
        setPhoneInput(data?.phoneNumber || "");
      })
      .catch(() => {});
  }, []);

  async function handleEmailSubmit(e) {
    e.preventDefault();
    const nextEmail = emailInput.trim();
    if (!nextEmail || nextEmail === email) return;
    setEmailError("");
    setEmailMessage("");
    setEmailSaving(true);
    try {
      const res = await fetch("/api/profile/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: nextEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailError(data.error || "Could not update email.");
        return;
      }
      setEmailMessage(data.message || "Check your new email address to confirm this change.");
      setTimeout(() => onEmailChanged?.(), 1500);
    } catch {
      setEmailError("Could not update email. Please try again.");
    } finally {
      setEmailSaving(false);
    }
  }

  async function savePhone(nextValue) {
    setPhoneError("");
    setPhoneMessage("");
    setPhoneSaving(true);
    try {
      const res = await fetch("/api/profile/phone", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: nextValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhoneError(data.error || "Could not update phone number.");
        return;
      }
      setPhoneNumber(data.phoneNumber || "");
      setPhoneInput(data.phoneNumber || "");
      setPhoneMessage(data.phoneNumber ? "Phone number saved." : "Phone number removed.");
    } catch {
      setPhoneError("Could not update phone number.");
    } finally {
      setPhoneSaving(false);
    }
  }

  const passwordCanSubmit =
    isPasswordValid(newPassword) && passwordsMatch(newPassword, confirmNewPassword);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (!passwordCanSubmit) return;
    setPasswordError("");
    setPasswordSubmitting(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword, confirmNewPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError(data.error || "Could not start password change.");
        return;
      }
      setPasswordMessage(data.message || "Check your email to confirm this password change.");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      setPasswordError("Could not start password change. Please try again.");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Profile</h1>

        <section className="rules-section">
          <h2>Email</h2>
          <form onSubmit={handleEmailSubmit}>
            <div className="sidebar-field">
              <label className="sidebar-field-label" htmlFor="profile-email">
                <span>Email address</span>
              </label>
              <input
                id="profile-email"
                type="email"
                className="symbol-ac-input"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
            {emailError ? <div className="error sidebar-error">{emailError}</div> : null}
            {emailMessage ? (
              <p className="auth-intro" style={{ margin: "0.5rem 0 0" }}>{emailMessage}</p>
            ) : null}
            <button
              type="submit"
              className="disclaimer-accept-btn"
              style={{ marginTop: "0.75rem" }}
              disabled={emailSaving || emailInput.trim() === "" || emailInput.trim() === email}
            >
              {emailSaving ? "Saving…" : "Save"}
            </button>
          </form>
        </section>

        <section className="rules-section">
          <h2>Phone number</h2>
          <div className="sidebar-field">
            <label className="sidebar-field-label" htmlFor="profile-phone">
              <span>Optional</span>
            </label>
            <input
              id="profile-phone"
              type="tel"
              className="symbol-ac-input"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Not set"
            />
          </div>
          {phoneError ? <div className="error sidebar-error">{phoneError}</div> : null}
          {phoneMessage ? <p className="auth-intro" style={{ margin: "0.5rem 0 0" }}>{phoneMessage}</p> : null}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button
              type="button"
              className="disclaimer-accept-btn"
              disabled={phoneSaving || phoneInput.trim() === phoneNumber}
              onClick={() => savePhone(phoneInput.trim())}
            >
              {phoneSaving ? "Saving…" : "Save"}
            </button>
            {phoneNumber ? (
              <button
                type="button"
                className="app-dialog-secondary"
                disabled={phoneSaving}
                onClick={() => savePhone("")}
              >
                Remove
              </button>
            ) : null}
          </div>
        </section>

        <section className="rules-section">
          <h2>Change password</h2>
          <form onSubmit={handlePasswordSubmit}>
            <div className="sidebar-field">
              <label className="sidebar-field-label" htmlFor="profile-new-password">
                <span>New password</span>
              </label>
              <PasswordInput
                id="profile-new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="sidebar-field" style={{ marginTop: "0.75rem" }}>
              <label className="sidebar-field-label" htmlFor="profile-confirm-new-password">
                <span>Verify new password</span>
              </label>
              <PasswordInput
                id="profile-confirm-new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>

            <PasswordChecklist password={newPassword} confirmPassword={confirmNewPassword} />

            {passwordError ? <div className="error sidebar-error">{passwordError}</div> : null}
            {passwordMessage ? (
              <p className="auth-intro" style={{ margin: "0.5rem 0 0" }}>{passwordMessage}</p>
            ) : null}

            <button
              type="submit"
              className="disclaimer-accept-btn"
              style={{ marginTop: "0.75rem" }}
              disabled={passwordSubmitting || !passwordCanSubmit}
            >
              {passwordSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                "Change password"
              )}
            </button>
          </form>
        </section>

        <section className="rules-section rules-section-muted">
          <h2>Delete account</h2>
          <p>Permanently deletes your account. This cannot be undone.</p>
          <button
            type="button"
            className="app-dialog-secondary"
            onClick={() => setDeleteOpen(true)}
          >
            Delete my account
          </button>
        </section>
      </div>

      <DeleteAccountDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={onAccountDeleted}
      />
    </div>
  );
}
