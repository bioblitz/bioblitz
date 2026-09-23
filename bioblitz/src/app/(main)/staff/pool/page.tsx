"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { PoolQuestion } from "@/types";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_TOPICS,
} from "@/lib/questionShape";
import PoolQuestionCard from "@/components/features/pool/PoolQuestionCard";
import PoolQuestionModal from "@/components/features/pool/PoolQuestionModal";
import AiIngestModal from "@/components/features/pool/AiIngestModal";
import CreateSetModal, {
  PoolFilters,
} from "@/components/features/pool/CreateSetModal";
import { ChevronLeft, Plus, RefreshCw, Sparkles, Wand2 } from "lucide-react";

const emptyFilters: PoolFilters = {
  topic: "",
  difficulty: "",
  source: "",
  usage: "all",
};

export default function QuestionPoolPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [questions, setQuestions] = useState<PoolQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [filters, setFilters] = useState<PoolFilters>(emptyFilters);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<PoolQuestion | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showCreateSet, setShowCreateSet] = useState(false);

  const getToken = useCallback(
    async () => (await getAuth(app).currentUser?.getIdToken()) ?? null,
    [],
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/auth");
      return;
    }
    const roles = Array.isArray(user.roles)
      ? user.roles.map((role: unknown) => String(role).toLowerCase())
      : [];
    setAuthorized(roles.includes("admin") || roles.includes("staff"));
  }, [loading, router, user]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadQuestions = useCallback(async () => {
    if (!authorized) return;
    setFetching(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("You are signed out. Sign in again.");

      const params = new URLSearchParams();
      if (filters.topic) params.set("topic", filters.topic);
      if (filters.difficulty) params.set("difficulty", filters.difficulty);
      if (filters.source) params.set("source", filters.source);
      if (filters.usage && filters.usage !== "all") params.set("usage", filters.usage);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/staff/question-pool?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load the pool.");

      setQuestions(data.questions || []);
      setTotal(data.total || 0);
      setTruncated(data.truncated === true);
    } catch (err: any) {
      setError(err?.message || "Failed to load the pool.");
    } finally {
      setFetching(false);
    }
  }, [authorized, debouncedSearch, filters, getToken]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const visibleIds = useMemo(() => questions.map((q) => q.id), [questions]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const unusedCount = useMemo(
    () => questions.filter((q) => q.usageCount === 0).length,
    [questions],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const flashNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleDelete = async (question: PoolQuestion, force = false) => {
    if (!force && !confirm("Delete this question from the pool?")) return;
    try {
      const token = await getToken();
      if (!token) throw new Error("You are signed out. Sign in again.");

      const res = await fetch(
        `/api/staff/question-pool/${question.id}${force ? "?force=true" : ""}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        if (confirm(`${data?.error} Delete it from the pool anyway?`)) {
          await handleDelete(question, true);
        }
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to delete question.");

      setSelectedIds((prev) => prev.filter((id) => id !== question.id));
      flashNotice("Question deleted from the pool.");
      loadQuestions();
    } catch (err: any) {
      setError(err?.message || "Failed to delete question.");
    }
  };

  if (loading || authorized === null) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100">
        <div className="mx-auto max-w-5xl px-4 py-20">Loading...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <h1 className="mb-4 text-3xl font-bold">Access Denied</h1>
          <p className="text-neutral-400">
            You do not have permission to view this page.
          </p>
          <Link
            href="/home"
            className="mt-6 inline-block text-sm text-neutral-400 transition-colors hover:text-neutral-300"
          >
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const selectClass =
    "rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-neutral-600 focus:outline-none";

  return (
    <div className="min-h-screen bg-neutral-900 pb-20 pt-20 text-neutral-100">
      {showEditor && (
        <PoolQuestionModal
          question={editing}
          getToken={getToken}
          onClose={() => {
            setShowEditor(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowEditor(false);
            setEditing(null);
            flashNotice("Pool updated.");
            loadQuestions();
          }}
        />
      )}

      {showAi && (
        <AiIngestModal
          getToken={getToken}
          onClose={() => setShowAi(false)}
          onAdded={(count) => {
            setShowAi(false);
            flashNotice(`Added ${count} question${count === 1 ? "" : "s"} to the pool.`);
            loadQuestions();
          }}
        />
      )}

      {showCreateSet && (
        <CreateSetModal
          selectedIds={selectedIds}
          filters={filters}
          getToken={getToken}
          onClose={() => setShowCreateSet(false)}
          onCreated={() => {
            setSelectedIds([]);
            loadQuestions();
          }}
        />
      )}

      <div className="mx-auto max-w-5xl px-4">
        <Link
          href="/staff"
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Staff
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Question Pool</h1>
            <p className="mt-1 text-sm text-neutral-400">
              {total} question{total === 1 ? "" : "s"} in the pool ·{" "}
              {questions.length} shown · {unusedCount} of those never used
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAi(true)}
              className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
            >
              <Sparkles className="h-4 w-4" />
              Add with AI
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setShowEditor(true);
              }}
              className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-200 transition-colors hover:bg-neutral-800"
            >
              <Plus className="h-4 w-4" />
              Add manually
            </button>
            <button
              type="button"
              onClick={() => setShowCreateSet(true)}
              className="flex items-center gap-2 rounded-lg bg-neutral-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-600"
            >
              <Wand2 className="h-4 w-4" />
              Create set
              {selectedIds.length > 0 && ` (${selectedIds.length})`}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions, choices, tags..."
            className={`${selectClass} min-w-[220px] flex-1 placeholder:text-neutral-600`}
          />
          <select
            value={filters.topic}
            onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value }))}
            className={selectClass}
          >
            <option value="">All categories</option>
            {QUESTION_TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={filters.difficulty}
            onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))}
            className={selectClass}
          >
            <option value="">All difficulties</option>
            {QUESTION_DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={filters.source}
            onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
            className={selectClass}
          >
            <option value="">Any author</option>
            <option value="manual">Staff-written</option>
            <option value="ai">AI-written</option>
          </select>
          <select
            value={filters.usage}
            onChange={(e) => setFilters((f) => ({ ...f, usage: e.target.value }))}
            className={selectClass}
          >
            <option value="all">Used or not</option>
            <option value="unused">Never used</option>
            <option value="used">Already used</option>
          </select>
          <button
            type="button"
            onClick={loadQuestions}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-neutral-400 transition-colors hover:text-white"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${fetching ?"animate-spin" :""}`} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          <button
            type="button"
            onClick={() => setSelectedIds(visibleIds)}
            className="transition-colors hover:text-neutral-300"
          >
            Select all shown
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="transition-colors hover:text-neutral-300"
          >
            Clear selection
          </button>
          {selectedIds.length > 0 && (
            <span className="text-neutral-400">{selectedIds.length} selected</span>
          )}
        </div>

        {truncated && (
          <p className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-2 text-xs text-neutral-500">
            Showing the most recent 1000 questions in the pool. Narrow the
            filters to reach older ones.
          </p>
        )}

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {fetching && questions.length === 0 ? (
            <p className="text-sm text-neutral-500">Loading questions...</p>
          ) : questions.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-10 text-center">
              <p className="text-sm text-neutral-400">
                No questions match these filters.
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                Add some with AI, or write one manually.
              </p>
            </div>
          ) : (
            questions.map((question) => (
              <PoolQuestionCard
                key={question.id}
                question={question}
                selected={selectedSet.has(question.id)}
                onToggleSelect={toggleSelect}
                onEdit={(q) => {
                  setEditing(q);
                  setShowEditor(true);
                }}
                onDelete={(q) => handleDelete(q)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
