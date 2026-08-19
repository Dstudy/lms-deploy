/**
 * Cross-browser Speech Synthesis (TTS) Helper
 * 
 * Ensures consistent audio quality, pronunciation rate, and voice selection
 * across different browsers (Chrome, Edge, Safari, Firefox) and operating systems.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];
// Keep utterance reference in memory to prevent Chrome GC bug during playback
let activeUtterance: SpeechSynthesisUtterance | null = null;

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

/**
 * Heuristically finds the best available voice for a given language code.
 * Prioritizes high-quality natural/cloud/neural voices (Google, Edge Natural, Apple/Siri).
 */
export function getBestVoice(targetLang: string = "en-US"): SpeechSynthesisVoice | null {
  const voices = cachedVoices.length > 0 ? cachedVoices : loadVoices();
  if (!voices || voices.length === 0) return null;

  const normalizedTarget = targetLang.toLowerCase().replace("_", "-");
  const langPrefix = normalizedTarget.split("-")[0];

  // Candidates matching the language
  const matchingVoices = voices.filter((v) => {
    const vLang = v.lang.toLowerCase().replace("_", "-");
    return vLang === normalizedTarget || vLang.startsWith(langPrefix);
  });

  const voicePool = matchingVoices.length > 0 ? matchingVoices : voices;

  // Score candidate voices based on quality keywords
  const preferredKeywords = [
    "natural",
    "neural",
    "online",
    "google us english",
    "google",
    "siri",
    "samantha",
    "ava",
    "jenny",
    "guy",
    "aria",
    "zoe",
  ];

  let bestVoice: SpeechSynthesisVoice | null = null;
  let highestScore = -1;

  for (const voice of voicePool) {
    const nameLower = voice.name.toLowerCase();
    const vLang = voice.lang.toLowerCase().replace("_", "-");
    let score = 0;

    // Exact language match bonus
    if (vLang === normalizedTarget) {
      score += 10;
    } else if (vLang.startsWith(langPrefix)) {
      score += 5;
    }

    // High quality / natural voice bonus
    for (let i = 0; i < preferredKeywords.length; i++) {
      if (nameLower.includes(preferredKeywords[i])) {
        score += 20 - i; // Higher bonus for top preferred keywords
        break;
      }
    }

    // Non-local service bonus (often higher quality cloud/neural TTS)
    if (!voice.localService) {
      score += 3;
    }

    // Default voice bonus
    if (voice.default) {
      score += 1;
    }

    if (score > highestScore) {
      highestScore = score;
      bestVoice = voice;
    }
  }

  return bestVoice || voicePool[0] || null;
}

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  onError?: (err: SpeechSynthesisErrorEvent) => void;
}

/**
 * Speaks text consistently across browsers.
 */
export function playSpeech(text: string, options: SpeakOptions = {}): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("SpeechSynthesis is not supported in this environment.");
    return;
  }

  if (!text || !text.trim()) return;

  const {
    lang = "en-US",
    rate = 0.85,
    pitch = 1.0,
    volume = 1.0,
    onEnd,
    onError,
  } = options;

  try {
    // Cancel any ongoing speech to avoid overlapping / queuing lag
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    const bestVoice = getBestVoice(lang);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onend = () => {
      activeUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      // "interrupted" or "canceled" errors happen when cancel() is called, which is normal
      if (e.error !== "interrupted" && e.error !== "canceled") {
        console.warn("SpeechSynthesis utterance error:", e);
      }
      onError?.(e);
    };

    // Store reference to prevent garbage collection in Chrome
    activeUtterance = utterance;

    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Failed to execute playSpeech:", error);
  }
}
