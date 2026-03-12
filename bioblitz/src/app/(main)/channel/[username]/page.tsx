"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  PencilIcon,
  PlusIcon,
  HelpCircle,
  Clock,
  Star,
  CheckCircle2,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import { uploadImage } from "../../../../lib/storage";
import {
  updateUserBanner,
  updateChannelName,
  getUserProfileByUsername,
  UserProfile,
} from "../../../../lib/user";
import { getContestsByCreator } from "../../../../lib/actions";
import { gameRoom } from "@/types";
import ContestCard from "@/components/features/contests/ContestCard";
import { getTopicColors } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import ImageCropper from "@/components/ui/ImageCropper";
import SubscribeButton from "@/components/channel/SubscribeButton";
import SubscribersModal from "@/components/channel/SubscribersModal";

export default function ChannelPage() {
  const { username } = useParams<{ username: string }>();
  const { user: authUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [channelOwnerProfile, setChannelOwnerProfile] =
    useState<UserProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [userContests, setUserContests] = useState<gameRoom[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [nameError, setNameError] = useState("");
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [cropperAspect, setCropperAspect] = useState<number>(16 / 9);
  const [imageType, setImageType] = useState<string>("image/jpeg");
  const [showSubscribersModal, setShowSubscribersModal] = useState(false);

  const handleBannerUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleEditNameClick = () => {
    setNewChannelName(
      channelOwnerProfile?.channelName || channelOwnerProfile?.username || "",
    );
    setIsEditingName(true);
    setNameError("");
  };

  const handleSaveChannelName = async () => {
    if (!authUser || !newChannelName.trim()) return;

    try {
      const trimmedName = newChannelName.trim();
      await updateChannelName(authUser.uid, trimmedName);
      setChannelOwnerProfile((prev) =>
        prev ? { ...prev, channelName: trimmedName } : null,
      );
      setIsEditingName(false);
    } catch (error: any) {
      setNameError(error.message || "Failed to update channel name");
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setNameError("");
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const type = file.type || "image/jpeg";
      setImageType(type);

      const reader = new FileReader();
      reader.onload = () => {
        setImageToEdit(reader.result as string);
        setCropperAspect(16 / 9);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    if (!authUser) return;

    setBannerLoading(true);
    setImageToEdit(null);

    try {
      const extension = imageType.split("/")[1] || "jpg";
      const file = new File(
        [croppedImage],
        `banner-${Date.now()}.${extension}`,
        { type: imageType },
      );
      const filePath = `userBanners/${authUser.uid}/${file.name}`;
      const downloadURL = await uploadImage(file, filePath);
      await updateUserBanner(authUser.uid, downloadURL);

      setChannelOwnerProfile((prevProfile) => {
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
  };

  const handleCropCancel = () => {
    setImageToEdit(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    async function fetchChannelOwnerAndContests() {
      if (!username) {
        router.push("/404");
        return;
      }
      setLoading(true);
      const profile = await getUserProfileByUsername(username as string);
      if (profile) {
        setChannelOwnerProfile(profile);
        setIsOwner(authUser?.uid === profile.uid);

        const contests = await getContestsByCreator(profile.uid);
        setUserContests(contests);
      } else {
        console.error(
          "Channel owner profile not found for username:",
          username,
        );
        setChannelOwnerProfile(null);
        setIsOwner(false);
        router.push("/404");
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
    <>
      {imageToEdit && (
        <ImageCropper
          image={imageToEdit}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspect={cropperAspect}
          title="Adjust Banner"
          imageType={imageType}
        />
      )}

      {channelOwnerProfile && (
        <SubscribersModal
          channelId={channelOwnerProfile.uid}
          isOpen={showSubscribersModal}
          onClose={() => setShowSubscribersModal(false)}
        />
      )}

      <div className="bg-black min-h-screen justify-center pt-20 py-10 text-white">
        <div className="w-11/12 mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          />
          {loading ? (
            <div className="h-48 bg-zinc-800 flex items-center justify-center animate-pulse">
              <p>Loading channel...</p>
            </div>
          ) : (
            <div className="relative h-48 overflow-hidden">
              {channelOwnerProfile?.bannerURL ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${channelOwnerProfile.bannerURL})`,
                  }}
                />
              ) : channelOwnerProfile?.photoURL ? (
                <>
                  <img
                    src={channelOwnerProfile.photoURL}
                    className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
                    alt=""
                    aria-hidden
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/60" />

                  <div className="relative h-full flex items-center justify-center">
                    <img
                      src={channelOwnerProfile.photoURL}
                      alt="Channel owner"
                      className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />
              )}
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
            <div className="flex items-center gap-3">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-xl font-bold"
                    placeholder="Channel name"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveChannelName}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <h1 className="text-2xl font-bold">
                      {channelOwnerProfile?.channelName ||
                        channelOwnerProfile?.displayName ||
                        channelOwnerProfile?.username}
                      's Channel
                    </h1>
                    <button
                      onClick={() => setShowSubscribersModal(true)}
                      className="text-zinc-400 text-sm mt-1 hover:text-white hover:underline transition-all text-left w-fit"
                    >
                      {channelOwnerProfile?.subscriberCount || 0} Subscribers
                    </button>
                  </div>
                  {isOwner && (
                    <button
                      onClick={handleEditNameClick}
                      className="p-1 hover:bg-zinc-800 rounded transition-colors"
                      title="Edit channel name"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
            {nameError && <p className="text-red-500 text-sm">{nameError}</p>}
            <div className="flex items-center gap-3">
              {!isOwner && channelOwnerProfile && (
                <SubscribeButton
                  topicId={channelOwnerProfile.uid} // 👈 Subscribing to the USER UID
                  topicName={channelOwnerProfile.displayName || "this channel"}
                />
              )}
              {isOwner && (
                <button
                  onClick={handleCreateNewContest}
                  className="px-4 py-2 bg-black-600 hover:bg-neutral-700 text-white rounded-md flex items-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  Create New Blitz
                </button>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Blitzes</h2>
            {userContests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userContests.map((game) => (
                  <ContestCard
                    key={game.id}
                    contest={game}
                    href={`/home/${game.id}`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-zinc-400">No Blitzes created yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
