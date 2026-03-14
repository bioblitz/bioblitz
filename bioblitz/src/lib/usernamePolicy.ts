let cachedBannedWords: string[] | null = null;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeUsernameInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

function censorUsernameWithWords(
  raw: string,
  bannedWords: string[],
): { value: string; censored: boolean } {
  let value = raw;
  let censored = false;

  for (const word of bannedWords) {
    if (!word) continue;
    const re = new RegExp(escapeRegex(word), "gi");
    if (re.test(value)) {
      value = value.replace(re, "_".repeat(word.length));
      censored = true;
    }
  }

  return { value, censored };
}

async function loadBannedWords(): Promise<string[]> {
  if (cachedBannedWords) return cachedBannedWords;

  try {
    if (typeof window === "undefined") {
      const { readFile } = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", "banned-words.txt");
      const text = await readFile(filePath, "utf8");
      cachedBannedWords = text
        .split(/\r?\n/)
        .map((line) => line.trim().toLowerCase())
        .filter(Boolean);
      return cachedBannedWords;
    }

    const response = await fetch("/banned-words.txt", { cache: "force-cache" });
    const text = await response.text();
    cachedBannedWords = text
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean);
    return cachedBannedWords;
  } catch {
    cachedBannedWords = [];
    return cachedBannedWords;
  }
}

export async function applyUsernamePolicy(
  raw: string,
): Promise<{ value: string; censored: boolean }> {
  const normalized = normalizeUsernameInput(raw);
  const words = await loadBannedWords();
  return censorUsernameWithWords(normalized, words);
}
