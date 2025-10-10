'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createContest } from '@/lib/actions';
import { useState } from 'react';
import { Question } from '@/types';

const initialState = {
  message: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      aria-disabled={pending}
    >
      {pending ? 'Creating Contest...' : 'Create Contest'}
    </button>
  );
}

export function ContestEditorForm() {
  const [state, formAction] = useFormState(createContest, initialState);
  const [questions, setQuestions] = useState<Partial<Question>[]>([]);

  const addQuestion = () => {
    setQuestions([...questions, { id: `q_${Date.now()}`, question: '', answers: ['', '', '', ''], correctAnswer: '' }]);
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: string) => {
    const newQuestions = [...questions];
    (newQuestions[index] as any)[field] = value;
    setQuestions(newQuestions);
  };

  const handleAnswerChange = (qIndex: number, aIndex: number, value: string) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].answers) {
        (newQuestions[qIndex].answers as any)[aIndex] = value;
        setQuestions(newQuestions);
    }
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-300">
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="source" className="block text-sm font-medium text-gray-300">
          Source
        </label>
        <input
          type="text"
          id="source"
          name="source"
          className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-gray-300">
          Topic
        </label>
        <input
          type="text"
          id="topic"
          name="topic"
          className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="difficulty" className="block text-sm font-medium text-gray-300">
          Difficulty
        </label>
        <select
          id="difficulty"
          name="difficulty"
          className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
      </div>

      <div>
        <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-300">
          Time Limit (seconds)
        </label>
        <input
          type="number"
          id="timeLimit"
          name="timeLimit"
          className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="rating" className="block text-sm font-medium text-gray-300">
          Rating
        </label>
        <input
          type="number"
          id="rating"
          name="rating"
          min="0"
          max="5"
          className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        ></textarea>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Questions</h3>
        {questions.map((q, qIndex) => (
          <div key={q.id} className="p-4 border border-gray-600 rounded-md">
            <label className="block text-sm font-medium text-gray-300">Question {qIndex + 1}</label>
            <input
              type="text"
              value={q.question}
              onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-500 rounded-md text-white"
            />
            <div className="mt-2 space-y-2">
                {q.answers && q.answers.map((ans, aIndex) => (
                    <input
                    key={aIndex}
                    type="text"
                    value={ans}
                    onChange={(e) => handleAnswerChange(qIndex, aIndex, e.target.value)}
                    placeholder={`Answer ${aIndex + 1}`}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-500 rounded-md text-white"
                    />
                ))}
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-300">Correct Answer</label>
              <select
                value={q.correctAnswer}
                onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-500 rounded-md text-white"
              >
                <option value="">Select Correct Answer</option>
                {q.answers && q.answers.map((ans, aIndex) => (
                  <option key={aIndex} value={ans}>{ans}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
        <button type="button" onClick={addQuestion} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          Add Question
        </button>
      </div>

      <SubmitButton />

      {state.message && <p className="text-sm text-red-500">{state.message}</p>}
    </form>
  );
}