---
'@mister-guiiug/dev-pwa-config': minor
---

`issue-report` et `AppFooter` : signaler sans compte GitHub, et proposer une idée. `issues/new` exige un compte : au relevé du 07/11/2026, aucune issue du compte n'avait jamais été écrite par un utilisateur des applications, dont les publics (médecins, trésoriers, parents) n'en ont pas.

- `issue-report` exporte `issueReportMailto` / `currentIssueReportMailto` : un `mailto:` prérempli avec le même contexte que le gabarit d'anomalie (application, version et commit, environnement, écran), une consigne en tête et deux lignes pour écrire. `emailAddress` n'accepte qu'une adresse (`mailto:` retiré) : une URL ou un nom ne produisent aucun lien. `featureRequestUrl` et `FEATURE_TEMPLATE` visent le gabarit `feature.yml` du dépôt `.github` du compte.
- `AppFooter issues` ajoute « Signaler par e-mail » juste après « Signaler un problème », adressé à `VITE_PRIVACY_CONTACT` (lu comme `PrivacyNotice` le lit : la prop `contact` l'emporte, `null` retire le lien, `env` sert aux tests), puis « Proposer une idée » (`issues: { idea: false }` le retire ; jamais en double d'un signalement déjà pointé sur `feature.yml`). Le lien GitHub garde son libellé et sa place.
- Libellés dans les sept langues (`footer.issuesMail`, `footer.idea`, `footer.mailSubject`, `footer.mailIntro`) ; un dictionnaire d'app qui ne les a pas retombe sur le français. Deux rôles d'icône, `mail` et `idea` (`Mail` et `Lightbulb` chez lucide), et les marqueurs `footer-mail` / `footer-idea` habillés comme `footer-issues`.

Rien ne change pour une app sans `issues`. Une app avec `issues` gagne le lien d'idée ; le courrier en plus si son `VITE_PRIVACY_CONTACT` est une adresse — c'est le cas des dix-sept dépôts qui l'ont posé.

Migration : aucune pour les huit apps qui montent `AppFooter issues`. Celles qui composent leur propre lien avec `currentIssueReportUrl` (miss-badminton, miss-contraction, miss-dice, mister-puzzle) peuvent ajouter `currentIssueReportMailto({ to: import.meta.env.VITE_PRIVACY_CONTACT, app: '<id>' })` et `featureRequestUrl({ repoUrl })` à côté. Une app sous `lucideIconSet` peut passer `mail: Mail, idea: Lightbulb`.
