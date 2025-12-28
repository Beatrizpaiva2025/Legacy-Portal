import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ==================== INTERNATIONALIZATION ====================
const TRANSLATIONS = {
  en: {
    // Login
    businessPortal: 'Business Portal (B2B)',
    corporateOnly: 'Corporate Clients Only',
    companyEmail: 'Company Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    resetPassword: 'Reset Password',
    resetPasswordDesc: 'Enter your email and we will send you a link to reset your password.',
    sendResetLink: 'Send Reset Link',
    resetEmailSent: 'If an account exists with this email, you will receive a password reset link.',
    backToLogin: 'Back to Login',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    passwordChanged: 'Password changed successfully! You can now log in.',
    passwordMismatch: 'Passwords do not match',
    invalidResetLink: 'Invalid or expired reset link',
    accessPortal: 'Access Business Portal',
    createAccount: 'Create Business Account',
    pleaseWait: 'Please wait...',
    noAccount: "Don't have an account? Register",
    haveAccount: 'Already have an account? Sign In',
    notB2B: 'Not a B2B client yet?',
    contactUs: 'Contact us',
    companyName: 'Company Name',
    contactName: 'Contact Name',
    phoneOptional: 'Phone (optional)',
    errorOccurred: 'An error occurred',
    // Benefits
    benefits: 'Business Account Benefits:',
    benefit1: 'Monthly invoicing',
    benefit2: 'Dedicated B2B support chat',
    benefit3: 'Priority processing',
    benefit4: 'Exclusive: Digital Verification with QR Code',
    // Navigation
    newOrder: 'New Order',
    createNewOrder: 'Create New Order',
    myOrders: 'My Orders',
    messages: 'Messages',
    welcome: 'Welcome',
    logout: 'Logout',
    // Service Types
    serviceType: 'Service Type',
    certifiedTranslation: 'Certified Translation',
    certifiedDesc: 'Official documents, USCIS, legal purposes',
    professionalTranslation: 'Professional Translation',
    professionalDesc: 'Business, marketing, general content',
    translateFrom: 'Translate From',
    translateTo: 'Translate To',
    uploadDocument: 'Upload Document',
    uploadFiles: '+ Upload File(s)',
    fileTypes: 'PDF, DOCX, Images, TXT',
    processing: 'Processing document...',
    processingNote: 'This may take a moment for large or image-based files',
    page: 'page',
    pages: 'pages',
    total: 'Total',
    urgency: 'Urgency',
    standard: 'Standard (2-3 days)',
    priority: 'Priority (24 hours)',
    urgent: 'Urgent (12 hours)',
    reference: 'Reference (optional)',
    referencePlaceholder: 'PO number, project name...',
    notes: 'Notes (optional)',
    notesPlaceholder: 'Special instructions...',
    getQuote: 'Get Quote',
    yourQuote: 'Your Quote',
    basePrice: 'Base Price',
    urgencyFee: 'Urgency Fee',
    totalPrice: 'Total',
    estimatedDelivery: 'Estimated Delivery',
    submitOrder: 'Submit Order',
    submitting: 'Submitting...',
    orderSuccess: 'Order submitted successfully!',
    signIn: 'Sign in to your account',
    email: 'Email',
    phone: 'Phone',
    login: 'Log In',
    register: 'Register'
  },
  es: {
    // Login
    businessPortal: 'Portal Empresarial (B2B)',
    corporateOnly: 'Solo Clientes Corporativos',
    companyEmail: 'Correo Corporativo',
    password: 'Contraseña',
    forgotPassword: '¿Olvidó su contraseña?',
    resetPassword: 'Restablecer Contraseña',
    resetPasswordDesc: 'Ingrese su correo y le enviaremos un enlace para restablecer su contraseña.',
    sendResetLink: 'Enviar Enlace',
    resetEmailSent: 'Si existe una cuenta con este correo, recibirá un enlace para restablecer su contraseña.',
    backToLogin: 'Volver al Inicio',
    newPassword: 'Nueva Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    passwordChanged: '¡Contraseña cambiada con éxito! Ya puede iniciar sesión.',
    passwordMismatch: 'Las contraseñas no coinciden',
    invalidResetLink: 'Enlace de restablecimiento inválido o expirado',
    accessPortal: 'Acceder al Portal',
    createAccount: 'Crear Cuenta Empresarial',
    pleaseWait: 'Espere...',
    noAccount: '¿No tiene cuenta? Regístrese',
    haveAccount: '¿Ya tiene cuenta? Inicie sesión',
    notB2B: '¿Aún no es cliente B2B?',
    contactUs: 'Contáctenos',
    companyName: 'Nombre de Empresa',
    contactName: 'Nombre de Contacto',
    phoneOptional: 'Teléfono (opcional)',
    errorOccurred: 'Ocurrió un error',
    benefits: 'Beneficios de la Cuenta Empresarial:',
    benefit1: 'Facturación mensual',
    benefit2: 'Chat de soporte B2B dedicado',
    benefit3: 'Procesamiento prioritario',
    benefit4: 'Exclusivo: Verificación Digital con Código QR',
    // Navigation
    newOrder: 'Nuevo Pedido',
    createNewOrder: 'Crear Nuevo Pedido',
    myOrders: 'Mis Pedidos',
    messages: 'Mensajes',
    welcome: 'Bienvenido',
    logout: 'Cerrar Sesión',
    serviceType: 'Tipo de Servicio',
    certifiedTranslation: 'Traducción Certificada',
    certifiedDesc: 'Documentos oficiales, USCIS, propósitos legales',
    professionalTranslation: 'Traducción Profesional',
    professionalDesc: 'Negocios, marketing, contenido general',
    translateFrom: 'Traducir De',
    translateTo: 'Traducir A',
    uploadDocument: 'Subir Documento',
    uploadFiles: '+ Subir Archivo(s)',
    fileTypes: 'PDF, DOCX, Imágenes, TXT',
    processing: 'Procesando documento...',
    processingNote: 'Esto puede tardar un momento para archivos grandes',
    page: 'página',
    pages: 'páginas',
    total: 'Total',
    urgency: 'Urgencia',
    standard: 'Estándar (2-3 días)',
    priority: 'Prioridad (24 horas)',
    urgent: 'Urgente (12 horas)',
    reference: 'Referencia (opcional)',
    referencePlaceholder: 'Número de PO, nombre del proyecto...',
    notes: 'Notas (opcional)',
    notesPlaceholder: 'Instrucciones especiales...',
    getQuote: 'Obtener Cotización',
    yourQuote: 'Su Cotización',
    basePrice: 'Precio Base',
    urgencyFee: 'Cargo por Urgencia',
    totalPrice: 'Total',
    estimatedDelivery: 'Entrega Estimada',
    submitOrder: 'Enviar Pedido',
    submitting: 'Enviando...',
    orderSuccess: '¡Pedido enviado exitosamente!',
    signIn: 'Iniciar sesión',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    login: 'Ingresar',
    register: 'Registrar'
  },
  pt: {
    // Login
    businessPortal: 'Portal Empresarial (B2B)',
    corporateOnly: 'Apenas Clientes Corporativos',
    companyEmail: 'E-mail Corporativo',
    password: 'Senha',
    forgotPassword: 'Esqueceu a senha?',
    resetPassword: 'Redefinir Senha',
    resetPasswordDesc: 'Digite seu e-mail e enviaremos um link para redefinir sua senha.',
    sendResetLink: 'Enviar Link',
    resetEmailSent: 'Se existir uma conta com este e-mail, você receberá um link para redefinir sua senha.',
    backToLogin: 'Voltar ao Login',
    newPassword: 'Nova Senha',
    confirmPassword: 'Confirmar Senha',
    passwordChanged: 'Senha alterada com sucesso! Você já pode fazer login.',
    passwordMismatch: 'As senhas não coincidem',
    invalidResetLink: 'Link de redefinição inválido ou expirado',
    accessPortal: 'Acessar Portal Empresarial',
    createAccount: 'Criar Conta Empresarial',
    pleaseWait: 'Aguarde...',
    noAccount: 'Não tem conta? Cadastre-se',
    haveAccount: 'Já tem conta? Entrar',
    notB2B: 'Ainda não é cliente B2B?',
    contactUs: 'Fale conosco',
    companyName: 'Nome da Empresa',
    contactName: 'Nome do Contato',
    phoneOptional: 'Telefone (opcional)',
    errorOccurred: 'Ocorreu um erro',
    benefits: 'Benefícios da Conta Empresarial:',
    benefit1: 'Faturamento mensal',
    benefit2: 'Chat de suporte B2B dedicado',
    benefit3: 'Processamento prioritário',
    benefit4: 'Exclusivo: Verificação Digital com QR Code',
    // Navigation
    newOrder: 'Novo Pedido',
    createNewOrder: 'Criar Novo Pedido',
    myOrders: 'Meus Pedidos',
    messages: 'Mensagens',
    welcome: 'Bem-vindo',
    logout: 'Sair',
    serviceType: 'Tipo de Serviço',
    certifiedTranslation: 'Tradução Certificada',
    certifiedDesc: 'Documentos oficiais, USCIS, fins legais',
    professionalTranslation: 'Tradução Profissional',
    professionalDesc: 'Negócios, marketing, conteúdo geral',
    translateFrom: 'Traduzir De',
    translateTo: 'Traduzir Para',
    uploadDocument: 'Enviar Documento',
    uploadFiles: '+ Enviar Arquivo(s)',
    fileTypes: 'PDF, DOCX, Imagens, TXT',
    processing: 'Processando documento...',
    processingNote: 'Pode demorar um momento para arquivos grandes',
    page: 'página',
    pages: 'páginas',
    total: 'Total',
    urgency: 'Urgência',
    standard: 'Padrão (2-3 dias)',
    priority: 'Prioridade (24 horas)',
    urgent: 'Urgente (12 horas)',
    reference: 'Referência (opcional)',
    referencePlaceholder: 'Número do PO, nome do projeto...',
    notes: 'Notas (opcional)',
    notesPlaceholder: 'Instruções especiais...',
    getQuote: 'Obter Cotação',
    yourQuote: 'Sua Cotação',
    basePrice: 'Preço Base',
    urgencyFee: 'Taxa de Urgência',
    totalPrice: 'Total',
    estimatedDelivery: 'Entrega Estimada',
    submitOrder: 'Enviar Pedido',
    submitting: 'Enviando...',
    orderSuccess: 'Pedido enviado com sucesso!',
    signIn: 'Entrar na sua conta',
    email: 'Email',
    phone: 'Telefone',
    login: 'Entrar',
    register: 'Registrar'
  }
};

