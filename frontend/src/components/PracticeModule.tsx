"use client";

import { useEffect, useState } from "react";
import { WordData } from "@/lib/lessons-data";
import { playSpeech } from "@/lib/speech";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PracticeModuleProps {
  allWords: WordData[];
  index: number;
  initialSavedScore: number;
  setIndex: (index: number, calculatedScore?: number) => void;
  targetWord: WordData | null;
  setTargetWord: (word: WordData | null) => void;
  options: WordData[];
  setOptions: (words: WordData[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isConfirmed: boolean;
  setIsConfirmed: (val: boolean) => void;
  isCorrect: boolean | null;
  setIsCorrect: (val: boolean | null) => void;
}

export function PracticeModule({
  allWords,
  index,
  initialSavedScore,
  setIndex,
  targetWord,
  setTargetWord,
  options,
  setOptions,
  selectedId,
  setSelectedId,
  isConfirmed,
  setIsConfirmed,
  isCorrect,
  setIsCorrect,
}: PracticeModuleProps) {
  // Điểm số và trạng thái kết thúc xử lý tại cục bộ để tránh ghi đè liên tục lên DB khi đang làm dở
  const [score, setScore] = useState(initialSavedScore);
  const [isFinished, setIsFinished] = useState(index >= allWords.length);

  const totalQuestions = allWords.length;

  // Khởi tạo vòng chơi mới dựa trên một index cụ thể
  const setupRoundForIndex = (currentIndex: number) => {
    if (currentIndex >= totalQuestions) {
      setIsFinished(true);
      return;
    }

    const target = allWords[currentIndex];
    setTargetWord(target);

    const otherWords = allWords.filter((w) => w.id !== target.id);
    const shuffledOptions = [
      target,
      ...otherWords.sort(() => 0.5 - Math.random()).slice(0, 3),
    ].sort(() => 0.5 - Math.random());

    setOptions(shuffledOptions);
    setSelectedId(null);
    setIsConfirmed(false);
    setIsCorrect(null);
  };

  // Làm lại từ đầu: Reset toàn bộ chỉ số về 0
  const resetQuiz = () => {
    setIndex(0);
    setScore(0);
    setIsFinished(false);
    setupRoundForIndex(0);
  };

  // Chạy lần đầu tiên khi dữ liệu được nạp vào
  useEffect(() => {
    if (index >= totalQuestions) {
      setIsFinished(true);
    } else if (!targetWord && !isFinished && allWords.length > 0) {
      setupRoundForIndex(index);
    }
  }, [allWords, index]);

  const handleConfirm = () => {
    if (!selectedId || !targetWord) return;

    const correct = selectedId === targetWord.id;
    setIsConfirmed(true);
    setIsCorrect(correct);
    if (correct) setScore((prev) => prev + 1);
  };

  useEffect(() => {
    setScore(initialSavedScore);
  }, [initialSavedScore]);

  const handleContinue = () => {
    const nextIndex = index + 1;
    if (nextIndex >= totalQuestions) {
      // 1. Calculate the final score right before closing out
      const finalScore =
        totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

      // 2. Pass both the completed index and final score back to the parent
      setIndex(allWords.length, finalScore);
      setIsFinished(true);
    } else {
      setIndex(nextIndex);
      setupRoundForIndex(nextIndex);
    }
  };

  const playOption = (word: string) => {
    playSpeech(word, { lang: "en-US", rate: 0.85 });
  };

  const handleSelect = (option: WordData) => {
    if (isConfirmed) return;

    setSelectedId(option.id);
    playOption(option.text);
  };

  // --- RESULTS VIEW (Giao diện khi hoàn thành bài) ---
  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 py-16 text-center animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border-2 border-slate-100 w-full">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-yellow-600" />
          </div>
          <h2 className="text-4xl font-black text-slate-800 mb-2">
            Practice Complete!
          </h2>
          <p className="text-slate-500 text-lg mb-8">
            You reviewed all {totalQuestions} words.
          </p>

          <div className="flex justify-center gap-8 mb-10">
            <div className="text-center">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Score
              </p>
              <p className="text-5xl font-black text-primary">
                {score}/{totalQuestions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Accuracy
              </p>
              <p className="text-5xl font-black text-slate-700">
                {totalQuestions > 0
                  ? Math.round((score / totalQuestions) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>

          <Button
            onClick={resetQuiz}
            className="w-full max-w-xs h-16 rounded-2xl text-xl font-black uppercase tracking-widest shadow-[0_6px_0_0_#1d4ed8] active:translate-y-1 active:shadow-none transition-all flex gap-3 mx-auto justify-center"
          >
            <RotateCcw className="w-6 h-6" /> Restart
          </Button>
        </div>
      </div>
    );
  }

  // --- LOADING/FALLBACK VIEW ---
  // Thay vì return null (làm biến mất DOM), ta giữ nguyên một khung rỗng có chiều cao cố định
  if (!targetWord) {
    return <div className="min-h-[70dvh] max-w-2xl mx-auto w-full px-4" />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* FINISHED STATE */}
      {isFinished ? (
        <div className="flex items-center justify-center min-h-[75vh]">
          <div
            className="
            relative overflow-hidden
            w-full max-w-2xl
            rounded-[2.5rem]
            border border-slate-200
            bg-white
            shadow-2xl
            p-8 md:p-12
            text-center
          "
          >
            {/* Accent */}
            <div className="absolute inset-x-0 top-0 h-2 bg-yellow-500" />

            {/* Trophy */}
            <div className="w-28 h-28 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-8">
              <Trophy className="w-14 h-14 text-yellow-600" />
            </div>

            {/* Title */}
            <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-3">
              Practice Complete!
            </h2>

            <p className="text-lg text-slate-500 max-w-md mx-auto">
              You finished all vocabulary challenges in this lesson.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-10 mb-10">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">
                  Score
                </p>

                <p className="text-4xl font-black text-primary mt-3">
                  {score}/{totalQuestions}
                </p>
              </div>

              <div className="rounded-2xl border border-green-100 bg-green-50 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-green-500 font-bold">
                  Accuracy
                </p>

                <p className="text-4xl font-black text-green-600 mt-3">
                  {totalQuestions > 0
                    ? Math.round((score / totalQuestions) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>

            {/* Restart */}
            <Button
              onClick={resetQuiz}
              className="
              h-14 px-8
              rounded-2xl
              text-lg font-black
              shadow-lg
              hover:scale-[1.02]
              active:scale-[0.98]
              transition-all
            "
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Restart Practice
            </Button>
          </div>
        </div>
      ) : (
        /* QUIZ LAYOUT */
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* MAIN QUIZ CARD */}
          <div
            className="
            relative overflow-hidden
            rounded-[2.5rem]
            border border-slate-200
            bg-white
            shadow-2xl
          "
          >
            {/* Top Accent */}
            <div className="absolute inset-x-0 top-0 h-2 bg-primary" />

            {/* HEADER */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">
                    Vocabulary Practice
                  </p>

                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 mt-1">
                    Choose The Correct Word
                  </h2>
                </div>

                <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-primary font-bold">
                    Question
                  </p>

                  <p className="text-lg font-black text-primary">
                    {Math.min(index + 1, totalQuestions)} / {totalQuestions}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{
                    width: `${
                      (Math.min(index + 1, totalQuestions) / totalQuestions) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* CONTENT */}
            <div className="px-6 py-6">
              {/* Image */}
              <div className="flex justify-center mb-8">
                <div
                  className="
                  relative overflow-hidden
                  rounded-[2rem]
                  border border-slate-100
                  bg-gradient-to-br from-slate-50 to-slate-100
                  shadow-lg
                  w-[220px] h-[220px]
                  sm:w-[280px] sm:h-[280px]
                  md:w-[340px] md:h-[340px]
                  flex items-center justify-center
                "
                >
                  <Image
                    src={targetWord.image}
                    alt="Guess the word"
                    fill
                    className={cn(
                      "object-contain p-6 transition-all duration-500",
                      isConfirmed && isCorrect ? "scale-110" : "scale-100",
                    )}
                    priority
                  />
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {options.map((option) => {
                  const isSelected = selectedId === option.id;
                  const isTarget = option.id === targetWord.id;

                  return (
                    <button
                      key={option.id}
                      disabled={isConfirmed}
                      onClick={() => handleSelect(option)}
                      className={cn(
                        `
                        relative overflow-hidden
                        min-h-[72px]
                        rounded-2xl
                        border
                        px-4 py-5
                        font-black
                        text-sm md:text-lg
                        uppercase
                        tracking-wide
                        transition-all duration-200
                      `,
                        `
                        bg-white
                        border-slate-200
                        text-slate-700
                        hover:border-primary/40
                        hover:bg-primary/5
                        active:scale-[0.98]
                      `,
                        isSelected &&
                          "border-primary bg-primary/10 text-primary",
                        isConfirmed &&
                          isTarget &&
                          "border-green-500 bg-green-50 text-green-700",
                        isConfirmed &&
                          isSelected &&
                          !isTarget &&
                          "border-red-500 bg-red-50 text-red-700",
                        isConfirmed &&
                          !isTarget &&
                          !isSelected &&
                          "opacity-40 grayscale",
                      )}
                    >
                      {option.text}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FOOTER */}
            <div className="border-t border-slate-100 px-6 py-5">
              {!isConfirmed ? (
                <div className="flex justify-center">
                  <Button
                    onClick={handleConfirm}
                    disabled={!selectedId}
                    className="
                    h-14 px-10
                    rounded-2xl
                    text-lg font-black
                    shadow-lg
                    hover:scale-[1.02]
                    active:scale-[0.98]
                    transition-all
                  "
                  >
                    Check Answer
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    `
                    rounded-[2rem]
                    border
                    p-5
                    flex flex-col md:flex-row
                    items-center justify-between
                    gap-5
                    animate-in fade-in slide-in-from-bottom-4
                  `,
                    isCorrect
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200",
                  )}
                >
                  {/* Result */}
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center bg-white shadow-sm",
                        isCorrect ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="w-7 h-7" />
                      ) : (
                        <XCircle className="w-7 h-7" />
                      )}
                    </div>

                    <div>
                      <p
                        className={cn(
                          "text-2xl font-black",
                          isCorrect ? "text-green-700" : "text-red-700",
                        )}
                      >
                        {isCorrect ? "Correct!" : "Incorrect"}
                      </p>

                      {!isCorrect && (
                        <p className="text-sm font-semibold text-red-600 mt-1">
                          Correct answer: {targetWord.text}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Continue */}
                  <Button
                    onClick={handleContinue}
                    className={cn(
                      `
                      h-14 px-8
                      rounded-2xl
                      text-lg font-black
                      shadow-lg
                    `,
                      isCorrect
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700",
                    )}
                  >
                    {index + 1 >= totalQuestions ? "Finish" : "Next"}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
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
            {/* Score */}
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">
                Current Score
              </p>

              <h3 className="text-4xl font-black text-slate-800 mt-2">
                {score}
              </h3>
            </div>

            {/* Accuracy */}
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">
                  Accuracy
                </span>

                <span className="text-xl font-black text-primary">
                  {totalQuestions > 0
                    ? Math.round((score / Math.max(index, 1)) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Question List */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {allWords.map((word, i) => {
                const active = i === index;
                const completed = i < index;

                return (
                  <div
                    key={word.id}
                    className={cn(
                      `
                      flex items-center justify-between
                      rounded-xl
                      px-4 py-3
                      border transition-all
                    `,
                      active && "bg-primary/5 border-primary/30",
                      completed && "bg-green-50 border-green-100",
                      !active && !completed && "border-slate-100",
                    )}
                  >
                    <div>
                      <p
                        className={cn(
                          "font-bold text-sm",
                          active
                            ? "text-primary"
                            : completed
                              ? "text-green-700"
                              : "text-slate-700",
                        )}
                      >
                        Question {i + 1}
                      </p>

                      <p className="text-xs text-slate-400">{word.text}</p>
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
              onClick={resetQuiz}
              variant="outline"
              className="
              w-full mt-6
              h-12 rounded-xl
              font-bold
            "
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart Quiz
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
