import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || '';

// ==================== NEW YORK TIMEZONE HELPERS ====================
const NY_TIMEZONE = 'America/New_York';

// Format date to New York timezone
const formatDateNY = (dateStr, options = {}) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { ...options, timeZone: NY_TIMEZONE });
};

// Format datetime to New York timezone
const formatDateTimeNY = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', { timeZone: NY_TIMEZONE });
};

// ==================== TRANSLATIONS ====================
const translations = {
  en: {
    // Login
    salesPortal: 'Sales Portal',
    legacyTranslations: 'Legacy Translation Services',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    noAccount: "Don't have an account? Contact your administrator.",
    invalidCredentials: 'Invalid credentials',
    connectionError: 'Connection error. Please try again.',

    // Set Password
    welcomeTeam: 'Welcome to the Team!',
    setUpPassword: 'Set up your password to get started',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    minChars: 'Min. 6 characters',
    setPassword: 'Set Password & Continue',
    settingUp: 'Setting up...',
    passwordsNoMatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',

    // Header & Navigation
    notifications: 'Notifications',
    markAllRead: 'Mark all as read',
    noNotifications: 'No notifications',
    logout: 'Logout',

    // Tabs
    dashboard: 'Dashboard',
    registerPartner: 'Register Partner',
    myCommissions: 'My Commissions',
    paymentHistory: 'Payment History',
    howItWorks: 'How It Works',

    // Dashboard
    thisMonth: 'This Month',
    partnersRegistered: 'partners registered',
    pendingCommission: 'Pending Commission',
    awaitingPayment: 'awaiting payment',
    totalEarned: 'Total Earned',
    allTime: 'all time',
    totalPartners: 'Total Partners',
    registeredByYou: 'registered by you',
    monthlyGoal: 'Monthly Goal Progress',
    progress: 'Progress',
    partners: 'partners',
    recentRegistrations: 'Recent Registrations',
    date: 'Date',
    partner: 'Partner',
    tier: 'Tier',
    commission: 'Commission',
    status: 'Status',
    noRegistrations: 'No registrations yet. Start by registering your first partner!',

    // Register Partner
    registerNewPartner: 'Register New Partner',
    companyName: 'Company Name',
    contactName: 'Contact Name',
    phone: 'Phone',
    expectedTier: 'Expected Partner Tier',
    notes: 'Notes',
    register: 'Register Partner',
    registering: 'Registering...',
    partnerRegistered: 'Partner Registered!',
    addedSuccessfully: 'has been added successfully.',
    yourCommission: 'Your commission',

    // Tiers
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
    pagesMonth: 'pages/month',
    perPartner: 'per partner',

    // Commissions
    monthlyEarnings: 'Monthly Earnings',
    month: 'Month',
    totalEarnedAllTime: 'Total Earned (All Time)',
    pendingPaymentInfo: 'Will be paid on the next payment cycle',

    // Payment History
    totalReceived: 'Total Received',
    sinceStart: 'since start',
    payments: 'Payments',
    transactionsCompleted: 'transactions completed',
    partnersPaid: 'Partners Paid',
    commissionsPaid: 'commissions paid',
    paymentHistoryReceived: 'Payment History Received',
    value: 'Value',
    method: 'Method',
    reference: 'Reference',
    noPaymentsYet: 'No payments received yet.',
    paymentsWillAppear: 'Your payments will appear here when processed.',
    paidCommissionsDetail: 'Paid Commissions Detail',
    acquisitionDate: 'Acquisition Date',
    paymentDate: 'Payment Date',

    // How It Works
    commissionStructure: 'Commission Structure',
    yourCommissionType: 'Your Commission Type:',
    byPartnerTier: 'By Partner Tier',
    fixedValue: 'Fixed Value',
    percentageOfSales: 'Percentage of Sales',
    paymentInformation: 'Payment Information',
    paymentMethod: 'Payment Method',
    paymentSchedule: 'Payment Schedule',
    minimumPayout: 'Minimum Payout',
    bonusOpportunities: 'Bonus Opportunities',
    howTiersWork: 'How Partner Tiers Work',
    tiersExplanation: 'Partner tiers are based on their expected monthly translation volume. When you register a partner, estimate their tier based on their business needs:',
    bronzeDesc: 'Small businesses, individual attorneys, occasional needs',
    silverDesc: 'Growing firms, small immigration offices, regular volume',
    goldDesc: 'Medium offices, accounting firms in tax season, steady volume',
    platinumDesc: 'Large firms, universities, high-volume clients',

    // Status
    pending: 'Pending',
    approved: 'Approved',
    paid: 'Paid',

    // Partner Referral Notice
    partnerReferralNotice: 'Partner referrals are exclusively for companies with recurring demand for certified translations, such as law firms, accounting offices, financial institutions, real estate agencies, hospitals, and other businesses that regularly require translation services.',
    partnerReferralImportant: 'Important: Individuals (natural persons) cannot be registered as partners.'
  },
  pt: {
    // Login
    salesPortal: 'Portal de Vendas',
    legacyTranslations: 'Legacy Translation Services',
    email: 'Email',
    password: 'Senha',
    signIn: 'Entrar',
    signingIn: 'Entrando...',
    noAccount: 'Não tem conta? Contate seu administrador.',
    invalidCredentials: 'Credenciais inválidas',
    connectionError: 'Erro de conexão. Tente novamente.',

    // Set Password
    welcomeTeam: 'Bem-vindo à Equipe!',
    setUpPassword: 'Configure sua senha para começar',
    newPassword: 'Nova Senha',
    confirmPassword: 'Confirmar Senha',
    minChars: 'Mín. 6 caracteres',
    setPassword: 'Definir Senha e Continuar',
    settingUp: 'Configurando...',
    passwordsNoMatch: 'As senhas não coincidem',
    passwordTooShort: 'A senha deve ter pelo menos 6 caracteres',

    // Header & Navigation
    notifications: 'Notificações',
    markAllRead: 'Marcar todas como lidas',
    noNotifications: 'Nenhuma notificação',
    logout: 'Sair',

    // Tabs
    dashboard: 'Painel',
    registerPartner: 'Registrar Parceiro',
    myCommissions: 'Minhas Comissões',
    paymentHistory: 'Histórico de Pagamentos',
    howItWorks: 'Como Funciona',

    // Dashboard
    thisMonth: 'Este Mês',
    partnersRegistered: 'parceiros registrados',
    pendingCommission: 'Comissão Pendente',
    awaitingPayment: 'aguardando pagamento',
    totalEarned: 'Total Ganho',
    allTime: 'desde o início',
    totalPartners: 'Total de Parceiros',
    registeredByYou: 'registrados por você',
    monthlyGoal: 'Progresso da Meta Mensal',
    progress: 'Progresso',
    partners: 'parceiros',
    recentRegistrations: 'Registros Recentes',
    date: 'Data',
    partner: 'Parceiro',
    tier: 'Tier',
    commission: 'Comissão',
    status: 'Status',
    noRegistrations: 'Nenhum registro ainda. Comece registrando seu primeiro parceiro!',

    // Register Partner
    registerNewPartner: 'Registrar Novo Parceiro',
    companyName: 'Nome da Empresa',
    contactName: 'Nome do Contato',
    phone: 'Telefone',
    expectedTier: 'Tier Esperado do Parceiro',
    notes: 'Observações',
    register: 'Registrar Parceiro',
    registering: 'Registrando...',
    partnerRegistered: 'Parceiro Registrado!',
    addedSuccessfully: 'foi adicionado com sucesso.',
    yourCommission: 'Sua comissão',

    // Tiers
    bronze: 'Bronze',
    silver: 'Prata',
    gold: 'Ouro',
    platinum: 'Platina',
    pagesMonth: 'páginas/mês',
    perPartner: 'por parceiro',

    // Commissions
    monthlyEarnings: 'Ganhos Mensais',
    month: 'Mês',
    totalEarnedAllTime: 'Total Ganho (Todo Período)',
    pendingPaymentInfo: 'Será pago no próximo ciclo de pagamento',

    // Payment History
    totalReceived: 'Total Recebido',
    sinceStart: 'desde o início',
    payments: 'Pagamentos',
    transactionsCompleted: 'transações realizadas',
    partnersPaid: 'Parceiros Pagos',
    commissionsPaid: 'comissões pagas',
    paymentHistoryReceived: 'Histórico de Pagamentos Recebidos',
    value: 'Valor',
    method: 'Método',
    reference: 'Referência',
    noPaymentsYet: 'Nenhum pagamento recebido ainda.',
    paymentsWillAppear: 'Seus pagamentos aparecerão aqui quando processados.',
    paidCommissionsDetail: 'Detalhamento de Comissões Pagas',
    acquisitionDate: 'Data de Aquisição',
    paymentDate: 'Data de Pagamento',

    // How It Works
    commissionStructure: 'Estrutura de Comissões',
    yourCommissionType: 'Seu Tipo de Comissão:',
    byPartnerTier: 'Por Tier do Parceiro',
    fixedValue: 'Valor Fixo',
    percentageOfSales: 'Percentual sobre Vendas',
    paymentInformation: 'Informações de Pagamento',
    paymentMethod: 'Método de Pagamento',
    paymentSchedule: 'Cronograma de Pagamento',
    minimumPayout: 'Pagamento Mínimo',
    bonusOpportunities: 'Oportunidades de Bônus',
    howTiersWork: 'Como Funcionam os Tiers',
    tiersExplanation: 'Os tiers de parceiros são baseados no volume mensal esperado de traduções. Ao registrar um parceiro, estime o tier baseado nas necessidades do negócio:',
    bronzeDesc: 'Pequenos negócios, advogados individuais, necessidades ocasionais',
    silverDesc: 'Escritórios em crescimento, pequenos escritórios de imigração, volume regular',
    goldDesc: 'Escritórios médios, contadores em época de impostos, volume constante',
    platinumDesc: 'Grandes escritórios, universidades, clientes de alto volume',

    // Status
    pending: 'Pendente',
    approved: 'Aprovado',
    paid: 'Pago',

    // Partner Referral Notice
    partnerReferralNotice: 'As indicações de parceiros são exclusivamente para empresas com demanda recorrente por traduções certificadas, como escritórios de advocacia, contabilidade, instituições financeiras, imobiliárias, hospitais e outras empresas que necessitam regularmente de serviços de tradução.',
    partnerReferralImportant: 'Importante: Pessoas físicas não poderão ser cadastradas como partners.'
  },
  es: {
    // Login
    salesPortal: 'Portal de Ventas',
    legacyTranslations: 'Legacy Translation Services',
    email: 'Correo',
    password: 'Contraseña',
    signIn: 'Iniciar Sesión',
    signingIn: 'Iniciando...',
    noAccount: '¿No tiene cuenta? Contacte a su administrador.',
    invalidCredentials: 'Credenciales inválidas',
    connectionError: 'Error de conexión. Intente nuevamente.',

    // Set Password
    welcomeTeam: '¡Bienvenido al Equipo!',
    setUpPassword: 'Configure su contraseña para comenzar',
    newPassword: 'Nueva Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    minChars: 'Mín. 6 caracteres',
    setPassword: 'Establecer Contraseña y Continuar',
    settingUp: 'Configurando...',
    passwordsNoMatch: 'Las contraseñas no coinciden',
    passwordTooShort: 'La contraseña debe tener al menos 6 caracteres',

    // Header & Navigation
    notifications: 'Notificaciones',
    markAllRead: 'Marcar todas como leídas',
    noNotifications: 'Sin notificaciones',
    logout: 'Salir',

    // Tabs
    dashboard: 'Panel',
    registerPartner: 'Registrar Socio',
    myCommissions: 'Mis Comisiones',
    paymentHistory: 'Historial de Pagos',
    howItWorks: 'Cómo Funciona',

    // Dashboard
    thisMonth: 'Este Mes',
    partnersRegistered: 'socios registrados',
    pendingCommission: 'Comisión Pendiente',
    awaitingPayment: 'esperando pago',
    totalEarned: 'Total Ganado',
    allTime: 'desde el inicio',
    totalPartners: 'Total de Socios',
    registeredByYou: 'registrados por usted',
    monthlyGoal: 'Progreso de Meta Mensual',
    progress: 'Progreso',
    partners: 'socios',
    recentRegistrations: 'Registros Recientes',
    date: 'Fecha',
    partner: 'Socio',
    tier: 'Nivel',
    commission: 'Comisión',
    status: 'Estado',
    noRegistrations: '¡Sin registros aún. Comience registrando su primer socio!',

    // Register Partner
    registerNewPartner: 'Registrar Nuevo Socio',
    companyName: 'Nombre de Empresa',
    contactName: 'Nombre de Contacto',
    phone: 'Teléfono',
    expectedTier: 'Nivel Esperado del Socio',
    notes: 'Notas',
    register: 'Registrar Socio',
    registering: 'Registrando...',
    partnerRegistered: '¡Socio Registrado!',
    addedSuccessfully: 'fue agregado exitosamente.',
    yourCommission: 'Su comisión',

    // Tiers
    bronze: 'Bronce',
    silver: 'Plata',
    gold: 'Oro',
    platinum: 'Platino',
    pagesMonth: 'páginas/mes',
    perPartner: 'por socio',

    // Commissions
    monthlyEarnings: 'Ganancias Mensuales',
    month: 'Mes',
    totalEarnedAllTime: 'Total Ganado (Todo el Tiempo)',
    pendingPaymentInfo: 'Se pagará en el próximo ciclo de pago',

    // Payment History
    totalReceived: 'Total Recibido',
    sinceStart: 'desde el inicio',
    payments: 'Pagos',
    transactionsCompleted: 'transacciones completadas',
    partnersPaid: 'Socios Pagados',
    commissionsPaid: 'comisiones pagadas',
    paymentHistoryReceived: 'Historial de Pagos Recibidos',
    value: 'Valor',
    method: 'Método',
    reference: 'Referencia',
    noPaymentsYet: 'Sin pagos recibidos aún.',
    paymentsWillAppear: 'Sus pagos aparecerán aquí cuando sean procesados.',
    paidCommissionsDetail: 'Detalle de Comisiones Pagadas',
    acquisitionDate: 'Fecha de Adquisición',
    paymentDate: 'Fecha de Pago',

    // How It Works
    commissionStructure: 'Estructura de Comisiones',
    yourCommissionType: 'Su Tipo de Comisión:',
    byPartnerTier: 'Por Nivel del Socio',
    fixedValue: 'Valor Fijo',
    percentageOfSales: 'Porcentaje de Ventas',
    paymentInformation: 'Información de Pago',
    paymentMethod: 'Método de Pago',
    paymentSchedule: 'Cronograma de Pago',
    minimumPayout: 'Pago Mínimo',
    bonusOpportunities: 'Oportunidades de Bonificación',
    howTiersWork: 'Cómo Funcionan los Niveles',
    tiersExplanation: 'Los niveles de socios se basan en el volumen mensual esperado de traducción. Al registrar un socio, estime el nivel según las necesidades del negocio:',
    bronzeDesc: 'Pequeños negocios, abogados individuales, necesidades ocasionales',
    silverDesc: 'Firmas en crecimiento, pequeñas oficinas de inmigración, volumen regular',
    goldDesc: 'Oficinas medianas, contadores en época de impuestos, volumen constante',
    platinumDesc: 'Grandes firmas, universidades, clientes de alto volumen',

    // Status
    pending: 'Pendiente',
    approved: 'Aprobado',
    paid: 'Pagado',

    // Partner Referral Notice
    partnerReferralNotice: 'Las indicaciones de socios son exclusivamente para empresas con demanda recurrente de traducciones certificadas, como despachos de abogados, oficinas de contabilidad, instituciones financieras, inmobiliarias, hospitales y otras empresas que requieren regularmente servicios de traducción.',
    partnerReferralImportant: 'Importante: Las personas físicas no pueden ser registradas como socios.'
  }
};

