---
'@mister-guiiug/dev-pwa-config': patch
---

Retirer son consentement efface aussi l'identifiant de visite de PostHog : `OPTIONS_VIE_PRIVEE` pose `opt_out_persistence_by_default: true`.

Mesuré le 01/10/2026 sur posthog-js 1.435.5, la version que verrouillent les apps. Sans l'option, le retrait (`opt_out_capturing`) coupait la collecte mais laissait `ph_<clé>_posthog` dans le `localStorage`, et un accord redonné lors d'une visite suivante reprenait le MÊME identifiant : la continuité survivait au retrait. Avec elle, le retrait efface ces entrées, rien n'est réécrit tant que le refus tient, et un nouvel accord crée un identifiant neuf. Il ne reste que la mémoire du refus par PostHog (`__ph_opt_in_out_<clé>`, un 0) et un booléen de `sessionStorage` qui part avec l'onglet.

Rien ne change avant l'accord (la bibliothèque n'est pas chargée) ni pour qui a accepté. Limite connue : un accord redonné dans la même page retrouve l'identifiant gardé en mémoire. `reset()` l'éviterait, mais il remet aussi à zéro le consentement de PostHog et rouvrirait la collecte.
