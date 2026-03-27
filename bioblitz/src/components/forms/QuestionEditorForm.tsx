"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { EditableQuestion, AnswerChoice } from "@/types";
import { CheckCircle, Circle, Plus, Trash2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <p>Loading Editor...</p>,
});

interface QuestionEditorFormProps {
  question: EditableQuestion;
  onQuestionChange: (question: EditableQuestion) => void;
}

const sectionHeaderClass =
  "flex items-center gap-2 w-full text-left py-2 group";
const sectionLabelClass =
  "text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors";
const chevronClass = (open: boolean) =>
  `w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-all ${open ? "" : "-rotate-90"}`;

const QuestionEditorForm: React.FC<QuestionEditorFormProps> = ({
  question,
  onQuestionChange,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [showQuestionText, setShowQuestionText] = useState(true);
  const [showImage, setShowImage] = useState(false);
  const [showAnswerChoices, setShowAnswerChoices] = useState(true);
  const [showSolution, setShowSolution] = useState(false);

  const handleContentChange = (content: string) => {
    if (content === question.content) return;
    onQuestionChange({ ...question, content });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      onQuestionChange({ ...question, imageUrl });
    }
  };

  const removeImage = () => {
    if (question.imageUrl) {
      URL.revokeObjectURL(question.imageUrl);
    }
    onQuestionChange({ ...question, imageUrl: "" });
  };

  const handleChoiceTextChange = (id: string, newText: string) => {
    const updatedChoices = question.choices.map((c) =>
      c.id === id ? { ...c, text: newText } : c
    );
    onQuestionChange({ ...question, choices: updatedChoices });
  };

  const setCorrectAnswer = (id: string) => {
    onQuestionChange({ ...question, correctAnswerId: id });
  };

  const addChoice = () => {
    const newChoice: AnswerChoice = {
      id: new Date().getTime().toString(),
      text: "",
    };
    const updatedChoices = [...question.choices, newChoice];
    onQuestionChange({ ...question, choices: updatedChoices });
  };

  const removeChoice = (id: string) => {
    const updatedChoices = question.choices.filter((c) => c.id !== id);
    const newCorrectAnswerId =
      question.correctAnswerId === id ? "" : question.correctAnswerId;
    onQuestionChange({
      ...question,
      choices: updatedChoices,
      correctAnswerId: newCorrectAnswerId,
    });
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "link",
    "image",
  ];

  return (
    <div className="p-5 space-y-1">
      <style dangerouslySetInnerHTML={{ __html: `
        .ql-snow .ql-editor {
          background-color: #1a1a1a;
          color: #f0f0f0;
        }
        .ql-snow .ql-toolbar {
          background-color: #2a2a2a;
          border-color: #333;
        }
        .ql-snow .ql-stroke {
          stroke: #f0f0f0;
        }
        .ql-snow .ql-fill {
          fill: #f0f0f0;
        }
        .ql-snow .ql-picker-label {
          color: #f0f0f0;
        }
        .ql-snow .ql-picker-options {
          background-color: #2a2a2a;
          color: #f0f0f0;
        }
        .ql-snow .ql-picker-item {
          color: #f0f0f0;
        }
        .ql-snow .ql-tooltip {
          background-color: #2a2a2a;
          color: #f0f0f0;
          border-color: #333;
        }
        .ql-snow .ql-tooltip input[type=text] {
          background-color: #1a1a1a;
          color: #f0f0f0;
          border-color: #333;
        }
        .ql-editor strong { color: white; }
        .ql-editor em { color: white; }
        .ql-editor u { color: white; }
        .ql-editor s { color: white; }
        .ql-editor pre {
          background-color: #333;
          color: #f0f0f0;
        }
        .ql-editor a {
          color: #8ab4f8;
        }
        .quill > .ql-container > .ql-editor.ql-blank::before{
          color: white;
        }
      ` }} />

      {/* Question Text */}
      <div className="border-b border-zinc-800/60 pb-3">
        <button
          type="button"
          onClick={() => setShowQuestionText((v) => !v)}
          className={sectionHeaderClass}
        >
          <ChevronDown className={chevronClass(showQuestionText)} />
          <span className={sectionLabelClass}>Question Text</span>
        </button>
        {showQuestionText && (
          <div className="mt-2">
            <ReactQuill
              theme="snow"
              value={question.content}
              onChange={handleContentChange}
              modules={modules}
              formats={formats}
              placeholder="What is the powerhouse of the cell?"
            />
          </div>
        )}
      </div>

      {/* Image */}
      <div className="border-b border-zinc-800/60 pb-3">
        <button
          type="button"
          onClick={() => setShowImage((v) => !v)}
          className={sectionHeaderClass}
        >
          <ChevronDown className={chevronClass(showImage)} />
          <span className={sectionLabelClass}>Image <span className="text-zinc-600 font-normal">(optional)</span></span>
        </button>
        {showImage && (
          <div className="mt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
              accept="image/*"
            />
            {question.imageUrl ? (
              <div className="relative group">
                <img
                  src={question.imageUrl}
                  alt="Question preview"
                  className="w-full h-auto rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-2 bg-neutral-900/50 rounded-full hover:bg-zinc-500/10 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 p-8 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-zinc-400 font-bold rounded-lg border-2 border-dashed border-zinc-700 hover:border-neutral-100"
              >
                <span>Upload an Image</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Answer Choices */}
      <div className="border-b border-zinc-800/60 pb-3">
        <button
          type="button"
          onClick={() => setShowAnswerChoices((v) => !v)}
          className={sectionHeaderClass}
        >
          <ChevronDown className={chevronClass(showAnswerChoices)} />
          <span className={sectionLabelClass}>Answer Choices</span>
        </button>
        {showAnswerChoices && (
          <div className="mt-2 space-y-3">
            {question.choices.map((choice) => (
              <div key={choice.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectAnswer(choice.id)}
                  className="text-zinc-500 hover:text-white transition-colors"
                  aria-label="Mark as correct"
                >
                  {question.correctAnswerId === choice.id ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>
                <Input
                  type="text"
                  value={choice.text}
                  onChange={(e) =>
                    handleChoiceTextChange(choice.id, e.target.value)
                  }
                  placeholder="Answer"
                  className="flex-grow text-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => removeChoice(choice.id)}
                  className="p-2 text-zinc-500 transition-colors hover:bg-zinc-500/10 rounded-md"
                  aria-label="Remove choice"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addChoice}
              className="w-full flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300 font-bold rounded-lg border-2 border-dashed border-zinc-700 hover:border-neutral-100"
            >
              <Plus className="w-5 h-5" />
              Add Answer Choice
            </button>
          </div>
        )}
      </div>

      {/* Solution */}
      <div className="pb-2">
        <button
          type="button"
          onClick={() => setShowSolution((v) => !v)}
          className={sectionHeaderClass}
        >
          <ChevronDown className={chevronClass(showSolution)} />
          <span className={sectionLabelClass}>Solution / Explanation <span className="text-zinc-600 font-normal">(optional)</span></span>
        </button>
        {showSolution && (
          <div className="mt-2">
            <textarea
              value={question.solution || ""}
              onChange={(e) =>
                onQuestionChange({ ...question, solution: e.target.value })
              }
              placeholder="Explain why the correct answer is right..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-all resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionEditorForm;
