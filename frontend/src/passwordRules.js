export const PASSWORD_RULES = [
  { id: "length", label: "More than 8 characters", test: (pw) => pw.length > 8 },
  { id: "lowercase", label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { id: "uppercase", label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { id: "number", label: "One number", test: (pw) => /[0-9]/.test(pw) },
  { id: "special", label: "One special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function getPasswordRuleStatus(password) {
  const pw = typeof password === "string" ? password : "";
  return PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(pw) }));
}

export function isPasswordValid(password) {
  const pw = typeof password === "string" ? password : "";
  return PASSWORD_RULES.every((rule) => rule.test(pw));
}

export function passwordsMatch(password, confirmPassword) {
  return typeof password === "string" && password.length > 0 && password === confirmPassword;
}
