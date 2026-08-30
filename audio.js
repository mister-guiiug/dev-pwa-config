/**
 * Sons synthétisés via Web Audio — aucun asset à télécharger, la PWA reste
 * légère et fonctionne hors-ligne.
 *
 * PROMU, PAS INVENTÉ : synthèse portée depuis `mister-molkky/src/sounds.ts`
 * et `miss-dice/src/audio/sounds.ts`, qui avaient chacune la même charpente
 * (contexte paresseux, oscillateur + enveloppe, repli silencieux).
 *
 * L'`AudioContext` est créé paresseusement au premier son et réutilisé pour
 * la session. Sur iOS Safari, il démarre `suspended` tant qu'aucun geste
 * utilisateur n'a eu lieu : `resume()` est tenté avant chaque planification.
 */

let ctx = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  return ctx;
}

/**
 * Joue une note synthétisée. No-op silencieux si Web Audio manque (SSR,
 * tests, navigateur restreint).
 *
 * @param {{ freq: number, duration: number, type?: OscillatorType,
 *   attack?: number, volume?: number, at?: number }} spec
 *   `at` décale le départ (secondes) — permet les séquences.
 */
export function playTone(spec) {
  const c = getContext();
  if (!c) return;
  const t0 = c.currentTime + (spec.at ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = spec.type ?? 'sine';
  osc.frequency.setValueAtTime(spec.freq, t0);
  const volume = spec.volume ?? 0.15;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + (spec.attack ?? 0.01));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + spec.duration + 0.05);
}

/**
 * Séquences prêtes à l'emploi, alignées sur les patterns de `haptics.js` :
 * un événement peut sonner ET vibrer sous le même nom.
 */
export const TONE_PRESETS = {
  tap: [{ freq: 320, duration: 0.07, type: 'triangle', volume: 0.12 }],
  confirm: [
    { freq: 520, duration: 0.1, type: 'square', volume: 0.15 },
    { freq: 780, duration: 0.12, type: 'sine', volume: 0.18, at: 0.06 },
  ],
  success: [
    { freq: 523, duration: 0.12, volume: 0.18 },
    { freq: 784, duration: 0.16, volume: 0.2, at: 0.1 },
  ],
  warning: [
    { freq: 300, duration: 0.12, type: 'square', volume: 0.18 },
    { freq: 220, duration: 0.18, type: 'square', volume: 0.18, at: 0.1 },
  ],
  error: [
    { freq: 440, duration: 0.18, type: 'square', volume: 0.18 },
    { freq: 330, duration: 0.22, type: 'square', volume: 0.2, at: 0.16 },
    { freq: 220, duration: 0.3, type: 'sawtooth', volume: 0.22, at: 0.34 },
  ],
  victory: [
    { freq: 523, duration: 0.18, volume: 0.2 },
    { freq: 659, duration: 0.18, volume: 0.2, at: 0.16 },
    { freq: 784, duration: 0.18, volume: 0.2, at: 0.32 },
    { freq: 1046, duration: 0.36, volume: 0.22, at: 0.48 },
  ],
};

/**
 * Joue un preset nommé ou une séquence de notes.
 * @param {keyof typeof TONE_PRESETS | Array<Parameters<typeof playTone>[0]>} sound
 */
export function playSound(sound) {
  const tones = typeof sound === 'string' ? TONE_PRESETS[sound] : sound;
  if (!Array.isArray(tones)) return;
  for (const spec of tones) playTone(spec);
}
