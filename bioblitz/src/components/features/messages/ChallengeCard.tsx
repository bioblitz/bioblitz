"use client";

import { useEffect, useState } from "react";
import { Message } from "@/lib/chatStore";
import { Challenge } from "@/lib/challenges";
import { subscribeToChallenge } from "@/lib/messages";
import { Loader2 } from "lucide-react";
import ChallengeInviteCard from "./ChallengeInviteCard";
import ChallengeResultCard from "./ChallengeResultCard";

interface ChallengeCardProps {
  message: Message;
  currentUserId: string;
  isMine: boolean;
}

export default function ChallengeCard({
  message,
  currentUserId,
  isMine,
}: ChallengeCardProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!message.challengeId) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToChallenge(message.challengeId, (c) => {
      setChallenge(c);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [message.challengeId]);

  if (loading) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mt-2`}>
        <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 text-neutral-500 animate-spin" />
          <span className="text-xs text-neutral-500">Loading challenge...</span>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mt-2`}>
        <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-neutral-900/50 border border-neutral-800 text-xs text-neutral-500 italic">
          Challenge unavailable
        </div>
      </div>
    );
  }

  if (message.type === "challenge_result") {
    return (
      <ChallengeResultCard
        challenge={challenge}
        currentUserId={currentUserId}
      />
    );
  }

  return (
    <ChallengeInviteCard challenge={challenge} currentUserId={currentUserId} />
  );
}
