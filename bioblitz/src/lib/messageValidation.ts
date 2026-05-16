//basically we don't want people spamming too many messages
//we should do profanity checkers in the future
export const MAX_MESSAGE_LENGTH = 1000;
export const RATE_LIMIT_PER_MINUTE = 30;
export const RATE_LIMIT_PER_DAY = 500;

export type ValidationFailure =
  | { ok: false; code: "empty" }
  | { ok: false; code: "too_long"; maxLength: number }
  | { ok: false; code: "rate_limit_minute"; resetIn: number }
  | { ok: false; code: "rate_limit_day"; resetIn: number };

export type ValidationResult = { ok: true } | ValidationFailure;

export function failureMessage(failure: ValidationFailure): string {
  switch (failure.code) {
    case "empty":
      return "Message can't be empty.";
    case "too_long":
      return `Message is too long. Max ${failure.maxLength} characters.`;
    case "rate_limit_minute":
      return `Slow down a bit. Try again in ${Math.ceil(failure.resetIn / 1000)}s.`;
    case "rate_limit_day":
      return "You've hit today's message limit. Try again tomorrow.";
  }
}

export function validateMessageContent(text: string): ValidationResult {
  const trimmed = text.trim();

  if (trimmed.length === 0) return { ok: false, code: "empty" };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, code: "too_long", maxLength: MAX_MESSAGE_LENGTH };
  }

  // TODO(v1.1): profanity + PII filters go here
  // See messaging spec for details. Privacy policy currently directs users
  // not to share PII; this layer will enforce it once curated wordlist exists.

  return { ok: true };
}
