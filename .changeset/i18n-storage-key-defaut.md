---
'@mister-guiiug/dev-wpa-config': minor
---

`createI18n` : `storageKey` devient optionnel (défaut `'dwc_locale'`).

Le constat vient de deux copies locales du module (mister-cim10, miss-ticket-pwa) : trois lignes d'écart, dont la seule réelle est la clé localStorage. Une clé obligatoire n'était donc pas une protection, c'était le dernier prétexte à copier.

Le défaut suit la convention des clés du paquet (`dwc_theme`, `dwc_app_version`, `dwc_error_log`). Les apps de la famille partagent une même origine GitHub Pages, donc un même `localStorage` : sous la clé partagée, la langue choisie suit l'utilisateur d'une app à l'autre — et une valeur étrangère aux `locales` de l'app est ignorée, comme avant. Pour isoler une app, ou pour reprendre une copie locale **sans perdre le choix déjà stocké**, on passe sa clé (motif famille : `'<app>_locale'`) ; c'est documenté dans le type et le JSDoc.

Aucune rupture : `storageKey` était requis par le type, les huit apps déjà sur le module le passent donc toutes explicitement, et le défaut ne joue qu'en son absence. Un test le verrouille : la clé par défaut est lue au démarrage et écrite au changement de langue.
