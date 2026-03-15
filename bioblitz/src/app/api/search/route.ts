import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";

const TYPE_PRIORITY: Record<string, number> = {
  user: 4,
  channel: 3,
  contest: 2,
  potd: 1,
};

function normalize(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function ngrams(token: string, size: number): string[] {
  if (token.length < size) return [];
  const grams: string[] = [];
  for (let i = 0; i <= token.length - size; i += 1) {
    grams.push(token.slice(i, i + size));
  }
  return grams;
}

function tokenize(input: string): string[] {
  if (!input) return [];
  const normalized = normalize(input);
  if (!normalized) return [];
  const tokens = normalized.split(" ").filter((token) => token.length > 1);
  const expanded = new Set<string>();
  tokens.forEach((token) => {
    expanded.add(token);
    ngrams(token, 3).forEach((gram) => expanded.add(gram));
  });
  return Array.from(expanded);
}

function scoreResult(query: string, item: any): number {
  const q = normalize(query);
  const title = normalize(String(item.title || ""));
  const subtitle = normalize(String(item.subtitle || ""));
  let score = TYPE_PRIORITY[item.type] || 0;

  if (title === q) score += 10;
  if (title.startsWith(q)) score += 6;
  if (title.includes(q)) score += 3;
  if (subtitle.includes(q)) score += 1;

  return score;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = String(searchParams.get("q") || "").trim();
  if (rawQuery.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const tokens = tokenize(rawQuery).slice(0, 10);
  if (tokens.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const snapshot = await adminFirestore
    .collection("search_index")
    .where("keywords", "array-contains-any", tokens)
    .limit(50)
    .get();

  const results = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Record<string, unknown>) }))
    .map((item) => ({
      type: String((item as any).type || ""),
      title: String((item as any).title || ""),
      subtitle: String((item as any).subtitle || ""),
      href: String((item as any).href || ""),
      score: scoreResult(rawQuery, item),
    }))
    .filter((item) => item.title && item.href)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  return NextResponse.json({ results });
}
