---
'@mister-guiiug/dev-wpa-config': minor
---

Deux défauts que la migration `sw-update` de six apps a fait tomber. Tous deux
rendaient MUET quelque chose qui devait parler.

**Le mode `autoUpdate` n'avait aucune histoire — trois apps sur dix-sept y
sont.** `vite-plugin-pwa` se coupe en deux sur `registerType` : la branche
`prompt` est le **seul** appelant d'`onNeedRefresh`, la branche `auto` n'appelle
qu'`onNeedReload`. `connect()` ne passait pas ce dernier, si bien qu'en
`autoUpdate` le bandeau du paquet ne pouvait **jamais** s'allumer : une app qui
adoptait `UpdatePromptBanner` y posait un composant invisible.

Le fournir change en outre ce que fait le plugin — sa documentation dit « useful
to fully control the reload flow » : sans rappel il recharge seul, avec il rend
la main. C'est le seul moyen de différer un rechargement qui tomberait au
mauvais moment ; `miss-contraction`, qu'on utilise pendant un accouchement, est
exactement dans ce cas. Le relais reste **optionnel** (`?.`), sans quoi le
simple fait de passer par ce paquet désactiverait le rechargement automatique
pour tout le monde — c'est ce que le second test verrouille.

**Le double de test muet écrasait le pilotable.** `vitest-setup` posait un
`vi.mock('virtual:pwa-register')` inconditionnel, résolu **à travers** le
`resolve.alias` que la documentation de `testing/pwa-register` prescrit : les
deux désignaient le même module, et le muet gagnait. Une app qui suivait la doc
à la lettre obtenait donc `No "swStub" export is defined on the
"virtual:pwa-register" mock`, puis retombait sur le faux témoin que ce double
existe pour supprimer. Relevé par `mister-molkky` (#18), qui a dû ajouter un
`vi.unmock` dans chaque fichier de test.

La fabrique tente désormais le module réel d'abord : s'il se résout, c'est qu'un
alias le désigne et on le rend tel quel ; sinon on retombe sur le muet, qui
reste le bon défaut pour une app qui ne teste pas son bandeau. **Vérifié de bout
en bout** sur la suite de `mister-molkky` — ses quatre tests passent sans le
`vi.unmock`, et échouent sur le message d'origine dès qu'on remet l'ancienne
version.
