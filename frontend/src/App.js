import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

// ==================== INTERNATIONALIZATION ====================
const TRANSLATIONS = {
  en: {
    newOrder: 'New Order',
    createNewOrder: 'Create New Order',
    myOrders: 'My Orders',
    messages: 'Messages',
    welcome: 'Welcome',
    logout: 'Logout',
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
    createAccount: 'Create a new account',
    email: 'Email',
    password: 'Password',
    companyName: 'Company Name',
    contactName: 'Contact Name',
    phone: 'Phone',
    login: 'Log In',
    register: 'Register',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?'
  },
  es: {
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
    createAccount: 'Crear una cuenta nueva',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    companyName: 'Nombre de Empresa',
    contactName: 'Nombre de Contacto',
    phone: 'Teléfono',
    login: 'Ingresar',
    register: 'Registrar',
    noAccount: '¿No tiene cuenta?',
    haveAccount: '¿Ya tiene cuenta?'
  },
  pt: {
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
    createAccount: 'Criar uma nova conta',
    email: 'Email',
    password: 'Senha',
    companyName: 'Nome da Empresa',
    contactName: 'Nome do Contato',
    phone: 'Telefone',
    login: 'Entrar',
    register: 'Registrar',
    noAccount: 'Não tem conta?',
    haveAccount: 'Já tem conta?'
  }
};

// UI Languages with flags
const UI_LANGUAGES = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'es', flag: '🇪🇸' },
  { code: 'pt', flag: '🇧🇷' }
];

// Detect user's preferred language
const getInitialLanguage = () => {
  const saved = localStorage.getItem('ui_language');
  if (saved && ['en', 'es', 'pt'].includes(saved)) return saved;
  const browserLang = navigator.language.split('-')[0];
  if (['en', 'es', 'pt'].includes(browserLang)) return browserLang;
  return 'en';
};

// Detect currency based on locale/timezone
const getLocalCurrency = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = navigator.language;

    // Brazil
    if (timezone.includes('Sao_Paulo') || locale.includes('BR')) return { code: 'BRL', symbol: 'R$', rate: 5.0 };
    // Europe
    if (timezone.includes('Europe') && !timezone.includes('London')) return { code: 'EUR', symbol: '€', rate: 0.92 };
    // UK
    if (timezone.includes('London') || locale.includes('GB')) return { code: 'GBP', symbol: '£', rate: 0.79 };
    // Mexico, Latin America (except Brazil)
    if (timezone.includes('Mexico') || (locale.includes('es') && !locale.includes('ES'))) return { code: 'MXN', symbol: 'MX$', rate: 17.5 };
    // Default USD
    return { code: 'USD', symbol: '$', rate: 1 };
  } catch {
    return { code: 'USD', symbol: '$', rate: 1 };
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
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center relative">
      {/* Language Flags - Top Right */}
      <div className="absolute top-4 right-4 flex items-center space-x-2">
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

      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
            alt="Legacy Translations"
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">Partner Portal</h1>
          <p className="text-gray-600">{isLogin ? t.signIn : t.createAccount}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.contactName}</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.password}</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-400"
          >
            {loading ? '...' : (isLogin ? t.login : t.register)}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-teal-600 hover:underline"
          >
            {isLogin ? t.noAccount : t.haveAccount}
          </button>
        </div>
      </div>
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

    const shippingFee = (needsPhysicalCopy || formData.service_type === 'rmv') ? USPS_PRIORITY_MAIL : 0;

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
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Client Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
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
                    Client Email *
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
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Document</h2>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-500'
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-3xl mb-2">📁</div>
                <div className="font-medium text-teal-600">+ Upload File(s)</div>
                <div className="text-sm text-gray-500">PDF, DOCX, Images, TXT</div>
              </div>

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

            {/* Physical Copy / Shipping */}
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
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <p className="text-sm font-medium text-gray-700">Shipping Address (USA)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Street Address *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          value={shippingAddress.street}
                          onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
                          placeholder="123 Main Street, Apt 4B"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">City *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                          placeholder="Boston"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">State *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                          placeholder="MA"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">ZIP Code *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          value={shippingAddress.zipCode}
                          onChange={(e) => setShippingAddress({...shippingAddress, zipCode: e.target.value})}
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

// ==================== MAIN APP ====================
function App() {
  const [partner, setPartner] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('new-order');
  const [lang, setLang] = useState(getInitialLanguage);
  const [currency] = useState(getLocalCurrency);

  // Get translations for current language
  const t = TRANSLATIONS[lang];

  // Handle language change
  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('ui_language', newLang);
  };

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
