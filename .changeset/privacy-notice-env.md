---
'@mister-guiiug/dev-pwa-config': minor
---

`PrivacyNotice` se monte en une ligne : il lit seul les mentions que le dépôt pose en variables, et ne décrit que ce qui a lieu.

Relevé du 04/11/2026 : vingt et une applications montent `ConsentSection`, plusieurs passent déjà les quatre `VITE_PRIVACY_*` à leur build, et **aucune** ne montait ce panneau. La première à le faire (miss-contraction) a dû écrire vingt-cinq lignes : lire les variables, convertir la durée, vérifier la clé. Les recopier vingt fois aurait fait vingt copies d'une même logique.

- **Les mentions viennent de l'environnement** quand aucune prop ne les donne : `VITE_PRIVACY_CONTROLLER`, `VITE_PRIVACY_CONTACT`, `VITE_PRIVACY_RETENTION_MONTHS`, `VITE_PRIVACY_ERROR_BASIS` et `VITE_SENTRY_DSN`. Le socle lit l'environnement Vite du bundle lui-même, comme `createSupabaseClientFactory` depuis la 6.28.5 ; la prop `env` le remplace, et sert aux tests d'app (`env: import.meta.env`, sur lequel `vi.stubEnv` agit). Une prop l'emporte toujours sur la variable.
- **Une durée posée vide reste une mention manquante**, jamais « 0 mois » (`Number('')` vaut 0).
- **La mesure d'audience n'est décrite que si elle a lieu** : si `parsePosthogKey` accepte la clé (prop `posthogKey`, sinon `VITE_POSTHOG_KEY`), la règle même d'`initAnalytics`. Les rapports d'erreur suivent déjà la même règle avec le DSN. Sans l'un ni l'autre, le panneau ne rend rien. **Changement de comportement** : un panneau monté sans clé, qui décrivait jusqu'ici une mesure inexistante, ne la décrit plus.
- **La clé lue dans l'environnement n'arme pas la sortie** : seule une `posthogKey` passée en prop affiche `ConsentSettings`. Les apps qui montent `ConsentSection` à côté n'ont donc pas de second bouton.
- **`headingLevel` et `titleClassName`**, comme `ConsentSection` : un `h2` fixe, posé dans un écran de réglages aux sections en `h3`, devenait le frère du titre de l'écran.
- **Deux colonnes selon la largeur du panneau, plus selon celle de l'écran** (`@container`, au-delà de 36rem). Sur miss-contraction, la carte plafonnait à 470 px sur un écran de bureau, et les descriptions tenaient dans 195 px. Le panneau devient son propre conteneur (`container-type: inline-size`) : dans une rangée flex qui le dimensionnerait à son contenu, lui donner une largeur.
