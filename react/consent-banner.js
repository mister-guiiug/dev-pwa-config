import { createElement as h, useCallback, useEffect, useState } from 'react';
import { useLabels } from './labels-core.js';
import {
  getAnalyticsId,
  initAnalytics,
  setAnalyticsConsent,
} from '../analytics.js';
import { appScopedKey, readRaw, removeKey, writeRaw } from '../storage.js';

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
 *  1. **Sans identifiant, pas de bandeau.** Si aucun `VITE_POSTHOG_KEY`
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
 * `placement="fixed"` — SANS ÇA, IL TOMBE OÙ L'APP LE MONTE.
 *
 * Le socle habillait sa boîte et ne la plaçait PAS : `position: static`, donc
 * en fin de flux, là où les apps le montent — c'est-à-dire sous le pied de
 * page. Mesuré en production sur mister-cim10 le 16/09/2026, en 375 × 812 :
 * boîte de 753 à 891 px pour une fenêtre de 812, recouverte par la barre basse
 * dont le bord haut est à 756. Le bandeau qui demande le consentement était à
 * la fois sous la ligne de flottaison ET derrière la navigation.
 *
 * `fixed` le met au-dessus du contenu, dégagé de la barre basse s'il y en a
 * une. Il reste OPT-IN : miss-dice pose le sien EN HAUT dans sa propre feuille,
 * et son CSS n'étant pas « layered », il garde la main — mais une app qui a son
 * placement n'a rien à demander ici.
 *
 * Non stylé : cibler `[data-dwc="consent-banner"]`.
 */

/**
 * LA PROP HÉRITÉE DE GA4 EST ACCEPTÉE UNE VERSION, ET ELLE CRIE.
 *
 * Les dix-neuf applications du parc passent `gaMeasurementId` aujourd'hui. La
 * refuser d'emblée casserait leur `tsc` à la seconde où la 6.0.0 est publiée,
 * toutes en même temps, avant que la campagne de migration ait pu passer.
 *
 * Mais l'accepter EN SILENCE serait pire : un `G-…` n'est d'aucun usage à
 * PostHog, la mesure s'arrêterait donc sans qu'aucun signe ne le dise — le
 * défaut que ce parc passe son temps à traquer. D'où un avertissement en clair,
 * une seule fois, qui nomme le remplacement.
 *
 * À RETIRER au prochain majeur, une fois la campagne passée.
 */
let herite = false;
function previensSiHerite(gaMeasurementId, posthogKey) {
  if (!gaMeasurementId || posthogKey || herite) return;
  herite = true;
  console.warn(
    '[dev-pwa-config] `gaMeasurementId` est ignorée depuis la 6.0.0 : la ' +
      'mesure est passée à PostHog (ADR 0012). AUCUNE MESURE NE PART tant que ' +
      '`posthogKey` n’est pas fournie — voir `VITE_POSTHOG_KEY`.'
  );
}

/** Le préfixe de la clé de stockage, au format du parc (`dwc_*`). */
export const CONSENT_KEY = 'dwc_consent';

/**
 * LA CLÉ PORTE L'APPLICATION, ET C'EST UNE NÉCESSITÉ, PAS UN CONFORT.
 *
 * Mesuré en navigateur le 15/09/2026 : accepter sur une app faisait disparaître
 * le bandeau de la suivante, qui chargeait son propre tag sans avoir rien
 * demandé. Un consentement donné à un service en valait dix-huit autres — ce
 * que le RGPD n'admet pas.
 *
 * Le calcul lui-même vit dans `storage.appScopedKey` depuis le 16/09/2026 : le
 * bandeau de mise à jour avait exactement le même besoin, et exactement le même
 * défaut. Deux écritures du même geste, dont une seule était juste.
 *
 * @param {string} [scope] Portée explicite ; sinon le chemin de base de l'app.
 */
export function consentKey(scope) {
  return appScopedKey(CONSENT_KEY, scope);
}

