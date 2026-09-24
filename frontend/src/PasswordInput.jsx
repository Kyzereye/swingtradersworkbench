import { useState } from "react";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M1 12s4-7 11-7c2.09 0 3.94.55 5.5 1.36M23 12s-4 7-11 7c-2.09 0-3.94-.55-5.5-1.36" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export default function PasswordInput({ id, value, onChange, required }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        id={id}
        type={visible ? "text" : "password"}
        className="symbol-ac-input"
        value={value}
        onChange={onChange}
        required={required}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
