import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

// ==================== INTERNATIONALIZATION ====================
const TRANSLATIONS = {
  en: {
    // Login
    businessPortal: 'Business Portal (B2B)',
    corporateOnly: 'Corporate Clients Only',
    companyEmail: 'Company Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    accessPortal: 'Access Business Portal',
    createAccount: 'Create Business Account',
    pleaseWait: 'Please wait...',
    noAccount: "Don't have an account? Register",
    hasAccount: 'Already have an account? Sign In',
    notB2B: 'Not a B2B client yet?',
    contactUs: 'Contact us',
    companyName: 'Company Name',
    contactName: 'Contact Name',
    phoneOptional: 'Phone (optional)',
    // Benefits
    benefits: 'Business Account Benefits:',
    benefit1: 'Monthly invoicing - Pay at end of month',
    benefit2: 'Dedicated B2B support chat',
    benefit3: 'Priority processing',
    // Sidebar
    newOrder: 'New Order',
    savedBudgets: 'Saved Budgets',
    myOrders: 'My Orders',
    messages: 'Messages',
    welcome: 'Welcome,',
    logout: 'Logout',
    // New Order Page
    createNewOrder: 'Create New Order',
    clientInfo: 'Client Information',
    clientName: 'Client Name',
    clientEmail: 'Client Email',
    serviceType: 'Service Type',
    certifiedTranslation: 'Certified Translation',
    certifiedDesc: 'Official documents, legal, immigration',
    professionalTranslation: 'Professional Translation',
    professionalDesc: 'Business, marketing, general content',
    perPage: '/page',
    translateFrom: 'Translate From',
    translateTo: 'Translate To',
    uploadDocument: 'Upload Document',
    uploadFiles: '+ Upload File(s)',
    fileTypes: 'PDF, DOCX, Images, TXT',
    processing: 'Processing document...',
    processingNote: 'This may take a moment for large or image-based files',
    pages: 'pages',
    page: 'page',
    total: 'Total:',
    urgency: 'Urgency',
    standard: 'Standard (2-3 days)',
    priority: 'Priority (24 hours)',
    urgent: 'Urgent (12 hours)',
    reference: 'Reference (optional)',
    referencePlaceholder: 'PO number, project name...',
    notes: 'Notes (optional)',
    notesPlaceholder: 'Special instructions...',
    saveBudget: 'Save Budget',
    saving: 'Saving...',
    createOrder: 'Create Order',
    creatingOrder: 'Creating Order...',
    // Quote Summary
    quoteSummary: 'Quote Summary',
    service: 'Service',
    certified: 'Certified',
    professional: 'Professional',
    basePrice: 'Base Price',
    urgencyFee: 'Urgency Fee',
    totalPrice: 'Total',
    paymentNote: '* Payment via invoice (Net 30)',
    // Orders Page
    noOrders: 'No orders yet',
    noOrdersDesc: 'Create your first order to get started',
    all: 'All',
    pending: 'Pending',
    paid: 'Paid',
    overdue: 'Overdue',
    client: 'Client',
    words: 'words',
    due: 'Due:',
    created: 'Created',
    // Saved Budgets
    noSavedBudgets: 'No saved budgets',
    noSavedBudgetsDesc: 'Save a budget from the New Order page to see it here',
    convertToOrder: 'Convert to Order',
    delete: 'Delete',
    expires: 'Expires:',
    saved: 'Saved:',
    documents: 'Documents:',
    convertBudgetTitle: 'Convert Budget to Order',
    convertBudgetDesc: 'Enter client information to create an order from budget',
    cancel: 'Cancel',
    // Messages
    noMessages: 'No messages',
    noMessagesDesc: 'Messages from Legacy Translations will appear here',
    new: 'New',
    markAsRead: 'Mark as read',
    // Errors
    uploadFirst: 'Please upload a document first',
    fillClientInfo: 'Please fill in client name and email',
    errorOccurred: 'An error occurred',
    // Languages
    langEnglish: 'English (USA)',
    langSpanish: 'Spanish',
    langFrench: 'French',
    langGerman: 'German',
    langPortuguese: 'Portuguese (Brazil)',
    langItalian: 'Italian',
    langChinese: 'Chinese',
    langJapanese: 'Japanese',
    langKorean: 'Korean',
    langArabic: 'Arabic',
    langRussian: 'Russian',
    langDutch: 'Dutch',
  },
  pt: {
    // Login
    businessPortal: 'Portal Empresarial (B2B)',
    corporateOnly: 'Apenas Clientes Corporativos',
    companyEmail: 'E-mail Corporativo',
    password: 'Senha',
    forgotPassword: 'Esqueceu a senha?',
    accessPortal: 'Acessar Portal Empresarial',
    createAccount: 'Criar Conta Empresarial',
    pleaseWait: 'Aguarde...',
    noAccount: 'Não tem conta? Cadastre-se',
    hasAccount: 'Já tem conta? Entrar',
    notB2B: 'Ainda não é cliente B2B?',
    contactUs: 'Fale conosco',
    companyName: 'Nome da Empresa',
    contactName: 'Nome do Contato',
    phoneOptional: 'Telefone (opcional)',
    // Benefits
    benefits: 'Benefícios da Conta Empresarial:',
    benefit1: 'Faturamento mensal - Pague no final do mês',
    benefit2: 'Chat de suporte B2B dedicado',
    benefit3: 'Processamento prioritário',
    // Sidebar
    newOrder: 'Novo Pedido',
    savedBudgets: 'Orçamentos Salvos',
    myOrders: 'Meus Pedidos',
    messages: 'Mensagens',
    welcome: 'Bem-vindo(a),',
    logout: 'Sair',
    // New Order Page
    createNewOrder: 'Criar Novo Pedido',
    clientInfo: 'Informações do Cliente',
    clientName: 'Nome do Cliente',
    clientEmail: 'E-mail do Cliente',
    serviceType: 'Tipo de Serviço',
    certifiedTranslation: 'Tradução Juramentada',
    certifiedDesc: 'Documentos oficiais, jurídicos, imigração',
    professionalTranslation: 'Tradução Profissional',
    professionalDesc: 'Negócios, marketing, conteúdo geral',
    perPage: '/página',
    translateFrom: 'Traduzir De',
    translateTo: 'Traduzir Para',
    uploadDocument: 'Enviar Documento',
    uploadFiles: '+ Enviar Arquivo(s)',
    fileTypes: 'PDF, DOCX, Imagens, TXT',
    processing: 'Processando documento...',
    processingNote: 'Pode demorar um pouco para arquivos grandes ou imagens',
    pages: 'páginas',
    page: 'página',
    total: 'Total:',
    urgency: 'Urgência',
    standard: 'Padrão (2-3 dias)',
    priority: 'Prioritário (24 horas)',
    urgent: 'Urgente (12 horas)',
    reference: 'Referência (opcional)',
    referencePlaceholder: 'Nº do pedido, nome do projeto...',
    notes: 'Observações (opcional)',
    notesPlaceholder: 'Instruções especiais...',
    saveBudget: 'Salvar Orçamento',
    saving: 'Salvando...',
    createOrder: 'Criar Pedido',
    creatingOrder: 'Criando Pedido...',
    // Quote Summary
    quoteSummary: 'Resumo do Orçamento',
    service: 'Serviço',
    certified: 'Juramentada',
    professional: 'Profissional',
    basePrice: 'Preço Base',
    urgencyFee: 'Taxa de Urgência',
    totalPrice: 'Total',
    paymentNote: '* Pagamento via fatura (30 dias)',
    // Orders Page
    noOrders: 'Nenhum pedido ainda',
    noOrdersDesc: 'Crie seu primeiro pedido para começar',
    all: 'Todos',
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Atrasado',
    client: 'Cliente',
    words: 'palavras',
    due: 'Vencimento:',
    created: 'Criado',
    // Saved Budgets
    noSavedBudgets: 'Nenhum orçamento salvo',
    noSavedBudgetsDesc: 'Salve um orçamento na página Novo Pedido para vê-lo aqui',
    convertToOrder: 'Converter em Pedido',
    delete: 'Excluir',
    expires: 'Expira:',
    saved: 'Salvo:',
    documents: 'Documentos:',
    convertBudgetTitle: 'Converter Orçamento em Pedido',
    convertBudgetDesc: 'Insira as informações do cliente para criar um pedido do orçamento',
    cancel: 'Cancelar',
    // Messages
    noMessages: 'Nenhuma mensagem',
    noMessagesDesc: 'Mensagens da Legacy Translations aparecerão aqui',
    new: 'Nova',
    markAsRead: 'Marcar como lida',
    // Errors
    uploadFirst: 'Por favor, envie um documento primeiro',
    fillClientInfo: 'Por favor, preencha o nome e e-mail do cliente',
    errorOccurred: 'Ocorreu um erro',
    // Languages
    langEnglish: 'Inglês (EUA)',
    langSpanish: 'Espanhol',
    langFrench: 'Francês',
    langGerman: 'Alemão',
    langPortuguese: 'Português (Brasil)',
    langItalian: 'Italiano',
    langChinese: 'Chinês',
    langJapanese: 'Japonês',
    langKorean: 'Coreano',
    langArabic: 'Árabe',
    langRussian: 'Russo',
    langDutch: 'Holandês',
  },
  es: {
    // Login
    businessPortal: 'Portal Empresarial (B2B)',
    corporateOnly: 'Solo Clientes Corporativos',
    companyEmail: 'Correo Corporativo',
    password: 'Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    accessPortal: 'Acceder al Portal Empresarial',
    createAccount: 'Crear Cuenta Empresarial',
    pleaseWait: 'Espere...',
    noAccount: '¿No tienes cuenta? Regístrate',
    hasAccount: '¿Ya tienes cuenta? Iniciar Sesión',
    notB2B: '¿Aún no eres cliente B2B?',
    contactUs: 'Contáctanos',
    companyName: 'Nombre de la Empresa',
    contactName: 'Nombre del Contacto',
    phoneOptional: 'Teléfono (opcional)',
    // Benefits
    benefits: 'Beneficios de la Cuenta Empresarial:',
    benefit1: 'Facturación mensual - Paga a fin de mes',
    benefit2: 'Chat de soporte B2B dedicado',
    benefit3: 'Procesamiento prioritario',
    // Sidebar
    newOrder: 'Nuevo Pedido',
    savedBudgets: 'Presupuestos Guardados',
    myOrders: 'Mis Pedidos',
    messages: 'Mensajes',
    welcome: 'Bienvenido(a),',
    logout: 'Cerrar Sesión',
    // New Order Page
    createNewOrder: 'Crear Nuevo Pedido',
    clientInfo: 'Información del Cliente',
    clientName: 'Nombre del Cliente',
    clientEmail: 'Correo del Cliente',
    serviceType: 'Tipo de Servicio',
    certifiedTranslation: 'Traducción Certificada',
    certifiedDesc: 'Documentos oficiales, legales, inmigración',
    professionalTranslation: 'Traducción Profesional',
    professionalDesc: 'Negocios, marketing, contenido general',
    perPage: '/página',
    translateFrom: 'Traducir De',
    translateTo: 'Traducir A',
    uploadDocument: 'Subir Documento',
    uploadFiles: '+ Subir Archivo(s)',
    fileTypes: 'PDF, DOCX, Imágenes, TXT',
    processing: 'Procesando documento...',
    processingNote: 'Puede tomar un momento para archivos grandes o imágenes',
    pages: 'páginas',
    page: 'página',
    total: 'Total:',
    urgency: 'Urgencia',
    standard: 'Estándar (2-3 días)',
    priority: 'Prioritario (24 horas)',
    urgent: 'Urgente (12 horas)',
    reference: 'Referencia (opcional)',
    referencePlaceholder: 'Nº de orden, nombre del proyecto...',
    notes: 'Notas (opcional)',
    notesPlaceholder: 'Instrucciones especiales...',
    saveBudget: 'Guardar Presupuesto',
    saving: 'Guardando...',
    createOrder: 'Crear Pedido',
    creatingOrder: 'Creando Pedido...',
    // Quote Summary
    quoteSummary: 'Resumen del Presupuesto',
    service: 'Servicio',
    certified: 'Certificada',
    professional: 'Profesional',
    basePrice: 'Precio Base',
    urgencyFee: 'Cargo por Urgencia',
    totalPrice: 'Total',
    paymentNote: '* Pago mediante factura (30 días)',
    // Orders Page
    noOrders: 'Sin pedidos todavía',
    noOrdersDesc: 'Crea tu primer pedido para comenzar',
    all: 'Todos',
    pending: 'Pendiente',
    paid: 'Pagado',
    overdue: 'Vencido',
    client: 'Cliente',
    words: 'palabras',
    due: 'Vence:',
    created: 'Creado',
    // Saved Budgets
    noSavedBudgets: 'Sin presupuestos guardados',
    noSavedBudgetsDesc: 'Guarda un presupuesto en la página Nuevo Pedido para verlo aquí',
    convertToOrder: 'Convertir en Pedido',
    delete: 'Eliminar',
    expires: 'Expira:',
    saved: 'Guardado:',
    documents: 'Documentos:',
    convertBudgetTitle: 'Convertir Presupuesto en Pedido',
    convertBudgetDesc: 'Ingresa la información del cliente para crear un pedido del presupuesto',
    cancel: 'Cancelar',
    // Messages
    noMessages: 'Sin mensajes',
    noMessagesDesc: 'Los mensajes de Legacy Translations aparecerán aquí',
    new: 'Nuevo',
    markAsRead: 'Marcar como leído',
    // Errors
    uploadFirst: 'Por favor, sube un documento primero',
    fillClientInfo: 'Por favor, completa el nombre y correo del cliente',
    errorOccurred: 'Ocurrió un error',
    // Languages
    langEnglish: 'Inglés (EUA)',
    langSpanish: 'Español',
    langFrench: 'Francés',
    langGerman: 'Alemán',
    langPortuguese: 'Portugués (Brasil)',
    langItalian: 'Italiano',
    langChinese: 'Chino',
    langJapanese: 'Japonés',
    langKorean: 'Coreano',
    langArabic: 'Árabe',
    langRussian: 'Ruso',
    langDutch: 'Holandés',
  }
};