// ==================== LANGUAGE SELECTOR ====================
const LanguageSelector = ({ lang, setLang }) => (
  <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
    {[
      { code: 'en', label: 'EN' },
      { code: 'pt', label: 'PT' },
      { code: 'es', label: 'ES' }
    ].map(l => (
      <button
        key={l.code}
        onClick={() => {
          setLang(l.code);
          localStorage.setItem('salesperson_lang', l.code);
        }}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          lang === l.code
            ? 'bg-amber-500 text-slate-900'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        {l.label}
      </button>
    ))}
  </div>
);

// ==================== SALESPERSON LOGIN ====================
const SalespersonLogin = ({ onLogin, lang, setLang }) => {
  const t = translations[lang];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const res = await fetch(`${API_URL}/salesperson/login`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('salesperson_token', data.token);
        localStorage.setItem('salesperson', JSON.stringify(data.salesperson));
        onLogin(data.token, data.salesperson);
      } else {
        setError(data.detail || t.invalidCredentials);
      }
    } catch (err) {
      setError(t.connectionError);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="flex justify-end mb-4">
          <LanguageSelector lang={lang} setLang={setLang} />
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-amber-500 text-3xl font-bold">LT</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t.salesPortal}</h1>
          <p className="text-slate-500 mt-2">{t.legacyTranslations}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-600 transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          {t.noAccount}
        </p>
      </div>
    </div>
  );
};

