"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { EditableQuestion, AnswerChoice } from "@/types";
import { CheckCircle, Circle, Plus, Trash2, ChevronDown, ToggleLeft, ToggleRight } from "lucide-react";
import "react-quill-new/dist/quill.snow.css";
import ImageUploadZone from "@/components/ui/ImageUploadZone";
import { uploadImage } from "@/lib/storage";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <p>Loading Editor...</p>,
});

interface QuestionEditorFormProps {
  question: EditableQuestion;
  onQuestionChange: (question: EditableQuestion) => void;
  contestId: string;
}

const sectionHeaderClass =
  "flex items-center gap-2 w-full text-left py-2 group";
const sectionLabelClass =
  "text-sm font-semibold text-neutral-300 group-hover:text-white transition-colors";
const chevronClass = (open: boolean) =>
  `w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 transition-all ${open ? "" : "-rotate-90"}`;

const QuestionEditorForm: React.FC<QuestionEditorFormProps> = ({
  question,
  onQuestionChange,
  contestId,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [showQuestionText, setShowQuestionText] = useState(true);
  const [showImage, setShowImage] = useState(false);
  const [showAnswerChoices, setShowAnswerChoices] = useState(true);
  const [showSolution, setShowSolution] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleContentChange = (content: string) => {
    if (content === question.content) return;
    onQuestionChange({ ...question, content });
  };

  const handleImageFile = async (file: File) => {
    setUploadingImage(true);
    try {
      const imageUrl = await uploadImage(file, `contests/${contestId}/questions/${question.id}/image`);
      onQuestionChange({ ...question, imageUrl });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const removeImage = () => {
    onQuestionChange({ ...question, imageUrl: "" });
  };

  const handleChoiceTextChange = (id: string, newText: string) => {
    const updatedChoices = question.choices.map((c) =>
      c.id === id ? { ...c, text: newText } : c
    );
    onQuestionChange({ ...question, choices: updatedChoices });
  };

  const toggleCorrectAnswer = (id: string) => {
    if (question.isMultiSelect) {
      const ids = question.correctAnswerIds ?? [];
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      onQuestionChange({ ...question, correctAnswerIds: next });
    } else {
      onQuestionChange({ ...question, correctAnswerIds: [id] });
    }
  };

  const toggleMultiSelect = () => {
    const next = !question.isMultiSelect;
    // When switching to single-select, keep only the first selected answer
    const ids = question.correctAnswerIds ?? [];
    onQuestionChange({
      ...question,
      isMultiSelect: next,
      correctAnswerIds: next ? ids : ids.slice(0, 1),
    });
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
    onQuestionChange({
      ...question,
      choices: updatedChoices,
      correctAnswerIds: (question.correctAnswerIds ?? []).filter((x) => x !== id),
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
          color: #52525b;
        }
      ` }} />

      {/* Question Text */}
      <div className="border-b border-neutral-800/60 pb-3">
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
              placeholder="Enter question here..."
            />
          </div>
        )}
      </div>

      {/* Image */}
      <div className="border-b border-neutral-800/60 pb-3">
        <button
          type="button"
          onClick={() => setShowImage((v) => !v)}
          className={sectionHeaderClass}
        >
          <ChevronDown className={chevronClass(showImage)} />
          <span className={sectionLabelClass}>Image <span className="text-neutral-600 font-normal">(optional)</span></span>
        </button>
        {showImage && (
          <ImageUploadZone onFile={handleImageFile} className="mt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
              accept="image/*"
            />
            {uploadingImage ? (
              <div className="w-full flex items-center justify-center p-8 bg-neutral-800/50 rounded-lg border-2 border-dashed border-neutral-700">
                <span className="text-neutral-400 text-sm">Uploading...</span>
              </div>
            ) : question.imageUrl ? (
              <div className="relative group">
                <img
                  src={question.imageUrl}
                  alt="Question preview"
                  className="w-full h-auto rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-2 bg-neutral-900/50 rounded-full hover:bg-neutral-500/10 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 p-8 bg-neutral-800/50 hover:bg-neutral-800 transition-colors text-neutral-400 font-bold rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-100"
              >
                <span>Drop, paste, or click to upload an image</span>
              </button>
            )}
          </ImageUploadZone>
        )}
      </div>

      {/* Answer Choices */}
      <div className="border-b border-neutral-800/60 pb-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAnswerChoices((v) => !v)}
            className={sectionHeaderClass}
          >
            <ChevronDown className={chevronClass(showAnswerChoices)} />
            <span className={sectionLabelClass}>Answer Choices</span>
          </button>
          <button
            type="button"
            onClick={toggleMultiSelect}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${
              question.isMultiSelect
                ? "text-amber-300 bg-amber-500/10 border border-amber-500/30"
                : "text-neutral-500 hover:text-neutral-300 border border-transparent"
            }`}
            title="Allow multiple correct answers"
          >
            {question.isMultiSelect
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft className="w-4 h-4" />
            }
            Multi-select
          </button>
        </div>
        {showAnswerChoices && (
          <div className="mt-2 space-y-3">
            {question.isMultiSelect && (
              <p className="text-[11px] text-amber-400/80 pb-1">Select all correct answers</p>
            )}
            {question.choices.map((choice) => (
              <div key={choice.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleCorrectAnswer(choice.id)}
                  className="text-neutral-500 hover:text-white transition-colors"
                  aria-label="Mark as correct"
                >
                  {(question.correctAnswerIds ?? []).includes(choice.id) ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>
                <input
                  type="text"
                  value={choice.text}
                  onChange={(e) =>
                    handleChoiceTextChange(choice.id, e.target.value)
                  }
                  placeholder="Answer"
                  className="flex-grow bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => removeChoice(choice.id)}
                  className="p-2 text-neutral-500 transition-colors hover:bg-neutral-500/10 rounded-md"
                  aria-label="Remove choice"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addChoice}
              className="w-full flex items-center justify-center gap-2 p-3 bg-neutral-800 hover:bg-neutral-700 transition-colors text-neutral-300 font-bold rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-100"
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
          <span className={sectionLabelClass}>Solution / Explanation <span className="text-neutral-600 font-normal">(optional)</span></span>
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
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-all resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionEditorForm;
