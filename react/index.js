// Barrel des helpers React partagés (hooks + composants PWA).
//
// Sont volontairement EXCLUS de ce barrel (couplés à vite-plugin-pwa via
// `virtual:pwa-register/react`, casseraient un import hors contexte Vite/PWA) :
//   import { useUpdatePrompt } from '@mister-guiiug/dev-wpa-config/react/use-update-prompt';
//   import { UpdatePromptBanner } from '@mister-guiiug/dev-wpa-config/react/update-prompt-banner';
// Et l'observabilité (init à effets, lazy Sentry) :
//   import { installErrorReporter } from '@mister-guiiug/dev-wpa-config/react/observability';
export { useLocalStorage } from './use-local-storage.js';
export { useInstallPrompt } from './use-install-prompt.js';
export { useTheme } from './use-theme.js';
export { useOnline } from './use-online.js';
export { useOfflineMutationQueue } from './use-offline-queue.js';
export { retryableQuery } from './net.js';
export { PwaInstallPrompt } from './pwa-install-prompt.js';
export { AppFooter } from './app-footer.js';
export { FamilyApps } from './family-apps.js';
export { ErrorBoundary } from './error-boundary.js';
export { EmptyState } from './empty-state.js';
export { ErrorBanner } from './error-banner.js';
export { SyncStatusBadge } from './sync-status-badge.js';
