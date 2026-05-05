import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get("pdf") as File | null;
    const instructions = (formData.get("instructions") as string) || "";

    if (!pdfFile) {
      return NextResponse.json({ error: "No PDF provided" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const arrayBuffer = await pdfFile.arrayBuffer();
    const base64Pdf = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `You are a biology quiz question generator. I will give you a PDF document. Generate multiple choice questions from its content.

${instructions ? `User instructions: ${instructions}\n` : "Generate as many high-quality questions as you can from this content.\n"}
Return ONLY a valid JSON array — no explanation, no markdown, no code fences — with this exact structure:
[
  {
    "content": "Question text here",
    "choices": ["First choice", "Second choice", "Third choice", "Fourth choice"],
    "correctIndices": [0],
    "solution": "Brief explanation of why the correct answer(s) are right"
  }
]

Rules:
- Each question must have between 2 and 5 choices
- correctIndices is an array of 0-based indices of ALL correct answers
- Most questions should have exactly one correct answer (correctIndices with one element)
- Use multiple correct answers (2+) only when the question genuinely requires selecting all that apply — do not overuse this
- Questions must be specific and directly supported by the document
- Include a concise solution/explanation for each question
- Do not include ambiguous questions`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            } as any,
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const jsonText = rawText.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsed: { content: string; choices: string[]; correctIndices: number[]; solution?: string }[];
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: "AI returned malformed JSON. Try again." }, { status: 500 });
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ error: "No questions generated. Try more specific instructions." }, { status: 400 });
    }

    const questions = parsed.map((q) => {
      const choices = (q.choices || []).map((text, i) => ({
        id: String(i + 1),
        text: String(text),
      }));
      const indices: number[] = Array.isArray(q.correctIndices) ? q.correctIndices : [0];
      const correctAnswerIds = indices
        .map((i) => choices[i]?.id)
        .filter((id): id is string => !!id);
      const isMultiSelect = correctAnswerIds.length > 1;
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        content: String(q.content),
        imageUrl: "",
        choices,
        correctAnswerIds: correctAnswerIds.length > 0 ? correctAnswerIds : [choices[0]?.id ?? ""].filter(Boolean),
        isMultiSelect,
        solution: q.solution ? String(q.solution) : "",
      };
    });

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("generate-questions error:", err);
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
  }
}