// Currency configuration
const CURRENCIES = {
  USD: { symbol: '$', code: 'USD', rate: 1, locale: 'en-US' },
  BRL: { symbol: 'R$', code: 'BRL', rate: 6.10, locale: 'pt-BR' },
  EUR: { symbol: '€', code: 'EUR', rate: 0.92, locale: 'es-ES' }
};

// Locale Context
const LocaleContext = createContext();

const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
};

// Detect user's locale from browser
const detectUserLocale = () => {
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  const langCode = browserLang.split('-')[0].toLowerCase();

  // Map browser language to our supported languages
  if (langCode === 'pt') return { lang: 'pt', currency: 'BRL' };
  if (langCode === 'es') return { lang: 'es', currency: 'USD' };
  return { lang: 'en', currency: 'USD' };
};

const LocaleProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    const saved = localStorage.getItem('locale');
    if (saved) return JSON.parse(saved);
    return detectUserLocale();
  });

  useEffect(() => {
    localStorage.setItem('locale', JSON.stringify(locale));
  }, [locale]);

  const t = (key) => {
    return TRANSLATIONS[locale.lang]?.[key] || TRANSLATIONS.en[key] || key;
  };

  const formatPrice = (priceUSD) => {
    const currency = CURRENCIES[locale.currency];
    const convertedPrice = priceUSD * currency.rate;
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code
    }).format(convertedPrice);
  };

  const formatPricePerPage = (priceUSD) => {
    const currency = CURRENCIES[locale.currency];
    const convertedPrice = priceUSD * currency.rate;
    const formatted = new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code
    }).format(convertedPrice);
    return `${formatted}${t('perPage')}`;
  };

  const setLanguage = (lang) => {
    setLocale(prev => ({ ...prev, lang }));
  };

  const setCurrency = (currency) => {
    setLocale(prev => ({ ...prev, currency }));
  };

  return (
    <LocaleContext.Provider value={{
      locale,
      setLocale,
      setLanguage,
      setCurrency,
      t,
      formatPrice,
      formatPricePerPage,
      availableLanguages: ['en', 'pt', 'es'],
      availableCurrencies: Object.keys(CURRENCIES)
    }}>
      {children}
    </LocaleContext.Provider>
  );
};

