export default function Loading() {
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-[3px] border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      <span className="text-yellow-400 text-sm font-medium">Loading...</span>
    </div>
  );
}
