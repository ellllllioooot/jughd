/// <reference lib="webworker" />
// Pose worker (T020): BlazePose GHUM inference off the main thread
// (research §1/§4). Fixed-size output buffer, deterministic disposal.
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const MODEL_URLS = {
  lite:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  full:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
};

// 33 landmarks × (x, y, z, score) — fixed-size buffer, numbers only (constitution I)
const FLOATS_PER_PERSON = 33 * 4;

let landmarker: PoseLandmarker | null = null;

interface DetectMsg {
  id: number;
  type: "detect";
  bitmap: ImageBitmap;
  ts: number;
}

interface InitMsg {
  id: number;
  type: "init";
  model: "lite" | "full";
}

type Msg = DetectMsg | InitMsg;

function pickLargestPerson(
  people: { x: number; y: number; z: number; visibility?: number }[][]
) {
  let best: typeof people[number] | null = null;
  let bestArea = -1;
  for (const person of people) {
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const l of person) {
      if (l.x < minX) minX = l.x;
      if (l.x > maxX) maxX = l.x;
      if (l.y < minY) minY = l.y;
      if (l.y > maxY) maxY = l.y;
    }
    const area = (maxX - minX) * (maxY - minY);
    if (area > bestArea) {
      bestArea = area;
      best = person;
    }
  }
  return best;
}

self.onmessage = async (e: MessageEvent<Msg>) => {
  const msg = e.data;
  try {
    if (msg.type === "init") {
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe-wasm");
      const make = (delegate: "GPU" | "CPU") =>
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_URLS[msg.model ?? "full"],
            delegate,
          },
          runningMode: "VIDEO",
          numPoses: 4, // multiple people → largest is monitored (spec edge cases)
        });
      try {
        landmarker = await make("GPU");
      } catch {
        landmarker = await make("CPU");
      }
      (self as unknown as Worker).postMessage({ id: msg.id, type: "ready" });
      return;
    }

    if (msg.type === "detect") {
      if (!landmarker) throw new Error("landmarker not initialized");
      const result = landmarker.detectForVideo(msg.bitmap, msg.ts);
      msg.bitmap.close(); // deterministic disposal (constitution II)
      const person = result.landmarks?.length ? pickLargestPerson(result.landmarks) : null;
      if (!person || person.length !== 33) {
        (self as unknown as Worker).postMessage({ id: msg.id, type: "result", landmarks: null });
        return;
      }
      const data = new Float32Array(FLOATS_PER_PERSON);
      for (let i = 0; i < 33; i++) {
        const l = person[i];
        data[i * 4 + 0] = l.x;
        data[i * 4 + 1] = l.y;
        data[i * 4 + 2] = l.z;
        data[i * 4 + 3] = l.visibility ?? 1; // score ∈ [0,1] per data-model.md
      }
      (self as unknown as Worker).postMessage(
        { id: msg.id, type: "result", landmarks: data },
        [data.buffer]
      );
      return;
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id: msg.id,
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
