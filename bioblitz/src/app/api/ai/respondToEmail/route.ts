import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { Resend } from "resend";
import { DEFAULT_MODEL, DEFAULT_REASONING } from "@/lib/aiChatAccess";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = [
  "You are replying to an email on behalf of BioBlitz.",
  "Answer the sender's message directly and helpfully.",
  "Write plain prose suitable for an email body — no subject line, no",
  "greeting boilerplate beyond a short one, and no markdown formatting.",
].join(" ");

/** Resend inbound payload — only the fields this route reads. */
type InboundEmail = {
  type?: string;
  data?: {
    from?: string;
    to?: string[] | string;
    subject?: string;
    text?: string;
    html?: string;
    message_id?: string;
  };
};

/**
 * Resend puts the sender in RFC 5322 form ("Ada Lovelace <ada@example.com>"),
 * so the raw string never equals the allowlisted address on its own.
 */
function extractAddress(from: string | undefined): string {
  if (!from) return "";
  const angled = from.match(/<([^>]+)>/);
  return (angled ? angled[1] : from).trim().toLowerCase();
}

async function generateReply(emailText: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const response = await fetch(
    `${GEMINI_BASE}/${DEFAULT_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: emailText }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: 1,
          thinkingConfig: { thinkingLevel: DEFAULT_REASONING },
        },
      }),
    },
  );

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

  let payload: InboundEmail;
  try {
    payload = new Webhook(secret).verify(rawBody, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    }) as InboundEmail;
  } catch (err) {
    console.error("respondToEmail: signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Everything past this point returns 200 no matter what: a non-2xx puts the
  // delivery into Resend's retry loop, which would re-run the whole thing.
  try {
    const sender = extractAddress(payload.data?.from);
    const authorized = (process.env.AUTHORIZED_EMAIL ?? "").trim().toLowerCase();

    if (!authorized || sender !== authorized) {
      console.log(`respondToEmail: ignoring message from ${sender || "unknown"}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const emailText = (payload.data?.text ?? "").trim();
    if (!emailText) {
      console.log("respondToEmail: message had no text body, skipping");
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

    const reply = await generateReply(emailText);
    const messageId = payload.data?.message_id;
    const subject = payload.data?.subject ?? "";

    const { error } = await new Resend(resendApiKey).emails.send({
      from: fromAddress,
      to: sender,
      // Gmail also uses a matching subject to group a thread, so keep the
      // "Re: " prefix from doubling up on an existing reply.
      subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
      text: reply,
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
