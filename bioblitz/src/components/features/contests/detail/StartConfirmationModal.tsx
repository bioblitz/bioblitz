import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight } from "lucide-react";

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
        className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-neutral-500/10 blur-[80px] pointer-events-none" />

        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-yellow-500/20">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">Ready to Begin?</h2>

          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            The <span className="text-white font-bold">timer will start immediately</span> once you confirm.
            <br />
            <br />
            <span className="inline-flex items-center gap-2 text-yellow-500/90 font-medium bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/10">
              <AlertTriangle className="w-3 h-3" />
              The timer keeps running even if you exit!
            </span>
          </p>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowStartConfirmation(false)}
              className="flex-1 py-3.5 rounded-xl font-bold text-zinc-400 hover:bg-zinc-900 hover:text-white border border-transparent hover:border-zinc-800 transition-all"
            >
              Cancel
            </button>

            <button
              onClick={proceedToGame}
              className="flex-1 py-3.5 rounded-xl font-bold bg-neutral-600 text-white hover:bg-neutral-500 shadow-lg shadow-neutral-900/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
            >
              Begin Blitz <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
