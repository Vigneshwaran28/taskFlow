// A short two-note chime through the Web Audio API. Browsers only allow sound after the person interacted with the
// page, so callers create the AudioContext from a click ("Sound on") and keep it.

/** Plays the chime on an AudioContext the person already allowed (resumed from a click). */
export function chime(context: AudioContext) {
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  const now = context.currentTime;
  [880, 660].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const start = now + index * 0.35;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.65);
  });
}

/** A new AudioContext, or null where Web Audio isn't available. Call from a click handler. */
export function createAudio(): AudioContext | null {
  try {
    return typeof window !== "undefined" && "AudioContext" in window ? new AudioContext() : null;
  } catch {
    return null;
  }
}
