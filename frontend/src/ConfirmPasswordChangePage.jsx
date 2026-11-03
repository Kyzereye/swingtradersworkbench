import { useEffect, useRef, useState } from "react";

export default function ConfirmPasswordChangePage({ onConfirmed }) {
  const [message, setMessage] = useState("Confirming your password change…");
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;
  const requestSentRef = useRef(false);

  useEffect(() => {
    // React dev mode runs effects twice. The token works only once, so send it once.
    if (requestSentRef.current) return;
    requestSentRef.current = true;

    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setMessage("Missing confirmation token.");
      return;
    }

    async function confirmPasswordChange() {
      try {
        const res = await fetch(
          `/api/profile/confirm-password-change?token=${encodeURIComponent(token)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(data.message || "Confirmation failed.");
          return;
        }
        setMessage(data.message || "Password changed.");
        setTimeout(() => onConfirmedRef.current(), 1500);
      } catch {
        setMessage("Confirmation failed. Please try again.");
      }
    }

    confirmPasswordChange();
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Confirm password change</h1>
        <p className="auth-intro">{message}</p>
        <button type="button" className="auth-link-btn" onClick={() => onConfirmedRef.current()}>
          Go to login
        </button>
      </div>
    </div>
  );
}
