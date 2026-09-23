import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireStaffOrAdmin } from "@/lib/adminAccess";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_TOPICS,
  normalizeDifficulty,
  normalizeTopic,
} from "@/lib/questionShape";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILES = 10;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_CHARS = 100_000;
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type GeneratedQuestion = {
  content: string;
  choices: string[];
  correctIndices: number[];
  solution?: string;
  topic?: string;
  difficulty?: string;
};

function buildPrompt(instructions: string, count: number | null): string {
  return `You are a biology question writer for BioBlitz, a competitive biology practice site. Extract or write multiple choice questions from the material provided (documents, images, and/or pasted text).

${count ? `Produce exactly ${count} questions.` : "Produce as many high-quality questions as the material genuinely supports."}
${instructions ? `Additional instructions from staff: ${instructions}` : ""}

Return ONLY a valid JSON array — no explanation, no markdown, no code fences — with this exact structure:
[
  {
    "content": "Question text here",
    "choices": ["First choice", "Second choice", "Third choice", "Fourth choice"],
    "correctIndices": [0],
    "solution": "Brief explanation of why the correct answer(s) are right",
    "topic": "Cell Biology",
    "difficulty": "Medium"
  }
]

Rules:
- Each question must have between 2 and 5 choices
- correctIndices is an array of 0-based indices of ALL correct answers
- Most questions should have exactly one correct answer; use multiple only when the question genuinely requires selecting all that apply
- "topic" must be exactly one of: ${QUESTION_TOPICS.join(", ")}
- "difficulty" must be exactly one of: ${QUESTION_DIFFICULTIES.join(", ")} — judge it against USABO/IBO-style preparation, where Easy is recall, Medium requires applying a concept, and Hard requires multi-step reasoning or data interpretation
- If the material already contains written questions, transcribe them faithfully (including their answer choices) rather than inventing new ones
- Questions must be specific and directly supported by the material
- Do not include ambiguous questions`;
}

export async function POST(request: Request) {
  try {
    await requireStaffOrAdmin(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  const text = String(formData.get("text") || "").trim().slice(0, MAX_TEXT_CHARS);
  const instructions = String(formData.get("instructions") || "").trim();
  const rawCount = Number(formData.get("count"));
  const count = Number.isFinite(rawCount) && rawCount > 0 ? Math.min(50, Math.floor(rawCount)) : null;

  if (files.length === 0 && !text) {
    return NextResponse.json(
      { error: "Provide text, images, or a PDF to generate questions from." },
      { status: 400 },
    );
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Attach at most ${MAX_FILES} files at a time.` },
      { status: 400 },
    );
  }

  const content: any[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `"${file.name}" is larger than 20MB.` },
        { status: 400 },
      );
    }
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    if (file.type === "application/pdf") {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      });
    } else if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: file.type, data: base64 },
      });
    } else {
      return NextResponse.json(
        { error: `"${file.name}" is not a PDF or a supported image (JPEG, PNG, GIF, WebP).` },
        { status: 400 },
      );
    }
  }

  if (text) {
    content.push({ type: "text", text: `Source material:\n\n${text}` });
  }

  content.push({ type: "text", text: buildPrompt(instructions, count) });

  let rawText: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 16000,
      messages: [{ role: "user", content }],
    });
    rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    console.error("Pool question generation failed:", err);
    return NextResponse.json(
      { error: "The AI request failed. Try again with less material." },
      { status: 502 },
    );
  }

  const jsonText = rawText
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();

  let parsed: GeneratedQuestion[];
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return NextResponse.json(
      { error: "AI returned malformed JSON. Try again." },
      { status: 502 },
    );
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return NextResponse.json(
      { error: "No questions generated. Try more specific instructions." },
      { status: 400 },
    );
  }

  const questions = parsed
    .filter((q) => q && q.content && Array.isArray(q.choices) && q.choices.length >= 2)
    .map((q, idx) => {
      const choices = q.choices.slice(0, 5).map((choiceText, i) => ({
        id: String(i + 1),
        text: String(choiceText),
      }));
      const indices = Array.isArray(q.correctIndices) ? q.correctIndices : [0];
      const correctAnswerIds = indices
        .map((i) => choices[i]?.id)
        .filter((id): id is string => !!id);

      return {
        id: `gen-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        content: String(q.content),
        imageUrl: "",
        choices,
        correctAnswerIds:
          correctAnswerIds.length > 0
            ? correctAnswerIds
            : [choices[0]?.id ?? ""].filter(Boolean),
        isMultiSelect: correctAnswerIds.length > 1,
        solution: q.solution ? String(q.solution) : "",
        topic: normalizeTopic(q.topic),
        difficulty: normalizeDifficulty(q.difficulty),
      };
    });

  if (questions.length === 0) {
    return NextResponse.json(
      { error: "No usable questions were generated. Try again." },
      { status: 400 },
    );
  }

  return NextResponse.json({ questions });
}
