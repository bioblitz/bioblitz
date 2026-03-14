import { loadBannedWords } from "./bannedWords";

let cachedCompiledWords: CompiledWord[] | null = null;

type CompiledWord = {
  raw: string;
  normalized: string;
  stripped: string;
  length: number;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeUsernameInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
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
  const collapsed = deaccented.replace(/([a-z])\1{2,}/g, "$1$1");
  return collapsed;
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

function censorUsernameWithWords(
  raw: string,
  bannedWords: string[],
): { value: string; censored: boolean } {
  if (!bannedWords.length) {
    return { value: raw, censored: false };
  }

  const normalized = normalizeForFilter(raw);
  const normalizedTokens = tokenize(normalized);
  const stripped = stripNonAlnum(normalized);

  let value = raw;
  let censored = false;

  const compiled = cachedCompiledWords || compileWords(bannedWords);
  cachedCompiledWords = compiled;

  for (const word of compiled) {
    if (!word.stripped) continue;

    const isShort = word.length <= 3;
    const hasTokenMatch = normalizedTokens.includes(word.stripped);
    const hasSubstringMatch = stripped.includes(word.stripped);

    const shouldCensor = isShort ? hasTokenMatch : hasSubstringMatch;
    if (!shouldCensor) continue;

    const re = new RegExp(escapeRegex(word.raw), "gi");
    if (re.test(value)) {
      value = value.replace(re, "_".repeat(word.raw.length));
    } else if (hasSubstringMatch) {
      // Fallback: mask the whole username if the exact raw form is not present.
      value = "_".repeat(raw.length);
    }
    censored = true;
  }

  return { value, censored };
}

function compileWords(words: string[]): CompiledWord[] {
  return words
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean)
    .map((word) => {
      const normalized = normalizeForFilter(word);
      const stripped = stripNonAlnum(normalized);
      return {
        raw: word,
        normalized,
        stripped,
        length: stripped.length,
      } as CompiledWord;
    })
    .filter((word) => word.length > 0);
}

async function loadWordsAndCompile(): Promise<CompiledWord[]> {
  if (cachedCompiledWords) return cachedCompiledWords;
  const words = await loadBannedWords();
  cachedCompiledWords = compileWords(words);
  return cachedCompiledWords;
}

export async function applyUsernamePolicy(
  raw: string,
): Promise<{ value: string; censored: boolean }> {
  const normalized = normalizeUsernameInput(raw);
  const compiled = await loadWordsAndCompile();
  if (!compiled.length) return { value: normalized, censored: false };
  const words = compiled.map((entry) => entry.raw);
  cachedCompiledWords = compiled;
  return censorUsernameWithWords(normalized, words);
}
