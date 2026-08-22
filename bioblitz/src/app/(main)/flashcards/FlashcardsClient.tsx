"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useAuth } from "@/context/AuthContext";
import {
  GEMINI_MODELS,
  REASONING_LEVELS,
  DEFAULT_MODEL,
  DEFAULT_REASONING,
  hasAiChatAccess,
  type GeminiModelId,
  type ReasoningLevel,
} from "@/lib/aiChatAccess";
import {
  BookOpen,
  Plus,
  Square,
  Trash2,
  Layers,
  Loader2,
  ImagePlus,
  X,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
} from "lucide-react";

type Attachment = {
  id: string;
  /** Base64 payload with no data: prefix — the shape the API wants. */
  data: string;
  mimeType: string;
  name: string;
};

/** One flashcard: the front you wrote, plus both versions of the back. */
type Card = {
  id: string;
  question: string;
  /** What you wrote on the back yourself. */
  note: string;
  /** What was generated for the back, shown only behind the keyword. */
  answer: string;
  images?: Attachment[];
};

/**
 * Typing this on the back of a card swaps between your own writing and the
 * generated text. Typing it again swaps back, restoring the note untouched.
 */
const REVEAL_KEYWORD = "firelane";

type Deck = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  model: GeminiModelId;
  reasoning: ReasoningLevel;
  cards: Card[];
  /** Set once you name a deck yourself, so the first card stops renaming it. */
  renamed?: boolean;
};

const STORAGE_KEY_PREFIX = "bioblitz:decks:";
/** Pre-flashcard storage, still read once so existing history is not lost. */
const LEGACY_KEY_PREFIX = "bioblitz:ai-chats:";

/** The service downsamples past roughly this, so anything larger is wasted bytes. */
const MAX_IMAGE_DIM = 1568;
const JPEG_QUALITY = 0.85;
const MAX_ATTACHMENTS = 6;

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyDeck(model?: GeminiModelId, reasoning?: ReasoningLevel): Deck {
  return {
    id: newId(),
    name: "Untitled deck",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: model ?? DEFAULT_MODEL,
    reasoning: reasoning ?? DEFAULT_REASONING,
    cards: [],
  };
}

function deckNameFrom(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Untitled deck";
  return clean.length > 38 ? `${clean.slice(0, 38)}…` : clean;
}

function attachmentSrc(image: Attachment) {
  return `data:${image.mimeType};base64,${image.data}`;
}

/**
 * Re-encodes a pasted or picked image to a bounded JPEG. Originals off a phone
 * or a retina screenshot are several megabytes, which is both slow to upload
 * and far more than localStorage will hold.
 *
 * Transparency is flattened onto white rather than preserved: these are
 * screenshots and diagrams, and JPEG keeps them small and predictable.
 */
async function fileToAttachment(file: File): Promise<Attachment | null> {
  if (!file.type.startsWith("image/")) return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  if (!base64) return null;

  return {
    id: newId(),
    data: base64,
    mimeType: "image/jpeg",
    name: file.name || "pasted-image.jpg",
  };
}

function stripImages(decks: Deck[], keepId: string | null) {
  return decks.map((d) =>
    d.id === keepId
      ? d
      : {
          ...d,
          cards: d.cards.map((c) =>
            c.images?.length ? { ...c, images: [] } : c,
          ),
        },
  );
}

/**
 * localStorage is a few megabytes and base64 images eat it fast. Rather than
 * losing every deck to a quota error, shed image payloads in tiers and report
 * back whether anything had to go.
 */
function persistDecks(key: string, decks: Deck[]): { trimmed: boolean } {
  const attempts: { value: Deck[]; trimmed: boolean }[] = [
    { value: decks, trimmed: false },
    { value: stripImages(decks, decks[0]?.id ?? null), trimmed: true },
    { value: stripImages(decks, null), trimmed: true },
  ];

  for (const attempt of attempts) {
    try {
      window.localStorage.setItem(key, JSON.stringify(attempt.value));
      return { trimmed: attempt.trimmed };
    } catch {
      // Quota or unavailable — fall through to a smaller payload.
    }
  }
  return { trimmed: true };
}

