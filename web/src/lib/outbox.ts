// Client outbox (research §10 / FR-007): alerts + verdicts queue in
// localStorage keyed by client UUIDs and flush with idempotent upserts —
// network failure never drops feedback.
import { api, type AlertCategory, type Landmark } from "./api";

export type OutboxRecord =
  | {
      type: "alert";
      sessionId: string;
      alert: {
        clientKey: string;
        category: AlertCategory;
        occurredAt: string;
        landmarksSnapshot: Landmark[];
      };
    }
  | { type: "verdict"; clientKey: string; verdict: "REAL" | "FALSE" };

const QUEUE_KEY = "jughd.outbox";
const IDS_KEY = "jughd.alert-ids";

let flushTimer: number | null = null;
let nextAttemptAt = 0;
let backoffMs = 5000;

function readQueue(): OutboxRecord[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as OutboxRecord[];
  } catch {
    return [];
  }
}

function writeQueue(records: OutboxRecord[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(records));
}

function readIds(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(IDS_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function enqueue(record: OutboxRecord) {
  const queue = readQueue();
  // a later verdict for the same alert supersedes an earlier one (terminal intent)
  const filtered =
    record.type === "verdict"
      ? queue.filter((r) => !(r.type === "verdict" && r.clientKey === record.clientKey))
      : queue;
  filtered.push(record);
  writeQueue(filtered);
}

export function knownServerId(clientKey: string): string | undefined {
  return readIds()[clientKey];
}

export function pendingCount(): number {
  return readQueue().length;
}

/**
 * Flush queue: alerts first (learning clientKey → server id), then verdicts.
 * Safe to call concurrently — records drop only after server acknowledgement.
 */
export async function flush(): Promise<void> {
  if (Date.now() < nextAttemptAt) return;
  const queue = readQueue();
  if (queue.length === 0) return;

  const ids = readIds();
  const remaining: OutboxRecord[] = [];
  let failure = false;

  const alertRecords = queue.filter((r) => r.type === "alert") as Extract<
    OutboxRecord,
    { type: "alert" }
  >[];
  const bySession = new Map<string, Extract<OutboxRecord, { type: "alert" }>[]>();
  for (const r of alertRecords) {
    const list = bySession.get(r.sessionId) ?? [];
    list.push(r);
    bySession.set(r.sessionId, list);
  }

  for (const [sessionId, records] of bySession) {
    try {
      const res = await api.addAlerts(
        sessionId,
        records.map((r) => r.alert)
      );
      Object.assign(ids, res.ids);
    } catch {
      failure = true;
      remaining.push(...records); // retry later
    }
  }
  localStorage.setItem(IDS_KEY, JSON.stringify(ids));

  for (const record of queue) {
    if (record.type !== "verdict") continue;
    const serverId = ids[record.clientKey];
    if (!serverId) {
      // alert not acknowledged yet — keep the verdict queued
      if (remaining.some((r) => r.type === "alert" && r.alert.clientKey === record.clientKey)) {
        remaining.push(record);
      }
      continue;
    }
    try {
      await api.setVerdict(serverId, record.verdict);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "ALREADY_VERIFIED" || code === "NOT_FOUND") continue; // terminal / gone
      failure = true;
      remaining.push(record);
    }
  }

  writeQueue(remaining);
  if (failure) {
    // exponential backoff (research §10)
    nextAttemptAt = Date.now() + backoffMs;
    backoffMs = Math.min(backoffMs * 2, 5 * 60_000);
  } else {
    nextAttemptAt = 0;
    backoffMs = 5000;
  }
}

/** Start periodic flushing + online-event flushing (call once per session). */
export function startOutbox() {
  stopOutbox();
  flushTimer = window.setInterval(() => void flush(), 15_000);
  window.addEventListener("online", onOnline);
}

export function stopOutbox() {
  if (flushTimer !== null) window.clearInterval(flushTimer);
  flushTimer = null;
  window.removeEventListener("online", onOnline);
}

function onOnline() {
  nextAttemptAt = 0; // fresh connection — retry immediately
  void flush();
}
