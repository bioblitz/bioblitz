/**
 * Allowlist for the flashcards feature. Kept in one place so the sidebar
 * (client) and the API route (server) can never drift apart.
 */
export const AI_CHAT_ALLOWED_EMAILS = [
  "aarnavsuwal@gmail.com",
  "1933291@fcpsschools.net",
];

export function hasAiChatAccess(email?: string | null): boolean {
  if (!email) return false;
  return AI_CHAT_ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}

export type GeminiModelId =
  | "gemini-3.7-flash"
  | "gemini-3.6-flash"
  | "gemini-3.5-flash-lite"
  | "gemini-3.1-pro-preview";

/**
 * Labels stay neutral on purpose — the deck settings should not read as a
 * model picker at a glance — but each one still maps to an obvious model so
 * you can tell which is which.
 */
export const GEMINI_MODELS: { id: GeminiModelId; label: string }[] = [
  { id: "gemini-3.7-flash", label: "Set F3.7" },
  { id: "gemini-3.6-flash", label: "Set F3.6" },
  { id: "gemini-3.5-flash-lite", label: "Set L3.5" },
  { id: "gemini-3.1-pro-preview", label: "Set P3.1" },
];

export const DEFAULT_MODEL: GeminiModelId = "gemini-3.7-flash";

/**
 * Gemini 3.x controls reasoning with `thinkingLevel`, not the older
 * `thinkingBudget` token count. Only these four values are accepted —
 * "off" and "dynamic" are rejected by the API.
 */
export type ReasoningLevel = "minimal" | "low" | "medium" | "high";

export const REASONING_LEVELS: { id: ReasoningLevel; label: string }[] = [
  { id: "minimal", label: "Brief" },
  { id: "low", label: "Normal" },
  { id: "medium", label: "Detailed" },
  { id: "high", label: "In depth" },
];

export const DEFAULT_REASONING: ReasoningLevel = "low";
