"use client";

import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import {
  LivePacing,
  LivePhase,
  LivePlayer,
  LiveStatus,
} from "@/lib/liveGame";

/** The live game doc, flattened for the client (timestamps as epoch ms). */
export type LiveGameState = {
  id: string;
  gameId: string;
  gameTitle: string;
  hostId: string;
  hostUsername: string;
  hostPhotoURL: string;
  joinCode: string;
  status: LiveStatus;
  phase: LivePhase;
  phaseSeq: number;
  currentQuestion: number;
  questionCount: number;
  timeLimitSeconds: number;
  pacing: LivePacing;
  revealed: Record<string, string | string[]>;
  /** Written explanations, published question by question alongside `revealed`. */
  revealedSolutions: Record<string, string>;
  playerCount: number;
  phaseStartedAtMs: number | null;
  phaseEndsAtMs: number | null;
};

export type LiveQuestionView = {
  id: string;
  content: string;
  imgURL?: string;
  multipleCorrect?: boolean;
  choices: { key: string; text: string }[];
};

export function toLiveGameState(id: string, data: any): LiveGameState {
  return {
    id,
    gameId: String(data?.gameId || ""),
    gameTitle: String(data?.gameTitle || "Untitled Blitz"),
    hostId: String(data?.hostId || ""),
    hostUsername: String(data?.hostUsername || ""),
    hostPhotoURL: String(data?.hostPhotoURL || ""),
    joinCode: String(data?.joinCode || ""),
    status: (data?.status || "lobby") as LiveStatus,
    phase: (data?.phase || "lobby") as LivePhase,
    phaseSeq: Number(data?.phaseSeq) || 0,
    currentQuestion: Number(data?.currentQuestion) || 0,
    questionCount: Number(data?.questionCount) || 0,
    timeLimitSeconds: Number(data?.timeLimitSeconds) || 0,
    pacing: data?.pacing as LivePacing,
    revealed: (data?.revealed || {}) as Record<string, string | string[]>,
    revealedSolutions: (data?.revealedSolutions || {}) as Record<string, string>,
    playerCount: Number(data?.playerCount) || 0,
    phaseStartedAtMs: data?.phaseStartedAt?.toMillis?.() ?? null,
    phaseEndsAtMs: data?.phaseEndsAt?.toMillis?.() ?? null,
  };
}

export function toLivePlayer(id: string, data: any): LivePlayer {
  return {
    uid: id,
    username: String(data?.username || "Player"),
    handle: String(data?.handle || ""),
    photoURL: String(data?.photoURL || ""),
    bElo: Number(data?.bElo) || 500,
    answers: (data?.answers || {}) as LivePlayer["answers"],
    correctCount: Number(data?.correctCount) || 0,
    totalMs: Number(data?.totalMs) || 0,
    ghost: data?.ghost === true,
  };
}

/** Calls a live API route with the caller's Firebase ID token attached. */
export async function liveFetch<T = any>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const currentUser = getAuth(app).currentUser;
  if (!currentUser) throw new Error("You must be signed in.");
  const token = await currentUser.getIdToken();

  const response = await fetch(path, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Something went wrong.");
  }
  return data as T;
}
