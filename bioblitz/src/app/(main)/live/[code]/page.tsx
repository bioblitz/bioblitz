"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DM_Sans } from "next/font/google";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Loader2, Radio, Users } from "lucide-react";
import { app } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { createUserProfile } from "@/lib/user";
import { trackAnalyticsEvent } from "@/lib/analytics-client";
import GoogleButton from "@/components/ui/GoogleButton";
import LiveAvatar from "@/components/features/live/LiveAvatar";
import { JOIN_CODE_LENGTH, normalizeJoinCode } from "@/lib/liveGame";
import { liveFetch } from "@/lib/liveClient";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

type RoomDetails = {
  code: string;
  liveGameId: string;
  gameTitle: string;
  hostUsername: string;
  hostPhotoURL: string;
  questionCount: number;
  secondsPerQuestion: number;
  playerCount: number;
  open: boolean;
  closedReason: string | null;
};

/**
 * The shareable way into a room: `bioblitz.net/live/<code>`.
 *
 * A host can read a code out, but a link is what actually gets pasted into a
 * class chat, and whoever opens it is often not signed in yet. So the room's
 * details are fetched without auth and shown first — you can see what you are
 * being invited to before deciding to sign in for it — and signing in drops
 * you straight into the lobby rather than back at a code box you would have
 * to retype the code into.
 *
 * The code in the URL is normalized, so `/live/abc123` and `/live/ABC-123`
 * both work.
 */
