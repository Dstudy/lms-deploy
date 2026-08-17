import { Suspense } from "react";
import { RefreshCw } from "lucide-react";
import EditLessonClient from "./EditLessonClient";

export async function generateStaticParams() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/lessons`,
      {
        headers: {
          Authorization: `Bearer ${process.env.BUILD_ADMIN_TOKEN ?? ""}`,
        },
      }
    );
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    return (data.lessons ?? []).map((l: { id: string }) => ({ id: l.id }));
  } catch {
    const { LESSONS } = await import("@/lib/lessons-data");
    return LESSONS.map((l) => ({ id: l.id }));
  }
}

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-white">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <EditLessonClient id={id} />
    </Suspense>
  );
}
