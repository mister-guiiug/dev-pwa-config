/**
 * issue-report — l'URL d'un signalement PRÉREMPLI.
 *
 * Le dépôt `.github` du compte prête un gabarit d'anomalie (`bug.yml`) à tous
 * les dépôts de la famille. Ses champs ont des identifiants — `version`,
 * `environnement`, `reproduire`, `attendu-obtenu`, `journal` — et GitHub
 * préremplit tout champ dont l'identifiant figure dans la requête de
 * `issues/new`. Ce module compose cette URL avec ce que l'application SAIT et
 * que l'utilisateur ne sait jamais dire : la version et le commit qui tournent
 * (`readBuildInfo`, posés dans la page par `vite-version`), l'écran où il
 * était, son navigateur et son système, et si l'application est installée.
 *
 * Aucune application du parc n'avait de signalement structuré au relevé du
 * 05/09/2026 : les rapports arrivaient sans version, et la première réponse
 * était toujours « quelle version ? ».
 *
 * Sans DOM — rendu serveur, test — tout ce qui vient de `navigator` ou de
 * `window` est simplement omis, et l'URL reste valide.
 *
 * Il compose aussi « Proposer une idée » (gabarit `feature.yml`) et, pour qui
 * n'a pas de compte GitHub, le même signalement en `mailto:` (07/11/2026,
 * voir plus bas).
 */
import { formatVersion, readBuildInfo } from './version.js';

/** Le gabarit que le dépôt `.github` du compte prête à tous les dépôts. */
export const ISSUE_TEMPLATE = 'bug.yml';

/**
 * Le gabarit d'évolution du même dépôt `.github` : « Le besoin », « Ce que
 * vous faites en attendant », « Une piste ». Aucun dépôt du parc n'a son
 * propre `.github/ISSUE_TEMPLATE/` hormis le socle, qui porte le même : tous
 * héritent donc de celui du compte (relevé du 07/11/2026).
 */
export const FEATURE_TEMPLATE = 'feature.yml';

/** Les chiffres qui suivent `marque/` dans un agent utilisateur, ou ''. */
function versionApres(ua, marque) {
  const i = ua.indexOf(`${marque}/`);
  if (i === -1) return '';
  let j = i + marque.length + 1;
  let out = '';
  while (j < ua.length && ua[j] >= '0' && ua[j] <= '9') out += ua[j++];
  return out;
}

/** Les chiffres qui suivent `marque ` (espace), ou ''. */
function versionApresEspace(ua, marque) {
  const i = ua.indexOf(`${marque} `);
  if (i === -1) return '';
  let j = i + marque.length + 1;
  let out = '';
  while (j < ua.length && ua[j] >= '0' && ua[j] <= '9') out += ua[j++];
  return out;
}

// L'ordre compte : chaque navigateur se déguise en ceux qui le précèdent
// (Edge et Opera annoncent Chrome, Chrome annonce Safari).
const NAVIGATEURS = [
  ['Edg', 'Edge'],
  ['EdgiOS', 'Edge'],
  ['OPR', 'Opera'],
  ['SamsungBrowser', 'Samsung Internet'],
  ['Firefox', 'Firefox'],
  ['FxiOS', 'Firefox'],
  ['CriOS', 'Chrome'],
  ['Chrome', 'Chrome'],
];

/**
 * L'environnement en une ligne lisible : « Chrome 140, Windows, ordinateur »,
 * « Safari 17, iOS 17, téléphone, installée ». C'est le champ `environnement`
 * du gabarit, que personne ne remplit correctement de mémoire.
 *
 * @param {{ userAgent?: string, navigator?: Navigator | null, window?: Window | null }} [options]
 */
export function describeEnvironment(options = {}) {
  const nav =
    options.navigator === undefined ? globalThis.navigator : options.navigator;
  const win = options.window === undefined ? globalThis.window : options.window;
  const ua = String(options.userAgent ?? nav?.userAgent ?? '');
  if (!ua) return '';

  let navigateur = '';
  for (const [marque, nom] of NAVIGATEURS) {
    const v = versionApres(ua, marque);
    if (v) {
      navigateur = `${nom} ${v}`;
      break;
    }
  }
  if (!navigateur && ua.includes('Safari/')) {
    const v = versionApres(ua, 'Version');
    navigateur = v ? `Safari ${v}` : 'Safari';
  }

  let systeme = '';
  if (ua.includes('Android')) {
    const v = versionApresEspace(ua, 'Android');
    systeme = v ? `Android ${v}` : 'Android';
  } else if (
    ua.includes('iPhone') ||
    ua.includes('iPad') ||
    ua.includes('iPod')
  ) {
    // « iPhone OS 17_5 » : la majeure suffit, le reste est du bruit.
    const v = versionApresEspace(ua, 'OS');
    systeme = v ? `iOS ${v}` : 'iOS';
  } else if (ua.includes('CrOS')) systeme = 'ChromeOS';
  else if (ua.includes('Windows')) systeme = 'Windows';
  else if (ua.includes('Mac OS X')) systeme = 'macOS';
  else if (ua.includes('Linux')) systeme = 'Linux';

  // Ni navigateur ni système reconnus (un agent Node, un robot) : rien à dire
  // vaut mieux qu'un « ordinateur » qui ferait croire à une information.
  if (!navigateur && !systeme) return '';

  let appareil = 'ordinateur';
  if (ua.includes('iPad') || ua.includes('Tablet')) appareil = 'tablette';
  else if (ua.includes('Mobi') || ua.includes('iPhone')) appareil = 'téléphone';

  let installee;
  try {
    installee =
      win?.matchMedia?.('(display-mode: standalone)')?.matches === true ||
      nav?.standalone === true;
  } catch {
    installee = false;
  }

  const parts = [navigateur, systeme, appareil].filter(Boolean);
  if (installee) parts.push('installée');
  return parts.join(', ');
}

