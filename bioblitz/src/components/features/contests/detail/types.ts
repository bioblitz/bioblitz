import { Timestamp } from "firebase/firestore";

export interface GameSubmission {
  id: string;
  userId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: Timestamp;
  timeTaken: number;
  ranked?: boolean;
  username?: string;
  handle?: string;
  photoURL?: string;
  bElo?: number;
  ratingDelta?: number;
}

export interface LeaderboardEntry {
  submissionId: string;
  userId: string;
  username: string;
  handle?: string;
  photoURL?: string;
  correctCount: number;
  totalQuestions: number;
  questionResults?: boolean[];
  questionTimings?: number[];
  timeTaken: number;
  tabSwitchCount?: number;
  timeOffTab?: number;
  bElo?: number;
}
