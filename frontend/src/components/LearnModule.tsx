"use client";

import { WordData } from "@/lib/lessons-data";
import { playSpeech } from "@/lib/speech";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";

interface LearnModuleProps {
  words: WordData[];
  index: number;
  setIndex: (val: number | ((prev: number) => number)) => void;
}

export function LearnModule({ words, index, setIndex }: LearnModuleProps) {
  // REMOVED: const [isFinished, setIsFinished] = useState(false);

  // DERIVED STATE: The user is finished if the global index matches the words length
  const isFinished = index >= words.length;

  // Safe accessor so current won't crash when index equals words.length
  const current = words[index];

  const playAudio = () => {
    if (!current) return;
    playSpeech(current.text, { lang: "en-US", rate: 0.85 });
  };

  const next = () => {
    // ALWAYS advance the index—even past the last word index (e.g., up to index 10)
    setIndex((prev) => prev + 1);
  };

  const prev = () => {
    setIndex((prev) => Math.max(0, prev - 1));
  };

  const restart = () => {
    setIndex(0);
  };

  // --- Finish UI Panel ---
  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500">
        <Card className="flex flex-col items-center justify-center p-12 rounded-[3rem] shadow-2xl bg-white border-8 border-green-500/20 text-center">
          <div className="bg-green-100 p-6 rounded-full mb-6">
            <CheckCircle2 className="w-20 h-20 text-green-600" />
          </div>
          <h2 className="text-4xl font-black text-slate-800 mb-2">
            Great Job!
          </h2>
          <p className="text-xl text-slate-500 mb-8">
            You've finished all the words in this lesson.
          </p>

          <div className="flex gap-4">
            <Button
              onClick={restart}
              variant="outline"
              className="px-8 py-6 rounded-2xl text-lg font-bold border-2"
            >
              <RotateCcw className="mr-2 h-5 w-5" /> Review Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Fallback check in case dynamic word array length issues occur
  if (!current) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* FINISH SCREEN */}
      {isFinished ? (
        <div className="flex items-center justify-center min-h-[70vh]">
          <Card
            className="
            relative overflow-hidden
            w-full max-w-2xl
            rounded-[2.5rem]
            border border-green-200
            bg-white
            shadow-2xl
            text-center
            p-8 md:p-12
          "
          >
            {/* Top Accent */}
            <div className="absolute inset-x-0 top-0 h-2 bg-green-500" />

            {/* Success Icon */}
            <div className="mx-auto mb-6 w-28 h-28 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-14 h-14 text-green-600" />
            </div>

            {/* Text */}
            <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-3">
              Lesson Complete!
            </h2>

            <p className="text-lg md:text-xl text-slate-500 max-w-md mx-auto leading-relaxed">
              You’ve successfully reviewed all vocabulary words in this lesson.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-8 mb-10">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                <p className="text-sm uppercase tracking-[0.15em] text-slate-400 font-bold">
                  Total Words
                </p>

                <p className="text-3xl font-black text-slate-800 mt-2">
                  {words.length}
                </p>
              </div>

              <div className="rounded-2xl bg-green-50 border border-green-100 p-5">
                <p className="text-sm uppercase tracking-[0.15em] text-green-500 font-bold">
                  Progress
                </p>

                <p className="text-3xl font-black text-green-600 mt-2">100%</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={restart}
                variant="outline"
                className="
                h-14 px-8
                rounded-2xl
                border-2
                text-base font-bold
              "
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Review Again
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        /* LEARNING SCREEN */
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Main Learning Card */}
          <Card
            className="
            relative overflow-hidden
            rounded-[2.5rem]
            border border-slate-200
            bg-white
            shadow-2xl
          "
          >
            {/* Accent */}
            <div className="absolute inset-x-0 top-0 h-2 bg-primary" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Vocabulary Learning
                </p>

                <h2 className="text-2xl md:text-3xl font-black text-slate-800 mt-1">
                  Word {index + 1}
                </h2>
              </div>

              {/* Progress Badge */}
              <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-2">
                <p className="text-xs uppercase tracking-[0.15em] text-primary font-bold">
                  Progress
                </p>

                <p className="text-lg font-black text-primary">
                  {Math.round(((index + 1) / words.length) * 100)}%
                </p>
              </div>
            </div>

            {/* Image */}
            <div className="px-6 pt-4">
              <div
                className="
                relative overflow-hidden
                rounded-[2rem]
                bg-gradient-to-br from-slate-50 to-slate-100
                border border-slate-100
                min-h-[320px]
                md:min-h-[420px]
                flex items-center justify-center
              "
              >
                <Image
                  src={current.image}
                  alt={current.text}
                  width={600}
                  height={400}
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="
                  max-h-[280px]
                  md:max-h-[360px]
                  object-contain
                  transition-transform duration-300
                  hover:scale-105
                "
                  priority
                />
              </div>
            </div>

            {/* Word Content */}
            <div className="px-6 py-8 text-center">
              <h1
                className="
                text-5xl md:text-7xl
                font-black
                tracking-tight
                text-slate-900
              "
              >
                {current.text}
              </h1>

              {current.phonetic && (
                <p className="mt-3 text-xl md:text-2xl italic text-slate-400 font-medium">
                  {current.phonetic}
                </p>
              )}

              {/* Audio Button */}
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={playAudio}
                  className="
                  w-20 h-20 md:w-24 md:h-24
                  rounded-full
                  shadow-xl
                  hover:scale-105
                  active:scale-95
                  transition-all duration-200
                "
                >
                  <Volume2 className="w-9 h-9 md:w-11 md:h-11" />
                </Button>
              </div>
            </div>

            {/* Navigation Footer */}
            <div
              className="
              border-t border-slate-100
              px-6 py-5
              flex items-center justify-between
            "
            >
              <Button
                variant="outline"
                disabled={index === 0}
                onClick={prev}
                className="
                h-12 px-5 rounded-xl
                font-bold
              "
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Previous
              </Button>

              <div className="text-center hidden md:block">
                <p className="text-sm font-semibold text-slate-400">
                  {index + 1} of {words.length} words
                </p>
              </div>

              <Button
                onClick={next}
                className={`
                h-12 px-5 rounded-xl
                font-bold
                ${
                  index === words.length - 1
                    ? "bg-green-500 hover:bg-green-600"
                    : ""
                }
              `}
              >
                {index === words.length - 1 ? "Finish" : "Next"}

                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </Card>

          {/* Sidebar */}
          <div
            className="
            rounded-[2rem]
            border border-slate-200
            bg-white
            shadow-lg
            p-5
            sticky top-6
          "
          >
            {/* Progress Overview */}
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">
                Lesson Progress
              </p>

              <h3 className="text-3xl font-black text-slate-800 mt-2">
                {Math.round(((index + 1) / words.length) * 100)}%
              </h3>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{
                  width: `${((index + 1) / words.length) * 100}%`,
                }}
              />
            </div>

            {/* Word List */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {words.map((word, i) => {
                const active = i === index;
                const completed = i < index;

                return (
                  <div
                    key={word.id}
                    className={`
                    flex items-center justify-between
                    rounded-xl
                    px-4 py-3
                    border transition-all duration-200
                    ${
                      active
                        ? "bg-primary/5 border-primary/30"
                        : completed
                          ? "bg-green-50 border-green-100"
                          : "border-slate-100"
                    }
                  `}
                  >
                    <div>
                      <p
                        className={`
                        font-bold text-sm
                        ${
                          active
                            ? "text-primary"
                            : completed
                              ? "text-green-700"
                              : "text-slate-700"
                        }
                      `}
                      >
                        {word.text}
                      </p>

                      {word.phonetic && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {word.phonetic}
                        </p>
                      )}
                    </div>

                    {completed && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Restart */}
            <Button
              onClick={restart}
              variant="outline"
              className="
              w-full mt-6
              h-12 rounded-xl
              font-bold
            "
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart Lesson
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