/**
 * L'écran courant, tel que l'utilisateur le voit dans la barre d'adresse :
 * chemin, requête et fragment — une app en `#` route dans le fragment.
 *
 * @param {Window | null} [win]
 */
export function currentRoute(win) {
  const w = win === undefined ? globalThis.window : win;
  const loc = w?.location;
  if (!loc) return '';
  return `${loc.pathname ?? ''}${loc.search ?? ''}${loc.hash ?? ''}`;
}

/**
 * Le champ `version` du gabarit : « v1.2.0 (abc1234), compilée le
 * 2026-09-06 ». Le commit court est ce qui distingue deux déploiements de
 * la même version ; la date dit si le rapport porte sur un build récent.
 *
 * @param {{ version?: unknown, commit?: string, buildTime?: string }} [info]
 */
export function versionLine(info = {}) {
  const brute = typeof info.version === 'string' ? info.version.trim() : '';
  const v = formatVersion(info.version) || brute;
  const commit =
    typeof info.commit === 'string' ? info.commit.trim().slice(0, 7) : '';
  const date =
    typeof info.buildTime === 'string' && info.buildTime.length >= 10
      ? info.buildTime.slice(0, 10)
      : '';
  let out = v;
  if (commit) out = out ? `${out} (${commit})` : commit;
  if (date) out = out ? `${out}, compilée le ${date}` : `compilée le ${date}`;
  return out;
}

/**
 * L'URL de `issues/new`, gabarit et champs préremplis.
 *
 * `fields` accepte tout identifiant du gabarit (`reproduire`,
 * `attendu-obtenu`, `journal`…) ; une valeur vide est omise, GitHub montrant
 * alors le texte d'aide du champ.
 *
 * @param {{ repoUrl?: string, template?: string, title?: string,
 *   version?: unknown, commit?: string, buildTime?: string, route?: string,
 *   environment?: string, fields?: Record<string, string | number | undefined> }} [options]
 */
export function issueReportUrl(options = {}) {
  const {
    repoUrl,
    template = ISSUE_TEMPLATE,
    title,
    version,
    commit,
    buildTime,
    route,
    environment,
    fields = {},
  } = options;
  if (!repoUrl) return '';
  let base = String(repoUrl).trim();
  while (base.endsWith('/')) base = base.slice(0, -1);

  const params = new URLSearchParams();
  params.set('template', template);
  if (title) params.set('title', title);
  const v = versionLine({ version, commit, buildTime });
  if (v) params.set('version', v);
  const env = [environment, route ? `écran ${route}` : '']
    .filter(Boolean)
    .join(' — ');
  if (env) params.set('environnement', env);
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  return `${base}/issues/new?${params.toString()}`;
}

/**
 * La même URL, remplie avec ce que la page sait à l'instant de l'appel :
 * le build injecté par `vite-version`, l'écran courant, l'environnement.
 * À appeler AU CLIC, pas au rendu — la route change sans que le pied de page
 * ne se rende à nouveau.
 *
 * @param {{ repoUrl?: string, template?: string, title?: string,
 *   fields?: Record<string, string | number | undefined> }} [options]
 */
export function currentIssueReportUrl(options = {}) {
  const info = readBuildInfo();
  return issueReportUrl({
    ...options,
    version: info.version,
    commit: info.commit,
    buildTime: info.buildTime,
    route: currentRoute(),
    environment: describeEnvironment(),
  });
}

/**
 * « Proposer une idée » : `issues/new` sur le gabarit `feature.yml`, sans
 * version ni environnement — une idée ne dépend pas du build qui tourne, et
 * le gabarit n'a pas de champ pour les recevoir. `''` sans dépôt.
 *
 * @param {{ repoUrl?: string, title?: string }} [options]
 */
