import { EditableQuestion } from "@/types";

/**
 * Shared conversions between the editor's `EditableQuestion` shape and the
 * lettered shape questions are stored in (`sets/{id}/questions` and
 * `questionPool/{id}`): content + a..e + correct.
 */

export const CHOICE_KEYS = ["a", "b", "c", "d", "e"] as const;
export type ChoiceKey = (typeof CHOICE_KEYS)[number];

export const QUESTION_TOPICS = [
  "Anatomy & Physiology",
  "Cell Biology",
  "Plant Biology",
  "Genetics & Evolution",
  "Biosystematics",
  "Ecology",
  "Ethology",
  "Multiple",
  "Other",
] as const;

export const QUESTION_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export type StoredQuestion = {
  id?: string;
  content: string;
  correct: string | string[];
  multipleCorrect?: boolean;
  imgURL: string;
  solution: string;
} & Partial<Record<ChoiceKey, string>>;

export function cleanHtml(html: string): string {
  return (html || "").replace(/&nbsp;/g, " ");
}

/** Strips tags so question text can be searched and previewed as plain text. */
export function stripHtml(html: string): string {
  return cleanHtml(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function editableToStored(eq: EditableQuestion): StoredQuestion {
  const correctLetters = (eq.correctAnswerIds ?? [])
    .map((id) => {
      const idx = eq.choices.findIndex((c) => c.id === id);
      return idx >= 0 ? CHOICE_KEYS[idx] : "";
    })
    .filter(Boolean) as ChoiceKey[];

  const stored: StoredQuestion = {
    id: eq.id,
    content: cleanHtml(eq.content),
    correct: eq.isMultiSelect ? correctLetters : (correctLetters[0] ?? ""),
    imgURL: eq.imageUrl || "",
    solution: eq.solution || "",
  };
  if (eq.isMultiSelect) stored.multipleCorrect = true;
  eq.choices.forEach((choice, idx) => {
    if (idx < CHOICE_KEYS.length) stored[CHOICE_KEYS[idx]] = choice.text;
  });
  return stored;
}

export function storedToEditable(
  q: Record<string, any>,
  fallbackId?: string,
): EditableQuestion {
  const choices = CHOICE_KEYS.filter((k) => q[k]).map((k, idx) => ({
    id: String(idx + 1),
    text: String(q[k]),
  }));

  const correctLetters: string[] = Array.isArray(q.correct)
    ? q.correct
    : q.correct
      ? [q.correct]
      : [];

  const correctAnswerIds = correctLetters
    .map((letter) => {
      const idx = CHOICE_KEYS.indexOf(letter as ChoiceKey);
      return idx >= 0 ? String(idx + 1) : "";
    })
    .filter(Boolean);

  return {
    id: q.id || fallbackId || Date.now().toString(),
    content: q.content || "",
    imageUrl: q.imgURL || "",
    choices,
    correctAnswerIds,
    isMultiSelect: correctAnswerIds.length > 1 || q.multipleCorrect === true,
    solution: q.solution || "",
  };
}

export function normalizeDifficulty(raw: unknown): QuestionDifficulty {
  const value = String(raw || "").trim().toLowerCase();
  const match = QUESTION_DIFFICULTIES.find((d) => d.toLowerCase() === value);
  return match || "Medium";
}

export function normalizeTopic(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "Other";
  const match = QUESTION_TOPICS.find(
    (t) => t.toLowerCase() === value.toLowerCase(),
  );
  return match || value;
}

/** Validation shared by the pool API and the pool editor. */
export function validateEditableQuestion(eq: EditableQuestion): string[] {
  const errors: string[] = [];
  if (!stripHtml(eq.content)) errors.push("Question content cannot be empty.");
  if (!eq.choices || eq.choices.length < 2)
    errors.push("A question needs at least two answer choices.");
  if ((eq.choices || []).some((c) => !c.text.trim()))
    errors.push("Answer choice text cannot be empty.");
  if (!eq.correctAnswerIds || eq.correctAnswerIds.length === 0)
    errors.push("At least one correct answer must be selected.");
  return errors;
}
