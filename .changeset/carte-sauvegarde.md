---
'@mister-guiiug/dev-pwa-config': minor
---

`react/backup-card` (nouveau) : `BackupCard`, la carte « Sauvegarde » de l'écran Réglages. Elle exporte ce que l'app lui donne (`exportData`), importe un fichier après confirmation (`importData`, facultatif ; un résultat `{ ok: false, problems }` est affiché et rien n'est écrit), dit de quand date la dernière sauvegarde, rappelle d'en faire une, et propose sur un geste de demander au navigateur de garder les données. `useBackupReminder(app)` affiche le même rappel ailleurs, par exemple à l'accueil.

`backup-reminder` (nouveau) : le rappel lui-même, promu de miss-contraction, seule application qui rappelait d'exporter. Tous les sept jours (`BACKUP_REMINDER_DAYS`), tant qu'aucune sauvegarde ni aucun « plus tard » n'est récent, et jamais sur une application vide (`hasData`). L'état vit sous une clé `dwc_backup:<app>` par application, parce que l'origine est partagée.

Libellés : nouveau groupe `backup`, dans les sept langues.
