import { useEffect, useRef, useState } from "react";

export default function ConfirmPasswordChangePage({ onConfirmed }) {
  const [message, setMessage] = useState("Confirming your password change…");
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setMessage("Missing confirmation token.");
      return;
    }

    let cancelled = false;
    fetch(`/api/profile/confirm-password-change?token=${encodeURIComponent(token)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        setMessage(data.message || (ok ? "Password changed." : "Confirmation failed."));
        if (ok) {
          setTimeout(() => {
            if (!cancelled) onConfirmedRef.current();
          }, 1500);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setMessage("Confirmation failed. Please try again.");
      });

    return () => {
      cancelled = true;
    };
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
