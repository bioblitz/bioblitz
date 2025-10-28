export type Question = {
  id: string;
  question: string;
  answers: string[];
  correctAnswer: string;
};

export type gameRoom = {
  id: string;
  title: string;
  source: string;
  number_of_questions: string;
  topic?: string;
  difficulty: string;
  timeLimit: string;
  description?: string;
  creator?: string;
  creatorPfp?: string;
  rating?: number;
  questions?: Question[];
};

export interface Contest {
  id: string;
  name: string;
  status: "active" | "upcoming" | "past";
  popularity: number;
  createdAt: Date;
}

export interface FilterState {
  search: string;
  status: "all" | "active" | "upcoming" | "past";
  sort: "newest" | "oldest" | "popularity";
}