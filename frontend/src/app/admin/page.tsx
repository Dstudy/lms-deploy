"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Lock, User as UserIcon, RefreshCw, KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { loginWithEmailAndPassword, checkAuthState, signOutUser } from "@/lib/api";

function UniversalAdminLogin() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check auth state — if already logged in as admin, redirect to their app's portal
  useEffect(() => {
    const unsubscribe = checkAuthState((user) => {
      if (user && user.role === "admin" && user.appSlug) {
        router.push(`/${user.appSlug}/admin`);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const inputEmail = email.trim();
    const finalEmail = inputEmail.includes("@") ? inputEmail : `${inputEmail}@uni.edu.com`;

    try {
      const user = await loginWithEmailAndPassword(finalEmail, password);
      if (user.role === "admin" && user.appSlug) {
        toast({
          title: "Admin Authenticated",
          description: `Logged in to ${user.appSlug} dashboard.`,
        });
        router.push(`/${user.appSlug}/admin`);
      } else if (user.role === "admin") {
        router.push(`/admin`);
      } else {
        signOutUser();
        setError("Only administrators can log in to the admin portal.");
      }
    } catch (err: any) {
      console.error("Admin login error:", err);
      if (err.status === 401) {
        setError("Invalid admin account or password.");
      } else {
        setError(err.message ?? "Authentication failed. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl rounded-3xl bg-white overflow-hidden">
        <div className="bg-slate-900 px-6 py-8 text-center text-white">
          <div className="inline-flex p-3 bg-slate-800 rounded-2xl mb-3">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Admin Gateway</CardTitle>
          <CardDescription className="text-slate-400 mt-1">
            Sign in to access your administrative dashboard
          </CardDescription>
        </div>
        <CardContent className="p-6 pt-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Admin Account / Email</Label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <Input
                  id="email"
                  placeholder="Enter email or account ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10.5 rounded-xl border-slate-200 text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Security Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10.5 rounded-xl border-slate-200 text-slate-800"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Verifying Gateway...
                </>
              ) : (
                <>
                  Enter Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function UniversalAdminLoginWithSuspense() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl rounded-3xl bg-white overflow-hidden p-6 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 font-semibold">Loading Admin Gateway...</p>
        </Card>
      </div>
    }>
      <UniversalAdminLogin />
    </Suspense>
  );
}
