import { ApiWordData, ApiLinkData, BulkLessonPayload } from "./api";

export interface ParsedLessonWarning {
  row: number;
  message: string;
}

export interface ParsedLessonError {
  row: number;
  message: string;
}

export interface ParseLessonCSVResult {
  lessons: BulkLessonPayload[];
  stats: {
    totalLessons: number;
    totalWords: number;
    totalLinks: number;
  };
  warnings: ParsedLessonWarning[];
  errors: ParsedLessonError[];
}

/**
 * Parses raw CSV / TSV text into a structured 2D array of strings,
 * respecting quoted cells with commas, newlines, and escaped quotes.
 */
export function parseCSVToRows(text: string): string[][] {
  // Strip UTF-8 BOM if present
  let cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  cleanText = cleanText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (!cleanText.trim()) return [];

  // Determine delimiter: detect comma vs semicolon vs tab from first non-empty line
  const firstLine = cleanText.split("\n").find((l) => l.trim().length > 0) || "";
  let delimiter = ",";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = "\t";
  } else if (semicolonCount > commaCount) {
    delimiter = ";";
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          i++;
        } else {
          // End of quote
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === "\n") {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parses raw CSV text or 2D string rows into validated BulkLessonPayload array.
 */
export function parseLessonsFromCSV(csvText: string): ParseLessonCSVResult {
  const rawRows = parseCSVToRows(csvText);
  return parseLessonsFromRawRows(rawRows);
}

export function parseLessonsFromRawRows(rawRows: string[][]): ParseLessonCSVResult {
  const warnings: ParsedLessonWarning[] = [];
  const errors: ParsedLessonError[] = [];

  if (rawRows.length < 2) {
    return {
      lessons: [],
      stats: { totalLessons: 0, totalWords: 0, totalLinks: 0 },
      warnings,
      errors: [{ row: 1, message: "File is empty or missing data rows" }],
    };
  }

  const headerRow = rawRows[0];
  const headerMap: Record<string, number> = {};

  headerRow.forEach((col, idx) => {
    const norm = normalizeHeader(col);
    if (!norm) return;

    if (["id", "lessonid", "lesson_id", "lessoncode", "code"].includes(norm)) {
      headerMap.lessonId = idx;
    } else if (["title", "lessontitle", "lessonname", "name", "topic", "lesson"].includes(norm)) {
      if (headerMap.lessonId === undefined && (norm === "lesson" || norm === "id")) {
        headerMap.lessonId = idx;
      } else {
        headerMap.title = idx;
      }
    } else if (["icon", "lessonicon", "emoji", "symbol"].includes(norm)) {
      headerMap.icon = idx;
    } else if (["sortorder", "sort_order", "order", "sort", "sequence", "seq"].includes(norm)) {
      headerMap.sortOrder = idx;
    } else if (["word", "wordtext", "text", "vocabulary", "vocab", "term"].includes(norm)) {
      headerMap.word = idx;
    } else if (["image", "imageurl", "img", "photo", "picture", "pic"].includes(norm)) {
      headerMap.image = idx;
    } else if (["phonetic", "ipa", "pronunciation", "sound"].includes(norm)) {
      headerMap.phonetic = idx;
    } else if (["linktitle", "linktext", "linkname", "resourcetitle", "linklabel", "link"].includes(norm)) {
      if (norm === "link" && headerMap.linkUrl === undefined) {
        headerMap.linkUrl = idx;
      } else {
        headerMap.linkTitle = idx;
      }
    } else if (["linkurl", "url", "href", "resourceurl"].includes(norm)) {
      headerMap.linkUrl = idx;
    }
  });

  // Fallback defaults if headers were generic or positional
  if (headerMap.lessonId === undefined && headerMap.title === undefined) {
    // If no explicit lesson identifier header, assume col 0 is lessonId / Title
    headerMap.lessonId = 0;
    headerMap.title = 1;
    headerMap.word = 2;
    headerMap.image = 3;
    headerMap.phonetic = 4;
  }

  const lessonMap = new Map<string, BulkLessonPayload>();
  const lessonOrder: string[] = [];
  let currentActiveLessonId: string | null = null;

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    const rowNum = r + 1; // 1-indexed for human readability

    // Extract cell values safely
    const getVal = (idx: number | undefined) => (idx !== undefined && idx < row.length ? row[idx].trim() : "");

    let rawLessonId = getVal(headerMap.lessonId);
    let rawTitle = getVal(headerMap.title);
    const rawIcon = getVal(headerMap.icon);
    const rawSortOrderStr = getVal(headerMap.sortOrder);
    const rawWord = getVal(headerMap.word);
    const rawImage = getVal(headerMap.image);
    const rawPhonetic = getVal(headerMap.phonetic);
    const rawLinkTitle = getVal(headerMap.linkTitle);
    const rawLinkUrl = getVal(headerMap.linkUrl);

    // If both lessonId and title are empty, check if we can continue with the current active lesson
    if (!rawLessonId && !rawTitle) {
      if (currentActiveLessonId && (rawWord || rawLinkUrl)) {
        rawLessonId = currentActiveLessonId;
      } else {
        warnings.push({ row: rowNum, message: "Skipped empty row or row with no lesson identifier" });
        continue;
      }
    }

    // Determine final lesson ID
    let finalLessonId = rawLessonId;
    if (!finalLessonId && rawTitle) {
      finalLessonId = slugify(rawTitle) || `lesson-${lessonOrder.length + 1}`;
    }

    // Determine final lesson Title
    let finalTitle = rawTitle;
    if (!finalTitle && finalLessonId) {
      // Capitalize/format id into title (e.g. lesson-1 -> Lesson 1)
      finalTitle = finalLessonId.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }

    if (!finalLessonId) {
      errors.push({ row: rowNum, message: "Could not determine Lesson ID for row" });
      continue;
    }

    currentActiveLessonId = finalLessonId;

    // Get or create lesson payload
    let lesson = lessonMap.get(finalLessonId);
    if (!lesson) {
      const parsedOrder = parseInt(rawSortOrderStr, 10);
      const sortOrder = Number.isFinite(parsedOrder) ? parsedOrder : lessonOrder.length + 1;

      lesson = {
        id: finalLessonId,
        title: finalTitle,
        icon: rawIcon || "",
        sortOrder,
        words: [],
        externalLinks: [],
      };
      lessonMap.set(finalLessonId, lesson);
      lessonOrder.push(finalLessonId);
    } else {
      // If later rows specify title/icon/sortOrder, update if not already set
      if (rawTitle && (!lesson.title || lesson.title === lesson.id)) lesson.title = rawTitle;
      if (rawIcon && !lesson.icon) lesson.icon = rawIcon;
      if (rawSortOrderStr && !Number.isFinite(lesson.sortOrder)) {
        const parsed = parseInt(rawSortOrderStr, 10);
        if (Number.isFinite(parsed)) lesson.sortOrder = parsed;
      }
    }

    // Append Word if present
    if (rawWord) {
      const wordId = `${finalLessonId}-word-${lesson.words?.length || 0}`;
      lesson.words = lesson.words || [];
      lesson.words.push({
        id: wordId,
        text: rawWord,
        image: rawImage || "",
        phonetic: rawPhonetic || "",
      });
    }

    // Append Link if present
    if (rawLinkUrl || rawLinkTitle) {
      lesson.externalLinks = lesson.externalLinks || [];
      lesson.externalLinks.push({
        text: rawLinkTitle || rawLinkUrl,
        url: rawLinkUrl || "",
      });
    }
  }

  const resultLessons = lessonOrder.map((id) => lessonMap.get(id)!);

  let totalWords = 0;
  let totalLinks = 0;
  resultLessons.forEach((l) => {
    totalWords += (l.words || []).length;
    totalLinks += (l.externalLinks || []).length;
  });

  return {
    lessons: resultLessons,
    stats: {
      totalLessons: resultLessons.length,
      totalWords,
      totalLinks,
    },
    warnings,
    errors,
  };
}

