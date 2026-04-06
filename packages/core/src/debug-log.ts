export interface DebugEntry {
  time: number;
  tag: string;
  message: string;
}

const MAX_ENTRIES = 2000;
const entries: DebugEntry[] = [];
const listeners: Set<() => void> = new Set();
let version = 0;

export function debugLog(tag: string, message: string): void {
  entries.push({ time: Date.now(), tag, message });
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  version++;
  listeners.forEach((fn) => fn());
}

export function formatBytes(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

export function getDebugLog(): readonly DebugEntry[] {
  return entries;
}

export function clearDebugLog(): void {
  entries.length = 0;
  version++;
  listeners.forEach((fn) => fn());
}

export function getDebugLogVersion(): number {
  return version;
}

export function onDebugLogChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function exportDebugLog(): string {
  return entries
    .map((e) => {
      const d = new Date(e.time);
      const ts = d.toISOString().slice(11, 23);
      return `${ts} [${e.tag}] ${e.message}`;
    })
    .join("\n");
}
