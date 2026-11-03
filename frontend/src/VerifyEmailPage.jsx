import { useEffect, useRef, useState } from "react";

export default function VerifyEmailPage({ onGoLogin }) {
  const [message, setMessage] = useState("Verifying your email…");
  const onGoLoginRef = useRef(onGoLogin);
  onGoLoginRef.current = onGoLogin;
  const requestSentRef = useRef(false);

  useEffect(() => {
    // React dev mode runs effects twice. The token works only once, so send it once.
    if (requestSentRef.current) return;
    requestSentRef.current = true;

    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setMessage("Missing verification token.");
      return;
    }

    async function verifyEmail() {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(data.message || "Verification failed.");
          return;
        }
        setMessage(data.message || "Email verified.");
        setTimeout(() => onGoLoginRef.current(), 1500);
      } catch {
        setMessage("Verification failed. Please try again.");
      }
    }

    verifyEmail();
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
