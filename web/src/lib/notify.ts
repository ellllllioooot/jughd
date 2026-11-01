// Notification + sound delivery (T025/T027/T028). Service-worker notifications
// are the reliable display path in background tabs (research §3); Web Push is
// reserved for server-initiated notices.
import { api } from "./api";

const SOUND_KEY = "jughd.sound";
let swRegistration: ServiceWorkerRegistration | null = null;
let audioCtx: AudioContext | null = null;

export function soundEnabled(): boolean {
  return localStorage.getItem(SOUND_KEY) !== "off";
}

export function setSoundEnabled(on: boolean) {
  localStorage.setItem(SOUND_KEY, on ? "on" : "off");
}

export async function ensureServiceWorker(): Promise<boolean> {
  if (swRegistration) return true;
  if (!("serviceWorker" in navigator)) return false;
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    return true;
  } catch {
    return false;
  }
}

/** Browser support gate (spec edge cases): webcam + notification API present. */
export function browserSupported(): boolean {
  return (
    !!navigator.mediaDevices?.getUserMedia &&
    "Notification" in window &&
    "ServiceWorker" in navigator
  );
}

export async function notifyUser(input: {
  title: string;
  body: string;
  tag: string;
  withSound?: boolean;
}) {
  const hasSW = await ensureServiceWorker();
  if (hasSW && swRegistration?.active && Notification.permission === "granted") {
    swRegistration.active.postMessage({
      type: "show-notification",
      title: input.title,
      body: input.body,
      tag: input.tag,
    });
  } else if (Notification.permission === "granted") {
    // fallback: in-app notification (spec edge case: SW unavailable)
    new Notification(input.title, { body: input.body, tag: input.tag });
  }
  if (input.withSound !== false && soundEnabled()) playBeep();
}

/** Short attention beep; must be started after a user gesture (autoplay policy). */
export function playBeep() {
  try {
    audioCtx ??= new AudioContext();
    void audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 660;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
  } catch {
    /* audio unavailable — in-app alert still visible */
  }
}

export function unlockAudio() {
  audioCtx ??= new AudioContext();
  void audioCtx.resume();
}

/** Web Push subscription for server-initiated notices (quota warnings). */
export async function subscribePush() {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!key || Notification.permission !== "granted") return;
  const reg = await ensureServiceWorker();
  if (!reg || !swRegistration) return;
  const sub = await swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
  await api.pushSubscribe({
    endpoint: sub.endpoint,
    p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
    auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const raw = atob((base64String + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
