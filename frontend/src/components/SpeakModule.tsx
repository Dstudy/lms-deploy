"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Volume2,
  Mic,
  Square,
  ChevronLeft,
  ChevronRight,
  Star,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WordData } from "@/lib/lessons-data";
import { playSpeech } from "@/lib/speech";
import { recordSpeechUsage } from "@/lib/api";
import {
  SUCCESS_STARS,
  diffTarget,
  scoreAlternatives,
} from "@/lib/speech-scoring";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

interface SpeakModuleProps {
  words: WordData[];
  index: number;
  setIndex: (val: number | ((prev: number) => number)) => void;
  onUpdateStars?: (wordId: string, stars: number) => void;
  savedProgressStars?: Record<string, number>;
}

/** Progress made in this session, keyed by word id. */
interface Attempt {
  accuracy: number;
  stars: number;
  attempts: number;
}

interface Feedback {
  success: boolean;
  bestMatch: string;
  accuracy: number;
  stars: number;
}

const StarRow = ({
  stars,
  className,
  filled = "fill-amber-400 text-amber-400",
}: {
  stars: number;
  className: string;
  filled?: string;
}) => (
  <>
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${className} ${i < stars ? filled : "text-slate-200"}`}
      />
    ))}
  </>
);

const SpeakModule: React.FC<SpeakModuleProps> = ({
  words,
  index,
  setIndex,
  onUpdateStars,
  savedProgressStars = {},
}) => {
  const [session, setSession] = useState<Record<string, Attempt>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Word the current recognition session was started for (metering outlives navigation).
  const sessionWordIdRef = useRef<string | undefined>(undefined);

  const { supported, status, error, start, stop, abort, clearError } =
    useSpeechRecognition({
      lang: "en-US",
      maxAlternatives: 5,
      onSession: (info) =>
        recordSpeechUsage({ wordId: sessionWordIdRef.current, ...info }),
    });
  const isRecording = status === "listening";

  const isFinished = index >= words.length;
  const current = words[index];

  // Always-fresh view of the word being practised, so late recognizer callbacks can't
  // score against a word the user has already moved away from.
  const currentRef = useRef<WordData | undefined>(current);
  currentRef.current = current;

  // Best of what the server already knew and what happened this session.
  const bestStars = useCallback(
    (id: string) =>
      Math.max(savedProgressStars[id] || 0, session[id]?.stars || 0),
    [savedProgressStars, session],
  );

  // Leaving a word cancels recognition and clears its feedback.
  useEffect(() => {
    abort();
    clearError();
    setFeedback(null);
  }, [index, abort, clearError]);

  const submitAttempt = useCallback(
    (alternatives: string[], wordId: string) => {
      const word = currentRef.current;
      if (!word || word.id !== wordId) return;

      const result = scoreAlternatives(alternatives, word.text);
      const success = result.stars >= SUCCESS_STARS;

      setFeedback({ success, ...result });
      setSession((prev) => {
        const old = prev[word.id];
        return {
          ...prev,
          [word.id]: {
            accuracy: Math.max(result.accuracy, old?.accuracy || 0),
            stars: Math.max(result.stars, old?.stars || 0),
            attempts: (old?.attempts || 0) + 1,
          },
        };
      });

      // Only ever report the best result, so a bad retry can't lower a saved score.
      onUpdateStars?.(word.id, Math.max(result.stars, bestStars(word.id)));
    },
    [onUpdateStars, bestStars],
  );

  const handleMic = () => {
    if (!current) return;
    if (isRecording) {
      stop();
      return;
    }
    setFeedback(null);
    const wordId = current.id;
    sessionWordIdRef.current = wordId;
    start((alternatives) => submitAttempt(alternatives, wordId));
  };

  const handleNext = () => setIndex((prev) => prev + 1);
  const handlePrev = () => index > 0 && setIndex(index - 1);

  const handleRestart = () => {
    abort();
    setFeedback(null);
    setIndex(0);
  };

  const playAudio = () => {
    if (current) playSpeech(current.text, { lang: "en-US", rate: 0.85 });
  };

  const attemptedCount = useMemo(
    () => words.filter((w) => bestStars(w.id) > 0).length,
    [words, bestStars],
  );

  const diff = useMemo(
    () =>
      feedback && current ? diffTarget(feedback.bestMatch, current.text) : [],
    [feedback, current],
  );

  if (isFinished) {
    return (
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl p-4 md:p-8 animate-in zoom-in-95 duration-500 mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-6 text-primary uppercase">
          Speaking Complete!
        </h2>
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left min-w-[300px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4 font-bold text-slate-500">Word</th>
                <th className="p-4 font-bold text-slate-500">Best Score</th>
                <th className="p-4 font-bold text-slate-500">Stars</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word) => (
                <tr key={word.id} className="border-t border-slate-50">
                  <td className="p-4 font-bold text-slate-700">{word.text}</td>
                  <td className="p-4 font-medium text-slate-500">
                    {session[word.id] ? `${session[word.id].accuracy}%` : "—"}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <StarRow
                        stars={bestStars(word.id)}
                        className="w-3 h-3 md:w-4 md:h-4"
                        filled="fill-yellow-400 text-yellow-400"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          onClick={handleRestart}
          className="w-full mt-8 h-14 rounded-xl text-lg font-bold gap-2"
        >
          <RotateCcw className="w-5 h-5" /> Retake Lesson
        </Button>
      </div>
    );
  }

  if (!current) return null;

  const isLast = index === words.length - 1;
  const statusLabel = isRecording
    ? "Listening..."
    : supported
      ? "Tap To Speak"
      : "Speech recognition not supported in this browser";

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 md:gap-6 items-start">
        {/* Main Card */}
        <div className="relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className="absolute inset-x-0 top-0 h-1.5 md:h-2 bg-primary" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 md:px-6 pt-5 md:pt-6 pb-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-slate-400">
                Speaking Practice
              </p>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-800">
                Word {index + 1} / {words.length}
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5 self-start sm:self-auto">
              <StarRow
                stars={bestStars(current.id)}
                className="w-4 h-4 transition-colors"
              />
            </div>
          </div>

          {/* Image */}
          <div className="px-4 md:px-6 pt-2">
            <div className="relative overflow-hidden rounded-[1.25rem] md:rounded-[1.5rem] border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center min-h-[220px] sm:min-h-[260px] md:min-h-[360px] p-4">
              <img
                src={current.image}
                alt={current.text}
                className="max-h-[200px] sm:max-h-[240px] md:max-h-[320px] w-full object-contain"
              />
            </div>
          </div>

          {/* Word */}
          <div className="px-4 md:px-6 pt-5 md:pt-6 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight text-slate-900 break-words">
              {current.text}
            </h1>

            {!feedback ? (
              <p className="mt-2 text-base sm:text-lg md:text-xl text-slate-400 font-medium italic break-words">
                {current.phonetic}
              </p>
            ) : (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">
                  You said
                </p>
                <p
                  className={`text-xl sm:text-2xl md:text-3xl font-black break-words ${
                    feedback.success ? "text-green-500" : "text-orange-500"
                  }`}
                >
                  &ldquo;{feedback.bestMatch}&rdquo;
                </p>
                {!feedback.success && (
                  <p className="mt-2 text-lg font-bold tracking-wide break-words">
                    {diff.map((part, i) => (
                      <span
                        key={i}
                        className={
                          part.ok ? "text-slate-700" : "text-red-500 underline"
                        }
                      >
                        {part.char}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="px-4 md:px-6 py-6 md:py-8">
            <div className="flex items-center justify-center gap-3 sm:gap-5">
              <button
                type="button"
                onClick={playAudio}
                aria-label="Listen to the word"
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0"
              >
                <Volume2 className="w-6 h-6 md:w-8 md:h-8 text-slate-700" />
              </button>

              <button
                type="button"
                onClick={handleMic}
                disabled={!supported}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 active:scale-95 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isRecording
                    ? "bg-red-500 ring-[8px] md:ring-[10px] ring-red-100 animate-pulse"
                    : "bg-primary hover:scale-105"
                }`}
              >
                {isRecording ? (
                  <Square className="w-8 h-8 md:w-10 md:h-10 text-white fill-current" />
                ) : (
                  <Mic className="w-9 h-9 md:w-12 md:h-12 text-white" />
                )}
              </button>
            </div>

            <div className="mt-5 text-center">
              <p
                className={`text-xs sm:text-sm font-bold tracking-[0.15em] uppercase ${
                  isRecording ? "text-red-500" : "text-slate-300"
                }`}
              >
                {statusLabel}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 md:px-6 py-4 md:py-5">
            {error && (
              <div role="alert" className="flex justify-center mb-4">
                <div className="w-full sm:w-auto max-w-md px-4 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-700 font-bold text-sm text-center">
                  <div className="text-xs uppercase tracking-wider opacity-80">
                    {error.title}
                  </div>
                  {error.message}
                </div>
              </div>
            )}

            {feedback && !error && (
              <div className="flex justify-center mb-4">
                <div
                  className={`w-full sm:w-auto max-w-md px-4 py-3 rounded-2xl border font-bold text-sm text-center ${
                    feedback.success
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-orange-50 border-orange-200 text-orange-700"
                  }`}
                >
                  {feedback.success ? "Amazing! 🌟" : "Try again! 💪"}
                  <div className="flex justify-center gap-0.5 mt-1">
                    <StarRow stars={feedback.stars} className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] opacity-70 mt-1">
                    Accuracy: {feedback.accuracy}%
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={index === 0}
                className="h-11 md:h-12 px-3 sm:px-5 rounded-xl border-slate-200 font-bold flex-1 sm:flex-none"
              >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 mr-1" />
                <span className="hidden sm:inline">Prev</span>
              </Button>

              <Button
                onClick={handleNext}
                className={`h-11 md:h-12 px-3 sm:px-5 rounded-xl font-bold flex-1 sm:flex-none ${
                  isLast ? "bg-green-500 hover:bg-green-600" : ""
                }`}
                variant={isLast ? "default" : "outline"}
              >
                {isLast ? "Finish" : "Next"}
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Sidebar */}
        <div className="rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 bg-white shadow-lg p-4 md:p-5 xl:sticky xl:top-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">
              Practised
            </p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 mt-1">
              {attemptedCount} / {words.length}
            </h3>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(attemptedCount / words.length) * 100}%` }}
            />
          </div>

          <div className="space-y-2 max-h-[260px] md:max-h-[420px] overflow-y-auto pr-1">
            {words.map((word, i) => {
              const active = i === index;
              const attempt = session[word.id];
              return (
                <button
                  type="button"
                  key={word.id}
                  onClick={() => setIndex(i)}
                  className={`w-full text-left flex items-center justify-between rounded-xl px-3 py-3 border transition-all gap-3 ${
                    active
                      ? "bg-primary/5 border-primary/30"
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-bold text-sm truncate ${
                        active ? "text-primary" : "text-slate-700"
                      }`}
                    >
                      {word.text}
                    </p>
                    <p className="text-xs text-slate-400">
                      {attempt
                        ? `${attempt.accuracy}% best`
                        : bestStars(word.id) > 0
                          ? "Saved"
                          : "Not tried"}
                    </p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <StarRow
                      stars={bestStars(word.id)}
                      className="w-3 h-3 md:w-3.5 md:h-3.5"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            onClick={handleRestart}
            variant="outline"
            className="w-full mt-6 h-11 md:h-12 rounded-xl font-bold"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restart Lesson
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SpeakModule;
