"use client";

import React, { useState, useRef, useEffect } from "react";
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

interface SpeakModuleProps {
  words: WordData[];
  index: number;
  setIndex: (val: number | ((prev: number) => number)) => void;
  onUpdateStars?: (wordId: string, stars: number) => void;
  savedProgressStars?: Record<string, number>;
}

interface WordProgress {
  text: string;
  accuracy: number;
  stars: number;
  attempts: number;
}

const NUMBER_WORDS_MAP: Record<string, string> = {
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
  "10": "ten",
};

const SpeakModule: React.FC<SpeakModuleProps> = ({
  words,
  index,
  setIndex,
  onUpdateStars,
  savedProgressStars = {},
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: "success" | "error";
    bestMatch: string;
    accuracy: number;
  } | null>(null);

  const isFinished = index >= words.length;
  const current = words[index];

  // Helper helper to generate progress map structure
  const generateInitialProgress = (starsObj: Record<string, number>) => {
    console.log("Generating initial progress with starsObj:", starsObj);
    const initialProgress: Record<number, WordProgress> = {};
    words.forEach((word, i) => {
      const savedStars = starsObj[word.id] || 0;
      initialProgress[i] = {
        text: word.text,
        accuracy:
          savedStars === 5
            ? 95
            : savedStars === 4
              ? 80
              : savedStars === 3
                ? 65
                : savedStars === 2
                  ? 45
                  : savedStars === 1
                    ? 20
                    : 0,
        stars: savedStars,
        attempts: savedStars > 0 ? 1 : 0,
      };
    });
    return initialProgress;
  };

  // Initialize local progress cleanly
  const [progress, setProgress] = useState<Record<number, WordProgress>>(() =>
    generateInitialProgress(savedProgressStars),
  );

  // ONLY sync from parent on initial load when local state is entirely unpopulated
  useEffect(() => {
    if (Object.keys(savedProgressStars).length > 0) {
      setProgress((prev) => {
        // If we already have localized session stars accumulated, don't overwrite them
        const hasSessionProgress = Object.values(prev).some((p) => p.stars > 0);
        if (hasSessionProgress) return prev;

        return generateInitialProgress(savedProgressStars);
      });
    }
  }, [savedProgressStars]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [index]);

  const calculateStars = (acc: number) => {
    if (acc >= 90) return 5;
    if (acc >= 75) return 4;
    if (acc >= 60) return 3;
    if (acc >= 40) return 2;
    if (acc > 0) return 1;
    return 0;
  };

  const handleSpeech = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setFeedback({
        msg: "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.",
        type: "error",
        bestMatch: "Not Supported",
        accuracy: 0,
      });
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    // Check Secure Context (HTTPS or localhost)
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setFeedback({
        msg: "Microphone access is blocked because the site is not using HTTPS. Browsers require HTTPS for microphone and speech features.",
        type: "error",
        bestMatch: "HTTPS Required",
        accuracy: 0,
      });
      return;
    }

    // Explicitly check/request microphone permission via getUserMedia first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        console.error("Microphone permission error:", err);
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setFeedback({
            msg: "Microphone permission is blocked in your browser. Click the lock/settings icon in the address bar to allow Microphone access.",
            type: "error",
            bestMatch: "Mic Blocked",
            accuracy: 0,
          });
          return;
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          setFeedback({
            msg: "No microphone detected. Please plug in or enable your microphone.",
            type: "error",
            bestMatch: "No Microphone",
            accuracy: 0,
          });
          return;
        } else {
          setFeedback({
            msg: `Microphone access error: ${err.message || err.name}`,
            type: "error",
            bestMatch: "Mic Error",
            accuracy: 0,
          });
          return;
        }
      }
    } else if (!navigator.mediaDevices) {
      setFeedback({
        msg: "Microphone API (navigator.mediaDevices) is not available. Please access via HTTPS or use a supported browser like Chrome.",
        type: "error",
        bestMatch: "API Unavailable",
        accuracy: 0,
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (e: any) => {
      const results: string[] = Array.from(e.results[0]).map((r: any) => {
        let text = r.transcript.toLowerCase().trim();
        text = text.replace(/^[.\s]+|[.\s]+$/g, "");
        if (NUMBER_WORDS_MAP[text]) text = NUMBER_WORDS_MAP[text];
        return text;
      });

      if (!current) return;

      const target = current.text.toLowerCase().trim();
      const cleanedTarget = target.replace(/[^a-z0-9]/g, "");

      let bestMatch = results[0] || "";
      let maxAccuracy = 0;

      results.forEach((r) => {
        const cleanedResult = r.replace(/[^a-z0-9]/g, "");
        const maxLen = Math.max(cleanedResult.length, cleanedTarget.length);
        if (maxLen === 0) return;

        let matches = 0;
        for (
          let i = 0;
          i < Math.min(cleanedResult.length, cleanedTarget.length);
          i++
        ) {
          if (cleanedResult[i] === cleanedTarget[i]) matches++;
        }
        const score = matches / maxLen;

        if (score > maxAccuracy) {
          maxAccuracy = score;
          bestMatch = r;
        }
      });

      const accPercent = Math.round(maxAccuracy * 100);
      const isSuccess = accPercent > 70;

      setFeedback({
        msg: isSuccess ? "Amazing! 🌟" : `Try again! 💪`,
        type: isSuccess ? "success" : "error",
        bestMatch: bestMatch,
        accuracy: accPercent,
      });

      const calculatedNewStars = calculateStars(accPercent);

      // Look at our actual current local state for safety instead of parent sync
      const currentLocalStars = progress[index]?.stars || 0;
      const ultimateBestStars = Math.max(calculatedNewStars, currentLocalStars);

      setProgress((prev) => ({
        ...prev,
        [index]: {
          text: current.text,
          accuracy: Math.max(accPercent, prev[index]?.accuracy || 0),
          stars: ultimateBestStars,
          attempts: (prev[index]?.attempts || 0) + 1,
        },
      }));

      if (onUpdateStars) {
        onUpdateStars(current.id, calculatedNewStars);
      }
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      const error = event.error;
      if (error === "not-allowed" || error === "service-not-allowed") {
        setFeedback({
          msg: "Microphone access blocked. Please allow microphone access in your browser/site settings.",
          type: "error",
          bestMatch: "Mic Blocked",
          accuracy: 0,
        });
      } else if (error === "no-speech") {
        setFeedback({
          msg: "No speech detected. Please speak clearly into your microphone.",
          type: "error",
          bestMatch: "No Speech Detected",
          accuracy: 0,
        });
      } else if (error === "audio-capture") {
        setFeedback({
          msg: "No microphone detected. Please check your audio input device.",
          type: "error",
          bestMatch: "No Mic Found",
          accuracy: 0,
        });
      } else if (error === "network") {
        setFeedback({
          msg: "Network error connecting to speech recognition service.",
          type: "error",
          bestMatch: "Network Error",
          accuracy: 0,
        });
      } else if (error !== "aborted") {
        setFeedback({
          msg: `Speech recognition error: ${error}`,
          type: "error",
          bestMatch: error,
          accuracy: 0,
        });
      }
    };

    recognition.onend = () => setIsRecording(false);

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsRecording(false);
    }
  };

  const handleNext = () => {
    if (recognitionRef.current) recognitionRef.current.abort();
    setFeedback(null);
    setIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (recognitionRef.current) recognitionRef.current.abort();
    if (index > 0) {
      setFeedback(null);
      setIndex(index - 1);
    }
  };

  const playAudio = () => {
    if (!current) return;
    const utterance = new SpeechSynthesisUtterance(current.text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleRestart = () => {
    setIndex(0);
    setFeedback(null);
  };

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
              {words.map((word, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="p-4 font-bold text-slate-700">{word.text}</td>
                  <td className="p-4 font-medium text-slate-500">
                    {progress[i]?.accuracy || 0}%
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 md:w-4 md:h-4 ${
                            s < (progress[i]?.stars || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-slate-200"
                          }`}
                        />
                      ))}
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

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 md:gap-6 items-start">
        {/* Main Card */}
        <div
          className="
        relative overflow-hidden
        rounded-[1.5rem] md:rounded-[2rem]
        border border-slate-200
        bg-white
        shadow-xl
      "
        >
          {/* Top Accent */}
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

            {/* Stars */}
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5 self-start sm:self-auto">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 transition-colors ${
                    i < (progress[index]?.stars || 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Image */}
          <div className="px-4 md:px-6 pt-2">
            <div
              className="
            relative overflow-hidden
            rounded-[1.25rem] md:rounded-[1.5rem]
            border border-slate-100
            bg-gradient-to-br from-slate-50 to-slate-100
            flex items-center justify-center
            min-h-[220px]
            sm:min-h-[260px]
            md:min-h-[360px]
            p-4
          "
            >
              <img
                src={current.image}
                alt={current.text}
                className="
              max-h-[200px]
              sm:max-h-[240px]
              md:max-h-[320px]
              w-full
              object-contain
              transition-transform duration-300
              group-hover:scale-105
            "
              />
            </div>
          </div>

          {/* Word Section */}
          <div className="px-4 md:px-6 pt-5 md:pt-6 text-center">
            <h1
              className="
            text-3xl sm:text-4xl md:text-6xl
            font-black
            tracking-tight
            text-slate-900
            break-words
          "
            >
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
                    feedback.type === "success"
                      ? "text-green-500"
                      : "text-orange-500"
                  }`}
                >
                  "{feedback.bestMatch}"
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="px-4 md:px-6 py-6 md:py-8">
            <div className="flex items-center justify-center gap-3 sm:gap-5">
              {/* Speaker */}
              <button
                onClick={playAudio}
                className="
              w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20
              rounded-2xl
              bg-slate-100
              hover:bg-slate-200
              flex items-center justify-center
              transition-all duration-200
              active:scale-95
              shrink-0
            "
              >
                <Volume2 className="w-6 h-6 md:w-8 md:h-8 text-slate-700" />
              </button>

              {/* Mic */}
              <button
                onClick={handleSpeech}
                className={`
              relative
              w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28
              rounded-full
              flex items-center justify-center
              shadow-xl
              transition-all duration-300
              active:scale-95
              shrink-0
              ${
                isRecording
                  ? "bg-red-500 ring-[8px] md:ring-[10px] ring-red-100 animate-pulse"
                  : "bg-primary hover:scale-105"
              }
            `}
              >
                {isRecording ? (
                  <Square className="w-8 h-8 md:w-10 md:h-10 text-white fill-current" />
                ) : (
                  <Mic className="w-9 h-9 md:w-12 md:h-12 text-white" />
                )}
              </button>
            </div>

            {/* Status */}
            <div className="mt-5 text-center">
              <p
                className={`text-xs sm:text-sm font-bold tracking-[0.15em] uppercase ${
                  isRecording ? "text-red-500" : "text-slate-300"
                }`}
              >
                {isRecording ? "Listening..." : "Tap To Speak"}
              </p>
            </div>
          </div>

          {/* Footer Nav */}
          <div
            className="
          border-t border-slate-100
          px-4 md:px-6 py-4 md:py-5
        "
          >
            {/* Feedback */}
            {feedback && (
              <div className="flex justify-center mb-4">
                <div
                  className={`
                w-full sm:w-auto
                max-w-md
                px-4 py-3 rounded-2xl
                border font-bold text-sm text-center
                ${
                  feedback.type === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-orange-50 border-orange-200 text-orange-700"
                }
              `}
                >
                  {feedback.msg}

                  <div className="text-[11px] opacity-70 mt-1">
                    Accuracy: {feedback.accuracy}%
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={index === 0}
                className="
              h-11 md:h-12
              px-3 sm:px-5
              rounded-xl
              border-slate-200
              font-bold
              flex-1 sm:flex-none
            "
              >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 mr-1" />
                <span className="hidden sm:inline">Prev</span>
              </Button>

              <Button
                onClick={handleNext}
                className={`
              h-11 md:h-12
              px-3 sm:px-5
              rounded-xl
              font-bold
              flex-1 sm:flex-none
              ${
                index === words.length - 1
                  ? "bg-green-500 hover:bg-green-600"
                  : ""
              }
            `}
                variant={index === words.length - 1 ? "default" : "outline"}
              >
                {index === words.length - 1 ? "Finish" : "Next"}
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Sidebar */}
        <div
          className="
        rounded-[1.5rem] md:rounded-[2rem]
        border border-slate-200
        bg-white
        shadow-lg
        p-4 md:p-5
        xl:sticky xl:top-6
        order-last xl:order-last
      "
        >
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">
              Progress
            </p>

            <h3 className="text-xl md:text-2xl font-black text-slate-800 mt-1">
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
          <div className="space-y-2 max-h-[260px] md:max-h-[420px] overflow-y-auto pr-1">
            {words.map((word, i) => {
              const stars = progress[i]?.stars || 0;
              const active = i === index;

              return (
                <div
                  key={word.id}
                  className={`
                flex items-center justify-between
                rounded-xl
                px-3 py-3
                border transition-all gap-3
                ${
                  active ? "bg-primary/5 border-primary/30" : "border-slate-100"
                }
              `}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`
                    font-bold text-sm truncate
                    ${active ? "text-primary" : "text-slate-700"}
                  `}
                    >
                      {word.text}
                    </p>

                    <p className="text-xs text-slate-400">
                      {progress[i]?.accuracy || 0}% accuracy
                    </p>
                  </div>

                  <div className="flex gap-0.5 shrink-0">
                    {[...Array(5)].map((_, s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 md:w-3.5 md:h-3.5 ${
                          s < stars
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Restart */}
          <Button
            onClick={handleRestart}
            variant="outline"
            className="
          w-full mt-6
          h-11 md:h-12 rounded-xl
          font-bold
        "
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
