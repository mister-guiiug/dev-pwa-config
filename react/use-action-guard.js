import { useMemo } from 'react';
import { useLabels } from './labels.js';
import { useOnline } from './use-online.js';

/**
 * Ce bouton doit-il être actif — et sinon, QUE DIRE à l'utilisateur ?
 *
 * PROMU, PAS INVENTÉ. `miss-supaboss/src/shared/hooks/useActionGuard.ts`, en
 * production : chaque motif de blocage y porte un CODE STABLE, un texte
 * traduit, et des props à étaler sur le bouton. Un bouton grisé sans
 * explication est le même défaut que la suggestion de doublon muette que
 * `./similarity` corrige : l'utilisateur hausse les épaules et s'en va.
 *
 * CE QUI CHANGE À LA PROMOTION. L'original lisait ses rôles dans les stores de
 * l'app (`canOperate`, `canAdmin`, `fromCache`) — des mots qui n'appartiennent
 * qu'à elle. Ici, seuls les motifs UNIVERSELS restent câblés (`offline`, par
 * `useOnline` du paquet) ; tout le reste est INJECTÉ comme une liste de
 * vérifications ordonnées, chacune avec son code et son message :
 *
 *   const garde = useActionGuard({
 *     online: true,
 *     checks: [
 *       { code: 'readonly', blocked: fromCache },
 *       { code: 'admin', blocked: !isAdmin, message: 'Réservé aux référents' },
 *     ],
 *   });
 *   <button {...garde.disabledProps} onClick={garde.wrap(supprimer)}>…</button>
 *   {garde.reason && <p role="status">{garde.reason}</p>}
 *
 * L'ORDRE DES VÉRIFICATIONS EST L'ORDRE DES EXPLICATIONS : le premier motif
 * bloquant est celui qui s'affiche. « Hors ligne » avant « réservé aux
 * référents » — être au mauvais endroit ne sert à rien si le réseau manque.
 *
 * `wrap(fn)` rend une fonction inerte quand l'action est bloquée : le clic
 * d'un lecteur d'écran qui ignore `aria-disabled`, ou d'un test, ne déclenche
 * rien. C'est la ceinture avec les bretelles, et l'original l'avait comprise.
 */

/**
 * La décision seule, sans React — exportée pour les tests et les gardes hors
 * composant (une commande clavier, un raccourci).
 *
 * @param {{ online?: boolean, checks?: Array<{ code: string, blocked: boolean,
 *   message?: string }> }} options
 * @param {{ isOnline: boolean, labels?: Record<string, string> }} context
 */
export function resolveGuard(options = {}, context = {}) {
  const { online = false, checks = [] } = options;
  const { isOnline = true, labels = {} } = context;

  let reasonCode = null;
  let reason = null;

  if (online && !isOnline) {
    reasonCode = 'offline';
    reason = labels.offline ?? 'Indisponible hors ligne';
  } else {
    for (const check of checks) {
      if (!check?.blocked) continue;
      reasonCode = check.code;
      // Le message du motif : celui de la vérification, sinon le libellé du
      // même code (le paquet en porte pour `readonly`), sinon le code brut —
      // un code brut à l'écran est un bug VISIBLE, ce qui vaut mieux qu'un
      // blocage muet.
      reason = check.message ?? labels[check.code] ?? check.code;
      break;
    }
  }

  const allowed = reasonCode === null;
  return {
    allowed,
    reasonCode,
    reason,
    disabled: !allowed,
    // `disabled` natif retire le bouton du parcours clavier ET du focus des
    // lecteurs d'écran : l'utilisateur ne peut plus DÉCOUVRIR pourquoi c'est
    // bloqué. `aria-disabled` le laisse focusable ; `wrap` neutralise le clic.
    disabledProps: allowed
      ? { 'aria-disabled': undefined }
      : { 'aria-disabled': true },
    wrap:
      fn =>
      (...args) =>
        allowed ? fn(...args) : undefined,
  };
}

/**
 * Le hook : `resolveGuard` branché sur `useOnline` et les libellés.
 *
 * @param {{ online?: boolean, checks?: Array<{ code: string, blocked: boolean,
 *   message?: string }> }} [options]
 */
export function useActionGuard(options = {}) {
  const isOnline = useOnline();
  const labels = useLabels('guard');

  // `checks` arrive souvent en littéral, donc avec une identité neuve à
  // chaque rendu : la dépendance porte sur son CONTENU.
  const fingerprint = JSON.stringify(
    (options.checks ?? []).map(check => [check.code, check.blocked])
  );

  return useMemo(
    () => resolveGuard(options, { isOnline, labels }),
    // Dépendances : le CONTENU de `checks` (via fingerprint), pas son identité.
    [options.online, fingerprint, isOnline, labels]
  );
}
