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
    update: 'Atualizar',
    updating: 'A atualizar…',
    snooze: 'Mais tarde ({hours} h)',
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
  consent: {
    title: 'Medição de audiência',
    message:
      'Esta aplicação pode medir a sua utilização para melhorar. Nada é enviado enquanto não aceitar.',
    accept: 'Aceitar',
    refuse: 'Recusar',
    policy: 'Saber mais',
    stateGranted: 'Medição de audiência: aceite',
    stateDenied: 'Medição de audiência: recusada',
    manage: 'Alterar a minha escolha',
  },
  privacy: {
    title: 'Os seus dados',
    what: 'O que é medido',
    whatText:
      'As páginas que consulta e a forma como circula entre elas, através do PostHog. Nunca o que escreve na aplicação.',
    basis: 'A que título',
    basisText:
      'O seu consentimento, e apenas ele. Pode retirá-lo a qualquer momento, com a mesma facilidade com que o deu.',
    recipient: 'Quem os recebe',
    recipientText:
      'A PostHog, nos seus servidores da União Europeia, que os trata por conta do editor desta aplicação.',
    retention: 'Durante quanto tempo',
    retentionText:
      'Os dados detalhados são conservados {months} meses e depois eliminados.',
    stored: 'O que é guardado no seu dispositivo',
    storedText:
      'Um identificador de visita colocado pela PostHog (cookie e armazenamento local), e a sua escolha, guardada neste navegador para não repetir a pergunta em cada visita.',
    errors: 'Em caso de erro',
    errorsText:
      'Quando a aplicação encontra um erro, é enviado um relatório técnico para a Sentry, nos seus servidores da Alemanha: a mensagem, o local do código, o endereço da página, o seu navegador e o seu endereço IP. Nunca o que escreve. Este relatório não depende da escolha acima: serve para reparar, não para medir.',
    errorsBasis: 'A que título, para estes relatórios',
    controller: 'Responsável pelo tratamento',
    rights: 'Os seus direitos',
    rightsText:
      'Acesso, retificação, apagamento, oposição: escreva para {contact}.',
    missing: '[A preencher]',
  },
};

export default labels;
