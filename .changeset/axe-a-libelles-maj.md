---
'@mister-guiiug/dev-wpa-config': minor
---

Trois composants promus, la mise à jour rationalisée, et un dictionnaire fr/en.

**Trois composants que sept apps avaient déjà écrits chacune de leur côté.**
`ConfirmDialog` existe dans sept apps sur seize, en sept fichiers différents —
trois disent explicitement remplacer `window.confirm`. Elles se contredisent sur
le point le plus lourd : mister-quota met `autoFocus` sur le bouton de
CONFIRMATION, si bien qu'une frappe sur Entrée supprime, quand mister-doc et
mister-qowa documentent le choix inverse. C'est celui-ci qui est repris. S'y
ajoutent le rôle `alertdialog` (deux copies sur sept), un nom accessible (le
`role="dialog"` de mister-quota était posé sur le fond, sans étiquette), et
`loading` — miss-uwh enchaînait `onConfirm()` puis `onClose()`, ce qui interdit
toute confirmation asynchrone.

`Toast` : six piles maison, six durées, trois défauts communs. miss-supaboss et
mister-footcoach posent `aria-live` sur le conteneur ET `role="status"` sur
chaque message, qui est donc annoncé deux fois ; miss-carbook n'en affiche qu'un
à la fois, le précédent disparaissant sans avoir été lu ; mister-doc et
mister-footcoach ne nettoient jamais leurs `setTimeout`. La version promue monte
deux régions vivantes en permanence, borne la pile en faisant céder le plus
ancien, et suspend le compte à rebours au survol et au focus — ce qu'aucune des
six ne faisait.

`BottomNav` : sept apps, quatre défauts d'accessibilité. Trois `<nav>` sans nom ;
quatre onglets courants distingués par la seule couleur, invisible en contraste
forcé ; une pastille nommée par `aria-label` sur un `<span>`, donc muette
(miss-lookhouse) ; un bouton « Plus » sans `aria-expanded` (mister-footcoach,
alors que miss-contraction pose les deux). Le composant est agnostique de
routeur : `linkComponent` + `hrefProp`.

**La mise à jour cesse d'être un bouton mort.** Six apps portent un bouton
« Forcer la mise à jour », avec six mécaniques. `mister-molkky` documente le
symptôme : sans worker EN ATTENTE, `updateServiceWorker(true)` ne fait
strictement rien. miss-genius et miss-uwh, elles, postent `SKIP_WAITING` puis
rechargent dans la foulée — l'activation étant asynchrone, la page rechargée
peut encore être servie par l'ancien worker. Nouveau module `./sw-update`, sans
React ni module virtuel : il attend `controllerchange` avant de recharger, et
bascule sur la purge du Cache Storage quand aucun worker n'attend. Chaque appel
aux API service worker est plafonné (elles pendent sur iOS en mode autonome), et
une minuterie de secours recharge quoi qu'il arrive. `localStorage`,
`sessionStorage` et IndexedDB ne sont jamais touchés.

Conséquence : `useUpdatePrompt` reçoit `registerSW` en paramètre au lieu de
l'importer en dur. Les deux modules de mise à jour **rejoignent le barrel** et
sortent de la liste d'exclusion de la CI — il n'y reste qu'un module hors
contexte, contre trois. Nouveau `UpdateButton` pour l'écran de réglages, qui n'a
besoin de rien.

**Onze libellés sortent du code.** Ils étaient codés en dur en français dans six
composants, tous surchargeables par prop, mais sans aucun pont avec `createI18n`
que huit apps utilisent : chacune recâblait les mêmes chaînes à la main.
`LabelsProvider` / `useLabels` posent trois niveaux — la prop l'emporte, puis le
contexte, puis le français — de sorte qu'une app qui ne fait rien obtient
exactement ce qu'elle avait avant. Le contexte est séparé de `createI18n` à
dessein : celui-ci est isolé par app, le paquet ne peut pas le lire. Et `plural`,
sur `Intl.PluralRules`, remplace le ternaire `n > 1` qui donne « 0 éléments » en
français.

**Au passage.** Échap, piège de focus, restitution et verrou de scroll sortent de
`Sheet` dans un `use-dialog.js` interne, partagé avec `ConfirmDialog` — recopier
ces quatre-vingts lignes aurait été l'erreur que le paquet reproche aux apps. La
garde de `components.css` sur les bordures transparentes ne voyait pas les
raccourcis directionnels (`border-block-start`), elle les voit maintenant ; le
harnais de test n'exposait pas `location`, ce qui rendait `sw-update` intestable.
265 tests, contre 213 : 52 de plus, dont une bonne moitié reproduit un défaut
relevé dans une app nommée avant de vérifier qu'il est refermé.
