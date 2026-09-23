import { motion } from "framer-motion";
import { X, AlertTriangle, ChevronRight, CheckCircle, Loader2 } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  reportCategory: string;
  reportDescription: string;
  isSubmitting: boolean;
  success: boolean;
  categories?: string[];
  onClose: () => void;
  onCategoryChange: (category: string) => void;
  onDescriptionChange: (description: string) => void;
  onSubmit: () => void;
}

const REPORT_CATEGORIES = [
  "Inappropriate Content",
  "Harassment/Bullying",
  "Spam or Bot",
  "Impersonation",
  "Other",
];

export default function ReportModal({
  isOpen,
  reportCategory,
  reportDescription,
  isSubmitting,
  success,
  categories,
  onClose,
  onCategoryChange,
  onDescriptionChange,
  onSubmit,
}: ReportModalProps) {
  if (!isOpen) return null;

  const categoryOptions = categories && categories.length > 0 ? categories : REPORT_CATEGORIES;

  return (
    <div className="fixed inset-0 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-neutral-950 border border-neutral-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 blur-[60px] pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-500 hover:text-white bg-neutral-900 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Report Submitted</h2>
              <p className="text-neutral-400 text-sm mt-1">
                Thank you for helping keep the community safe.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Report User</h2>
                <p className="text-neutral-500 text-sm">
                  We take reports seriously. Please provide details.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-500 tracking-wider mb-2 block">
                  Reason
                </label>
                <div className="relative">
                  <select
                    value={reportCategory}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    className="w-full appearance-none bg-neutral-900 text-white p-3 pr-10 rounded-xl border border-neutral-800 focus:border-red-500/50 focus:outline-none transition-colors"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3.5 pointer-events-none text-neutral-500">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-500 tracking-wider mb-2 block">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={reportDescription}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder="Please describe the violation..."
                  className="w-full bg-neutral-900 text-white p-3 rounded-xl border border-neutral-800 focus:border-red-500/50 focus:outline-none transition-colors resize-none placeholder:text-neutral-700"
                />
              </div>

              <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Submit Report"
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
