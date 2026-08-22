"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { uploadImage } from "@/lib/storage";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  RefreshCw,
  Trash2,
  ImageIcon,
} from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const topics = [
  "Anatomy & Physiology", "Cell Biology", "Plant Biology",
  "Genetics & Evolution", "Biosystematics", "Ecology", "Ethology",
  "Multiple", "General",
];

type PotdEntry = {
  id: string;
  date: string;
  title: string;
  topic: string;
  question: string;
  explanation: string;
  options: { key: string; text: string }[];
  correct: string[];
  multiSelect: boolean;
  imageUrl: string;
  imageAlt: string;
  status?: string;
  a?: string; b?: string; c?: string; d?: string; e?: string;
};

type CalendarData = {
  [dateKey: string]: {
    published?: PotdEntry;
    queued?: PotdEntry;
  };
};

type PotdForm = {
  title: string;
  question: string;
  explanation: string;
  topic: string;
  options: Record<string, string>;
  correct: string[];
  multiSelect: boolean;
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
  imageAlt: "",
};

function entryToForm(entry: PotdEntry): PotdForm {
  const optMap: Record<string, string> = { a: "", b: "", c: "", d: "", e: "" };
  if (Array.isArray(entry.options)) {
    entry.options.forEach(({ key, text }) => { if (key in optMap) optMap[key] = text || ""; });
  }
  // Fall back to flat fields
  (["a", "b", "c", "d", "e"] as const).forEach((k) => {
    if (entry[k] && !optMap[k]) optMap[k] = entry[k] as string;
  });
  return {
    title: entry.title || "",
    question: entry.question || "",
    explanation: entry.explanation || "",
    topic: entry.topic || "General",
    options: optMap,
    correct: Array.isArray(entry.correct) ? entry.correct : [],
    multiSelect: entry.multiSelect || false,
    imageAlt: entry.imageAlt || "",
  };
}

