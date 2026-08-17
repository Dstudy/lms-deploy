"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Star, CheckCircle2 } from "lucide-react";

import {
  checkAuthState,
  getUserProgressList,
  listLessons,
  LessonSummary,
  StoredUser,
} from "@/lib/api";

interface LessonGridProps {
  onProgressCalculated?: (completedCount: number, totalCount: number) => void;
}

export function LessonGrid({ onProgressCalculated }: LessonGridProps) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = checkAuthState((currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    // Superadmin tokens have no appId — skip lesson fetch
    if (!user.appId) return;

    const fetchData = async () => {
      try {
        const { lessons: fetchedLessons } = await listLessons();
        setLessons(fetchedLessons);

        const lessonIds = fetchedLessons.map((l) => l.id);
        if (lessonIds.length > 0) {
          const response = await getUserProgressList(lessonIds);
          if (response.data?.userProgresses) {
            const progressData: Record<string, any> = {};
            response.data.userProgresses.forEach((record) => {
              progressData[record.lessonId] = record;
            });
            setProgressMap(progressData);
          }
        }
      } catch (error) {
        console.error("Error loading lessons or progress:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (loading || !onProgressCalculated || lessons.length === 0) return;

    const completedCount = lessons.reduce((count, lesson) => {
      const percentage = calculatePercentage(lesson);
      return percentage === 100 ? count + 1 : count;
    }, 0);

    onProgressCalculated(completedCount, lessons.length);
  }, [progressMap, loading, lessons]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Loading courses progress...
      </div>
    );
  }

  const calculatePercentage = (lesson: LessonSummary) => {
    const lessonId = lesson.id;
    const totalWords = lesson.wordCount || 0;
    const totalExternalLinks = lesson.linkCount || 0;

    if (!user || !progressMap[lessonId]) return 0;

    const progress = progressMap[lessonId];

    const currentLearn = progress.learnIndex || 0;
    const part1Fraction = totalWords > 0 ? Math.min(currentLearn / totalWords, 1) : 0;

    let part2Fraction = 0;
    if (progress.p2Stars && totalWords > 0) {
      try {
        const parsedStars = JSON.parse(progress.p2Stars);
        const completedSpeakingQuestions = Object.keys(parsedStars).length;
        part2Fraction = Math.min(completedSpeakingQuestions / totalWords, 1);
      } catch (e) {
        console.error("Error parsing p2Stars on grid item:", e);
      }
    }

    const part3Fraction = typeof progress.p3Score === "number" ? 1 : 0;

    const currentClickedLinks = progress.p4LinksCount || 0;
    let part4Fraction = 0;
    if (totalExternalLinks > 0) {
      part4Fraction = Math.min(currentClickedLinks / totalExternalLinks, 1);
    } else {
      part4Fraction = 1;
    }

    const totalFraction =
      part1Fraction * 0.25 +
      part2Fraction * 0.25 +
      part3Fraction * 0.25 +
      part4Fraction * 0.25;

    return Math.min(Math.round(totalFraction * 100), 100);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 p-4 sm:p-6">
      {lessons.map((lesson) => {
        const percentage = calculatePercentage(lesson);
        const isCompleted = percentage === 100;

        return (
          <Link
            key={lesson.id}
            href={`/lessons/${lesson.id}`}
            className="group"
          >
            <Card
              className="
              relative overflow-hidden
              rounded-3xl
              border border-slate-200/70
              bg-white/90 backdrop-blur
              shadow-sm hover:shadow-2xl
              transition-all duration-300
              hover:-translate-y-1
              active:scale-[0.98]
              h-full
            "
            >
              {/* Top Gradient */}
              <div
                className={`
                absolute inset-x-0 top-0 h-1.5
                ${
                  isCompleted
                    ? "bg-green-500"
                    : percentage >= 60
                      ? "bg-blue-500"
                      : percentage > 0
                        ? "bg-orange-400"
                        : "bg-slate-200"
                }
              `}
              />

              {/* Badge */}
              <div className="absolute top-4 right-4 z-10">
                {isCompleted ? (
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-100">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div
                    className={`
                    flex items-center justify-center
                    w-9 h-9 rounded-full
                    transition-colors
                    ${percentage > 0 ? "bg-amber-100" : "bg-slate-100"}
                  `}
                  >
                    <Star
                      className={`
                      w-5 h-5
                      ${
                        percentage > 0
                          ? "text-amber-500 fill-amber-400"
                          : "text-slate-300"
                      }
                    `}
                    />
                  </div>
                )}
              </div>

              {/* Main Content */}
              <div className="flex flex-col items-center justify-between text-center px-5 py-6 min-h-[250px]">
                {/* Image */}
                <div className="flex-1 flex items-center justify-center">
                  <div
                    className="
                    relative
                    w-24 h-24 sm:w-28 sm:h-28
                    rounded-2xl
                    bg-slate-50
                    border border-slate-100
                    flex items-center justify-center
                    transition-transform duration-300
                    group-hover:scale-105
                  "
                  >
                    <Image
                      src="/icon/Logo.png"
                      alt="Lesson Icon"
                      width={90}
                      height={90}
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* Text */}
                <div className="mt-4 space-y-2 w-full">
                  <h3
                    className="
                    text-sm sm:text-base
                    font-extrabold
                    text-slate-800
                    line-clamp-2
                    min-h-[44px]
                    flex items-center justify-center
                  "
                  >
                    {lesson.title}
                  </h3>

                  <p className="text-xs text-slate-500 font-medium">
                    {isCompleted
                      ? "Completed"
                      : percentage > 0
                        ? "In Progress"
                        : "Not Started"}
                  </p>
                </div>

                {/* Progress */}
                <div className="w-full mt-5">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-semibold text-slate-500">
                      Progress
                    </span>

                    <span
                      className={`
                      text-xs font-extrabold
                      ${isCompleted ? "text-green-600" : "text-slate-700"}
                    `}
                    >
                      {percentage}%
                    </span>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`
                      h-full rounded-full transition-all duration-500
                      ${
                        isCompleted
                          ? "bg-green-500"
                          : percentage >= 60
                            ? "bg-blue-500"
                            : "bg-orange-400"
                      }
                    `}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
