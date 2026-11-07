---
'@mister-guiiug/dev-pwa-config': minor
---

Nouveau workflow réutilisable `pwa-supabase-backup.yml` : un `pg_dump` (format custom, schémas `public,auth` par défaut) chiffré en AES-256 avec `gpg --symmetric`, puis rangé en artefact du run (35 jours par défaut). Au 07/11/2026, aucun dépôt du parc ne sauvegardait sa base : le keep-alive empêche la pause, pas la perte.

Le chiffrement est obligatoire. Les artefacts d'un dépôt public se téléchargent par n'importe quel compte GitHub connecté, et un dump contient des données personnelles. Le workflow échoue si `SUPABASE_DB_URL` ou `BACKUP_PASSPHRASE` manque, si la phrase de passe fait moins de 20 caractères, ou si le dump fait moins de 1 Ko (base en pause ou schémas inexistants). Il ne réussit jamais sans avoir sauvegardé.
