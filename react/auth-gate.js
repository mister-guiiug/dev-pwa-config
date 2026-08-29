import { useAuth } from './use-auth.js';

/**
 * Garde d'accès NON STYLÉE : quoi rendre selon l'état de session.
 *
 * PROMU, PAS INVENTÉ. `miss-uwh/src/auth/AuthGate.tsx` et
 * `miss-lookhouse/src/auth/AuthGate.tsx` sont quasi identiques : en mode
 * local, laisser passer ; sinon chargement → connexion → (défi MFA) →
 * application. `mister-doc` a la même cascade avec deux marches de plus
 * (fiche médecin, approbation) — des marches MÉTIER, qui restent à l'app :
 * ce composant ne rend que les quatre états du port.
 *
 * AUCUN ÉCRAN N'EST FOURNI : la page de connexion, le spinner et le
 * formulaire TOTP sont des décisions de produit. La garde ne fait qu'aiguiller
 * — c'est précisément la partie que uwh et lookhouse avaient dupliquée.
 *
 * `bypass` est le mode local d'uwh et lookhouse : on laisse passer, « la
 * sécurité réelle restant appliquée côté serveur par les politiques RLS ».
 * Une garde d'interface se contourne dans l'inspecteur ; elle ordonne des
 * écrans, elle ne protège pas des données.
 *
 * `mfa` non fourni retombe sur `fallback` : tant que l'étape TOTP n'est pas
 * franchie, on ne montre PAS l'application (doc et uwh bloquent pareil).
 *
 * @param {{
 *   client?: import('../auth/index.js').AuthClient | null,
 *   children?: import('react').ReactNode,
 *   loading?: import('react').ReactNode,
 *   fallback?: import('react').ReactNode,
 *   mfa?: import('react').ReactNode,
 *   bypass?: boolean,
 * }} props `fallback` est l'écran de connexion ; `mfa` le défi TOTP.
 */
export function AuthGate(props) {
  const {
    client = null,
    children = null,
    loading = null,
    fallback = null,
    mfa,
    bypass = false,
  } = props ?? {};

  // Le hook est appelé inconditionnellement (règle des hooks) ; en `bypass`
  // on ne démarre simplement pas le client.
  const { status } = useAuth(bypass ? null : client);

  if (bypass) return children;
  if (status === 'loading') return loading;
  if (status === 'signed-out') return fallback;
  if (status === 'needs-mfa') return mfa === undefined ? fallback : mfa;
  return children;
}
