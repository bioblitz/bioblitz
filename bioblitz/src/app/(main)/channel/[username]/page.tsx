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
import ContestCard from "@/components/features/contests/ContestCard";
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
            {userContests.map((game) => (
              <ContestCard key={game.id} contest={game} />
            ))}
          </div>
        ) : (
          <p className="text-zinc-400">No contests created yet.</p>
        )}
      </div>
    </div>
    </div>
  );
}

