import type { FC } from 'react';

export interface AppVersionProps {
  /** Préfixe du numéro (défaut `''` ; `'v'` pour la forme d'un tag). */
  prefix?: string;
  /**
   * Le mot « Version » devant le numéro. `false` laisse le numéro seul —
   * à réserver aux endroits où le contexte le dit déjà.
   */
  label?: boolean | string;
  /** Ajoute la date de compilation et le commit court. */
  details?: boolean;
  /** `false` masque « mis à jour vers » et « version disponible ». */
  updates?: boolean;
  /** Dépôt GitHub : le numéro devient un lien vers `releases/tag/vX.Y.Z`. */
  repoUrl?: string;
  /** URL de release explicite ; `{version}` y est remplacé. Prime sur `repoUrl`. */
  releaseUrl?: string;
  /** Locale de la date de compilation (défaut : celle de `./format`). */
  locale?: string;
  className?: string;
}

/** Le numéro de version, et ce qu'il devient quand il bouge. `null` sans version. */
export declare const AppVersion: FC<AppVersionProps>;
