/**
 * Les données de RÉFÉRENCEMENT des apps du catalogue — lues au BUILD, jamais
 * à l'exécution.
 *
 * `languages` et `features` sont RELEVÉS le 29/09/2026, dépôt par dépôt, et
 * nourrissent le `WebApplication` de chaque accueil (`inLanguage`,
 * `featureList`) :
 *   - `languages` : les langues de l'INTERFACE, lues dans l'i18n de l'app —
 *     un dictionnaire réel ET une façon de le choisir (sélecteur ou
 *     `navigator.language`). Le français d'abord. Les cinq langues de
 *     `miss-contraction` au-delà de fr/en ne couvrent qu'un cinquième des
 *     clés : elles ne comptent pas ;
 *   - `features` : trois à six fonctions RÉELLES, lues dans le README et
 *     vérifiées dans le code — rien de prévu, rien de promotionnel, et aucune
 *     note : l'absence voulue d'`aggregateRating` tient toujours.
 *
 * HORS DE `apps-catalog.js`, ET C'EST TOUT L'INTÉRÊT DE CE MODULE. Le
 * catalogue est lu à l'EXÉCUTION (`FamilyApps`, `sponsor`) : tout ce qu'il
 * porte part dans le bundle de chaque app. Posées dans ses fiches par la
 * 6.19.0, ces listes y ont ajouté 4 kB gzip (9,96 → 13,95 kB pour le seul
 * module) — mesuré le 29/09/2026 sur miss-supaboss, dont le chemin critique
 * est passé de 199,9 à 203,4 kB et a crevé son budget. Seul
 * `vite-pwa-base.js` importe ce module ; `test/apps-seo.test.mjs` garde
 * qu'aucun module d'exécution ne le fasse.
 */

/** @param {import('./apps-seo').AppSeo} s */
const gele = s =>
  Object.freeze({
    languages: Object.freeze([...s.languages]),
    features: Object.freeze([...s.features]),
  });

