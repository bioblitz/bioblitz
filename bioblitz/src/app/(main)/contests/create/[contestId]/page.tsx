"use client";

import React, {
  useState,
  useActionState,
  useMemo,
  useEffect,
  useCallback,
  startTransition,
  useRef,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QuestionEditorForm from "@/components/forms/QuestionEditorForm";
import { EditableQuestion } from "@/types";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { createContest } from "@/lib/actions";
import { uploadImage } from "@/lib/storage";
import { auth } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";
import { debounce } from "@/lib/utils";
import ImageUploadZone from "@/components/ui/ImageUploadZone";

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

function SubmitButton({
  isPublished,
  publishing,
}: {
  isPublished: boolean;
  publishing: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={publishing}
      className="bg-neutral-600 hover:bg-neutral-500 disabled:opacity-50 text-white text-sm font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
    >
      {publishing && (
        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {publishing
        ? isPublished
          ? "Updating..."
          : "Publishing..."
        : isPublished
          ? "Update Blitz"
          : "Publish Blitz"}
    </button>
  );
}

const TOPICS = [
  "Anatomy & Physiology",
  "Cell Biology",
  "Plant Biology",
  "Genetics & Evolution",
  "Biosystematics",
  "Ecology",
  "Ethology",
  "Multiple",
  "Other",
];

export default function EditContestPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeContestId = (params as any)?.contestId as string | undefined;
  const postAsUsername = searchParams?.get("postAs")?.trim() || "";

  const [state, formAction] = useActionState(createContest, initialState);
  const [questions, setQuestions] = useState<EditableQuestion[]>([
    initialQuestion(),
  ]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(
    questions[0]?.id || null,
  );
  const [contestId, setContestId] = useState<string | null>(
    routeContestId || null,
  );

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
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [currentEditorIndex, setCurrentEditorIndex] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [fetchingContest, setFetchingContest] = useState(!!routeContestId);
  const isFetchingRef = useRef(!!routeContestId);
  const navigateToNewRef = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const lastSavedSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        user.getIdToken().then((token) => {
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
      setFetchingContest(true);
      isFetchingRef.current = true;
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
            setIsPublished(contest.status === "completed");
            setIsHidden(contest.hidden === true);
            setIsAiGenerated(contest.isAiGenerated === true);
            if (
              contest.questions &&
              Array.isArray(contest.questions) &&
              contest.questions.length > 0
            ) {
              const choiceKeys = ["a", "b", "c", "d", "e"] as const;
              const editable = (contest.questions as any[]).map((q) => {
                const choices = choiceKeys
                  .filter((k) => q[k])
                  .map((k, idx) => ({
                    id: String(idx + 1),
                    text: q[k] as string,
                  }));
                const correctIndex = choiceKeys.indexOf(
                  q.correct as (typeof choiceKeys)[number],
                );
                return {
                  id: q.id || Date.now().toString(),
                  content: q.content || "",
                  imageUrl: q.imgURL || "",
                  choices,
                  correctAnswerId:
                    correctIndex >= 0 ? String(correctIndex + 1) : "",
                  solution: q.solution || "",
                } as EditableQuestion;
              });
              setQuestions(editable);
              setActiveQuestionId(editable[0]?.id || null);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch contest:", err);
      } finally {
        setFetchingContest(false);
        isFetchingRef.current = false;
      }
    }
    fetchContest();
  }, [routeContestId]);

  const addQuestion = () => {
    const newQuestion = initialQuestion();
    navigateToNewRef.current = true;
    setQuestions((prev) => [...prev, newQuestion]);
    setActiveQuestionId(newQuestion.id);
  };

  useEffect(() => {
    if (navigateToNewRef.current && !fetchingContest) {
      navigateToNewRef.current = false;
      setCurrentEditorIndex(questions.length - 1);
      if (carouselRef.current) {
        const top =
          carouselRef.current.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  }, [questions, fetchingContest]);

  const removeQuestion = (id: string) => {
    const newQuestions = questions.filter((q) => q.id !== id);
    setQuestions(newQuestions);
    if (activeQuestionId === id) {
      setActiveQuestionId(newQuestions[0]?.id || null);
    }
    setCurrentEditorIndex((prev) =>
      Math.min(prev, Math.max(0, newQuestions.length - 1)),
    );
  };

  const handleQuestionChange = (
    id: string,
    updatedQuestion: EditableQuestion,
  ) => {
    const newQuestions = questions.map((q) =>
      q.id === id ? updatedQuestion : q,
    );
    setQuestions(newQuestions);
  };

  function cleanHtml(html: string): string {
    return html.replace(/&nbsp;/g, " ");
  }

  const convertToQuestions = (editableQuestions: EditableQuestion[]) => {
    const choiceKeys = ["a", "b", "c", "d", "e"] as const;
    return editableQuestions.map((eq) => {
      const correctIndex = eq.choices.findIndex(
        (c) => c.id === eq.correctAnswerId,
      );
      const correctLetter = correctIndex >= 0 ? choiceKeys[correctIndex] : "";
      const q: Record<string, string> = {
        id: eq.id,
        content: cleanHtml(eq.content),
        correct: correctLetter,
        imgURL: eq.imageUrl || "",
        solution: eq.solution || "",
      };
      eq.choices.forEach((choice, idx) => {
        if (idx < choiceKeys.length) q[choiceKeys[idx]] = choice.text;
      });
      return q;
    });
  };

  useEffect(() => {
    if (state.message?.startsWith("Blitz saved with ID:")) {
      const wasAlreadyPublished = isPublished;
      setIsPublished(true);
      setIsHidden(false);

      if (!wasAlreadyPublished && contestId) {
        (async () => {
          try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;
            await fetch("/api/notifications/contest-published", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                gameId: contestId,
                gameTitle: title,
              }),
            });
          } catch (err) {
            console.error("Failed to notify subscribers:", err);
          }
        })();
      }
    }
  }, [state.message]);

  const flashSaved = useCallback(() => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2500);
  }, []);

  const handleToggleVisibility = async () => {
    if (!contestId) return;
    const newHidden = !isHidden;
    setIsHidden(newHidden);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      await fetch(`/api/contests/${contestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: token,
          hidden: newHidden,
          postAsUsername: postAsUsername || undefined,
        }),
      });
    } catch (e) {
      setIsHidden(!newHidden);
    }
  };

  const handleDelete = async () => {
    if (!contestId) return;
    if (
      !confirm(
        "Are you sure you want to delete this Blitz? This cannot be undone.",
      )
    )
      return;
    setDeleting(true);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(`/api/contests/${contestId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: token,
          postAsUsername: postAsUsername || undefined,
        }),
      });
      if (res.ok) router.push("/contests");
    } catch (e) {
      console.error("Failed to delete blitz:", e);
    } finally {
      setDeleting(false);
    }
  };

  const handleBannerFile = async (file: File) => {
    if (!contestId) return;
    setUploadingBanner(true);
    try {
      const downloadURL = await uploadImage(file, `contests/${contestId}/banner`);
      setBannerUrl(downloadURL);
    } catch (error) {
      console.error("Error uploading banner image:", error);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleBannerFile(file);
  };

  const handleSaveDraft = useCallback(async () => {
    if (!contestId) return;

    const token = await auth.currentUser?.getIdToken(true);
    if (!token) return;
    setIdToken(token);

    const snapshot = JSON.stringify({
      title,
      description,
      timeLimit,
      topic: selectedTopic,
      questions: convertToQuestions(questions),
      bannerUrl,
    });

    if (lastSavedSnapshotRef.current === snapshot) return;

    const formData = new FormData();
    formData.append("contestId", contestId);
    formData.append("idToken", token);
    if (postAsUsername) {
      formData.append("postAsUsername", postAsUsername);
    }
    formData.append("questions", JSON.stringify(convertToQuestions(questions)));
    formData.append("title", title);
    formData.append("description", description);
    formData.append("timeLimit", timeLimit.toString());
    formData.append(
      "topic",
      selectedTopic === "Other" ? customTopic : selectedTopic,
    );
    formData.append("status", isPublished ? "completed" : "incomplete");
    formData.append("hidden", isPublished ? isHidden.toString() : "true");
    formData.append("isAiGenerated", isAiGenerated.toString());
    if (bannerUrl) {
      formData.append("bannerUrl", bannerUrl);
    }

    try {
      lastSavedSnapshotRef.current = snapshot;
      startTransition(() => {
        formAction(formData);
      });
      flashSaved();
      console.log("Contest draft saved automatically.");
    } catch (error) {
      console.error("Failed to autosave draft:", error);
      lastSavedSnapshotRef.current = null;
    }
  }, [
    contestId,
    postAsUsername,
    questions,
    title,
    description,
    timeLimit,
    selectedTopic,
    customTopic,
    bannerUrl,
  ]);

  useEffect(() => {
    if (fetchingContest || isFetchingRef.current) return;
    const timer = setTimeout(() => {
      handleSaveDraft();
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, description, timeLimit, selectedTopic, customTopic, questions, bannerUrl, isAiGenerated, fetchingContest, handleSaveDraft]);

  useEffect(() => {
    if (!contestId) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isFetchingRef.current) return;
      try {
        const payload = {
          idToken: idToken,
          postAsUsername: postAsUsername || undefined,
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
          const blob = new Blob([JSON.stringify(payload)], {
            type: "application/json",
          });
          navigator.sendBeacon(url, blob);
        } else {
          fetch(url, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" },
            keepalive: true,
          }).catch(() => {});
        }
      } catch (e) {}
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [
    contestId,
    idToken,
    postAsUsername,
    questions,
    title,
    description,
    timeLimit,
    selectedTopic,
    customTopic,
    bannerUrl,
    isPublished,
    isHidden,
  ]);

  const validateAndSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const newErrors: Record<string, string[]> = {};
    let isValid = true;

    if (!title.trim()) {
      newErrors.title = ["Title cannot be empty."];
      isValid = false;
    }
    if (questions.length < 3) {
      newErrors.general = ["A blitz must have at least 3 questions."];
      isValid = false;
    }
    if (timeLimit <= 0) {
      newErrors.timeLimit = ["Time limit must be a positive number."];
      isValid = false;
    }
    if (
      !selectedTopic.trim() ||
      (selectedTopic === "Other" && !customTopic.trim())
    ) {
      newErrors.topic = ["Topic cannot be empty."];
      isValid = false;
    }

    questions.forEach((q) => {
      const questionErrors: string[] = [];
      if (!q.content.trim()) {
        questionErrors.push("Question content cannot be empty.");
        isValid = false;
      }
      if (q.choices.length === 0) {
        questionErrors.push(
          "Each question must have at least one answer choice.",
        );
        isValid = false;
      }
      q.choices.forEach((c) => {
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
      setPublishing(true);
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        setErrors({ general: ["You must be logged in to submit the Blitz."] });
        setPublishing(false);
        return;
      }
      setIdToken(token);

      const formData = new FormData();
      formData.append("contestId", contestId || "");
      formData.append("idToken", token);
      if (postAsUsername) {
        formData.append("postAsUsername", postAsUsername);
      }
      formData.append(
        "questions",
        JSON.stringify(convertToQuestions(questions)),
      );
      formData.append("title", title);
      formData.append("description", description);
      formData.append("timeLimit", timeLimit.toString());
      formData.append(
        "topic",
        selectedTopic === "Other" ? customTopic : selectedTopic,
      );
      if (bannerUrl) {
        formData.append("bannerUrl", bannerUrl);
      }
      formData.append("status", "completed");
      formData.append("hidden", "false");
      formData.append("isAiGenerated", isAiGenerated.toString());

      try {
        lastSavedSnapshotRef.current = JSON.stringify({
          title,
          description,
          timeLimit,
          topic: selectedTopic === "Other" ? customTopic : selectedTopic,
          questions: convertToQuestions(questions),
          bannerUrl,
        });
      } catch (e) {}

      startTransition(() => {
        formAction(formData);
      });
      flashSaved();
      setPublishing(false);
    }
  };

  const topicValue = selectedTopic === "Other" ? customTopic : selectedTopic;

  const inputClass =
    "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans pt-24 pb-16 pl-14">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Blitz Editor
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              Build and edit your blitz.
            </p>
            {postAsUsername && (
              <p className="text-xs text-neutral-300 mt-1">
                Posting as{" "}
                <span className="font-semibold">{postAsUsername}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPublished && (
              <button
                type="button"
                onClick={handleToggleVisibility}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  isHidden
                    ? "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
                    : "border-green-800/60 text-green-400 hover:bg-green-900/20"
                }`}
              >
                {isHidden ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                {isHidden ? "Hidden" : "Public"}
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-700 text-red-400 hover:text-red-300 hover:border-red-800/60 hover:bg-red-900/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        <form onSubmit={validateAndSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Questions editor — takes 2/3 */}
            <div className="lg:col-span-2 space-y-8">
              <section ref={carouselRef}>
                <h2 className="text-xs font-semibold text-zinc-500 mb-3">
                  Questions ({questions.length})
                </h2>
                <div className="space-y-4">
                  {/* Carousel nav */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentEditorIndex((i) => Math.max(0, i - 1))
                      }
                      disabled={currentEditorIndex === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-[13px] rounded-lg hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </button>
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${((currentEditorIndex + 1) / questions.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-zinc-400 text-[11px] font-[700] tabular-nums shrink-0">
                      {currentEditorIndex + 1} / {questions.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentEditorIndex((i) =>
                          Math.min(questions.length - 1, i + 1),
                        )
                      }
                      disabled={currentEditorIndex === questions.length - 1}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-[13px] rounded-lg hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Current question editor */}
                  <div className="relative">
                    {questions[currentEditorIndex] && (
                      <div
                        className={`rounded-xl border border-zinc-800 overflow-hidden${fetchingContest ? " invisible pointer-events-none" : ""}`}
                      >
                        <div className="flex justify-between items-center px-5 py-3 bg-zinc-900 border-b border-zinc-800">
                          <span className="text-sm font-semibold text-zinc-300">
                            Question {currentEditorIndex + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              removeQuestion(questions[currentEditorIndex].id)
                            }
                            disabled={questions.length === 1}
                            className="p-1 text-zinc-600 hover:text-red-400 transition-colors rounded disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {errors[questions[currentEditorIndex].id] && (
                          <div className="px-5 py-2 bg-red-900/10 border-b border-red-900/20">
                            {errors[questions[currentEditorIndex].id].map(
                              (err, i) => (
                                <p key={i} className="text-xs text-red-400">
                                  {err}
                                </p>
                              ),
                            )}
                          </div>
                        )}
                        <QuestionEditorForm
                          key={questions[currentEditorIndex].id}
                          question={questions[currentEditorIndex]}
                          onQuestionChange={(updated) =>
                            handleQuestionChange(
                              questions[currentEditorIndex].id,
                              updated,
                            )
                          }
                          contestId={contestId ?? ""}
                        />
                      </div>
                    )}
                    {fetchingContest && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 min-h-[200px]">
                        <div className="w-8 h-8 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
                        <span className="text-neutral-400 text-sm font-medium">
                          Loading...
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={addQuestion}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-800 hover:border-zinc-600 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add question
                  </button>
                </div>
              </section>

              <div className="flex items-center justify-between pt-1">
                {errors.general && (
                  <p className="text-sm text-red-400">{errors.general[0]}</p>
                )}
                {!errors.general && state.message && !state.message.startsWith("Blitz saved") && (
                  <p className="text-sm text-red-400">{state.message}</p>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <span
                    className={`flex items-center gap-1.5 text-xs text-green-400 transition-opacity duration-300 ${showSaved ? "opacity-100" : "opacity-0"}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Saved
                  </span>
                  {Object.keys(errors).length > 0 && (
                    <span className="text-xs text-red-400">
                      Resolve errors before publishing
                    </span>
                  )}
                  <SubmitButton
                    isPublished={isPublished}
                    publishing={publishing}
                  />
                </div>
              </div>
            </div>

            {/* Details sidebar — takes 1/3 */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
              <section>
                <button
                  type="button"
                  onClick={() => setDetailsOpen((v) => !v)}
                  className="flex items-center gap-2 mb-3 group w-full text-left"
                >
                  <h2 className="text-xs font-semibold text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    Blitz Details
                  </h2>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-all ${detailsOpen ? "" : "-rotate-90"}`}
                  />
                </button>
                {detailsOpen && (
                  <div className="relative">
                    {fetchingContest && (
                      <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 min-h-[120px] z-10">
                        <div className="w-7 h-7 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
                        <span className="text-neutral-400 text-sm font-medium">
                          Loading...
                        </span>
                      </div>
                    )}
                    <div
                      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4${fetchingContest ? " invisible pointer-events-none" : ""}`}
                    >
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                          Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="e.g. First 10 questions from the 2013 USABO Opens"
                          className={`${inputClass} resize-none`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                            Time Limit (seconds)
                          </label>
                          <input
                            type="number"
                            value={timeLimit}
                            onChange={(e) =>
                              setTimeLimit(Number(e.target.value))
                            }
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                            Topic
                          </label>
                          <select
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            className={inputClass}
                          >
                            {TOPICS.map((topic) => (
                              <option key={topic} value={topic}>
                                {topic}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {selectedTopic === "Other" && (
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                            Custom Topic
                          </label>
                          <input
                            type="text"
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                          Banner Image
                        </label>
                        <ImageUploadZone onFile={handleBannerFile} className="flex items-center gap-3">
                          {bannerUrl ? (
                            <img
                              src={bannerUrl}
                              alt="Banner"
                              className="h-14 w-28 rounded-lg object-cover border border-zinc-700"
                            />
                          ) : (
                            <div className="h-14 w-28 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-600">
                              No banner
                            </div>
                          )}
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors">
                            {uploadingBanner ? "Uploading..." : "Upload"}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBannerUpload}
                              className="sr-only"
                              disabled={uploadingBanner}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsAiGenerated((v) => !v)}
                            className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                              isAiGenerated
                                ? "border-neutral-600/60 bg-neutral-900/20 text-neutral-300"
                                : "border-zinc-700 bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {isAiGenerated ? (
                              <span>AI</span>
                            ) : (
                              <span className="relative">
                                AI
                                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="block w-full h-px bg-zinc-500 rotate-[-20deg]" />
                                </span>
                              </span>
                            )}
                          </button>
                          <div className="relative group">
                            <div className="w-4 h-4 rounded-full border border-zinc-700 text-zinc-600 flex items-center justify-center text-[10px] font-bold cursor-default select-none hover:border-zinc-500 hover:text-zinc-400 transition-colors">
                              ?
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-[180px] px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center leading-snug">
                              Toggle if any part of your blitz is AI-generated
                            </div>
                          </div>
                        </ImageUploadZone>
                      </div>
                    </div>
                  </div>
                )}
              </section>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
