"use client";

/**
 * The countdown ring from the solo blitz room, shrunk for the live screens.
 * Turns amber then red as the last seconds of an answering phase run out.
 */
export default function PhaseClock({
  remainingSeconds,
  totalSeconds,
  label,
  size = 132,
  urgent = false,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  label: string;
  size?: number;
  urgent?: boolean;
}) {
  const strokeWidth = Math.max(8, Math.round(size * 0.1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction =
    totalSeconds > 0 ? Math.min(1, Math.max(0, remainingSeconds / totalSeconds)) : 0;

  const stroke =
    urgent && remainingSeconds <= 3
      ? "#f87171"
      : urgent && remainingSeconds <= 10
        ? "#fbbf24"
        : "#ededed";

  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <svg height={size} width={size} className="transform -rotate-90">
        <circle
          stroke="#18181b"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={stroke}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: "stroke-dashoffset 120ms linear, stroke 300ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-[900] text-white tabular-nums leading-none"
          style={{ fontSize: Math.round(size * 0.28) }}
        >
          {Math.ceil(remainingSeconds)}
        </span>
        <span
          className="text-neutral-500 font-medium mt-1"
          style={{ fontSize: Math.max(9, Math.round(size * 0.075)), letterSpacing: "0.06em" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
