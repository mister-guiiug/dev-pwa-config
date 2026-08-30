import { useEffect, useRef } from 'react';

/**
 * Détection de secousse (DeviceMotion), promue depuis `miss-dice`
 * (`useShakeToRoll`) — le callback est injecté, le socle ne sait pas ce
 * qu'une secousse déclenche.
 */

/**
 * iOS 13+ exige une autorisation explicite (depuis un geste utilisateur)
 * avant d'émettre `devicemotion`. Ailleurs, l'API est disponible sans
 * permission → accès considéré accordé.
 * @returns {Promise<boolean>}
 */
export async function requestMotionPermission() {
  const Ctor = globalThis.DeviceMotionEvent;
  if (Ctor && typeof Ctor.requestPermission === 'function') {
    try {
      return (await Ctor.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  return typeof globalThis.DeviceMotionEvent !== 'undefined';
}

/**
 * Déclenche `onShake` quand l'appareil est secoué. Détection par variation
 * brutale de l'accélération (indépendante de l'orientation), avec
 * anti-rebond. Silencieux si l'API manque.
 *
 * @param {() => void} onShake
 * @param {{ enabled?: boolean, threshold?: number, cooldownMs?: number }} [options]
 *   `threshold` : variation d'accélération (m/s², défaut 14).
 *   `cooldownMs` : délai minimal entre deux secousses (défaut 900).
 */
export function useShake(onShake, options = {}) {
  const { enabled = true, threshold = 14, cooldownMs = 900 } = options;

  const onShakeRef = useRef(onShake);
  useEffect(() => {
    onShakeRef.current = onShake;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window))
      return undefined;

    let lastMagnitude = null;
    let lastShakeAt = 0;

    const handler = event => {
      const a = event.accelerationIncludingGravity;
      if (!a) return;
      const magnitude = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (lastMagnitude !== null) {
        const delta = Math.abs(magnitude - lastMagnitude);
        const now = Date.now();
        if (delta > threshold && now - lastShakeAt > cooldownMs) {
          lastShakeAt = now;
          onShakeRef.current();
        }
      }
      lastMagnitude = magnitude;
    };

    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [enabled, threshold, cooldownMs]);
}
