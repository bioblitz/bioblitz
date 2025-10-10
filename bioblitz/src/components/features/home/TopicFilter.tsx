
"use client";

import { useState } from "react";

const topics = [
  { name: "All Topics", emoji: "🌐" },
  { name: "Animal", emoji: "🐾" },
  { name: "Genetics", emoji: "🧬" },
  { name: "Biochemistry", emoji: "🔬" },
  { name: "Plants", emoji: "🌱" },
];

export default function TopicFilter({ setTopic }: { setTopic: (topic: string) => void }) {
  const [activeTopic, setActiveTopic] = useState("All Topics");

  const handleTopicClick = (topic: string) => {
    setActiveTopic(topic);
    setTopic(topic);
  };

  return (
    <div className="flex flex-wrap gap-4">
      {topics.map((topic) => (
        <button
          key={topic.name}
          onClick={() => handleTopicClick(topic.name)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors ${
            activeTopic === topic.name
              ? "bg-blue-500 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <span>{topic.emoji}</span>
          <span>{topic.name}</span>
        </button>
      ))}
    </div>
  );
}