// ── Form component ────────────────────────────────────────────────────────────
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

  const inputCls =
    "w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors";
  const labelCls = "block text-xs text-neutral-500 mb-1";

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
          <div className="flex items-end pb-2 gap-2">
            <input
              type="checkbox"
              id="multiSelect"
              checked={form.multiSelect}
              onChange={(e) => set({ multiSelect: e.target.checked })}
              className="accent-orange-400"
            />
            <label htmlFor="multiSelect" className="text-sm text-neutral-400">Multi-select</label>
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
            className="block w-full text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-xs file:text-neutral-300 hover:file:bg-neutral-700"
          />
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="mt-3 rounded-xl border border-neutral-800 max-h-40 object-cover" />
          )}
          {!imagePreview && (
            <div className="mt-3 rounded-xl border border-dashed border-neutral-800 h-20 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-neutral-700" />
            </div>
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
                <span className="text-xs text-neutral-500 w-4 font-mono">{key}</span>
                <input
                  value={value}
                  onChange={(e) => set({ options: { ...form.options, [key]: e.target.value } })}
                  className="flex-1 rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Calendar grid ─────────────────────────────────────────────────────────────
function CalendarGrid({
  year,
  month,
  data,
  todayKey,
  onDayClick,
}: {
  year: number;
  month: number;
  data: CalendarData;
  todayKey: string;
  onDayClick: (dateKey: string, entry: CalendarData[string] | undefined) => void;
}) {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  // Monday-first offset: Sun=0 in JS → position 6 in Mon-first grid
  const offset = (firstDayOfWeek + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthStr = String(month).padStart(2, "0");

  return (
    <div className="grid grid-cols-7 gap-1">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
        <div key={d} className="text-center text-[11px] text-neutral-600 py-2 font-medium">
          {d}
        </div>
      ))}

      {cells.map((day, idx) => {
        if (!day) {
          return <div key={`empty-${idx}`} className="min-h-[58px]" />;
        }

        const dayStr = String(day).padStart(2, "0");
        const dateKey = `${year}-${monthStr}-${dayStr}`;
        const entry = data[dateKey];
        const hasPublished = !!entry?.published;
        const hasQueued = !!entry?.queued;
        const isToday = dateKey === todayKey;
        const isPast = dateKey < todayKey;
        const previewTitle = entry?.published?.title || entry?.queued?.title || "";

        return (
          <button
            key={dateKey}
            onClick={() => onDayClick(dateKey, entry)}
            className={`
              relative flex flex-col p-2 rounded-xl border text-left min-h-[58px] transition-all group
              ${isToday
                ? "border-orange-500/50 bg-orange-500/5 hover:bg-orange-500/10"
                : "border-neutral-800 bg-neutral-900/30 hover:border-neutral-700 hover:bg-neutral-900/60"}
            `}
          >
            <span className={`text-xs font-semibold tabular-nums ${isToday ? "text-orange-400" : isPast ? "text-neutral-500" : "text-neutral-300"}`}>
              {day}
            </span>
            {previewTitle && (
              <span className="hidden sm:block text-[10px] text-neutral-500 truncate w-full leading-snug mt-0.5 group-hover:text-neutral-400 transition-colors">
                {previewTitle}
              </span>
            )}
            <div className="mt-auto flex gap-1 pt-1">
              {hasPublished && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Published" />
              )}
              {hasQueued && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Scheduled" />
              )}
            </div>
          </button>
        );
      })}
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
  const [hasAccess, setHasAccess] = useState(false);

  // Calendar state
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Day modal state
  const [dayModal, setDayModal] = useState<{
    dateKey: string;
    entry: CalendarData[string] | undefined;
  } | null>(null);
  const [modalForm, setModalForm] = useState<PotdForm>(emptyForm);
  const [modalImageFile, setModalImageFile] = useState<File | null>(null);
  const [modalImagePreview, setModalImagePreview] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalDeleting, setModalDeleting] = useState(false);

  // Today in browser local time (for visual indicator only)
  const todayKey = new Date().toLocaleDateString("en-CA");

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) { router.push("/auth"); return; }
      setUser(currentUser);
      const access = await checkStaffAccess(currentUser.uid, currentUser);
      setHasAccess(access);
      setLoading(false);
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

  // ── Fetch calendar data ─────────────────────────────────────────────────────
  const fetchCalendarData = useCallback(async (yr: number, mo: number, currentUser: any) => {
    setLoadingCalendar(true);
    setStatusMsg(null);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch(`/api/potd-calendar?year=${yr}&month=${mo}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load calendar.");

      const merged: CalendarData = {};
      for (const p of data.published || []) {
        if (!p.date) continue;
        const key = normalizeToYYYYMMDD(p.date);
        if (!merged[key]) merged[key] = {};
        merged[key].published = p;
      }
      for (const q of data.queued || []) {
        if (!q.date) continue;
        const key = normalizeToYYYYMMDD(q.date);
        if (!merged[key]) merged[key] = {};
        merged[key].queued = q;
      }
      setCalendarData(merged);
    } catch (e: any) {
      setStatusMsg(e?.message || "Failed to load calendar.");
    } finally {
      setLoadingCalendar(false);
    }
  }, []);

  useEffect(() => {
    if (user && hasAccess) fetchCalendarData(currentYear, currentMonth, user);
  }, [user, hasAccess, currentYear, currentMonth, fetchCalendarData]);

  // ── Month navigation ────────────────────────────────────────────────────────
  const goToPrevMonth = () => {
    if (currentMonth === 1) { setCurrentYear((y) => y - 1); setCurrentMonth(12); }
    else setCurrentMonth((m) => m - 1);
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) { setCurrentYear((y) => y + 1); setCurrentMonth(1); }
    else setCurrentMonth((m) => m + 1);
  };

  // ── Day click ───────────────────────────────────────────────────────────────
  const handleDayClick = (dateKey: string, entry: CalendarData[string] | undefined) => {
    setDayModal({ dateKey, entry });
    const existing = entry?.published || entry?.queued;
    setModalForm(existing ? entryToForm(existing) : emptyForm);
    setModalImageFile(null);
    setModalImagePreview(existing?.imageUrl || null);
    setStatusMsg(null);
  };

  // ── Save modal ──────────────────────────────────────────────────────────────
  const handleModalSave = async () => {
    if (!user || !dayModal) return;
    const { dateKey, entry } = dayModal;

    const optionEntries = Object.entries(modalForm.options)
      .map(([key, text]) => ({ key, text: text.trim() }))
      .filter((o) => o.text);
    if (optionEntries.length < 2) { setStatusMsg("Add at least two options."); return; }
    if (modalForm.correct.length === 0) { setStatusMsg("Select at least one correct answer."); return; }

    setModalSaving(true);
    setStatusMsg(null);
    try {
      const idToken = await user.getIdToken();
      let imageUrl = (entry?.published || entry?.queued)?.imageUrl || "";
      if (modalImageFile) {
        imageUrl = await uploadImage(modalImageFile, `potd/queue/${Date.now()}-${modalImageFile.name}`);
      }

      const payload = {
        ...modalForm,
        options: optionEntries,
        imageUrl,
      };

      const isPastOrToday = dateKey <= todayKey;

      if (isPastOrToday) {
        if (entry?.published) {
          // Edit existing published POTD
          const res = await fetch(`/api/potd-published/${entry.published.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify(payload),
          });
          const d = await res.json();
          if (!res.ok) throw new Error(d?.error || "Failed to update.");
        } else {
          // Create published POTD directly for past/today
          const res = await fetch("/api/potd-published", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ ...payload, date: dateKey }),
          });
          const d = await res.json();
          if (!res.ok) throw new Error(d?.error || "Failed to create.");
        }
      } else {
        if (entry?.queued) {
          // Edit existing queued item
          const res = await fetch(`/api/potd-queue/${entry.queued.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ ...payload, date: dateKey }),
          });
          const d = await res.json();
          if (!res.ok) throw new Error(d?.error || "Failed to update.");
        } else {
          // Create new queued item for future date
          const res = await fetch("/api/potd-queue", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ ...payload, date: dateKey, status: "scheduled" }),
          });
          const d = await res.json();
          if (!res.ok) throw new Error(d?.error || "Failed to create.");
        }
      }

      await fetchCalendarData(currentYear, currentMonth, user);
      setDayModal(null);
    } catch (e: any) {
      setStatusMsg(e?.message || "Failed to save.");
    } finally {
      setModalSaving(false);
    }
  };

  // ── Delete modal ────────────────────────────────────────────────────────────
  const handleModalDelete = async () => {
    if (!user || !dayModal) return;
    const { dateKey, entry } = dayModal;
    const isPastOrToday = dateKey <= todayKey;
    const label = (entry?.published || entry?.queued)?.title || dateKey;
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;

    setModalDeleting(true);
    setStatusMsg(null);
    try {
      const idToken = await user.getIdToken();

      if (isPastOrToday && entry?.published) {
        const res = await fetch(`/api/potd-published/${entry.published.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d?.error || "Failed to delete.");
      } else if (entry?.queued) {
        const res = await fetch(`/api/potd-queue/${entry.queued.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d?.error || "Failed to delete.");
      }

      await fetchCalendarData(currentYear, currentMonth, user);
      setDayModal(null);
    } catch (e: any) {
      setStatusMsg(e?.message || "Failed to delete.");
    } finally {
      setModalDeleting(false);
    }
  };

  // ── Loading / access guard ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access denied</h1>
          <p className="text-neutral-500">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const hasEntryForModal = !!(dayModal?.entry?.published || dayModal?.entry?.queued);
  const isPastOrToday = dayModal ? dayModal.dateKey <= todayKey : false;
  const modalTitle = dayModal
    ? isPastOrToday
      ? dayModal.entry?.published
        ? "Edit published POTD"
        : "Create POTD (published)"
      : dayModal.entry?.queued
        ? "Edit scheduled POTD"
        : "Schedule POTD"
    : "";

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <div className="max-w-5xl mx-auto px-4 py-14">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">POTD Calendar</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Click any day to add or edit a Photo of the Day</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchCalendarData(currentYear, currentMonth, user)}
              disabled={loadingCalendar}
              className="p-2 rounded-xl border border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loadingCalendar ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/potd"
              className="px-3 py-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 text-sm transition-colors"
            >
              Back to POTD
            </Link>
          </div>
        </div>

        {/* Status banner */}
        {statusMsg && !dayModal && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span className="flex-1">{statusMsg}</span>
            <button onClick={() => setStatusMsg(null)} className="text-red-400 hover:text-red-200 shrink-0 mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-semibold text-white">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar */}
        {loadingCalendar ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
          </div>
        ) : (
          <CalendarGrid
            year={currentYear}
            month={currentMonth}
            data={calendarData}
            todayKey={todayKey}
            onDayClick={handleDayClick}
          />
        )}

        {/* Legend */}
        <div className="mt-6 flex items-center gap-5 text-xs text-neutral-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Published
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-neutral-700" /> Empty
          </span>
        </div>
      </div>

      {/* Day modal */}
      {dayModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-neutral-900/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl mb-16">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800">
              <div>
                <p className="text-white font-semibold text-sm">{modalTitle}</p>
                <p className="text-neutral-500 text-xs mt-0.5">
                  {formatDateDisplay(dayModal.dateKey)}
                  {isPastOrToday && !dayModal.entry?.published && (
                    <span className="ml-2 text-amber-400">· will publish immediately</span>
                  )}
                  {!isPastOrToday && (
                    <span className="ml-2 text-blue-400">· will auto-publish on this date</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setDayModal(null)}
                className="p-1.5 rounded-full text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              {statusMsg && (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <span className="flex-1">{statusMsg}</span>
                  <button onClick={() => setStatusMsg(null)} className="text-red-400 hover:text-red-200 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <PotdFormFields
                form={modalForm}
                onChange={setModalForm}
                imagePreview={modalImagePreview}
                onImageChange={(f) => {
                  setModalImageFile(f);
                  setModalImagePreview(f ? URL.createObjectURL(f) : null);
                }}
              />

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleModalSave}
                  disabled={modalSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {modalSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {modalSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setDayModal(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                {hasEntryForModal && (
                  <button
                    onClick={handleModalDelete}
                    disabled={modalDeleting}
                    className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-colors disabled:opacity-50"
                  >
                    {modalDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeToYYYYMMDD(dateStr: string): string {
  // Handles "2026-5-9" → "2026-05-09" for consistent map keys
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
}

function formatDateDisplay(dateKey: string): string {
  try {
    const d = new Date(dateKey + "T12:00:00");
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateKey;
  }
}
