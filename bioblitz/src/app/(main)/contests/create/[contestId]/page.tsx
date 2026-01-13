"use client";

import React, { useState, useActionState, useMemo, useEffect, useCallback } from "react";
import { useFormStatus } from "react-dom";
import QuestionEditorForm from "@/components/forms/QuestionEditorForm";
import ContestQuestionView from "@/components/features/contests/ContestQuestionView";
import { EditableQuestion, IQuestionForDisplay, Question } from "@/types";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { createContest, getContestById } from "@/lib/actions";
import { auth } from "@/lib/firebase";
import { v4 as uuidv4 } from 'uuid';
import { debounce } from '@/lib/utils';
import { useParams } from "next/navigation";
import { uploadImage } from "@/lib/storage";


const generateChoiceKey = (index: number): string => {
  const charCodeA = "a".charCodeAt(0);
  return String.fromCharCode(charCodeA + index);
};

const transformForPreview = (
  editable: EditableQuestion | undefined
): [IQuestionForDisplay, string | undefined] => {
  if (!editable) {
    return [
      {
        content: "Select a question to preview",
      },
      undefined,
    ];
  }

  const questionForPreview: IQuestionForDisplay = {
    content: editable.content || "...",
    imgURL: editable.imageUrl,
  };

  let correctChoiceKey: string | undefined;

  editable.choices.forEach((choice, index) => {
    const key = generateChoiceKey(index);
    questionForPreview[key as keyof IQuestionForDisplay] = choice.text;
    if (choice.id === editable.correctAnswerId) {
      correctChoiceKey = key;
    }
  });

  return [questionForPreview, correctChoiceKey];
};

const initialQuestion = (): EditableQuestion => ({
  id: Date.now().toString(),
  content: "",
  imageUrl: "",
  choices: [
    { id: "1", text: "" },
    { id: "2", text: "" },
  ],
  correctAnswerId: "",
});

const initialState = {
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
      aria-disabled={pending}
    >
      {pending ? 'Creating Contest...' : 'Create Contest'}
    </button>
  );
}

const TOPICS = ["Animal", "CellBio", "Plants", "Biochem", "Genetics", "Other"];

