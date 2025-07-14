export type gameRoom = {
  id: string;
  title: string;
  source: string;
  number_of_questions: string;
  topic: string;
  difficulty: string;
  total_time: string;
  time_per_question: string;
};

//placeholder data
export const allGames: gameRoom[] = Array.from({ length: 100 }).map(
  (_, index) => {
    const sources = [
      "Mitosisphere",
      "USABO Past Exams",
      "BBO Past Exams",
      "MCAT Past Exams",
      "NSB Past Exams",
    ];
    const topics = ["Topic 1", "Topic 2", "Topic 3", "Topic 4"];
    const difficulties = ["Easy", "Medium", "Hard", "Very Hard"];

    return {
      id: `id-${index + 1}`,
      title: `game-title-${index + 1}`,
      source: sources[index % sources.length],
      number_of_questions: "10",
      topic: topics[index % topics.length],
      difficulty: difficulties[index % difficulties.length],
      total_time: "15 minutes",
      time_per_question: "1 minute",
    };
  }
);
