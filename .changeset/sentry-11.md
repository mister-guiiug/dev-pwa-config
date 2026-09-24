---
'@mister-guiiug/dev-pwa-config': minor
---

Pair `@sentry/react` : `^10.75.2 || ^11.0.0` — le socle accepte Sentry 11

**Ce qui pressait.** `@sentry/react` 11.0.0 est sorti le 23/09/2026, et Renovate
en ouvrira la montée dans les dix-huit dépôts qui le déclarent, au prochain
créneau de son calendrier. La pair `^10.75.2` ne l'aurait PAS empêchée : npm 11
ne refuse pas une pair optionnelle hors plage, il écrit `ERESOLVE overriding
peer dependency` et installe quand même (essayé sur miss-dice, sortie 0). Les
PR seraient donc passées au vert, avec un socle qui ne disait nulle part
supporter la version qu'on lui donnait. La plage le dit désormais.

**Ce qui a été vérifié, et pas supposé.** Le socle n'appelle que cinq
fonctions de Sentry (`react/observability.js`) : `init({ dsn, release,
environment, tracesSampleRate })`, `captureException(error, { extra })`,
`getClient`, `flush`, `close`. Compilées en `--strict` contre les types de
11.0.0, elles passent toutes. Les ruptures annoncées de la 11 pour
`@sentry/react` — fin de React 16, opérations `ui.*` pour les cycles de vie,
attribut `url.path.params` retiré — et pour `@sentry/browser` — fin de Safari 14
— ne touchent rien de cette surface.

**Pourquoi garder la 10.** Rien n'oblige un dépôt à monter le même jour ; la
plage double évite d'imposer l'ordre des PR.
