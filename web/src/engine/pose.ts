// Main-thread client for pose-worker.ts (T020).
import type { Landmark } from "./geometry";

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

export class PoseClient {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  async init(model: "lite" | "full" = "full"): Promise<void> {
    this.worker = new Worker(new URL("./pose-worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (e: MessageEvent) => {
      const entry = this.pending.get(e.data.id);
      if (!entry) return;
      this.pending.delete(e.data.id);
      if (e.data.type === "error") entry.reject(new Error(e.data.message));
      else entry.resolve(e.data);
    };
    this.worker.onerror = (e) => {
      const err = new Error(e.message || "pose worker failed");
      for (const entry of this.pending.values()) entry.reject(err);
      this.pending.clear();
    };
    await this.send("init", { model }, []);
  }

  /** Runs one detection frame; returns the largest person's 33 landmarks or null. */
  async detect(bitmap: ImageBitmap, ts: number): Promise<Landmark[] | null> {
    const res = (await this.send("detect", { bitmap, ts }, [bitmap])) as {
      landmarks: Float32Array | null;
    };
    if (!res.landmarks) return null;
    const out: Landmark[] = [];
    for (let i = 0; i < 33; i++) {
      out.push({
        x: res.landmarks[i * 4 + 0],
        y: res.landmarks[i * 4 + 1],
        z: res.landmarks[i * 4 + 2],
        score: res.landmarks[i * 4 + 3],
      });
    }
    return out;
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }

  private send(type: string, payload: object, transfer: Transferable[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.worker) return reject(new Error("worker not initialized"));
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, ...payload }, transfer);
    });
  }
}