/** @type {Readonly<Record<string, import('./apps-seo').AppSeo>>} */
export const APP_SEO = Object.freeze(
  Object.fromEntries(
    Object.entries({
      'miss-carbook': {
        languages: ['fr', 'en'],
        features: [
          'Dossiers partagés, rejoints par code ou par lien',
          'Exigences communes classées par importance',
          'Fiches de modèles avec photos et commentaires',
          'Comparaison des modèles, export JSON ou CSV',
          "Journal d'activité du dossier",
          "Sauvegarde et import d'un dossier en archive ZIP",
        ],
      },
      'miss-contraction': {
        languages: ['fr', 'en'],
        features: [
          'Chronomètre de contractions avec durée et intervalle',
          'Alertes par seuils personnalisables et pré-alerte',
          'Tableau détaillé des contractions, modifiable',
          'Message pré-rempli pour la maternité (SMS, WhatsApp)',
          'Fiche maternité avec appel en un geste',
          "Sauvegarde JSON de l'historique et des réglages",
        ],
      },
      'miss-genius': {
        languages: ['fr', 'en'],
        features: [
          'Matières et notes avec coefficients',
          'Calcul de la moyenne générale pondérée',
          "Simulation de l'effet d'une note future",
          'Note à viser pour atteindre un objectif',
          "Scénarios d'hypothèses comparés entre eux",
          'Notes rangées par trimestre, semestre ou année',
        ],
      },
      'miss-uwh': {
        languages: ['fr', 'en'],
        features: [
          'Journal comptable avec solde recalculé en direct',
          'Bilan de saison automatique par catégorie',
          'Résultat net par événement du club',
          'Clôture de saison et report du reliquat',
          'Exports CSV, Excel multi-feuilles et bilan PDF',
          'Registre des adhérents et suivi des cotisations',
        ],
      },
      'mister-cim10': {
        languages: ['fr', 'en'],
        features: [
          'Suggestions de codes CIM-10 depuis un compte rendu',
          'Recherche de code par libellé, synonyme ou code',
          'Contrôle et remise en forme des codes saisis',
          'Favoris pour ajouter un code en un geste',
          'Export TXT, CSV ou JSON et impression',
          'Dictée vocale du compte rendu',
        ],
      },
      'mister-footcoach': {
        languages: ['fr', 'en'],
        features: [
          'Équipes et fiches joueurs',
          'Feuille de présences : présent, absent, excusé',
          'Mode live de match : chrono, score et événements',
          'Compositions par formation de foot à 8 et par poste',
          "Statistiques d'équipe, buteurs et taux de présence",
          'Export PDF de la feuille de match et des présences',
        ],
      },
      'mister-puzzle': {
        languages: ['fr', 'en'],
        features: [
          'Salle partagée par un code, sans inscription',
          'Compteur de pièces synchronisé en temps réel',
          'Courbe de progression, historique exportable en CSV ou JSON',
          'Galerie photos à réordonner et faire pivoter',
          'Checkpoints pour marquer les étapes du puzzle',
          'Classement des contributeurs sur 24 h, 7 jours ou total',
        ],
      },
      'miss-ticket-pwa': {
        languages: ['fr', 'en'],
        features: [
          "Jumelage d'un poste desktop par scan de QR code",
          'Suivi en temps réel des postes et de leurs sessions',
          "Arrêt à distance d'une session ou de toutes",
          'Historique local des sessions terminées',
        ],
      },
      'mister-doc': {
        languages: ['fr', 'en'],
        features: [
          'Planning mensuel des gardes, groupé par semaine ISO',
          'Bourse aux gardes : proposer, accepter ou décliner',
          'Compteurs week-end, heures totales et HNC par médecin',
          'Congés, formations et vœux de disponibilité',
          'Export des compteurs en CSV, Excel et PDF',
          'Abonnement calendrier iCalendar (.ics) des gardes',
        ],
      },
      'miss-lookhouse': {
        languages: ['fr'],
        features: [
          'Recherches surveillées par rayon ou zone dessinée',
          "Import d'annonces par URL, JSON ou bookmarklet",
          'Détection des doublons et des annonces republiées',
          'Historique des prix et détection des baisses',
          'Carte des annonces sur OpenStreetMap',
          'Prix de référence DVF au m² sur la fiche annonce',
        ],
      },
      'miss-badminton': {
        languages: ['fr', 'en', 'es'],
        features: [
          'Compteur de points au toucher, en simple ou en double',
          'Règles réglables : sets, points, plafond, limite de temps',
          'Balles de set et de match, changement de côté signalé',
          'Chronomètre de match et partage du résultat',
          'Historique avec classement, face-à-face et activité',
          "Export et import de l'historique en JSON",
        ],
      },
      'miss-dice': {
        languages: ['fr', 'en', 'es', 'de', 'it', 'pt'],
        features: [
          'Lanceur de 1 à 6 dés, du D4 au D20',
          'Yahtzee, 421 et Cochon, de 1 à 8 joueurs',
          'Lancer en notation JDR (2d6+3, 4d6kh3, dés Fudge)',
          'Écran Décider : pile ou face, oui/non, tirage au sort',
          'Statistiques et historique des lancers, export CSV',
          "Reprise d'une partie sur un autre appareil, par lien ou QR",
        ],
      },
      'miss-supaboss': {
        languages: ['fr', 'en'],
        features: [
          'Inventaire consolidé des projets de plusieurs comptes',
          'Pause et restauration de projets à la demande',
          'Garde-fou de la limite de 2 projets actifs par compte',
          'Suivi des quotas Free Plan : egress, base, MAU, stockage',
          'Préparation de démo guidée en 5 étapes',
          "Journal d'audit des actions sur les projets",
        ],
      },
      'miss-supatool': {
        languages: ['fr'],
        features: [
          'Création du projet Supabase cible depuis le navigateur',
          'Comparaison des schémas et ordre de copie des tables',
          'Copie de la structure : tables, index, vues, RLS, droits',
          'Copie des lignes et des fichiers Storage',
          'Mode simulation avant toute écriture dans la cible',
          'Rapport JSON et remise à niveau des séquences',
        ],
      },
      'mister-molkky': {
        languages: ['fr', 'en'],
        features: [
          'Saisie des quilles tombées, score calculé',
          'Variantes classique, inversée, libre et mode équipes',
          'Partie en direct suivie par QR code ou code à 6 caractères',
          'Statistiques par joueur, face-à-face et succès',
          'Historique des parties avec replay animé',
          'Mode entraînement solo sur une quille cible',
        ],
      },
      'mister-qowa': {
        languages: ['fr', 'en', 'es', 'de', 'it'],
        features: [
          'Parties en direct rejointes avec un code PIN',
          'Questions chronométrées : QCM, vrai/faux, libre, sondage',
          'Score combinant justesse et rapidité de réponse',
          'Classement en direct puis podium final',
          'Génération de quiz par IA (Gemini ou Anthropic)',
          'Historique des parties animées',
        ],
      },
      'mister-family-map': {
        languages: ['fr'],
        features: [
          'Carte des lieux avec regroupement des marqueurs',
          'Filtres familiaux : âge, poussette, toilettes, météo',
          "Agenda d'événements exportable en iCalendar (.ics)",
          'Ajout de lieu guidé, avec contrôle des doublons',
          'Favoris consultables hors ligne',
          'Export JSON de toutes ses contributions',
        ],
      },
      'mister-miss-koh': {
        languages: ['fr'],
        features: [
          'Anti-spoiler réglé sur le dernier épisode vu',
          'Suivi des épisodes vus, cochés en cascade',
          'Candidats regroupés par duo ou par tribu',
          'Détail des conseils : voix par candidat et bulletins',
          'Notes personnelles partageables par lien révocable',
          "Portraits personnels gardés sur l'appareil, export ZIP",
        ],
      },
      'mister-quota': {
        languages: ['fr'],
        features: [
          'Suivi de la consommation de plusieurs comptes IA',
          'Avance ou retard sur la consommation idéale',
          'Collecte automatique via les API Claude et Cursor',
          'Saisie manuelle et import CSV de relevés',
          'Alertes de seuil par notification système',
          'Sauvegarde JSON restaurable et export CSV',
        ],
      },
      'mister-settle': {
        languages: ['fr', 'en'],
        features: [
          'Espaces avec personnes sans compte et regroupements',
          'Répartition équitable, par montants ou par parts',
          'Soldes et remboursements suggérés',
          'Justificatifs photo réencodés sans métadonnées',
          'Statistiques et exports CSV ou XLSX',
          'Invitations par lien avec rôle, révocables',
        ],
      },
      'miss-devises': {
        languages: ['fr', 'en'],
        features: [
          'Conversion euro et devise dans les deux sens, à chaque chiffre',
          'Billets et pièces de 41 devises dessinés, avec leur valeur en euros',
          'Montant décomposé en coupures, ou composé en les touchant',
          'Historique sur 1 mois, 6 mois ou 1 an, montant saisi comparé',
          'Carnet de conversions annotées, exportable en fichier',
          'Taux de la BCE ou de marché, hors ligne avec le dernier connu',
        ],
      },
    }).map(([id, s]) => [id, gele(s)])
  )
);

/**
 * Les langues et les fonctions d'une app du catalogue, ou `undefined` pour
 * une app hors catalogue.
 *
 * @param {string} id
 */
export function appSeo(id) {
  return Object.hasOwn(APP_SEO, id) ? APP_SEO[id] : undefined;
}
