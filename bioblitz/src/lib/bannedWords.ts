let cachedBannedWords: string[] | null = null;

export async function loadBannedWords(): Promise<string[]> {
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