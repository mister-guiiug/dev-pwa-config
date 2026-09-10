/**
 * Libellés des composants du paquet en portugais (`pt`).
 *
 * UN MODULE PAR LANGUE, ET C'EST TOUT L'INTÉRÊT. Les sept dictionnaires
 * vivaient dans un unique objet littéral, et un objet est UNE liaison : aucun
 * bundler ne pouvait en retirer six. Toute application montant un seul
 * composant du paquet — `ErrorBanner`, `Sheet`, `ConfirmDialog`… — embarquait
 * donc les sept langues, 6,2 kB gzip là où le français seul en pèse 1,8.
 *
 * `test/labels.test.mjs` refuse toute clé qui manquerait ici et qu'une autre
 * langue porterait : les sept fichiers ne peuvent pas diverger en silence.
 */

/** @type {import('./labels-core.js').LabelGroups} */
const labels = {
  sheet: { close: 'Fechar' },
  confirm: {
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    destructiveConfirm: 'Eliminar',
    ok: 'OK',
  },
  toast: {
    close: 'Fechar a notificação',
    region: 'Notificações',
    undo: 'Desfazer',
  },
  error: { retry: 'Tentar novamente', close: 'Fechar' },
  install: {
    title: 'Instalar a aplicação',
    description:
      'Adicione esta aplicação ao ecrã inicial: acesso rápido, mesmo sem ligação.',
    howIos: 'Toque no botão Partilhar e depois em «Adicionar ao ecrã inicial».',
    howSafari: 'No menu Ficheiro do Safari, escolha «Adicionar à Dock».',
    howGeneric: 'Abra o menu do seu navegador e escolha «Instalar aplicação».',
    install: 'Instalar',
    dismiss: 'Mais tarde',
  },
  update: {
    title: 'Atualização disponível',
    update: 'Recarregar',
    updating: 'A atualizar…',
    snooze: 'Mais tarde',
    dismiss: 'Mais tarde',
    ignore: 'Ignorar',
    force: 'Forçar a atualização',
    forceHint:
      'Limpa a cache da aplicação e recarrega. Os seus dados são conservados.',
    offlineReady: 'A aplicação já funciona sem ligação.',
    offlineReadyOk: 'OK',
  },
  footer: {
    source: 'Código-fonte',
    sponsor: 'Pague-me um café',
    issues: 'Relatar um problema',
  },
  share: {
    label: 'Partilhar',
    copied: 'Ligação copiada',
    failed: 'Não foi possível partilhar',
  },
  version: {
    label: 'Versão',
    updated: 'Atualizado para a versão {version}',
    available: 'Versão {version} disponível',
    built: 'Compilada em {date}',
    release: 'Notas da versão',
  },
  apps: {
    repo: 'Código-fonte de {app}',
    source: 'Código-fonte',
    sponsor: 'Pague-me um café',
    otherApps: 'As nossas outras aplicações',
  },
  maturity: { alpha: 'Alfa', beta: 'Beta', stable: 'Estável' },
  sync: {
    synced: 'Sincronizado',
    pending: 'Pendente',
    offline: 'Sem ligação',
    error: 'Erro',
  },
  guard: {
    offline: 'Indisponível sem ligação',
    readonly: 'Dados não sincronizados — ação indisponível',
  },
  theme: {
    label: 'Tema',
    light: 'claro',
    dark: 'escuro',
    system: 'do sistema',
    next: 'Tema: {current}. Ativar o tema {next}.',
  },
  auth: {
    title: 'Iniciar sessão',
    signUpTitle: 'Criar uma conta',
    otpTitle: 'Iniciar sessão com uma ligação',
    sendLink: 'Enviar uma ligação',
    email: 'Endereço de e-mail',
    password: 'Palavra-passe',
    signIn: 'Iniciar sessão',
    signUp: 'Criar a conta',
    mfaTitle: 'Verificação em dois passos',
    mfaHint: 'Introduza o código da sua aplicação de autenticação.',
    mfaCode: 'Código de 6 dígitos',
    mfaRecoveryCode: 'Código de recuperação',
    mfaVerify: 'Verificar',
    mfaRecovery: 'Usar um código de recuperação',
    mfaUseApp: 'Usar a aplicação de autenticação',
    signOut: 'Terminar sessão',
  },
  nav: {
    back: 'Voltar',
    label: 'Navegação principal',
    current: 'Página atual',
    more: 'Mais',
  },
};

export default labels;
