---
'@mister-guiiug/dev-pwa-config': minor
---

`AnimationEvent` rétabli dans `vitest-setup`, et quatre plafonds levés.

**Le correctif.** jsdom 30 n'expose plus `window.AnimationEvent` — `TransitionEvent`,
lui, est resté. React choisit le nom de l'événement d'animation d'après la
présence de ce constructeur : sans lui, il écoute la variante préfixée et
n'entend jamais `animationend`. **Rien ne lève** : `onAnimationEnd` cesse
simplement de se déclencher, tandis qu'un `addEventListener` natif continue de
recevoir — ce qui achève de brouiller la piste. Constaté en montant
`mister-miss-koh` de jsdom 26 à 30 : son bouton « favori » gardait son
`data-pop`, et le test échouait à trois lignes de la vraie cause.
`vitest-setup` pose désormais le constructeur quand il manque, là où
`matchMedia`, `ResizeObserver` et `crypto.randomUUID` le sont déjà.

**Quatre peers élargies, chacune sur une vérification et non sur une intention :**

- `@testing-library/jest-dom` : `^6.0.0` → `^6.0.0 || ^7.0.0`. Ce dépôt tourne
  lui-même en 7.0.1 avec sa suite verte ; il interdisait aux apps ce qu'il
  pratique.
- `web-vitals` : `^4.2.0` → `^4.2.0 || ^5.0.0 || ^6.0.0`. Installée pour de bon,
  la 6.0.0 expose bien les cinq fonctions que `web-vitals.js` cherche
  (`onCLS`, `onINP`, `onLCP`, `onTTFB`, `onFCP`) ; `onFID`, retiré en v5, est
  déjà sauté sans lever par le module.
- `@commitlint/cli` et `@commitlint/config-conventional` : `^19.0.0` →
  `^19.0.0 || ^20.0.0 || ^21.0.0`. La 21.0.0 exécutée contre
  `commitlint-base.js` accepte un sujet conventionnel et refuse bien les deux
  règles que le socle ajoute (`type-enum`, `subject-case`).

Ces quatre-là ne bloquaient rien — ce sont des peers **optionnelles** —, mais
une plage qui ment finit par être crue.

**`plafonds.mjs` distingue enfin ce qui bloque de ce qui gêne.** Il signalait
sept plafonds sans dire lesquels mordent, alors que ce dépôt déclare trente-deux
peers dont vingt-deux optionnelles : un conflit sur une peer optionnelle ne fait
pas échouer `npm install`, un conflit sur une peer dure oui (`ERESOLVE`). La
colonne « Mord ? » le dit, et `DECISIONS` porte les plafonds tenus volontairement
— `typescript` (TS 7 est un chantier à part), `vitest` et `@vitest/browser` (la 4
vient d'être adoptée) — avec leur raison et leur date : ils sortent du tableau
d'action, ne posent plus d'annotation et ne rougissent plus `--strict`. Le relevé
du socle affiche maintenant **zéro plafond à trancher**.
