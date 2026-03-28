import type { WeeklyDigestData } from "./digest-data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "bioblitz.net";
const now = new Date();
const weekStart = new Date(now);
weekStart.setDate(now.getDate() - 6);
const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
const dateRange = `${fmt(weekStart)}–${fmt(now)}`;
const year = now.getFullYear();

const C = {
  bg: "#0a0a0a",
  card: "#131313",
  surface: "#191919",
  border: "#232323",
  text: "#e5e5e5",
  textHi: "#fafafa",
  textMid: "#8a8a8a",
  textLo: "#555555",
  green: "#4ade80",
  greenDeep: "#22874a",
  red: "#f87171",
  redDeep: "#b33a3a",
  amber: "#fbbf24",
  orange: "#ea580c",
  orangeLight: "#f97316",
  pillActive: "#e5e5e5",
  pillOff: "#2a2826",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function topicColor(topic: string): string {
  const map: Record<string, string> = {
    "Anatomy & Physiology": "#60a5fa",
    "Cell Biology": "#22d3ee",
    "Plant Biology": "#4ade80",
    "Genetics & Evolution": "#a3e635",
    Biosystematics: "#a78bfa",
    Ecology: "#34d399",
    Ethology: "#fb923c",
    Multiple: "#facc15",
  };
  return map[topic] || "#8a8a8a";
}
const f =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const m = "'Courier New',Courier,monospace";

export function generateDigestHtml(data: WeeklyDigestData): string {
  const firstName = esc(data.displayName.split(" ")[0] || "there");
  const hasActivity = data.blitzesThisWeek > 0;
  const hasChallenges = data.challengeWins + data.challengeLosses > 0;

  const eloCol =
    data.eloChange > 0 ? C.green : data.eloChange < 0 ? C.red : C.textMid;
  const eloSign = data.eloChange > 0 ? "+" : "";
  const eloArrow =
    data.eloChange > 0 ? "&#9651;" : data.eloChange < 0 ? "&#9661;" : "";

  const divider = `<tr><td style="padding:0 28px;"><div style="height:1px;background:${C.border};"></div></td></tr>
<tr><td style="height:22px;"></td></tr>`;

  const days = ["M", "T", "W", "T", "F", "S", "S"];
  let pills = "";
  for (let i = 0; i < 7; i++) {
    const on = data.activeDays[i];
    pills += `<td align="center" style="padding:0 1px;">
      <div style="width:100%;max-width:56px;height:7px;border-radius:4px;background:${on ? C.pillActive : C.pillOff};"></div>
      <p style="margin:4px 0 0;font-size:10px;color:${on ? C.pillActive : C.textLo};font-family:${m};font-weight:600;line-height:1;">${days[i]}</p>
    </td>`;
  }

  let heroRight = "";
  if (data.currentStreak >= 1) {
    heroRight += `<p style="margin:0 0 6px;font-size:13px;color:${C.textMid};font-family:${f};text-align:right;line-height:1.3;">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="${C.orangeLight}" style="display:inline;vertical-align:middle;margin-right:3px;margin-bottom:2px;" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg><span style="font-weight:800;color:${C.orangeLight};font-family:${m};">${data.currentStreak}</span><span style="color:${C.textMid};font-weight:400;"> day streak</span>
  </p>`;
  }
  if (data.globalRank !== null) {
    heroRight += `<p style="margin:0;font-size:12px;color:${C.textLo};font-family:${m};text-align:right;line-height:1.3;">
     Global Rank <span style="font-weight:800;color:${C.textMid};">#${data.globalRank}</span>
    </p>`;
  }

  const aheadRow =
    data.friendAhead && data.friendAhead.gap > 0
      ? `<tr><td style="padding:0 28px 22px;">
      <p style="margin:0;padding:12px 16px;background:${C.card};border:1px solid ${C.border};border-radius:10px;font-size:13px;color:${C.textMid};font-family:${f};line-height:1.4;">
        You're <span style="font-weight:800;color:${C.amber};font-family:${m};">${data.friendAhead.gap}</span> Elo behind <span style="font-weight:700;color:${C.text};">${esc(data.friendAhead.displayName)}</span> — close the gap this week.
      </p>
    </td></tr>`
      : "";

  const inactiveRow = !hasActivity
    ? `<tr><td style="padding:0 28px 22px;text-align:center;">
      <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:${C.text};font-family:${f};">Quiet week.</p>
      <p style="margin:0;font-size:13px;color:${C.textMid};font-family:${f};">One blitz keeps your rating from decaying.</p>
    </td></tr>`
    : "";

  const streakCallout =
    hasActivity && data.currentStreak >= 7
      ? `<tr><td style="padding:0 28px 22px;text-align:center;">
      <p style="margin:0;font-size:14px;font-weight:700;color:${C.orangeLight};font-family:${f};">${data.currentStreak} days — don't break it</p>
    </td></tr>`
      : "";

  const challengeRow = hasChallenges
    ? `<tr><td style="padding:0 28px 22px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${C.textLo};font-family:${m};">Challenges</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.surface};border-radius:8px;overflow:hidden;">
        ${data.challengeDetails
          .map((c, i) => {
            const bb =
              i < data.challengeDetails.length - 1
                ? `border-bottom:1px solid ${C.border};`
                : "";
            const initial = esc((c.opponentName[0] || "?").toUpperCase());
            const avatarBg = c.won ? "#166534" : "#3f3f46";
            const avatarText = c.won ? "#4ade80" : "#a1a1aa";
            const resultColor = c.won ? C.green : C.textLo;
            const resultLabel = c.won ? "Won" : "Lost";
            const resultBg = c.won ? "#14532d" : "#27272a";

            return `<tr><td style="padding:12px 16px;${bb}">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td width="36" valign="middle" style="padding-right:12px;">
                <div style="width:32px;height:32px;border-radius:6px;background:${avatarBg};display:inline-block;text-align:center;line-height:32px;font-family:${m};font-size:13px;font-weight:800;color:${avatarText};">${initial}</div>
              </td>
              <td valign="middle">
                <p style="margin:0;font-size:13px;font-weight:700;color:${C.textHi};font-family:${f};">${c.won ? "Beat" : "Lost to"} @${esc(c.opponentName)}</p>
                <p style="margin:2px 0 0;font-size:11px;color:${C.textMid};font-family:${f};">${esc(c.blitzTitle)} &middot; ${c.myScore} vs ${c.theirScore}</p>
              </td>
              <td width="48" align="right" valign="middle">
                <div style="display:inline-block;padding:4px 10px;background:${resultBg};border-radius:6px;font-family:${m};font-size:11px;font-weight:800;color:${resultColor};">${resultLabel}</div>
              </td>
            </tr></table>
          </td></tr>`;
          })
          .join("")}
      </table>
    </td></tr>`
    : "";

  let fRows = "";
  const fs = data.friends.slice(0, 5);
  for (let i = 0; i < fs.length; i++) {
    const fr = fs[i];
    const me = fr.username === data.username;
    const bg = me ? "#1a1a1a" : "transparent";
    const nc = me ? C.textHi : C.text;
    const ec = me ? C.textHi : C.textMid;
    const nw = me ? "700" : "500";
    const n = me ? "You" : esc(fr.displayName);
    const bb = i < fs.length - 1 ? `border-bottom:1px solid ${C.border};` : "";

    fRows += `<tr><td style="padding:9px 16px;background:${bg};${bb}">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="20" style="font-family:${m};font-size:11px;font-weight:600;color:${C.textLo};vertical-align:middle;">${i + 1}</td>
        <td style="font-family:${f};font-size:13px;font-weight:${nw};color:${nc};vertical-align:middle;">${n}</td>
        <td width="56" align="right" style="font-family:${m};font-size:12px;font-weight:700;color:${ec};vertical-align:middle;">${fr.bElo}</td>
      </tr></table>
    </td></tr>`;
  }
  const friendBlock =
    data.friends.length > 1 && data.challengeDetails.length === 0
      ? `<tr><td style="padding:0 28px 22px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${C.textLo};font-family:${m};">Friends Leaderboard</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.surface};border:0px solid ${C.border};border-radius:8px;">${fRows}</table>
    </td></tr>`
      : "";

  let bRows = "";
  for (let i = 0; i < Math.min(data.unplayedBlitzes.length, 4); i++) {
    const b = data.unplayedBlitzes[i];
    const tc = topicColor(b.topic);
    const weak = data.weakestTopicName && b.topic === data.weakestTopicName;
    const bb =
      i < Math.min(data.unplayedBlitzes.length, 4) - 1
        ? `border-bottom:1px solid ${C.border};`
        : "";

    bRows += `<tr><td style="padding:11px 0;${bb}">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-family:${f};">
          <a href="${SITE}/home/${b.id}" style="color:${C.textHi};text-decoration:none;font-weight:600;font-size:13px;line-height:1.3;">${esc(b.title)}</a><br/>
          <span style="font-size:10px;color:${tc};font-weight:700;font-family:${m};text-transform:uppercase;letter-spacing:0.04em;">${esc(b.topic)}</span>
          <span style="font-size:10px;color:${C.textLo};margin-left:5px;">${b.questionCount}q</span>
          ${weak ? `<span style="font-size:10px;color:${C.amber};margin-left:6px;font-weight:600;">&#8592; practice</span>` : ""}
        </td>
        <td width="50" align="right" valign="middle">
          <a href="${SITE}/home/${b.id}" style="display:inline-block;padding:5px 12px;background:${C.border};border-radius:6px;color:${C.text};font-size:11px;font-weight:700;text-decoration:none;font-family:${f};">Play</a>
        </td>
      </tr></table>
    </td></tr>`;
  }

  const blitzBlock =
    data.unplayedBlitzes.length > 0
      ? `<tr><td style="padding:0 28px 24px;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${C.textLo};font-family:${m};">Blitzes for you</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">${bRows}</table>
    </td></tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<title>BioBlitz Weekly</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.bg};">
<tr><td align="center" style="padding:20px 16px 40px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="500" style="max-width:500px;width:100%;background:${C.card};border-radius:10px;overflow:hidden;border:0px solid ${C.border};">

  <!-- Greeting -->
  <tr><td style="padding:26px 28px 14px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td>
<p style="margin:0 0 2px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${C.textLo};font-family:${m};">Weekly Digest ${dateRange}</p>


<p style="margin:0;font-size:20px;font-weight:600;color:${C.text};font-family:${f};line-height:1.3;">
  Hi ${firstName},
</p>

<p style="margin:2px 0 0;font-size:15px;color:${C.textMid};font-family:${f};line-height:1.3;">
  Here’s your week on BioBlitz.
</p>      </td>
      <td width="24" align="right" valign="top">
      </td>
    </tr></table>
  </td></tr>

  <!-- Elo hero -->
  <tr><td style="padding:0 28px 22px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.surface};border:0px solid ${C.border};border-radius:8px;">
      <tr><td style="padding:22px 22px 14px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td valign="top">
            <p style="margin:0 0 6px;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${C.textLo};font-family:${m};">Current Elo</p>
            <p style="margin:0;font-size:65px;font-weight:800;color:${C.textHi};font-family:${m};line-height:1;letter-spacing:-1px;">${data.currentElo.toLocaleString()}${data.eloChange !== 0 ? `<span style="font-size:16px;font-weight:800;color:${eloCol};letter-spacing:0;margin-left:10px;">${eloArrow} ${eloSign}${Math.abs(data.eloChange)}</span>` : ""}</p>
          </td>
          <td valign="top" align="right" style="padding-top:6px;">
            ${heroRight}
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:2px 22px 18px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${pills}</tr></table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Stats (active users only) -->
  ${
    hasActivity
      ? `<tr><td style="padding:0 28px 22px;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td width="33%" style="padding-right:15px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.surface};border-radius:8px;">
        <tr><td style="padding:14px 12px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:800;color:${C.textHi};font-family:${m};line-height:1;">${data.blitzesThisWeek}</p>
          <p style="margin:6px 0 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${C.textLo};font-family:${m};">blitzes</p>
        </td></tr>
      </table>
    </td>
    <td width="33%" style="padding-right:15px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.surface};border-radius:8px;">
        <tr><td style="padding:14px 12px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:800;color:${C.textHi};font-family:${m};line-height:1;">${data.questionsAnswered}</p>
          <p style="margin:6px 0 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${C.textLo};font-family:${m};">questions</p>
        </td></tr>
      </table>
    </td>
    <td width="33%">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.surface};border-radius:8px;">
        <tr><td style="padding:14px 12px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:800;color:${data.accuracy >= 70 ? C.green : data.accuracy >= 50 ? C.textHi : C.red};font-family:${m};line-height:1;">${data.accuracy}%</p>
          <p style="margin:6px 0 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${C.textLo};font-family:${m};">accuracy</p>
        </td></tr>
      </table>
    </td>
  </tr></table>
</td></tr>`
      : ""
  }

  ${hasActivity ? divider : ""}
${streakCallout}
${hasActivity && data.currentStreak >= 7 ? divider : ""}
${inactiveRow}
${!hasActivity ? divider : ""}
${data.challengeDetails.length === 0 && data.friends.length > 1 ? friendBlock : ""}
${data.challengeDetails.length === 0 && data.friends.length > 1 ? divider : ""}
${challengeRow}
${hasChallenges ? divider : ""}
${blitzBlock}


  <!-- Footer -->
     <tr><td style="padding:18px 28px;border-top:1px solid ${C.border};">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td valign="middle">
          <p style="margin:0;font-size:11px;color:${C.textLo};font-family:${f};">&copy; ${year} BioBlitz. All rights reserved.</p>
        </td>
        <td align="right" valign="middle">
          <a href="${SITE}/settings" style="font-size:11px;color:${C.textMid};text-decoration:underline;font-family:${f};">Unsubscribe</a>
        </td>
      </tr></table>
    </td></tr>


</table>
</td></tr>
</table>
</body>
</html>`;
}
