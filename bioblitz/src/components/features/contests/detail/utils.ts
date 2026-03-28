import { Timestamp } from "firebase/firestore";

export const formatTimePlayed = (seconds: number) => {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

export const formatQuestionTime = (ms: number) => {
  if (!ms || ms < 1000) return "<1s";
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

export const formatCountdown = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};
