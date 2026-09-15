import { createElement as h, useCallback, useEffect, useState } from 'react';
import { useLabels } from './labels-core.js';
import {
  getAnalyticsId,
  initAnalytics,
  setAnalyticsConsent,
} from '../analytics.js';
import { readRaw, removeKey, writeRaw } from '../storage.js';

/**
 * Le bandeau qui DEMANDE le consentement — la pièce qui manquait à `analytics`.
 *
 * CE QUI EXISTAIT, ET CE QUI MANQUAIT. `analytics.js` sait honorer un
 * consentement depuis sa promotion : l'état par défaut y est `denied`, et le
 * tag n'est même pas injecté tant que rien n'est accordé. Mais rien, nulle
 * part, ne posait la question. Relevé sur les vingt et une applications du
 * parc le 15/09/2026 : **zéro** appelle `initAnalytics`, **zéro** appelle
 * `usePageViews`, et aucun composant de consentement n'existe dans `react/`.
 * Le garde-fou était écrit, la porte n'avait pas de sonnette.
 *
 * QUATRE DÉCISIONS, ET AUCUNE N'EST COSMÉTIQUE :
 *
 *  1. **Sans identifiant, pas de bandeau.** Si aucun `VITE_GA_MEASUREMENT_ID`
 *     n'est posé, il n'y a rien à mesurer et donc rien à demander. Dix des
 *     vingt et une apps partiront sans identifiant : leur poser la question
 *     serait du bruit, et un bruit qui use le consentement des suivantes.
 *  2. **Le choix est relu au montage.** Sans ça, un visiteur qui a accepté
 *     hier reverrait le bandeau à chaque chargement : le tag n'est JAMAIS
 *     injecté sans un `setAnalyticsConsent` explicite, et l'acceptation
 *     d'hier ne survit que dans le stockage.
 *  3. **Refuser coûte un clic, comme accepter.** Les deux boutons sont au même
 *     niveau, dans le même conteneur, sans écran intermédiaire. C'est ce que la
 *     CNIL exige, et c'est aussi la raison pour laquelle il n'y a pas de
 *     « gérer mes préférences » ici : un tel écran rend le refus plus coûteux
 *     que l'acceptation.
 *  4. **Le refus est MÉMORISÉ.** Un refus qu'on redemande à chaque visite n'est
 *     pas un refus, c'est du harcèlement. `clearConsentChoice` existe pour le
 *     lien « modifier mon choix » d'une page de confidentialité.
 *
 * CE QU'IL NE FAIT PAS. Il ne bloque pas l'application : c'est une `region`,
 * pas une boîte modale. Un consentement n'est pas un péage, et piéger le focus
 * pour l'obtenir est précisément la figure que le RGPD appelle un « dark
 * pattern ».
 *
 * Non stylé : cibler `[data-dwc="consent-banner"]`.
 */

/** Le préfixe de la clé de stockage, au format du parc (`dwc_*`). */
export const CONSENT_KEY = 'dwc_consent';

/**
 * LA CLÉ PORTE L'APPLICATION, ET C'EST UNE NÉCESSITÉ, PAS UN CONFORT.
 *
 * `localStorage` est cloisonné par ORIGINE. Les vingt sites de la famille sont
 * servis sous `https://<compte>.github.io/<dépôt>/` : une seule origine pour
 * tous. Une clé nue y est donc COMMUNE. Mesuré en navigateur le 15/09/2026 :
 * accepter sur une app faisait disparaître le bandeau de la suivante, qui
 * chargeait son propre tag sans avoir rien demandé. Un consentement donné à un
 * service en valait dix-huit autres — ce que le RGPD n'admet pas.
 *
 * `import.meta.env.BASE_URL` vaut `/<dépôt>/` dans le build de chaque app, et
 * `/` en développement — où le cloisonnement vient déjà du port. Vérifié dans
 * un build réel : Vite remplace bien la valeur À L'INTÉRIEUR du code du socle
 * livré depuis `node_modules`, forme optionnelle comprise.
 *
 * `scope` explicite l'emporte : c'est ce qui rend le comportement testable, et
 * ce qui permet à deux apps de PARTAGER délibérément un choix si elles le
 * décident un jour.
 *
 * @param {string} [scope] Portée explicite ; sinon le chemin de base de l'app.
 */
