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

function parseLogLines(text: string, source: string): LogEntry[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const entries: LogEntry[] = [];
  let id = 0;

  for (const line of lines) {
    const match = line.match(ISO_REGEX);
    if (!match) continue;
    const timestamp = match[0];
    const time = new Date(timestamp).getTime();
    if (Number.isNaN(time)) continue;
    const payload = line.slice(match.index! + timestamp.length).trimStart();
    entries.push({
      id: `${source}-${id++}`,
      source,
      timestamp,
      time,
      payload,
    });
  }

  return entries;
}

export default function Home() {
  const [sourceName, setSourceName] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const merged = useMemo(() => {
    return [...entries].sort((a, b) => a.time - b.time);
  }, [entries]);

  function handleAddSource() {
    const name = sourceName.trim() || `Source ${entries.length + 1}`;
    const newEntries = parseLogLines(pastedText, name);
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
          Paste logs with ISO date/time in the first column; view merged by time.
        </p>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
            Add source
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1 space-y-2">
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
            <div className="flex flex-1 flex-col gap-2 sm:flex-[2]">
              <label htmlFor="logs" className="block text-sm text-zinc-400">
                Paste log lines (first column = ISO date/time)
              </label>
              <textarea
                id="logs"
                rows={5}
                placeholder={"2024-03-13T10:00:00.000Z\nmessage or tab/comma separated..."}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              />
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
