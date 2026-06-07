import { Component, createElement as h } from 'react';

/**
 * ErrorBoundary générique, DÉCOUPLÉ de tout reporter (Sentry passé via onError).
 * Évite l'écran blanc au crash : affiche un fallback + bouton Réessayer.
 *
 * Props :
 *  - fallback : ReactNode | (error, reset) => ReactNode (sinon UI par défaut)
 *  - onError(error, info) : branchez ici recordError / Sentry
 *  - onReset() : nettoyage avant remontage
 *  - onDownloadBackup() : si fourni, bouton « Télécharger une sauvegarde »
 *    (récupérer l'état local même si React est cassé — pattern miss-uwh)
 *  - title / resetLabel / backupLabel : libellés
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (typeof this.props.onError === 'function')
      this.props.onError(error, info);
  }

  reset() {
    if (typeof this.props.onReset === 'function') this.props.onReset();
    this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children ?? null;

    const { fallback } = this.props;
    if (typeof fallback === 'function') return fallback(error, this.reset);
    if (fallback !== undefined && fallback !== null) return fallback;

    const children = [
      h(
        'p',
        { 'data-dwc': 'error-boundary-title' },
        this.props.title ?? 'Une erreur est survenue.'
      ),
      h(
        'button',
        {
          type: 'button',
          onClick: this.reset,
          'data-dwc': 'error-boundary-reset',
        },
        this.props.resetLabel ?? 'Réessayer'
      ),
    ];
    if (typeof this.props.onDownloadBackup === 'function') {
      children.push(
        h(
          'button',
          {
            type: 'button',
            onClick: this.props.onDownloadBackup,
            'data-dwc': 'error-boundary-backup',
          },
          this.props.backupLabel ?? 'Télécharger une sauvegarde'
        )
      );
    }
    return h(
      'div',
      { role: 'alert', 'data-dwc': 'error-boundary' },
      ...children
    );
  }
}