export default function LiveCodePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  // Whether the *server* session exists, which is what the play page reads.
  // Firebase auth flipping is not the same thing and lands first.
  const { user, isAuthenticated, loading: authLoading, refresh } = useAuth();

  const rawCode = decodeURIComponent(params?.code || "");
  const code = normalizeJoinCode(rawCode);
  const malformed = code.length !== JOIN_CODE_LENGTH;

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!malformed);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  // Set once the session is good and we are only waiting on the profile to be
  // complete enough to join with.
  const [awaitingProfile, setAwaitingProfile] = useState(false);

  // One entry attempt per visit. Also claimed synchronously by the sign-in
  // button before it awaits anything, so the auth-state change it causes
  // cannot race a second attempt through the effect below.
  const entering = useRef(false);

  useEffect(() => {
    if (malformed) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/live/room/${code}`);
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setLookupError(data?.error || "Could not find that room.");
        } else {
          setRoom(data as RoomDetails);
        }
      } catch {
        if (!cancelled) setLookupError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, malformed]);

  // Firebase auth is watched directly rather than through `useAuth`, because
  // what matters here is having an ID token to call the join API with — which
  // exists the moment the popup closes, before the server session settles.
  useEffect(() => {
    return getAuth(app).onAuthStateChanged((user) => setSignedIn(!!user));
  }, []);

  /**
   * Makes sure a server session cookie exists for the current Firebase user.
   *
   * `/api/live/join` only needs an ID token, but the play page reads
   * `useAuth()`, which is backed by the session cookie — so joining without
   * one lands the player in the room's signed-out state even though the host
   * can already see them.
   */
  const ensureSession = useCallback(async () => {
    const current = getAuth(app).currentUser;
    if (!current) return false;
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: await current.getIdToken() }),
    });
    return response.ok;
  }, []);

  const enterRoom = useCallback(async () => {
    setJoining(true);
    setJoinError(null);
    try {
      const data = await liveFetch<{ liveGameId: string }>("/api/live/join", {
        body: { code },
      });
      router.push(`/live/play/${data.liveGameId}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Could not join.");
      setJoining(false);
      entering.current = false;
    }
  }, [code, router]);

  // Already signed in: the link is the whole interaction, so don't make them
  // press a second button to do the thing they just clicked.
  useEffect(() => {
    if (!room?.open || signedIn !== true || authLoading || entering.current) return;
    entering.current = true;

    if (isAuthenticated) {
      setAwaitingProfile(true);
      return;
    }

    // Signed into Firebase but with no (or an expired) server session. Mint
    // one and re-read it, because the play page is gated on the session
    // cookie, not on Firebase's own state.
    void (async () => {
      const ok = await ensureSession();
      if (!ok) {
        setJoinError("Could not start your session — try signing in again.");
        entering.current = false;
        return;
      }
      await refresh();
      setAwaitingProfile(true);
    })();
  }, [room?.open, signedIn, authLoading, isAuthenticated, ensureSession, refresh]);

  /**
   * The last gate before joining: the account needs a username.
   *
   * A brand new account arrives here with `username: null`, which is what the
   * app-wide `UsernameChecker` keys on — so on a live route it puts up its
   * username-only intake over this page. Joining underneath it would file the
   * player into the lobby as "Player" with no handle, so the join waits.
   * Everything else about onboarding is deferred to their next normal page.
   */
  useEffect(() => {
    if (!awaitingProfile || authLoading) return;
    if (!isAuthenticated) {
      setJoinError("Could not start your session — try signing in again.");
      setAwaitingProfile(false);
      entering.current = false;
      return;
    }
    if (!user?.username) return;
    setAwaitingProfile(false);
    void enterRoom();
  }, [awaitingProfile, authLoading, isAuthenticated, user?.username, enterRoom]);

  const signInAndJoin = async () => {
    // Claimed before the first await: signing in flips Firebase auth, which
    // would otherwise let the effect above start a second, sessionless entry.
    if (entering.current) return;
    entering.current = true;

    void trackAnalyticsEvent({
      event: "auth_google_click",
      source: "live_join_link",
      page: "live_code",
    });

    setJoining(true);
    setJoinError(null);
    try {
      const result = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();

      const session = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!session.ok) throw new Error("Could not start your session.");

      // A brand new account needs its profile before the join API reads it
      // for the name and photo the lobby shows.
      await createUserProfile(result.user);
      void trackAnalyticsEvent({
        event: "auth_google_success",
        source: "live_join_link",
        page: "live_code",
      });

      // The provider only reacts to Firebase auth changes, which fired before
      // the session existed — so it has to be told to read the new cookie.
      await refresh();
      setAwaitingProfile(true);
    } catch (err) {
      entering.current = false;
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "auth/popup-closed-by-user"
      ) {
        setJoining(false);
        return;
      }
      setJoinError(err instanceof Error ? err.message : "Could not sign you in.");
      setJoining(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className={`${dmSans.className} min-h-screen bg-neutral-900 text-white pt-24`}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">{children}</div>
    </div>
  );

  if (loading) {
    return (
      <div className={`${dmSans.className} min-h-screen bg-neutral-900 flex items-center justify-center`}>
        <div className="w-10 h-10 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (malformed || lookupError || !room) {
    return shell(
      <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-8 text-center">
        <h1 className="text-[22px] font-[900] text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
          {malformed ? "That link isn't a join code" : "Room not found"}
        </h1>
        <p className="text-neutral-500 text-[14px] mb-6">
          {malformed
            ? `A join code is ${JOIN_CODE_LENGTH} characters, like bioblitz.net/live/ABC234.`
            : lookupError}
        </p>
        <Link
          href="/live"
          className="inline-block px-5 py-2.5 rounded-xl bg-white text-black font-bold text-[14px] hover:bg-neutral-200 transition-all"
        >
          Enter a code instead
        </Link>
      </div>,
    );
  }

  return shell(
    <>
      <div className="flex items-center gap-3 mb-6">
        <Radio className="w-5 h-5 text-neutral-500" />
        <p className="text-[13px] font-bold text-neutral-500" style={{ letterSpacing: "0.08em" }}>
          You&apos;ve been invited to a live blitz
        </p>
      </div>

      <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-6 md:p-8">
        <p className="text-[11px] font-bold text-neutral-600 mb-1" style={{ letterSpacing: "0.1em" }}>
          Room {room.code}
        </p>
        <h1 className="text-[26px] font-[900] text-white leading-tight mb-5" style={{ letterSpacing: "-0.02em" }}>
          {room.gameTitle}
        </h1>

        {room.hostUsername && (
          <div className="flex items-center gap-3 mb-6">
            <LiveAvatar name={room.hostUsername} photoURL={room.hostPhotoURL} size={36} />
            <div>
              <p className="text-[14px] font-bold text-white">{room.hostUsername}</p>
              <p className="text-[12px] text-neutral-500">Host</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-7">
          <div className="bg-[rgba(24,24,27,0.5)] border border-neutral-800 rounded-xl px-3 py-3 text-center">
            <p className="text-[18px] font-[900] text-white tabular-nums">{room.questionCount}</p>
            <p className="text-[11px] text-neutral-500">Questions</p>
          </div>
          <div className="bg-[rgba(24,24,27,0.5)] border border-neutral-800 rounded-xl px-3 py-3 text-center">
            <p className="text-[18px] font-[900] text-white tabular-nums">{room.secondsPerQuestion}s</p>
            <p className="text-[11px] text-neutral-500">Per question</p>
          </div>
          <div className="bg-[rgba(24,24,27,0.5)] border border-neutral-800 rounded-xl px-3 py-3 text-center">
            <p className="text-[18px] font-[900] text-white tabular-nums flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5 text-neutral-600" />
              {room.playerCount}
            </p>
            <p className="text-[11px] text-neutral-500">Waiting</p>
          </div>
        </div>

        {!room.open ? (
          <>
            <p className="text-[14px] text-neutral-400 text-center mb-5">{room.closedReason}</p>
            <Link
              href="/live"
              className="block w-full py-3.5 rounded-xl border border-neutral-800 text-neutral-300 font-bold text-[14px] text-center hover:bg-neutral-800 hover:text-white transition-all"
            >
              Back to Live
            </Link>
          </>
        ) : joinError && !entering.current ? (
          // Entry failed and nothing is retrying, so offer the button again
          // rather than leaving a spinner that will never resolve.
          <div className="flex justify-center">
            <GoogleButton onClick={signInAndJoin} disabled={joining} />
          </div>
        ) : signedIn === true || joining || awaitingProfile ? (
          <div className="flex items-center justify-center gap-2 py-3.5 text-neutral-400 text-[14px] font-bold">
            <Loader2 className="w-4 h-4 animate-spin" />
            {awaitingProfile && !user?.username
              ? "Finish setting up your account..."
              : signedIn === true
                ? "Taking you in..."
                : "Signing you in..."}
          </div>
        ) : (
          <>
            <p className="text-[14px] text-neutral-400 text-center mb-4">
              Log in with Google to play
            </p>
            <div className="flex justify-center">
              <GoogleButton onClick={signInAndJoin} disabled={joining} />
            </div>
          </>
        )}

        {joinError && (
          <p className="mt-4 text-[13px] text-red-400 text-center">{joinError}</p>
        )}
      </div>

      <p className="mt-5 text-[12px] text-neutral-600 leading-relaxed text-center">
        A blitz you have never played counts as a normal ranked attempt. If you
        have played it before you can still join and answer along, but as a
        ghost: no rank, no leaderboard, no change to your rating.
      </p>
    </>,
  );
}