/**
 * Decks saved before a model rename would keep sending values the API no
 * longer accepts, so coerce anything unrecognised back to the defaults.
 */
function migrateDeck(deck: Deck): Deck {
  const model = GEMINI_MODELS.some((m) => m.id === deck.model)
    ? deck.model
    : DEFAULT_MODEL;
  const reasoning = REASONING_LEVELS.some((r) => r.id === deck.reasoning)
    ? deck.reasoning
    : DEFAULT_REASONING;
  return {
    ...deck,
    model,
    reasoning,
    cards: (deck.cards ?? []).map((c) => ({ ...c, note: c.note ?? "" })),
  };
}

type LegacyMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: Attachment[];
};
type LegacyConversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: GeminiModelId;
  reasoning: ReasoningLevel;
  messages: LegacyMessage[];
};

/** Folds the old flat message list into question/answer pairs. */
function deckFromLegacy(conversation: LegacyConversation): Deck {
  const cards: Card[] = [];
  for (const message of conversation.messages ?? []) {
    if (message.role === "user") {
      cards.push({
        id: message.id,
        question: message.content,
        note: "",
        answer: "",
        images: message.images,
      });
    } else if (cards.length > 0) {
      cards[cards.length - 1].answer = message.content;
    }
  }
  return migrateDeck({
    id: conversation.id,
    name: conversation.title || "Untitled deck",
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    model: conversation.model,
    reasoning: conversation.reasoning,
    cards,
  });
}

const mathCache = new Map<string, string>();

/**
 * KaTeX is pure string -> HTML, so results are cached: streaming re-renders the
 * whole message on every chunk, and re-typesetting each formula per token adds
 * up on long answers.
 */
function renderMath(tex: string, display: boolean): string {
  const cacheKey = `${display ? "d" : "i"}:${tex}`;
  const cached = mathCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let html: string;
  try {
    html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      // Leave \\href and friends disabled — this is model output.
      trust: false,
      strict: false,
    });
  } catch {
    // renderToString still throws on a few malformed inputs even with
    // throwOnError; fall back to showing the raw source.
    html = "";
  }
  mathCache.set(cacheKey, html);
  return html;
}

function MathSpan({ tex, display }: { tex: string; display: boolean }) {
  const html = renderMath(tex, display);
  if (!html) {
    return (
      <code className="px-1 rounded bg-neutral-800 text-yellow-200 font-mono text-[0.9em]">
        {tex}
      </code>
    );
  }
  if (display) {
    return (
      <div
        className="my-3 overflow-x-auto text-center"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Minimal markdown rendering — fenced code, inline code, bold, italics, bullet
 * lists and LaTeX. Enough to keep model output readable without pulling in a
 * full markdown dependency.
 */
function renderInline(text: string, keyBase: string) {
  const nodes: React.ReactNode[] = [];
  // Backticks come first so `$x$` inside code stays literal, and \( \) before
  // the bare-dollar form so the escaped delimiters win.
  const pattern =
    /(`[^`]+`|\\\([\s\S]+?\\\)|\$[^$\n]+\$|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyBase}-i${i++}`;

    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-neutral-800 text-yellow-200 text-[0.9em] font-mono"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("\\(")) {
      nodes.push(<MathSpan key={key} tex={token.slice(2, -2)} display={false} />);
    } else if (token.startsWith("$")) {
      const inner = token.slice(1, -1);
      // Guard against prose like "$5 and $10" — real inline math does not open
      // or close on whitespace.
      const isMath =
        inner.trim().length > 0 &&
        !/^\s/.test(inner) &&
        !/\s$/.test(inner);
      if (isMath) {
        nodes.push(<MathSpan key={key} tex={inner} display={false} />);
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Splits out $$...$$ and \[...\] blocks, which may span multiple lines. */
function splitDisplayMath(text: string) {
  const segments: { kind: "text" | "math"; value: string }[] = [];
  const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\])/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ kind: "text", value: text.slice(last, match.index) });
    }
    // Both delimiter pairs ($$..$$ and \[..\]) are two characters wide.
    const token = match[0];
    segments.push({ kind: "math", value: token.slice(2, -2) });
    last = match.index + token.length;
  }
  if (last < text.length) {
    segments.push({ kind: "text", value: text.slice(last) });
  }
  return segments;
}

