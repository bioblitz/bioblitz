import { loadBannedWords } from "./bannedWords";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForFilter(raw: string): string {
  const lower = raw.toLowerCase();
  const mapped = lower
    .replace(/[\$]/g, "s")
    .replace(/@/g, "a")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/!/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/9/g, "g");

  const deaccented = mapped.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return deaccented.replace(/([a-z])\1{2,}/g, "$1$1");
}

function stripNonAlnum(raw: string): string {
  return raw.replace(/[^a-z0-9]+/g, "");
}

function tokenize(raw: string): string[] {
  return raw
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function applyTextPolicy(
  raw: string,
): Promise<{ value: string; censored: boolean }> {
  const words = await loadBannedWords();
  if (!words.length) return { value: raw, censored: false };

  const normalized = normalizeForFilter(raw);
  const stripped = stripNonAlnum(normalized);
  const tokens = tokenize(normalized);

  let value = raw;
  let censored = false;

  for (const word of words) {
    if (!word) continue;
    const normalizedWord = stripNonAlnum(normalizeForFilter(word));
    if (!normalizedWord) continue;

    const isShort = normalizedWord.length <= 3;
    const matches = isShort
      ? tokens.includes(normalizedWord)
      : stripped.includes(normalizedWord);

    if (!matches) continue;

    const re = new RegExp(escapeRegex(word), "gi");
    if (re.test(value)) {
      value = value.replace(re, "_".repeat(word.length));
    } else {
      value = "_".repeat(raw.length);
    }
    censored = true;
  }

  return { value, censored };
}