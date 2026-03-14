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
}

export interface EloHistoryPoint {
  date: string;
  elo: number;
  fullDate: string;
}

export interface SetPlayed {
  name: string;
  score: number;
  topic: string;
  setId: string;
}

export type FriendshipStatus = "none" | "sent" | "received" | "friends";
