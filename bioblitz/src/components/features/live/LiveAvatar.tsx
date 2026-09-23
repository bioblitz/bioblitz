"use client";

/**
 * Round player avatar with an initial fallback, sized for wherever it lands
 * (lobby grid, standings row, podium).
 */
export default function LiveAvatar({
  name,
  photoURL,
  size = 40,
  className ="",
}: {
  name: string;
  photoURL?: string;
  size?: number;
  className?: string;
}) {
  const initial = (name || "?").charAt(0).toUpperCase();

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover bg-neutral-800 shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center justify-center font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </div>
  );
}