/**
 * LE CHOIX PORTE SA DATE — ET, SI L'APP LE DEMANDE, SA VERSION DE FINALITÉS.
 *
 * Le stockage ne contenait que `granted` ou `denied`. Un accord donné en 2026
 * valait donc indéfiniment, et si une finalité s'ajoutait un jour, rien ne
 * permettait de reposer la question : on ne pouvait pas distinguer « il a dit
 * oui à CE qu'on mesure aujourd'hui » de « il a dit oui à autre chose ».
 *
 * FORME : `choix`, `choix;date`, ou `choix;date;version`. Les trois se lisent,
 * et la PREMIÈRE est l'ancienne — un choix mémorisé avant cette version reste
 * valide et n'a pas à être redemandé. Une forme à séparateur plutôt que du JSON
 * pour que la valeur reste lisible à l'œil dans l'inspecteur, comme elle l'a
 * toujours été.
 *
 * @returns {{ choice: 'granted'|'denied', at: number|null,
 *   version: number|null } | null}
 */
export function readConsentRecord(scope) {
  const brut = readRaw(consentKey(scope));
  if (typeof brut !== 'string' || brut === '') return null;
  const [choice, date, version] = brut.split(';');
  if (choice !== 'granted' && choice !== 'denied') return null;
  const at = Number(date);
  const v = Number(version);
  return {
    choice,
    at: Number.isFinite(at) && at > 0 ? at : null,
    version: Number.isFinite(v) ? v : null,
  };
}

/** @returns {'granted'|'denied'|null} Le choix mémorisé, s'il y en a un. */
export function readConsentChoice(scope) {
  return readConsentRecord(scope)?.choice ?? null;
}

/**
 * Mémorise un choix, daté.
 *
 * @param {'granted'|'denied'} choice
 * @param {string} [scope]
 * @param {{ version?: number, at?: number }} [options]
 */
export function writeConsentChoice(choice, scope, options = {}) {
  if (choice !== 'granted' && choice !== 'denied') return false;
  const at = Number.isFinite(options.at) ? options.at : Date.now();
  const version = Number.isFinite(options.version) ? options.version : null;
  const valeur =
    version === null ? `${choice};${at}` : `${choice};${at};${version}`;
  return writeRaw(consentKey(scope), valeur);
}

/**
 * LA FRAÎCHEUR D'UN CHOIX — la règle, isolée pour être éprouvable seule.
 *
 * TREIZE MOIS PAR DÉFAUT. C'est la durée de vie maximale que la CNIL admet pour
 * un traceur : passé ce délai, l'accord d'hier ne couvre plus rien, et le
 * conserver reviendrait à mesurer sans base. Le REFUS expire au même âge —
 * jamais avant : « un refus qu'on redemande à chaque visite n'est pas un refus,
 * c'est du harcèlement », et treize mois n'est pas « à chaque visite ».
 *
 * UN CHOIX SANS DATE N'EST PAS PÉRIMÉ. Les choix mémorisés avant cette version
 * n'en portent pas ; les compter comme expirés ferait reparaître le bandeau
 * chez tout le monde le jour de la montée, pour une raison que l'utilisateur
 * n'a pas vécue. Le hook les RE-DATE d'aujourd'hui : l'horloge part de la
 * montée, pas du néant.
 *
 * @param {{ at: number|null, version: number|null } | null} record
 * @param {{ maxAgeDays?: number, purposeVersion?: number }} regles
 */
export function consentPerime(record, regles = {}) {
  if (!record) return false;
  const { maxAgeDays = 395, purposeVersion } = regles;

  // Les finalités ont changé : l'accord d'hier ne porte pas sur ce qu'on
  // mesure aujourd'hui. Un choix sans version répond à une app qui n'en
  // demandait pas — il n'y a rien à comparer.
  if (
    Number.isFinite(purposeVersion) &&
    record.version !== null &&
    record.version !== purposeVersion
  )
    return true;
  if (Number.isFinite(purposeVersion) && record.version === null) return true;

  if (!Number.isFinite(maxAgeDays) || maxAgeDays <= 0) return false;
  if (record.at === null) return false;
  return Date.now() - record.at > maxAgeDays * 86_400_000;
}

/**
 * Oublie le choix — le bandeau reposera la question.
 *
 * NE RÉVOQUE PAS le consentement déjà donné : une fois le script de Google
 * évalué, il ne se décharge pas. C'est le comportement documenté du mode
 * consentement, et `setAnalyticsConsent` le dit déjà dans ses propres termes.
 * Pour couper la collecte, il faut AUSSI `setAnalyticsConsent('denied')` — ce
 * que fait le bouton « Refuser » du bandeau, et ce que fait `reset()` du hook
 * depuis qu'il existe une surface pour l'appeler.
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
 * @param {{ posthogKey?: string, posthogHost?: string,
 *   appName?: string, scope?: string }} [options]
 * @returns {{ choice: 'granted'|'denied'|null, configured: boolean,
 *   needed: boolean, accept: () => void, refuse: () => void,
 *   reset: () => void }}
 */
