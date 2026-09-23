import type { NewsletterData } from "./weekly-newsletter-data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://bioblitz.net";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function topicClass(topic: string): string {
  //color scheme matches our original one from ContestCard.tsx
  const map: Record<string, string> = {
    "Anatomy & Physiology": "cat-blue",
    "Cell Biology": "cat-cyan",
    "Plant Biology": "cat-green",
    "Genetics & Evolution": "cat-lime",
    Biosystematics: "cat-indigo",
    Ecology: "cat-emerald",
    Ethology: "cat-orange",
    Multiple: "cat-yellow",
  };
  return map[topic] || "cat-neutral";
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export function generateNewsletterPageHtml(data: NewsletterData): string {
  const statsStrip = `
  <div class="stats-strip">
    <div class="stat">
      <div class="stat-value">${data.blitzesTakenThisWeek.toLocaleString()}</div>
      <div class="stat-label">Blitzes Taken</div>
    </div> 
    <div class="stat">
      <div class="stat-value">${data.activePlayersThisWeek.toLocaleString()}</div>
      <div class="stat-label">Active Players</div>
    </div>
    <div class="stat">
      <div class="stat-value">${data.newSetsThisWeek}</div>
      <div class="stat-label">New Sets</div>
    </div>
  </div>`;
  // we might need to change how we do the statistics later because currently the Firestore reads only go up to 2000

  const blitzSection = data.blitzOfWeek //right now, the blitzOfWeekId comes from newsletterConfig/issue-N doc in Firestore, which is set manually when preparing the newsletter. In the future, we might want to automate this and pick the blitz of week based on some criteria (e.g. most taken blitz that week, or highest rated blitz that week, etc.)
    ? `
  <div class="section">
    <div class="section-header">
      <span class="section-tag tag-yellow">Blitz of the Week</span>
    </div>
      <div class="blitz-card">
        <div class="blitz-top">
          <span class="blitz-category ${topicClass(data.blitzOfWeek.topic)}">${esc(data.blitzOfWeek.topic)}</span>
          <div class="blitz-name">${esc(data.blitzOfWeek.title)}</div>
          <div class="blitz-meta">
            <span>${data.blitzOfWeek.questionCount} Questions</span>
<span style="margin:0 0px;">•</span>
            <span>${data.blitzOfWeek.timeLimit} min</span>
<span style="margin:0 0px;">•</span>

            ${data.blitzOfWeek.creatorUsername ? `<span>by <strong>${esc(data.blitzOfWeek.creatorUsername)}</strong></span>` : ""}
          </div>
        </div>
        <div class="blitz-bottom">
          <div class="blitz-stats">
            <div>
              <div class="blitz-stat-val">${data.blitzOfWeek.firstAttemptCount.toLocaleString()}</div>
              <div class="blitz-stat-lbl">Attempts</div>
            </div>
            ${
              data.blitzOfWeek.averageRating > 0
                ? `
            <div>
              <div class="blitz-stat-val">${data.blitzOfWeek.averageRating.toFixed(1)}/5</div>
              <div class="blitz-stat-lbl">Rating</div>
            </div>`
                : ""
            }
          </div>
              <a href="${SITE}/home/${data.blitzOfWeek.id}" class="blitz-card-link">
          <span class="btn btn-yellow">Take the Blitz →</span>
        </div>
      </div>
    </a>
  </div>
  <div class="divider"></div>`
    : "";

  const potdSection = data.potd
    ? `
  <div class="section">
    <div class="section-header">
      <span class="section-tag tag-orange">Problem of the Day</span>
    </div>
      <div class="potd-card">
        <div>
          <div class="potd-number">${esc(data.potd.date)}</div>
  <div class="potd-title">Today's Problem is Live</div>
          <div class="potd-desc">${esc(data.potd.topic)} · ${data.potd.multiSelect ? "Multi Select" : "Single Choice"}</div>
        </div>
    <a href="${SITE}/potd" class="btn btn-outline">Solve it →</a>
      </div>
    </a>
  </div>
  <div class="divider"></div>`
    : "";

  const rankColors = ["rank-1", "rank-2", "rank-3"]; //used for leaderboard colors
  const avColors = ["av-1", "av-2", "av-3"];

  const eloRows = data.eloLeaderboard //leaderboard information is fetched from weekly-newsletter-data.ts
    .map(
      (u, i) => `
    <div class="lb-row">
      <div class="lb-rank ${rankColors[i]}">${i + 1}</div>
      <div class="lb-avatar ${avColors[i]}">${esc((u.username[0] || "?").toUpperCase())}</div>
      <div class="lb-info">
        <div class="lb-name">${esc(u.username)}</div>
        <div class="lb-detail">${u.school ? esc(u.school) : "BioBlitz Player"}</div>
      </div>
      <div class="lb-pts">${u.bElo.toLocaleString()} <span>elo</span></div>
    </div>`,
    )
    .join("");

  const streakRows = data.streakLeaderboard
    .map(
      (u, i) => `
    <div class="lb-row">
      <div class="lb-rank ${rankColors[i]}">${i + 1}</div>
      <div class="lb-avatar ${avColors[i]}">${esc((u.username[0] || "?").toUpperCase())}</div>
      <div class="lb-info">
        <div class="lb-name">${esc(u.username)}</div>
        <div class="lb-detail">${u.school ? esc(u.school) : "BioBlitz Player"}</div>
      </div>
      <div class="lb-pts">${u.streak} <span>days</span></div>
    </div>`,
    )
    .join("");

  const leaderboardSection = `<div class="section">
    <div class="section-header">
      <span class="section-tag tag-yellow">Weekly Leaderboard Update</span>
    </div>
    <div class="section-title" style="margin-bottom:16px;">Top Competitors</div>
    <div class="lb-tabs">
      <button class="lb-tab lb-tab-active" onclick="switchTab('elo')" id="tab-elo">Rating</button>
      <button class="lb-tab" onclick="switchTab('streak')" id="tab-streak"> Streak</button>
    </div>
    <div id="lb-elo" class="lb-list lb-panel">${eloRows}</div>
    <div id="lb-streak" class="lb-list lb-panel" style="display:none;">${streakRows}</div>
    <div class="center mt-16">
      <a href="${SITE}/leaderboard" class="btn btn-outline">Full Leaderboard →</a>
    </div>
  </div>
  <div class="divider"></div>`;

  let challengesSection = "";

  //if the user has challenges then this is where we put them, otherwise encourage them to start challenging friends
  if (data.hasChallenges) {
    const challengeRows = data.challenges
      .map((c) => {
        if (c.isOpen) {
          return `
        <a href="${SITE}/challenges" class="ch-row-link">
          <div class="ch-row">
            <div class="ch-indicator ind-pending"></div>
            <div class="ch-info">
              <div class="ch-title">${esc(c.opponentUsername)} challenged you</div>
              <div class="ch-desc">${esc(c.blitzTitle)} · ${timeAgo(c.createdAt)}</div>
            </div>
            <div class="ch-badge badge-pending">Your Turn</div>
          </div>
        </a>`;
        } else {
          const ind = c.won ? "ind-won" : "ind-lost";
          const badge = c.won ? "badge-won" : "badge-lost";
          const label = c.won ? "Won" : "Lost";
          const verb = c.won ? "You beat" : "You lost to";
          return `
        <div class="ch-row">
          <div class="ch-indicator ${ind}"></div>
          <div class="ch-info">
            <div class="ch-title">${verb} ${esc(c.opponentUsername)}</div>
            <div class="ch-desc">${esc(c.blitzTitle)} · You: ${c.myScore} vs ${c.theirScore}</div>
          </div>
          <div class="ch-badge ${badge}">${label}</div>
        </div>`;
        }
      })
      .join("");

    challengesSection = `
  <div class="section">
    <div class="section-header">
      <span class="section-tag tag-teal">Challenges</span>
    </div>
    <div class="section-title" style="margin-bottom:16px;">Recent Challenges</div>
    <div class="challenge-list">${challengeRows}</div>
    <div class="center mt-16">
      <a href="${SITE}/challenges" class="btn btn-yellow">Challenge a Friend →</a>
    </div>
  </div>
  <div class="divider"></div>`;
  } else {
    challengesSection = `
  <div class="section">
    <div class="section-header">
      <span class="section-tag tag-teal">Challenges</span>
    </div>
    <div class="empty-state">
      <div class="empty-title">No challenges yet</div>
      <div class="empty-body">Challenges are a great way for you to test your knowledge against your friends. Pick a blitz, challenge someone, and see who comes out on top.</div>
      <a href="${SITE}/challenges" class="btn btn-yellow" style="margin-top:20px;">Challenge a Friend →</a>
    </div>
  </div>
  <div class="divider"></div>`;
  }

  //recommended sets section shows 4 sets maximum (ideally ones that were released this week but if not just any that the user has not done yet)
  const setCards = data.trendingSets
    .map(
      (s) => `
    <a href="${SITE}/home/${s.id}" class="set-card-link">
      <div class="set-card">
        <span class="set-category ${topicClass(s.topic)}">${esc(s.topic)}</span>
        <div class="set-title">${esc(s.title)}</div>
        ${s.creatorUsername ? `<div class="set-author">by ${esc(s.creatorUsername)}</div>` : ""}
        <div class="set-meta">
<span>${s.questionCount}q</span>
<span style="color:var(--text-dim);">·</span>
<span>${s.firstAttemptCount} plays</span>
${s.averageRating > 0 ? `<span style="color:var(--text-dim);">·</span><span>${s.averageRating.toFixed(1)}/5</span>` : ""}        </div>
      </div>
    </a>`,
    )
    .join("");

  const trendingSection =
    data.trendingSets.length > 0
      ? `
  <div class="section">
    <div class="section-header">
      <span class="section-tag tag-rose">Trending Sets</span>
    </div>
    <div class="section-title" style="margin-bottom:16px;">Recommended for You</div>
    <div class="sets-grid">${setCards}</div>
  </div>
  `
      : "";

  //this section only exists if you actually include a study tip when saving the config (if data.studyTip is not null), if not is completely hidden from newsletter. who knows, we might want to add study advice from campers idk it could make the newsletter more interesting
  const tipSection = data.studyTip
    ? `
  <div class="section">
    <div class="section-header">
      <span class="section-tag tag-teal">Camper Study Tip</span>
    </div>
    <div class="tip-card">
      <div class="tip-title">${esc(data.studyTip.title)}</div>
      <div class="tip-body">${data.studyTip.body}</div>
    </div>
  </div>
  <div class="divider"></div>`
    : "";

  return `<!DOCTYPE html> 

<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BioBlitz Weekly Digest · Issue #${data.issueNumber}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  :root {
    --bg: #09090b;
    --bg-card: #0f0f12;
    --bg-card-hover: #16161a;
    --bg-elevated: #1a1a1f;
    --yellow: #f5c518;
    --yellow-dim: rgba(245,197,24,0.12);
    --yellow-border: rgba(245,197,24,0.18);
    --teal: #2dd4bf;
    --teal-dim: rgba(45,212,191,0.10);
    --teal-border: rgba(45,212,191,0.18);
    --purple: #a78bfa;
    --purple-dim: rgba(167,139,250,0.10);
    --purple-border: rgba(167,139,250,0.18);
    --orange: #fb923c;
    --orange-dim: rgba(251,146,60,0.10);
    --orange-border: rgba(251,146,60,0.18);
    --rose: #fb7185;
    --rose-dim: rgba(251,113,133,0.10);
    --rose-border: rgba(251,113,133,0.18);
    --text: #ffffff;
    --text-secondary: #e2e2e2;
    --text-muted: #888888;
    --text-dim: #555555;
    --border: rgba(255,255,255,0.06);
    --border-light: rgba(255,255,255,0.10);
  }

     .cat-blue    { background: rgba(96,165,250,0.12);  color: #60a5fa; }
.cat-cyan    { background: rgba(8,145,178,0.12);   color: #0891b2; }
.cat-green   { background: rgba(22,163,74,0.12);   color: #16a34a; }
.cat-lime    { background: rgba(101,163,13,0.12);  color: #65a30d; }
.cat-indigo  { background: rgba(79,70,229,0.12);   color: #4f46e5; }
.cat-emerald { background: rgba(5,150,105,0.12);   color: #059669; }
.cat-orange  { background: rgba(234,88,12,0.12);   color: #ea580c; }
.cat-yellow  { background: rgba(202,138,4,0.12);   color: #ca8a04; }
.cat-neutral { background: rgba(82,82,82,0.12);    color: #525252; }
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Outfit', -apple-system, sans-serif;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  .newsletter { max-width: 640px; margin: 25px auto 0; padding: 0 20px 20px; }

  .preheader {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 0; font-size: 12px; letter-spacing: 0.06em;
    color: var(--text-dim); font-weight: 500;
    border-bottom: 1px solid var(--border);
  }
  .preheader a { color: var(--text-muted); text-decoration: none; }
  .preheader a:hover { color: var(--text); }

  .masthead { padding: 48px 0 40px; text-align: center; }
  .masthead-logo { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 12px; }
      .logo-wordmark { font-family: 'Outfit', sans-serif; font-size: 40px; font-weight: 800; color: var(--text); letter-spacing: 0.04em; }
  .masthead-sub { font-size: 16px; color: var(--text-muted); font-weight: 500; margin-bottom: 10px; }
  .masthead-date { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--yellow); letter-spacing: 0.02em; }
.mito-link {
  color: var(--yellow);
  text-decoration: none;
}

.mito-link:hover {
  opacity: 0.8;
}
  .section { margin-bottom: 48px; }
  .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .section-tag {
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    padding: 5px 12px; border-radius: 6px;
  }
  .tag-yellow { background: var(--yellow-dim); color: var(--yellow); border: 1px solid var(--yellow-border); }
  .tag-teal   { background: var(--teal-dim);   color: var(--teal);   border: 1px solid var(--teal-border); }
  .tag-purple { background: var(--purple-dim); color: var(--purple); border: 1px solid var(--purple-border); }
  .tag-orange { background: var(--orange-dim); color: var(--orange); border: 1px solid var(--orange-border); }
  .tag-rose   { background: var(--rose-dim);   color: var(--rose);   border: 1px solid var(--rose-border); }

  .section-title { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 700; letter-spacing: -0.01em; }
  .divider { height: 1px; background: var(--border); margin-bottom: 30px; }

  .stats-strip {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1px; background: var(--border);
    border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 48px;
  }
  .stat { background: var(--bg-card); padding: 24px 16px; text-align: center; }
  .stat-value { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: var(--text); line-height: 1; margin-bottom: 6px; }
  .stat-label { font-size: 11px; color: var(--text-dim); letter-spacing: 0.08em; font-weight: 500; }

  .blitz-card-link { text-decoration: none; color: inherit; display: block; }
  .blitz-card { border: 1px solid var(--border-light); border-radius: 14px; overflow: hidden; background: var(--bg-card); transition: border-color 0.2s; }
  .blitz-card-link:hover .blitz-card { border-color: rgba(255,255,255,0.18); }
  .blitz-top { padding: 28px 28px 20px; border-bottom: 1px solid var(--border); }
  .blitz-category { display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; padding: 4px 10px; border-radius: 5px; margin-bottom: 14px; }
  .cat-teal   { background: var(--teal-dim);   color: var(--teal); }
  .cat-purple { background: var(--purple-dim); color: var(--purple); }
  .cat-orange { background: var(--orange-dim); color: var(--orange); }
  .cat-yellow { background: var(--yellow-dim); color: var(--yellow); }
  .blitz-name { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.01em; }
  .blitz-meta { display: flex; gap: 6px; font-size: 13px; color: var(--text-muted); flex-wrap: wrap; }
  .blitz-bottom { padding: 20px 28px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .blitz-stats { display: flex; gap: 28px; }
  .blitz-stat-val { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: var(--text); }
  .blitz-stat-lbl { font-size: 11px; color: var(--text-dim); letter-spacing: 0.06em; }

  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 11px 22px; font-family: 'Outfit', sans-serif; font-size: 14px;
    font-weight: 600; border-radius: 8px; text-decoration: none; cursor: pointer;
    border: none; transition: all 0.2s ease;
  }
  .btn-yellow { background: var(--yellow); color: #000; }
  .btn-yellow:hover { background: #e6b800; transform: translateY(-1px); }
  .btn-outline { background: transparent; color: var(--text-muted); border: 1px solid var(--border-light); }
  .btn-outline:hover { border-color: rgba(255,255,255,0.2); color: var(--text); }

  /* Leaderboard tabs */
  .lb-tabs { display: flex; gap: 6px; margin-bottom: 16px; }
  .lb-tab {
    flex: 1; padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); font-family: 'Outfit', sans-serif;
    font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
  }
  .lb-tab:hover { color: var(--text); border-color: var(--border-light); }
  .lb-tab-active { background: var(--bg-elevated); color: var(--text); border-color: var(--border-light); }

  .lb-list { display: flex; flex-direction: column; gap: 6px; }
  .lb-row {
    display: flex; align-items: center; gap: 14px; padding: 14px 18px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 10px; transition: background 0.2s;
  }
  .lb-row:hover { background: var(--bg-card-hover); }
  .lb-rank { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 700; width: 28px; text-align: center; flex-shrink: 0; }
  .rank-1 { color: var(--yellow); }
  .rank-2 { color: #999; }
  .rank-3 { color: #a0724a; }
  .lb-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: var(--bg); }
  .av-1 { background: var(--yellow); }
  .av-2 { background: #666; }
  .av-3 { background: #a0724a; }
  .lb-info { flex: 1; min-width: 0; }
  .lb-name { font-weight: 600; font-size: 14px; color: var(--text); }
  .lb-detail { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
  .lb-pts { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 14px; color: var(--text-secondary); flex-shrink: 0; }
  .lb-pts span { color: var(--text-dim); font-size: 11px; font-weight: 400; }

  .challenge-list { display: flex; flex-direction: column; gap: 6px; }
  .ch-row-link { text-decoration: none; color: inherit; }
  .ch-row {
    display: flex; align-items: center; gap: 14px; padding: 16px 18px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 10px; transition: background 0.2s;
  }
  .ch-row:hover { background: var(--bg-card-hover); }
  .ch-indicator { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .ind-pending { background: var(--orange); }
  .ind-won  { background: var(--teal); }
  .ind-lost { background: var(--rose); }
  .ch-info { flex: 1; }
  .ch-title { font-weight: 600; font-size: 14px; color: var(--text); margin-bottom: 2px; }
  .ch-desc  { font-size: 12px; color: var(--text-dim); }
  .ch-badge { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 5px; letter-spacing: 0.04em; flex-shrink: 0; }
  .badge-pending { background: var(--orange-dim); color: var(--orange); border: 1px solid var(--orange-border); }
  .badge-won  { background: var(--teal-dim);   color: var(--teal);   border: 1px solid var(--teal-border); }
  .badge-lost { background: var(--rose-dim);   color: var(--rose);   border: 1px solid var(--rose-border); }

  .empty-state {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 14px; padding: 40px 28px; text-align: center;
  }
  .empty-icon { font-size: 36px; margin-bottom: 12px; }
  .empty-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
  .empty-body { font-size: 14px; color: var(--text-muted); line-height: 1.7; max-width: 400px; margin: 0 auto; }

  .masthead-icon {
  width: 30px;  
  height: 30px;
}

  .sets-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .set-card-link { text-decoration: none; color: inherit; display: block; }
  .set-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 10px; padding: 20px; transition: all 0.2s ease;
  }
  .set-card:hover { background: var(--bg-card-hover); border-color: var(--border-light); }
  .set-category { display: inline-block; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 4px; margin-bottom: 10px; }
  .set-title { font-family: 'Fraunces', serif; font-weight: 700; font-size: 14px; color: var(--text); margin-bottom: 4px; line-height: 1.3; }
  .set-author { font-size: 12px; color: var(--text-dim); margin-bottom: 10px; }
  .set-meta { display: flex; gap: 4px; font-size: 11px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }

  .potd-link { text-decoration: none; color: inherit; display: block; }
  .potd-card {
    background: var(--bg-card); border: 1px solid var(--border-light);
    border-radius: 14px; padding: 28px;
    display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
    transition: border-color 0.2s;
  }
  .potd-link:hover .potd-card { border-color: rgba(255,255,255,0.18); }
  .potd-number { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--orange); margin-bottom: 6px; letter-spacing: 0.04em; }
  .potd-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .potd-desc { font-size: 13px; color: var(--text-dim); }

  .tip-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 14px; padding: 28px; }
  .tip-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 10px; }
  .tip-body { font-size: 14px; line-height: 1.7; color: var(--text-muted); }
  .tip-body strong { color: var(--text-secondary); font-weight: 600; }

  .footer {padding-top: 12px; text-align: center; margin-top: -24px; }
  .footer-logo { display: inline-flex; align-items: center; gap: 8px;margin-top: 4px margin-bottom: 16px; }
  .footer-logo-mark { width: 28px; height: 28px; background: var(--yellow); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .footer-logo-mark svg { width: 14px; height: 14px; }
  .footer-wordmark { font-size: 18px; font-weight: 800; color: var(--text); }
  .footer-links { display: flex; justify-content: center; gap: 24px; margin-bottom: 16px; }
  .footer-links a { font-size: 13px; color: var(--text-dim); text-decoration: none; transition: color 0.2s; }
  .footer-links a:hover { color: var(--text); }
  .footer-fine { font-size: 15px; color: var(--text-dim); line-height: 1.6; }
  .footer-fine a { color: var(--text-dim); text-decoration: underline; text-underline-offset: 2px; }
.footer-fine a.mito-link {
  color: var(--yellow);
  text-decoration: none;
}
  .center { text-align: center; }
  .mt-16 { margin-top: 16px; }

  @media (max-width: 520px) {
    .newsletter { padding: 0 16px 60px; }
    .stats-strip { grid-template-columns: 1fr; }
    .sets-grid { grid-template-columns: 1fr; }
    .blitz-bottom { flex-direction: column; align-items: flex-start; }
    .potd-card { flex-direction: column; align-items: flex-start; }
    .lb-tabs { flex-direction: column; }
  }
</style>
</head>
<body>
<div class="newsletter">

  <div class="preheader">
<span style="font-weight:500; color: var(--text-muted);">Weekly Digest · Issue #${data.issueNumber}</span><a href="${SITE}"><strong>bioblitz.net</strong></a>  </div>

  <div class="masthead">
    <div class="masthead-logo">
       <div style="display:inline-block;background:rgba(250,204,21,0.1);padding:6px;border-radius:9999px;margin-bottom:2px;">
<img src="${SITE}/icons/favicon.ico" class="masthead-icon" style="display:block;" /></div>
      <div class="logo-wordmark">BioBlitz</div>
    </div>
    <div class="masthead-sub"> @${esc(data.username)}, Your Weekly BioBlitz Briefing is Here! </div>
    <div class="masthead-date">${esc(data.dateRange)}</div>
  </div>

  ${statsStrip}
  ${blitzSection}
  ${potdSection}
  ${leaderboardSection}
  ${challengesSection}
  ${trendingSection}
  ${tipSection}

 <div class="footer">
  <div class="footer-fine">
You're receiving this because you opted into BioBlitz weekly digests.
<br><a href="${SITE}/settings" class="mito-link">Manage Preferences</a><br>
<div style="display:inline-block;background:rgba(250,204,21,0.1);padding:6px;border-radius:9999px;margin-bottom:4px; margin-top:12px;">
  <img src="${SITE}/icons/favicon.ico" style="width:18px;height:18px;display:block;" alt="BioBlitz"/>
</div>
<br>&copy; ${new Date().getFullYear()} BioBlitz. Powered by <a href="https://mitosisphere.org" class="mito-link" target="_blank" rel="noopener noreferrer">  Mitosisphere
</a>.

    </div>
  
</div>

<script>
  function switchTab(tab) {
    document.getElementById('lb-elo').style.display = tab === 'elo' ? 'flex' : 'none';
    document.getElementById('lb-streak').style.display = tab === 'streak' ? 'flex' : 'none';
    document.getElementById('tab-elo').classList.toggle('lb-tab-active', tab === 'elo');
    document.getElementById('tab-streak').classList.toggle('lb-tab-active', tab === 'streak');
  }
</script>
</body>
</html>`;
}