export function featureRequestUrl(options = {}) {
  return issueReportUrl({
    repoUrl: options.repoUrl,
    template: FEATURE_TEMPLATE,
    title: options.title,
  });
}

/*
 * ── LE SIGNALEMENT SANS COMPTE GITHUB ──────────────────────────────────────
 *
 * `issues/new` exige un compte GitHub. Au relevé du 07/11/2026, sur tout le
 * compte, AUCUNE issue n'avait été écrite par un utilisateur des
 * applications : leurs publics — médecins, trésoriers d'association, parents —
 * n'en ont pas, et le lien « Signaler un problème » s'arrêtait pour eux à une
 * page de connexion.
 *
 * La voie de repli est le courrier : un `mailto:` prérempli avec le MÊME
 * contexte (application, version, écran, navigateur), adressé au contact que
 * le dépôt déclare déjà pour le panneau de confidentialité,
 * `VITE_PRIVACY_CONTACT`. Le client de messagerie de l'utilisateur l'ouvre,
 * il relit et envoie : rien ne part sans lui, et aucun service tiers n'entre
 * dans la page.
 */

/**
 * L'adresse e-mail d'un contact, ou `''`.
 *
 * `VITE_PRIVACY_CONTACT` est une adresse au relevé du 07/11/2026, mais rien ne
 * l'impose : une URL de formulaire, un nom, une adresse postale y seraient
 * légitimes pour le panneau de confidentialité. Un `mailto:` vers autre chose
 * qu'une adresse ouvrirait un brouillon sans destinataire — le lien se tait
 * plutôt. `mailto:` en tête est accepté et retiré.
 *
 * @param {unknown} contact
 */
export function emailAddress(contact) {
  if (typeof contact !== 'string') return '';
  let adresse = contact.trim();
  if (adresse.toLowerCase().startsWith('mailto:')) adresse = adresse.slice(7);
  // Une seule arobase, un domaine à point, rien qui sépare deux adresses ni
  // n'ouvre des paramètres : `?`, `&`, `,`, `;`, espaces et chevrons sont exclus.
  return /^[^\s@<>()[\]",;:?&/\\]+@[^\s@<>()[\]",;:?&/\\]+\.[^\s@<>()[\]",;:?&/\\]+$/.test(
    adresse
  )
    ? adresse
    : '';
}

/**
 * Le `mailto:` d'un signalement, avec le contexte que le gabarit d'anomalie
 * recevrait : application, version (`versionLine`), environnement et écran.
 * `''` sans adresse valide (`emailAddress`).
 *
 * Le corps commence par `intro` — la consigne, dans la langue de l'app —
 * suivie de lignes vides où écrire, puis du contexte sous un séparateur. Le
 * contexte reste en français, comme le champ `environnement` du gabarit : il
 * s'adresse à qui lit le rapport, pas à qui l'écrit. Fins de ligne en CRLF et
 * encodage `encodeURIComponent`, comme le veut la RFC 6068 : un `+` y serait
 * lu littéralement par la plupart des clients.
 *
 * @param {{ to?: string, app?: string, subject?: string, intro?: string,
 *   version?: unknown, commit?: string, buildTime?: string, route?: string,
 *   environment?: string }} [options]
 */
export function issueReportMailto(options = {}) {
  const adresse = emailAddress(options.to);
  if (!adresse) return '';
  const app = typeof options.app === 'string' ? options.app.trim() : '';
  const subject =
    options.subject || (app ? `Signalement : ${app}` : 'Signalement');
  const intro =
    options.intro ??
    'Décrivez ce qui était attendu, ce qui arrive, et comment le reproduire :';
  const v = versionLine(options);
  const contexte = [
    app ? `Application : ${app}` : '',
    v ? `Version : ${v}` : '',
    options.environment ? `Environnement : ${options.environment}` : '',
    options.route ? `Écran : ${options.route}` : '',
  ].filter(Boolean);
  // Deux lignes vides après la consigne : c'est là que le curseur attend.
  const corps = [
    intro,
    '',
    '',
    ...(contexte.length ? ['—', ...contexte] : []),
  ].join('\r\n');
  return (
    `mailto:${encodeURIComponent(adresse).replace('%40', '@')}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(corps)}`
  );
}

/**
 * Le même `mailto:`, rempli à l'instant de l'appel — build injecté par
 * `vite-version`, écran courant, environnement. À appeler AU CLIC, comme
 * `currentIssueReportUrl`.
 *
 * @param {{ to?: string, app?: string, subject?: string, intro?: string }} [options]
 */
export function currentIssueReportMailto(options = {}) {
  const info = readBuildInfo();
  return issueReportMailto({
    ...options,
    version: info.version,
    commit: info.commit,
    buildTime: info.buildTime,
    route: currentRoute(),
    environment: describeEnvironment(),
  });
}
