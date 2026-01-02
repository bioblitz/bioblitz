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

export const getTopicColors = (topic: string | undefined) => {
  switch (topic) {
    case "Animal":
      return {
        bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        shadow: "hover:shadow-blue-500/10 hover:border-blue-500/50",
        badge: "bg-blue-500 text-white",
      };
    case "Cell Bio":
      return {
        bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        shadow: "hover:shadow-cyan-500/10 hover:border-cyan-500/50",
        badge: "bg-cyan-500 text-white",
      };
    case "Biochem":
      return {
        bg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
        shadow: "hover:shadow-teal-500/10 hover:border-teal-500/50",
        badge: "bg-teal-600 text-white",
      };
    case "Genetics":
      return {
        bg: "bg-lime-500/10 text-lime-400 border-lime-500/20",
        shadow: "hover:shadow-lime-500/10 hover:border-lime-500/50",
        badge: "bg-lime-600 text-white",
      };
    case "Plants":
      return {
        bg: "bg-green-500/10 text-green-400 border-green-500/20",
        shadow: "hover:shadow-green-500/10 hover:border-green-500/50",
        badge: "bg-green-600 text-white",
      };
    default:
      return {
        bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        shadow: "hover:shadow-yellow-500/10 hover:border-yellow-500/50",
        badge: "bg-yellow-600 text-white",
      };
  }
};

