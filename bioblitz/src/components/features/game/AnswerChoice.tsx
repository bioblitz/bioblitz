"use client";

import { cn } from "@/lib/utils";

interface AnswerChoiceProps {
  answerText: string;
  onClick: () => void;
  isSelected: boolean;
  isCorrect?: boolean;
  isSubmitted?: boolean;
}

export const AnswerChoice: React.FC<AnswerChoiceProps> = ({
  answerText,
  onClick,
  isSelected,
  isCorrect,
  isSubmitted,
}) => {
  const baseStyles =
    "p-4 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out text-white";
  const selectedStyles = isSelected ? "border-blue-500 bg-blue-500/20" : "border-gray-700 hover:border-blue-400";
  let feedbackStyles = "";

  if (isSubmitted) {
    if (isCorrect) {
      feedbackStyles = "bg-green-500/30 border-green-500";
    } else if (isSelected && !isCorrect) {
      feedbackStyles = "bg-red-500/30 border-red-500";
    } else {
      feedbackStyles = "border-gray-700";
    }
  }

  return (
    <div
      className={cn(baseStyles, selectedStyles, feedbackStyles)}
      onClick={onClick}
    >
      {answerText}
    </div>
  );
};

export default AnswerChoice;