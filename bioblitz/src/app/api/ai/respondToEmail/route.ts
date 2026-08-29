import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { Resend } from "resend";
import type { GeminiModelId, ReasoningLevel } from "@/lib/aiChatAccess";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_EMAIL_MODEL: GeminiModelId = "gemini-3.7-flash";
const DEFAULT_EMAIL_REASONING: ReasoningLevel = "medium";

/** Leading subject tokens that pick a model, e.g. "p high what is ATP?". */
const MODEL_SHORTCUTS: Record<string, GeminiModelId> = {
  f: "gemini-3.7-flash",
  flash: "gemini-3.7-flash",
  "f3.7": "gemini-3.7-flash",
  "f3.6": "gemini-3.6-flash",
  l: "gemini-3.5-flash-lite",
  lite: "gemini-3.5-flash-lite",
  "l3.5": "gemini-3.5-flash-lite",
  p: "gemini-3.1-pro-preview",
  pro: "gemini-3.1-pro-preview",
  "p3.1": "gemini-3.1-pro-preview",
};

/** Same idea for thinking effort. No single letters: "m" reads as both. */
const EFFORT_SHORTCUTS: Record<string, ReasoningLevel> = {
  min: "minimal",
  minimal: "minimal",
  lo: "low",
  low: "low",
  med: "medium",
  medium: "medium",
  hi: "high",
  high: "high",
};

/** Guards against a long quote chain turning into a huge Gemini request. */
const MAX_QUOTE_DEPTH = 8;
const MAX_HISTORY_CHARS = 30_000;

const SYSTEM_PROMPT = [
  "You are a helpful, knowledgeable assistant having an ordinary conversation.",
  "The conversation reaches you over email, so answer the latest message the",
  "way you would in a chat, using the earlier messages as context.",
  "Write plain text: no subject line, no email sign-off, and no markdown",
  "formatting, since the reply is delivered as plain text.",
].join(" ");

/**
 * Resend's inbound webhook is metadata only — it deliberately omits the body,
 * headers and attachments so large mail cannot blow the serverless request
 * limit. The body is fetched separately with `email_id`.
 */
type InboundWebhook = {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[] | string;
    subject?: string;
  };
};

/** Shape of GET /emails/receiving/{id} — only the fields this route reads. */
type ReceivedEmail = {
  subject?: string;
  text?: string;
  html?: string;
  message_id?: string;
};

type GeminiTurn = { role: "user" | "model"; parts: { text: string }[] };

/**
 * Resend puts the sender in RFC 5322 form ("Ada Lovelace <ada@example.com>"),
 * so the raw string never equals the allowlisted address on its own.
 */
function extractAddress(from: string | undefined): string {
  if (!from) return "";
  const angled = from.match(/<([^>]+)>/);
  return (angled ? angled[1] : from).trim().toLowerCase();
}

/**
 * Reads leading "p high" style flags off the subject. Consumes tokens only
 * while they are recognised, so "protein synthesis" keeps its first word as
 * subject text rather than losing it to the "pro" shortcut.
 */
function parseSubjectFlags(subject: string): {
  model: GeminiModelId;
  reasoning: ReasoningLevel;
} {
  let model = DEFAULT_EMAIL_MODEL;
  let reasoning = DEFAULT_EMAIL_REASONING;

  const stripped = subject.replace(/^(?:\s*(?:re|fwd?)\s*:\s*)+/i, "");
  let modelSeen = false;
  let effortSeen = false;

  for (const raw of stripped.trim().split(/\s+/)) {
    const token = raw.toLowerCase().replace(/[[\]:,]/g, "");
    if (!modelSeen && token in MODEL_SHORTCUTS) {
      model = MODEL_SHORTCUTS[token];
      modelSeen = true;
      continue;
    }
    if (!effortSeen && token in EFFORT_SHORTCUTS) {
      reasoning = EFFORT_SHORTCUTS[token];
      effortSeen = true;
      continue;
    }
    break;
  }

  return { model, reasoning };
}

/** Matches the "On <date> <person> wrote:" banner, which clients often wrap. */
const QUOTE_HEADER =
  /^[ \t]*(?:>[ \t]?)*(?:On\b[^\n]*(?:\n[^\n]*){0,2}?wrote:|-{2,}\s*Original Message\s*-{2,}|_{5,})[ \t]*$/m;

/** Removes one level of "> " quoting from a block. */
function dequote(block: string): string {
  return block
    .split("\n")
    .map((line) => line.replace(/^[ \t]?>[ \t]?/, ""))
    .join("\n");
}

/** Drops a trailing "-- \nsignature" block. */
function stripSignature(block: string): string {
  return block.replace(/\n-{2}[ \t]*\n[\s\S]*$/, "");
}

/**
 * Splits a reply into its messages, newest first, by peeling one quote level
 * at a time. This is a heuristic: mail clients do not agree on quoting, so a
 * missed banner degrades to less context rather than to a wrong answer.
 */
function splitQuoteChain(text: string): string[] {
  const segments: string[] = [];
  let current = text.replace(/\r\n/g, "\n");

  for (let depth = 0; depth < MAX_QUOTE_DEPTH; depth++) {
    const match = current.match(QUOTE_HEADER);
    const head = match ? current.slice(0, match.index) : current;
    segments.push(stripSignature(head).trim());

    if (!match || match.index === undefined) break;
    current = dequote(current.slice(match.index + match[0].length));
  }

  return segments.filter((segment) => segment.length > 0);
}

