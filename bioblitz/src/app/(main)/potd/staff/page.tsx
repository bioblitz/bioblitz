"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { uploadImage } from "@/lib/storage";
import {
  Calendar,
  ChevronUp,
  ChevronDown,
  Pencil,
  RefreshCw,
  Plus,
  X,
  Loader2,
  ImageIcon,
  Trash2,
} from "lucide-react";

const topics = [
  "Anatomy & Physiology",
  "Cell Biology",
  "Plant Biology",
  "Genetics & Evolution",
  "Biosystematics",
  "Ecology",
  "Ethology",
  "Multiple",
  "General",
];

type QueueActivity = {
  attempts: number;
  correctCount: number;
  lastPlayedAt: string | null;
};

type QueueItem = {
  id: string;
  title: string;
  question: string;
  explanation?: string;
  topic: string;
  status: string;
  orderIndex: number;
  date?: string | null;
  imageUrl?: string;
  imageAlt?: string;
  multiSelect?: boolean;
  options?: { key: string; text: string }[];
  correct?: string[];
  activity?: QueueActivity;
};

type PotdForm = {
  title: string;
  question: string;
  explanation: string;
  topic: string;
  options: Record<string, string>;
  correct: string[];
  multiSelect: boolean;
  date: string;
  status: string;
  imageAlt: string;
};

const emptyForm: PotdForm = {
  title: "",
  question: "",
  explanation: "",
  topic: "Anatomy & Physiology",
  options: { a: "", b: "", c: "", d: "", e: "" },
  correct: [],
  multiSelect: false,
  date: "",
  status: "queued",
  imageAlt: "",
};

