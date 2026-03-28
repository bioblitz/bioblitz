import Link from "next/link";
import { Info, Loader2 } from "lucide-react";

interface UserProfileLite {
  uid: string;
  displayName: string;
  username: string | null;
  email: string;
  photoURL: string;
  bElo: number;
  bio: string;
  createdAt: any;
  location: string;
  grade?: string;
  school?: string;
  streak?: number;
}

interface ProfileFriendsPanelProps {
  loadingFriends: boolean;
  friends: UserProfileLite[];
  incomingRequests: UserProfileLite[];
  isOwnProfile: boolean;
  friendUsernameInput: string;
  onFriendUsernameInputChange: (value: string) => void;
  onAddFriendByUsername: () => void;
  onAcceptIncomingRequest: (request: UserProfileLite) => void;
  onDeclineIncomingRequest: (request: UserProfileLite) => void;
  profilePathFor: (u: Pick<UserProfileLite, "uid" | "username">) => string;
}

export default function ProfileFriendsPanel({
  loadingFriends,
  friends,
  incomingRequests,
  isOwnProfile,
  friendUsernameInput,
  onFriendUsernameInputChange,
  onAddFriendByUsername,
  onAcceptIncomingRequest,
  onDeclineIncomingRequest,
  profilePathFor,
}: ProfileFriendsPanelProps) {
  return (
    <div className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl h-[42rem]">
      <div className="h-px w-full bg-zinc-800/50 shrink-0" />
      <h3 className="text-lg font-semibold text-white shrink-0">Friends</h3>
      <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-2 [scrollbar-width:thin] [scrollbar-color:#8b5cf6_transparent] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-500/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:h-0 [&::-webkit-scrollbar-button]:w-0">
        {loadingFriends ? (
          <div className="flex flex-col items-center justify-center py-6 text-zinc-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            <span className="text-sm animate-pulse">Loading friends...</span>
          </div>
        ) : friends.length === 0 ? (
          <p className="text-zinc-400 text-sm">No friends yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((friend) => (
              <Link
                key={friend.uid}
                href={profilePathFor(friend)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800 transition"
              >
                {friend.photoURL ? (
                  <img
                    src={friend.photoURL}
                    alt={friend.displayName}
                    className="w-8 h-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = "/images/logo.svg";
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-900/50 flex items-center justify-center text-xs text-neutral-300 font-bold">
                    {friend.displayName?.[0]}
                  </div>
                )}
                <span className="text-sm text-white">{friend.username || friend.displayName}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isOwnProfile && (
        <div className="bg-zinc-950/50 backdrop-blur-sm rounded-3xl p-0 flex flex-col gap-4 shadow-xl">
          <div className="h-px bg-zinc-800 w-full mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Friend Requests</h3>

          {loadingFriends ? (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
            </div>
          ) : incomingRequests.length === 0 ? (
            <p className="text-zinc-400 text-sm">No incoming requests.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:#8b5cf6_transparent] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-500/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-500  [&::-webkit-scrollbar-button]:h-0 [&::-webkit-scrollbar-button]:w-0 [&::-webkit-scrollbar-corner]:bg-transparent">
              {incomingRequests.map((request) => (
                <div
                  key={request.uid}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800 transition"
                >
                  <div className="flex items-center gap-3">
                    {request.photoURL ? (
                      <img
                        src={request.photoURL}
                        alt={request.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = "/images/logo.svg";
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-900/50 flex items-center justify-center text-xs text-neutral-300 font-bold">
                        {request.displayName?.[0]}
                      </div>
                    )}
                    <span className="text-sm text-white">{request.username || request.displayName}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAcceptIncomingRequest(request)}
                      className="px-3 py-1 bg-green-600 rounded-full text-white text-sm hover:bg-green-500"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onDeclineIncomingRequest(request)}
                      className="px-3 py-1 bg-zinc-800 rounded-full text-zinc-400 text-sm hover:text-white"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col gap-3">
            <div className="flex gap-2 items-center">
              <div className="relative shrink-0 group">
                <Info className="w-4 h-4 text-indigo-300 cursor-default" />
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 text-xs text-white bg-zinc-900 rounded-md border border-zinc-800 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100">
                  Ask for their Username
                </span>
              </div>

              <input
                type="text"
                placeholder="Enter Username to Add"
                value={friendUsernameInput}
                onChange={(e) => onFriendUsernameInputChange(e.target.value)}
                className="flex-1 bg-indigo-500/10 text-white text-sm p-2.5 rounded-xl border border-indigo-500/30 focus:border-indigo-500 focus:outline-none placeholder:text-indigo-200/50 transition-colors"
              />
              <button
                onClick={onAddFriendByUsername}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-500 transition-colors font-semibold whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}