import { UserProfile } from "@/types";
import { Pencil, MapPin, School, GraduationCap, Calendar, Flag } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ProfileHeaderProps {
  userProfile: UserProfile;
  isOwnProfile: boolean;
  pfpLoading: boolean;
  onEditClick: () => void;
  onImageClick: () => void;
  onReportClick?: () => void;
}

export default function ProfileHeader({
  userProfile,
  isOwnProfile,
  pfpLoading,
  onEditClick,
  onImageClick,
  onReportClick,
}: ProfileHeaderProps) {
  const [imgError, setImgError] = useState(false);
  const memberSince = userProfile.createdAt
    ? new Date(userProfile.createdAt.toMillis()).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="relative bg-gradient-to-b from-neutral-900/20 to-transparent border-b border-zinc-900 pb-8">
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
          <div className="relative group">
            <div
              className={`w-32 h-32 rounded-full ring-4 ring-neutral-500/20 overflow-hidden bg-zinc-900 ${
                pfpLoading ? "opacity-50" : ""
              }`}
            >
              {userProfile.photoURL && !imgError ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-full h-full object-cover"

                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-600 to-purple-600 text-white text-4xl font-bold">
                  {userProfile.displayName?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={onImageClick}
                disabled={pfpLoading}
                className="absolute bottom-0 right-0 p-2.5 bg-neutral-600 rounded-full text-white hover:bg-neutral-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-1">
                  {userProfile.username || userProfile.displayName}
                </h1>
              </div>
              <div className="flex gap-2">
                {isOwnProfile && (
                  <button
                    onClick={onEditClick}
                    className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-2 border border-zinc-800"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
                {!isOwnProfile && onReportClick && (
                  <button
                    onClick={onReportClick}
                    className="px-4 py-2 bg-zinc-900 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2 border border-zinc-800"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {userProfile.bio && (
              <p className="text-zinc-400 mt-4 max-w-2xl leading-relaxed whitespace-pre-wrap">
                {userProfile.bio}
              </p>
            )}

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-zinc-500">
              {userProfile.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{userProfile.location}</span>
                </div>
              )}
              {userProfile.school && (
                <div className="flex items-center gap-1.5">
                  <School className="w-4 h-4" />
                  <span>{userProfile.school}</span>
                </div>
              )}
              {userProfile.grade && (
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  <span>{userProfile.grade}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Joined {memberSince}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