function itemToForm(item: QueueItem): PotdForm {
  const optionsMap: Record<string, string> = { a: "", b: "", c: "", d: "", e: "" };
  (item.options || []).forEach(({ key, text }) => {
    if (key in optionsMap) optionsMap[key] = text;
  });
  return {
    title: item.title || "",
    question: item.question || "",
    explanation: item.explanation || "",
    topic: item.topic || "General",
    options: optionsMap,
    correct: item.correct || [],
    multiSelect: item.multiSelect || false,
    date: item.date || "",
    status: item.status || "queued",
    imageAlt: item.imageAlt || "",
  };
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function statusColor(status: string) {
  if (status === "published") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (status === "scheduled") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  return "bg-zinc-800 text-zinc-400 border-zinc-700";
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function QueueSkeleton() {
  return (
    <div className="grid gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 flex gap-4 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-4 bg-zinc-800 rounded w-1/3" />
            <div className="h-3 bg-zinc-800 rounded w-2/3" />
            <div className="h-3 bg-zinc-800 rounded w-1/4" />
          </div>
          <div className="w-20 h-14 rounded-xl bg-zinc-800 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────
function PotdFormFields({
  form,
  onChange,
  imagePreview,
  onImageChange,
}: {
  form: PotdForm;
  onChange: (next: PotdForm) => void;
  imagePreview: string | null;
  onImageChange: (file: File | null) => void;
}) {
  const set = (partial: Partial<PotdForm>) => onChange({ ...form, ...partial });

  const toggleCorrect = (key: string) => {
    const next = form.correct.includes(key)
      ? form.correct.filter((k) => k !== key)
      : [...form.correct, key];
    set({ correct: next });
  };

  const inputCls = "w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";
  const labelCls = "block text-xs text-zinc-500 mb-1";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Title</label>
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Question</label>
          <textarea value={form.question} onChange={(e) => set({ question: e.target.value })} rows={4} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Explanation</label>
          <textarea value={form.explanation} onChange={(e) => set({ explanation: e.target.value })} rows={3} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Topic</label>
            <select value={form.topic} onChange={(e) => set({ topic: e.target.value })} className={inputCls}>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => set({ status: e.target.value })} className={inputCls}>
              <option value="queued">Queued</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Scheduled date</label>
            <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} className={inputCls} />
          </div>
          <div className="flex items-end pb-2 gap-2">
            <input
              type="checkbox"
              id="multiSelect"
              checked={form.multiSelect}
              onChange={(e) => set({ multiSelect: e.target.checked })}
              className="accent-orange-400"
            />
            <label htmlFor="multiSelect" className="text-sm text-zinc-400">Multi-select</label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onImageChange(e.target.files?.[0] || null)}
            className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:text-zinc-300 hover:file:bg-zinc-700"
          />
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="mt-3 rounded-xl border border-zinc-800 max-h-40 object-cover" />
          )}
          <input
            value={form.imageAlt}
            onChange={(e) => set({ imageAlt: e.target.value })}
            placeholder="Image alt text"
            className={`mt-2 ${inputCls}`}
          />
        </div>

        <div>
          <label className={labelCls}>Options — check the correct answer(s)</label>
          <div className="space-y-2">
            {Object.entries(form.options).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.correct.includes(key)}
                  onChange={() => toggleCorrect(key)}
                  className="accent-orange-400 shrink-0"
                />
                <span className="text-xs text-zinc-500 w-4 font-mono">{key}</span>
                <input
                  value={value}
                  onChange={(e) =>
                    set({ options: { ...form.options, [key]: e.target.value } })
                  }
                  className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PotdStaffPage() {
  const router = useRouter();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState<PotdForm>(emptyForm);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editingItem, setEditingItem] = useState<QueueItem | null>(null);
  const [editForm, setEditForm] = useState<PotdForm>(emptyForm);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) { router.push("/auth"); return; }
      setUser(currentUser);
      const access = await checkStaffAccess(currentUser.uid, currentUser);
      setHasAccess(access);
      setLoading(false);
      if (access) fetchQueue(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  const checkStaffAccess = async (uid: string, currentUser: any) => {
    try {
      const tokenResult = await currentUser.getIdTokenResult(true);
      const claims: any = tokenResult?.claims || {};
      const roles = Array.isArray(claims.roles)
        ? claims.roles.map((r: unknown) => String(r).toLowerCase())
        : [];
      if (claims.admin === true || roles.includes("admin") || roles.includes("staff")) return true;
      const userSnap = await getDoc(doc(db, "users", uid));
      const data = userSnap.exists() ? userSnap.data() : {};
      const storedRoles = Array.isArray(data.roles)
        ? data.roles.map((r: unknown) => String(r).toLowerCase())
        : [];
      return storedRoles.includes("admin") || storedRoles.includes("staff");
    } catch { return false; }
  };

  const fetchQueue = async (currentUser: any) => {
    setLoadingQueue(true);
    setStatus(null);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/potd-queue", { headers: { Authorization: `Bearer ${idToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load queue.");
      setQueue(Array.isArray(data.queue) ? data.queue : []);
    } catch (e: any) {
      setStatus(e?.message || "Failed to load queue.");
    } finally {
      setLoadingQueue(false);
    }
  };

  const queueOrdered = useMemo(
    () => [...queue].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [queue]
  );

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!user) return;
    if (!newItem.title.trim() || !newItem.question.trim()) { setStatus("Title and question are required."); return; }
    const optionEntries = Object.entries(newItem.options).map(([key, text]) => ({ key, text: text.trim() })).filter((o) => o.text);
    if (optionEntries.length < 2) { setStatus("Add at least two options."); return; }
    if (newItem.correct.length === 0) { setStatus("Select at least one correct answer."); return; }

    setSaving(true);
    setStatus(null);
    try {
      let imageUrl = "";
      if (newImageFile) imageUrl = await uploadImage(newImageFile, `potd/queue/${Date.now()}-${newImageFile.name}`);

      const idToken = await user.getIdToken();
      const res = await fetch("/api/potd-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ ...newItem, options: optionEntries, date: newItem.date || null, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create.");
      setNewItem(emptyForm);
      setNewImageFile(null);
      setNewImagePreview(null);
      setShowForm(false);
      fetchQueue(user);
    } catch (e: any) {
      setStatus(e?.message || "Failed to create.");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const openEdit = (item: QueueItem) => {
    setEditingItem(item);
    setEditForm(itemToForm(item));
    setEditImageFile(null);
    setEditImagePreview(item.imageUrl || null);
  };

  const handleEdit = async () => {
    if (!user || !editingItem) return;
    const optionEntries = Object.entries(editForm.options).map(([key, text]) => ({ key, text: text.trim() })).filter((o) => o.text);
    if (optionEntries.length < 2) { setStatus("Add at least two options."); return; }
    if (editForm.correct.length === 0) { setStatus("Select at least one correct answer."); return; }

    setEditSaving(true);
    setStatus(null);
    try {
      let imageUrl = editingItem.imageUrl || "";
      if (editImageFile) imageUrl = await uploadImage(editImageFile, `potd/queue/${Date.now()}-${editImageFile.name}`);

      const idToken = await user.getIdToken();
      const res = await fetch(`/api/potd-queue/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ ...editForm, options: optionEntries, date: editForm.date || null, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update.");
      setEditingItem(null);
      fetchQueue(user);
    } catch (e: any) {
      setStatus(e?.message || "Failed to update.");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Reorder ─────────────────────────────────────────────────────────────────
  const handleReorder = async (next: QueueItem[]) => {
    if (!user) return;
    setStatus(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/potd-queue/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderedIds: next.map((i) => i.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to reorder.");
      setQueue(next.map((item, idx) => ({ ...item, orderIndex: idx })));
    } catch (e: any) {
      setStatus(e?.message || "Failed to reorder.");
    }
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    const current = [...queueOrdered];
    const index = current.findIndex((item) => item.id === id);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    handleReorder(next);
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (item: QueueItem) => {
    if (!user) return;
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setStatus(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/potd-queue/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete.");
      setQueue((prev) => prev.filter((q) => q.id !== item.id));
    } catch (e: any) {
      setStatus(e?.message || "Failed to delete.");
    }
  };

  // ── Auth loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-neutral-900 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access denied</h1>
          <p className="text-zinc-500">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-14">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">POTD Queue</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {queueOrdered.length} problem{queueOrdered.length !== 1 ? "s" : ""} queued
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchQueue(user)}
              disabled={loadingQueue}
              className="p-2 rounded-xl border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loadingQueue ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15 text-sm font-medium transition-colors"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Close" : "Add POTD"}
            </button>
            <Link
              href="/potd"
              className="px-3 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 text-sm transition-colors"
            >
              Back to POTD
            </Link>
          </div>
        </div>

        {/* Status banner */}
        {status && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span className="flex-1">{status}</span>
            <button onClick={() => setStatus(null)} className="text-red-400 hover:text-red-200 shrink-0 mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
            <h2 className="text-sm font-semibold text-white mb-5">New POTD</h2>
            <PotdFormFields
              form={newItem}
              onChange={setNewItem}
              imagePreview={newImagePreview}
              onImageChange={(f) => {
                setNewImageFile(f);
                setNewImagePreview(f ? URL.createObjectURL(f) : null);
              }}
            />
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-black text-sm font-semibold hover:bg-orange-400 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Saving…" : "Save to queue"}
              </button>
              <button
                onClick={() => { setNewItem(emptyForm); setNewImageFile(null); setNewImagePreview(null); }}
                className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Queue list */}
        {loadingQueue ? (
          <QueueSkeleton />
        ) : queueOrdered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-600">
            No problems in queue yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {queueOrdered.map((item, index) => (
              <div
                key={item.id}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 flex gap-4 hover:border-zinc-700 transition-colors"
              >
                {/* Position + reorder */}
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <button
                    onClick={() => moveItem(item.id, "up")}
                    disabled={index === 0}
                    className="p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-zinc-600 tabular-nums">{index + 1}</span>
                  <button
                    onClick={() => moveItem(item.id, "down")}
                    disabled={index === queueOrdered.length - 1}
                    className="p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Image */}
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.imageAlt || item.title}
                    className="w-20 h-20 rounded-xl object-cover border border-zinc-800 shrink-0 self-start"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl border border-dashed border-zinc-800 flex items-center justify-center shrink-0 self-start">
                    <ImageIcon className="w-5 h-5 text-zinc-700" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="text-[11px] text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded-full">
                      {item.topic}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{item.question}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                    {item.date && (
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.date)}
                      </span>
                    )}
                    {!item.date && (
                      <span className="flex items-center gap-1 text-zinc-700">
                        <Calendar className="w-3 h-3" />
                        No date set
                      </span>
                    )}
                    <span>{item.activity?.attempts ?? 0} attempts</span>
                    <span>{item.activity?.correctCount ?? 0} correct</span>
                  </div>
                </div>

                {/* Edit / Delete buttons */}
                <div className="shrink-0 self-start flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-xl border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/40 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-neutral-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl mb-16">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div>
                <p className="text-white font-semibold text-sm">Edit POTD</p>
                <p className="text-zinc-500 text-xs mt-0.5 truncate max-w-xs">{editingItem.title}</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <PotdFormFields
                form={editForm}
                onChange={setEditForm}
                imagePreview={editImagePreview}
                onImageChange={(f) => {
                  setEditImageFile(f);
                  setEditImagePreview(f ? URL.createObjectURL(f) : null);
                }}
              />
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleEdit}
                  disabled={editSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {editSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editSaving ? "Saving…" : "Save changes"}
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
