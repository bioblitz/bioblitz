import { motion } from "framer-motion";
import { X, Save, Pencil, MapPin, School, GraduationCap, UserIcon } from "lucide-react";

interface EditProfileModalProps {
  isOpen: boolean;
  tempProfile: {
    bio: string;
    location: string;
    grade: string;
    school: string;
    displayName: string;
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
        className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-neutral-500/5 blur-[60px] pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-zinc-900 rounded-full transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-neutral-500/10 flex items-center justify-center shrink-0">
              <Pencil className="w-6 h-6 text-neutral-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
              <p className="text-zinc-500 text-sm">Update your profile information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-5 h-5 text-zinc-600" />
                <input
                  type="text"
                  value={tempProfile.displayName}
                  onChange={(e) => onChange("displayName", e.target.value)}
                  className="w-full bg-zinc-900 text-white p-2.5 pl-10 rounded-xl border border-zinc-800 focus:border-neutral-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-zinc-600">@</span>
                <input
                  type="text"
                  value={tempProfile.username}
                  onChange={(e) => onChange("username", e.target.value)}
                  className="w-full bg-zinc-900 text-white p-2.5 pl-8 rounded-xl border border-zinc-800 focus:border-neutral-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                Bio
              </label>
              <textarea
                value={tempProfile.bio}
                onChange={(e) => onChange("bio", e.target.value)}
                rows={3}
                className="w-full bg-zinc-900 text-white p-3 rounded-xl border border-zinc-800 focus:border-neutral-500 focus:outline-none transition-colors resize-none placeholder:text-zinc-600"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-zinc-600" />
                  <input
                    type="text"
                    value={tempProfile.location}
                    onChange={(e) => onChange("location", e.target.value)}
                    className="w-full bg-zinc-900 text-white p-2.5 pl-10 rounded-xl border border-zinc-800 focus:border-neutral-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                  Grade
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-3 w-5 h-5 text-zinc-600" />
                  <input
                    type="text"
                    value={tempProfile.grade}
                    onChange={(e) => onChange("grade", e.target.value)}
                    className="w-full bg-zinc-900 text-white p-2.5 pl-10 rounded-xl border border-zinc-800 focus:border-neutral-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                  School
                </label>
                <div className="relative">
                  <School className="absolute left-3 top-3 w-5 h-5 text-zinc-600" />
                  <input
                    type="text"
                    value={tempProfile.school}
                    onChange={(e) => onChange("school", e.target.value)}
                    className="w-full bg-zinc-900 text-white p-2.5 pl-10 rounded-xl border border-zinc-800 focus:border-neutral-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {editError && <p className="text-red-500 text-sm mt-4">{editError}</p>}

          <div className="flex gap-3 mt-8 pt-4 border-t border-zinc-900">
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
