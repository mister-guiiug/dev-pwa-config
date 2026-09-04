import { createContext, createElement as h, useContext } from 'react';
import { SPONSOR_URL, sponsorUrl } from '../apps-catalog.js';

/**
 * Le lien de soutien : déclaré une fois, surchargeable, et désactivable.
 *
 * LE PROBLÈME. `AppFooter` et `FamilyApps` acceptent tous deux `sponsorUrl`,
 * donc la surcharge existait — à condition de la répéter à CHAQUE endroit qui
 * monte l'un des deux. Et le défaut d'`AppFooter` n'était pas la constante du
 * catalogue mais une COPIE de la chaîne, écrite en dur : changer le catalogue
 * ne changeait pas le pied de page. Deux sources pour une seule vérité.
 *
 * TROIS NIVEAUX, dans l'ordre de `LabelsProvider` : la **prop** l'emporte
 * toujours, puis le **contexte**, puis le lien de la famille. Une app qui ne
 * fait rien obtient exactement ce qu'elle avait avant.
 *
 *   // Un autre pseudo Buy Me a Coffee, une fois pour toute l'app :
 *   <SponsorProvider handle="autre.pseudo">…</SponsorProvider>
 *
 *   // Une autre plateforme (Liberapay, Ko-fi, une page à soi) :
 *   <SponsorProvider url="https://liberapay.com/…">…</SponsorProvider>
 *
 *   // Aucun soutien : les liens disparaissent partout.
 *   <SponsorProvider url={null}>…</SponsorProvider>
 *
 * `null` N'EST PAS `undefined`, ET C'EST TOUT L'INTÉRÊT. `undefined` veut dire
 * « je ne me prononce pas » et laisse le niveau suivant répondre ; `null` veut
 * dire « pas de lien », et il est respecté jusqu'au bout. Sans cette
 * distinction, un fork n'aurait aucun moyen de retirer un appel au don qui
 * pointe vers quelqu'un d'autre.
 *
 * CE QUI N'EST PAS FAIT ICI : lire `import.meta.env`. Un lien de soutien est
 * une identité, pas une configuration : le déclarer dans l'arbre le rend
 * visible à la relecture, testable, et il ne peut pas disparaître d'un build
 * parce qu'une variable n'a pas été posée — ce qui est exactement le mode de
 * panne que le parc cherche à supprimer (voir `CONFIG.md`).
 *
 * `.github/FUNDING.yml` reste à écrire à la main : c'est GitHub qui le lit, pas
 * l'app. Le pseudo y est le même que celui passé ici.
 */

/** `undefined` = personne ne s'est prononcé ; `null` = pas de lien. */
const SponsorContext = createContext(undefined);

/**
 * @param {{ url?: string | null, handle?: string,
 *   children?: import('react').ReactNode }} props
 */
export function SponsorProvider(props) {
  const { url, handle, children } = props;
  // `url` l'emporte sur `handle` : il est plus précis, et il seul peut valoir
  // `null`. Les deux absents, le fournisseur ne dit rien — le catalogue répond.
  const value =
    url !== undefined
      ? url
      : handle !== undefined
        ? sponsorUrl(handle)
        : undefined;
  return h(SponsorContext.Provider, { value }, children);
}

/**
 * Résout le lien de soutien : prop, puis contexte, puis famille.
 *
 * @param {string | null} [prop] Ce que le composant a reçu, tel quel.
 * @returns {string | null} L'URL à afficher, ou `null` pour ne rien afficher.
 */
export function useSponsorUrl(prop) {
  const fromContext = useContext(SponsorContext);
  if (prop !== undefined) return prop;
  if (fromContext !== undefined) return fromContext;
  return SPONSOR_URL;
}
