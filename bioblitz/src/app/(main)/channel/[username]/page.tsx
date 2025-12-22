"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import { uploadImage } from "../../../../lib/storage";
import { updateUserBanner, getUserProfileByUsername, UserProfile } from "../../../../lib/user";

export default function ChannelPage() {
  const { username } = useParams<{ username: string }>();
  const { user: authUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [channelOwnerProfile, setChannelOwnerProfile] = useState<UserProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
    const [bannerLoading, setBannerLoading] = useState(false);
  
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
    async function fetchChannelOwner() {
      if (!username) return;
      setLoading(true);
      const profile = await getUserProfileByUsername(username as string);
      if (profile) {
        setChannelOwnerProfile(profile);
        setIsOwner(authUser?.uid === profile.uid);
      } else {
        console.error("Channel owner profile not found for username:", username);
        setChannelOwnerProfile(null);
        setIsOwner(false);
      }
      setLoading(false);
    }
    fetchChannelOwner();
  }, [username, authUser?.uid]);

  return (
    <div className="bg-black h-screen text-white">
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
          style={{ backgroundImage: channelOwnerProfile?.bannerURL ? `url(${channelOwnerProfile.bannerURL})` : 'url(https://via.placeholder.com/1500x300/0000FF/FFFFFF?text=Default+Banner)' }}
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
            <Link href="/contests/create" passHref>
                <button className="px-4 py-2 bg-black-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Create New Contest
                </button>
            </Link>
        )}
      </div>
    </div>
  );
}
