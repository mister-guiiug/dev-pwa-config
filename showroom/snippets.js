/*
 * Extraits d'usage React, un par composant.
 *
 * Le showroom montrait le DOM PRODUIT et les sélecteurs CSS à cibler, jamais
 * l'appel du composant — c'est pourtant ce qu'on vient copier. Les extraits
 * vivent ici plutôt que dans le HTML : ils sont injectés dans le bloc
 * `data-snippet="<clé>"` correspondant, ce qui évite quatorze blocs `<pre>`
 * recopiés à la main dans la page.
 *
 * Ce ne sont pas des exemples décoratifs : chacun montre l'usage RÉEL, avec
 * les props qui comptent pour l'accessibilité.
 *
 * Fichier volontairement SANS import/export : chargeable par un `<script src>`
 * classique ET importable par node:test.
 */
globalThis.SHOWROOM_SNIPPETS = {
  Button: `import { Button } from '@mister-guiiug/dev-wpa-config/react';

<Button variant="primary" onClick={save}>Enregistrer</Button>

{/* \`loading\` pose aria-busy ET désactive : pas de double soumission. */}
<Button variant="danger" size="sm" loading={deleting} onClick={remove}>
  Supprimer
</Button>

{/* Sans libellé visible, aria-label est obligatoire. */}
<Button iconOnly aria-label="Ajouter une dépense" onClick={open}>
  <Plus size={18} aria-hidden="true" />
</Button>`,

  Field: `import { TextField, SelectField } from '@mister-guiiug/dev-wpa-config/react';

{/* label lié, aria-invalid et aria-describedby câblés automatiquement.
    L'aide reste annoncée MÊME en erreur. */}
<TextField
  label="Montant"
  hint="En euros, deux décimales."
  error={errors.amount}
  value={amount}
  onChange={e => setAmount(e.target.value)}
/>

<SelectField label="Catégorie" value={cat} onChange={onCat}>
  <option value="fees">Cotisations</option>
  <option value="travel">Déplacements</option>
</SelectField>`,

  Badge: `import { Badge } from '@mister-guiiug/dev-wpa-config/react';

{/* \`tone\` dit une INTENTION ; la teinte vient du thème de l'app. */}
<Badge tone="success">À jour</Badge>
<Badge tone="warning" variant="outline">En attente</Badge>`,

  Stat: `import { Stat } from '@mister-guiiug/dev-wpa-config/react';

{/* \`trendLabel\` est lu par les lecteurs d'écran : la couleur et la flèche
    ne suffisent pas à distinguer une hausse d'une baisse. */}
<Stat
  label="Adhérents"
  value={128}
  delta="+12"
  trend="up"
  trendLabel="en hausse"
/>`,

  Skeleton: `import { SkeletonGroup } from '@mister-guiiug/dev-wpa-config/react';

{/* Le libellé est annoncé UNE fois, par le conteneur — pas une fois
    par barre. */}
{loading ? <SkeletonGroup label="Chargement des écritures" lines={4} /> : <List items={rows} />}`,

  Sheet: `import { Sheet } from '@mister-guiiug/dev-wpa-config/react';

{/* Échap, clic sur le fond, piège de focus, focus restitué à la fermeture
    et scroll de fond verrouillé : tout est déjà là. */}
<Sheet open={open} title="Ajouter une dépense" onClose={() => setOpen(false)}>
  <ExpenseForm onDone={() => setOpen(false)} />
</Sheet>`,

  EmptyState: `import { EmptyState, Button } from '@mister-guiiug/dev-wpa-config/react';

<EmptyState
  icon={<Inbox size={32} aria-hidden="true" />}
  title="Aucune donnée pour l'instant"
  description="Créez une première entrée pour voir vos statistiques."
  action={<Button onClick={create}>Créer une entrée</Button>}
/>`,

  ErrorBanner: `import { ErrorBanner } from '@mister-guiiug/dev-wpa-config/react';

{/* severity="error" pose role="alert" (interruption) ;
    "warning" et "info" posent role="status" (discret). */}
<ErrorBanner
  message={error.message}
  severity="error"
  onRetry={refetch}
  onDismiss={() => setError(null)}
/>`,

  SyncStatusBadge: `import { SyncStatusBadge } from '@mister-guiiug/dev-wpa-config/react';

<SyncStatusBadge status={online ? 'synced' : 'offline'} pending={queue.length} />`,

  ErrorBoundary: `import { ErrorBoundary } from '@mister-guiiug/dev-wpa-config/react';
import { recordError } from '@mister-guiiug/dev-wpa-config/react/observability';

{/* onDownloadBackup : récupérer l'état local même si React est cassé. */}
<ErrorBoundary onError={recordError} onDownloadBackup={exportLocalData}>
  <App />
</ErrorBoundary>`,

  PwaInstallPrompt: `import { PwaInstallPrompt } from '@mister-guiiug/dev-wpa-config/react';

{/* Ne s'affiche que si l'installation est possible et non refusée. */}
<PwaInstallPrompt />`,

  UpdatePromptBanner: `// Import par sous-chemin : couplé à virtual:pwa-register/react, hors barrel.
import { UpdatePromptBanner } from '@mister-guiiug/dev-wpa-config/react/update-prompt-banner';

<UpdatePromptBanner snoozeHours={24} />`,

  AppFooter: `import { AppFooter } from '@mister-guiiug/dev-wpa-config/react';
import { REPO_URL, SPONSOR_URL } from './links';

<AppFooter repoUrl={REPO_URL} sponsorUrl={SPONSOR_URL} />`,

  FamilyApps: `import { FamilyApps } from '@mister-guiiug/dev-wpa-config/react';

{/* La grille exclut d'elle-même l'app courante. */}
<FamilyApps currentAppId="miss-uwh" repoUrl={REPO_URL} />`,
};
