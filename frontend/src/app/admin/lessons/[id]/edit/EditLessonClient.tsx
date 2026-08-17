"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  checkAuthState,
  getUserProfile,
  getLessonById,
  updateLesson,
} from "@/lib/api";
import LessonFormFields, { LessonFormState } from "@/components/LessonFormFields";

export default function EditLessonClient({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backUrl = searchParams.get("from") ?? "/admin";

  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<LessonFormState>({
    id: "",
    title: "",
    icon: "",
    sortOrder: 0,
    words: [],
    externalLinks: [],
  });

  useEffect(() => {
    const unsubscribe = checkAuthState(async (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      try {
        const res = await getUserProfile(user.id);
        if (res.data?.userProfile?.role !== "admin") {
          router.push("/");
          return;
        }
        setIsAdmin(true);
      } catch {
        router.push("/");
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    setLoading(true);
    getLessonById(id)
      .then(({ lesson }) => {
        if (!lesson) {
          router.push(backUrl);
          return;
        }
        setForm({
          id: lesson.id,
          title: lesson.title,
          icon: lesson.icon,
          sortOrder: lesson.sortOrder,
          words: lesson.words.map((w) => ({ ...w })),
          externalLinks: (lesson.externalLinks ?? []).map((l) => ({ ...l })),
        });
      })
      .catch(() => router.push(backUrl))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, id, router, backUrl]);

  const handleSave = async () => {
    setError("");
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    try {
      await updateLesson(id, {
        title: form.title.trim(),
        icon: form.icon,
        sortOrder: form.sortOrder,
        words: form.words,
        externalLinks: form.externalLinks,
      });
      router.push(backUrl);
    } catch (err: any) {
      setError(err.message ?? "Failed to update lesson.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-bold text-muted-foreground animate-pulse">
            Checking Permissions...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500 max-w-md mb-6">
          You do not have administrative privileges to access this page.
        </p>
        <Link href="/">
          <Button className="font-semibold rounded-xl px-6 h-12">Return Home</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-bold text-muted-foreground animate-pulse">
            Loading lesson...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 bg-white p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full border"
          onClick={() => router.push(backUrl)}
        >
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Edit Lesson</h1>
          <p className="text-sm text-slate-500 font-mono mt-0.5">{id}</p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200">
        <LessonFormFields form={form} setForm={setForm} editMode />

        {error && (
          <p className="text-sm text-rose-500 font-medium mt-4">{error}</p>
        )}

        <div className="flex gap-3 mt-6 justify-end">
          <Button
            variant="outline"
            onClick={() => router.push(backUrl)}
            className="rounded-xl"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl font-bold"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </main>
  );
}