/**
 * Generates an exemplary CSV string with comments and headers
 * ready to be downloaded as a template.
 */
export function generateSampleLessonCSV(): string {
  return [
    "lesson_id,title,sort_order,word,image,phonetic,link_title,link_url",
    'lesson-1,Animals & Pets,1,Bear,https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400,/bɛər/,Animal Flashcards,https://quizlet.com/example-animals',
    'lesson-1,Animals & Pets,1,Bird,https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400,/bɜːrd/,,',
    'lesson-1,Animals & Pets,1,Pig,https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400,/pɪɡ/,,',
    'lesson-1,Animals & Pets,1,Penguin,https://images.unsplash.com/photo-1598439210625-5067c578f3f6?w=400,/ˈpɛŋɡwɪn/,,',
    'lesson-1,Animals & Pets,1,Monkey,https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=400,/ˈmʌŋki/,,',
    'lesson-2,Vehicles & Transport,2,Car,https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=400,/kɑːr/,Transport Song,https://www.youtube.com/watch?v=example-transport',
    'lesson-2,Vehicles & Transport,2,Bus,https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400,/bʌs/,,',
    'lesson-2,Vehicles & Transport,2,Train,https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400,/treɪn/,,',
    'lesson-2,Vehicles & Transport,2,Bicycle,https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400,/ˈbaɪsɪkəl/,,',
    'lesson-3,Fruits & Food,3,Apple,https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400,/ˈæp.əl/,Fruit Song,https://www.youtube.com/watch?v=example-fruit',
    'lesson-3,Fruits & Food,3,Banana,https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400,/bəˈnɑː.nə/,,',
    'lesson-3,Fruits & Food,3,Orange,https://images.unsplash.com/photo-1547514701-42782101795e?w=400,/ˈɒr.ɪndʒ/,,',
  ].join("\n");
}

/**
 * Triggers a browser file download of the sample CSV template.
 */
export function downloadSampleLessonCSV(filename = "lessons_import_template.csv"): void {
  const csvContent = generateSampleLessonCSV();
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
