"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Award, LogOut, Lock, User as UserIcon, RefreshCw, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LessonGrid } from "@/components/LessonGrid";
import { Progress } from "@/components/ui/progress";
import {
  checkAuthState,
  loginWithEmailAndPassword,
  signOutUser,
  getUserProfile,
  getAppBySlug,
  StoredUser,
  AppRecord
} from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function AppStudentPage() {
  const router = useRouter();
  const params = useParams();
  const appSlug = params.appSlug as string;
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";

  const [app, setApp] = useState<AppRecord | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [appError, setAppError] = useState(false);

  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [completedLessons, setCompletedLessons] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [username, setUsername] = useState("");

  // Form states
  const [accountOrEmail, setAccountOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Fetch App branding
  useEffect(() => {
    if (!appSlug) return;
    getAppBySlug(appSlug)
      .then((res) => {
        setApp(res.app);
      })
      .catch((err) => {
        console.error("App load error:", err);
        setAppError(true);
      })
      .finally(() => {
        setAppLoading(false);
      });
  }, [appSlug]);

  // Listen to auth state changes (skipped in preview mode)
  useEffect(() => {
    if (isPreview) {
      setLoading(false);
      return;
    }
    const unsubscribe = checkAuthState(async (currentUser) => {
      if (currentUser) {
        // Superadmins don't belong on the student page (their token has no appId)
        if (currentUser.isSuperAdmin) {
          router.replace("/superadmin");
          return;
        }
        // Ensure user is scoped to this app, otherwise sign out
        if (currentUser.appSlug !== appSlug) {
          signOutUser();
          setUser(null);
          setUsername("");
        } else {
          setUser(currentUser);
          setUsername(currentUser.username ?? "");
        }
      } else {
        setUser(null);
        setUsername("");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appSlug, isPreview]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthLoading(true);

    const input = accountOrEmail.trim();
    // Append the required domain suffix if raw alphanumeric ID is used
    const finalEmail = input.includes("@") ? input : `${input}@uni.edu.com`;

    try {
      const loggedInUser = await loginWithEmailAndPassword(finalEmail, password);
      setUser(loggedInUser);
      setUsername(loggedInUser.username ?? "");

      setAccountOrEmail("");
      setPassword("");

      if (loggedInUser.role === "admin") {
        router.push(`/${loggedInUser.appSlug ?? appSlug}/admin`);
      } else if (loggedInUser.appSlug && loggedInUser.appSlug !== appSlug) {
        // User belongs to a different classroom — redirect them there
        router.push(`/${loggedInUser.appSlug}`);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.status === 401) {
        setError("Invalid account or password. Please try again.");
      } else if (!password) {
        setError("Please enter your password.");
      } else {
        setError("Authentication failed. Please try again later.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    signOutUser();
    setUser(null);
    setUsername("");
  };

  const handleProgressCalculated = (completed: number, total: number) => {
    setCompletedLessons(completed);
    setTotalLessons(total);
  };

  // Calculate percentage dynamically for the Progress Bar
  const masterPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  if (appLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-bold text-muted-foreground animate-pulse">
            Configuring Classroom...
          </p>
        </div>
      </div>
    );
  }

  if (appError || !app) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <FileQuestion className="h-16 w-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Classroom Not Found</h2>
        <p className="text-slate-500 max-w-md mb-6">
          The code code or link you entered does not match an active school classroom.
        </p>
        <Button onClick={() => router.push("/")} className="font-semibold rounded-xl px-6 h-12">
          Enter Another Code
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <p className="text-lg font-bold text-muted-foreground animate-pulse">
          Loading Your Journey...
        </p>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-8">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {app.logo_path ? (
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={`${BASE_URL}/${app.logo_path}`}
                  alt={app.name}
                  className="object-contain w-full h-full p-1"
                />
              </div>
            ) : (
              <Award className="text-secondary w-8 h-8" />
            )}
            <h1 className="text-3xl font-extrabold text-slate-850">
              {app.name}
            </h1>
          </div>
          {user && (
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm font-bold text-muted-foreground">
                <span>Lessons Mastered</span>
                <span>
                  {completedLessons} / {totalLessons}
                </span>
              </div>
              <Progress
                value={masterPercentage}
                className="h-4 bg-white border-2 border-primary/20"
              />
            </div>
          )}
        </div>

        {/* Actions Context Toggle */}
        <div className="flex items-center gap-4">
          {user && (
            <>
              {username && (
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserIcon className="w-4 h-4" />
                  <span>Hi, {username}</span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2 border-2 bg-white rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Feature / Layout Conditionally Swapped */}
      <div className="flex-1">
        {user ? (
          <LessonGrid onProgressCalculated={handleProgressCalculated} />
        ) : (
          <div className="max-w-md mx-auto mt-8 p-8 bg-white border-2 border-primary/10 rounded-2xl shadow-xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Sign In
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Access your lessons and track your progress
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm font-medium rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground tracking-wide uppercase">
                  Account ID or Email
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    value={accountOrEmail}
                    onChange={(e) => setAccountOrEmail(e.target.value)}
                    required
                    placeholder="Enter your number or email"
                    className="w-full pl-10 pr-4 py-2 border-2 rounded-xl bg-muted/30 focus:outline-none focus:border-primary/40 transition-colors text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 border-2 rounded-xl bg-muted/30 focus:outline-none focus:border-primary/40 transition-colors text-slate-800"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full py-6 mt-2 text-md font-bold bg-primary hover:bg-primary/90 text-white rounded-xl transition-all shadow-md"
              >
                {authLoading ? "Signing in..." : "Unlock Journey"}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="mt-12 text-center">
        <p className="text-slate-300 font-bold text-xl tracking-wider uppercase">
          {app.name}
        </p>
      </div>
    </main>
  );
}
