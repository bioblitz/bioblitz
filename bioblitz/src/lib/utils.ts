import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeout: NodeJS.Timeout | null;

  return ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, delay);
  }) as T;
}

export const TOPIC_SHORT_LABELS: Record<string, string> = {
  "Anatomy & Physiology": "Anat & Phys",
  "Cell Biology": "Cell Bio",
  "Plant Biology": "Plant Bio",
  "Genetics & Evolution": "Gen & Evo",
  "Genetics": "Gen & Evo",
  "Biosystematics": "Biosys",
  "Ecology": "Ecology",
  "Ethology": "Ethology",
  "Multiple": "Multiple",
};

export const getTopicShortLabel = (topic: string | undefined): string =>
  topic ? (TOPIC_SHORT_LABELS[topic] ?? topic) : "";

export const getTopicColors = (topic: string | undefined) => {
  switch (topic) {
    case "Anatomy & Physiology":
    case "Anat & Phys":
      return { bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", shadow: "hover:shadow-blue-500/10 hover:border-blue-500/50", badge: "bg-blue-500 text-white" };
    case "Cell Biology":
    case "Cell Bio":
      return { bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", shadow: "hover:shadow-cyan-500/10 hover:border-cyan-500/50", badge: "bg-cyan-500 text-white" };
    case "Plant Biology":
    case "Plant Bio":
      return { bg: "bg-green-500/10 text-green-400 border-green-500/20", shadow: "hover:shadow-green-500/10 hover:border-green-500/50", badge: "bg-green-600 text-white" };
    case "Genetics & Evolution":
    case "Gen & Evo":
    case "Genetics":
      return { bg: "bg-lime-500/10 text-lime-400 border-lime-500/20", shadow: "hover:shadow-lime-500/10 hover:border-lime-500/50", badge: "bg-lime-600 text-white" };
    case "Biosystematics":
    case "Biosys":
      return { bg: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20", shadow: "hover:shadow-neutral-500/10 hover:border-neutral-500/50", badge: "bg-neutral-600 text-white" };
    case "Ecology":
      return { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", shadow: "hover:shadow-emerald-500/10 hover:border-emerald-500/50", badge: "bg-emerald-600 text-white" };
    case "Ethology":
      return { bg: "bg-orange-500/10 text-orange-400 border-orange-500/20", shadow: "hover:shadow-orange-500/10 hover:border-orange-500/50", badge: "bg-orange-600 text-white" };
    case "Multiple":
      return { bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", shadow: "hover:shadow-yellow-500/10 hover:border-yellow-500/50", badge: "bg-yellow-600 text-white" };
    default:
      return { bg: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", shadow: "hover:shadow-zinc-500/10 hover:border-zinc-500/50", badge: "bg-zinc-600 text-white" };
  }
};

