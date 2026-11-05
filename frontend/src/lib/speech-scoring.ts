const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
];

/** 0 -> "zero", 21 -> "twenty one", 105 -> "one hundred five" (up to 999,999). */
function numberToWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) {
    return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : "");
  }
  if (n < 1000) {
    const rest = n % 100;
    return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` ${numberToWords(rest)}` : ""}`;
  }
  const rest = n % 1000;
  return `${numberToWords(Math.floor(n / 1000))} thousand${rest ? ` ${numberToWords(rest)}` : ""}`;
}

function wordifyToken(token: string): string {
  if (!/^\d+$/.test(token)) return token;
  const n = Number(token);
  return n < 1_000_000 ? numberToWords(n) : token;
}

// Words the recognizer commonly returns for a different spelling of the same sound.
const HOMOPHONES: Record<string, string> = {
  to: "two",
  too: "two",
  for: "four",
  fore: "four",
  won: "one",
  ate: "eight",
  tree: "three",
  sea: "see",
  eye: "i",
  bear: "bare",
  blue: "blew",
  red: "read",
  hear: "here",
  right: "write",
  son: "sun",
  flower: "flour",
  knight: "night",
  no: "know",
};

export const SUCCESS_STARS = 3;

/** Lowercase, expand digits to words, drop punctuation, collapse whitespace. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/(?<=\d),(?=\d{3}\b)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(wordifyToken)
    .join(" ");
}

function canonical(text: string): string {
  return normalize(text)
    .split(" ")
    .map((token) => HOMOPHONES[token] ?? token)
    .join("");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** 0-100 similarity between what was said and the target word/phrase. */
export function similarity(spoken: string, target: string): number {
  const rawSpoken = normalize(spoken).replace(/ /g, "");
  const rawTarget = normalize(target).replace(/ /g, "");
  const s = canonical(spoken);
  const t = canonical(target);

  // The target is accepted when either the literal or homophone-normalised form matches.
  const score = (x: string, y: string) => {
    const maxLen = Math.max(x.length, y.length);
    if (maxLen === 0) return 0;
    return 1 - levenshtein(x, y) / maxLen;
  };

  return Math.round(Math.max(score(rawSpoken, rawTarget), score(s, t)) * 100);
}

export interface ScoreResult {
  bestMatch: string;
  accuracy: number;
  stars: number;
}

/** Scores every recognizer alternative and keeps the best one. */
export function scoreAlternatives(
  alternatives: string[],
  target: string,
): ScoreResult {
  let bestMatch = alternatives[0] ?? "";
  let accuracy = 0;

  for (const alt of alternatives) {
    const acc = similarity(alt, target);
    if (acc > accuracy) {
      accuracy = acc;
      bestMatch = alt;
    }
  }

  // Show numbers as words ("1" -> "one"), the same form that was compared.
  bestMatch = normalize(bestMatch);

  return { bestMatch, accuracy, stars: starsFromAccuracy(accuracy) };
}

export function starsFromAccuracy(accuracy: number): number {
  if (accuracy >= 90) return 5;
  if (accuracy >= 75) return 4;
  if (accuracy >= 60) return 3;
  if (accuracy >= 40) return 2;
  if (accuracy > 0) return 1;
  return 0;
}

export type DiffPart = { char: string; ok: boolean };

/**
 * Aligns spoken text against the target (via edit-distance backtrace) and marks each
 * target character as matched or missed, so the UI can highlight what to fix.
 */
export function diffTarget(spoken: string, target: string): DiffPart[] {
  const s = normalize(spoken).replace(/ /g, "");
  const tChars = Array.from(target);
  const tNorm = tChars.map((c) => c.toLowerCase());

  const n = s.length;
  const m = tNorm.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s[i - 1] === tNorm[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  const ok = new Array<boolean>(m).fill(false);
  let i = n;
  let j = m;
  while (j > 0) {
    if (
      i > 0 &&
      dp[i][j] === dp[i - 1][j - 1] + (s[i - 1] === tNorm[j - 1] ? 0 : 1)
    ) {
      ok[j - 1] = s[i - 1] === tNorm[j - 1];
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      i--;
    } else {
      j--;
    }
  }

  // Spaces/punctuation in the target are never "missed".
  return tChars.map((char, idx) => ({
    char,
    ok: ok[idx] || !/[a-z0-9]/i.test(char),
  }));
}
