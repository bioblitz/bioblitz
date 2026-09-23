"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import {
  LIVE_GAMES_COLLECTION,
  LivePlayer,
  ghostOrder,
  rankStandings,
} from "@/lib/liveGame";
import {
  LiveGameState,
  LiveQuestionView,
  toLiveGameState,
  toLivePlayer,
} from "@/lib/liveClient";

/**
 * Subscribes to everything a live room needs: the state doc (which changes on
 * every phase), the player list, and the question list (fetched once).
 *
 * The three are separate documents on purpose — the state doc churns several
 * times per question, and nobody wants to re-download the questions with it.
 */
export function useLiveGame(liveGameId: string | undefined) {
  const [game, setGame] = useState<LiveGameState | null>(null);
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [questions, setQuestions] = useState<LiveQuestionView[]>([]);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Players' own clocks can be minutes off; anchor countdowns to the server's
  // reported phase start instead of trusting `Date.now()` outright.
  const [skewMs, setSkewMs] = useState(0);
  const lastSeq = useRef<number | null>(null);

  useEffect(() => {
    if (!liveGameId) return;
    const ref = doc(firestore, LIVE_GAMES_COLLECTION, liveGameId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setMissing(true);
          setLoading(false);
          return;
        }
        const next = toLiveGameState(snap.id, snap.data());
        if (next.phaseSeq !== lastSeq.current && next.phaseStartedAtMs) {
          lastSeq.current = next.phaseSeq;
          setSkewMs(next.phaseStartedAtMs - Date.now());
        }
        setGame(next);
        setLoading(false);
      },
      (err) => {
        console.error("Live blitz subscription failed:", err);
        setError("Lost connection to this live blitz.");
        setLoading(false);
      },
    );
    return () => unsub();
  }, [liveGameId]);

  useEffect(() => {
    if (!liveGameId) return;
    const ref = collection(firestore, LIVE_GAMES_COLLECTION, liveGameId, "players");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setPlayers(snap.docs.map((d) => toLivePlayer(d.id, d.data())));
        setPlayersLoaded(true);
      },
      (err) => console.error("Live player subscription failed:", err),
    );
    return () => unsub();
  }, [liveGameId]);

  useEffect(() => {
    if (!liveGameId) return;
    const ref = doc(
      firestore,
      LIVE_GAMES_COLLECTION,
      liveGameId,
      "content",
      "questions",
    );
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const list = (snap.data()?.questions || []) as LiveQuestionView[];
        setQuestions(list);
      },
      (err) => console.error("Live question subscription failed:", err),
    );
    return () => unsub();
  }, [liveGameId]);

  const standings = useMemo(() => rankStandings(players), [players]);
  const ghosts = useMemo(() => ghostOrder(players), [players]);

  return {
    game,
    players,
    standings,
    ghosts,
    questions,
    loading,
    playersLoaded,
    missing,
    error,
    skewMs,
  };
}

/**
 * Seconds left in the current phase, ticking ten times a second so the bar
 * moves smoothly. Returns null when the phase has no clock (lobby, podium).
 */
export function usePhaseCountdown(
  endsAtMs: number | null,
  skewMs: number,
): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAtMs) {
      setRemaining(null);
      return;
    }
    const tick = () =>
      setRemaining(Math.max(0, (endsAtMs - (Date.now() + skewMs)) / 1000));
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [endsAtMs, skewMs]);

  return remaining;
}
