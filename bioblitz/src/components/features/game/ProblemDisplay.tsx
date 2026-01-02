"use client";

import React from "react";
import { AnswerChoice } from "./AnswerChoice";

interface ProblemDisplayProps {
  problemText: React.ReactNode; 
  answerChoices: string[];
  onAnswerSelected: (index: number) => void;
  selectedAnswerIndex: number | null;
  isSubmitted: boolean;
  correctAnswerIndex: number | null;
  imgURL?: string;
}

export const ProblemDisplay: React.FC<ProblemDisplayProps> = ({
  problemText,
  answerChoices,
  onAnswerSelected,
  selectedAnswerIndex,
  isSubmitted,
  correctAnswerIndex,
  imgURL,
}) => {
  return (
    <div className="flex flex-col gap-4 p-6 bg-gray-800 rounded-lg shadow-lg">
      <div className="text-2xl font-bold text-white mb-4">
        {problemText}
      </div>
      
      {imgURL && (
        <div className="mb-4">
          <img src={imgURL} alt="Problem" className="rounded-lg w-full h-auto" />
        </div>
      )}
      
      <div className="flex flex-col gap-3">
        {answerChoices.map((choice, index) => (
          <AnswerChoice
            key={index}
            answerText={choice}
            onClick={() => onAnswerSelected(index)}
            isSelected={selectedAnswerIndex === index}
            isSubmitted={isSubmitted}
            isCorrect={isSubmitted && index === correctAnswerIndex}
          />
        ))}
      </div>
    </div>
  );
};