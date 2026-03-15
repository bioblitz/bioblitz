"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { DailyPuzzle } from "@/lib/potd";
import { createUserProfile } from "@/lib/user";
import PotdArchivePanel from "@/components/features/potd/PotdArchivePanel";
import PotdQuestionCard from "@/components/features/potd/PotdQuestionCard";

export default function PotdGameClient({
  puzzle,
  archivePuzzles = [],
}: {
  puzzle: DailyPuzzle;
  archivePuzzles: DailyPuzzle[];
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playedGameIds, setPlayedGameIds] = useState<Set<string>>(new Set());
  const [isStaffUser, setIsStaffUser] = useState(false);

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showArchive, setShowArchive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [topic, setTopic] = useState("All Topics");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "New">(
    "All"
  );

  const auth = getAuth(app);
  const db = getFirestore(app);

  const topics = [
    "All Topics",
    "Anatomy & Physiology",
    "Cell Biology",
    "Plant Biology",
    "Genetics & Evolution",
    "Biosystematics",
    "Ecology",
    "Ethology",
    "Multiple",
  ];

  const isToday = (dateString: string) => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    const pstDateString = now.toLocaleDateString("en-US", options);
    const [month, day, year] = pstDateString.split("/");
    const currentPST = `${year}-${month}-${day}`;

    return dateString === currentPST;
  };

  useEffect(() => {
    if (isToday(puzzle.date)) {
      router.replace("/potd");
    }
  }, [puzzle.date, router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.uid);
      } else {
        setLoadingUser(false);
        setPlayedGameIds(new Set());
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const completedArr = data.completedPotdIds || [];
        const roles = Array.isArray(data.roles)
          ? data.roles.map((role: unknown) => String(role).toLowerCase())
          : [];

        setPlayedGameIds(new Set(completedArr));
        setIsCompleted(completedArr.includes(puzzle.id));
        setIsStaffUser(roles.includes("admin") || roles.includes("staff"));
      }
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("Please sign in to submit answers.");
      return;
    }
    setSubmitting(true);

    const sortedSelected = [...selectedOptions].sort();
    const sortedCorrect = [...puzzle.correctAnswer].sort();
    const correct = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
    setIsCorrect(correct);

    try {
      await createUserProfile(user);
      const userRef = doc(db, "users", user.uid);
      const setPlayedRef = doc(db, "users", user.uid, "setsPlayed", puzzle.id);

      await setDoc(setPlayedRef, {
        gameId: puzzle.id,
        timestamp: serverTimestamp(),
        puzzleDate: puzzle.date,
        correct,
        answers: sortedSelected,
      });

      await setDoc(
        userRef,
        {
          completedPotdIds: arrayUnion(puzzle.id),
        },
        { merge: true }
      );

      try {
        const activityRef = doc(db, "potdActivity", puzzle.id);
        await setDoc(
          activityRef,
          {
            attempts: increment(1),
            correctCount: correct ? increment(1) : increment(0),
            lastPlayedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn("Failed to update POTD activity:", error);
      }

      setIsSubmitted(true);
      setIsCompleted(true);
      setPlayedGameIds((prev) => new Set(prev).add(puzzle.id));
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptionClick = (key: string) => {
    if (isSubmitted) return;

    if (puzzle.multiSelect) {
      if (selectedOptions.includes(key)) {
        setSelectedOptions((prev) => prev.filter((k) => k !== key));
      } else {
        setSelectedOptions((prev) => [...prev, key]);
      }
    } else {
      if (selectedOptions.includes(key)) {
        setSelectedOptions([]);
      } else {
        setSelectedOptions([key]);
      }
    }
  };

  const filteredArchive = archivePuzzles.filter((p) => {
    if (p.id === puzzle.id) return false;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.questionText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = topic === "All Topics" || p.topic === topic;
    const isPlayed = playedGameIds.has(p.id);

    let matchesStatus = true;
    if (statusFilter === "Completed") matchesStatus = isPlayed;
    if (statusFilter === "New") matchesStatus = !isPlayed;

    return matchesSearch && matchesTopic && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            href="/potd"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Archive
          </Link>
          {isStaffUser && (
            <Link
              href="/potd/staff"
              className="text-sm font-semibold text-orange-300 border border-orange-500/40 hover:border-orange-500 hover:text-orange-200 px-3 py-1.5 rounded-full transition-colors"
            >
              Manage Queue
            </Link>
          )}
        </div>

        {loadingUser ? (
          <div className="flex flex-col justify-center items-center py-32 space-y-4">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            <p className="text-zinc-500 text-sm font-medium animate-pulse">
              Loading Problem...
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-16">
            <PotdQuestionCard
              puzzle={puzzle}
              isCompleted={isCompleted}
              selectedOptions={selectedOptions}
              isSubmitted={isSubmitted}
              isCorrect={isCorrect}
              submitting={submitting}
              onOptionClick={handleOptionClick}
              onSubmit={handleSubmit}
            />

            <PotdArchivePanel
              showArchive={showArchive}
              onToggleArchive={() => setShowArchive(!showArchive)}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              topic={topic}
              onTopicChange={setTopic}
              topics={topics}
              filteredArchive={filteredArchive}
              playedGameIds={playedGameIds}
            />
          </div>
        )}
      </main>
    </div>
  );
}