// Language Selector Component (with currency - for internal pages)
const LanguageSelector = () => {
  const { locale, setLanguage, setCurrency } = useLocale();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ];

  const currencies = [
    { code: 'USD', name: 'USD ($)' },
    { code: 'BRL', name: 'BRL (R$)' },
    { code: 'EUR', name: 'EUR (€)' }
  ];

  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        value={locale.lang}
        onChange={(e) => setLanguage(e.target.value)}
        className="bg-transparent border border-gray-300 rounded px-2 py-1 text-gray-700 focus:ring-2 focus:ring-teal-500 cursor-pointer"
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <select
        value={locale.currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="bg-transparent border border-gray-300 rounded px-2 py-1 text-gray-700 focus:ring-2 focus:ring-teal-500 cursor-pointer"
      >
        {currencies.map(curr => (
          <option key={curr.code} value={curr.code}>
            {curr.name}
          </option>
        ))}
      </select>
    </div>
  );
};

// Simple Flag Selector for Login Page (small flags at top)
const FlagSelector = () => {
  const { locale, setLanguage } = useLocale();

  const languages = [
    { code: 'en', flag: '🇺🇸' },
    { code: 'es', flag: '🇪🇸' },
    { code: 'pt', flag: '🇧🇷' }
  ];

  return (
    <div className="flex items-center gap-1">
      {languages.map(lang => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`text-base transition-opacity ${
            locale.lang === lang.code ? 'opacity-100' : 'opacity-40 hover:opacity-70'
          }`}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
};

// Translation stages
const TRANSLATION_STAGES = {
  'received': { id: 1, name: 'Received', icon: '📥' },
  'in_translation': { id: 2, name: 'In Translation', icon: '✍️' },
  'review': { id: 3, name: 'Review', icon: '🔍' },
  'ready': { id: 4, name: 'Ready', icon: '📦' },
  'delivered': { id: 5, name: 'Delivered', icon: '🎉' }
};

// Payment status colors
const PAYMENT_STATUS = {
  'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  'paid': { color: 'bg-green-100 text-green-800', label: 'Paid' },
  'overdue': { color: 'bg-red-100 text-red-800', label: 'Overdue' }
};

// Languages list
const LANGUAGES = [
  { code: 'english', name: 'English (USA)', flag: '🇺🇸' },
  { code: 'spanish', name: 'Spanish', flag: '🇪🇸' },
  { code: 'french', name: 'French', flag: '🇫🇷' },
  { code: 'german', name: 'German', flag: '🇩🇪' },
  { code: 'portuguese', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'italian', name: 'Italian', flag: '🇮🇹' },
  { code: 'chinese', name: 'Chinese', flag: '🇨🇳' },
  { code: 'japanese', name: 'Japanese', flag: '🇯🇵' },
  { code: 'korean', name: 'Korean', flag: '🇰🇷' },
  { code: 'arabic', name: 'Arabic', flag: '🇸🇦' },
  { code: 'russian', name: 'Russian', flag: '🇷🇺' },
  { code: 'dutch', name: 'Dutch', flag: '🇳🇱' }
];

// ==================== LOGIN PAGE ====================
const LoginPage = ({ onLogin, onRegister }) => {
  const { t } = useLocale();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    company_name: '',
    contact_name: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await axios.post(`${API}/auth/login`, {
          email: formData.email,
          password: formData.password
        });
        onLogin(response.data);
      } else {
        const response = await axios.post(`${API}/auth/register`, {
          email: formData.email,
          password: formData.password,
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          phone: formData.phone
        });
        onLogin(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative">
        {/* Language Flags - Top Right */}
        <div className="absolute top-4 right-4">
          <FlagSelector />
        </div>

        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
            alt="Legacy Translations"
            className="mx-auto mb-4 h-16"
          />
        </div>

        {/* Title and Badge */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('businessPortal')}</h1>
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full uppercase tracking-wide">
            {t('corporateOnly')}
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('companyName')}</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="Your Company Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('contactName')}</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('phoneOptional')}</label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('companyEmail')}</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {isLogin && (
            <div className="text-right">
              <a href="#" className="text-sm text-teal-600 hover:text-teal-700 hover:underline">
                {t('forgotPassword')}
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 font-semibold shadow-md transition-all"
          >
            {loading ? t('pleaseWait') : (isLogin ? t('accessPortal') : t('createAccount'))}
          </button>
        </form>

        {/* Business Account Benefits */}
        {isLogin && (
          <div className="mt-6 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('benefits')}</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-teal-500 mr-2">*</span>
                <span>{t('benefit1')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-500 mr-2">*</span>
                <span>{t('benefit2')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-500 mr-2">*</span>
                <span>{t('benefit3')}</span>
              </li>
            </ul>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-teal-600 hover:text-teal-700 hover:underline text-sm font-medium"
          >
            {isLogin ? t('noAccount') : t('hasAccount')}
          </button>
        </div>

        {/* Contact link for non-B2B clients */}
        {isLogin && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              {t('notB2B')}{' '}
              <a href="https://legacytranslations.com/contact" className="text-teal-600 hover:text-teal-700 hover:underline font-medium">
                {t('contactUs')}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== SIDEBAR ====================
const Sidebar = ({ activeTab, setActiveTab, partner, onLogout }) => {
  const { t } = useLocale();
  const menuItems = [
    { id: 'new-order', label: t('newOrder'), icon: '➕' },
    { id: 'saved-budgets', label: t('savedBudgets'), icon: '💾' },
    { id: 'orders', label: t('myOrders'), icon: '📋' },
    { id: 'messages', label: t('messages'), icon: '✉️' }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4">
        <img
          src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
          alt="Legacy Translations"
          className="w-40 h-auto mb-4"
        />
        <div className="text-sm text-gray-600 mb-2">{t('welcome')}</div>
        <div className="font-semibold text-gray-800">{partner?.company_name}</div>
      </div>

      <nav className="flex-1 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
              activeTab === item.id
                ? 'text-teal-600 bg-teal-50 border-r-4 border-teal-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="mr-3">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={onLogout}
          className="w-full py-2 text-red-600 hover:bg-red-50 rounded-md"
        >
          {t('logout')}
        </button>
      </div>
    </div>
  );
};

// ==================== NEW ORDER PAGE ====================
const NewOrderPage = ({ partner, token, onOrderCreated, onSaveBudget }) => {
  const { t, formatPrice, formatPricePerPage } = useLocale();
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    service_type: 'standard',
    translate_from: 'portuguese',
    translate_to: 'english',
    urgency: 'no',
    reference: '',
    notes: ''
  });
  const [wordCount, setWordCount] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quote, setQuote] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calculate quote when relevant fields change
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      calculateQuote();
    }
  }, [uploadedFiles, formData.service_type, formData.urgency]);

  const calculateQuote = () => {
    let basePrice = 0;
    // Sum individual file pages instead of calculating from total words
    const pages = uploadedFiles.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.wordCount / 250)), 0);

    if (formData.service_type === 'standard') {
      basePrice = pages * 24.99;  // Certified Translation
    } else {
      basePrice = pages * 19.99;  // Professional Translation
    }

    let urgencyFee = 0;
    if (formData.urgency === 'priority') {
      urgencyFee = basePrice * 0.25;
    } else if (formData.urgency === 'urgent') {
      urgencyFee = basePrice * 1.0;
    }

    setQuote({
      base_price: basePrice,
      urgency_fee: urgencyFee,
      total_price: basePrice + urgencyFee,
      pages: pages
    });
  };

  const [processingStatus, setProcessingStatus] = useState('');

  // File upload handler - accumulates files and word counts
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    setError('');
    setProcessingStatus('Connecting to server...');

    try {
      let newWords = 0;
      const newFiles = [];

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setProcessingStatus(`Processing ${file.name} (${i + 1}/${acceptedFiles.length})...`);

        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const response = await axios.post(`${API}/upload-document?token=${token}`, formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000 // 2 minute timeout for OCR processing
        });

        if (response.data?.word_count) {
          newWords += response.data.word_count;
          newFiles.push({
            fileName: file.name,
            wordCount: response.data.word_count,
            documentId: response.data.document_id
          });
        }
      }

      // Add new files to existing files (accumulate) - store with word counts and document IDs
      setUploadedFiles(prev => [...prev, ...newFiles]);
      setWordCount(prev => prev + newWords);
      setProcessingStatus('');
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Processing timed out. The file might be too large or complex. Please try a smaller file.');
      } else {
        setError('Error processing document. Please try again.');
      }
      console.error('Upload error:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  }, [token]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: true
  });

  const handleSaveBudget = async () => {
    if (wordCount === 0) {
      setError('Please upload a document first');
      return;
    }

    setSavingBudget(true);
    setError('');

    try {
      const budgetData = {
        service_type: formData.service_type,
        translate_from: formData.translate_from,
        translate_to: formData.translate_to,
        word_count: wordCount,
        urgency: formData.urgency,
        notes: formData.notes,
        document_ids: uploadedFiles.map(f => f.documentId).filter(Boolean),
        files_info: uploadedFiles.map(f => ({ fileName: f.fileName, wordCount: f.wordCount }))
      };

      const response = await axios.post(`${API}/partner/budgets/save?token=${token}`, budgetData);

      setSuccess(`Budget saved successfully! Reference: ${response.data.budget.reference}`);

      if (onSaveBudget) {
        onSaveBudget(response.data.budget);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save budget');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client_name || !formData.client_email) {
      setError('Please fill in client name and email');
      return;
    }

    if (wordCount === 0) {
      setError('Please upload a document first');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const orderData = {
        ...formData,
        word_count: wordCount,
        document_filename: uploadedFiles[0]?.fileName || null,
        document_ids: uploadedFiles.map(f => f.documentId).filter(Boolean)
      };

      const response = await axios.post(`${API}/orders/create?token=${token}`, orderData);

      setSuccess(`Order ${response.data.order.order_number} created successfully!`);

      // Reset form
      setFormData({
        client_name: '',
        client_email: '',
        service_type: 'standard',
        translate_from: 'portuguese',
        translate_to: 'english',
        urgency: 'no',
        reference: '',
        notes: ''
      });
      setWordCount(0);
      setUploadedFiles([]);
      setQuote(null);

      if (onOrderCreated) {
        onOrderCreated(response.data.order);
      }

    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('createNewOrder')}</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{success}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">

            {/* Client Information */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('clientInfo')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('clientName')} *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('clientEmail')} *
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                    value={formData.client_email}
                    onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                    placeholder="client@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Service Type */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('serviceType')}</h2>
              <div className="space-y-3">
                <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                  formData.service_type === 'standard' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="service_type"
                    value="standard"
                    checked={formData.service_type === 'standard'}
                    onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{t('certifiedTranslation')}</div>
                    <div className="text-sm text-gray-500">{t('certifiedDesc')}</div>
                  </div>
                  <div className="font-semibold text-teal-600">{formatPricePerPage(24.99)}</div>
                </label>

                <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                  formData.service_type === 'professional' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="service_type"
                    value="professional"
                    checked={formData.service_type === 'professional'}
                    onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{t('professionalTranslation')}</div>
                    <div className="text-sm text-gray-500">{t('professionalDesc')}</div>
                  </div>
                  <div className="font-semibold text-teal-600">{formatPricePerPage(19.99)}</div>
                </label>
              </div>
            </div>

            {/* Languages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('translateFrom')}</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  value={formData.translate_from}
                  onChange={(e) => setFormData({...formData, translate_from: e.target.value})}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('translateTo')}</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  value={formData.translate_to}
                  onChange={(e) => setFormData({...formData, translate_to: e.target.value})}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('uploadDocument')}</h2>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-500'
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-3xl mb-2">📁</div>
                <div className="font-medium text-teal-600">{t('uploadFiles')}</div>
                <div className="text-sm text-gray-500">{t('fileTypes')}</div>
              </div>

              {isProcessing && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <div className="text-blue-800 font-medium">{processingStatus || t('processing')}</div>
                  <div className="text-xs text-blue-600 mt-1">{t('processingNote')}</div>
                </div>
              )}

              {uploadedFiles.length > 0 && !isProcessing && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((item, i) => {
                    const pages = Math.max(1, Math.ceil(item.wordCount / 250));
                    return (
                      <div key={i} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="text-green-600 mr-2">✓</span>
                          <span>{item.fileName}</span>
                          <span className="text-gray-400 text-sm ml-2">({pages} {pages === 1 ? t('page') : t('pages')})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const removedWordCount = item.wordCount;
                            const newFiles = uploadedFiles.filter((_, index) => index !== i);
                            setUploadedFiles(newFiles);
                            setWordCount(prev => Math.max(0, prev - removedWordCount));
                            if (newFiles.length === 0) {
                              setQuote(null);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove file"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                  <div className="text-lg font-semibold text-teal-600">
                    {t('total')} {uploadedFiles.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.wordCount / 250)), 0)} {uploadedFiles.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.wordCount / 250)), 0) === 1 ? t('page') : t('pages')}
                  </div>
                </div>
              )}
            </div>

            {/* Urgency */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('urgency')}</h2>
              <div className="space-y-2">
                {[
                  { id: 'no', labelKey: 'standard', fee: '' },
                  { id: 'priority', labelKey: 'priority', fee: '+25%' },
                  { id: 'urgent', labelKey: 'urgent', fee: '+100%' }
                ].map((option) => (
                  <label key={option.id} className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="urgency"
                      value={option.id}
                      checked={formData.urgency === option.id}
                      onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                      className="mr-3"
                    />
                    <span className="flex-1">{t(option.labelKey)}</span>
                    {option.fee && <span className="text-orange-600 font-medium">{option.fee}</span>}
                  </label>
                ))}
              </div>
            </div>

            {/* Reference & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reference')}</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  placeholder={t('referencePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder={t('notesPlaceholder')}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleSaveBudget}
                disabled={savingBudget || wordCount === 0}
                className="flex-1 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 font-semibold"
              >
                {savingBudget ? t('saving') : `💾 ${t('saveBudget')}`}
              </button>
              <button
                type="submit"
                disabled={submitting || wordCount === 0}
                className="flex-1 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-400 font-semibold"
              >
                {submitting ? t('creatingOrder') : t('createOrder')}
              </button>
            </div>
          </form>
        </div>

        {/* Quote Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 h-fit sticky top-8">
          <h2 className="text-xl font-bold text-teal-600 mb-4">{t('quoteSummary')}</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('service')}</span>
              <span className="font-medium">
                {formData.service_type === 'standard' ? t('certified') : t('professional')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('pages')}</span>
              <span className="font-medium">{quote?.pages || 0}</span>
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('basePrice')}</span>
                <span className="font-medium">{formatPrice(quote?.base_price || 0)}</span>
              </div>
              {quote?.urgency_fee > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>{t('urgencyFee')}</span>
                  <span>{formatPrice(quote.urgency_fee)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-lg">
                <span className="font-bold">{t('totalPrice')}</span>
                <span className="font-bold text-teal-600">{formatPrice(quote?.total_price || 0)}</span>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-4">
              {t('paymentNote')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== ORDERS LIST PAGE ====================
const OrdersPage = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const params = filter !== 'all' ? `&status=${filter}` : '';
      const response = await axios.get(`${API}/orders?token=${token}${params}`);
      setOrders(response.data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = PAYMENT_STATUS[status] || PAYMENT_STATUS.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    );
  };

  const getTranslationBadge = (status) => {
    const stage = TRANSLATION_STAGES[status] || TRANSLATION_STAGES.received;
    return (
      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
        {stage.icon} {stage.name}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Orders</h1>
        <div className="flex gap-2">
          {['all', 'pending', 'paid', 'overdue'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No orders yet</h2>
          <p className="text-gray-600">Create your first order to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div
                className="p-6 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-teal-600">#{order.order_number}</span>
                        {getTranslationBadge(order.translation_status)}
                        {getStatusBadge(order.payment_status)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Client: {order.client_name} ({order.client_email})
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.translate_from} → {order.translate_to} | {order.word_count} words
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-800">${order.total_price?.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">
                      Due: {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder === order.id && (
                <div className="border-t bg-gray-50 p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Service</div>
                      <div className="font-medium">{order.service_type === 'standard' ? 'Certified' : 'Professional'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Created</div>
                      <div className="font-medium">{new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Base Price</div>
                      <div className="font-medium">${order.base_price?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Urgency Fee</div>
                      <div className="font-medium">${order.urgency_fee?.toFixed(2)}</div>
                    </div>
                  </div>
                  {order.reference && (
                    <div className="mt-4">
                      <div className="text-sm text-gray-500">Reference</div>
                      <div className="font-medium">{order.reference}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== MESSAGES PAGE ====================
const MessagesPage = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/messages?token=${token}`);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await axios.put(`${API}/messages/${messageId}/read?token=${token}`);
      setMessages(messages.map(msg =>
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'delivery': return '🎉';
      case 'status': return '📋';
      case 'payment': return '💳';
      default: return '✉️';
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Messages</h1>

      {messages.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No messages</h2>
          <p className="text-gray-600">Messages from Legacy Translations will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
                message.read ? 'border-gray-300' : 'border-teal-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">{getMessageIcon(message.type)}</div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className={`font-semibold ${message.read ? 'text-gray-600' : 'text-gray-800'}`}>
                        {message.title}
                      </h3>
                      {!message.read && (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">New</span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">{message.content}</p>
                    <p className="text-sm text-gray-400 mt-2">{formatDate(message.created_at)}</p>
                  </div>
                </div>
                {!message.read && (
                  <button
                    onClick={() => markAsRead(message.id)}
                    className="text-sm text-teal-600 hover:text-teal-800"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== SAVED BUDGETS PAGE ====================
const SavedBudgetsPage = ({ token, onConvertToOrder }) => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [convertModalBudget, setConvertModalBudget] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const response = await axios.get(`${API}/partner/budgets?token=${token}`);
      setBudgets(response.data.budgets || []);
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (budgetId) => {
    if (!window.confirm('Are you sure you want to delete this saved budget?')) return;

    try {
      await axios.delete(`${API}/partner/budgets/${budgetId}?token=${token}`);
      setBudgets(budgets.filter(b => b.id !== budgetId));
    } catch (err) {
      console.error('Failed to delete budget:', err);
    }
  };

  const handleConvertToOrder = async () => {
    if (!clientName || !clientEmail) {
      alert('Please fill in client name and email');
      return;
    }

    setConverting(true);
    try {
      const response = await axios.post(
        `${API}/partner/budgets/${convertModalBudget.id}/convert?token=${token}&client_name=${encodeURIComponent(clientName)}&client_email=${encodeURIComponent(clientEmail)}`
      );
      if (onConvertToOrder) {
        onConvertToOrder(response.data.order);
      }
      setConvertModalBudget(null);
      setClientName('');
      setClientEmail('');
      fetchBudgets();
    } catch (err) {
      console.error('Failed to convert budget to order:', err);
      alert('Failed to convert budget to order');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading saved budgets...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Saved Budgets</h1>

      {/* Convert Modal */}
      {convertModalBudget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Convert Budget to Order</h2>
            <p className="text-gray-600 mb-4">
              Enter client information to create an order from budget <strong>#{convertModalBudget.reference}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Email *</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@email.com"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setConvertModalBudget(null);
                  setClientName('');
                  setClientEmail('');
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToOrder}
                disabled={converting || !clientName || !clientEmail}
                className="flex-1 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-400 font-medium"
              >
                {converting ? 'Converting...' : 'Create Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">💾</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No saved budgets</h2>
          <p className="text-gray-600">Save a budget from the New Order page to see it here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => (
            <div key={budget.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div
                className="p-6 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedBudget(selectedBudget === budget.id ? null : budget.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-teal-600">#{budget.reference}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        budget.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {budget.status || 'Active'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {budget.translate_from} → {budget.translate_to}
                    </div>
                    <div className="text-sm text-gray-500">
                      {budget.word_count} words | {Math.ceil(budget.word_count / 250)} pages
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-800">${budget.total_price?.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">
                      Saved: {new Date(budget.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {selectedBudget === budget.id && (
                <div className="border-t bg-gray-50 p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-500">Service</div>
                      <div className="font-medium">{budget.service_type === 'standard' ? 'Certified' : 'Professional'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Urgency</div>
                      <div className="font-medium capitalize">{budget.urgency === 'no' ? 'Standard' : budget.urgency}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Base Price</div>
                      <div className="font-medium">${budget.base_price?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Urgency Fee</div>
                      <div className="font-medium">${(budget.urgency_fee || 0).toFixed(2)}</div>
                    </div>
                  </div>

                  {budget.files_info && budget.files_info.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-500 mb-2">Documents:</div>
                      {budget.files_info.map((file, i) => (
                        <div key={i} className="text-sm text-gray-700">
                          - {file.fileName} ({Math.ceil(file.wordCount / 250)} pages)
                        </div>
                      ))}
                    </div>
                  )}

                  {budget.expires_at && (
                    <div className="mb-4 text-sm text-gray-500">
                      Expires: {new Date(budget.expires_at).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setConvertModalBudget(budget)}
                      className="flex-1 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium"
                    >
                      Convert to Order
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== MAIN APP CONTENT ====================
function AppContent() {
  const { t } = useLocale();
  const [partner, setPartner] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('new-order');

  // Check for saved session
  useEffect(() => {
    const savedPartner = localStorage.getItem('partner');
    const savedToken = localStorage.getItem('token');
    if (savedPartner && savedToken) {
      setPartner(JSON.parse(savedPartner));
      setToken(savedToken);
    }
  }, []);

  const handleLogin = (data) => {
    setPartner(data);
    setToken(data.token);
    localStorage.setItem('partner', JSON.stringify(data));
    localStorage.setItem('token', data.token);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout?token=${token}`);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setPartner(null);
    setToken(null);
    localStorage.removeItem('partner');
    localStorage.removeItem('token');
  };

  const getTabTitle = (tab) => {
    const titles = {
      'new-order': t('newOrder'),
      'saved-budgets': t('savedBudgets'),
      'orders': t('myOrders'),
      'messages': t('messages')
    };
    return titles[tab] || tab;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'new-order':
        return (
          <NewOrderPage
            partner={partner}
            token={token}
            onOrderCreated={() => setActiveTab('orders')}
            onSaveBudget={() => setActiveTab('saved-budgets')}
          />
        );
      case 'saved-budgets':
        return <SavedBudgetsPage token={token} onConvertToOrder={() => setActiveTab('orders')} />;
      case 'orders':
        return <OrdersPage token={token} />;
      case 'messages':
        return <MessagesPage token={token} />;
      default:
        return <NewOrderPage partner={partner} token={token} />;
    }
  };

  if (!partner) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        partner={partner}
        onLogout={handleLogout}
      />
      <div className="flex-1">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">
              {getTabTitle(activeTab)}
            </h1>
            <div className="flex items-center gap-4">
              <LanguageSelector />
              <div className="text-sm text-gray-600">
                {partner?.contact_name} | {partner?.company_name}
              </div>
            </div>
          </div>
        </header>
        {renderContent()}
      </div>
    </div>
  );
}

// ==================== MAIN APP WITH LOCALE PROVIDER ====================
function App() {
  return (
    <LocaleProvider>
      <AppContent />
    </LocaleProvider>
  );
}

export default App;
