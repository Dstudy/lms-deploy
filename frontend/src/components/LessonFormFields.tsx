"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiWordData, ApiLinkData } from "@/lib/api";

export interface LessonFormState {
  id: string;
  title: string;
  icon?: string;
  sortOrder: number;
  words: ApiWordData[];
  externalLinks: ApiLinkData[];
}

export default function LessonFormFields({
  form,
  setForm,
  editMode = false,
}: {
  form: LessonFormState;
  setForm: (updater: (prev: LessonFormState) => LessonFormState) => void;
  editMode?: boolean;
}) {
  const addWord = () =>
    setForm((f) => ({
      ...f,
      words: [
        ...f.words,
        { id: `${f.id}-word-${f.words.length}`, text: "", image: "", phonetic: "" },
      ],
    }));
  const removeWord = (i: number) =>
    setForm((f) => ({ ...f, words: f.words.filter((_, idx) => idx !== i) }));
  const updateWord = (i: number, field: keyof ApiWordData, value: string) =>
    setForm((f) => ({
      ...f,
      words: f.words.map((w, idx) => (idx === i ? { ...w, [field]: value } : w)),
    }));
  const addLink = () =>
    setForm((f) => ({ ...f, externalLinks: [...f.externalLinks, { text: "", url: "" }] }));
  const removeLink = (i: number) =>
    setForm((f) => ({ ...f, externalLinks: f.externalLinks.filter((_, idx) => idx !== i) }));
  const updateLink = (i: number, field: "text" | "url", value: string) =>
    setForm((f) => ({
      ...f,
      externalLinks: f.externalLinks.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)),
    }));

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>
            Lesson ID <span className="text-rose-500">*</span>
          </Label>
          <Input
            placeholder="e.g. lesson-29"
            value={form.id}
            disabled={editMode}
            onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
            className="rounded-xl font-mono"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sort Order</Label>
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>
          Title <span className="text-rose-500">*</span>
        </Label>
        <Input
          placeholder="e.g. Lesson 29"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="rounded-xl"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-bold">Words ({form.words.length})</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addWord}
            className="rounded-xl text-xs"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Word
          </Button>
        </div>
        <div className="flex flex-col gap-2 pr-1">
          {form.words.map((word, i) => (
            <div
              key={i}
              className="flex gap-2 items-start p-2 rounded-xl bg-slate-50 border border-slate-200"
            >
              <div className="flex-1 grid grid-cols-3 gap-2">
                <Input
                  placeholder="Word text"
                  value={word.text}
                  onChange={(e) => updateWord(i, "text", e.target.value)}
                  className="rounded-lg text-sm"
                />
                <Input
                  placeholder="Image URL"
                  value={word.image}
                  onChange={(e) => updateWord(i, "image", e.target.value)}
                  className="rounded-lg text-sm"
                />
                <Input
                  placeholder="Phonetic"
                  value={word.phonetic}
                  onChange={(e) => updateWord(i, "phonetic", e.target.value)}
                  className="rounded-lg text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeWord(i)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {form.words.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-4">
              No words yet. Click "Add Word".
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-bold">
            External Links ({form.externalLinks.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLink}
            className="rounded-xl text-xs"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Link
          </Button>
        </div>
        <div className="flex flex-col gap-2 pr-1">
          {form.externalLinks.map((link, i) => (
            <div
              key={i}
              className="flex gap-2 items-center p-2 rounded-xl bg-slate-50 border border-slate-200"
            >
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Link label"
                  value={link.text}
                  onChange={(e) => updateLink(i, "text", e.target.value)}
                  className="rounded-lg text-sm"
                />
                <Input
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  className="rounded-lg text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLink(i)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {form.externalLinks.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-4">
              No links yet. Click "Add Link".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
