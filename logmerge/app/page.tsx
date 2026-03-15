"use client";

import { useState, useMemo } from "react";

type LogEntry = {
  id: string;
  source: string;
  timestamp: string; // ISO string
  time: number; // for sorting
  payload: string;
};

const ISO_REGEX =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?/;

const ISO_EXAMPLE = "e.g. 2024-03-13T10:00:00.000Z or 2024-03-13 10:00:00.000Z";

/** Split a line into columns (tab or comma separated) */
function splitColumns(line: string): string[] {
  return line.split(/[\t,]/).map((c) => c.trim());
}

/** Resolve datetime column spec to 0-based index. spec can be "0", "1", or a header name. */
function resolveDatetimeColumnIndex(
  lines: string[],
  spec: string
): { index: number; skipFirstLine: boolean } {
  const trimmed = spec.trim();
  const asNum = parseInt(trimmed, 10);
  if (!Number.isNaN(asNum) && asNum >= 0) {
    return { index: asNum, skipFirstLine: false };
  }
  if (lines.length === 0) return { index: 0, skipFirstLine: false };
  const headerCols = splitColumns(lines[0]);
  const nameIndex = headerCols.findIndex(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (nameIndex >= 0) {
    return { index: nameIndex, skipFirstLine: true };
  }
  return { index: 0, skipFirstLine: false };
}

export type FormatError = {
  lineNumber: number;
  line: string;
  reason: "missing_timestamp" | "invalid_date";
};

export function validateLogLines(
  text: string,
  datetimeColumnSpec: string = "0"
): FormatError[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const { index: colIndex, skipFirstLine } = resolveDatetimeColumnIndex(
    lines,
    datetimeColumnSpec
  );
  const errors: FormatError[] = [];
  const start = skipFirstLine ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const cols = splitColumns(line);
    const timestamp = cols[colIndex];
    if (timestamp === undefined || !timestamp) {
      errors.push({
        lineNumber: i + 1,
        line: line.slice(0, 50) + (line.length > 50 ? "…" : ""),
        reason: "missing_timestamp",
      });
      continue;
    }
    const time = new Date(timestamp).getTime();
    if (Number.isNaN(time)) {
      errors.push({
        lineNumber: i + 1,
        line: timestamp,
        reason: "invalid_date",
      });
    }
  }
  return errors;
}

function formatValidationMessage(errors: FormatError[]): string {
  if (errors.length === 0) return "";
  return errors
    .map(
      (e) =>
        `Line ${e.lineNumber}: ${
          e.reason === "missing_timestamp"
            ? `line must start with ISO date/time (${ISO_EXAMPLE})`
            : `invalid date: "${e.line}"`
        }`
    )
    .join(" ");
}

function parseLogLines(
  text: string,
  source: string,
  datetimeColumnSpec: string = "0"
): LogEntry[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];
  const { index: colIndex, skipFirstLine } = resolveDatetimeColumnIndex(
    lines,
    datetimeColumnSpec
  );
  const entries: LogEntry[] = [];
  let id = 0;

  for (let i = skipFirstLine ? 1 : 0; i < lines.length; i++) {
    const line = lines[i];
    const cols = splitColumns(line);
    const timestamp = cols[colIndex];
    if (timestamp === undefined || !timestamp) continue;
    const time = new Date(timestamp).getTime();
    if (Number.isNaN(time)) continue;
    const payload =
      cols.length > 1
        ? cols
            .filter((_, j) => j !== colIndex)
            .join("\t")
            .trim() || line
        : line;
    entries.push({
      id: `${source}-${id++}`,
      source,
      timestamp,
      time,
      payload: payload || "—",
    });
  }

  return entries;
}

export default function Home() {
  const [sourceName, setSourceName] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [datetimeColumn, setDatetimeColumn] = useState("0");
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const merged = useMemo(() => {
    return [...entries].sort((a, b) => a.time - b.time);
  }, [entries]);

  const formatErrors = useMemo(
    () =>
      pastedText.trim()
        ? validateLogLines(pastedText, datetimeColumn)
        : [],
    [pastedText, datetimeColumn]
  );
  const formatErrorText = formatValidationMessage(formatErrors);

  function handleAddSource() {
    const name = sourceName.trim() || `Source ${entries.length + 1}`;
    const newEntries = parseLogLines(pastedText, name, datetimeColumn);
    setEntries((prev) => [...prev, ...newEntries]);
    setPastedText("");
    setSourceName("");
  }

  function handleClear() {
    setEntries([]);
    setSourceName("");
    setPastedText("");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans">
      <header className="border-b border-zinc-800 bg-zinc-900/80 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          Log merge
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Paste logs (tab or comma separated). Set which column has the date/time; list is sorted by it.
        </p>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
            Add source
          </h2>
          <div className="mb-4 flex flex-wrap items-end gap-4 sm:gap-6">
            <div className="w-40 space-y-2">
              <label htmlFor="datetime-col" className="block text-sm text-zinc-400">
                Datetime column
              </label>
              <input
                id="datetime-col"
                type="text"
                placeholder="0 or name"
                value={datetimeColumn}
                onChange={(e) => setDatetimeColumn(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                title="0-based column index (e.g. 0, 1) or header name if first line is a header"
              />
            </div>
            <div className="flex-1 min-w-[200px] space-y-2">
              <label htmlFor="source" className="block text-sm text-zinc-400">
                Source name
              </label>
              <input
                id="source"
                type="text"
                placeholder="e.g. API server"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              />
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-1 flex-col gap-2 sm:flex-[2]">
              <label htmlFor="logs" className="block text-sm text-zinc-400">
                Paste log lines (ISO date/time in the column above)
              </label>
              <textarea
                id="logs"
                rows={5}
                placeholder={"2024-03-13T10:00:00.000Z\nmessage or tab/comma separated..."}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                aria-describedby={formatErrorText ? "log-format-errors" : undefined}
              />
              {formatErrorText && (
                <p
                  id="log-format-errors"
                  role="alert"
                  className="text-sm text-amber-400"
                >
                  {formatErrorText}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddSource}
              disabled={!pastedText.trim()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add source
            </button>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Clear all
              </button>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
              Merged log ({merged.length} lines)
            </h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
            {merged.length === 0 ? (
              <div className="px-6 py-12 text-center text-zinc-500">
                Add one or more sources above to see merged logs here.
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full border-collapse font-mono text-sm">
                  <thead className="sticky top-0 z-10 bg-zinc-800/95 text-left">
                    <tr>
                      <th className="whitespace-nowrap border-b border-zinc-700 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                        Time
                      </th>
                      <th className="whitespace-nowrap border-b border-zinc-700 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                        Source
                      </th>
                      <th className="border-b border-zinc-700 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                        Message
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {merged.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-zinc-800/80 hover:bg-zinc-800/50"
                      >
                        <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                          {entry.timestamp}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          <span className="rounded bg-zinc-700/80 px-2 py-0.5 text-zinc-300">
                            {entry.source}
                          </span>
                        </td>
                        <td className="break-all px-4 py-2 text-zinc-200">
                          {entry.payload || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