export default function CreateContestPage() {
  const params = useParams();
  const urlContestId = params.contestId as string;

  const [state, formAction] = useActionState(createContest, initialState);
  const [questions, setQuestions] = useState<EditableQuestion[]>([
    initialQuestion(),
  ]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(
    questions[0]?.id || null
  );
  const [contestId, setContestId] = useState<string | null>(null);
  
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);


  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [idToken, setIdToken] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [title, setTitle] = useState("Untitled Contest");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState<number>(600);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        user.getIdToken().then(token => {
          setIdToken(token);
        });
      } else {
        setIdToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (urlContestId && urlContestId !== "create") {
      setContestId(urlContestId);
    } else if (!contestId) {
      setContestId(uuidv4());
    }
  }, [urlContestId, contestId]);

  useEffect(() => {
    async function loadContestData() {
      if (contestId && contestId !== "create" && !loading) {
        const fetchedContest = await getContestById(contestId);
        if (fetchedContest) {
          setTitle(fetchedContest.title);
          setDescription(fetchedContest.description || "");
          setTimeLimit(Number(fetchedContest.timeLimit) || 600);
          setSelectedTopic(fetchedContest.topic || TOPICS[0]);
          setBannerUrl(fetchedContest.bannerUrl || null);
          if (!TOPICS.includes(fetchedContest.topic || "")) {
            setSelectedTopic("Other");
            setCustomTopic(fetchedContest.topic || "");
          }
          if (fetchedContest.questions) {
            const editableQuestions: EditableQuestion[] = fetchedContest.questions.map(q => ({
                id: q.id,
                content: q.question,
                imageUrl: "",
                choices: q.answers.map((ans, index) => ({ id: (index + 1).toString(), text: ans })),
                correctAnswerId: q.answers.findIndex(ans => ans === q.correctAnswer) !== -1 ? (q.answers.findIndex(ans => ans === q.correctAnswer) + 1).toString() : "",
            }));
            setQuestions(editableQuestions.length > 0 ? editableQuestions : [initialQuestion()]);
            setActiveQuestionId(editableQuestions[0]?.id || null);
          } else {
            setQuestions([initialQuestion()]);
          }
        }
        setLoading(false);
      } else if (!urlContestId || urlContestId === "create") {
        setLoading(false);
      }
    }
    loadContestData();
  }, [contestId, urlContestId]);

  const addQuestion = () => {
    const newQuestion = initialQuestion();
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newQuestion.id);
  };

  const removeQuestion = (id: string) => {
    const newQuestions = questions.filter((q) => q.id !== id);
    setQuestions(newQuestions);
    if (activeQuestionId === id) {
      setActiveQuestionId(newQuestions[0]?.id || null);
    }
  };

  const handleQuestionChange = (
    id: string,
    updatedQuestion: EditableQuestion
  ) => {
    const newQuestions = questions.map((q) =>
      q.id === id ? updatedQuestion : q
    );
    setQuestions(newQuestions);
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0] && contestId) {
      const file = event.target.files[0];
      setUploadingBanner(true);
      try {
        const downloadURL = await uploadImage(file, `contests/${contestId}/banner`);
        setBannerUrl(downloadURL);
      } catch (error) {
        console.error("Error uploading banner image:", error);
      } finally {
        setUploadingBanner(false);
      }
    }
  };
  
  const convertToQuestions = (editableQuestions: EditableQuestion[]): Question[] => {
    return editableQuestions.map((eq) => {
      const correctAnswer = eq.choices.find((c) => c.id === eq.correctAnswerId)?.text || '';
      return {
        id: eq.id,
        question: eq.content,
        answers: eq.choices.map((c) => c.text),
        correctAnswer: correctAnswer,
      };
    });
  };

  const handleSaveDraft = useCallback(async () => {
    if (!contestId || !idToken) return;

    const formData = new FormData();
    formData.append("contestId", contestId);
    formData.append("idToken", idToken);
    formData.append("questions", JSON.stringify(convertToQuestions(questions)));
    formData.append("title", title);
    formData.append("description", description);
    formData.append("timeLimit", timeLimit.toString());
    formData.append("topic", selectedTopic === "Other" ? customTopic : selectedTopic);
    formData.append("status", "incomplete");
    if (bannerUrl) {
      formData.append("bannerUrl", bannerUrl);
    }

    try {
        await createContest({
          message: ""
        }, formData);
        console.log("Contest draft saved automatically.");
    } catch (error) {
        console.error("Failed to autosave draft:", error);
    }
  }, [contestId, idToken, questions, title, description, timeLimit, selectedTopic, customTopic, bannerUrl]);

  const debouncedSave = useMemo(() => debounce(handleSaveDraft, 1000), [handleSaveDraft]);

  useEffect(() => {
    if (contestId && idToken && !loading) {
        debouncedSave();
    }
  }, [questions, title, description, timeLimit, selectedTopic, customTopic, contestId, idToken, debouncedSave, loading, bannerUrl]);


  const validateAndSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); 

    const newErrors: Record<string, string[]> = {};
    let isValid = true;

    if (!title.trim()) {
        newErrors.title = ["Title cannot be empty."];
        isValid = false;
    }
    if (!description.trim()) {
        newErrors.description = ["Description cannot be empty."];
        isValid = false;
    }
    if (timeLimit <= 0) {
        newErrors.timeLimit = ["Time limit must be a positive number."];
        isValid = false;
    }
    if (!selectedTopic.trim() || (selectedTopic === "Other" && !customTopic.trim())) {
        newErrors.topic = ["Topic cannot be empty."];
        isValid = false;
    }


    questions.forEach(q => {
      const questionErrors: string[] = [];
      if (!q.content.trim()) {
        questionErrors.push("Question content cannot be empty.");
        isValid = false;
      }
      if (q.choices.length === 0) {
        questionErrors.push("Each question must have at least one answer choice.");
        isValid = false;
      }
      q.choices.forEach(c => {
        if (!c.text.trim()) {
          questionErrors.push("Answer choice text cannot be empty.");
          isValid = false;
        }
      });
      if (!q.correctAnswerId) {
        questionErrors.push("A correct answer must be selected.");
        isValid = false;
      }
      if (questionErrors.length > 0) {
        newErrors[q.id] = questionErrors;
      }
    });

    setErrors(newErrors);

    if (isValid) {
      const formData = new FormData(); 
      formData.append("contestId", contestId || '');
      formData.append("idToken", idToken || '');
      formData.append("questions", JSON.stringify(convertToQuestions(questions)));
      formData.append("title", title);
      formData.append("description", description);
      formData.append("timeLimit", timeLimit.toString());
      formData.append("topic", selectedTopic === "Other" ? customTopic : selectedTopic);
      formData.append("status", "completed");
      if (bannerUrl) {
        formData.append("bannerUrl", bannerUrl);
      }
      
      formAction(formData); 
    }
  };

  const topicValue = selectedTopic === "Other" ? customTopic : selectedTopic;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-sans pt-28 pb-12 flex items-center justify-center">
        <p>Loading contest...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans pt-28 pb-12">
      <div className="container mx-auto max-w-7xl px-4">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Contest Editor
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">
            Use the form on the left to build your question and see a live
            preview on the right.
          </p>
        </header>

        <form onSubmit={validateAndSubmit}> 
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-zinc-300 mb-4">Editor</h2>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300">Title</label>
                <input type="text" id="title" name="title" required className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none sm:text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
                <textarea id="description" name="description" rows={3} placeholder="The first 10 questions of the 2013 USABO opens" className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none sm:text-sm" value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
              </div>
              <div>
                <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-300">Time Limit (seconds)</label>
                <input type="number" id="timeLimit" name="timeLimit" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none sm:text-sm" />
              </div>
              <div>
                <label htmlFor="topic-select" className="block text-sm font-medium text-gray-300">Topic</label>
                <select id="topic-select" value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none sm:text-sm">
                  {TOPICS.map(topic => <option key={topic} value={topic}>{topic}</option>)}
                </select>
              </div>
              {selectedTopic === 'Other' && (
                <div>
                  <label htmlFor="custom-topic" className="block text-sm font-medium text-gray-300">Custom Topic</label>
                  <input type="text" id="custom-topic" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none sm:text-sm" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300">Contest Banner</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Banner" className="mx-auto h-48 w-auto" />
                    ) : (
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    )}
                    <div className="flex text-sm text-gray-400">
                      <label htmlFor="banner-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-indigo-500">
                        <span>{uploadingBanner ? "Uploading..." : "Upload a file"}</span>
                        <input id="banner-upload" name="banner-upload" type="file" className="sr-only" accept="image/*" onChange={handleBannerUpload} disabled={uploadingBanner} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              </div>


              <button
                type="button"
                onClick={addQuestion}
                className="w-full flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300 font-bold rounded-lg border-2 border-dashed border-zinc-700 hover:border-violet-100"
              >
                <Plus className="w-5 h-5" />
                Add Question
              </button>
              
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  onClick={() => setActiveQuestionId(question.id)}
                  className={`p-1 rounded-2xl transition-all ${
                    "bg-zinc-900"
                  }`}
                >
                  <div className="bg-zinc-900 rounded-xl">
                    <div className="flex justify-between items-center p-4 pb-0">
                      <h3 className="text-xl font-bold text-white">
                        Question {index + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQuestion(question.id);
                        }}
                        className="p-2 text-red-500 transition-colors rounded-md hover:bg-red-500/10"
                        aria-label="Remove question"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    {errors[question.id] && (
                      <div className="p-4 pt-2">
                        {errors[question.id].map((err, i) => (
                          <p key={i} className="text-sm text-red-400">{err}</p>
                        ))}
                      </div>
                    )}
                    <QuestionEditorForm
                      question={question}
                      onQuestionChange={(updated) =>
                        handleQuestionChange(question.id, updated)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-zinc-300 mb-4">
                Live Preview
              </h2>
              <div className="space-y-8">
                {questions.map((q, index) => {
                  const [qPreview, qSelectedAnswerKey] = transformForPreview(q);
                  return (
                    <div key={q.id}>
                      <ContestQuestionView
                        questionNumber={index + 1}
                        question={qPreview}
                        selectedAnswer={qSelectedAnswerKey}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
          <div className="mt-8 flex justify-end">
            <SubmitButton />
          </div>
          {state.message && <p className="mt-4 text-sm text-red-500 text-center">{state.message}</p>}
        </form>
      </div>
    </div>
  );
}