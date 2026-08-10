/*
 * Captures d'écran réelles des applications, pour la section « Démo ».
 *
 * Par défaut : AUCUNE. La galerie affiche alors un aperçu GÉNÉRÉ — les
 * composants du paquet peints avec la palette réelle de l'app. C'est honnête
 * (le design system dans son univers) mais ce n'est pas l'écran de l'app.
 *
 * Pour ajouter une vraie capture :
 *   1. déposer le fichier dans `showroom/screenshots/<id>.webp`
 *      (format portrait ~9/19.5, largeur 540 px suffit — c'est un aperçu ;
 *      préférer WebP, une capture PNG pleine résolution pèse dix fois plus) ;
 *   2. ajouter son id ci-dessous.
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
