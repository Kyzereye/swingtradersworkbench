import nodemailer from "nodemailer";

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * textBody: the text-part lines that come before the URL (no trailing newline).
 * heading: the HTML <h1>.
 * htmlIntro: the HTML intro <p> sentence (may differ in wording from textBody).
 * expiryNote: shared final line, identical in both the text and HTML parts.
 */
export async function sendTokenEmail({
  to,
  subject,
  heading,
  textBody,
  htmlIntro,
  buttonLabel,
  url,
  expiryNote,
}) {
  const transport = getTransport();

  const text = `${textBody}
${url}

${expiryNote}`;

  const html = `
<div style="background:#f2f4f6;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e6ea;">
    <div style="padding:28px 32px 0;text-align:center;">
      <div style="font-size:18px;font-weight:700;color:#1a222c;">JJK Trading Labs</div>
    </div>
    <div style="padding:16px 32px 32px;text-align:center;">
      <h1 style="font-size:20px;margin:16px 0 8px;color:#1a222c;">${heading}</h1>
      <p style="font-size:14px;line-height:1.5;color:#4a5568;margin:0 0 24px;">
        ${htmlIntro}
      </p>
      <a href="${url}"
         style="display:inline-block;background:#6abf69;color:#ffffff;text-decoration:none;
                font-weight:600;font-size:15px;padding:12px 28px;border-radius:6px;">
        ${buttonLabel}
      </a>
      <p style="font-size:12px;line-height:1.5;color:#8a94a3;margin:28px 0 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${url}" style="color:#4a5568;word-break:break-all;">${url}</a>
      </p>
      <p style="font-size:12px;line-height:1.5;color:#8a94a3;margin:16px 0 0;">
        ${expiryNote}
      </p>
    </div>
  </div>
</div>`;

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}