function TextBlock({ text, keyBase }: { text: string; keyBase: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, lineIndex) => {
        const key = `${keyBase}l${lineIndex}`;
        if (!line.trim()) return null;

        const heading = /^(#{1,4})\s+(.*)$/.exec(line);
        if (heading) {
          return (
            <p key={key} className="font-bold text-white text-[1.05em] pt-1">
              {renderInline(heading[2], key)}
            </p>
          );
        }

        const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
        if (bullet) {
          return (
            <div key={key} className="flex gap-2 pl-1">
              <span className="text-yellow-400 select-none">•</span>
              <span>{renderInline(bullet[1], key)}</span>
            </div>
          );
        }

        const numbered = /^\s*(\d+)\.\s+(.*)$/.exec(line);
        if (numbered) {
          return (
            <div key={key} className="flex gap-2 pl-1">
              <span className="text-yellow-400 select-none">{numbered[1]}.</span>
              <span>{renderInline(numbered[2], key)}</span>
            </div>
          );
        }

        return <p key={key}>{renderInline(line, key)}</p>;
      })}
    </div>
  );
}

function MessageBody({ content }: { content: string }) {
  const blocks = content.split(/```/);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        // Odd indices are inside a fence — never touched by markdown or math.
        if (blockIndex % 2 === 1) {
          const firstNewline = block.indexOf("\n");
          const code = firstNewline === -1 ? block : block.slice(firstNewline + 1);
          return (
            <pre
              key={`b${blockIndex}`}
              className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm font-mono text-neutral-200"
            >
              <code>{code.replace(/\n$/, "")}</code>
            </pre>
          );
        }

        return (
          <div key={`b${blockIndex}`} className="space-y-2">
            {splitDisplayMath(block).map((segment, segIndex) =>
              segment.kind === "math" ? (
                <MathSpan
                  key={`b${blockIndex}s${segIndex}`}
                  tex={segment.value}
                  display
                />
              ) : (
                <TextBlock
                  key={`b${blockIndex}s${segIndex}`}
                  text={segment.value}
                  keyBase={`b${blockIndex}s${segIndex}`}
                />
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FlashcardsClient() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const allowed = hasAiChatAccess(user?.email);

  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [storageNote, setStorageNote] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<"sidebar" | "header">(
    "sidebar",
  );
  const [editingName, setEditingName] = useState("");
  const [revealed, setRevealed] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  /** Rolling buffer of letters typed while the generated side is showing. */
  const keywordBuffer = useRef("");

  const storageKey = user?.uid ? `${STORAGE_KEY_PREFIX}${user.uid}` : null;
  const legacyKey = user?.uid ? `${LEGACY_KEY_PREFIX}${user.uid}` : null;

  useEffect(() => {
    if (!loading && !allowed) router.replace("/home");
  }, [loading, allowed, router]);

  // Load decks, falling back to the pre-flashcard chat format once.
  useEffect(() => {
    if (!storageKey || !legacyKey) return;
    let loaded: Deck[] = [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const stored = JSON.parse(raw);
        if (Array.isArray(stored)) loaded = stored.map(migrateDeck);
      } else {
        const legacyRaw = window.localStorage.getItem(legacyKey);
        if (legacyRaw) {
          const legacy = JSON.parse(legacyRaw);
          if (Array.isArray(legacy)) loaded = legacy.map(deckFromLegacy);
        }
      }
    } catch {
      loaded = [];
    }

    if (loaded.length === 0) loaded = [emptyDeck()];
    setDecks(loaded);
    setActiveId(loaded[0].id);
    setIndex(loaded[0].cards.length);
    setHydrated(true);
  }, [storageKey, legacyKey]);

  useEffect(() => {
    if (!storageKey || !hydrated) return;
    setStorageNote(persistDecks(storageKey, decks).trimmed);
  }, [decks, storageKey, hydrated]);

  const active = useMemo(
    () => decks.find((d) => d.id === activeId) ?? null,
    [decks, activeId],
  );

  const cards = active?.cards ?? [];
  // The slot one past the last card is the blank card you write on.
  const composing = index >= cards.length;
  const current = composing ? null : cards[index];

  const patchActive = useCallback(
    (patch: (deck: Deck) => Deck) => {
      setDecks((prev) => prev.map((d) => (d.id === activeId ? patch(d) : d)));
    },
    [activeId],
  );

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(cards.length, next));
      setIndex(clamped);
      setFlipped(false);
      setRevealed(false);
      keywordBuffer.current = "";
    },
    [cards.length],
  );

  const selectDeck = (deck: Deck) => {
    setActiveId(deck.id);
    setIndex(deck.cards.length);
    setFlipped(false);
    setRevealed(false);
    keywordBuffer.current = "";
    setError(null);
    setAttachments([]);
    setDraft("");
  };

  const newDeck = () => {
    const deck = emptyDeck(active?.model, active?.reasoning);
    setDecks((prev) => [deck, ...prev]);
    selectDeck(deck);
  };

  const startRename = (deck: Deck, source: "sidebar" | "header") => {
    setEditingId(deck.id);
    setEditingSource(source);
    setEditingName(deck.name);
  };

  const commitRename = () => {
    if (!editingId) return;
    const name = editingName.trim();
    setDecks((prev) =>
      prev.map((d) =>
        d.id === editingId
          ? {
              ...d,
              name: name || "Untitled deck",
              renamed: true,
              updatedAt: Date.now(),
            }
          : d,
      ),
    );
    setEditingId(null);
    setEditingName("");
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const deleteDeck = (id: string) => {
    setDecks((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (next.length === 0) {
        const deck = emptyDeck();
        setActiveId(deck.id);
        setIndex(0);
        return [deck];
      }
      if (id === activeId) {
        setActiveId(next[0].id);
        setIndex(next[0].cards.length);
      }
      return next;
    });
    setFlipped(false);
  };

  const addFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;

      const room = MAX_ATTACHMENTS - attachments.length;
      if (room <= 0) {
        setError(`A card holds at most ${MAX_ATTACHMENTS} images.`);
        return;
      }

      const processed = await Promise.all(
        images.slice(0, room).map(fileToAttachment),
      );
      const usable = processed.filter((a): a is Attachment => a !== null);
      if (usable.length < images.length) {
        setError("Some files could not be read as images.");
      }
      if (usable.length > 0) {
        // Attaching always applies to the blank card at the end of the deck.
        setIndex(cards.length);
        setFlipped(false);
        setAttachments((prev) => [...prev, ...usable].slice(0, MAX_ATTACHMENTS));
      }
    },
    [attachments.length, cards.length],
  );

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);
    if (files.some((f) => f.type.startsWith("image/"))) {
      e.preventDefault();
      void addFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    void addFiles(Array.from(e.dataTransfer.files));
  };

  const setNote = (cardId: string, note: string) => {
    setDecks((prev) =>
      prev.map((d) =>
        d.id !== activeId
          ? d
          : {
              ...d,
              updatedAt: Date.now(),
              cards: d.cards.map((c) => (c.id === cardId ? { ...c, note } : c)),
            },
      ),
    );
  };

  const handleNoteChange = (cardId: string, value: string) => {
    const at = value.toLowerCase().indexOf(REVEAL_KEYWORD);
    if (at === -1) {
      setNote(cardId, value);
      return;
    }
    // Strip the keyword back out so the note keeps exactly what you wrote.
    const cleaned = value.slice(0, at) + value.slice(at + REVEAL_KEYWORD.length);
    setNote(cardId, cleaned);
    keywordBuffer.current = "";
    setRevealed(true);
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  const commitCard = async () => {
    const text = draft.trim();
    if ((!text && attachments.length === 0) || streaming || !active) return;

    setError(null);
    setDraft("");
    setAttachments([]);

    const card: Card = {
      id: newId(),
      question: text,
      note: "",
      answer: "",
      images: attachments,
    };

    const deckId = active.id;
    const model = active.model;
    const reasoning = active.reasoning;
    const priorCards = active.cards;
    const cardIndex = priorCards.length;

    patchActive((d) => ({
      ...d,
      name:
        d.cards.length === 0 && !d.renamed
          ? deckNameFrom(text || `${attachments.length} image card`)
          : d.name,
      updatedAt: Date.now(),
      cards: [...d.cards, card],
    }));

    // Flip to the back; it shows the writable note, not what is generating.
    setIndex(cardIndex);
    setFlipped(true);
    setRevealed(false);
    keywordBuffer.current = "";

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);

    try {
      const history = [...priorCards, card].flatMap((c) => {
        const turns: {
          role: "user" | "assistant";
          content: string;
          images: { data: string; mimeType: string }[];
        }[] = [
          {
            role: "user",
            content: c.question,
            images: (c.images ?? []).map((img) => ({
              data: img.data,
              mimeType: img.mimeType,
            })),
          },
        ];
        if (c.answer) {
          turns.push({ role: "assistant", content: c.answer, images: [] });
        }
        return turns;
      });

      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ model, reasoning, messages: history }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setDecks((prev) =>
          prev.map((d) =>
            d.id !== deckId
              ? d
              : {
                  ...d,
                  updatedAt: Date.now(),
                  cards: d.cards.map((c) =>
                    c.id === card.id ? { ...c, answer: snapshot } : c,
                  ),
                },
          ),
        );
      }

      if (!acc.trim()) setError("The back of this card came back empty.");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Something went wrong.");
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  };

  // Landing on a writable side should put the cursor on it.
  useEffect(() => {
    if (composing && !flipped && !streaming) draftRef.current?.focus();
  }, [composing, flipped, streaming, activeId]);


  useEffect(() => {
    if (!revealed) return;
    const onKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key.length !== 1) return;
      const next = (keywordBuffer.current + e.key.toLowerCase()).slice(
        -REVEAL_KEYWORD.length,
      );
      keywordBuffer.current = next;
      if (next === REVEAL_KEYWORD) {
        keywordBuffer.current = "";
        setRevealed(false);
      }
    };
    window.addEventListener("keydown", onKeyPress);
    return () => window.removeEventListener("keydown", onKeyPress);
  }, [revealed]);

  // Left/right flips the card, up/down walks the deck. Skipped while typing so
  // arrows still move the caret in the draft box.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.isContentEditable);
      if (typing) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        if (!composing) setFlipped((f) => !f);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goTo(index + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [composing, current, index, goTo]);

  const handleDraftKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void commitCard();
    }
  };

  if (loading || !allowed) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  const selectClass =
    "bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-sm text-neutral-200 focus:outline-none focus:border-yellow-400/60 cursor-pointer";

  const canFlip = !composing;
  const position = composing ? cards.length + 1 : index + 1;

  return (
    <div className="min-h-screen bg-neutral-900 text-white pt-16 md:pt-20 pb-6 md:pl-16">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-[calc(100vh-5rem)] flex gap-4">
        {/* Decks */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col rounded-2xl border border-neutral-800 bg-neutral-950/60">
          <div className="p-3 border-b border-neutral-800">
            <button
              onClick={newDeck}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 px-3 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-400/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New deck
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {decks.map((d) => (
              <div
                key={d.id}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  d.id === activeId
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                }`}
                onClick={() => {
                  if (editingId !== d.id) selectDeck(d);
                }}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  {editingId === d.id && editingSource === "sidebar" ? (
                    <input
                      value={editingName}
                      autoFocus
                      onFocus={(e) => e.currentTarget.select()}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        // Stop Enter/Escape and the arrow keys from reaching
                        // the deck-navigation shortcuts.
                        e.stopPropagation();
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                      className="w-full bg-neutral-950 border border-yellow-400/40 rounded px-1.5 py-0.5 text-sm text-white focus:outline-none"
                      aria-label="Deck name"
                    />
                  ) : (
                    <div
                      className="truncate text-sm"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startRename(d, "sidebar");
                      }}
                      title={d.name}
                    >
                      {d.name}
                    </div>
                  )}
                  <div className="text-[11px] text-neutral-500">
                    {d.cards.length} card{d.cards.length === 1 ? "" : "s"}
                  </div>
                </div>

                {editingId === d.id && editingSource === "sidebar" ? (
                  <button
                    aria-label="Save deck name"
                    // onMouseDown: the input's onBlur would otherwise fire and
                    // unmount this button before the click lands.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      commitRename();
                    }}
                    className="text-neutral-400 hover:text-yellow-300 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      aria-label={`Rename ${d.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(d, "sidebar");
                      }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-yellow-300 transition-opacity"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      aria-label={`Delete ${d.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDeck(d.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Study area */}
        <section
          className="relative flex-1 min-w-0 flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950/60"
          onDragEnter={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          }}
          onDrop={handleDrop}
        >
          {dragging && (
            <div className="absolute inset-0 z-20 rounded-2xl border-2 border-dashed border-yellow-400/60 bg-neutral-950/80 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-yellow-300">
                <ImagePlus className="w-8 h-8" />
                <span className="text-sm font-medium">Drop images onto the card</span>
              </div>
            </div>
          )}

          <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-neutral-800">
            <div className="flex items-center gap-2 mr-auto min-w-0">
              <div className="bg-yellow-400/10 p-1.5 rounded-full">
                <BookOpen className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="min-w-0">
                {active && editingId === active.id && editingSource === "header" ? (
                  <input
                    value={editingName}
                    autoFocus
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelRename();
                      }
                    }}
                    className="w-full bg-neutral-950 border border-yellow-400/40 rounded px-2 py-0.5 font-bold text-lg text-white focus:outline-none"
                    aria-label="Deck name"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h1
                      className="font-bold text-lg truncate"
                      onDoubleClick={() => active && startRename(active, "header")}
                    >
                      {active?.name ?? "Flashcards"}
                    </h1>
                    <button
                      onClick={() => active && startRename(active, "header")}
                      aria-label="Rename deck"
                      title="Rename deck"
                      className="shrink-0 text-neutral-500 hover:text-yellow-300 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-neutral-500">
                  Card {position} of {cards.length + 1}
                </p>
              </div>
            </div>

            <select
              aria-label="Card set"
              className={selectClass}
              value={active?.model ?? DEFAULT_MODEL}
              onChange={(e) =>
                patchActive((d) => ({
                  ...d,
                  model: e.target.value as GeminiModelId,
                }))
              }
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Answer detail"
              className={selectClass}
              value={active?.reasoning ?? DEFAULT_REASONING}
              onChange={(e) =>
                patchActive((d) => ({
                  ...d,
                  reasoning: e.target.value as ReasoningLevel,
                }))
              }
            >
              {REASONING_LEVELS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </header>

          {/* Card surface */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
            <div
              className="w-full max-w-3xl h-full"
              style={{ perspective: "1800px" }}
            >
              <div
                className="relative w-full h-full transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Front — the question */}
                <div
                  className="absolute inset-0 rounded-2xl border border-neutral-700 bg-neutral-900 shadow-xl flex flex-col"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-neutral-800">
                    <span className="text-[11px] tracking-widest text-neutral-500">
                      Front
                    </span>
                    {composing && (
                      <span className="text-[11px] text-neutral-500">
                        Enter to reveal · Shift+Enter for a new line
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-5">
                    {composing ? (
                      <>
                        {attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pb-3">
                            {attachments.map((img) => (
                              <div key={img.id} className="relative">
                                <img
                                  src={attachmentSrc(img)}
                                  alt={img.name}
                                  className="h-20 w-20 rounded-lg border border-neutral-700 object-cover"
                                />
                                <button
                                  onClick={() =>
                                    setAttachments((prev) =>
                                      prev.filter((a) => a.id !== img.id),
                                    )
                                  }
                                  aria-label={`Remove ${img.name}`}
                                  className="absolute -top-1.5 -right-1.5 rounded-full bg-neutral-800 border border-neutral-600 p-0.5 text-neutral-300 hover:text-red-400 hover:border-red-400/50 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <textarea
                          ref={draftRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={handleDraftKeyDown}
                          onPaste={handlePaste}
                          placeholder="Write the front of this card…"
                          className="w-full h-full min-h-[8rem] resize-none bg-transparent text-lg text-neutral-100 placeholder-neutral-600 focus:outline-none"
                        />
                      </>
                    ) : (
                      <div className="space-y-3">
                        {current?.images && current.images.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {current.images.map((img) => (
                              <img
                                key={img.id}
                                src={attachmentSrc(img)}
                                alt={img.name}
                                className="max-h-56 rounded-lg border border-neutral-700 object-contain"
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-lg text-neutral-100 whitespace-pre-wrap">
                          {current?.question}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Back — the answer */}
                <div
                  className="absolute inset-0 rounded-2xl border border-yellow-400/25 bg-neutral-900 shadow-xl flex flex-col"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-neutral-800">
                    <span className="text-[11px] tracking-widest text-yellow-500/70">
                      Back
                    </span>
                    {revealed && streaming && (
                      <span className="flex items-center gap-2 text-[11px] text-neutral-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Writing…
                      </span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 text-[0.95rem] leading-relaxed text-neutral-200">
                    {revealed ? (
                      current?.answer ? (
                        <MessageBody content={current.answer} />
                      ) : (
                        <span className="text-neutral-500 text-sm">
                          Nothing on this side yet.
                        </span>
                      )
                    ) : current ? (
                      <textarea
                        ref={noteRef}
                        value={current.note}
                        onChange={(e) =>
                          handleNoteChange(current.id, e.target.value)
                        }
                        placeholder="Write the back of this card…"
                        className="w-full h-full min-h-[8rem] resize-none bg-transparent text-lg text-neutral-100 placeholder-neutral-600 focus:outline-none"
                      />
                    ) : (
                      <span className="text-neutral-500 text-sm">
                        Write the front first.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-4 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {storageNote && (
            <div className="mx-4 mb-2 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-xs text-neutral-400">
              Images from older decks were dropped from local storage to stay
              under the browser quota. Card text is still saved.
            </div>
          )}

          {/* Controls */}
          <div className="border-t border-neutral-800 p-3">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void addFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />

              <button
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                className="rounded-xl bg-neutral-900 border border-neutral-700 p-3 text-neutral-300 hover:text-white hover:border-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous card"
                title="Previous card (↑)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => goTo(index + 1)}
                disabled={index >= cards.length}
                className="rounded-xl bg-neutral-900 border border-neutral-700 p-3 text-neutral-300 hover:text-white hover:border-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next card"
                title="Next card (↓)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl bg-neutral-900 border border-neutral-700 p-3 text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
                aria-label="Attach images to this card"
                title="Attach images"
              >
                <ImagePlus className="w-5 h-5" />
              </button>

              <div className="flex-1" />

              {composing ? (
                streaming ? (
                  <button
                    onClick={stop}
                    className="flex items-center gap-2 rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => void commitCard()}
                    disabled={!draft.trim() && attachments.length === 0}
                    className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-semibold text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-yellow-300 transition-colors"
                    title="Flip card (← →)"
                  >
                    <RotateCw className="w-4 h-4" />
                    Flip card
                  </button>
                )
              ) : (
                <button
                  onClick={() => setFlipped((f) => !f)}
                  disabled={!canFlip}
                  className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-semibold text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-yellow-300 transition-colors"
                  title="Flip card (← →)"
                >
                  <RotateCw className="w-4 h-4" />
                  Flip card
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
