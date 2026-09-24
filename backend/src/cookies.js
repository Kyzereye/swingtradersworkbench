export function parseCookies(header) {
  const cookies = {};
  if (typeof header !== "string" || header.length === 0) return cookies;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

export function serializeCookie(name, value, { maxAgeSeconds } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  parts.push(`Max-Age=${Number.isFinite(maxAgeSeconds) ? Math.floor(maxAgeSeconds) : 0}`);
  return parts.join("; ");
}
