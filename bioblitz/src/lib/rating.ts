export interface RatingTier {
  color: string;
  label: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  ringClass: string;
}

export function getRatingTier(elo: number): RatingTier {
  if (elo >= 3000) {
    return {
      color: "red",
      label: "Grandmaster",
      textClass: "text-red-400",
      bgClass: "bg-red-500/20",
      borderClass: "border-red-500/50",
      ringClass: "ring-red-500/30",
    };
  }
  if (elo >= 2800) {
    return {
      color: "purple",
      label: "Master",
      textClass: "text-purple-400",
      bgClass: "bg-purple-500/20",
      borderClass: "border-purple-500/50",
      ringClass: "ring-purple-500/30",
    };
  }
  if (elo >= 2600) {
    return {
      color: "indigo",
      label: "Elite",
      textClass: "text-indigo-400",
      bgClass: "bg-indigo-500/20",
      borderClass: "border-indigo-500/50",
      ringClass: "ring-indigo-500/30",
    };
  }
  if (elo >= 2400) {
    return {
      color: "blue",
      label: "Diamond I",
      textClass: "text-cyan-400",
      bgClass: "bg-cyan-500/20",
      borderClass: "border-cyan-500/50",
      ringClass: "ring-cyan-500/30",
    };
  }
  if (elo >= 2250) {
    return {
      color: "cyan",
      label: "Diamond II",
      textClass: "text-cyan-300",
      bgClass: "bg-cyan-400/20",
      borderClass: "border-cyan-400/50",
      ringClass: "ring-cyan-400/30",
    };
  }
  if (elo >= 2100) {
    return {
      color: "slate",
      label: "Platinum I",
      textClass: "text-neutral-300",
      bgClass: "bg-neutral-500/20",
      borderClass: "border-neutral-500/50",
      ringClass: "ring-neutral-500/30",
    };
  }
  if (elo >= 1950) {
    return {
      color: "neutral",
      label: "Platinum II",
      textClass: "text-neutral-400",
      bgClass: "bg-neutral-500/20",
      borderClass: "border-neutral-500/50",
      ringClass: "ring-neutral-500/30",
    };
  }
  if (elo >= 1750) {
    return {
      color: "neutral",
      label: "Platinum III",
      textClass: "text-neutral-500",
      bgClass: "bg-neutral-500/10",
      borderClass: "border-neutral-500/30",
      ringClass: "ring-neutral-500/20",
    };
  }
  if (elo >= 1600) {
    return {
      color: "yellow",
      label: "Gold I",
      textClass: "text-yellow-300",
      bgClass: "bg-yellow-500/20",
      borderClass: "border-yellow-500/50",
      ringClass: "ring-yellow-500/30",
    };
  }
  if (elo >= 1450) {
    return {
      color: "yellow",
      label: "Gold II",
      textClass: "text-yellow-400",
      bgClass: "bg-yellow-500/20",
      borderClass: "border-yellow-500/50",
      ringClass: "ring-yellow-500/30",
    };
  }
  if (elo >= 1250) {
    return {
      color: "yellow",
      label: "Gold III",
      textClass: "text-yellow-500",
      bgClass: "bg-yellow-500/10",
      borderClass: "border-yellow-500/30",
      ringClass: "ring-yellow-500/20",
    };
  }
  if (elo >= 1100) {
    return {
      color: "zinc",
      label: "Silver I",
      textClass: "text-zinc-200",
      bgClass: "bg-zinc-400/20",
      borderClass: "border-zinc-400/50",
      ringClass: "ring-zinc-400/30",
    };
  }
  if (elo >= 950) {
    return {
      color: "zinc",
      label: "Silver II",
      textClass: "text-zinc-300",
      bgClass: "bg-zinc-400/20",
      borderClass: "border-zinc-400/50",
      ringClass: "ring-zinc-400/30",
    };
  }
  if (elo >= 750) {
    return {
      color: "zinc",
      label: "Silver III",
      textClass: "text-zinc-400",
      bgClass: "bg-zinc-400/10",
      borderClass: "border-zinc-400/30",
      ringClass: "ring-zinc-400/20",
    };
  }
  if (elo >= 600) {
    return {
      color: "orange",
      label: "Bronze I",
      textClass: "text-orange-300",
      bgClass: "bg-orange-700/20",
      borderClass: "border-orange-700/50",
      ringClass: "ring-orange-700/30",
    };
  }
  if (elo >= 450) {
    return {
      color: "orange",
      label: "Bronze II",
      textClass: "text-orange-400",
      bgClass: "bg-orange-700/20",
      borderClass: "border-orange-700/50",
      ringClass: "ring-orange-700/30",
    };
  }
  return {
    color: "orange",
    label: "Bronze III",
    textClass: "text-orange-500",
    bgClass: "bg-orange-700/10",
    borderClass: "border-orange-700/30",
    ringClass: "ring-orange-700/20",
  };
}
