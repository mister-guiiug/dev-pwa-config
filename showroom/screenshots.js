/*
 * Captures d'écran réelles des applications, pour la section « Démo ».
 *
 * Par défaut : AUCUNE. La galerie affiche alors un aperçu GÉNÉRÉ — les
 * composants du paquet peints avec la palette réelle de l'app. C'est honnête
 * (le design system dans son univers) mais ce n'est pas l'écran de l'app.
 *
 * Pour ajouter de vraies captures :
 *   1. `npm run screenshots` (toutes) ou `npm run screenshots -- miss-dice` ;
 *      le script cadre, normalise et convertit en WebP — une capture prise à
 *      la main n'a ni le même gabarit ni la même langue que ses voisines, et
 *      chaque reprise produit alors un diff illisible ;
 *   2. coller les lignes qu'il affiche ci-dessous.
 *
 * Une capture déclarée ici est utilisée à DEUX endroits : en vignette sur la
 * carte de la vitrine, à la place du monogramme, et en grand dans la section
 * « Démo », à la place de l'aperçu généré.
 *
 * On ÉNUMÈRE au lieu de tenter le chargement puis de retomber sur l'erreur :
 * quinze requêtes 404 dans l'onglet réseau d'une page qui promet « aucune
 * requête réseau », ce serait mentir deux fois.
 *
 * Fichier volontairement SANS import/export : chargeable par un `<script src>`
 * classique ET importable par node:test.
 */
globalThis.SHOWROOM_SCREENSHOTS = {
  // 'miss-uwh': { file: 'miss-uwh.webp', alt: 'Écran Bilan de Miss UWH' },
};
