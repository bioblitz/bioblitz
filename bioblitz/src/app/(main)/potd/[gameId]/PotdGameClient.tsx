"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  ListChecks,
  Trophy,
  MousePointerClick,
  Loader2,
  Lightbulb,
  ArrowLeft,
  RotateCcw,
  Eye,
  History,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, collection, getDocs 
} from "firebase/firestore";
import { app } from "@/lib/firebase";

// Import Shared Interface
import { DailyPuzzle } from "@/lib/potd";

export default function PotdGameClient({ 
    puzzle, 
    archivePuzzles = [] 
}: { 
    puzzle: DailyPuzzle, 
    archivePuzzles: DailyPuzzle[] 
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playedGameIds, setPlayedGameIds] = useState<Set<string>>(new Set());

  // GAME STATE
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewAnyway, setViewAnyway] = useState(false);

  // ARCHIVE UI STATE
  const [showArchive, setShowArchive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [topic, setTopic] = useState("All Topics");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "New">("All");

  const auth = getAuth(app);
  const db = getFirestore(app);

  const topics = ["All Topics", "General", "Animal", "Cell Bio", "Biochem", "Genetics", "Plants"];

  // Helper: Date Check
  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    
    // Check Local
    const matchLocal = d.getDate() === now.getDate() && 
                       d.getMonth() === now.getMonth() && 
                       d.getFullYear() === now.getFullYear();

    // Check PST
    const pstOptions: Intl.DateTimeFormatOptions = {
        timeZone: "America/Los_Angeles",
        year: "numeric", month: "numeric", day: "numeric"
    };
    const matchPST = d.toLocaleDateString("en-US", pstOptions) === now.toLocaleDateString("en-US", pstOptions);

    return matchLocal || matchPST;
  };

  // 1. Redirect if Today
  useEffect(() => {
    if (isToday(puzzle.date)) {
        router.replace('/potd'); 
    }
  }, [puzzle.date, router]);

  // 2. Auth & Check status
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
            
            // Set all played IDs for the archive list
            setPlayedGameIds(new Set(completedArr));
            
            // Check specific current game status
            setIsCompleted(completedArr.includes(puzzle.id));
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
        const userRef = doc(db, "users", user.uid);
        
        // 1. Save detailed log
        const setPlayedRef = doc(db, "users", user.uid, "setsPlayed", puzzle.id);
        await setDoc(setPlayedRef, {
            gameId: puzzle.id,
            timestamp: serverTimestamp(),
            correct: correct,
            answers: sortedSelected
        });

        // 2. Add to Completed Array (No streak increment here)
        await updateDoc(userRef, {
            completedPotdIds: arrayUnion(puzzle.id) 
        });

        setIsSubmitted(true);
        setIsCompleted(true);
        setPlayedGameIds(prev => new Set(prev).add(puzzle.id));

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
            setSelectedOptions(prev => prev.filter(k => k !== key));
        } else {
            setSelectedOptions(prev => [...prev, key]);
        }
    } else {
        if (selectedOptions.includes(key)) {
             setSelectedOptions([]); 
        } else {
             setSelectedOptions([key]);
        }
    }
  };

  const getTopicColors = (topic: string | undefined) => {
    switch (topic) {
      case "Animal": return { bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", shadow: "hover:shadow-blue-500/10 hover:border-blue-500/50" };
      case "Cell Bio": return { bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", shadow: "hover:shadow-cyan-500/10 hover:border-cyan-500/50" };
      case "Biochem": return { bg: "bg-teal-500/10 text-teal-400 border-teal-500/20", shadow: "hover:shadow-teal-500/10 hover:border-teal-500/50" };
      case "Genetics": return { bg: "bg-lime-500/10 text-lime-400 border-lime-500/20", shadow: "hover:shadow-lime-500/10 hover:border-lime-500/50" };
      case "Plants": return { bg: "bg-green-500/10 text-green-400 border-green-500/20", shadow: "hover:shadow-green-500/10 hover:border-green-500/50" };
      default: return { bg: "bg-orange-500/10 text-orange-400 border-orange-500/20", shadow: "hover:shadow-orange-500/10 hover:border-orange-500/50" };
    }
  };

  // ARCHIVE FILTERING
  const filteredArchive = archivePuzzles.filter((p) => {
    if (p.id === puzzle.id) return false; // Don't show current game in archive list
    
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.questionText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = topic === "All Topics" || p.topic === topic;
    const isPlayed = playedGameIds.has(p.id);

    let matchesStatus = true;
    if (statusFilter === "Completed") matchesStatus = isPlayed;
    if (statusFilter === "New") matchesStatus = !isPlayed;

    return matchesSearch && matchesTopic && matchesStatus;
  });

  const activeFilterCount = (statusFilter !== "All" ? 1 : 0) + (topic !== "All Topics" ? 1 : 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        
        {/* HEADER */}
        <div className="flex items-center mb-8">
            <Link 
                href="/potd" 
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Archive
            </Link>
        </div>

        {loadingUser ? (
            <div className="flex flex-col justify-center items-center py-32 space-y-4">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                <p className="text-zinc-500 text-sm font-medium animate-pulse">Loading Problem...</p>
            </div>
        ) : (
            <div className="max-w-4xl mx-auto space-y-16">
                
                {/* HERO CARD */}
                <section className="relative">
                     <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl group text-center">
                        
                        <div className="relative z-10 p-8 md:p-10 flex flex-col items-center">
                            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                                <span className="text-sm font-medium text-zinc-500 flex items-center gap-2 border border-zinc-800 px-3 py-1 rounded-full">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(puzzle.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${getTopicColors(puzzle.topic).bg}`}>
                                    {puzzle.topic}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 border border-zinc-800 px-2 py-1 rounded-md">
                                    {puzzle.multiSelect ? <ListChecks className="w-3 h-3" /> : <MousePointerClick className="w-3 h-3" />}
                                    {puzzle.multiSelect ? "Multi-Select" : "Single Choice"}
                                </span>
                                
                                {isCompleted && (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-md uppercase tracking-wider">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Completed
                                    </span>
                                )}
                            </div>
                            
                            <div className="space-y-4 mb-8 max-w-3xl mx-auto">
                                <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                                    {puzzle.title}
                                </h2>
                                <p className="text-zinc-300 text-lg leading-relaxed">
                                    {puzzle.questionText}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 w-full max-w-2xl mx-auto">
                                {puzzle.options.map((option) => {
                                    const isSelected = selectedOptions.includes(option.key);
                                    const isCorrectKey = puzzle.correctAnswer.includes(option.key);
                                    
                                    const showResults = isSubmitted;

                                    let borderClass = "border-zinc-800 hover:border-zinc-700";
                                    let bgClass = "bg-zinc-900/50 hover:bg-zinc-800";
                                    let textClass = "text-zinc-300";
                                    
                                    if (showResults) {
                                        if (isCorrectKey) {
                                            borderClass = "border-green-500/50";
                                            bgClass = "bg-green-500/10";
                                            textClass = "text-green-100";
                                        } else if (isSelected && !isCorrectKey) {
                                            borderClass = "border-red-500/50";
                                            bgClass = "bg-red-500/10";
                                            textClass = "text-red-100";
                                        }
                                    } else if (isSelected) {
                                        borderClass = "border-orange-500/50";
                                        bgClass = "bg-orange-500/10";
                                        textClass = "text-orange-100";
                                    }

                                    return (
                                        <button
                                            key={option.key}
                                            disabled={showResults || submitting}
                                            onClick={() => handleOptionClick(option.key)}
                                            className={`
                                                relative flex items-center justify-center w-full p-4 rounded-xl border transition-all duration-200
                                                ${bgClass} ${borderClass}
                                                ${isSelected && !showResults ? "shadow-[0_0_20px_rgba(249,115,22,0.1)]" : ""}
                                            `}
                                        >
                                            <div className={`
                                                flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold mr-4 transition-colors flex-shrink-0
                                                ${isSelected || (showResults && isCorrectKey) ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-500"}
                                            `}>
                                                {option.key.toUpperCase()}
                                            </div>

                                            <span className={`text-base text-center font-medium ${textClass}`}>
                                                {option.text}
                                            </span>

                                            <div className="absolute right-4 animate-in zoom-in duration-200">
                                                {!showResults && isSelected && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
                                                {showResults && isCorrectKey && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                                {showResults && isSelected && !isCorrectKey && <XCircle className="w-5 h-5 text-red-500" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* POST-SUBMISSION RESULTS */}
                            {isSubmitted && (
                                <div className="w-full max-w-2xl mx-auto mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                    <div className={`p-6 rounded-2xl border mb-6 flex flex-col items-center gap-3 ${isCorrect ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                                        {isCorrect ? (
                                            <>
                                                <div className="bg-green-500/20 p-3 rounded-full">
                                                    <Trophy className="w-8 h-8 text-green-500" />
                                                </div>
                                                <h3 className="text-xl font-bold text-green-400">Correct!</h3>
                                            </>
                                        ) : (
                                            <>
                                                <div className="bg-red-500/20 p-3 rounded-full">
                                                    <XCircle className="w-8 h-8 text-red-500" />
                                                </div>
                                                <h3 className="text-xl font-bold text-red-400">Incorrect.</h3>
                                            </>
                                        )}
                                    </div>

                                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left">
                                        <div className="flex items-center gap-2 mb-3 text-zinc-400 text-sm font-bold uppercase tracking-wider">
                                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                                            Explanation
                                        </div>
                                        <p className="text-zinc-300 leading-relaxed">
                                            {puzzle.explanation}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* SUBMIT BUTTON */}
                            {!isSubmitted && (
                                <div className="mt-8 flex justify-center w-full border-t border-white/5 pt-6">
                                    <button 
                                        disabled={selectedOptions.length === 0 || submitting}
                                        onClick={handleSubmit}
                                        className={`
                                            px-12 py-3 rounded-xl font-bold text-base transition-all w-full md:w-auto flex items-center justify-center gap-2
                                            ${selectedOptions.length > 0 && !submitting
                                                ? "bg-white text-black hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer" 
                                                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"}
                                        `}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            "Submit Answer"
                                        )}
                                    </button>
                                </div>
                            )}

                        </div>
                     </div>
                </section>

                {/* ARCHIVE SECTION (Rendered directly) */}
                <section>
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <button
                            onClick={() => setShowArchive(!showArchive)}
                            className="flex items-center gap-2 text-xl font-bold text-zinc-200 hover:text-white transition-colors"
                        >
                            <History className="w-5 h-5 text-zinc-500" />
                            More Practice Problems
                            {showArchive ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                        </button>
                    </div>

                    {showArchive && (
                        <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                            {/* SEARCH & FILTERS */}
                            <div className="flex flex-col gap-6 mb-8 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="relative flex-grow">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search past questions..."
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-zinc-600"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${showFilters || activeFilterCount > 0 ? "bg-zinc-800 text-white border-zinc-700" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}
                                    >
                                        <SlidersHorizontal className="w-4 h-4" />
                                        Filters
                                    </button>
                                </div>
                                
                                {showFilters && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-zinc-800">
                                        <div className="space-y-3">
                                            <span className="text-xs font-bold text-zinc-500 uppercase">Status</span>
                                            <div className="flex flex-wrap gap-2">
                                                {(["All", "New", "Completed"] as const).map((opt) => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => setStatusFilter(opt)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === opt ? "bg-zinc-800 text-white border-zinc-600" : "text-zinc-500 border-zinc-800 hover:text-white"}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <span className="text-xs font-bold text-zinc-500 uppercase">Topics</span>
                                            <div className="flex flex-wrap gap-2">
                                                {topics.map((t) => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setTopic(t)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${topic === t ? "bg-orange-600/15 text-orange-300 border-orange-500/30" : "text-zinc-500 border-zinc-800 hover:text-white"}`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredArchive.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-zinc-500">
                                        No past problems found.
                                    </div>
                                ) : (
                                    filteredArchive.map((p) => {
                                        const theme = getTopicColors(p.topic);
                                        const isPlayed = playedGameIds.has(p.id);
                                        
                                        return (
                                            <Link key={p.id} href={`/potd/${p.id}`} className="block group">
                                                <div className={`relative h-full flex flex-col justify-between bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${theme.shadow}`}>
                                                    <div className="p-5">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm ${theme.bg}`}>
                                                                {p.topic || "General"}
                                                            </span>
                                                            {isPlayed && (
                                                                <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    <span>Completed</span>
                                                                </div>
                                                            )}
                                                            {isPlayed && (
                                                                <div title="Redo Problem" className="absolute top-5 right-5 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                                                                    <RotateCcw className="w-4 h-4" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <h2 className="text-lg font-bold text-white mb-2 line-clamp-2">{p.title}</h2>
                                                        <p className="text-sm text-zinc-500 line-clamp-2 mb-3">{p.questionText}</p>
                                                        <div className="flex items-center text-sm text-zinc-400 mt-auto">
                                                            <Calendar className="w-3 h-3 mr-2" />
                                                            <span className="truncate">{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </section>

            </div>
        )}
      </main>
    </div>
  );
}