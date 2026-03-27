import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string | null;
  email: string;
  photoURL: string;
  bElo: number;
  bio: string;
  createdAt: Timestamp;
  location: string;
  grade?: string;
  school?: string;
  streak?: number;
  roles?: string[];
  bannerURL?: string;
  channelName?: string;
  subscriberCount?: number;
}

export interface EloHistoryPoint {
  date: string;
  elo: number;
  fullDate: string;
  delta?: number;
}

export interface SetPlayed {
  name: string;
  correctCount?: number;
  totalQuestions?: number;
  timeTaken?: number;
  topic: string;
  setId: string;
  delta?: number;
}

export type FriendshipStatus = "none" | "sent" | "received" | "friends";
