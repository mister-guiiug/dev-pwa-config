import type { ReactNode } from 'react';
import type { AuthClient } from '../auth/index.js';

export interface AuthGateProps {
  /** Client rendu par `createAuthClient`. Inutile en `bypass`. */
  client?: AuthClient | null;
  /** L'application, rendue en `signed-in` (et en `bypass`). */
  children?: ReactNode;
  /** Rendu pendant la lecture de session. Défaut : `null`. */
  loading?: ReactNode;
  /** L'écran de connexion, rendu en `signed-out`. Défaut : `null`. */
  fallback?: ReactNode;
  /**
   * Le défi TOTP, rendu en `needs-mfa`. Non fourni : retombe sur `fallback`
   * — tant que l'étape n'est pas franchie, on ne montre pas l'application.
   */
  mfa?: ReactNode;
  /**
   * Mode local d'uwh et lookhouse : laisser passer, la sécurité réelle
   * restant appliquée côté serveur par les politiques RLS.
   */
  bypass?: boolean;
}

/**
 * Garde d'accès non stylée : aiguille `loading` → `fallback` (connexion) →
 * `mfa` (défi TOTP) → `children` selon l'état du port. Aucun écran fourni —
 * ce sont des décisions de produit.
 */
export declare function AuthGate(props: AuthGateProps): ReactNode;