/**
 * Turns the quote chain into alternating turns. The newest segment is what the
 * sender just wrote; each older one alternates between our reply and theirs.
 */
function buildHistory(text: string): GeminiTurn[] {
  const newestFirst = splitQuoteChain(text);
  const turns: GeminiTurn[] = [];
  let used = 0;

  for (const [index, segment] of newestFirst.entries()) {
    used += segment.length;
    if (used > MAX_HISTORY_CHARS) break;
    turns.push({
      role: index % 2 === 0 ? "user" : "model",
      parts: [{ text: segment }],
    });
  }

  // Gemini wants oldest first, and rejects a history that does not end on the
  // user's turn — so trim a leading model turn after reversing.
  turns.reverse();
  while (turns.length > 0 && turns[0].role === "model") turns.shift();
  return turns;
}

const RESEND_API_BASE = "https://api.resend.com";

/** Pulls the full inbound message, which the webhook payload does not carry. */
async function fetchReceivedEmail(
  emailId: string,
  apiKey: string,
): Promise<ReceivedEmail> {
  const response = await fetch(
    `${RESEND_API_BASE}/emails/receiving/${emailId}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend retrieve failed ${response.status}: ${detail}`);
  }

  return (await response.json()) as ReceivedEmail;
}

/** Last resort when a sender ships HTML with no text/plain alternative. */
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function generateReply(
  contents: GeminiTurn[],
  model: GeminiModelId,
  reasoning: ReasoningLevel,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        temperature: 1,
        thinkingConfig: { thinkingLevel: reasoning },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini error ${response.status}: ${detail}`);
  }

  const parsed = await response.json();
  const parts: { text?: string; thought?: boolean }[] =
    parsed?.candidates?.[0]?.content?.parts ?? [];

  const text = parts
    .filter((part) => !part?.thought && typeof part?.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();

  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("respondToEmail: RESEND_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Svix signs the exact bytes Resend sent. Parsing first (req.json()) and
  // re-serializing changes them, so the signature would never match.
  const rawBody = await request.text();

  let payload: InboundWebhook;
  try {
    payload = new Webhook(secret).verify(rawBody, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    }) as InboundWebhook;
  } catch (err) {
    console.error("respondToEmail: signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Everything past this point returns 200 no matter what: a non-2xx puts the
  // delivery into Resend's retry loop, which would re-run the whole thing.
  try {
    if (payload.type && payload.type !== "email.received") {
      console.log(`respondToEmail: ignoring ${payload.type} event`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    // The webhook's metadata is enough to reject a stranger, so an
    // unauthorized sender never costs an API round trip.
    const sender = extractAddress(payload.data?.from);
    const authorized = (process.env.AUTHORIZED_EMAIL ?? "").trim().toLowerCase();

    if (!authorized || sender !== authorized) {
      console.log(`respondToEmail: ignoring message from ${sender || "unknown"}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_ADDRESS;
    if (!resendApiKey || !fromAddress) {
      console.error(
        "respondToEmail: RESEND_API_KEY or RESEND_FROM_ADDRESS is not configured",
      );
      return NextResponse.json({ ok: true });
    }

    const emailId = payload.data?.email_id;
    if (!emailId) {
      console.error("respondToEmail: webhook had no email_id");
      return NextResponse.json({ ok: true, ignored: true });
    }

    const received = await fetchReceivedEmail(emailId, resendApiKey);
    const emailText = (
      received.text?.trim() ||
      (received.html ? htmlToText(received.html) : "")
    ).trim();

    if (!emailText) {
      console.log(`respondToEmail: ${emailId} had no readable body, skipping`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const subject = received.subject ?? payload.data?.subject ?? "";
    const { model, reasoning } = parseSubjectFlags(subject);
    const contents = buildHistory(emailText);

    if (contents.length === 0) {
      console.log("respondToEmail: nothing left after quote parsing, skipping");
      return NextResponse.json({ ok: true, ignored: true });
    }

    console.log(
      `respondToEmail: ${model}/${reasoning}, ${contents.length} turn(s)`,
    );

    const reply = await generateReply(contents, model, reasoning);
    const messageId = received.message_id;

    // Standard "-- " signature delimiter: mail clients collapse it, and the
    // quote parser strips it back off when this reply is quoted next round.
    const body = `${reply}\n\n-- \nsent with ${model}, ${reasoning}`;

    const { error } = await new Resend(resendApiKey).emails.send({
      from: fromAddress,
      to: sender,
      // The subject keeps its flags so the whole thread stays on one model,
      // and "Re: " is only added once no matter how deep the thread goes.
      subject: /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`,
      text: body,
      ...(messageId
        ? { headers: { "In-Reply-To": messageId, References: messageId } }
        : {}),
    });

    if (error) {
      console.error("respondToEmail: Resend send failed", error);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("respondToEmail: failed to handle inbound email", err);
    return NextResponse.json({ ok: true });
  }
}

// Exported for tests / local checks of the subject and quote parsing.
export const __internal = { parseSubjectFlags, splitQuoteChain, buildHistory };
