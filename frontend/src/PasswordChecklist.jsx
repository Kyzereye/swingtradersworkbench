import { getPasswordRuleStatus, passwordsMatch } from "./passwordRules.js";

export default function PasswordChecklist({ password, confirmPassword }) {
  const rules = getPasswordRuleStatus(password);
  const showMatch = confirmPassword !== undefined;

  return (
    <ul className="password-checklist">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={rule.met ? "password-checklist-met" : "password-checklist-unmet"}
        >
          <span className="password-checklist-mark" aria-hidden="true">
            {rule.met ? "✓" : "○"}
          </span>
          {rule.label}
        </li>
      ))}
      {showMatch ? (
        <li
          className={
            passwordsMatch(password, confirmPassword)
              ? "password-checklist-met"
              : "password-checklist-unmet"
          }
        >
          <span className="password-checklist-mark" aria-hidden="true">
            {passwordsMatch(password, confirmPassword) ? "✓" : "○"}
          </span>
          Passwords match
        </li>
      ) : null}
    </ul>
  );
}
