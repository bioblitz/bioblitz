export type Question = {
  id: string;
  question: string;
  answers: string[];
  correctAnswer: string;
};

export type gameRoom = {
  id:string;
  title: string;
  source: string;
  number_of_questions: string;
  topic?: string;
  difficulty: string;
  timeLimit: string;
  description?: string;
  creator?: string;
  creatorPfp?: string;
  creatorUsername?: string;
  creatorBanner?: string;
  rating?: number;
  ratingCount?: number;
  trendingScore?: number;
  contestRating?: number;
  questions?: Question[];
  status?: string;
  hidden?: boolean;
  bannerUrl?: string;
  totalPlays?: number;
  firstAttemptCount?: number;
  ratingActivated?: boolean;
  creation: number | null;
  lastPlayedAt?: number | null;
  lastRatingUpdate?: number | null;
};

export interface Contest {
  id: string;
  name: string;
  status: "active" | "upcoming" | "past";
  popularity: number;
  createdAt: Date;
}
export type GameRoomClient = Omit<
  gameRoom,
  "creation" | "lastPlayedAt" | "lastRatingUpdate"
> & {
  creation: number | null;
  lastPlayedAt?: number | null;
  lastRatingUpdate?: number | null;
};

export interface FilterState {
  search: string;
  status: "all" | "active" | "upcoming" | "past";
  sort: "newest" | "oldest" | "popularity";
}

export interface AnswerChoice {
  id: string;
  text: string;
}

export interface EditableQuestion {
  id: string;
  content: string;
  imageUrl?: string;
  choices: AnswerChoice[];
  correctAnswerIds: string[];
  isMultiSelect?: boolean;
  solution?: string;
}

/** A set that a pool question has been used in, for usage links in the staff pool. */
export interface PoolSetUsage {
  id: string;
  title: string;
  status?: string;
  hidden?: boolean;
}

/** A question in the staff question pool: an editable question plus its tags and usage. */
export interface PoolQuestion extends EditableQuestion {
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  source: "manual" | "ai";
  createdAt: number | null;
  updatedAt: number | null;
  createdBy?: string;
  createdByUsername?: string;
  usageCount: number;
  usedIn: PoolSetUsage[];
}

export interface IQuestionForDisplay {
  content: string;
  imgURL?: string;
  a?: string;
  b?: string;
  c?: string;
  d?: string;
  e?: string;
}

export interface UserProfile {
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
  bannerURL?: string;
  channelName?: string;
}