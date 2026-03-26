import type { WeeklyDigestData } from "./digest-data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bioblitz.co";

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tierLabel(elo: number): string {
  if (elo >= 2250) return "Diamond";
  if (elo >= 1750) return "Platinum";
  if (elo >= 1250) return "Gold";
  if (elo >= 750) return "Silver";
  return "Bronze";
}

function tierColor(elo: number): string {
  if (elo >= 2250) return "#22d3ee";
  if (elo >= 1750) return "#a3a3a3";
  if (elo >= 1250) return "#fbbf24";
  if (elo >= 750) return "#d4d4d8";
  return "#c2410c";
}

function topicColor(topic: string): string {
  const map: Record<string, string> = {
    "Anatomy & Physiology": "#3b82f6",
    "Cell Biology": "#06b6d4",
    "Plant Biology": "#22c55e",
    "Genetics & Evolution": "#84cc16",
    Biosystematics: "#8b5cf6",
    Ecology: "#10b981",
    Ethology: "#f97316",
    Multiple: "#eab308",
  };
  return map[topic] || "#71717a";
}

export function generateDigestHtml(data: WeeklyDigestData): string {
  const firstName = esc(data.displayName.split(" ")[0] || "there");
  const hasActivity =
    data.blitzesThisWeek > 0 || data.potdCompletedThisWeek > 0;
  const hasChallenges = data.challengeWins + data.challengeLosses > 0;

  const eloColor =
    data.eloChange > 0 ? "#34d399" : data.eloChange < 0 ? "#f87171" : "#a1a1aa";
  const eloSign = data.eloChange > 0 ? "+" : "";
  const eloArrow =
    data.eloChange > 0 ? "&#9650;" : data.eloChange < 0 ? "&#9660;" : "";

  // ── Sections ──────────────────────────────────────────────────────────

  const streakSection =
    hasActivity && data.currentStreak >= 3
      ? `<tr><td style="padding:0 32px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#1c1306;border:1px solid #854d0e;border-radius:12px;">
        <tr><td style="padding:14px 20px;text-align:center;">
          <span style="font-size:20px;">&#128293;</span>
          <span style="font-size:15px;font-weight:700;color:#fbbf24;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;vertical-align:middle;margin-left:6px;">${data.currentStreak}-day streak</span>
        </td></tr>
      </table>
    </td></tr>`
      : "";

  const inactiveSection = !hasActivity
    ? `<tr><td style="padding:8px 32px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#171717;border:1px solid #3f3f46;border-radius:12px;">
        <tr><td style="padding:24px;text-align:center;">
          <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">We missed you this week</p>
          <p style="margin:0 0 16px;font-size:13px;color:#a1a1aa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">A quick blitz is all it takes to keep your streak alive.</p>
          <a href="${SITE_URL}/home" style="display:inline-block;padding:10px 28px;background:#404040;border-radius:10px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Jump back in</a>
        </td></tr>
      </table>
    </td></tr>`
    : "";

  const challengeSection = hasChallenges
    ? `<tr><td style="padding:0 32px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0b;border:1px solid #27272a;border-radius:12px;">
        <tr><td style="padding:16px 20px;text-align:center;">
          <p style="margin:0 0 10px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#a1a1aa;font-family:'Courier New',monospace;">Challenges</p>
          <table cellpadding="0" cellspacing="0" border="0" align="center"><tr>
            <td style="padding:0 16px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:800;color:#34d399;font-family:'Courier New',monospace;">${data.challengeWins}</p>
              <p style="margin:2px 0 0;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.08em;font-family:'Courier New',monospace;">W</p>
            </td>
            <td style="width:1px;background:#27272a;font-size:0;">&nbsp;</td>
            <td style="padding:0 16px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:800;color:#71717a;font-family:'Courier New',monospace;">${data.challengeLosses}</p>
              <p style="margin:2px 0 0;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.08em;font-family:'Courier New',monospace;">L</p>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>`
    : "";

  const weakTopicSection = data.weakestTopic
    ? `<tr><td style="padding:0 32px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#1c1917;border:1px solid #44403c;border-radius:12px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#a1a1aa;font-family:'Courier New',monospace;">Area to improve</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${esc(data.weakestTopic.name)}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#f59e0b;font-weight:700;font-family:'Courier New',monospace;">${Math.round(data.weakestTopic.accuracy)}% accuracy</p>
        </td></tr>
      </table>
    </td></tr>`
    : "";

  let newBlitzRows = "";
  for (const blitz of data.newBlitzes.slice(0, 5)) {
    const tc = topicColor(blitz.topic);
    newBlitzRows += `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #27272a;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            <a href="${SITE_URL}/home/${blitz.id}" style="color:#fafafa;text-decoration:none;font-weight:700;font-size:14px;">${esc(blitz.title)}</a><br/>
            <span style="display:inline-block;margin-top:3px;font-size:11px;color:${tc};font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${esc(blitz.topic)}</span>
            <span style="font-size:11px;color:#71717a;margin-left:8px;">${blitz.questionCount}q</span>
          </td>
          <td width="70" align="right" valign="middle">
            <a href="${SITE_URL}/home/${blitz.id}" style="display:inline-block;padding:6px 14px;background:#262626;border:1px solid #3f3f46;border-radius:8px;color:#e4e4e7;font-size:12px;font-weight:700;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Play</a>
          </td>
        </tr></table>
      </td>
    </tr>`;
  }

  const newBlitzesSection =
    data.newBlitzes.length > 0
      ? `<tr><td style="padding:24px 32px 20px;">
      <p style="margin:0 0 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#a1a1aa;font-family:'Courier New',monospace;">New Blitzes</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">${newBlitzRows}</table>
    </td></tr>`
      : "";

  const potdSection =
    data.potdAvailableThisWeek > 0
      ? `<tr><td style="padding:4px 32px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:14px 20px;background:#0a0a0b;border:1px solid #27272a;border-radius:12px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <span style="font-size:14px;">&#128293;</span>
              <span style="font-size:13px;font-weight:700;color:#fafafa;vertical-align:middle;margin-left:4px;">Daily Problems: ${data.potdCompletedThisWeek}/${data.potdAvailableThisWeek}</span>
            </td>
            <td width="90" align="right">
              <a href="${SITE_URL}/potd" style="font-size:12px;color:#a78bfa;font-weight:600;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Solve now &rarr;</a>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>`
      : "";

  // ── Full email ────────────────────────────────────────────────────────

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<title>Your BioBlitz Weekly Digest</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#0a0a0a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0a;">
<tr><td align="center" style="padding:24px 16px 48px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#141414;border-radius:16px;overflow:hidden;border:1px solid #27272a;">

  <!-- Header -->
  <tr><td style="padding:32px 32px 24px;border-bottom:1px solid #27272a;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <p style="margin:0 0 2px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;font-family:'Courier New',monospace;">Weekly Digest</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#fafafa;">Hey ${firstName} &#128075;</p>
      </td>
      <td width="40" align="right" valign="top">
        <a href="${SITE_URL}" style="text-decoration:none;font-size:18px;font-weight:900;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">B</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- Rating hero -->
  <tr><td style="padding:24px 32px 20px;">
    <p style="margin:0;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#a1a1aa;font-family:'Courier New',monospace;">Your Rating</p>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-family:'Courier New',monospace;font-size:42px;font-weight:800;color:#fafafa;line-height:1;padding-top:4px;">${data.currentElo}</td>
      <td style="padding-left:10px;vertical-align:bottom;padding-bottom:6px;">
        ${data.eloChange !== 0 ? `<span style="font-family:'Courier New',monospace;font-size:15px;font-weight:800;color:${eloColor};">${eloArrow} ${eloSign}${data.eloChange}</span><br/>` : ""}
        <span style="font-size:11px;font-weight:700;color:${tierColor(data.currentElo)};font-family:'Courier New',monospace;">${tierLabel(data.currentElo)}</span>
        ${data.globalRank !== null ? `<span style="font-size:11px;color:#71717a;margin-left:6px;font-family:'Courier New',monospace;">#${data.globalRank}</span>` : ""}
      </td>
    </tr></table>
  </td></tr>

  <!-- Stats row -->
  <tr><td style="padding:0 32px 24px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td width="25%" style="padding:12px 0;text-align:center;border:1px solid #27272a;border-radius:10px 0 0 10px;background:#0a0a0b;">
        <p style="margin:0;font-size:22px;font-weight:800;color:#a78bfa;font-family:'Courier New',monospace;">${data.blitzesThisWeek}</p>
        <p style="margin:2px 0 0;font-size:9px;color:#71717a;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;font-family:'Courier New',monospace;">Blitzes</p>
      </td>
      <td width="25%" style="padding:12px 0;text-align:center;border-top:1px solid #27272a;border-bottom:1px solid #27272a;background:#0a0a0b;">
        <p style="margin:0;font-size:22px;font-weight:800;color:#60a5fa;font-family:'Courier New',monospace;">${data.questionsAnswered}</p>
        <p style="margin:2px 0 0;font-size:9px;color:#71717a;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;font-family:'Courier New',monospace;">Questions</p>
      </td>
      <td width="25%" style="padding:12px 0;text-align:center;border:1px solid #27272a;background:#0a0a0b;">
        <p style="margin:0;font-size:22px;font-weight:800;color:#34d399;font-family:'Courier New',monospace;">${data.accuracy}%</p>
        <p style="margin:2px 0 0;font-size:9px;color:#71717a;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;font-family:'Courier New',monospace;">Accuracy</p>
      </td>
      <td width="25%" style="padding:12px 0;text-align:center;border:1px solid #27272a;border-radius:0 10px 10px 0;background:#0a0a0b;">
        <p style="margin:0;font-size:22px;font-weight:800;color:#fb923c;font-family:'Courier New',monospace;">${data.currentStreak}</p>
        <p style="margin:2px 0 0;font-size:9px;color:#71717a;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;font-family:'Courier New',monospace;">Streak</p>
      </td>
    </tr></table>
  </td></tr>

  ${streakSection}
  ${inactiveSection}
  ${challengeSection}
  ${weakTopicSection}
  ${newBlitzesSection}
  ${potdSection}

  <!-- CTA -->
  <tr><td style="padding:8px 32px 32px;" align="center">
    <a href="${SITE_URL}/home" style="display:inline-block;padding:14px 40px;background:#404040;border-radius:12px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Start a Blitz</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;border-top:1px solid #1c1c1c;text-align:center;">
    <p style="margin:0 0 6px;font-size:11px;color:#52525b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      You&#8217;re receiving this because you have email notifications enabled.
    </p>
    <p style="margin:0;font-size:11px;color:#52525b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <a href="${SITE_URL}/settings" style="color:#71717a;text-decoration:underline;">Unsubscribe</a>
      &nbsp;&middot;&nbsp;
      <a href="${SITE_URL}" style="color:#71717a;text-decoration:underline;">BioBlitz</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