// UI Languages with flags
const UI_LANGUAGES = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'es', flag: '🇪🇸' },
  { code: 'pt', flag: '🇧🇷' }
];

// Get user's language preference (English is default)
const getInitialLanguage = () => {
  const saved = localStorage.getItem('ui_language');
  if (saved && ['en', 'es', 'pt'].includes(saved)) return saved;
  return 'en'; // Always default to English
};

// Detect currency based on timezone (only Brazil changes to BRL)
const getLocalCurrency = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Only Brazil (based on timezone, not locale)
    if (timezone.includes('Sao_Paulo') || timezone.includes('Fortaleza') ||
        timezone.includes('Recife') || timezone.includes('Bahia') ||
        timezone.includes('Manaus') || timezone.includes('Cuiaba') ||
        timezone.includes('Porto_Velho') || timezone.includes('Boa_Vista') ||
        timezone.includes('Rio_Branco') || timezone.includes('Belem') ||
        timezone.includes('Araguaina') || timezone.includes('Maceio') ||
        timezone.includes('Campo_Grande') || timezone.includes('Noronha')) {
      return { code: 'BRL', symbol: 'R$', rate: 5.0, isUSA: false };
    }

    // Default USD for everyone else
    return { code: 'USD', symbol: '$', rate: 1, isUSA: true };
  } catch {
    return { code: 'USD', symbol: '$', rate: 1, isUSA: true };
  }
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
const LoginPage = ({ onLogin, onRegister, t, lang, changeLanguage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    company_name: '',
    contact_name: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: resetEmail });
      setResetSent(true);
    } catch (err) {
      // Always show success message for security (don't reveal if email exists)
      setResetSent(true);
    } finally {
      setResetLoading(false);
    }
  };

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
      setError(err.response?.data?.detail || t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 border border-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 border border-white rounded-full"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-md">
          <img
            src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
            alt="Legacy Translations"
            className="mx-auto mb-8 h-20 brightness-0 invert"
          />
          <h1 className="text-4xl font-bold text-white mb-4">Business Partner Portal</h1>
          <p className="text-blue-200 text-lg mb-8">
            Streamlined translation services for corporate clients
          </p>

          {/* Features */}
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white">✓</span>
              </div>
              <span className="text-white">{t.benefit1}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white">✓</span>
              </div>
              <span className="text-white">{t.benefit2}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white">✓</span>
              </div>
              <span className="text-white">{t.benefit3}</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3 border border-yellow-400/30">
              <div className="w-10 h-10 bg-yellow-400/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-yellow-300">🔐</span>
              </div>
              <span className="text-yellow-200 font-semibold">{t.benefit4}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12">
        <div className="bg-white p-8 lg:p-10 rounded-2xl shadow-2xl w-full max-w-md">
          {/* Language Selector */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2">
              {UI_LANGUAGES.map((uiLang) => (
                <button
                  key={uiLang.code}
                  onClick={() => changeLanguage(uiLang.code)}
                  className={`text-xl hover:scale-110 transition-transform ${
                    lang === uiLang.code ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'
                  }`}
                  title={uiLang.code.toUpperCase()}
                >
                  {uiLang.flag}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Logo */}
          <div className="text-center mb-6 lg:hidden">
            <img
              src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
              alt="Legacy Translations"
              className="mx-auto mb-4 h-14"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {isLogin ? t.accessPortal : t.createAccount}
            </h2>
            <span className="inline-block px-4 py-1.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full uppercase tracking-wide">
              {t.corporateOnly}
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.companyName}</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="Your Company Inc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.contactName}</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.phoneOptional}</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.companyEmail}</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.password}</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setResetEmail(formData.email); setResetSent(false); }}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {t.forgotPassword}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              {loading ? t.pleaseWait : (isLogin ? t.accessPortal : t.createAccount)}
            </button>
          </form>

          {/* Mobile Benefits */}
          {isLogin && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 lg:hidden">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">{t.benefits}</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t.benefit1}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t.benefit2}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t.benefit3}</span>
                </li>
                <li className="flex items-start bg-yellow-50 rounded p-2 border border-yellow-200">
                  <span className="text-yellow-600 mr-2">🔐</span>
                  <span className="text-yellow-700 font-medium">{t.benefit4}</span>
                </li>
              </ul>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium"
            >
              {isLogin ? t.noAccount : t.haveAccount}
            </button>
          </div>

          {/* Contact link */}
          {isLogin && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                {t.notB2B}{' '}
                <a href="mailto:contact@legacytranslations.com" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                  contact@legacytranslations.com
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2">{t.resetPassword}</h2>

            {!resetSent ? (
              <>
                <p className="text-gray-600 text-sm mb-4">{t.resetPasswordDesc}</p>
                <form onSubmit={handleForgotPassword}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.companyEmail}</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      {t.backToLogin}
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 font-medium shadow-lg transition-all"
                    >
                      {resetLoading ? t.pleaseWait : t.sendResetLink}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✉️</span>
                  </div>
                  <p className="text-gray-600">{t.resetEmailSent}</p>
                </div>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-lg transition-all"
                >
                  {t.backToLogin}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== SIDEBAR ====================
const Sidebar = ({ activeTab, setActiveTab, partner, onLogout, t }) => {
  const menuItems = [
    { id: 'new-order', label: t.newOrder, icon: '➕' },
    { id: 'orders', label: t.myOrders, icon: '📋' },
    { id: 'messages', label: t.messages, icon: '✉️' }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4">
        <img
          src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
          alt="Legacy Translations"
          className="w-40 h-auto mb-4"
        />
        <div className="text-sm text-gray-600 mb-2">{t.welcome},</div>
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
          {t.logout}
        </button>
      </div>
    </div>
  );
};

// ==================== NEW ORDER PAGE ====================
const NewOrderPage = ({ partner, token, onOrderCreated, t, currency }) => {
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    service_type: 'certified',
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Refs for scroll-to-error
  const clientNameRef = useRef(null);
  const clientEmailRef = useRef(null);
  const fileUploadRef = useRef(null);
  const shippingRef = useRef(null);

  // Format price with currency conversion
  const formatPrice = (usdPrice) => {
    const converted = usdPrice * currency.rate;
    return `${currency.symbol}${converted.toFixed(2)}`;
  };

  // Physical copy / shipping options
  const [needsPhysicalCopy, setNeedsPhysicalCopy] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  });
  const USPS_PRIORITY_MAIL = 18.99;

  // Calculate quote when relevant fields change
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      calculateQuote();
    }
  }, [uploadedFiles, formData.service_type, formData.urgency, needsPhysicalCopy]);

  // Force Portuguese (Brasil) as target language for Sworn Translation
  useEffect(() => {
    if (formData.service_type === 'sworn') {
      setFormData(prev => ({...prev, translate_to: 'pt-br'}));
    }
  }, [formData.service_type]);

  // Force physical copy for RMV Certified
  useEffect(() => {
    if (formData.service_type === 'rmv') {
      setNeedsPhysicalCopy(true);
    }
  }, [formData.service_type]);

  const calculateQuote = () => {
    let basePrice = 0;
    // Sum individual file pages instead of calculating from total words
    const pages = uploadedFiles.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.wordCount / 250)), 0);

    // Price per page based on service type
    switch (formData.service_type) {
      case 'certified':
        basePrice = pages * 24.99;
        break;
      case 'standard':
        basePrice = pages * 19.99;
        break;
      case 'sworn':
        basePrice = pages * 55.00;
        break;
      case 'rmv':
        basePrice = pages * 24.99;
        break;
      default:
        basePrice = pages * 24.99;
    }

    let urgencyFee = 0;
    if (formData.urgency === 'priority') {
      urgencyFee = basePrice * 0.25;
    } else if (formData.urgency === 'urgent') {
      urgencyFee = basePrice * 1.0;
    }

    // Shipping only available in USA
    const shippingFee = currency.isUSA && (needsPhysicalCopy || formData.service_type === 'rmv') ? USPS_PRIORITY_MAIL : 0;

    setQuote({
      base_price: basePrice,
      urgency_fee: urgencyFee,
      shipping_fee: shippingFee,
      total_price: basePrice + urgencyFee + shippingFee,
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
      // Clear file upload error when files are added
      if (fieldErrors.file_upload) setFieldErrors(prev => ({...prev, file_upload: false}));
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setFieldErrors({});
    const newFieldErrors = {};

    // Validate required fields
    if (!formData.client_name?.trim()) {
      newFieldErrors.client_name = true;
    }
    if (!formData.client_email?.trim()) {
      newFieldErrors.client_email = true;
    }
    if (wordCount === 0) {
      newFieldErrors.file_upload = true;
    }
    // Validate shipping address for RMV or physical copy
    if ((needsPhysicalCopy || formData.service_type === 'rmv') && currency.isUSA &&
        (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode)) {
      newFieldErrors.shipping = true;
    }

    // If there are errors, scroll to the first one
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);

      // Scroll to first error
      if (newFieldErrors.client_name && clientNameRef.current) {
        clientNameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setError('Please fill in client name');
      } else if (newFieldErrors.client_email && clientEmailRef.current) {
        clientEmailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setError('Please fill in client email');
      } else if (newFieldErrors.file_upload && fileUploadRef.current) {
        fileUploadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setError('Please upload a document first');
      } else if (newFieldErrors.shipping && shippingRef.current) {
        shippingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setError('Please complete the shipping address');
      }
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
        service_type: 'certified',
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t?.createNewOrder || 'Create New Order'}</h1>

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
            <div className="border-b pb-4" ref={clientNameRef}>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Client Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 ${
                      fieldErrors.client_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    value={formData.client_name}
                    onChange={(e) => {
                      setFormData({...formData, client_name: e.target.value});
                      if (fieldErrors.client_name) setFieldErrors({...fieldErrors, client_name: false});
                    }}
                    placeholder="John Smith"
                  />
                  {fieldErrors.client_name && (
                    <p className="text-red-500 text-sm mt-1">Client name is required</p>
                  )}
                </div>
                <div ref={clientEmailRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Email *
                  </label>
                  <input
                    type="email"
                    required
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 ${
                      fieldErrors.client_email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    value={formData.client_email}
                    onChange={(e) => {
                      setFormData({...formData, client_email: e.target.value});
                      if (fieldErrors.client_email) setFieldErrors({...fieldErrors, client_email: false});
                    }}
                    placeholder="client@email.com"
                  />
                  {fieldErrors.client_email && (
                    <p className="text-red-500 text-sm mt-1">Client email is required</p>
                  )}
                </div>
              </div>
            </div>

            {/* Service Type */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Service Type</h2>
              <div className="space-y-3">
                {/* Certified Translation */}
                <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                  formData.service_type === 'certified' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="service_type"
                    value="certified"
                    checked={formData.service_type === 'certified'}
                    onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-1">
                      Certified Translation
                      <span className="text-gray-400 cursor-help" title="Includes a signed Statement of Accuracy, stamp, and signature; accepted by most institutions.">&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">Official documents, legal, immigration</div>
                  </div>
                  <div className="font-semibold text-teal-600">{formatPrice(24.99)}/page</div>
                </label>

                {/* Standard Translation */}
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
                    <div className="font-medium flex items-center gap-1">
                      Standard Translation
                      <span className="text-gray-400 cursor-help" title="Accurate translation for general use; does not include certification.">&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">General use, no certification</div>
                  </div>
                  <div className="font-semibold text-teal-600">{formatPrice(19.99)}/page</div>
                </label>

                {/* Sworn Translation */}
                <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                  formData.service_type === 'sworn' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="service_type"
                    value="sworn"
                    checked={formData.service_type === 'sworn'}
                    onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-1">
                      Sworn Translation
                      <span className="text-gray-400 cursor-help" title="Completed by a sworn translator registered in the country of use; required for specific countries.">&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">For use outside USA - official sworn translator</div>
                  </div>
                  <div className="font-semibold text-teal-600">{formatPrice(55.00)}/page</div>
                </label>

                {/* RMV Certified Translation */}
                <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                  formData.service_type === 'rmv' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="service_type"
                    value="rmv"
                    checked={formData.service_type === 'rmv'}
                    onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-1">
                      RMV Certified Translation
                      <span className="text-gray-400 cursor-help" title="Certified on official letterhead with all required elements; accepted by the RMV for licenses, IDs, and related purposes.">&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">Massachusetts Motor Vehicle - requires physical copy</div>
                  </div>
                  <div className="font-semibold text-teal-600">{formatPrice(24.99)}/page</div>
                </label>
              </div>

              {/* Service Type Descriptions */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-2">
                <p><strong>Certified:</strong> Includes a signed Statement of Accuracy, stamp, and signature; accepted by most institutions.</p>
                <p><strong>Standard:</strong> Accurate translation for general use; does not include certification.</p>
                <p><strong>Sworn:</strong> Completed by a sworn translator registered in the country of use; required for specific countries.</p>
                <p><strong>RMV Certified:</strong> Certified on official letterhead with all required elements; accepted by the RMV for licenses, IDs, and related purposes.</p>
              </div>
            </div>

            {/* Languages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Translate From</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Translate To</label>
                {formData.service_type === 'sworn' ? (
                  <div>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                      value="pt-br"
                      disabled
                    >
                      <option value="pt-br">🇧🇷 Portuguese (Brasil)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Sworn translations are only available for Portuguese (Brasil)</p>
                  </div>
                ) : (
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
                )}
              </div>
            </div>

            {/* Document Upload */}
            <div ref={fileUploadRef}>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Document</h2>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  fieldErrors.file_upload
                    ? 'border-red-500 bg-red-50'
                    : isDragActive
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-300 hover:border-teal-500'
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-3xl mb-2">📁</div>
                <div className="font-medium text-teal-600">+ Upload File(s)</div>
                <div className="text-sm text-gray-500">PDF, DOCX, Images, TXT</div>
              </div>
              {fieldErrors.file_upload && (
                <p className="text-red-500 text-sm mt-2">Please upload a document</p>
              )}

              {isProcessing && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <div className="text-blue-800 font-medium">{processingStatus || 'Processing document...'}</div>
                  <div className="text-xs text-blue-600 mt-1">This may take a moment for large or image-based files</div>
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
                          <span className="text-gray-400 text-sm ml-2">({pages} {pages === 1 ? 'page' : 'pages'})</span>
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
                    Total: {uploadedFiles.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.wordCount / 250)), 0)} {uploadedFiles.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.wordCount / 250)), 0) === 1 ? 'page' : 'pages'}
                  </div>
                </div>
              )}
            </div>

            {/* Urgency */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Urgency</h2>
              <div className="space-y-2">
                {[
                  { id: 'no', label: 'Standard (2-3 days)', fee: '' },
                  { id: 'priority', label: 'Priority (24 hours)', fee: '+25%' },
                  { id: 'urgent', label: 'Urgent (12 hours)', fee: '+100%' }
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
                    <span className="flex-1">{option.label}</span>
                    {option.fee && <span className="text-orange-600 font-medium">{option.fee}</span>}
                  </label>
                ))}
              </div>
            </div>

            {/* Physical Copy / Shipping - USA Only */}
            {currency.isUSA && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Physical Copy</h2>
                <div className="space-y-3">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={needsPhysicalCopy || formData.service_type === 'rmv'}
                      onChange={(e) => setNeedsPhysicalCopy(e.target.checked)}
                      disabled={formData.service_type === 'rmv'}
                      className="mr-3 h-4 w-4 text-teal-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Physical copy required</div>
                      <div className="text-sm text-gray-500">USPS Priority Mail (1-3 business days)</div>
                    </div>
                    <div className="font-semibold text-teal-600">{formatPrice(18.99)}</div>
                  </label>

                  {formData.service_type === 'rmv' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> RMV Certified translations require physical delivery.
                      </p>
                    </div>
                  )}

                  {(needsPhysicalCopy || formData.service_type === 'rmv') && (
                    <div ref={shippingRef} className={`p-4 rounded-lg space-y-3 ${fieldErrors.shipping ? 'bg-red-50 border border-red-300' : 'bg-gray-50'}`}>
                      <p className="text-sm font-medium text-gray-700">Shipping Address (USA)</p>
                      {fieldErrors.shipping && <p className="text-red-500 text-sm">Please complete the shipping address</p>}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Street Address *</label>
                          <input
                            type="text"
                            className={`w-full px-3 py-2 border rounded-md text-sm ${fieldErrors.shipping && !shippingAddress.street ? 'border-red-500' : 'border-gray-300'}`}
                            value={shippingAddress.street}
                            onChange={(e) => { setShippingAddress({...shippingAddress, street: e.target.value}); setFieldErrors(prev => ({...prev, shipping: false})); }}
                            placeholder="123 Main Street, Apt 4B"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">City *</label>
                          <input
                            type="text"
                            className={`w-full px-3 py-2 border rounded-md text-sm ${fieldErrors.shipping && !shippingAddress.city ? 'border-red-500' : 'border-gray-300'}`}
                            value={shippingAddress.city}
                            onChange={(e) => { setShippingAddress({...shippingAddress, city: e.target.value}); setFieldErrors(prev => ({...prev, shipping: false})); }}
                            placeholder="Boston"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">State *</label>
                          <input
                            type="text"
                            className={`w-full px-3 py-2 border rounded-md text-sm ${fieldErrors.shipping && !shippingAddress.state ? 'border-red-500' : 'border-gray-300'}`}
                            value={shippingAddress.state}
                            onChange={(e) => { setShippingAddress({...shippingAddress, state: e.target.value}); setFieldErrors(prev => ({...prev, shipping: false})); }}
                            placeholder="MA"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">ZIP Code *</label>
                          <input
                            type="text"
                            className={`w-full px-3 py-2 border rounded-md text-sm ${fieldErrors.shipping && !shippingAddress.zipCode ? 'border-red-500' : 'border-gray-300'}`}
                            value={shippingAddress.zipCode}
                            onChange={(e) => { setShippingAddress({...shippingAddress, zipCode: e.target.value}); setFieldErrors(prev => ({...prev, shipping: false})); }}
                            placeholder="02101"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Country</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100"
                            value="USA"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reference & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (optional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  placeholder="PO number, project name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Special instructions..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || wordCount === 0}
              className="w-full py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-400 font-semibold"
            >
              {submitting ? 'Creating Order...' : 'Create Order'}
            </button>
          </form>
        </div>

        {/* Quote Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 h-fit sticky top-8">
          <h2 className="text-xl font-bold text-teal-600 mb-4">Quote Summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Service</span>
              <span className="font-medium">
                {formData.service_type === 'certified' && 'Certified'}
                {formData.service_type === 'standard' && 'Standard'}
                {formData.service_type === 'sworn' && 'Sworn'}
                {formData.service_type === 'rmv' && 'RMV Certified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pages</span>
              <span className="font-medium">{quote?.pages || 0}</span>
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Price</span>
                <span className="font-medium">{formatPrice(quote?.base_price || 0)}</span>
              </div>
              {quote?.urgency_fee > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Urgency Fee</span>
                  <span>{formatPrice(quote.urgency_fee)}</span>
                </div>
              )}
              {quote?.shipping_fee > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Shipping (USPS Priority)</span>
                  <span>{formatPrice(quote.shipping_fee)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold text-teal-600">{formatPrice(quote?.total_price || 0)}</span>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-4">
              * Payment via invoice (Net 30)
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
                      <div className="font-medium">
                        {order.service_type === 'certified' && 'Certified'}
                        {order.service_type === 'standard' && 'Standard'}
                        {order.service_type === 'sworn' && 'Sworn'}
                        {order.service_type === 'rmv' && 'RMV Certified'}
                        {!['certified', 'standard', 'sworn', 'rmv'].includes(order.service_type) && order.service_type}
                      </div>
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

// ==================== RESET PASSWORD PAGE ====================
const ResetPasswordPage = ({ resetToken, onSuccess, onCancel, t }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token: resetToken,
        new_password: newPassword
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || t.invalidResetLink);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
            alt="Legacy Translations"
            className="h-12 mx-auto mb-4"
          />
          <h2 className="text-xl font-bold text-gray-800">{t.resetPassword}</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>
        )}

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.newPassword}</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.confirmPassword}</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                {t.backToLogin}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 font-medium"
              >
                {loading ? t.pleaseWait : t.resetPassword}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-600 mb-4">{t.passwordChanged}</p>
            <button
              onClick={onSuccess}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 font-medium"
            >
              {t.backToLogin}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== VERIFICATION PAGE (PUBLIC) ====================
const VerificationPage = ({ certificationId }) => {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyDocument = async () => {
      try {
        const response = await axios.get(`${API}/certifications/verify/${certificationId}`);
        setVerification(response.data);
      } catch (err) {
        setError('Unable to verify certification. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    verifyDocument();
  }, [certificationId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
            alt="Legacy Translations"
            className="mx-auto h-14 mb-4"
          />
          <h1 className="text-xl font-bold text-gray-800">Document Verification</h1>
          <p className="text-sm text-gray-500">Verify the authenticity of a certified translation</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Verifying document...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <div className="text-3xl mb-2">❌</div>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Verification Result */}
        {verification && !loading && (
          <div className={`p-6 rounded-lg ${verification.is_valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {/* Status Icon */}
            <div className="text-center mb-4">
              <div className={`text-5xl mb-2 ${verification.is_valid ? 'text-green-500' : 'text-red-500'}`}>
                {verification.is_valid ? '✓' : '✗'}
              </div>
              <p className={`font-semibold ${verification.is_valid ? 'text-green-700' : 'text-red-700'}`}>
                {verification.message}
              </p>
            </div>

            {/* Certificate Details */}
            {verification.is_valid && (
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-green-200">
                  <span className="text-gray-600">Certification ID:</span>
                  <span className="font-mono font-medium">{verification.certification_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-green-200">
                  <span className="text-gray-600">Certified Date:</span>
                  <span className="font-medium">{new Date(verification.certified_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {verification.document_type && (
                  <div className="flex justify-between py-2 border-b border-green-200">
                    <span className="text-gray-600">Document Type:</span>
                    <span className="font-medium capitalize">{verification.document_type.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {verification.source_language && verification.target_language && (
                  <div className="flex justify-between py-2 border-b border-green-200">
                    <span className="text-gray-600">Translation:</span>
                    <span className="font-medium">{verification.source_language} → {verification.target_language}</span>
                  </div>
                )}
                {verification.certifier_name && (
                  <div className="flex justify-between py-2 border-b border-green-200">
                    <span className="text-gray-600">Certified By:</span>
                    <span className="font-medium text-right">
                      {verification.certifier_name}
                      {verification.certifier_title && <div className="text-xs text-gray-500">{verification.certifier_title}</div>}
                    </span>
                  </div>
                )}
                {verification.certifier_credentials && (
                  <div className="flex justify-between py-2 border-b border-green-200">
                    <span className="text-gray-600">Credentials:</span>
                    <span className="font-medium">{verification.certifier_credentials}</span>
                  </div>
                )}
                {verification.company_name && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Company:</span>
                    <span className="font-medium">{verification.company_name}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Legacy Translations, LLC • Certified Translation Services
          </p>
          <a href="https://legacytranslations.com" className="text-xs text-blue-600 hover:underline">
            www.legacytranslations.com
          </a>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
function App() {
  const [partner, setPartner] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('new-order');
  const [lang, setLang] = useState(getInitialLanguage);
  const [currency] = useState(getLocalCurrency);
  const [verificationId, setVerificationId] = useState(null);
  const [resetToken, setResetToken] = useState(null);

  // Get translations for current language
  const t = TRANSLATIONS[lang];

  // Handle language change
  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('ui_language', newLang);
  };

  // Check for reset token and verification route in URL
  useEffect(() => {
    // Check query params in main URL
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('reset_token');

    // Also check query params in hash (for /#/partner?reset_token=xxx)
    const hash = window.location.hash;
    if (!token && hash.includes('?')) {
      const hashParams = new URLSearchParams(hash.split('?')[1]);
      token = hashParams.get('reset_token');
    }

    if (token) {
      setResetToken(token);
      // Clean up URL after getting token
      window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
    }

    // Check for verification route: /#/verify/CERTIFICATION_ID
    const verifyMatch = hash.match(/^#\/verify\/(.+?)(\?|$)/);
    if (verifyMatch) {
      setVerificationId(verifyMatch[1]);
    }

    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash;
      const match = newHash.match(/^#\/verify\/(.+?)(\?|$)/);
      if (match) {
        setVerificationId(match[1]);
      } else {
        setVerificationId(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  const renderContent = () => {
    switch (activeTab) {
      case 'new-order':
        return <NewOrderPage partner={partner} token={token} onOrderCreated={() => setActiveTab('orders')} t={t} currency={currency} />;
      case 'orders':
        return <OrdersPage token={token} />;
      case 'messages':
        return <MessagesPage token={token} />;
      default:
        return <NewOrderPage partner={partner} token={token} t={t} currency={currency} />;
    }
  };

  // Show verification page if verification ID is present (PUBLIC)
  if (verificationId) {
    return <VerificationPage certificationId={verificationId} />;
  }

  // Show reset password page if reset token is present
  if (resetToken) {
    return (
      <ResetPasswordPage
        resetToken={resetToken}
        t={t}
        onSuccess={() => {
          setResetToken(null);
          // Redirect to partner login page
          window.location.href = '/#/partner';
        }}
        onCancel={() => {
          setResetToken(null);
          // Redirect to partner login page
          window.location.href = '/#/partner';
        }}
      />
    );
  }

  if (!partner) {
    return <LoginPage onLogin={handleLogin} t={t} lang={lang} changeLanguage={changeLanguage} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        partner={partner}
        onLogout={handleLogout}
        t={t}
      />
      <div className="flex-1">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex justify-end items-center">
            {/* Language Flags */}
            <div className="flex items-center space-x-2 mr-6">
              {UI_LANGUAGES.map((uiLang) => (
                <button
                  key={uiLang.code}
                  onClick={() => changeLanguage(uiLang.code)}
                  className={`text-2xl hover:scale-110 transition-transform ${
                    lang === uiLang.code ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'
                  }`}
                  title={uiLang.code.toUpperCase()}
                >
                  {uiLang.flag}
                </button>
              ))}
            </div>
            {/* User Info */}
            <div className="text-sm text-gray-600">
              {partner?.contact_name} | {partner?.company_name}
            </div>
          </div>
        </header>
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
