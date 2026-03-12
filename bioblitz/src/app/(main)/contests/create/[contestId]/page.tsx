"use client";

import React, { useState, useActionState, useMemo, useEffect, useCallback, startTransition, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import QuestionEditorForm from "@/components/forms/QuestionEditorForm";
import ContestQuestionView from "@/components/features/contests/ContestQuestionView";
import { EditableQuestion, IQuestionForDisplay } from "@/types";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { createContest } from "@/lib/actions";
import { uploadImage } from "@/lib/storage";
import { auth } from "@/lib/firebase";
import { v4 as uuidv4 } from 'uuid';
import { debounce } from '@/lib/utils';


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
  solution: "",
});

const initialState = {
  message: "",
};

function SubmitButton({ isPublished }: { isPublished: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
      aria-disabled={pending}
    >
      {pending
        ? isPublished ? 'Updating...' : 'Creating Blitz...'
        : isPublished ? 'Update Blitz' : 'Create Blitz'}
    </button>
  );
}

const TOPICS = ["Anatomy & Physiology", "Cell Biology", "Plant Biology", "Genetics & Evolution", "Biosystematics", "Ecology", "Ethology", "Multiple", "Other"];

export default function EditContestPage() {
  const params = useParams();
  const router = useRouter();
  const routeContestId = (params as any)?.contestId as string | undefined;

  const [state, formAction] = useActionState(createContest, initialState);
  const [questions, setQuestions] = useState<EditableQuestion[]>([initialQuestion()]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(questions[0]?.id || null);
  const [contestId, setContestId] = useState<string | null>(routeContestId || null);

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [idToken, setIdToken] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [title, setTitle] = useState("Untitled Blitz");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState<number>(600);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [isHidden, setIsHidden] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);

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
    if (!contestId) {
      if (routeContestId) setContestId(routeContestId);
      else setContestId(uuidv4());
    }
  }, [contestId, routeContestId]);

  useEffect(() => {
    if (!routeContestId) return;
    async function fetchContest() {
      try {
        const res = await fetch(`/api/contests/${routeContestId}`);
        if (res.ok) {
          const contest = await res.json();
          if (contest) {
            setTitle(contest.title || "Untitled Blitz");
            setDescription(contest.description || "");
            setTimeLimit(Number(contest.timeLimit) || 600);
            setSelectedTopic(contest.topic || TOPICS[0]);
            setBannerUrl(contest.bannerUrl || null);
            setIsPublished(contest.status === 'completed');
            setIsHidden(contest.hidden === true);
            if (contest.questions && Array.isArray(contest.questions) && contest.questions.length > 0) {
              const choiceKeys = ['a', 'b', 'c', 'd', 'e'] as const;
              const editable = (contest.questions as any[]).map((q) => {
                // Subcollection format: {id, content, a, b, c, d?, e?, correct, imgURL, solution}
                const choices = choiceKeys
                  .filter((k) => q[k])
                  .map((k, idx) => ({ id: String(idx + 1), text: q[k] as string }));
                const correctIndex = choiceKeys.indexOf(q.correct as typeof choiceKeys[number]);
                return {
                  id: q.id || Date.now().toString(),
                  content: q.content || '',
                  imageUrl: q.imgURL || '',
                  choices,
                  correctAnswerId: correctIndex >= 0 ? String(correctIndex + 1) : '',
                  solution: q.solution || '',
                } as EditableQuestion;
              });
              setQuestions(editable);
              setActiveQuestionId(editable[0]?.id || null);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch contest:', err);
      }
    }
    fetchContest();
  }, [routeContestId]);

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
  
  // Converts EditableQuestion → subcollection doc format: {content, a, b, c, d?, e?, correct, imgURL, solution}
  const convertToQuestions = (editableQuestions: EditableQuestion[]) => {
    const choiceKeys = ['a', 'b', 'c', 'd', 'e'] as const;
    return editableQuestions.map((eq) => {
      const correctIndex = eq.choices.findIndex((c) => c.id === eq.correctAnswerId);
      const correctLetter = correctIndex >= 0 ? choiceKeys[correctIndex] : '';
      const q: Record<string, string> = {
        id: eq.id,
        content: eq.content,
        correct: correctLetter,
        imgURL: eq.imageUrl || '',
        solution: eq.solution || '',
      };
      eq.choices.forEach((choice, idx) => {
        if (idx < choiceKeys.length) q[choiceKeys[idx]] = choice.text;
      });
      return q;
    });
  };

  // Detect successful publish via state message
  useEffect(() => {
    if (state.message?.startsWith('Blitz saved with ID:')) {
      setIsPublished(true);
      setIsHidden(false);
    }
  }, [state.message]);

  const handleToggleVisibility = async () => {
    if (!contestId) return;
    const newHidden = !isHidden;
    setIsHidden(newHidden);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      await fetch(`/api/contests/${contestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token, hidden: newHidden }),
      });
    } catch (e) {
      setIsHidden(!newHidden); // revert on error
    }
  };

  const handleDelete = async () => {
    if (!contestId) return;
    if (!confirm('Are you sure you want to delete this Blitz? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(`/api/contests/${contestId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });
      if (res.ok) router.push('/contests');
    } catch (e) {
      console.error('Failed to delete blitz:', e);
    } finally {
      setDeleting(false);
    }
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

  const handleSaveDraft = useCallback(async () => {
    if (!contestId) return;

    const token = await auth.currentUser?.getIdToken(true);
    if (!token) return;
    setIdToken(token);

    // build compact snapshot of important fields
    const snapshot = JSON.stringify({
      title,
      description,
      timeLimit,
      topic: selectedTopic,
      questions: convertToQuestions(questions),
      bannerUrl,
    });

    // avoid saving if nothing meaningful changed since last save
    if (lastSavedSnapshotRef.current === snapshot) return;

    const formData = new FormData();
    formData.append("contestId", contestId);
    formData.append("idToken", token);
    formData.append("questions", JSON.stringify(convertToQuestions(questions)));
    formData.append("title", title);
    formData.append("description", description);
    formData.append("timeLimit", timeLimit.toString());
    formData.append("topic", selectedTopic === "Other" ? customTopic : selectedTopic);
    // preserve published status when editing an already-published blitz
    formData.append("status", isPublished ? "completed" : "incomplete");
    formData.append("hidden", isPublished ? isHidden.toString() : "true");
    if (bannerUrl) {
      formData.append("bannerUrl", bannerUrl);
    }

    try {
      lastSavedSnapshotRef.current = snapshot;
      startTransition(() => {
        formAction(formData);
      });
      console.log("Contest draft saved automatically.");
    } catch (error) {
      console.error("Failed to autosave draft:", error);
      lastSavedSnapshotRef.current = null;
    }
  }, [contestId, questions, title, description, timeLimit, selectedTopic, customTopic, bannerUrl]);

  useEffect(() => {
    if (!contestId) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      try {
        const payload = {
          idToken: idToken,
          questions: convertToQuestions(questions),
          title,
          description,
          timeLimit: timeLimit.toString(),
          topic: selectedTopic === "Other" ? customTopic : selectedTopic,
          status: isPublished ? "completed" : "incomplete",
          incomplete: !isPublished,
          tags: isPublished ? [] : ["incomplete"],
          hidden: isPublished ? isHidden : true,
          bannerUrl,
          contestId,
        };

        const url = `/api/contests/${contestId}`;

        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
          navigator.sendBeacon(url, blob);
        } else {
          fetch(url, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" },
            keepalive: true,
          }).catch(() => {});
        }
      } catch (e) {
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [contestId, idToken, questions, title, description, timeLimit, selectedTopic, customTopic, bannerUrl, isPublished, isHidden]);


  const validateAndSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); 

    const newErrors: Record<string, string[]> = {};
    let isValid = true;

    if (!title.trim()) {
        newErrors.title = ["Title cannot be empty."];
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
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        setErrors({ general: ["You must be logged in to submit the Blitz."] });
        return;
      }
      setIdToken(token);

      const formData = new FormData();
      formData.append("contestId", contestId || "");
      formData.append("idToken", token);
      formData.append("questions", JSON.stringify(convertToQuestions(questions)));
      formData.append("title", title);
      formData.append("description", description);
      formData.append("timeLimit", timeLimit.toString());
      formData.append("topic", selectedTopic === "Other" ? customTopic : selectedTopic);
      if (bannerUrl) {
        formData.append("bannerUrl", bannerUrl);
      }
      formData.append("status", "completed");
      formData.append("hidden", "false");

      // update snapshot so unload handler doesn't resend the same draft
      try {
        lastSavedSnapshotRef.current = JSON.stringify({
          title,
          description,
          timeLimit,
          topic: selectedTopic === "Other" ? customTopic : selectedTopic,
          questions: convertToQuestions(questions),
          bannerUrl,
        });
      } catch (e) {
        // ignore
      }

      startTransition(() => {
        formAction(formData);
      });
    }
  };

  const topicValue = selectedTopic === "Other" ? customTopic : selectedTopic;

  return (
    <div className="min-h-screen bg-black text-white font-sans pt-28 pb-12">
      <div className="container mx-auto max-w-7xl px-4">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                Blitz Editor
              </h1>
              <p className="text-zinc-400 mt-2 text-lg">
                Use the form on the left to build your question and see a live preview on the right.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isPublished && (
                <button
                  type="button"
                  onClick={handleToggleVisibility}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isHidden
                      ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                      : 'bg-zinc-800 text-green-400 hover:text-green-300'
                  }`}
                  title={isHidden ? 'Blitz is hidden — click to make public' : 'Blitz is public — click to hide'}
                >
                  {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {isHidden ? 'Hidden' : 'Public'}
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
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
                <label className="block text-sm font-medium text-gray-300">Blitz Banner</label>
                <div className="mt-1 flex items-center gap-4">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Banner preview" className="h-24 w-auto rounded-md object-cover" />
                  ) : (
                    <div className="h-24 w-40 bg-zinc-800 rounded-md flex items-center justify-center text-zinc-500">No banner</div>
                  )}
                  <div>
                    <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-indigo-400 hover:text-indigo-300">
                      <span>{uploadingBanner ? 'Uploading...' : 'Upload banner'}</span>
                      <input type="file" accept="image/*" onChange={handleBannerUpload} className="sr-only" disabled={uploadingBanner} />
                    </label>
                  </div>
                </div>
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
            <SubmitButton isPublished={isPublished} />
          </div>
          {state.message && <p className="mt-4 text-sm text-red-500 text-center">{state.message}</p>}
        </form>
      </div>
    </div>
  );
}
