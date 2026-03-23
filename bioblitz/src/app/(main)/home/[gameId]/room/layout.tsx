// src/app/home/[gameId]/layout.tsx
export default function GameRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-neutral-900 text-white min-h-screen">{children}</div>;
}
