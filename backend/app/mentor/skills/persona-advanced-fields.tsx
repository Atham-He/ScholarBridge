"use client";

import type { AdvancedPersonaValues } from "@/app/mentor/skills/persona-form-data";

type ChangeHandler = <K extends keyof AdvancedPersonaValues>(
  key: K,
  value: AdvancedPersonaValues[K],
) => void;

type Props = {
  values: AdvancedPersonaValues;
  onChange: ChangeHandler;
  defaultOpen?: boolean;
  summary?: string;
};

function fileCountLabel(files: File[]) {
  if (!files.length) return "No files selected";
  if (files.length === 1) return files[0].name;
  return `${files.length} files selected`;
}

function inputClassName() {
  return "mt-1 w-full rounded-lg border border-slate-300 bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600";
}

function textareaClassName() {
  return "mt-1 w-full rounded-lg border border-slate-300 bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600";
}

export function PersonaAdvancedFields({
  values,
  onChange,
  defaultOpen = false,
  summary = "Advanced Persona Inputs",
}: Props) {
  return (
    <details
      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40"
      open={defaultOpen}
    >
      <summary className="cursor-pointer text-sm font-medium text-slate-900 dark:text-slate-100">
        {summary}
      </summary>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium">
            Public URLs
          </label>
          <p className="mt-1 text-xs text-slate-500">
            One URL per line. Leave empty to rely on automatic public search.
          </p>
          <textarea
            value={values.publicUrlsText}
            onChange={(event) => onChange("publicUrlsText", event.target.value)}
            rows={4}
            placeholder={"https://example.edu/~mentor\nhttps://scholar.google.com/citations?user=..."}
            className={textareaClassName()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            AI chat share URLs
          </label>
          <p className="mt-1 text-xs text-slate-500">
            One ChatGPT share URL per line, or separate multiple URLs with
            <span className="px-1 font-mono">;</span>. Used to learn the
            mentor&apos;s prompt structure and thinking workflow.
          </p>
          <textarea
            value={values.aiChatShareUrlsText}
            onChange={(event) =>
              onChange("aiChatShareUrlsText", event.target.value)
            }
            rows={3}
            placeholder={
              "https://chatgpt.com/share/69eb21d6-9658-83e8-8ffc-66dbca48bcbb"
            }
            className={textareaClassName()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Additional project text
          </label>
          <p className="mt-1 text-xs text-slate-500">
            Extra notes, summaries, or copied text that should be included in persona building.
          </p>
          <textarea
            value={values.projectText}
            onChange={(event) => onChange("projectText", event.target.value)}
            rows={5}
            placeholder="Add extra notes for the mentor persona here."
            className={textareaClassName()}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">
              WeChat mentor speaker hint
            </label>
            <input
              value={values.mentorSpeaker}
              onChange={(event) => onChange("mentorSpeaker", event.target.value)}
              placeholder="Prof. Xing"
              className={inputClassName()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Meeting speaker hint
            </label>
            <input
              value={values.meetingSpeaker}
              onChange={(event) => onChange("meetingSpeaker", event.target.value)}
              placeholder="Junliang Xing"
              className={inputClassName()}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
            <input
              type="checkbox"
              checked={values.skipPublicSearch}
              onChange={(event) =>
                onChange("skipPublicSearch", event.target.checked)
              }
            />
            Skip public web search
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
            <input
              type="checkbox"
              checked={values.disableOpenalex}
              onChange={(event) =>
                onChange("disableOpenalex", event.target.checked)
              }
            />
            Disable OpenAlex lookup
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Upload files
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Supports txt, md, pdf, doc, docx, png, jpg, jpeg.
            </p>
            <input
              type="file"
              multiple
              accept=".txt,.md,.pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="mt-2 block w-full text-sm"
              onChange={(event) =>
                onChange("uploads", Array.from(event.target.files ?? []))
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              {fileCountLabel(values.uploads)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">
              WeChat chat files
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Supports exported WeChat .txt files.
            </p>
            <input
              type="file"
              multiple
              accept=".txt"
              className="mt-2 block w-full text-sm"
              onChange={(event) =>
                onChange("wechatFiles", Array.from(event.target.files ?? []))
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              {fileCountLabel(values.wechatFiles)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Meeting transcript or media files
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Supports txt, md, srt, vtt, mp3, wav, m4a, mp4, mov.
            </p>
            <input
              type="file"
              multiple
              accept=".txt,.md,.srt,.vtt,.mp3,.wav,.m4a,.mp4,.mov"
              className="mt-2 block w-full text-sm"
              onChange={(event) =>
                onChange("meetingFiles", Array.from(event.target.files ?? []))
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              {fileCountLabel(values.meetingFiles)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Thinking questionnaire files
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Supports txt, md, pdf, doc, docx.
            </p>
            <input
              type="file"
              multiple
              accept=".txt,.md,.pdf,.doc,.docx"
              className="mt-2 block w-full text-sm"
              onChange={(event) =>
                onChange(
                  "thinkingQuestionnaireFiles",
                  Array.from(event.target.files ?? []),
                )
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              {fileCountLabel(values.thinkingQuestionnaireFiles)}
            </p>
          </div>
        </div>
      </div>
    </details>
  );
}
