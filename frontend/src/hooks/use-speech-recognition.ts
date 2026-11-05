"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechStatus = "idle" | "listening" | "error";

export interface SpeechError {
  title: string;
  message: string;
}

interface Options {
  lang?: string;
  maxAlternatives?: number;
  /** Safety net so the mic never stays open forever. */
  timeoutMs?: number;
  /** Called once per recognition session (including aborted ones), e.g. for usage metering. */
  onSession?: (info: {
    durationMs: number;
    hasResult: boolean;
    errorCode?: string;
  }) => void;
}

const ERROR_MAP: Record<string, SpeechError> = {
  "not-allowed": {
    title: "Mic Blocked",
    message:
      "Microphone access is blocked. Click the lock icon in the address bar and allow the microphone.",
  },
  "service-not-allowed": {
    title: "Mic Blocked",
    message:
      "Speech recognition is blocked by the browser or system. Check your site and privacy settings.",
  },
  "no-speech": {
    title: "No Speech Detected",
    message: "We didn't hear anything. Tap the mic and speak clearly.",
  },
  "audio-capture": {
    title: "No Mic Found",
    message: "No microphone detected. Please check your audio input device.",
  },
  network: {
    title: "Network Error",
    message: "Couldn't reach the speech recognition service. Check your connection.",
  },
};

function getRecognitionCtor(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function isInsecureContext(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    !window.isSecureContext && host !== "localhost" && host !== "127.0.0.1"
  );
}

export function useSpeechRecognition({
  lang = "en-US",
  maxAlternatives = 5,
  timeoutMs = 8000,
  onSession,
}: Options = {}) {
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [error, setError] = useState<SpeechError | null>(null);

  const recRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportRef = useRef<(() => void) | null>(null);
  const onSessionRef = useRef(onSession);
  onSessionRef.current = onSession;

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  /** Detaches handlers first so a dying session can't touch state afterwards. */
  const abort = useCallback(() => {
    clearTimer();
    const rec = recRef.current;
    recRef.current = null;
    reportRef.current?.();
    if (rec) {
      rec.onstart = rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
    setStatus("idle");
  }, []);

  useEffect(() => abort, [abort]);

  const start = useCallback(
    (onResult: (alternatives: string[]) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) {
        setSupported(false);
        return;
      }
      if (isInsecureContext()) {
        setError({
          title: "HTTPS Required",
          message:
            "Browsers only allow the microphone on HTTPS sites. Please open the secure version of this page.",
        });
        setStatus("error");
        return;
      }

      abort();
      setError(null);

      let retried = false;
      let gotResult = false;
      let startedAt = 0;
      let errorCode: string | undefined;
      let reported = false;

      // One report per session; the retry after a spurious "no-speech" is the same session.
      const report = () => {
        if (reported || !startedAt) return;
        reported = true;
        reportRef.current = null;
        onSessionRef.current?.({
          durationMs: Date.now() - startedAt,
          hasResult: gotResult,
          errorCode,
        });
      };
      reportRef.current = report;

      const launch = () => {
        const rec = new Ctor();
        recRef.current = rec;
        rec.lang = lang;
        rec.continuous = false;
        rec.interimResults = false;
        rec.maxAlternatives = maxAlternatives;

        rec.onstart = () => {
          if (recRef.current !== rec) return;
          if (!startedAt) startedAt = Date.now();
          setStatus("listening");
        };

        rec.onresult = (e: any) => {
          if (recRef.current !== rec) return;
          const first = e.results?.[0];
          if (!first) return;
          const alternatives = Array.from(first as ArrayLike<any>)
            .map((a) => String(a.transcript ?? "").trim())
            .filter(Boolean);
          if (alternatives.length === 0) return;
          gotResult = true;
          onResult(alternatives);
        };

        rec.onerror = (e: any) => {
          if (recRef.current !== rec) return;
          const code: string = e.error;
          if (code === "aborted") return;

          // Short single words often yield one spurious "no-speech"; retry once silently.
          if (code === "no-speech" && !retried) {
            retried = true;
            rec.onend = null;
            try {
              rec.abort();
            } catch {
              /* ignore */
            }
            launch();
            return;
          }

          clearTimer();
          recRef.current = null;
          errorCode = code;
          report();
          setError(
            ERROR_MAP[code] ?? {
              title: "Recognition Error",
              message: `Speech recognition error: ${code}`,
            },
          );
          setStatus("error");
        };

        rec.onend = () => {
          if (recRef.current !== rec) return;
          clearTimer();
          recRef.current = null;
          report();
          setStatus((s) => (s === "error" ? s : "idle"));
          if (!gotResult && !retried) {
            // Ended silently without audio; treat as no speech.
            setError(ERROR_MAP["no-speech"]);
            setStatus("error");
          }
        };

        try {
          rec.start();
        } catch (err: any) {
          recRef.current = null;
          setError({
            title: "Recognition Error",
            message: err?.message || "Failed to start speech recognition.",
          });
          setStatus("error");
          return;
        }

        clearTimer();
        timerRef.current = setTimeout(() => {
          try {
            rec.stop();
          } catch {
            /* ignore */
          }
        }, timeoutMs);
      };

      launch();
    },
    [abort, lang, maxAlternatives, timeoutMs],
  );

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus((s) => (s === "error" ? "idle" : s));
  }, []);

  return { supported, status, error, start, stop, abort, clearError };
}