// ==================== SET PASSWORD PAGE ====================
const SetPasswordPage = ({ inviteToken, onSuccess, lang, setLang }) => {
  const t = translations[lang];
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t.passwordsNoMatch);
      return;
    }
    if (password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('invite_token', inviteToken);
      formData.append('password', password);

      const res = await fetch(`${API_URL}/salesperson/set-password`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('salesperson_token', data.token);
        localStorage.setItem('salesperson', JSON.stringify(data.salesperson));
        onSuccess(data.token, data.salesperson);
      } else {
        setError(data.detail || 'Failed to set password');
      }
    } catch (err) {
      setError(t.connectionError);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="flex justify-end mb-4">
          <LanguageSelector lang={lang} setLang={setLang} />
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t.welcomeTeam}</h1>
          <p className="text-slate-500 mt-2">{t.setUpPassword}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.newPassword}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder={t.minChars}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.confirmPassword}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder={t.confirmPassword}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg font-semibold hover:from-teal-500 hover:to-teal-600 transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? t.settingUp : t.setPassword}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==================== MAIN SALESPERSON PORTAL ====================
const SalespersonPortal = ({ token, salesperson, onLogout, lang, setLang }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [commissionInfo, setCommissionInfo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState({ payments: [], paid_acquisitions: [], total_paid: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  const [newPartner, setNewPartner] = useState({
    company_name: '', contact_name: '', email: '', phone: '', partner_tier: 'bronze', notes: ''
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(null);
  const [registerError, setRegisterError] = useState('');

  useEffect(() => {
    fetchDashboard();
    fetchCommissionInfo();
    fetchNotifications();
    fetchPaymentHistory();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/salesperson/dashboard`, { headers: { 'salesperson-token': token } });
      if (res.ok) setDashboard(await res.json());
    } catch (err) { console.error('Error:', err); }
    setLoading(false);
  };

  const fetchCommissionInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/salesperson/commission-info`, { headers: { 'salesperson-token': token } });
      if (res.ok) setCommissionInfo(await res.json());
    } catch (err) { console.error('Error:', err); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/salesperson/notifications`, { headers: { 'salesperson-token': token } });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount((data.notifications || []).filter(n => !n.read).length);
      }
    } catch (err) { console.error('Error:', err); }
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/salesperson/payment-history`, { headers: { 'salesperson-token': token } });
      if (res.ok) setPaymentHistory(await res.json());
    } catch (err) { console.error('Error:', err); }
  };

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API_URL}/salesperson/notifications/${id}/read`, { method: 'PUT', headers: { 'salesperson-token': token } });
      fetchNotifications();
    } catch (err) { console.error('Error:', err); }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch(`${API_URL}/salesperson/notifications/read-all`, { method: 'PUT', headers: { 'salesperson-token': token } });
      fetchNotifications();
    } catch (err) { console.error('Error:', err); }
  };

  const handleRegisterPartner = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess(null);

    try {
      const formData = new FormData();
      Object.entries(newPartner).forEach(([key, value]) => formData.append(key, value));

      const res = await fetch(`${API_URL}/salesperson/register-partner`, {
        method: 'POST', headers: { 'salesperson-token': token }, body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRegisterSuccess(data);
        setNewPartner({ company_name: '', contact_name: '', email: '', phone: '', partner_tier: 'bronze', notes: '' });
        fetchDashboard();
        setTimeout(() => { setRegisterSuccess(null); }, 3000);
      } else {
        setRegisterError(data.detail || 'Failed to register partner');
      }
    } catch (err) { setRegisterError(t.connectionError); }
    setRegisterLoading(false);
  };

  const tierColors = { bronze: 'bg-amber-600', silver: 'bg-slate-400', gold: 'bg-yellow-500', platinum: 'bg-slate-700' };
  const statusColors = { pending: 'bg-amber-100 text-amber-800', approved: 'bg-blue-100 text-blue-800', paid: 'bg-teal-100 text-teal-800' };
  const statusText = { pending: t.pending, approved: t.approved, paid: t.paid };

  const tabs = [
    { id: 'dashboard', label: t.dashboard },
    { id: 'register', label: t.registerPartner },
    { id: 'commissions', label: t.myCommissions },
    { id: 'payments', label: t.paymentHistory },
    { id: 'howto', label: t.howItWorks }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-slate-900 text-xl font-bold">LT</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">{t.salesPortal}</h1>
              <p className="text-slate-400 text-sm">{t.legacyTranslations}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSelector lang={lang} setLang={setLang} />

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b flex justify-between items-center">
                    <h4 className="font-semibold text-slate-800">{t.notifications}</h4>
                    {unreadCount > 0 && (
                      <button onClick={markAllNotificationsRead} className="text-xs text-amber-600 hover:text-amber-800">{t.markAllRead}</button>
                    )}
                  </div>
                  {notifications.length > 0 ? (
                    <div className="divide-y">
                      {notifications.slice(0, 10).map(notif => (
                        <div key={notif.id} onClick={() => !notif.read && markNotificationRead(notif.id)}
                          className={`p-3 cursor-pointer hover:bg-slate-50 ${!notif.read ? 'bg-amber-50' : ''}`}>
                          <p className="font-medium text-slate-800 text-sm">{notif.title}</p>
                          <p className="text-xs text-slate-500">{notif.message}</p>
                          {notif.amount > 0 && <p className="text-sm font-semibold text-teal-600 mt-1">${notif.amount}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400">{t.noNotifications}</div>
                  )}
                </div>
              )}
            </div>

            <div className="text-right hidden sm:block">
              <p className="font-medium">{salesperson.name}</p>
              <p className="text-slate-400 text-sm">{salesperson.email}</p>
            </div>

            <button onClick={onLogout} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm font-medium">
              {t.logout}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto pb-px">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 font-medium transition-colors rounded-t-lg whitespace-nowrap text-sm ${
                  activeTab === tab.id ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-amber-500">
                <p className="text-slate-500 text-sm">{t.thisMonth}</p>
                <p className="text-3xl font-bold text-slate-800">{dashboard.stats.month_acquisitions}</p>
                <p className="text-xs text-slate-400">{t.partnersRegistered}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-teal-500">
                <p className="text-slate-500 text-sm">{t.pendingCommission}</p>
                <p className="text-3xl font-bold text-teal-600">${dashboard.stats.pending_commission}</p>
                <p className="text-xs text-slate-400">{t.awaitingPayment}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-slate-700">
                <p className="text-slate-500 text-sm">{t.totalEarned}</p>
                <p className="text-3xl font-bold text-slate-800">${dashboard.stats.total_paid}</p>
                <p className="text-xs text-slate-400">{t.allTime}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
                <p className="text-slate-500 text-sm">{t.totalPartners}</p>
                <p className="text-3xl font-bold text-slate-800">{dashboard.stats.total_acquisitions}</p>
                <p className="text-xs text-slate-400">{t.registeredByYou}</p>
              </div>
            </div>

            {/* Goal Progress */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-4">{t.monthlyGoal}</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">{t.progress}</span>
                    <span className="font-medium">{dashboard.current_goal.achieved} / {dashboard.current_goal.target} {t.partners}</span>
                  </div>
                  <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${dashboard.current_goal.achieved >= dashboard.current_goal.target ? 'bg-teal-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min((dashboard.current_goal.achieved / dashboard.current_goal.target) * 100, 100)}%` }} />
                  </div>
                </div>
                {dashboard.current_goal.achieved >= dashboard.current_goal.target && <span className="text-3xl">🏆</span>}
              </div>
            </div>

            {/* Recent Registrations */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-4">{t.recentRegistrations}</h3>
              {dashboard.recent_acquisitions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">{t.date}</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">{t.partner}</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">{t.tier}</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">{t.commission}</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recent_acquisitions.map(acq => (
                        <tr key={acq.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-600">{acq.acquisition_date}</td>
                          <td className="py-3 px-4 font-medium text-slate-800">{acq.partner_name}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-white text-xs font-medium ${tierColors[acq.partner_tier]}`}>{acq.partner_tier}</span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-teal-600">${acq.commission_paid}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[acq.commission_status]}`}>{statusText[acq.commission_status]}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8">{t.noRegistrations}</p>
              )}
            </div>
          </div>
        )}

        {/* Register Partner Tab */}
        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-6">{t.registerNewPartner}</h2>

              {/* Partner Referral Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-amber-800 text-sm mb-3">{t.partnerReferralNotice}</p>
                <p className="text-amber-900 text-sm font-bold bg-amber-100 px-3 py-2 rounded-lg">{t.partnerReferralImportant}</p>
              </div>

              {registerSuccess ? (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl">✓</span>
                  </div>
                  <h3 className="text-xl font-semibold text-teal-800 mb-2">{t.partnerRegistered}</h3>
                  <p className="text-teal-600 mb-4">{registerSuccess.partner.company_name} {t.addedSuccessfully}</p>
                  <div className="bg-white rounded-lg p-4 inline-block">
                    <p className="text-sm text-slate-500">{t.yourCommission}</p>
                    <p className="text-3xl font-bold text-teal-600">${registerSuccess.acquisition.commission}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegisterPartner} className="space-y-5">
                  {registerError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">{registerError}</div>}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.companyName} *</label>
                      <input type="text" value={newPartner.company_name} onChange={(e) => setNewPartner({...newPartner, company_name: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.contactName} *</label>
                      <input type="text" value={newPartner.contact_name} onChange={(e) => setNewPartner({...newPartner, contact_name: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.email} *</label>
                      <input type="email" value={newPartner.email} onChange={(e) => setNewPartner({...newPartner, email: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.phone}</label>
                      <input type="text" value={newPartner.phone} onChange={(e) => setNewPartner({...newPartner, phone: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.expectedTier} *</label>
                    <select value={newPartner.partner_tier} onChange={(e) => setNewPartner({...newPartner, partner_tier: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500">
                      <option value="bronze">{t.bronze} (1-50 {t.pagesMonth}) - $50</option>
                      <option value="silver">{t.silver} (51-150 {t.pagesMonth}) - $75</option>
                      <option value="gold">{t.gold} (151-300 {t.pagesMonth}) - $100</option>
                      <option value="platinum">{t.platinum} (300+ {t.pagesMonth}) - $150</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.notes}</label>
                    <textarea value={newPartner.notes} onChange={(e) => setNewPartner({...newPartner, notes: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500" rows={3} />
                  </div>

                  <button type="submit" disabled={registerLoading}
                    className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-600 disabled:opacity-50 shadow-lg">
                    {registerLoading ? t.registering : t.register}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && dashboard && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-4">{t.monthlyEarnings}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">{t.month}</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">{t.partners}</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">{t.commission}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.monthly_breakdown.map((month, idx) => (
                      <tr key={month.month} className={`border-b ${idx === 0 ? 'bg-amber-50' : ''}`}>
                        <td className="py-3 px-4 font-medium">{month.month}</td>
                        <td className="py-3 px-4">{month.acquisitions}</td>
                        <td className="py-3 px-4 font-semibold text-teal-600">${month.commission}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-6 text-white">
                <h4 className="text-teal-100 mb-2">{t.totalEarnedAllTime}</h4>
                <p className="text-4xl font-bold">${dashboard.stats.total_paid}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
                <h4 className="text-amber-100 mb-2">{t.pendingCommission}</h4>
                <p className="text-4xl font-bold">${dashboard.stats.pending_commission}</p>
                <p className="text-amber-100 text-sm mt-2">{t.pendingPaymentInfo}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment History Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-6 text-white">
                <h4 className="text-teal-100 mb-2">{t.totalReceived}</h4>
                <p className="text-4xl font-bold">${paymentHistory.total_paid?.toFixed(2) || '0.00'}</p>
                <p className="text-teal-100 text-sm mt-2">{t.sinceStart}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 text-white">
                <h4 className="text-slate-300 mb-2">{t.payments}</h4>
                <p className="text-4xl font-bold">{paymentHistory.payments?.length || 0}</p>
                <p className="text-slate-300 text-sm mt-2">{t.transactionsCompleted}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
                <h4 className="text-amber-100 mb-2">{t.partnersPaid}</h4>
                <p className="text-4xl font-bold">{paymentHistory.paid_acquisitions?.length || 0}</p>
                <p className="text-amber-100 text-sm mt-2">{t.commissionsPaid}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{t.paymentHistoryReceived}</h3>
              {paymentHistory.payments?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t.date}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t.value}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t.method}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t.reference}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentHistory.payments.map(payment => (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-600">{new Date(payment.paid_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</td>
                          <td className="px-4 py-3 text-lg font-semibold text-teal-600">${payment.total_amount?.toFixed(2)}</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">{payment.payment_method?.replace('_', ' ')}</span></td>
                          <td className="px-4 py-3 text-sm text-slate-500">{payment.payment_reference || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p>{t.noPaymentsYet}</p>
                  <p className="text-sm mt-2">{t.paymentsWillAppear}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* How It Works Tab */}
        {activeTab === 'howto' && commissionInfo && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-6">{t.commissionStructure}</h2>

              <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-2">{t.yourCommissionType}</h4>
                <p className="text-slate-800 text-lg font-bold">
                  {commissionInfo.commission_type === 'tier' && t.byPartnerTier}
                  {commissionInfo.commission_type === 'fixed' && `${t.fixedValue}: $${commissionInfo.commission_rate} ${t.perPartner}`}
                  {commissionInfo.commission_type === 'percentage' && `${t.percentageOfSales}: ${commissionInfo.commission_rate}%`}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(commissionInfo.tier_commissions).map(([tier, info]) => (
                  <div key={tier} className={`p-5 rounded-xl text-white ${tierColors[tier]}`}>
                    <h4 className="text-lg font-bold capitalize mb-2">{t[tier]}</h4>
                    <p className="text-white/80 text-sm mb-3">{info.pages}</p>
                    <p className="text-3xl font-bold">${info.commission}</p>
                    <p className="text-white/80 text-sm">{t.perPartner}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-6">{t.paymentInformation}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-semibold text-slate-700 mb-2">{t.paymentMethod}</h4>
                  <p className="text-slate-600">{commissionInfo.payment_info.method}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-semibold text-slate-700 mb-2">{t.paymentSchedule}</h4>
                  <p className="text-slate-600 text-sm">{commissionInfo.payment_info.schedule}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-semibold text-slate-700 mb-2">{t.minimumPayout}</h4>
                  <p className="text-slate-600">${commissionInfo.payment_info.minimum_payout}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-6">{t.howTiersWork}</h2>
              <p className="text-slate-600 mb-4">{t.tiersExplanation}</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white text-sm font-bold">B</span></div>
                  <div><strong>{t.bronze} (1-50 {t.pagesMonth})</strong><p className="text-slate-600 text-sm">{t.bronzeDesc}</p></div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-100 rounded-lg">
                  <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white text-sm font-bold">S</span></div>
                  <div><strong>{t.silver} (51-150 {t.pagesMonth})</strong><p className="text-slate-600 text-sm">{t.silverDesc}</p></div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white text-sm font-bold">G</span></div>
                  <div><strong>{t.gold} (151-300 {t.pagesMonth})</strong><p className="text-slate-600 text-sm">{t.goldDesc}</p></div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-100 rounded-lg">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white text-sm font-bold">P</span></div>
                  <div><strong>{t.platinum} (300+ {t.pagesMonth})</strong><p className="text-slate-600 text-sm">{t.platinumDesc}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ==================== MAIN APP ====================
function SalespersonApp() {
  const [token, setToken] = useState(null);
  const [salesperson, setSalesperson] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);
  const [lang, setLang] = useState(() => localStorage.getItem('salesperson_lang') || 'en');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('sales-invite')) {
      const params = new URLSearchParams(hash.split('?')[1]);
      const invite = params.get('token');
      if (invite) { setInviteToken(invite); return; }
    }
    const savedToken = localStorage.getItem('salesperson_token');
    const savedSalesperson = localStorage.getItem('salesperson');
    if (savedToken && savedSalesperson) {
      setToken(savedToken);
      setSalesperson(JSON.parse(savedSalesperson));
    }
  }, []);

  const handleLogin = (newToken, newSalesperson) => {
    setToken(newToken);
    setSalesperson(newSalesperson);
    setInviteToken(null);
    window.history.replaceState({}, '', window.location.pathname + '#/sales');
  };

  const handleLogout = () => {
    localStorage.removeItem('salesperson_token');
    localStorage.removeItem('salesperson');
    setToken(null);
    setSalesperson(null);
  };

  if (inviteToken) return <SetPasswordPage inviteToken={inviteToken} onSuccess={handleLogin} lang={lang} setLang={setLang} />;
  if (!token || !salesperson) return <SalespersonLogin onLogin={handleLogin} lang={lang} setLang={setLang} />;
  return <SalespersonPortal token={token} salesperson={salesperson} onLogout={handleLogout} lang={lang} setLang={setLang} />;
}

export default SalespersonApp;
