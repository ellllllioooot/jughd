// Session finalization on tab close (T030). fetch keepalive carries the PATCH
// through unload — navigator.sendBeacon can only POST and the contract route
// is PATCH /sessions/:id/end (shortcut: switch to a POST alias if keepalive
// proves unreliable in Safari).
import { apiPath } from "./api";

export interface SessionSummary {
  endedAt: string;
  durationSec: number;
  postureScore: number;
  alertCount: number;
}

export function finalizeSession(sessionId: string, summary: SessionSummary): void {
  try {
    void fetch(apiPath(`/sessions/${sessionId}/end`), {
      method: "PATCH",
      keepalive: true,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(summary),
    });
  } catch {
    /* beacon budget exceeded or network gone — server-side sweep (T030) closes it */
  }
}
