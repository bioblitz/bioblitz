"use client";

import React from "react";
import { ProblemDisplay } from "../game/ProblemDisplay";
import { IQuestionForDisplay } from "@/types";

type ContestQuestionViewProps = {
  question: IQuestionForDisplay;
  questionNumber: number;
  selectedAnswer?: string;
  correctAnswerKey?: string;
};

const ContestQuestionView: React.FC<ContestQuestionViewProps> = ({
  question,
  questionNumber,
  selectedAnswer,
  correctAnswerKey,
}) => {
  const choiceKeys = Object.keys(question).filter(key => 
    key.length === 1 && key >= 'a' && key <= 'z' && question[key as keyof IQuestionForDisplay] !== undefined
  ).sort(); 

  const choices = choiceKeys.map(
    (key) => question[key as keyof IQuestionForDisplay] as string
  );

  const selectedAnswerIndex = selectedAnswer
    ? choiceKeys.indexOf(selectedAnswer)
    : null;
  const correctAnswerIndex = correctAnswerKey
    ? choiceKeys.indexOf(correctAnswerKey)
    : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl">
      <ProblemDisplay
        problemText={
          <div className="flex flex-col gap-1">
            <span className="font-bold text-white">Question {questionNumber}:</span>
            <div 
              className="prose prose-invert max-w-none text-white"
              dangerouslySetInnerHTML={{ __html: question.content }} 
            />
          </div>
        }
        imgURL={question.imgURL}
        answerChoices={choices}
        selectedAnswerIndex={selectedAnswerIndex}
        correctAnswerIndex={correctAnswerIndex}
        isSubmitted={true}
        onAnswerSelected={() => {}}
      />
    </div>
  );
};

export default ContestQuestionView;