export function consentKey(scope) {
  const base =
    scope ??
    ((typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/');
  return base && base !== '/' ? `${CONSENT_KEY}:${base}` : CONSENT_KEY;
}

/** @returns {'granted'|'denied'|null} Le choix mémorisé, s'il y en a un. */
export function readConsentChoice(scope) {
  const value = readRaw(consentKey(scope));
  return value === 'granted' || value === 'denied' ? value : null;
}

/** Mémorise un choix. @param {'granted'|'denied'} choice */
export function writeConsentChoice(choice, scope) {
  if (choice !== 'granted' && choice !== 'denied') return false;
  return writeRaw(consentKey(scope), choice);
}

/**
 * Oublie le choix — le bandeau reposera la question.
 *
 * NE RÉVOQUE PAS le consentement déjà donné : une fois le script de Google
 * évalué, il ne se décharge pas. C'est le comportement documenté du mode
 * consentement, et `setAnalyticsConsent` le dit déjà dans ses propres termes.
 * Pour couper la collecte, il faut AUSSI `setAnalyticsConsent('denied')` — ce
 * que fait le bouton « Refuser » du bandeau.
 */
export function clearConsentChoice(scope) {
  return removeKey(consentKey(scope));
}

/**
 * L'état du consentement, et les deux gestes qui le changent.
 *
 * Utilisable seul, pour une page de confidentialité qui veut offrir le choix
 * ailleurs que dans le bandeau.
 *
 * @param {{ gaMeasurementId?: string, gtmContainerId?: string,
 *   scope?: string }} [options]
 * @returns {{ choice: 'granted'|'denied'|null, configured: boolean,
 *   needed: boolean, accept: () => void, refuse: () => void,
 *   reset: () => void }}
 */
export function useConsentChoice(options = {}) {
  const { gaMeasurementId, gtmContainerId, scope } = options;
  const [choice, setChoice] = useState(() => readConsentChoice(scope));
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    // SI L'APPLICATION A DÉJÀ APPELÉ `initAnalytics`, ON NE LE REFAIT PAS.
    // Un second appel réémettrait `consent default` — et une valeur par défaut
    // postérieure à une mise à jour n'a pas de sémantique définie chez Google.
    // On se contente alors de lire l'identifiant qu'elle a posé.
    const deja = getAnalyticsId();
    const id =
      deja ?? initAnalytics({ gaMeasurementId, gtmContainerId }).id ?? null;
    setConfigured(Boolean(id));
    if (!id) return;
    // Le choix d'hier, rejoué : sans ça le tag n'est jamais injecté, quel que
    // soit ce que l'utilisateur a accepté la dernière fois. Un refus, lui, n'a
    // rien à rejouer — `initAnalytics` part déjà de `denied`.
    if (readConsentChoice(scope) === 'granted')
      setAnalyticsConsent({ analytics: true });
  }, [gaMeasurementId, gtmContainerId, scope]);

  const decide = useCallback(
    next => {
      writeConsentChoice(next, scope);
      setChoice(next);
      setAnalyticsConsent(next === 'granted' ? { analytics: true } : 'denied');
    },
    [scope]
  );

  const accept = useCallback(() => decide('granted'), [decide]);
  const refuse = useCallback(() => decide('denied'), [decide]);
  const reset = useCallback(() => {
    clearConsentChoice(scope);
    setChoice(null);
  }, [scope]);

  return {
    choice,
    configured,
    needed: configured && choice === null,
    accept,
    refuse,
    reset,
  };
}

/**
 * @param {{ gaMeasurementId?: string, gtmContainerId?: string,
 *   scope?: string, policyHref?: string, className?: string,
 *   title?: import('react').ReactNode, message?: import('react').ReactNode,
 *   acceptLabel?: string, refuseLabel?: string, policyLabel?: string }} props
 */
export function ConsentBanner(props) {
  const {
    gaMeasurementId,
    gtmContainerId,
    scope,
    policyHref,
    className,
    title,
    message,
    acceptLabel,
    refuseLabel,
    policyLabel,
  } = props;

  const labels = useLabels('consent');
  const { needed, accept, refuse } = useConsentChoice({
    gaMeasurementId,
    gtmContainerId,
    scope,
  });

  if (!needed) return null;

  return h(
    'div',
    {
      // `region` et non `dialog` : le bandeau ne piège pas le focus et
      // n'interrompt pas la lecture. Il est atteignable à la tabulation,
      // annoncé par son nom, et l'application reste utilisable derrière.
      role: 'region',
      'aria-label': typeof title === 'string' ? title : labels.title,
      'data-dwc': 'consent-banner',
      className,
    },
    h('p', { 'data-dwc': 'consent-message' }, message ?? labels.message),
    h(
      'div',
      { 'data-dwc': 'consent-actions' },
      h(
        'button',
        { type: 'button', 'data-dwc': 'consent-accept', onClick: accept },
        acceptLabel ?? labels.accept
      ),
      h(
        'button',
        { type: 'button', 'data-dwc': 'consent-refuse', onClick: refuse },
        refuseLabel ?? labels.refuse
      ),
      policyHref
        ? h(
            'a',
            { href: policyHref, 'data-dwc': 'consent-policy' },
            policyLabel ?? labels.policy
          )
        : null
    )
  );
}

export default ConsentBanner;
