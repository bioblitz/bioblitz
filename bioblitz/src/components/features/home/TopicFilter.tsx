
"use client";

import { useState } from "react";

const topics = [
  { name: "All Topics", label: "All Topics", emoji: "🌍" },
  { name: "Anatomy & Physiology", label: "Anat & Phys", emoji: "🫀" },
  { name: "Cell Biology", label: "Cell Biology", emoji: "🔬" },
  { name: "Plant Biology", label: "Plant Biology", emoji: "🌱" },
  { name: "Genetics & Evolution", label: "Gen & Evo", emoji: "🧬" },
  { name: "Biosystematics", label: "Biosystematics", emoji: "🌳" },
  { name: "Ecology", label: "Ecology", emoji: "🌿" },
  { name: "Ethology", label: "Ethology", emoji: "🐾" },
  { name: "Multiple", label: "Multiple", emoji: "📚" },
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
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors  ${
            activeTopic === topic.name
              ? "bg-indigo-500 text-white"
              : "bg-[#1e2938] text-white hover:bg-gray-600"
          }`}
        >
          <span>{topic.emoji}</span>
          <span>{topic.label}</span>
        </button>
      ))}
    </div>
  );
}
