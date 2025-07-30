// src/app/home/[gameId]/layout.tsx
export default function GameRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-black text-white min-h-screen">{children}</div>;
}
