export default function Loading() {
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
      <span className="text-neutral-400 text-sm font-medium">Loading...</span>
    </div>
  );
}
