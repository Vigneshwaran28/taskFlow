// Web Audio API sound alerts for meetings and assigned tickets.
// Synthesizes pleasant, crystal-clear chimes with zero external audio assets or network latency.
// Automatically complies with browser autoplay policies by resuming AudioContext on user gesture.

let audioContext: AudioContext | null = null;
let autoplayResumed = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
      }
    }
    return audioContext;
  } catch {
    return null;
  }
}

// Auto-resume AudioContext on first user interaction anywhere on the page
if (typeof window !== "undefined") {
  const resumeAudio = () => {
    if (autoplayResumed) return;
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }
    autoplayResumed = true;
    window.removeEventListener("pointerdown", resumeAudio);
    window.removeEventListener("keydown", resumeAudio);
  };
  window.addEventListener("pointerdown", resumeAudio, { passive: true });
  window.addEventListener("keydown", resumeAudio, { passive: true });
}

const STORAGE_KEY = "tf_sound_muted";

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
    window.dispatchEvent(new CustomEvent("tf:sound_muted_change", { detail: { muted } }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Plays an upcoming meeting reminder chime.
 * A warm, harmonic three-note major arpeggio (C5 -> E5 -> G5) that alerts the user without being jarring.
 */
export function playMeetingChime(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }

  const now = ctx.currentTime;
  // Notes: C5 (523.25), E5 (659.25), G5 (783.99)
  const notes = [
    { freq: 523.25, time: 0, duration: 0.8, gain: 0.22 },
    { freq: 659.25, time: 0.18, duration: 0.8, gain: 0.25 },
    { freq: 783.99, time: 0.36, duration: 1.1, gain: 0.28 },
  ];

  notes.forEach(({ freq, time, duration, gain: peakGain }) => {
    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + time);

      // Smooth attack and natural exponential decay
      gainNode.gain.setValueAtTime(0.0001, now + time);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, now + time + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration + 0.05);
    } catch {
      // Audio node failure fallback
    }
  });
}

/**
 * Plays a ticket assignment notification chime.
 * A crisp, distinctive two-tone alert (D5 -> A5 ascending) alerting the user of incoming work.
 */
export function playTicketChime(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }

  const now = ctx.currentTime;
  // Notes: D5 (587.33), A5 (880.00)
  const notes = [
    { freq: 587.33, time: 0, duration: 0.45, gain: 0.24 },
    { freq: 880.0, time: 0.15, duration: 0.7, gain: 0.28 },
  ];

  notes.forEach(({ freq, time, duration, gain: peakGain }) => {
    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + time);

      gainNode.gain.setValueAtTime(0.0001, now + time);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, now + time + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration + 0.05);
    } catch {
      // Audio node failure fallback
    }
  });
}
