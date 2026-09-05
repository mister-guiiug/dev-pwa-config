// Barrel des helpers React partagés (hooks + composants PWA).
//
// La mise à jour du service worker A REJOINT ce barrel : `useUpdatePrompt`
// n'importe plus `virtual:pwa-register/react` en dur, il reçoit `registerSW` en
// paramètre. Le sous-chemin s'importe donc partout, y compris dans le balayage
// de résolution de la CI.
//
// Reste volontairement EXCLUE l'observabilité (init à effets, Sentry chargé à
// la demande) :
//   import { installErrorReporter } from '@mister-guiiug/dev-pwa-config/react/observability';
export { useLocalStorage } from './use-local-storage.js';
export { useInstallPrompt } from './use-install-prompt.js';
export { useTheme } from './use-theme.js';
export {
  useMediaQuery,
  useReducedMotion,
  usePrefersDark,
  usePrefersHighContrast,
} from './use-media-query.js';
export { useOnline } from './use-online.js';
export { useActionGuard, resolveGuard } from './use-action-guard.js';
export { Sparkline, BarChart, Gauge } from './sparkline.js';
export {
  usePrefetch,
  useVisiblePrefetch,
  useIdlePrefetch,
} from './use-prefetch.js';
export { useOfflineMutationQueue } from './use-offline-queue.js';
export { retryableQuery } from './net.js';
export { PwaInstallPrompt } from './pwa-install-prompt.js';
export { AppFooter } from './app-footer.js';
export { AppHeader } from './app-header.js';
export { PageContainer } from './page-container.js';
export { FamilyApps } from './family-apps.js';
export { ErrorBoundary } from './error-boundary.js';
export { EmptyState } from './empty-state.js';
export { ErrorBanner } from './error-banner.js';
export { SyncStatusBadge } from './sync-status-badge.js';
export { Button } from './button.js';
export { TextField, SelectField, TextAreaField } from './field.js';
export { Skeleton, SkeletonGroup } from './skeleton.js';
export { Sheet } from './sheet.js';
export { Stat } from './stat.js';
export { Badge } from './badge.js';
export { Card, CardHeader } from './card.js';
export { ConfirmDialog } from './confirm-dialog.js';
export { ToastProvider, ToastViewport, useToast } from './toast.js';
export { BottomNav } from './bottom-nav.js';
export {
  LabelsProvider,
  useLabels,
  mergeLabels,
  labelsFor,
  LABELS,
} from './labels.js';
export { SponsorProvider, useSponsorUrl } from './sponsor.js';
export { useUpdatePrompt } from './use-update-prompt.js';
export { UpdatePromptBanner } from './update-prompt-banner.js';
export { UpdateButton } from './update-button.js';
export { applyUpdate } from '../sw-update.js';
export { ThemeToggle } from './theme-toggle.js';
export { ThemeProvider, useThemeContext } from './theme-provider.js';
export { AppUpdates, useAppUpdates } from './app-updates.js';
export { VersionProvider, useAppVersion } from './version.js';
export { AppVersion } from './app-version.js';
export { ShareButton } from './share-button.js';
export { ObservabilityBoundary } from './error-boundary.js';
export {
  IconsProvider,
  Icon,
  useIcon,
  DEFAULT_ICONS,
} from './icons-context.js';
export { useLongPress } from './use-long-press.js';
export { useFeedback } from './use-feedback.js';
export { useWakeLock } from './use-wake-lock.js';
export { useFullscreen } from './use-fullscreen.js';
export { usePullToRefresh } from './use-pull-to-refresh.js';
export { useKeyboardShortcuts } from './use-keyboard-shortcuts.js';
export { useShake, requestMotionPermission } from './use-shake.js';
export { useAsync } from './use-async.js';
export { useUndoableState } from './use-undoable-state.js';
export { SegmentedControl } from './segmented-control.js';
export { ConnectionBanner } from './connection-banner.js';
export { AuthProvider, useAuthContext } from './auth-provider.js';
export { LoginForm } from './login-form.js';
export { MfaChallenge } from './mfa-challenge.js';
