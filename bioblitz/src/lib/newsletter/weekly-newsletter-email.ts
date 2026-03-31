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
    ? `${SITE}/unsubscribe?uid=${unsubscribeUid}`
    : `${SITE}/settings`;

  const f =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const m = "Consolas,Menlo,Monaco,'Courier New',monospace";

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
<tr><td align="center" style="padding:40px 16px 60px;">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480" style="max-width:480px;width:100%;">

    <!-- Logo -->
    <tr><td align="center" style="padding-bottom:40px;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;padding-right:10px;">
          <div style="width:36px;height:36px;background:#f5c518;border-radius:50%;text-align:center;line-height:36px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="display:inline;vertical-align:middle;">
              <path d="M13 2L4.5 14H12L11 22L19.5 10H12L13 2Z" fill="#000" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </div>
        </td>
        <td style="font-family:${f};font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;vertical-align:middle;">BioBlitz</td>
      </tr></table>
    </td></tr>

    <!-- Card -->
    <tr><td style="background:#0f0f12;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 36px;">

      <!-- Issue tag -->
      <p style="margin:0 0 20px;font-family:${m};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#f5c518;">Issue #${issueNumber} · Weekly Digest</p>

      <!-- Greeting -->
      <p style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;font-family:${f};line-height:1.2;letter-spacing:-0.01em;">Good morning, ${esc(username)}.</p>
      <p style="margin:0 0 28px;font-size:15px;color:#888888;font-family:${f};line-height:1.6;">Your BioBlitz weekly news report is here — leaderboards, new blitzes, challenges, and more.</p>

      <!-- Divider -->
      <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:28px;"></div>

      <!-- What's inside -->
      <p style="margin:0 0 14px;font-family:${m};font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#555555;">This week's digest includes</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:32px;">
        ${[
          ["⚡", "Blitz of the Week"],
          ["🏆", "Weekly Leaderboard"],
          ["⚔️", "Your Challenges"],
          ["🔥", "Trending Sets"],
          ["💡", "Study Tip"],
        ]
          .map(
            ([icon, label]) => `
        <tr>
          <td style="padding:5px 0;font-family:${f};font-size:13px;color:#888888;">
            <span style="margin-right:10px;">${icon}</span>${label}
          </td>
        </tr>`,
          )
          .join("")}
      </table>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center">
          <a href="${newsletterUrl}" style="display:inline-block;padding:14px 32px;background:#f5c518;border-radius:8px;font-family:${f};font-size:15px;font-weight:700;color:#000000;text-decoration:none;letter-spacing:-0.01em;">View This Week's Digest →</a>
        </td></tr>
      </table>

      <!-- Divider -->
      <div style="height:1px;background:rgba(255,255,255,0.06);margin:32px 0 24px;"></div>

      <!-- Sign-off -->
      <p style="margin:0;font-size:13px;color:#555555;font-family:${f};line-height:1.6;">
        Sincerely,<br/>
        <span style="color:#888888;font-weight:600;">The BioBlitz Team</span>
      </p>

    </td></tr>

    <!-- Footer -->
    <tr><td align="center" style="padding-top:28px;">
      <p style="margin:0 0 8px;font-size:11px;color:#333333;font-family:${f};">&copy; ${year} BioBlitz. All rights reserved.</p>
      <p style="margin:0;font-size:11px;color:#333333;font-family:${f};">
        You're receiving this because you opted into BioBlitz weekly digests.<br/>
        <a href="${unsubscribeUrl}" style="color:#555555;text-decoration:underline;">Unsubscribe</a>
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}
