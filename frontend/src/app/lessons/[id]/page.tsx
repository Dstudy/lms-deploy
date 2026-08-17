import LessonClient from "./LessonClient";

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
    // Fallback to hardcoded list if API is unavailable at build time
    const { LESSONS } = await import("@/lib/lessons-data");
    return LESSONS.map((l) => ({ id: l.id }));
  }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LessonClient id={id} />;
}