/**
 * LES INSTANCES MONTÉES DU HOOK, pour qu'un choix fait ICI se voie LÀ.
 *
 * `useConsentChoice` tient son choix dans un `useState` local. Le bandeau et le
 * réglage du pied de page sont donc DEUX instances, chacune avec sa copie :
 * sans ce registre, cliquer « Modifier mon choix » dans le pied vidait bien le
 * stockage, et le bandeau — qui n'en savait rien — ne revenait pas. Le bouton
 * n'aurait rien fait de visible, c'est-à-dire rien du tout.
 *
 * La diffusion porte la CLÉ, pas la portée : deux apps qui cloisonnent leur
 * consentement (voir `consentKey`) ne doivent pas s'entendre l'une l'autre.
 *
 * Entre ONGLETS, rien n'est fait ici : `localStorage` émet déjà `storage` pour
 * ça, et le prochain rendu à froid relit le stockage de toute façon.
 */
const abonnes = new Set();
function diffuser(cle, choix) {
  for (const abonne of abonnes) abonne(cle, choix);
}

/**
 * Le choix retenu APRÈS la règle de fraîcheur — sans rien écrire.
 *
 * L'initialiseur de `useState` s'exécute PENDANT le rendu, et React 19 le joue
 * deux fois en mode strict : l'entretien du stockage (oublier un choix périmé,
 * re-dater un choix sans date) n'a rien à y faire. Il est fait dans l'effet,
 * une fois.
 */
function choixFrais(scope, maxAgeDays, purposeVersion) {
  const record = readConsentRecord(scope);
  if (!record) return null;
  return consentPerime(record, { maxAgeDays, purposeVersion })
    ? null
    : record.choice;
}

