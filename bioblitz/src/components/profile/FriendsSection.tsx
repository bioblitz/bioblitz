import { UserProfile } from "@/types";
import Link from "next/link";
import { Users, ChevronRight, UserIcon } from "lucide-react";

interface FriendsSectionProps {
  friends: UserProfile[];
  incomingRequests: UserProfile[];
  loadingFriends: boolean;
  isOwnProfile: boolean;
}

export default function FriendsSection({
  friends,
  incomingRequests,
  loadingFriends,
  isOwnProfile,
}: FriendsSectionProps) {
  if (!isOwnProfile && friends.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">Friends</h3>
          {friends.length > 0 && (
            <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs font-bold rounded-full">
              {friends.length}
            </span>
          )}
        </div>
        <Users className="w-5 h-5 text-violet-500" />
      </div>

      {loadingFriends ? (
        <div className="py-8 text-center text-zinc-600">Loading...</div>
      ) : (
        <>
          {isOwnProfile && incomingRequests.length > 0 && (
            <div className="mb-4 p-3 bg-violet-950/30 border border-violet-500/30 rounded-xl">
              <p className="text-sm text-violet-400 font-medium mb-2">
                Pending Requests ({incomingRequests.length})
              </p>
              <div className="space-y-2">
                {incomingRequests.slice(0, 3).map((req) => (
                  <div
                    key={req.uid}
                    className="flex items-center justify-between text-sm"
                  >
                    <Link
                      href={`/profile/${req.username}`}
                      className="text-white hover:text-violet-400 transition-colors"
                    >
                      {req.displayName}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {friends.length === 0 ? (
            <div className="py-8 text-center text-zinc-600">
              {isOwnProfile ? "No friends yet" : "No friends to show"}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {friends.slice(0, 5).map((friend) => (
                <Link
                  key={friend.uid}
                  href={`/profile/${friend.username}`}
                  className="flex items-center gap-3 p-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors group"
                >
                  {friend.photoURL ? (
                    <div className="relative w-10 h-10">
                      <img
                        src={friend.photoURL}
                        alt={friend.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                      <div className="hidden absolute inset-0 w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold">
                        {friend.displayName?.[0]?.toUpperCase() || "?"}
                      </div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold">
                      {friend.displayName?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {friend.displayName}
                    </p>
                    <p className="text-xs text-zinc-500">@{friend.username}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                </Link>
              ))}
              {friends.length > 5 && (
                <p className="text-center text-sm text-zinc-500 mt-2">
                  +{friends.length - 5} more
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
