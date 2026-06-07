// Barrel des helpers React partagés (hooks + composants PWA).
//
// `useUpdatePrompt` est volontairement EXCLU de ce barrel : il importe le module
// virtuel `virtual:pwa-register/react` (vite-plugin-pwa) et casserait un import
// du barrel hors contexte Vite/PWA. L'importer explicitement quand nécessaire :
//   import { useUpdatePrompt } from '@mister-guiiug/dev-wpa-config/react/use-update-prompt';
export { useLocalStorage } from './use-local-storage.js';
export { useInstallPrompt } from './use-install-prompt.js';
export { useTheme } from './use-theme.js';
export { PwaInstallPrompt } from './pwa-install-prompt.js';
export { AppFooter } from './app-footer.js';
