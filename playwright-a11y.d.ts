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
