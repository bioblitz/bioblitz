"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon, HelpCircle, Clock, Star, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import { uploadImage } from "../../../../lib/storage";
import { updateUserBanner, getUserProfileByUsername, UserProfile } from "../../../../lib/user";
import { getContestsByCreator } from "../../../../lib/actions";
import { gameRoom } from "@/types";
import { getTopicColors } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';


export default function ChannelPage() {
  const { username } = useParams<{ username: string }>();
  const { user: authUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [channelOwnerProfile, setChannelOwnerProfile] = useState<UserProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [userContests, setUserContests] = useState<gameRoom[]>([]);
  
  const handleBannerUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && authUser) {
      setBannerLoading(true);
      try {
        const filePath = `userBanners/${authUser.uid}/${file.name}`;
        const downloadURL = await uploadImage(file, filePath);
        await updateUserBanner(authUser.uid, downloadURL);
        
        setChannelOwnerProfile(prevProfile => {
          if (prevProfile) {
            return { ...prevProfile, bannerURL: downloadURL };
          }
          return null;
        });
      } catch (error) {
        console.error("Error uploading banner image:", error);
      } finally {
        setBannerLoading(false);
      }
    }
  };
  
  
  useEffect(() => {
    async function fetchChannelOwnerAndContests() {
      if (!username) {
        router.push('/404');
        return;
      }
      setLoading(true);
      const profile = await getUserProfileByUsername(username as string);
      if (profile) {
        setChannelOwnerProfile(profile);
        setIsOwner(authUser?.uid === profile.uid);
        
        // Fetch contests for this user
        const contests = await getContestsByCreator(profile.uid);
        setUserContests(contests);

      } else {
        console.error("Channel owner profile not found for username:", username);
        setChannelOwnerProfile(null);
        setIsOwner(false);
        router.push('/404');
      }
      setLoading(false);
    }
    fetchChannelOwnerAndContests();
  }, [username, authUser?.uid, router]);

  const handleCreateNewContest = () => {
    const newContestId = uuidv4();
    router.push(`/contests/create/${newContestId}`);
  };

  return (

    <div className="bg-black justify-center h-screen pt-16 text-white">
    <div className ="w-11/12 mx-auto">

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      {loading ? (
        <div className="h-48 bg-zinc-800 flex items-center justify-center animate-pulse">
          <p>Loading channel...</p>
        </div>
      ) : (
        <div
          className="relative h-48 bg-cover bg-center flex items-center justify-center"
          style={{
            backgroundImage: channelOwnerProfile?.bannerURL 
            ? `url(${channelOwnerProfile.bannerURL})` 
            : `linear-gradient(to bottom, #18181b, #000000)`
          }}
        >
          {isOwner && (
            <button
              onClick={handleBannerUploadClick}
              className="absolute bottom-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
              aria-label="Edit banner"
              disabled={bannerLoading}
            >
              {bannerLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <PencilIcon className="w-5 h-5 text-white" />
              )}
            </button>
          )}
          {!channelOwnerProfile?.bannerURL && !isOwner && (
            <p className="text-white text-lg">No banner set</p>
          )}
        </div>
      )}
      
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{channelOwnerProfile?.username || channelOwnerProfile?.displayName}'s Channel</h1>
        {isOwner && (
            <button 
                onClick={handleCreateNewContest}
                className="px-4 py-2 bg-black-600 hover:bg-neutral-700 text-white rounded-md flex items-center gap-2"
            >
                <PlusIcon className="w-5 h-5" />
                Create New Contest
            </button>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">My Contests</h2>
        {userContests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {userContests.map((game) => {
              const theme = getTopicColors(game.topic);
              const isCreator = game.creator === authUser?.uid; // Check if the logged-in user is the creator

              return (
                <Link
                  key={game.id}
                  href={`/contests/${game.id}`}
                  className="block group"
                >
                  <div
                    className={`relative h-full flex flex-col justify-between bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${theme.shadow}`}
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        {game.topic && (
                          <span
                            className={`${theme.badge} text-[10px] font-bold tracking-wide px-2 py-1 rounded-full shadow-sm`}
                          >
                            {game.topic}
                          </span>
                        )}

                        {game.status === 'incomplete' && isCreator && (
                          <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                            <span>Incomplete</span>
                          </div>
                        )}
                        {game.status === 'completed' && (
                            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completed</span>
                            </div>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2 line-clamp-2 leading-tight transition-colors">
                        {game.title}
                      </h2>
                      <div className="space-y-1">
                        {game.creator && (
                          <div className="flex items-center text-sm text-zinc-400">
                            By <span className="ml-1 truncate">{game.creator}</span>
                          </div>
                        )}
                        {(game as any).source && (
                          <div className="flex items-center text-sm text-zinc-500">
                            <span className="text-xs border border-zinc-700 px-1.5 rounded">
                              {(game as any).source}
                            </span>
                          </div>
                        )}
                        {!game.creator && !(game as any).source && (
                          <div className="h-6"></div>
                        )}
                      </div>
                    </div>
                    <div className="px-5 py-4 bg-black/20 border-t border-white/5 flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center text-zinc-400"
                          title="Questions"
                        >
                          <HelpCircle className="w-4 h-4 mr-1.5 opacity-70" />
                          <span className="font-semibold text-zinc-300">
                            {game.number_of_questions}
                          </span>
                        </div>
                        <div
                          className="flex items-center text-zinc-400"
                          title="Time Limit"
                        >
                          <Clock className="w-4 h-4 mr-1.5 opacity-70" />
                          <span className="font-semibold text-zinc-300">
                            {game.timeLimit}
                          </span>
                        </div>
                      </div>
                      {game.rating && game.rating > 0 && (
                        <div className="flex items-center text-yellow-400 font-medium bg-yellow-400/5 px-2 py-0.5 rounded-md border border-yellow-400/10">
                          <Star className="w-3.5 h-3.5 mr-1 fill-yellow-400" />
                          <span className="text-xs font-bold">
                            {game.rating}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-400">No contests created yet.</p>
        )}
      </div>
    </div>
    </div>
  );
}

