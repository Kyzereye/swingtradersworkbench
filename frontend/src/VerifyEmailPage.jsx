import { useEffect, useRef, useState } from "react";

export default function VerifyEmailPage({ onGoLogin }) {
  const [message, setMessage] = useState("Verifying your email…");
  const onGoLoginRef = useRef(onGoLogin);
  onGoLoginRef.current = onGoLogin;

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setMessage("Missing verification token.");
      return;
    }

    let cancelled = false;
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        setMessage(data.message || (ok ? "Email verified." : "Verification failed."));
        if (ok) {
          setTimeout(() => {
            if (!cancelled) onGoLoginRef.current();
          }, 1500);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setMessage("Verification failed. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Verify email</h1>
        <p className="auth-intro">{message}</p>
        <button type="button" className="auth-link-btn" onClick={onGoLogin}>
          Go to login
        </button>
      </div>
    </div>
  );
}
