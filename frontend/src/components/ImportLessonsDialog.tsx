"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  HelpCircle,
  Info,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { importBulkLessons, BulkLessonPayload } from "@/lib/api";
import {
  parseLessonsFromCSV,
  parseLessonsFromRawRows,
  downloadSampleLessonCSV,
  ParseLessonCSVResult,
} from "@/lib/csv-lesson-parser";
import * as XLSX from "xlsx";

interface ImportLessonsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ImportLessonsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportLessonsDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseLessonCSVResult | null>(null);
  const [overwrite, setOverwrite] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [expandedLessonIndex, setExpandedLessonIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const resetState = () => {
    setSelectedFile(null);
    setParseResult(null);
    setImportError("");
    setExpandedLessonIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (newOpen: boolean) => {
    if (!importing) {
      if (!newOpen) resetState();
      onOpenChange(newOpen);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setParsing(true);
    setImportError("");
    setParseResult(null);

    try {
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false,
          defval: "",
        }) as string[][];

        const parsed = parseLessonsFromRawRows(rawRows);
        setParseResult(parsed);
      } else {
        const text = await file.text();
        const parsed = parseLessonsFromCSV(text);
        setParseResult(parsed);
      }
    } catch (err: any) {
      console.error("Error processing lesson file:", err);
      setImportError(err.message || "Failed to parse the file. Please verify format.");
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleImportSubmit = async () => {
    if (!parseResult || parseResult.lessons.length === 0) return;

    setImporting(true);
    setImportError("");

    try {
      const result = await importBulkLessons(parseResult.lessons, overwrite);
      const { summary } = result;

      toast({
        title: "Import Successful! 🎉",
        description: `Imported ${summary.total} lesson(s): ${summary.created} created, ${summary.updated} updated, ${summary.words} vocabulary words loaded.`,
      });

      handleClose(false);
      onSuccess();
    } catch (err: any) {
      console.error("Bulk lesson import failed:", err);
      setImportError(err.message || "Server error while saving lessons.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  Import Bulk Lessons from CSV
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs mt-0.5">
                  Upload a spreadsheet containing lessons, vocabulary words, images, phonetics, and resources.
                </DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadSampleLessonCSV()}
              className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 rounded-xl text-xs h-9 font-semibold gap-1.5 shrink-0"
              title="Download sample CSV format"
            >
              <Download className="w-3.5 h-3.5" />
              Sample CSV
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* File Upload Drop Zone */}
          {!parseResult && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragOver
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .tsv, .txt, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
                disabled={parsing}
              />
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-emerald-600">
                {parsing ? (
                  <RefreshCw className="w-7 h-7 animate-spin" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">
                  {parsing ? "Parsing spreadsheet..." : "Click or drag & drop CSV file here"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports <strong>.csv</strong>, <strong>.tsv</strong>, or <strong>.xlsx</strong> files with standard formatting
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs rounded-lg bg-white border-slate-200 text-slate-600">
                  lesson_id
                </Badge>
                <Badge variant="outline" className="text-xs rounded-lg bg-white border-slate-200 text-slate-600">
                  title
                </Badge>
                <Badge variant="outline" className="text-xs rounded-lg bg-white border-slate-200 text-slate-600">
                  word
                </Badge>
                <Badge variant="outline" className="text-xs rounded-lg bg-white border-slate-200 text-slate-600">
                  image
                </Badge>
                <Badge variant="outline" className="text-xs rounded-lg bg-white border-slate-200 text-slate-600">
                  phonetic
                </Badge>
                <Badge variant="outline" className="text-xs rounded-lg bg-white border-slate-200 text-slate-600">
                  link_url
                </Badge>
              </div>
            </div>
          )}

          {/* Quick instructions / Help notice */}
          {!parseResult && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900 space-y-1">
                <p className="font-bold text-sm text-indigo-950">How multiple words per lesson work in CSV:</p>
                <p>
                  Create multiple rows with the same <strong>lesson_id</strong> (or <strong>title</strong>). Each row defines one word and its image URL. All rows with that ID are automatically grouped together into one lesson!
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {importError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1">{importError}</div>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parseResult && (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <span className="font-bold text-sm text-slate-800 truncate max-w-xs">
                    {selectedFile?.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({((selectedFile?.size || 0) / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                  className="h-8 px-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Choose Different File
                </Button>
              </div>

              {/* Statistics Overview */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Lessons</p>
                    <p className="text-xl font-extrabold text-emerald-950">{parseResult.stats.totalLessons}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Vocabulary Words</p>
                    <p className="text-xl font-extrabold text-blue-950">{parseResult.stats.totalWords}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">External Links</p>
                    <p className="text-xl font-extrabold text-purple-950">{parseResult.stats.totalLinks}</p>
                  </div>
                </div>
              </div>

              {/* Parse Errors or Warnings */}
              {parseResult.errors.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1 text-xs text-rose-800">
                  <p className="font-bold flex items-center gap-1 text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Validation Errors ({parseResult.errors.length}):
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Options & Overwrite switch */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="space-y-0.5">
                  <Label htmlFor="overwrite-toggle" className="text-sm font-bold text-slate-800 cursor-pointer">
                    Overwrite Existing Lessons
                  </Label>
                  <p className="text-xs text-slate-500">
                    If enabled, lessons with matching IDs will have their words and links updated to match this CSV.
                  </p>
                </div>
                <Switch
                  id="overwrite-toggle"
                  checked={overwrite}
                  onCheckedChange={setOverwrite}
                  disabled={importing}
                />
              </div>

              {/* Lessons Preview Accordion */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Lessons to Import ({parseResult.lessons.length})
                  </h4>
                  <span className="text-xs text-slate-400">Click any card to inspect words</span>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {parseResult.lessons.map((lesson, idx) => {
                    const isExpanded = expandedLessonIndex === idx;
                    const wordsCount = lesson.words?.length || 0;
                    const linksCount = lesson.externalLinks?.length || 0;

                    return (
                      <div
                        key={lesson.id || idx}
                        className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
                      >
                        <div
                          onClick={() => setExpandedLessonIndex(isExpanded ? null : idx)}
                          className="p-3 flex items-center justify-between cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-bold text-slate-800 truncate">{lesson.title}</p>
                              <p className="text-xs font-mono text-slate-400 truncate">ID: {lesson.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="rounded-full bg-slate-100 text-slate-600 font-semibold text-xs hover:bg-slate-100">
                              {wordsCount} word{wordsCount !== 1 ? "s" : ""}
                            </Badge>
                            {linksCount > 0 && (
                              <Badge className="rounded-full bg-indigo-50 text-indigo-600 font-semibold text-xs hover:bg-indigo-50">
                                {linksCount} link{linksCount !== 1 ? "s" : ""}
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="p-3 border-t border-slate-100 bg-white space-y-3">
                            {/* Words Table */}
                            {wordsCount > 0 ? (
                              <div className="space-y-1.5">
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                  Vocabulary ({wordsCount})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {lesson.words?.map((w, wIdx) => (
                                    <div
                                      key={wIdx}
                                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                                    >
                                      {w.image ? (
                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                          <img
                                            src={w.image}
                                            alt={w.text}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              (e.target as HTMLElement).style.display = "none";
                                            }}
                                          />
                                        </div>
                                      ) : (
                                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 font-bold shrink-0">
                                          {wIdx + 1}
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-800 truncate">{w.text}</p>
                                        {w.phonetic && (
                                          <p className="text-slate-400 font-mono text-[11px] truncate">
                                            {w.phonetic}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No vocabulary words attached.</p>
                            )}

                            {/* Links list */}
                            {linksCount > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                  External Resources ({linksCount})
                                </p>
                                <div className="space-y-1">
                                  {lesson.externalLinks?.map((l, lIdx) => (
                                    <div
                                      key={lIdx}
                                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                                    >
                                      <span className="font-semibold text-slate-700 truncate">{l.text}</span>
                                      <span className="text-slate-400 font-mono text-[11px] truncate max-w-[200px]">
                                        {l.url}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={importing}
            className="rounded-xl font-semibold"
          >
            Cancel
          </Button>

          {parseResult && parseResult.lessons.length > 0 && (
            <Button
              type="button"
              onClick={handleImportSubmit}
              disabled={importing || parseResult.lessons.length === 0}
              className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing {parseResult.lessons.length} Lesson{parseResult.lessons.length !== 1 ? "s" : ""}...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Import {parseResult.lessons.length} Lesson{parseResult.lessons.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
