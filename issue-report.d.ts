/** Le gabarit d'anomalie que le dépôt `.github` du compte prête à tous les dépôts. */
export declare const ISSUE_TEMPLATE: string;

export interface EnvironmentOptions {
  /** Agent utilisateur à décrire (sinon `navigator.userAgent`). */
  userAgent?: string;
  /** `null` pour ignorer le navigateur courant (rendu serveur, test). */
  navigator?: Navigator | null;
  /** `null` pour ignorer la fenêtre courante (mode installé non détecté). */
  window?: Window | null;
}

/**
 * L'environnement en une ligne : « Chrome 140, Windows, ordinateur »,
 * « Safari 17, iOS 17, téléphone, installée ». `''` sans agent utilisateur.
 */
export declare function describeEnvironment(
  options?: EnvironmentOptions
): string;

/** Chemin, requête et fragment de l'écran courant ; `''` sans fenêtre. */
export declare function currentRoute(win?: Window | null): string;

/** « v1.2.0 (abc1234), compilée le 2026-09-06 » ; `''` sans information. */
export declare function versionLine(info?: {
  version?: unknown;
  commit?: string;
  buildTime?: string;
}): string;

export interface IssueReportOptions {
  /** L'URL du dépôt GitHub (`repoUrl(APP_ID)` du catalogue). Sans elle : `''`. */
  repoUrl?: string;
  /** Le fichier du gabarit, `bug.yml` par défaut. */
  template?: string;
  /** Titre prérempli de l'issue. */
  title?: string;
  version?: unknown;
  commit?: string;
  buildTime?: string;
  /** L'écran courant, ajouté au champ `environnement`. */
  route?: string;
  /** Le navigateur et le système, tel que `describeEnvironment` le rend. */
  environment?: string;
  /** Tout autre champ du gabarit, par son identifiant (`reproduire`, `journal`…). */
  fields?: Record<string, string | number | undefined>;
}

/** L'URL de `issues/new` avec le gabarit et les champs préremplis. */
export declare function issueReportUrl(options?: IssueReportOptions): string;

/**
 * La même URL, remplie avec ce que la page sait à l'instant de l'appel :
 * build injecté par `vite-version`, écran courant, environnement. À appeler
 * au clic, pas au rendu.
 */
export declare function currentIssueReportUrl(
  options?: Pick<
    IssueReportOptions,
    'repoUrl' | 'template' | 'title' | 'fields'
  >
): string;