export function useConsentChoice(options = {}) {
  const {
    posthogKey,
    posthogHost,
    loader,
    appName,
    scope,
    maxAgeDays,
    purposeVersion,
    gaMeasurementId,
  } = options;
  previensSiHerite(gaMeasurementId, posthogKey);
  const [choice, setChoice] = useState(() =>
    choixFrais(scope, maxAgeDays, purposeVersion)
  );
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const cle = consentKey(scope);
    const ecouter = (autre, choix) => {
      if (autre === cle) setChoice(choix);
    };
    abonnes.add(ecouter);
    return () => {
      abonnes.delete(ecouter);
    };
  }, [scope]);

  // L'ENTRETIEN DU STOCKAGE, une fois, hors du rendu.
  useEffect(() => {
    const record = readConsentRecord(scope);
    if (!record) return;
    if (consentPerime(record, { maxAgeDays, purposeVersion })) {
      // Périmé : on oublie, et le bandeau repose la question. Pas de
      // `setAnalyticsConsent` ici — le tag n'a pas été rejoué, donc il n'y a
      // rien à couper ; `initAnalytics` part de `denied`.
      clearConsentChoice(scope);
      setChoice(null);
      return;
    }
    // Un choix d'avant cette version n'a pas de date. Le re-dater
    // d'aujourd'hui fait partir l'horloge de la montée : sans ça, soit il
    // n'expire jamais, soit il expire pour tout le monde le même jour.
    if (record.at === null)
      writeConsentChoice(record.choice, scope, { version: purposeVersion });
  }, [scope, maxAgeDays, purposeVersion]);

  useEffect(() => {
    // SI L'APPLICATION A DÉJÀ APPELÉ `initAnalytics`, ON NE LE REFAIT PAS.
    // Un second appel réémettrait `consent default` — et une valeur par défaut
    // postérieure à une mise à jour n'a pas de sémantique définie chez Google.
    // On se contente alors de lire l'identifiant qu'elle a posé.
    const deja = getAnalyticsId();
    const id =
      deja ??
      initAnalytics({ posthogKey, posthogHost, appName, loader }).id ??
      null;
    setConfigured(Boolean(id));
    if (!id) return;
    // Le choix d'hier, rejoué : sans ça le tag n'est jamais injecté, quel que
    // soit ce que l'utilisateur a accepté la dernière fois. Un refus, lui, n'a
    // rien à rejouer — `initAnalytics` part déjà de `denied`.
    //
    // `choixFrais` et non `readConsentChoice` : un accord PÉRIMÉ ne doit pas
    // rouvrir la collecte. C'est toute la différence entre dater un choix et
    // le faire compter.
    if (choixFrais(scope, maxAgeDays, purposeVersion) === 'granted')
      setAnalyticsConsent({ analytics: true });
  }, [
    posthogKey,
    posthogHost,
    loader,
    appName,
    scope,
    maxAgeDays,
    purposeVersion,
  ]);

  const decide = useCallback(
    next => {
      writeConsentChoice(next, scope, { version: purposeVersion });
      setChoice(next);
      diffuser(consentKey(scope), next);
      setAnalyticsConsent(next === 'granted' ? { analytics: true } : 'denied');
    },
    [scope, purposeVersion]
  );

  const accept = useCallback(() => decide('granted'), [decide]);
  const refuse = useCallback(() => decide('denied'), [decide]);

  /**
   * REVENIR SUR SON CHOIX — ET LA COLLECTE S'ARRÊTE PENDANT CE TEMPS.
   *
   * `reset` se contentait d'oublier le choix. Sur un accord déjà donné, ça
   * laissait la mesure ACTIVE pendant toute la session : l'utilisateur avait
   * demandé à revoir sa décision, le stockage ne disait plus rien, et Google
   * continuait de recevoir. Un rechargement finissait par l'éteindre —
   * `initAnalytics` part de `denied` — mais l'utilisateur qui s'en va sans
   * rien choisir était mesuré jusqu'au bout.
   *
   * Refuser d'abord, oublier ensuite : quelle que soit la suite — choisir à
   * nouveau, fermer l'onglet, partir — rien n'est collecté tant que le
   * consentement n'est pas redonné. C'est la seule lecture qui rend le retrait
   * aussi simple que l'accord, ce que demande l'article 7.3 du RGPD.
   *
   * AUCUN CONSOMMATEUR NE CHANGE DE COMPORTEMENT : relevé du 16/09/2026, zéro
   * app du parc appelait `reset`, `clearConsentChoice` ou `useConsentChoice`.
   * La porte de sortie existait et n'était branchée nulle part.
   */
  const reset = useCallback(() => {
    setAnalyticsConsent('denied');
    clearConsentChoice(scope);
    setChoice(null);
    diffuser(consentKey(scope), null);
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
 * `policy` — L'INFORMATION SUR PLACE, POUR LES APPS QUI N'ONT PAS D'URL.
 *
 * `policyHref` suppose une page ; le parc n'en a pas. Relevé du 16/09/2026 :
 * trois apps n'ont AUCUN routeur (`miss-dice`, `miss-ticket-pwa`,
 * `mister-puzzle`) et `mister-doc`, la seule à avoir écrit une politique, l'a
 * faite en dialogue — « il n'y a pas d'URL à mettre dans un lien », dit son
 * commentaire. Résultat : zéro app sur dix-huit passait `policyHref`, et le
 * bandeau demandait un accord sans qu'aucun texte ne dise à quoi.
 *
 * `policy` accepte donc un nœud — `PrivacyNotice` en général — déplié sur
 * place. **Ce n'est PAS la « gestion des préférences » que la décision 3
 * écarte** : ce repli n'offre aucun choix, il informe. Aucune décision ne se
 * prend derrière, et refuser reste à un clic, au même niveau qu'accepter.
 *
 * Les deux coexistent : `policyHref` pour qui a une vraie page, `policy` pour
 * qui n'en a pas. Fournir les deux affiche le lien ET le repli.
 *
 * @param {{ posthogKey?: string, posthogHost?: string,
 *   appName?: string,
 *   scope?: string, policyHref?: string, className?: string,
 *   placement?: 'static'|'fixed',
 *   title?: import('react').ReactNode, message?: import('react').ReactNode,
 *   policy?: import('react').ReactNode,
 *   acceptLabel?: string, refuseLabel?: string, policyLabel?: string }} props
 */
export function ConsentBanner(props) {
  const {
    posthogKey,
    posthogHost,
    loader,
    appName,
    scope,
    maxAgeDays,
    purposeVersion,
    gaMeasurementId,
    policyHref,
    className,
    placement,
    title,
    message,
    policy,
    acceptLabel,
    refuseLabel,
    policyLabel,
  } = props;

  const labels = useLabels('consent');
  const { needed, accept, refuse } = useConsentChoice({
    posthogKey,
    posthogHost,
    loader,
    appName,
    scope,
    maxAgeDays,
    purposeVersion,
    gaMeasurementId,
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
      'data-placement': placement === 'fixed' ? 'fixed' : undefined,
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
    ),
    // Après les actions, jamais avant : le repli ne doit pas s'interposer
    // entre la question et les deux boutons qui y répondent.
    policy
      ? h(
          'details',
          { 'data-dwc': 'consent-policy-details' },
          h(
            'summary',
            { 'data-dwc': 'consent-policy-summary' },
            policyLabel ?? labels.policy
          ),
          policy
        )
      : null
  );
}

/**
 * REVENIR SUR SON CHOIX — la pièce qui manquait au bandeau.
 *
 * LE RELEVÉ QUI L'A FAIT NAÎTRE. Le 16/09/2026, sur les vingt et une apps du
 * parc : dix-neuf montent `ConsentBanner`, et **zéro** référence `reset`,
 * `clearConsentChoice` ou `useConsentChoice`. Un visiteur qui avait accepté —
 * ou refusé — ne pouvait plus jamais changer d'avis, par aucun chemin. Les
 * pièces existaient depuis la 4.17.0 et n'étaient branchées nulle part.
 *
 * L'article 7.3 du RGPD demande que le retrait soit AUSSI SIMPLE que l'accord.
 * Ici il était impossible : ce n'est pas un défaut d'ergonomie, c'en est un de
 * conformité, et c'est le seul de son espèce dans le parc.
 *
 * POURQUOI UN BOUTON QUI RAPPELLE LE BANDEAU, ET PAS UN INTERRUPTEUR. Un
 * interrupteur dans un pied de page serait une SECONDE surface de décision, à
 * tenir à l'équilibre du bandeau — même taille, même contraste, même coût au
 * clic — sous peine de refaire par la mise en page ce que le bandeau évite par
 * construction. Rappeler le bandeau garantit l'égalité sans avoir à la
 * maintenir : c'est le MÊME écran qui repose la question.
 *
 * ET LA COLLECTE S'ARRÊTE ENTRE-TEMPS : `reset` refuse avant d'oublier, donc
 * l'utilisateur qui ouvre la question et s'en va n'est pas mesuré pendant ce
 * temps.
 *
 * SANS CHOIX FAIT, IL NE REND RIEN. Le bandeau est alors à l'écran en train de
 * poser la question : un « modifier mon choix » à côté d'elle n'aurait pas de
 * référent.
 *
 * `posthogKey` EST À PASSER, comme au bandeau. Le hook retombe sur
 * l'identifiant déjà posé par `initAnalytics` s'il y en a un, mais l'ordre des
 * effets entre deux branches de l'arbre n'est pas une garantie : le premier
 * rendu du pied de page peut précéder celui du bandeau.
 *
 * Non stylé : cibler `[data-dwc="consent-settings"]`.
 *
 * @param {{ posthogKey?: string, posthogHost?: string, scope?: string,
 *   className?: string, stateLabel?: string, actionLabel?: string }} props
 */
export function ConsentSettings(props = {}) {
  const {
    posthogKey,
    posthogHost,
    loader,
    scope,
    maxAgeDays,
    purposeVersion,
    gaMeasurementId,
    className,
    stateLabel,
    actionLabel,
  } = props;

  const labels = useLabels('consent');
  const { choice, configured, reset } = useConsentChoice({
    posthogKey,
    posthogHost,
    loader,
    scope,
    maxAgeDays,
    purposeVersion,
    gaMeasurementId,
  });

  if (!configured || choice === null) return null;

  const etat =
    stateLabel ??
    (choice === 'granted' ? labels.stateGranted : labels.stateDenied);

  return h(
    'button',
    {
      type: 'button',
      className,
      'data-dwc': 'consent-settings',
      // L'état en attribut : une app peut colorer l'accord et le refus
      // différemment sans relire le stockage.
      'data-choice': choice,
      onClick: reset,
    },
    // DEUX morceaux, et le second n'est pas décoratif : « Mesure d'audience :
    // acceptée » dit l'état sans dire ce que le clic fait. Le nom accessible du
    // bouton est la somme des deux.
    h('span', { 'data-dwc': 'consent-settings-state' }, etat),
    h(
      'span',
      { 'data-dwc': 'consent-settings-action' },
      actionLabel ?? labels.manage
    )
  );
}

export default ConsentBanner;
