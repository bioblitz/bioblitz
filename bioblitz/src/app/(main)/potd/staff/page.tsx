"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { uploadImage } from "@/lib/storage";

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
  topic: string;
  status: string;
  orderIndex: number;
  imageUrl?: string;
  imageAlt?: string;
  activity?: QueueActivity;
};

type NewPotdForm = {
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

const emptyForm: NewPotdForm = {
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

export default function PotdStaffPage() {
  const router = useRouter();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState<NewPotdForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push("/auth");
        return;
      }

      setUser(currentUser);
      const access = await checkStaffAccess(currentUser.uid, currentUser);
      setHasAccess(access);
      setLoading(false);

      if (access) {
        fetchQueue(currentUser);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const checkStaffAccess = async (uid: string, currentUser: any) => {
    try {
      const tokenResult = await currentUser.getIdTokenResult(true);
      const claims: any = tokenResult?.claims || {};
      const roles = Array.isArray(claims.roles)
        ? claims.roles.map((role: unknown) => String(role).toLowerCase())
        : [];
      if (claims.admin === true || roles.includes("admin") || roles.includes("staff")) {
        return true;
      }

      const userSnap = await getDoc(doc(db, "users", uid));
      const data = userSnap.exists() ? userSnap.data() : {};
      const storedRoles = Array.isArray(data.roles)
        ? data.roles.map((role: unknown) => String(role).toLowerCase())
        : [];
      return storedRoles.includes("admin") || storedRoles.includes("staff");
    } catch (error) {
      console.error("Failed to check staff access:", error);
      return false;
    }
  };

  const fetchQueue = async (currentUser: any) => {
    try {
      setStatus(null);
      const idToken = await currentUser.getIdToken();
      const response = await fetch("/api/potd-queue", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load queue.");
      }
      const items = Array.isArray(data.queue) ? data.queue : [];
      setQueue(items);
    } catch (error: any) {
      setStatus(error?.message || "Failed to load queue.");
    }
  };

  const queueOrdered = useMemo(() => {
    return [...queue].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [queue]);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (!file) {
      setImagePreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleToggleCorrect = (key: string) => {
    setNewItem((prev) => {
      if (prev.correct.includes(key)) {
        return { ...prev, correct: prev.correct.filter((k) => k !== key) };
      }
      return { ...prev, correct: [...prev.correct, key] };
    });
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!newItem.title.trim() || !newItem.question.trim()) {
      setStatus("Title and question are required.");
      return;
    }

    const optionEntries = Object.entries(newItem.options)
      .map(([key, text]) => ({ key, text: text.trim() }))
      .filter((opt) => opt.text);

    if (optionEntries.length < 2) {
      setStatus("Add at least two options.");
      return;
    }

    if (newItem.correct.length === 0) {
      setStatus("Select at least one correct answer.");
      return;
    }

    try {
      setSaving(true);
      setStatus(null);
      let imageUrl = "";

      if (imageFile) {
        const filePath = `potd/queue/${Date.now()}-${imageFile.name}`;
        imageUrl = await uploadImage(imageFile, filePath);
      }

      const idToken = await user.getIdToken();
      const response = await fetch("/api/potd-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: newItem.title,
          question: newItem.question,
          explanation: newItem.explanation,
          topic: newItem.topic,
          options: optionEntries,
          correct: newItem.correct,
          multiSelect: newItem.multiSelect,
          date: newItem.date || null,
          status: newItem.status,
          imageUrl,
          imageAlt: newItem.imageAlt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create queue item.");
      }

      setNewItem(emptyForm);
      setImageFile(null);
      setImagePreview(null);
      setShowForm(false);
      fetchQueue(user);
    } catch (error: any) {
      setStatus(error?.message || "Failed to create queue item.");
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (nextQueue: QueueItem[]) => {
    if (!user) return;
    try {
      setStatus(null);
      const idToken = await user.getIdToken();
      const orderedIds = nextQueue.map((item) => item.id);
      const response = await fetch("/api/potd-queue/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to update order.");
      }
      setQueue(nextQueue.map((item, index) => ({ ...item, orderIndex: index })));
    } catch (error: any) {
      setStatus(error?.message || "Failed to update order.");
    }
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    const current = [...queueOrdered];
    const index = current.findIndex((item) => item.id === id);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;

    const next = [...current];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    handleReorder(next);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-zinc-100">
        <div className="max-w-6xl mx-auto px-4 py-20">Loading...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-neutral-900 text-zinc-100">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-zinc-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">POTD Queue</h1>
            <p className="text-zinc-500">Manage upcoming problems and ordering.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchQueue(user)}
              className="px-4 py-2 rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowForm((prev) => !prev)}
              className="px-4 py-2 rounded-full border border-orange-500/60 text-orange-200 hover:text-white hover:border-orange-400 transition-colors"
            >
              {showForm ? "Close Form" : "Add POTD"}
            </button>
            <Link
              href="/potd"
              className="px-4 py-2 rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
            >
              Back to POTD
            </Link>
          </div>
        </div>

        {status && (
          <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
            {status}
          </div>
        )}

        {showForm && (
          <div className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase text-zinc-500">Title</label>
                  <input
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    className="mt-1 w-full rounded-lg bg-neutral-900 border border-zinc-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-zinc-500">Question</label>
                  <textarea
                    value={newItem.question}
                    onChange={(e) => setNewItem({ ...newItem, question: e.target.value })}
                    rows={4}
                    className="mt-1 w-full rounded-lg bg-neutral-900 border border-zinc-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-zinc-500">Explanation</label>
                  <textarea
                    value={newItem.explanation}
                    onChange={(e) => setNewItem({ ...newItem, explanation: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-lg bg-neutral-900 border border-zinc-800 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase text-zinc-500">Topic</label>
                    <select
                      value={newItem.topic}
                      onChange={(e) => setNewItem({ ...newItem, topic: e.target.value })}
                      className="mt-1 w-full rounded-lg bg-neutral-900 border border-zinc-800 px-3 py-2 text-sm"
                    >
                      {topics.map((topic) => (
                        <option key={topic} value={topic}>
                          {topic}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase text-zinc-500">Status</label>
                    <select
                      value={newItem.status}
                      onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                      className="mt-1 w-full rounded-lg bg-neutral-900 border border-zinc-800 px-3 py-2 text-sm"
                    >
                      <option value="queued">Queued</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase text-zinc-500">Scheduled Date</label>
                    <input
                      type="date"
                      value={newItem.date}
                      onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                      className="mt-1 w-full rounded-lg bg-neutral-900 border border-zinc-800 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={newItem.multiSelect}
                      onChange={(e) => setNewItem({ ...newItem, multiSelect: e.target.checked })}
                    />
                    <span className="text-sm text-zinc-400">Multi-select</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase text-zinc-500">Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm text-zinc-300"
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mt-3 rounded-lg border border-zinc-800 max-h-48 object-cover"
                    />
                  )}
                  <input
                    value={newItem.imageAlt}
                    onChange={(e) => setNewItem({ ...newItem, imageAlt: e.target.value })}
                    placeholder="Image alt text"
                    className="mt-3 w-full rounded-lg bg-neutral-900 border border-zinc-800 px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs uppercase text-zinc-500">Options</label>
                  {Object.entries(newItem.options).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={newItem.correct.includes(key)}
                        onChange={() => handleToggleCorrect(key)}
                      />
                      <span className="text-xs uppercase text-zinc-500 w-4">{key}</span>
                      <input
                        value={value}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            options: { ...newItem.options, [key]: e.target.value },
                          })
                        }
                        className="flex-1 rounded-lg bg-neutral-900 border border-zinc-800 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-5 py-2 rounded-full bg-orange-500 text-black font-semibold hover:bg-orange-400 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save to Queue"}
              </button>
              <button
                onClick={() => {
                  setNewItem(emptyForm);
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="px-4 py-2 rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {queueOrdered.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-zinc-500">
              No queued problems yet.
            </div>
          ) : (
            queueOrdered.map((item, index) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 flex flex-col lg:flex-row gap-6"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-zinc-600">#{index + 1}</div>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.imageAlt || item.title}
                      className="h-20 w-32 rounded-lg object-cover border border-zinc-800"
                    />
                  ) : (
                    <div className="h-20 w-32 rounded-lg border border-dashed border-zinc-700 flex items-center justify-center text-xs text-zinc-600">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <span className="text-xs uppercase tracking-widest text-zinc-500 border border-zinc-800 px-2 py-1 rounded-full">
                      {item.topic}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-orange-200 border border-orange-500/40 px-2 py-1 rounded-full">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2">{item.question}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                    <span>Attempts: {item.activity?.attempts ?? 0}</span>
                    <span>Correct: {item.activity?.correctCount ?? 0}</span>
                    <span>
                      Last played: {item.activity?.lastPlayedAt
                        ? new Date(item.activity.lastPlayedAt).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => moveItem(item.id, "up")}
                    className="px-3 py-1 rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-sm"
                    disabled={index === 0}
                  >
                    Move Up
                  </button>
                  <button
                    onClick={() => moveItem(item.id, "down")}
                    className="px-3 py-1 rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-sm"
                    disabled={index === queueOrdered.length - 1}
                  >
                    Move Down
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
