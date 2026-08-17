"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Lock, User as UserIcon, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithEmailAndPassword } from "@/lib/api";

export default function HomeLanding() {
  const router = useRouter();
  const [accountOrEmail, setAccountOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const input = accountOrEmail.trim();
    // Support bare account IDs (e.g. "12345") as well as full emails
    const finalEmail = input.includes("@") ? input : `${input}@uni.edu.com`;

    try {
      const user = await loginWithEmailAndPassword(finalEmail, password);

      // Redirect based on role and the app the account belongs to
      if (user.appSlug) {
        if (user.role === "admin") {
          router.push(`/${user.appSlug}/admin`);
        } else {
          router.push(`/${user.appSlug}`);
        }
      } else {
        setError("Your account is not linked to a classroom. Please contact your teacher.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.status === 401) {
        setError("Invalid account or password. Please try again.");
      } else {
        setError("Authentication failed. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center text-white space-y-2">
          <div className="inline-flex p-4 bg-white/20 backdrop-blur-md rounded-3xl mb-2 shadow-inner">
            <Award className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Little K English</h1>
          <p className="text-indigo-100 font-medium">Interactive AI-powered English learning portal</p>
        </div>

        <Card className="border-0 shadow-2xl rounded-3xl bg-white/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-slate-800">Student Sign In</CardTitle>
            <CardDescription className="text-slate-500">
              Enter your account details to access your lessons
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium rounded-xl">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="account" className="text-slate-600 font-bold uppercase tracking-wider text-xs">
                  Account ID or Email
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="account"
                    type="text"
                    placeholder="Enter your number or email"
                    value={accountOrEmail}
                    onChange={(e) => setAccountOrEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-slate-200 text-slate-800 font-semibold focus-visible:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-600 font-bold uppercase tracking-wider text-xs">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-slate-200 text-slate-800 font-semibold focus-visible:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5"
              >
                {loading ? "Signing in..." : "Unlock Journey"}
                {!loading && <ArrowRight className="w-4.5 h-4.5" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 flex items-center justify-between p-4 px-6 text-xs text-slate-500">
            <a
              href="/admin"
              className="font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
            >
              <ShieldCheck className="w-4 h-4" />
              Teacher Login
            </a>
            <a
              href="/superadmin"
              className="font-semibold text-slate-650 hover:text-indigo-600 flex items-center gap-1"
            >
              <HelpCircle className="w-4 h-4" />
              Platform Admin
            </a>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
