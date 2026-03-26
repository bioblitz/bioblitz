import { Pencil, MapPin, School, GraduationCap, Calendar, Flame, X, Flag, Hammer, ShieldUser } from "lucide-react";

type FriendshipStatus = "none" | "sent" | "received" | "friends";

interface UserProfileLite {
  uid: string;
  displayName: string;
  username: string | null;
  email: string;
  photoURL: string;
  bio: string;
  location: string;
  school?: string;
  grade?: string;
  streak?: number;
  createdAt?: { seconds: number };
  roles?: string[];
}

interface ProfileHeroCardProps {
  userProfile: UserProfileLite | null;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  friendshipStatus: FriendshipStatus;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenAuth: () => void;
  onSendFriendRequest: () => void;
  onAcceptFriendRequest: () => void;
  onDeclineFriendRequest: () => void;
  onRemoveFriend: () => void;
  onEditProfile: () => void;
  onOpenReport: () => void;
}

export default function ProfileHeroCard({
  userProfile,
  isOwnProfile,
  isAuthenticated,
  friendshipStatus,
  fileInputRef,
  onFileChange,
  onOpenAuth,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onRemoveFriend,
  onEditProfile,
  onOpenReport,
}: ProfileHeroCardProps) {
  return (
    <div className="lg:col-span-2 bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-3xl p-8 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-xl">
      <div className="relative group shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileChange}
          accept="image/*"
          className="hidden"
          disabled={!isOwnProfile}
        />
        <div
          className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-zinc-700 relative ${
            isOwnProfile ? "cursor-pointer" : ""
          }`}
          onClick={() => isOwnProfile && fileInputRef.current?.click()}
        >
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt="Profile"
              className="w-full h-full object-cover group-hover:opacity-50 transition-all duration-300"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = "/images/logo.svg";
              }}
            />
          ) : (
            <div className="w-full h-full bg-neutral-900/30 flex items-center justify-center text-neutral-400 text-4xl font-bold group-hover:bg-neutral-900/50 transition-colors">
              {userProfile?.displayName?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          {isOwnProfile && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Pencil className="w-8 h-8 text-white" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 text-center md:text-left space-y-4 w-full">
        {!isOwnProfile && (
          <div className="mt-4">
            {!isAuthenticated ? (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 bg-neutral-600/40 border border-neutral-600/40 rounded-full text-white font-semibold hover:bg-neutral-800/40 transition"
              >
                Sign In to Add Friend
              </button>
            ) : (
              <>
                {friendshipStatus === "none" && (
                  <button
                    onClick={onSendFriendRequest}
                    className="px-4 py-2 bg-neutral-600 rounded-full text-white font-semibold hover:bg-neutral-500 transition"
                  >
                    Add Friend
                  </button>
                )}
                {friendshipStatus === "sent" && (
                  <span className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-400 cursor-default">
                    Request Sent
                  </span>
                )}
                {friendshipStatus === "received" && (
                  <div className="flex gap-2">
                    <button
                      onClick={onAcceptFriendRequest}
                      className="px-4 py-2 bg-green-600 rounded-full text-white font-semibold hover:bg-green-500 transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={onDeclineFriendRequest}
                      className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-400 hover:text-white transition"
                    >
                      Decline
                    </button>
                  </div>
                )}
                {friendshipStatus === "friends" && (
                  <div className="flex items-center gap-2">
                    <span className="px-4 py-2 bg-green-900/30 border border-green-600/50 rounded-full text-green-400 cursor-default font-medium">
                      Friends
                    </span>
                    <button
                      onClick={onRemoveFriend}
                      className="p-2 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-400 hover:text-red-400 hover:border-red-900/50 hover:bg-red-900/10 transition-colors"
                      title="Remove Friend"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              {userProfile?.displayName || userProfile?.username}
            </h1>
            {isOwnProfile && (
              <p className="text-zinc-500 text-sm mt-1 font-mono">{userProfile?.email}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(userProfile?.roles?.includes("staff") || userProfile?.roles?.includes("admin")) && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold tracking-widest border border-emerald-500/40 text-emerald-100">
                <ShieldUser className="w-4 h-4 text-emerald-200"/>
                Staff
              </span>
            )}
            {userProfile?.roles?.includes("admin") && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold tracking-widest border border-amber-500/40 text-amber-100">
                <Hammer className="w-3 h-3 text-amber-200" />
                Developer
              </span>
            )}
            {isOwnProfile ? (
              <button
                onClick={onEditProfile}
                className="px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-neutral-500/50 hover:bg-zinc-800 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 group"
              >
                <Pencil className="w-3 h-3 group-hover:text-neutral-400" />
                Edit Profile
              </button>
            ) : (
              isAuthenticated && (
                <button
                  onClick={onOpenReport}
                  className="px-4 py-2 bg-zinc-900/30 border border-zinc-800 hover:bg-red-900/10 hover:border-red-500/30 hover:text-red-400 text-zinc-500 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2"
                  title="Report User"
                >
                  <Flag className="w-3 h-3" />
                  Report
                </button>
              )
            )}
          </div>
        </div>

        {(isOwnProfile || userProfile?.bio) && (
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <p className="text-zinc-300 leading-relaxed italic">
              {userProfile?.bio || "Add a biography!"}
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-center md:justify-start gap-3">
          {userProfile?.location && (
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
              <MapPin className="w-3 h-3 text-neutral-400" />
              {userProfile.location}
            </div>
          )}
          {userProfile?.school && (
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
              <School className="w-3 h-3 text-neutral-400" />
              {userProfile.school}
            </div>
          )}
          {userProfile?.grade && (
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
              <GraduationCap className="w-3 h-3 text-neutral-400" />
              {userProfile.grade}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
            <Calendar className="w-3 h-3 text-neutral-400" />
            Joined{" "}
            {userProfile?.createdAt
              ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })
              : "Unknown"}
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
            <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
            Streak: {userProfile?.streak || 0}
          </div>
        </div>
      </div>
    </div>
  );
}