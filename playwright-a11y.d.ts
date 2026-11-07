export interface A11yScanOptions {
  include?: string | string[];
  exclude?: string | string[];
  disableRules?: string[];
  /** Tags axe (défaut WCAG 2.0/2.1 niveaux A + AA). */
  tags?: string[];
}

export interface A11yViolationNode {
  target: string[];
}

export interface A11yViolation {
  id: string;
  impact?: string | null;
  help: string;
  helpUrl: string;
  nodes: A11yViolationNode[];
}

export interface A11yResults {
  violations: A11yViolation[];
}

type AxeBuilderCtor = new (opts: { page: unknown }) => {
  withTags(tags: string[]): unknown;
  analyze(): Promise<A11yResults>;
};

export declare function analyzeA11y(
  page: unknown,
  AxeBuilder: AxeBuilderCtor,
  options?: A11yScanOptions
): Promise<A11yResults>;

export declare function formatViolations(violations: A11yViolation[]): string;

export declare function expectNoA11yViolations(
  page: unknown,
  AxeBuilder: AxeBuilderCtor,
  expect: (
    actual: unknown,
    message?: string
  ) => { toEqual(expected: unknown): void },
  options?: A11yScanOptions
): Promise<A11yResults>;

/**
 * Une étape d'audit : un chemin (ouvert par `page.goto`), ou un état atteint
 * par des gestes.
 */
/**
 * `P` est le type de la page, déduit de celle qu'on passe : `setup` et
 * `ready` reçoivent une `Page` de Playwright, typée, sans que le paquet en
 * dépende.
 */
export type A11yStep<P = unknown> =
  | string
  | {
      /** Le chemin à ouvrir. Absent : la page reste où l'étape précédente l'a laissée. */
      path?: string;
      /** Son nom dans le rapport ; par défaut, le chemin. */
      name?: string;
      /** Les gestes qui mènent à l'état à auditer (ouvrir une feuille, un thème…). */
      setup?: (page: P) => unknown;
      /**
       * Options d'axe propres à l'étape : `include` et `tags` remplacent ceux
       * de la liste, `exclude` et `disableRules` s'y ajoutent.
       */
      options?: A11yScanOptions;
    };

export interface A11yStepsOptions<P = unknown> extends A11yScanOptions {
  /**
   * Après chaque navigation, avant `setup` : attendre l'écran réel (fin des
   * animations, état d'authentification connu).
   */
  ready?: (page: P, step: { name: string; path?: string }) => unknown;
}

export interface A11yStepResult {
  name: string;
  path?: string;
  results: A11yResults;
}

/**
 * Axe sur une liste de routes ou d'états, dans l'ordre, sur la même page.
 * Une liste vide est refusée.
 */
export declare function analyzeA11yOn<P>(
  page: P,
  AxeBuilder: AxeBuilderCtor,
  steps: A11yStep<P>[],
  options?: A11yStepsOptions<P>
): Promise<A11yStepResult[]>;

/**
 * Assertion : aucune violation sur aucune étape. Toutes sont auditées avant
 * de conclure ; le rapport nomme chaque écran fautif.
 */
export declare function expectNoA11yViolationsOn<P>(
  page: P,
  AxeBuilder: AxeBuilderCtor,
  expect: (
    actual: unknown,
    message?: string
  ) => { toEqual(expected: unknown): void },
  steps: A11yStep<P>[],
  options?: A11yStepsOptions<P>
): Promise<A11yStepResult[]>;
