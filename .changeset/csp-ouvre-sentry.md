---
'@mister-guiiug/dev-pwa-config': patch
---

`cspPlugin` ouvre `connect-src` à l'hôte du DSN Sentry

**Les vingt sites du parc embarquaient un DSN et aucun n'autorisait Sentry.**
Relevé le 19/09/2026 sur les CSP RÉELLEMENT servies : `connect-src` ne nomme
`sentry.io` nulle part, alors que `VITE_SENTRY_DSN` est posé en variable sur
chaque dépôt et que l'hôte d'ingestion se lit dans le bundle livré. Chaque
enveloppe d'erreur partait dans le vide :

```
Content-Security-Policy : … a empêché le chargement d'une ressource
(connect-src) à l'adresse https://oXXX.ingest.de.sentry.io/api/…/envelope/
```

Le parc croyait avoir une remontée d'erreurs. Il n'en avait aucune.

**Pas d'option à poser, et c'est voulu.** Une case à cocher de plus, c'est
vingt applications à modifier et une à oublier. Le DSN EST la déclaration : le
greffon lit `VITE_SENTRY_DSN` dans la configuration que Vite a déjà résolue et
ajoute **l'origine exacte** qu'il y trouve. Sans DSN — fork, développement, app
sans observabilité — rien n'est ajouté ; avec un DSN illisible, rien non plus,
et le build ne casse pas.

**L'origine, jamais un joker** : `https://*.ingest.de.sentry.io` ouvrirait la
politique aux projets de tous les autres comptes hébergés là. Ni la clé
publique du DSN ni le numéro de projet ne se retrouvent dans la politique —
deux assertions le tiennent.

Vérifié par un vrai build Vite, et pas seulement en test :

```
connect-src 'self' https://eu.i.posthog.com https://eu-assets.i.posthog.com https://o42.ingest.de.sentry.io
```
