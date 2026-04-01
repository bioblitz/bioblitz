const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://bioblitz.net";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateNewsletterNotificationEmail(
  username: string,
  issueNumber: number,
  unsubscribeUid?: string,
): string {
  const year = new Date().getFullYear();
  const newsletterUrl = `${SITE}/weekly-newsletter/${issueNumber}`;
  const unsubscribeUrl = unsubscribeUid
    ? `${SITE}/settings?unsubscribe=${unsubscribeUid}`
    : `${SITE}/settings`;

  const f =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<title>BioBlitz Weekly · Issue #${issueNumber}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;-webkit-text-size-adjust:100%;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#09090b;">
<tr><td align="center" style="padding:48px 16px 64px;">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="440" style="max-width:440px;width:100%;">

    <!-- Logo -->
    <tr><td align="center" style="padding-bottom:36px;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;padding-right:10px;">
          <div style="width:32px;height:32px;background:#f5c518;border-radius:50%;text-align:center;line-height:32px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="display:inline;vertical-align:middle;">
              <path d="M13 2L4.5 14H12L11 22L19.5 10H12L13 2Z" fill="#000" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </div>
        </td>
        <td style="font-family:${f};font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;vertical-align:middle;">BioBlitz</td>
      </tr></table>
    </td></tr>

    <!-- Card -->
    <tr><td style="background:#0f0f12;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:40px 36px;">

      <!-- Greeting -->
      <p style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;font-family:${f};line-height:1.25;letter-spacing:-0.01em;">Good morning, ${esc(username)}.</p>
      <p style="margin:0 0 32px;font-size:15px;color:#777777;font-family:${f};line-height:1.7;">Your BioBlitz weekly news report is here. Click below to view it.</p>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center">
          <a href="${newsletterUrl}" style="display:inline-block;padding:13px 30px;background:#f5c518;border-radius:8px;font-family:${f};font-size:14px;font-weight:700;color:#000000;text-decoration:none;letter-spacing:-0.01em;">View This Week's Digest →</a>
        </td></tr>
      </table>

      <!-- Divider -->
      <div style="height:1px;background:rgba(255,255,255,0.05);margin:32px 0 28px;"></div>

      <!-- Sign-off -->
      <p style="margin:0;font-size:13px;color:#555555;font-family:${f};line-height:1.7;">
        Sincerely,<br/>
        <span style="color:#777777;font-weight:600;">The BioBlitz Team</span>
      </p>

    </td></tr>

    <!-- Footer -->
    <tr><td align="center" style="padding-top:24px;">
      <p style="margin:0 0 6px;font-size:11px;color:#2a2a2a;font-family:${f};">&copy; ${year} BioBlitz. All rights reserved.</p>
      <p style="margin:0;font-size:11px;color:#2a2a2a;font-family:${f};">
        You're receiving this because you opted into BioBlitz weekly digests.<br/>
        <a href="${unsubscribeUrl}" style="color:#3a3a3a;text-decoration:underline;">Unsubscribe</a>
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}
