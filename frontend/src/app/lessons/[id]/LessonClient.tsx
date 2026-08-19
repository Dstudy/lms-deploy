"use client";

import { useState, useEffect, useRef } from "react";
import { ApiWordData as WordData, ApiLinkData as LinkData, LessonFull } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Mic2,
  Gamepad2,
  Link as LinkIcon,
  Home,
  ChevronRight,
  Sparkles,
  User as UserIcon,
  Lock,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { LearnModule } from "@/components/LearnModule";
import SpeakModule from "@/components/SpeakModule";
import { PracticeModule } from "@/components/PracticeModule";
import { cn } from "@/lib/utils";

import {
  checkAuthState,
  getUserProfile,
  getUserProgress,
  saveUserProgress,
  getLessonById,
  loginWithEmailAndPassword,
  getToken,
  StoredUser,
} from "@/lib/api";

export default function LessonClient({ id }: { id: string }) {
  const [lesson, setLesson] = useState<LessonFull | null>(null);
  const [lessonLoading, setLessonLoading] = useState(true);

  // ---------------- AUTH ----------------
  const [user, setUser] = useState<StoredUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Login form states (for direct or unauthenticated lesson entry)
  const [accountOrEmail, setAccountOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // ---------------- MODULE NAV ----------------
  const [activeModule, setActiveModule] = useState<
    "learn" | "speak" | "practice" | "communication"
  >("learn");

  // ---------------- ZALO DETECT ----------------
  const [isZalo, setIsZalo] = useState(false);

  // ---------------- PROGRESS STATES ----------------
  const [learnIndex, setLearnIndex] = useState(0);
  const [p2Stars, setP2Stars] = useState<Record<string, number>>({});
  const [p3Score, setP3Score] = useState<number | null>(null);
  const [p4LinksCount, setP4LinksCount] = useState(0);

  // UI states
  const [speakIndex, setSpeakIndex] = useState(0);
  const [playIndex, setPlayIndex] = useState(0);

  // Practice states
  const [practiceTarget, setPracticeTarget] = useState<WordData | null>(null);
  const [practiceOptions, setPracticeOptions] = useState<WordData[]>([]);
  const [practiceSelectedId, setPracticeSelectedId] = useState<string | null>(
    null,
  );
  const [practiceIsConfirmed, setPracticeIsConfirmed] = useState(false);
  const [practiceIsCorrect, setPracticeIsCorrect] = useState<boolean | null>(
    null,
  );

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const isProgressLoadedRef = useRef(false);

  // ---------------- AUTH ----------------
  useEffect(() => {
    const unsubscribe = checkAuthState(async (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
      if (currentUser) {
        try {
          const response = await getUserProfile(currentUser.id);
          setUsername(response.data?.userProfile?.username ?? "");
        } catch {
          // non-critical, leave username empty
        }
      } else {
        setUsername("");
        setLessonLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ---------------- FETCH LESSON ----------------
  useEffect(() => {
    if (!user) return;
    setLessonLoading(true);
    getLessonById(id)
      .then(({ lesson: fetchedLesson }) => setLesson(fetchedLesson))
      .catch(() => setLesson(null))
      .finally(() => setLessonLoading(false));
  }, [user, id]);

  // ---------------- ZALO DETECT & TOKEN SYNC ----------------
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor;

    if (/Zalo/i.test(ua)) {
      setIsZalo(true);
      const token = getToken();
      if (token && typeof window !== "undefined") {
        try {
          const url = new URL(window.location.href);
          if (!url.searchParams.has("auth_token")) {
            url.searchParams.set("auth_token", token);
            window.history.replaceState({}, document.title, url.toString());
          }
        } catch (e) {
          console.error("Error updating URL with auth_token for Zalo:", e);
        }
      }
    }
  }, [user]);

  // ---------------- LOAD PROGRESS ----------------
  useEffect(() => {
    if (!user || !lesson) return;

    const fetchProgress = async () => {
      try {
        const response = await getUserProgress(lesson.id);

        if (response.data?.userProgress) {
          const {
            learnIndex: savedLearn,
            p2Stars: savedP2StarsString,
            p3Score: savedP3Score,
            p4LinksCount: savedP4Links,
          } = response.data.userProgress;

          if (typeof savedLearn === "number") {
            setLearnIndex(savedLearn);
          }

          if (savedP2StarsString) {
            try {
              const parsedStars = JSON.parse(savedP2StarsString);

              setP2Stars(parsedStars);

              const firstUnfinishedIndex = lesson.words.findIndex(
                (word) => !parsedStars[word.id] || parsedStars[word.id] === 0,
              );

              setSpeakIndex(
                firstUnfinishedIndex === -1
                  ? lesson.words.length
                  : firstUnfinishedIndex,
              );
            } catch (e) {
              console.error("Error parsing p2Stars:", e);
            }
          }

          if (typeof savedP3Score === "number") {
            setP3Score(savedP3Score);
            setPlayIndex(lesson.words.length);
          }

          if (typeof savedP4Links === "number") {
            setP4LinksCount(savedP4Links);
          }
        }
      } catch (error) {
        console.error("Error during progress load:", error);
      } finally {
        setIsInitialLoad(false);
        setIsDataLoaded(true);
        isProgressLoadedRef.current = true;
      }
    };

    fetchProgress();
  }, [user, lesson]);

  // ---------------- AUTO SAVE ----------------
  useEffect(() => {
    if (!user || !lesson || !isDataLoaded) return;

    const hasStars = Object.keys(p2Stars).length > 0;

    const hasProgress =
      learnIndex > 0 || hasStars || p3Score !== null || p4LinksCount > 0;

    if (!hasProgress) return;

    const commitProgress = async () => {
      try {
        await saveUserProgress({
          lessonId: lesson.id,
          learnIndex,
          p2Stars: JSON.stringify(p2Stars),
          p3Score,
          p4LinksCount,
        });
      } catch (error) {
        console.error("Error during general save:", error);
      }
    };

    const timer = setTimeout(() => {
      commitProgress();
    }, 800);

    return () => clearTimeout(timer);
  }, [p2Stars, learnIndex, p3Score, p4LinksCount, user, lesson, isDataLoaded]);

  // ---------------- LOGIN HANDLER ----------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginSubmitting(true);

    const input = accountOrEmail.trim();
    const finalEmail = input.includes("@") ? input : `${input}@uni.edu.com`;

    try {
      const loggedInUser = await loginWithEmailAndPassword(finalEmail, password);
      setUser(loggedInUser);
      setUsername(loggedInUser.username ?? "");
      setAccountOrEmail("");
      setPassword("");
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.status === 401) {
        setLoginError("Invalid student account ID or password. Please try again.");
      } else {
        setLoginError("Authentication failed. Please try again later.");
      }
    } finally {
      setLoginSubmitting(false);
    }
  };

  // ---------------- AUTH CHECKING & LOGIN VIEW ----------------
  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="text-slate-500 font-medium animate-pulse">Checking session...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3 text-indigo-600 shadow-inner">
              <BookOpen className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              Sign In to Open Lesson
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Please enter your account details to access this interactive lesson
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium rounded-xl">
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Account ID or Email
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Enter your student number or email"
                  value={accountOrEmail}
                  onChange={(e) => setAccountOrEmail(e.target.value)}
                  className="w-full pl-10 pr-4 h-12 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 h-12 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loginSubmitting}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              {loginSubmitting ? "Signing in..." : "Open Lesson"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" /> Return to Homepage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ---------------- NOT FOUND / LOADING ----------------
  if (lessonLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="text-slate-500 font-medium animate-pulse">Loading lesson...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10 text-center max-w-md">
          <h2 className="text-3xl font-black text-slate-800 mb-2">
            Lesson Not Found
          </h2>
          <p className="text-slate-500 mb-6">This lesson may have been removed or you do not have permission to view it.</p>
          <Link href="/">
            <Button variant="outline" className="rounded-xl font-bold">
              <Home className="w-4 h-4 mr-2" /> Back to Lessons
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---------------- HELPERS ----------------
  const handleUpdateP2Stars = async (
    sentenceId: string,
    currentStars: number,
  ) => {
    let latestStars: Record<string, number> = {};

    setP2Stars((prev) => {
      const oldStars = prev[sentenceId] || 0;

      if (currentStars > oldStars) {
        latestStars = {
          ...prev,
          [sentenceId]: currentStars,
        };

        return latestStars;
      }

      latestStars = prev;
      return prev;
    });

    if (
      Object.keys(latestStars).length > 0 &&
      latestStars[sentenceId] === currentStars
    ) {
      try {
        await saveUserProgress({
          lessonId: lesson.id,
          learnIndex,
          p2Stars: JSON.stringify(latestStars),
          p3Score,
          p4LinksCount,
        });
      } catch (error) {
        console.error("Error saving stars:", error);
      }
    }
  };

  const handleTrackLinkClick = (url: string) => {
    setP4LinksCount((prev) => prev + 1);
    window.open(url, "_blank");
  };

  // ---------------- MODULES ----------------
  const tabs = [
    {
      id: "learn",
      icon: BookOpen,
      label: "Learn",
      gradient: "from-sky-500 to-blue-600",
    },
    {
      id: "speak",
      icon: Mic2,
      label: "Speak",
      gradient: "from-emerald-500 to-green-600",
    },
    {
      id: "practice",
      icon: Gamepad2,
      label: "Basic Practice",
      gradient: "from-orange-500 to-amber-500",
    },
    {
      id: "communication",
      icon: LinkIcon,
      label: "Extra Practice",
      gradient: "from-violet-500 to-purple-600",
    },
  ];
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-120px] right-[-80px] w-[220px] sm:w-[300px] h-[220px] sm:h-[300px] rounded-full bg-blue-200/30 blur-3xl" />

        <div className="absolute bottom-[-120px] left-[-80px] w-[220px] sm:w-[280px] h-[220px] sm:h-[280px] rounded-full bg-violet-200/30 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* ---------------- TOP BAR ---------------- */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
            <Link href="/">
              <Button
                variant="outline"
                size="icon"
                className="
              w-12 h-12 sm:w-14 sm:h-14
              rounded-2xl
              bg-white
              border-slate-200
              shadow-md
              hover:shadow-lg
              hover:scale-105
              transition-all
              shrink-0
            "
              >
                <Home className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </Button>
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />

                <span className="text-[10px] sm:text-xs font-black tracking-[0.2em] uppercase text-slate-400">
                  Interactive Lesson
                </span>
              </div>

              <h1
                className="
              text-2xl sm:text-3xl md:text-4xl
              font-black
              tracking-tight
              text-slate-800
              break-words
              leading-tight
            "
              >
                {lesson.title}
              </h1>
            </div>
          </div>

          {username && (
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm shrink-0">
              <UserIcon className="w-4 h-4 text-primary" />
              <span>Hi, {username}</span>
            </div>
          )}
        </div>

        {/* ---------------- MODULE NAV ---------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            const isActive = activeModule === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveModule(tab.id as any)}
                className={cn(
                  "relative overflow-hidden rounded-2xl sm:rounded-3xl border",
                  "transition-all duration-300",
                  "shadow-md hover:shadow-xl",
                  "active:scale-[0.98]",
                  "p-4 sm:p-5",
                  isActive
                    ? "border-transparent text-white scale-[1.01]"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50",
                )}
              >
                {isActive && (
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br",
                      tab.gradient,
                    )}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center justify-center text-center">
                  <div
                    className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-2 sm:mb-3 transition-all",
                      isActive
                        ? "bg-white/20 backdrop-blur-sm"
                        : "bg-slate-100",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6 sm:w-7 sm:h-7",
                        isActive ? "text-white" : "text-slate-600",
                      )}
                    />
                  </div>

                  <span
                    className={cn(
                      "font-black tracking-wide leading-tight",
                      "text-xs sm:text-sm md:text-base",
                      isActive ? "text-white" : "text-slate-700",
                    )}
                  >
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ---------------- CONTENT CONTAINER ---------------- */}
        <div
          className={cn(
            "relative overflow-hidden",
            "rounded-[1.75rem] sm:rounded-[2.5rem] md:rounded-[3rem]",
            "border border-white/60 bg-white/70 backdrop-blur-xl",
            "shadow-[0_10px_60px_rgba(0,0,0,0.08)]",
            "min-h-[500px] sm:min-h-[650px]",
            "p-3 sm:p-5 md:p-8",
            isZalo && activeModule === "speak" && "pointer-events-none blur-sm",
          )}
        >
          {/* Inner Glow */}
          <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

          <div className="relative z-10">
            {activeModule === "learn" && (
              <LearnModule
                words={lesson.words}
                index={learnIndex}
                setIndex={setLearnIndex}
              />
            )}

            {activeModule === "speak" && (
              <SpeakModule
                words={lesson.words}
                index={speakIndex}
                setIndex={setSpeakIndex}
                savedProgressStars={p2Stars}
                onUpdateStars={handleUpdateP2Stars}
              />
            )}

            {activeModule === "practice" && (
              <PracticeModule
                allWords={lesson.words}
                index={playIndex}
                initialSavedScore={
                  p3Score !== null && lesson.words.length > 0
                    ? Math.round((p3Score / 100) * lesson.words.length)
                    : 0
                }
                setIndex={(newIdx, calculatedScore) => {
                  setPlayIndex(newIdx);

                  if (newIdx >= lesson.words.length) {
                    setP3Score(
                      calculatedScore !== undefined ? calculatedScore : 100,
                    );
                  }
                }}
                targetWord={practiceTarget}
                setTargetWord={setPracticeTarget}
                options={practiceOptions}
                setOptions={setPracticeOptions}
                selectedId={practiceSelectedId}
                setSelectedId={setPracticeSelectedId}
                isConfirmed={practiceIsConfirmed}
                setIsConfirmed={setPracticeIsConfirmed}
                isCorrect={practiceIsCorrect}
                setIsCorrect={setPracticeIsCorrect}
              />
            )}

            {activeModule === "communication" && (
              <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px]">
                <div className="text-center mb-8 md:mb-10 px-2">
                  <div className="text-5xl sm:text-6xl md:text-7xl mb-4">
                    🚀
                  </div>

                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 mb-3 leading-tight">
                    Extra Activities
                  </h2>

                  <p className="text-slate-500 text-sm sm:text-base md:text-lg max-w-lg mx-auto">
                    Practice more with external resources and communication
                    exercises.
                  </p>
                </div>

                <div className="grid gap-4 sm:gap-5 w-full max-w-2xl">
                  {lesson.externalLinks && lesson.externalLinks.length > 0 ? (
                    lesson.externalLinks.map((link: LinkData, idx: number) => (
                      <div
                        key={idx}
                        className="
                        group bg-white
                        border border-slate-200
                        rounded-2xl sm:rounded-3xl
                        p-4 sm:p-6
                        shadow-md hover:shadow-xl
                        transition-all duration-300
                      "
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-600 text-[10px] sm:text-xs font-black tracking-widest uppercase mb-3">
                              Extra {idx + 1}
                            </div>

                            <p className="text-base sm:text-lg font-semibold text-slate-700 leading-relaxed break-words">
                              {link.text}
                            </p>
                          </div>

                          {link.url && link.url.trim() !== "" && (
                            <Button
                              onClick={() => handleTrackLinkClick(link.url)}
                              className="
                                w-full sm:w-auto
                                h-11 sm:h-12
                                px-5 sm:px-6
                                rounded-2xl
                                bg-gradient-to-r from-violet-600 to-purple-600
                                hover:opacity-90
                                text-white
                                font-black
                                text-sm sm:text-base
                                tracking-wide
                                shadow-lg
                              "
                            >
                              Open Link
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border border-dashed border-slate-300 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
                      <p className="text-slate-400 text-base sm:text-lg italic">
                        No extra activities available yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- ZALO OVERLAY ---------------- */}
      {isZalo && activeModule === "speak" && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-5">
          {/* Hint Arrow */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex flex-col items-end animate-bounce">
            <div className="text-white font-bold mb-2 mr-2 bg-blue-600 px-3 py-1 rounded-full text-[10px] sm:text-xs">
              Nhấn vào đây
            </div>

            <ChevronRight className="text-white w-8 h-8 sm:w-10 sm:h-10 -rotate-[135deg]" />
          </div>

          {/* Modal */}
          <div
            className="
          w-full max-w-md
          bg-white
          rounded-[2rem] sm:rounded-[2.5rem]
          p-5 sm:p-8
          shadow-2xl
          border border-blue-100
          max-h-[90vh]
          overflow-y-auto
        "
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-blue-100 flex items-center justify-center mx-auto mb-5 sm:mb-6">
              <Mic2 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-center text-slate-800 mb-3 leading-tight">
              Mở Trình Duyệt Để Luyện Nói
            </h2>

            <p className="text-center text-sm sm:text-base text-slate-500 mb-6 sm:mb-8">
              Trình duyệt Zalo chưa hỗ trợ microphone cho tính năng luyện nói.
            </p>

            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-start gap-3 sm:gap-4 bg-slate-50 rounded-2xl p-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                  1
                </div>

                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  Nhấn vào <b>dấu 3 chấm (⋯)</b> ở góc trên bên phải màn hình Zalo.
                </p>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 bg-slate-50 rounded-2xl p-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                  2
                </div>

                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  Chọn <b>"Mở bằng trình duyệt"</b> (Safari trên iPhone / Chrome trên Android).
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl border-slate-200 font-bold text-slate-700 text-sm flex items-center justify-center gap-2"
                onClick={() => {
                  const token = getToken();
                  const url = new URL(window.location.href);
                  if (token) url.searchParams.set("auth_token", token);
                  navigator.clipboard?.writeText(url.toString());
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 3000);
                }}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Đã sao chép link Safari!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Sao chép liên kết mở Safari</span>
                  </>
                )}
              </Button>

              <Button
                className="
              w-full
              h-12 sm:h-14
              rounded-2xl
              bg-blue-600 hover:bg-blue-700
              font-black
              text-base sm:text-lg
              shadow-lg
            "
                onClick={() => setActiveModule("learn")}
              >
                HỌC TỪ VỰNG TRƯỚC
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
