import { motion } from "framer-motion";
import { X, Save } from "lucide-react";

interface EditProfileModalProps {
  isOpen: boolean;
  tempProfile: {
    bio: string;
    username: string;
  };
  editError: string | null;
  onClose: () => void;
  onSave: () => void;
  onChange: (field: string, value: string) => void;
}

export default function EditProfileModal({
  isOpen,
  tempProfile,
  editError,
  onClose,
  onSave,
  onChange,
}: EditProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-neutral-950 border border-neutral-800 rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-neutral-500/5 blur-[60px] pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-500 hover:text-white bg-neutral-900 rounded-full transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative">
          <h2 className="text-2xl font-bold text-white mb-6">Edit Profile</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-neutral-500 mb-2 block">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-neutral-600">@</span>
                <input
                  type="text"
                  value={tempProfile.username}
                  onChange={(e) => onChange("username", e.target.value)}
                  className="w-full bg-neutral-900 text-white p-2.5 pl-8 rounded-xl border border-neutral-800 focus:border-neutral-500 focus:outline-none transition-colors placeholder:text-neutral-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-500 mb-2 block">
                Bio
              </label>
              <textarea
                value={tempProfile.bio}
                onChange={(e) => onChange("bio", e.target.value)}
                rows={3}
                className="w-full bg-neutral-900 text-white p-3 rounded-xl border border-neutral-800 focus:border-neutral-500 focus:outline-none transition-colors resize-none placeholder:text-neutral-600"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          {editError && <p className="text-red-500 text-sm mt-4">{editError}</p>}

          <div className="flex gap-3 mt-8 pt-4 border-t border-neutral-900">
            <button
              onClick={onSave}
              className="flex-1 bg-neutral-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-neutral-500 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
