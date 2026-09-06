---
'@mister-guiiug/dev-pwa-config': minor
---

**Le bandeau d'installation ne s'affichait jamais sur iPhone, et un « Plus
tard » valait pour toujours.**

Deux défauts d'un même module, mesurés sur les vingt PWA du parc.

**1. `beforeinstallprompt` n'existe pas sur iOS ni sur Safari.** Le bandeau
n'ayant que cet événement pour se déclencher, il était du code mort sur
l'appareil où l'on installe le plus. `miss-dice` l'avait écrit noir sur blanc
dans son propre code — « sur les navigateurs sans cet événement (Firefox, iOS),
`canInstall` reste faux et l'UI ne s'affiche pas » — sans pouvoir y remédier,
puisque la réponse était dans le paquet. Sur les six apps qui montaient un
bandeau, **une seule** (`mister-doc`) avait écrit le repli en instructions.

**2. Le refus était définitif.** Un `'1'` dans `localStorage`, et plus personne
ne reparlait d'installation — alors que le bouton dit « Plus tard ». Les cinq
copies locales avaient exactement le même défaut.

## Ce qui entre

Un sous-chemin **`/install`**, sans React : « est-elle déjà installée ? »,
« installable comment ici ? », « faut-il proposer maintenant ? ». La règle vit
là plutôt que dans le hook parce qu'une décision enfermée dans un `useEffect`
ne se teste qu'avec un DOM et une horloge, et que celle-ci se teste avec ni
l'un ni l'autre.

**La cadence, par défaut** : au premier lancement, puis tous les 30 jours,
3 fois en tout, et plus rien. Réglable (`snoozeDays`, `maxPrompts`,
`minVisits`), ou désactivable — `cadence={false}` pour un écran de réglages, où
l'utilisateur est venu chercher l'installation et où un quota n'aurait pas de
sens.

**Un affichage arme le report**, pas seulement le clic sur « Plus tard ». Le
cas fréquent n'est pas le clic, c'est l'onglet fermé sans rien toucher : si
seul le clic reportait, cet utilisateur-là reverrait le bandeau à chaque
chargement jusqu'à épuisement du quota. C'est la différence entre « de temps en
temps » et « tout le temps ».

**Les instructions, en sept langues** (`install.howIos`, `howSafari`,
`howGeneric`). Elles remplacent la description : là où rien n'installe tout
seul, la marche à suivre EST le contenu utile, et `components.css` lui rend
l'encre du texte courant — du gris atténué sur un aplat `primary-soft` est
précisément la composition que le relevé de contraste du 06/09 a trouvée sous
AA, et ici elle porterait la seule information de la carte.

**Détection élargie.** `installed` reconnaissait le seul `standalone` ; il
reconnaît les quatre modes d'affichage installés — un jeu en `fullscreen`, une
app de bureau en `window-controls-overlay` se voyaient proposer une
installation qu'elles avaient déjà. S'y ajoute `getInstalledRelatedApps()`,
seul signal qui distingue « pas installée » de « installée, mais consultée dans
un onglet » ; il ne sert qu'à confirmer, jamais à infirmer.

**On ne devine jamais.** Chromium se tait : son événement viendra ou ne viendra
pas, et afficher un tutoriel à qui aura une vraie invite une seconde plus tard
serait pire que rien. Les navigateurs intégrés à une autre application
(Facebook, Instagram…) n'installent pas : leur montrer « ouvrez le menu » est
une consigne inapplicable, donc on se tait aussi.

## Compatibilité

`canInstall`, `installed` et `promptInstall` gardent leur sens exact : une app
qui ne lit qu'eux ne voit aucune différence. Un refus écrit avant cette version
est **migré en report d'une période**, pas en silence définitif — le bouton qui
l'avait écrit disait « Plus tard », et le traduire en « jamais » trahirait ce
que l'utilisateur a lu ; le traduire en « tout de suite » lui reproposerait dès
la première visite après la mise à jour. Une app qui avait personnalisé
`dismissKey` garde le bénéfice du sien.

Corrige aussi une dérive du typage : `labels.footer.issues` existait dans le
dictionnaire depuis la 4.5.0 mais manquait au `.d.ts`, donc ne compilait pas
chez les consommateurs.
