export interface GuardCheck {
  /** Code stable du motif — testable sans dépendre du texte. */
  code: string;
  blocked: boolean;
  /** Message affiché. Défaut : le libellé du même code, sinon le code brut. */
  message?: string;
}

export interface ActionGuardOptions {
  /** Exiger le réseau (via `useOnline`). */
  online?: boolean;
  /** Vérifications ordonnées : le premier motif bloquant est celui affiché. */
  checks?: readonly GuardCheck[];
}

export interface ActionGuardResult {
  allowed: boolean;
  /** `'offline'`, ou le code de la première vérification bloquante. */
  reasonCode: string | null;
  /** Motif prêt à afficher, ou `null` si l'action est permise. */
  reason: string | null;
  disabled: boolean;
  /**
   * À étaler sur le bouton. `aria-disabled` plutôt que `disabled` : le bouton
   * reste focusable, l'utilisateur peut découvrir pourquoi c'est bloqué.
   */
  disabledProps: { 'aria-disabled'?: true };
  /** Rend la fonction inerte quand l'action est bloquée. */
  wrap: <T extends (...args: never[]) => unknown>(
    fn: T
  ) => (...args: Parameters<T>) => ReturnType<T> | undefined;
}

/** La décision seule, sans React — pour les tests et les gardes hors composant. */
export declare function resolveGuard(
  options?: ActionGuardOptions,
  context?: { isOnline?: boolean; labels?: Record<string, string> }
): ActionGuardResult;

/** Ce bouton doit-il être actif — et sinon, que dire à l'utilisateur ? */
export declare function useActionGuard(
  options?: ActionGuardOptions
): ActionGuardResult;
