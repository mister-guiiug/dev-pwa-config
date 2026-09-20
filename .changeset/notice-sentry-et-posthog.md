---
'@mister-guiiug/dev-pwa-config': minor
---

`PrivacyNotice` dit enfin les deux destinataires réels, et la mesure n'est plus attribuée à Google.

**Une erreur de fait, dans les sept langues.** Le panneau décrivait Google
Analytics — « par Google Analytics », « un cookie de Google », « Google, qui les
traite pour le compte de l'éditeur ». Il a été écrit le 16/09/2026 ; le parc est
passé à PostHog (nuage européen) le 19, et rien n'a suivi ces textes. Aucun
visiteur ne l'a lu — relevé du 19/09 : zéro des dix-sept applications ne monte ce
panneau — mais le corriger avant l'adoption évitait de publier un destinataire
faux sur dix-sept sites.

**Une section nouvelle : les erreurs.** Dix-sept applications embarquent un DSN
Sentry depuis le 19/09/2026, et `initSentry` s'exécute au chargement du module,
donc AVANT toute question. Un visiteur qui refuse la mesure envoie quand même un
rapport technique — message, pile, adresse de page, navigateur, adresse IP — dès
qu'une erreur survient. Le panneau le dit désormais, et dit aussi que ce rapport
ne suit pas le choix du bandeau.

- `sentryDsn` — la section ne s'affiche QUE s'il est renseigné : annoncer un
  envoi qui n'a pas lieu est aussi faux que taire celui qui a lieu. Rien du DSN
  n'est rendu à l'écran, il ne sert que de signal.
- `errorBasis` — mention d'exploitant, comme `controller` : le fondement de ces
  rapports ne peut pas être « votre consentement », et le socle ne peut pas le
  choisir à la place du responsable du traitement.

**`retentionMonths` n'a plus de défaut.** Il valait 14 — la conservation posée
sur les propriétés GA4, qui ne décrivent plus rien. Une durée non fournie
s'affiche maintenant comme une mention manquante. `RETENTION_DEFAUT` reste
exporté, `@deprecated`.

Une application qui passait déjà `retentionMonths` n'est pas touchée. Une
application qui comptait sur le défaut affichera `[À compléter]` à la place des
14 mois — ce qui est le comportement voulu, la valeur n'étant plus vraie.
