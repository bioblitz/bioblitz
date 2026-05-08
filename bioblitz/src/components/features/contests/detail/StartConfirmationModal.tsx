import { motion } from "framer-motion";
import { ArrowUpRight, Clock } from "lucide-react";

interface StartConfirmationModalProps {
  setShowStartConfirmation: (show: boolean) => void;
  proceedToGame: () => void;
}

export default function StartConfirmationModal({
  setShowStartConfirmation,
  proceedToGame,
}: StartConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/80 backdrop-blur-sm transition-all">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-neutral-950 border border-neutral-800 p-8 rounded-3xl max-w-md w-full relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-neutral-500/10 blur-[80px] pointer-events-none" />

        <div className="flex flex-col relative z-10">
          <h2 className="text-2xl font-bold text-white mb-6">Ready to begin?</h2>

          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
            <p className="text-neutral-400 text-sm">The timer keeps running even if you exit.</p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={proceedToGame}
              className="flex-1 py-3.5 rounded-xl font-bold bg-neutral-600 text-white hover:bg-neutral-500 shadow-lg shadow-neutral-900/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
            >
              Start Blitz <ArrowUpRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowStartConfirmation(false)}
              className="flex-1 py-3.5 rounded-xl font-bold text-neutral-400 hover:bg-neutral-900 hover:text-white border border-transparent hover:border-neutral-800 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
