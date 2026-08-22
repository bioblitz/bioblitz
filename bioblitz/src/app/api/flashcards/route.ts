import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  hasAiChatAccess,
  GEMINI_MODELS,
  REASONING_LEVELS,
  DEFAULT_MODEL,
  DEFAULT_REASONING,
  type GeminiModelId,
  type ReasoningLevel,
} from "@/lib/aiChatAccess";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type ClientImage = { data: string; mimeType: string };
type ClientMessage = {
  role: "user" | "assistant";
  content: string;
  images?: ClientImage[];
};

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * Gemini allows 20MB of inline data, but Vercel rejects a serverless request
 * body over ~4.5MB with an opaque 413 and no JSON. Cap below that so the user
 * gets a readable message instead.
 */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function POST(request: NextRequest) {
  const decoded = await getCurrentUser();
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasAiChatAccess(decoded.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The card service is not configured on the server." },
      { status: 500 },
    );
  }

  let body: {
    messages?: ClientMessage[];
    model?: string;
    reasoning?: string;
    systemPrompt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const model = (GEMINI_MODELS.find((m) => m.id === body.model)?.id ??
    DEFAULT_MODEL) as GeminiModelId;
  const reasoning = (REASONING_LEVELS.find((r) => r.id === body.reasoning)?.id ??
    DEFAULT_REASONING) as ReasoningLevel;

  let totalImageBytes = 0;

  const contents: {
    role: string;
    parts: ({ text: string } | { inlineData: ClientImage })[];
  }[] = [];

  for (const message of messages) {
    const text = typeof message.content === "string" ? message.content : "";
    const parts: ({ text: string } | { inlineData: ClientImage })[] = [];

    for (const image of message.images ?? []) {
      if (!image || typeof image.data !== "string") continue;
      if (!ALLOWED_IMAGE_TYPES.has(image.mimeType)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${image.mimeType}` },
          { status: 400 },
        );
      }
      // Base64 encodes 3 bytes per 4 characters.
      const bytes = Math.floor((image.data.length * 3) / 4);
      if (bytes > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "One of the images is too large." },
          { status: 413 },
        );
      }
      totalImageBytes += bytes;
      if (totalImageBytes > MAX_TOTAL_IMAGE_BYTES) {
        return NextResponse.json(
          {
            error:
              "Too much image data in this conversation — start a new chat or remove some images.",
          },
          { status: 413 },
        );
      }
      // Images first: Gemini reads a prompt better when the image precedes it.
      parts.push({
        inlineData: { mimeType: image.mimeType, data: image.data },
      });
    }

    if (text.trim().length > 0) parts.push({ text });
    if (parts.length === 0) continue;

    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts,
    });
  }

  if (contents.length === 0) {
    return NextResponse.json({ error: "No usable content" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 1,
      thinkingConfig: {
        thinkingLevel: reasoning,
      },
    },
  };

  if (body.systemPrompt && body.systemPrompt.trim()) {
    payload.systemInstruction = {
      parts: [{ text: body.systemPrompt.trim() }],
    };
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${GEMINI_BASE}/${model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(payload),
      },
    );
  } catch (err) {
    console.error("flashcards fetch failed:", err);
    return NextResponse.json(
      { error: "Could not reach the card service." },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("flashcards upstream error:", upstream.status, detail);

    let message = `Card service error (${upstream.status})`;
    try {
      const parsed = JSON.parse(detail);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    if (upstream.status === 429) {
      message = `${message} (this model may need billing enabled on the API key)`;
    }

    return NextResponse.json({ error: message }, { status: upstream.status });
  }

  // Re-stream Gemini's SSE as plain text chunks so the client can just append.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const parts =
                parsed?.candidates?.[0]?.content?.parts ??
                ([] as { text?: string; thought?: boolean }[]);
              for (const part of parts) {
                // Skip thought summaries — only stream the visible answer.
                if (part?.thought) continue;
                if (typeof part?.text === "string" && part.text) {
                  controller.enqueue(encoder.encode(part.text));
                }
              }
            } catch {
              // Partial/unparseable frame — ignore it.
            }
          }
        }
      } catch (err) {
        console.error("flashcards stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
