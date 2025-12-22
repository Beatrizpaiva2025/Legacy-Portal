import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

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

// Languages list (for translation services)
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

// UI Languages (for interface translation)
const UI_LANGUAGES = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'pt', flag: '🇧🇷', name: 'Português' }
];

// Customer Portal Translations
const CUSTOMER_TRANSLATIONS = {
  en: {
    // Header & Navigation
    customerPortal: 'Customer Portal',
    signIn: 'Sign in to your account',
    createAccount: 'Create a new account',
    newOrder: 'New Order',
    myOrders: 'My Orders',
    messages: 'Messages',
    logout: 'Logout',
    welcome: 'Welcome,',

    // Login/Register
    fullName: 'Full Name',
    phoneOptional: 'Phone (optional)',
    email: 'Email',
    password: 'Password',
    signInBtn: 'Sign In',
    createAccountBtn: 'Create Account',
    pleaseWait: 'Please wait...',
    noAccount: "Don't have an account? Register",
    hasAccount: 'Already have an account? Sign In',
    areYouPartner: 'Are you a partner?',
    goToPartnerPortal: 'Go to Partner Portal',

    // New Order Page
    requestTranslation: 'Request Translation',
    enterDetails: 'Enter your details to receive your quote',
    yourName: 'Your Name *',
    yourEmail: 'Your Email *',
    sendQuoteHere: "We'll send your quote and order updates here",

    // Service Types
    serviceType: 'Service Type',
    certifiedTranslation: 'Certified Translation',
    certifiedDesc: 'Official documents, legal, immigration',
    standardTranslation: 'Standard Translation',
    standardDesc: 'General use, no certification',
    swornTranslation: 'Sworn Translation',
    swornDesc: 'For use outside USA - official sworn translator',
    rmvTranslation: 'RMV Certified Translation',
    rmvDesc: 'Massachusetts Motor Vehicle - requires physical copy',
    perPage: '/page',

    // Service Descriptions
    certifiedInfo: 'Includes a signed Statement of Accuracy, stamp, and signature; accepted by most institutions.',
    standardInfo: 'Accurate translation for general use; does not include certification.',
    swornInfo: 'Completed by a sworn translator registered in the country of use; required for specific countries.',
    rmvInfo: 'Certified on official letterhead with all required elements; accepted by the RMV for licenses, IDs, and related purposes.',

    // Languages
    translateFrom: 'Translate From',
    translateTo: 'Translate To',
    swornOnlyPortuguese: 'Sworn translations are only available for Portuguese (Brasil)',

    // Upload
    uploadDocument: 'Upload Document',
    uploadFiles: '+ Upload File(s)',
    acceptedFormats: 'PDF, DOCX, Images, TXT',
    connectingServer: 'Connecting to server...',
    processing: 'Processing',
    processingDocument: 'Processing document...',
    processingLargeFile: 'This may take a moment for large or image-based files',
    uploadTrouble: 'Having trouble uploading?',
    contactEmail: 'Contact us via email',
    page: 'page',
    pages: 'pages',
    total: 'Total',

    // Urgency
    urgency: 'Urgency',
    standard23Days: 'Standard (2-3 days)',
    priority24Hours: 'Priority (24 hours)',
    urgent12Hours: 'Urgent (12 hours)',

    // Physical Copy
    requirePhysicalCopy: 'Do you require the physical copy of the translation?',
    no: 'No',
    yes: 'Yes',
    digitalOnly: 'Digital copy only',
    priorityMail: 'Priority Mail',
    rmvRequiresPhysical: 'RMV requires a physical copy. Shipping is automatically included.',
    shippingAddressUSA: 'Shipping Address (USA)',
    streetAddress: 'Street Address *',
    city: 'City *',
    state: 'State *',
    zipCode: 'ZIP Code *',
    country: 'Country',
    estimatedDelivery: 'USPS Priority Mail - Estimated delivery: 1-3 business days',

    // Notes
    specialInstructions: 'Special Instructions (optional)',
    instructionsPlaceholder: 'Any special instructions for our translators...',

    // Quote Summary
    quoteSummary: 'Quote Summary',
    service: 'Service',
    basePrice: 'Base Price',
    urgencyFee: 'Urgency Fee',
    certification: 'Certification',
    uspsPriorityMail: 'USPS Priority Mail',
    discount: 'Discount',
    discountCode: 'Discount Code',
    enterCode: 'Enter code',
    apply: 'Apply',
    off: 'off',
    applied: 'applied!',
    paymentRequired: '* Payment required to start translation',

    // Buttons
    continueToPayment: 'Continue to Payment',
    processingBtn: 'Processing...',

    // Contact
    questionsAboutPricing: 'Questions about your pricing?',
    requestQuoteInstead: 'Request a quote instead',

    // Exit Popup
    waitSpecialOffer: 'Wait! Special Offer!',
    completeOrderNow: 'Complete your order now and get',
    offDiscount: 'OFF',
    useCodeAtCheckout: 'Use this code at checkout',
    yesApplyDiscount: 'Yes, Apply My 5% Discount!',
    noPayFullPrice: 'No thanks, I\'ll pay full price',

    // Validation Errors
    pleaseEnterName: 'Please enter your name',
    pleaseEnterEmail: 'Please enter your email',
    pleaseUploadDocument: 'Please upload a document',
    pleaseCompleteShipping: 'Please complete the shipping address',

    // Success/Error Messages
    paymentSuccessful: 'Payment successful! Your order has been confirmed. Check your email for details.',
    paymentCanceled: 'Payment was canceled. Your order has been saved - you can complete payment later.',
    invalidDiscountCode: 'Invalid or expired discount code',
    failedToProcess: 'Failed to process payment. Please try again.',
    processingTimedOut: 'Processing timed out. The file might be too large or complex. Please try a smaller file.',
    errorProcessingDocument: 'Error processing document. Please try again.',

    // Orders Page
    noOrdersYet: 'No orders yet',
    createFirstOrder: 'Create your first order to get started',
    all: 'All',
    pending: 'Pending',
    paid: 'Paid',
    loadingOrders: 'Loading orders...',
    created: 'Created',
    reference: 'Reference',
    words: 'words',

    // Messages Page
    noMessages: 'No messages',
    messagesWillAppear: 'Messages from Legacy Translations will appear here',
    loadingMessages: 'Loading messages...',
    markAsRead: 'Mark as read',
    new: 'New',

    // Page size info
    pageInfo: '1 page = 250 words max'
  },
  es: {
    // Header & Navigation
    customerPortal: 'Portal del Cliente',
    signIn: 'Inicia sesión en tu cuenta',
    createAccount: 'Crear una nueva cuenta',
    newOrder: 'Nuevo Pedido',
    myOrders: 'Mis Pedidos',
    messages: 'Mensajes',
    logout: 'Cerrar Sesión',
    welcome: 'Bienvenido,',

    // Login/Register
    fullName: 'Nombre Completo',
    phoneOptional: 'Teléfono (opcional)',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    signInBtn: 'Iniciar Sesión',
    createAccountBtn: 'Crear Cuenta',
    pleaseWait: 'Por favor espere...',
    noAccount: '¿No tienes cuenta? Regístrate',
    hasAccount: '¿Ya tienes cuenta? Inicia Sesión',
    areYouPartner: '¿Eres un socio?',
    goToPartnerPortal: 'Ir al Portal de Socios',

    // New Order Page
    requestTranslation: 'Solicitar Traducción',
    enterDetails: 'Ingresa tus datos para recibir tu cotización',
    yourName: 'Tu Nombre *',
    yourEmail: 'Tu Correo *',
    sendQuoteHere: 'Enviaremos tu cotización y actualizaciones aquí',

    // Service Types
    serviceType: 'Tipo de Servicio',
    certifiedTranslation: 'Traducción Certificada',
    certifiedDesc: 'Documentos oficiales, legal, inmigración',
    standardTranslation: 'Traducción Estándar',
    standardDesc: 'Uso general, sin certificación',
    swornTranslation: 'Traducción Jurada',
    swornDesc: 'Para uso fuera de EE.UU. - traductor jurado oficial',
    rmvTranslation: 'Traducción Certificada RMV',
    rmvDesc: 'Vehículos Motorizados de Massachusetts - requiere copia física',
    perPage: '/página',

    // Service Descriptions
    certifiedInfo: 'Incluye una Declaración de Precisión firmada, sello y firma; aceptada por la mayoría de instituciones.',
    standardInfo: 'Traducción precisa para uso general; no incluye certificación.',
    swornInfo: 'Realizada por un traductor jurado registrado en el país de uso; requerida para países específicos.',
    rmvInfo: 'Certificada en membrete oficial con todos los elementos requeridos; aceptada por el RMV para licencias, IDs y propósitos relacionados.',

    // Languages
    translateFrom: 'Traducir Desde',
    translateTo: 'Traducir A',
    swornOnlyPortuguese: 'Las traducciones juradas solo están disponibles para Portugués (Brasil)',

    // Upload
    uploadDocument: 'Subir Documento',
    uploadFiles: '+ Subir Archivo(s)',
    acceptedFormats: 'PDF, DOCX, Imágenes, TXT',
    connectingServer: 'Conectando al servidor...',
    processing: 'Procesando',
    processingDocument: 'Procesando documento...',
    processingLargeFile: 'Esto puede tomar un momento para archivos grandes o basados en imágenes',
    uploadTrouble: '¿Tienes problemas para subir?',
    contactEmail: 'Contáctanos por correo',
    page: 'página',
    pages: 'páginas',
    total: 'Total',

    // Urgency
    urgency: 'Urgencia',
    standard23Days: 'Estándar (2-3 días)',
    priority24Hours: 'Prioritario (24 horas)',
    urgent12Hours: 'Urgente (12 horas)',

    // Physical Copy
    requirePhysicalCopy: '¿Necesitas la copia física de la traducción?',
    no: 'No',
    yes: 'Sí',
    digitalOnly: 'Solo copia digital',
    priorityMail: 'Correo Prioritario',
    rmvRequiresPhysical: 'RMV requiere una copia física. El envío está incluido automáticamente.',
    shippingAddressUSA: 'Dirección de Envío (EE.UU.)',
    streetAddress: 'Dirección *',
    city: 'Ciudad *',
    state: 'Estado *',
    zipCode: 'Código Postal *',
    country: 'País',
    estimatedDelivery: 'USPS Priority Mail - Entrega estimada: 1-3 días hábiles',

    // Notes
    specialInstructions: 'Instrucciones Especiales (opcional)',
    instructionsPlaceholder: 'Cualquier instrucción especial para nuestros traductores...',

    // Quote Summary
    quoteSummary: 'Resumen de Cotización',
    service: 'Servicio',
    basePrice: 'Precio Base',
    urgencyFee: 'Cargo por Urgencia',
    certification: 'Certificación',
    uspsPriorityMail: 'USPS Priority Mail',
    discount: 'Descuento',
    discountCode: 'Código de Descuento',
    enterCode: 'Ingresar código',
    apply: 'Aplicar',
    off: 'de descuento',
    applied: '¡aplicado!',
    paymentRequired: '* Se requiere pago para iniciar la traducción',

    // Buttons
    continueToPayment: 'Continuar al Pago',
    processingBtn: 'Procesando...',

    // Contact
    questionsAboutPricing: '¿Preguntas sobre tu precio?',
    requestQuoteInstead: 'Solicitar una cotización en su lugar',

    // Exit Popup
    waitSpecialOffer: '¡Espera! ¡Oferta Especial!',
    completeOrderNow: 'Completa tu pedido ahora y obtén',
    offDiscount: 'DE DESCUENTO',
    useCodeAtCheckout: 'Usa este código al pagar',
    yesApplyDiscount: '¡Sí, Aplicar Mi 5% de Descuento!',
    noPayFullPrice: 'No gracias, pagaré el precio completo',

    // Validation Errors
    pleaseEnterName: 'Por favor ingresa tu nombre',
    pleaseEnterEmail: 'Por favor ingresa tu correo',
    pleaseUploadDocument: 'Por favor sube un documento',
    pleaseCompleteShipping: 'Por favor completa la dirección de envío',

    // Success/Error Messages
    paymentSuccessful: '¡Pago exitoso! Tu pedido ha sido confirmado. Revisa tu correo para más detalles.',
    paymentCanceled: 'El pago fue cancelado. Tu pedido ha sido guardado - puedes completar el pago después.',
    invalidDiscountCode: 'Código de descuento inválido o expirado',
    failedToProcess: 'Error al procesar el pago. Por favor intenta de nuevo.',
    processingTimedOut: 'El procesamiento expiró. El archivo puede ser muy grande o complejo. Por favor intenta con un archivo más pequeño.',
    errorProcessingDocument: 'Error al procesar el documento. Por favor intenta de nuevo.',

    // Orders Page
    noOrdersYet: 'Aún no hay pedidos',
    createFirstOrder: 'Crea tu primer pedido para comenzar',
    all: 'Todos',
    pending: 'Pendiente',
    paid: 'Pagado',
    loadingOrders: 'Cargando pedidos...',
    created: 'Creado',
    reference: 'Referencia',
    words: 'palabras',

    // Messages Page
    noMessages: 'Sin mensajes',
    messagesWillAppear: 'Los mensajes de Legacy Translations aparecerán aquí',
    loadingMessages: 'Cargando mensajes...',
    markAsRead: 'Marcar como leído',
    new: 'Nuevo',

    // Page size info
    pageInfo: '1 página = 250 palabras máx.'
  },
  pt: {
    // Header & Navigation
    customerPortal: 'Portal do Cliente',
    signIn: 'Entre na sua conta',
    createAccount: 'Criar uma nova conta',
    newOrder: 'Novo Pedido',
    myOrders: 'Meus Pedidos',
    messages: 'Mensagens',
    logout: 'Sair',
    welcome: 'Bem-vindo,',

    // Login/Register
    fullName: 'Nome Completo',
    phoneOptional: 'Telefone (opcional)',
    email: 'E-mail',
    password: 'Senha',
    signInBtn: 'Entrar',
    createAccountBtn: 'Criar Conta',
    pleaseWait: 'Por favor aguarde...',
    noAccount: 'Não tem conta? Cadastre-se',
    hasAccount: 'Já tem conta? Entre',
    areYouPartner: 'Você é um parceiro?',
    goToPartnerPortal: 'Ir para o Portal de Parceiros',

    // New Order Page
    requestTranslation: 'Solicitar Tradução',
    enterDetails: 'Insira seus dados para receber seu orçamento',
    yourName: 'Seu Nome *',
    yourEmail: 'Seu E-mail *',
    sendQuoteHere: 'Enviaremos seu orçamento e atualizações aqui',

    // Service Types
    serviceType: 'Tipo de Serviço',
    certifiedTranslation: 'Tradução Certificada',
    certifiedDesc: 'Documentos oficiais, jurídico, imigração',
    standardTranslation: 'Tradução Padrão',
    standardDesc: 'Uso geral, sem certificação',
    swornTranslation: 'Tradução Juramentada',
    swornDesc: 'Para uso fora dos EUA - tradutor juramentado oficial',
    rmvTranslation: 'Tradução Certificada RMV',
    rmvDesc: 'Departamento de Veículos de Massachusetts - requer cópia física',
    perPage: '/página',

    // Service Descriptions
    certifiedInfo: 'Inclui uma Declaração de Precisão assinada, carimbo e assinatura; aceita pela maioria das instituições.',
    standardInfo: 'Tradução precisa para uso geral; não inclui certificação.',
    swornInfo: 'Realizada por um tradutor juramentado registrado no país de uso; exigida para países específicos.',
    rmvInfo: 'Certificada em papel timbrado oficial com todos os elementos exigidos; aceita pelo RMV para carteiras, IDs e fins relacionados.',

    // Languages
    translateFrom: 'Traduzir De',
    translateTo: 'Traduzir Para',
    swornOnlyPortuguese: 'Traduções juramentadas só estão disponíveis para Português (Brasil)',

    // Upload
    uploadDocument: 'Enviar Documento',
    uploadFiles: '+ Enviar Arquivo(s)',
    acceptedFormats: 'PDF, DOCX, Imagens, TXT',
    connectingServer: 'Conectando ao servidor...',
    processing: 'Processando',
    processingDocument: 'Processando documento...',
    processingLargeFile: 'Isso pode levar um momento para arquivos grandes ou baseados em imagens',
    uploadTrouble: 'Problemas para enviar?',
    contactEmail: 'Entre em contato por e-mail',
    page: 'página',
    pages: 'páginas',
    total: 'Total',

    // Urgency
    urgency: 'Urgência',
    standard23Days: 'Padrão (2-3 dias)',
    priority24Hours: 'Prioritário (24 horas)',
    urgent12Hours: 'Urgente (12 horas)',

    // Physical Copy
    requirePhysicalCopy: 'Você precisa da cópia física da tradução?',
    no: 'Não',
    yes: 'Sim',
    digitalOnly: 'Apenas cópia digital',
    priorityMail: 'Correio Prioritário',
    rmvRequiresPhysical: 'RMV exige uma cópia física. O frete está incluído automaticamente.',
    shippingAddressUSA: 'Endereço de Envio (EUA)',
    streetAddress: 'Endereço *',
    city: 'Cidade *',
    state: 'Estado *',
    zipCode: 'CEP *',
    country: 'País',
    estimatedDelivery: 'USPS Priority Mail - Entrega estimada: 1-3 dias úteis',

    // Notes
    specialInstructions: 'Instruções Especiais (opcional)',
    instructionsPlaceholder: 'Qualquer instrução especial para nossos tradutores...',

    // Quote Summary
    quoteSummary: 'Resumo do Orçamento',
    service: 'Serviço',
    basePrice: 'Preço Base',
    urgencyFee: 'Taxa de Urgência',
    certification: 'Certificação',
    uspsPriorityMail: 'USPS Priority Mail',
    discount: 'Desconto',
    discountCode: 'Código de Desconto',
    enterCode: 'Inserir código',
    apply: 'Aplicar',
    off: 'de desconto',
    applied: 'aplicado!',
    paymentRequired: '* Pagamento necessário para iniciar a tradução',

    // Buttons
    continueToPayment: 'Continuar para Pagamento',
    processingBtn: 'Processando...',

    // Contact
    questionsAboutPricing: 'Dúvidas sobre seu preço?',
    requestQuoteInstead: 'Solicitar um orçamento em vez disso',

    // Exit Popup
    waitSpecialOffer: 'Espere! Oferta Especial!',
    completeOrderNow: 'Complete seu pedido agora e ganhe',
    offDiscount: 'DE DESCONTO',
    useCodeAtCheckout: 'Use este código no pagamento',
    yesApplyDiscount: 'Sim, Aplicar Meu Desconto de 5%!',
    noPayFullPrice: 'Não obrigado, pagarei o preço cheio',

    // Validation Errors
    pleaseEnterName: 'Por favor insira seu nome',
    pleaseEnterEmail: 'Por favor insira seu e-mail',
    pleaseUploadDocument: 'Por favor envie um documento',
    pleaseCompleteShipping: 'Por favor complete o endereço de envio',

    // Success/Error Messages
    paymentSuccessful: 'Pagamento realizado! Seu pedido foi confirmado. Verifique seu e-mail para detalhes.',
    paymentCanceled: 'Pagamento cancelado. Seu pedido foi salvo - você pode completar o pagamento depois.',
    invalidDiscountCode: 'Código de desconto inválido ou expirado',
    failedToProcess: 'Falha ao processar o pagamento. Por favor tente novamente.',
    processingTimedOut: 'O processamento expirou. O arquivo pode ser muito grande ou complexo. Por favor tente um arquivo menor.',
    errorProcessingDocument: 'Erro ao processar o documento. Por favor tente novamente.',

    // Orders Page
    noOrdersYet: 'Nenhum pedido ainda',
    createFirstOrder: 'Crie seu primeiro pedido para começar',
    all: 'Todos',
    pending: 'Pendente',
    paid: 'Pago',
    loadingOrders: 'Carregando pedidos...',
    created: 'Criado',
    reference: 'Referência',
    words: 'palavras',

    // Messages Page
    noMessages: 'Sem mensagens',
    messagesWillAppear: 'Mensagens da Legacy Translations aparecerão aqui',
    loadingMessages: 'Carregando mensagens...',
    markAsRead: 'Marcar como lido',
    new: 'Novo',

    // Page size info
    pageInfo: '1 página = 250 palavras máx.'
  }
};

// Get saved UI language or default to English
const getSavedUILanguage = () => {
  const saved = localStorage.getItem('customer_ui_language');
  if (saved && ['en', 'es', 'pt'].includes(saved)) return saved;
  return 'en';
};

// ==================== LOGIN PAGE (Customer) ====================
const CustomerLoginPage = ({ onLogin, t }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
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
        const response = await axios.post(`${API}/customer/auth/login`, {
          email: formData.email,
          password: formData.password
        });
        onLogin(response.data);
      } else {
        const response = await axios.post(`${API}/customer/auth/register`, {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
            alt="Legacy Translations"
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">{t.customerPortal}</h1>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.fullName}</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.phoneOptional}</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
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
            {loading ? t.pleaseWait : (isLogin ? t.signInBtn : t.createAccountBtn)}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-teal-600 hover:underline"
          >
            {isLogin ? t.noAccount : t.hasAccount}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-sm text-gray-500">
            {t.areYouPartner}{' '}
            <a href="/partner" className="text-teal-600 hover:underline">
              {t.goToPartnerPortal}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

// ==================== CUSTOMER SIDEBAR ====================
const CustomerSidebar = ({ activeTab, setActiveTab, customer, onLogout, t }) => {
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
        <div className="text-sm text-gray-600 mb-2">{t.welcome}</div>
        <div className="font-semibold text-gray-800">{customer?.full_name}</div>
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

// ==================== CUSTOMER NEW ORDER PAGE (Single page with inline email capture) ====================
const CustomerNewOrderPage = ({ customer, token, onOrderCreated, t }) => {
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');

  // Refs for scrolling to errors
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const fileUploadRef = useRef(null);
  const shippingRef = useRef(null);

  // Field error states
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [abandonedQuoteId, setAbandonedQuoteId] = useState(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [exitPopupShown, setExitPopupShown] = useState(() => {
    return sessionStorage.getItem('exitPopupShown') === 'true';
  });


  // Certification options
  const [certifications, setCertifications] = useState({
    notarization: false,
    eApostille: false
  });

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

  // If logged in, pre-fill email/name
  useEffect(() => {
    if (customer) {
      setGuestEmail(customer.email);
      setGuestName(customer.full_name);
    }
  }, [customer]);

  // Check for payment success/cancel from Stripe redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const paymentCanceled = urlParams.get('payment_canceled');
    const sessionId = urlParams.get('session_id');

    if (paymentSuccess === 'true' && sessionId) {
      setSuccess('Payment successful! Your order has been confirmed. Check your email for details.');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentCanceled === 'true') {
      setError('Payment was canceled. Your order has been saved - you can complete payment later.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Calculate quote function (defined before useEffect that calls it)
  const calculateQuote = useCallback(() => {
    let basePrice = 0;
    const pages = uploadedFiles.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.wordCount / 250)), 0);

    // Price per page based on service type
    switch (formData.service_type) {
      case 'standard':
        basePrice = pages * 19.99;
        break;
      case 'certified':
        basePrice = pages * 24.99;
        break;
      case 'rmv':
        basePrice = pages * 24.99;
        break;
      case 'sworn':
        basePrice = pages * 55.00;
        break;
      default:
        basePrice = pages * 19.99;
    }

    let urgencyFee = 0;
    if (formData.urgency === 'priority') {
      urgencyFee = basePrice * 0.25;
    } else if (formData.urgency === 'urgent') {
      urgencyFee = basePrice * 1.0;
    }

    // Certification fees
    let certificationFee = 0;
    if (certifications.notarization) {
      certificationFee += 19.95;
    }
    if (certifications.eApostille) {
      certificationFee += 79.95;
    }

    // Shipping fee
    let shippingFee = 0;
    if (needsPhysicalCopy || formData.service_type === 'rmv') {
      shippingFee = USPS_PRIORITY_MAIL;
    }

    let subtotal = basePrice + urgencyFee + certificationFee + shippingFee;
    let discountAmount = 0;

    if (appliedDiscount) {
      if (appliedDiscount.type === 'percentage') {
        discountAmount = subtotal * (appliedDiscount.value / 100);
      } else {
        discountAmount = appliedDiscount.value;
      }
    }

    setQuote({
      base_price: basePrice,
      urgency_fee: urgencyFee,
      certification_fee: certificationFee,
      shipping_fee: shippingFee,
      discount: discountAmount,
      total_price: Math.max(0, subtotal - discountAmount),
      pages: pages
    });
  }, [uploadedFiles, formData.service_type, formData.urgency, certifications, appliedDiscount, needsPhysicalCopy]);

  // Calculate quote when relevant fields change
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      calculateQuote();
    }
  }, [uploadedFiles, formData.service_type, formData.urgency, appliedDiscount, certifications, needsPhysicalCopy, calculateQuote]);

  // Auto-enable physical copy for RMV service
  useEffect(() => {
    if (formData.service_type === 'rmv') {
      setNeedsPhysicalCopy(true);
    }
  }, [formData.service_type]);

  // Force Portuguese (Brasil) as target language for Sworn Translation
  useEffect(() => {
    if (formData.service_type === 'sworn') {
      setFormData(prev => ({...prev, translate_to: 'pt-br'}));
    }
  }, [formData.service_type]);

  // Auto-save abandoned quote when user sees the price
  useEffect(() => {
    if (quote && guestEmail && uploadedFiles.length > 0 && !abandonedQuoteId) {
      autoSaveAbandonedQuote();
    }
  }, [quote, guestEmail]);

  // Exit intent detection - only show once per session
  useEffect(() => {
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && quote && !success && guestEmail && !exitPopupShown) {
        setShowExitPopup(true);
        setExitPopupShown(true);
        sessionStorage.setItem('exitPopupShown', 'true');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [quote, success, guestEmail, exitPopupShown]);

  const autoSaveAbandonedQuote = async () => {
    try {
      const quoteData = {
        email: guestEmail,
        name: guestName,
        service_type: formData.service_type,
        translate_from: formData.translate_from,
        translate_to: formData.translate_to,
        word_count: wordCount,
        urgency: formData.urgency,
        total_price: quote?.total_price || 0,
        document_ids: uploadedFiles.map(f => f.documentId).filter(Boolean),
        files_info: uploadedFiles.map(f => ({ fileName: f.fileName, wordCount: f.wordCount }))
      };

      const response = await axios.post(`${API}/abandoned-quotes/save`, quoteData);
      setAbandonedQuoteId(response.data.quote_id);
    } catch (err) {
      console.error('Failed to auto-save quote:', err);
    }
  };

  const applyDiscountCode = async () => {
    if (!discountCode.trim()) return;

    try {
      const response = await axios.get(`${API}/discount-codes/validate?code=${discountCode}`);
      if (response.data.valid) {
        setAppliedDiscount(response.data.discount);
        setError('');
      } else {
        setError('Invalid or expired discount code');
        setAppliedDiscount(null);
      }
    } catch (err) {
      setError('Invalid or expired discount code');
      setAppliedDiscount(null);
    }
  };


  const [processingStatus, setProcessingStatus] = useState('');

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    setError('');
    setFieldErrors(prev => ({...prev, files: null}));
    setProcessingStatus('Connecting to server...');

    try {
      let newWords = 0;
      const newFiles = [];

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setProcessingStatus(`Processing ${file.name} (${i + 1}/${acceptedFiles.length})...`);

        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const response = await axios.post(`${API}/upload-document`, formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000
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
  }, []);

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
    setError('');

    // Validate fields and collect errors
    const errors = {};

    if (!guestName) {
      errors.name = 'Please enter your name';
    }
    if (!guestEmail) {
      errors.email = 'Please enter your email';
    }
    if (wordCount === 0) {
      errors.files = 'Please upload a document';
    }
    if ((needsPhysicalCopy || formData.service_type === 'rmv') &&
        (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode)) {
      errors.shipping = 'Please complete the shipping address';
    }

    // If there are errors, scroll to the first one
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);

      // Scroll to first error
      if (errors.name && nameRef.current) {
        nameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.email && emailRef.current) {
        emailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.files && fileUploadRef.current) {
        fileUploadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.shipping && shippingRef.current) {
        shippingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create a quote first
      const quoteData = {
        reference: `WEB-${Date.now()}`,
        service_type: formData.service_type,
        translate_from: formData.translate_from,
        translate_to: formData.translate_to,
        word_count: wordCount,
        urgency: formData.urgency,
        customer_email: guestEmail,
        customer_name: guestName,
        notes: formData.notes,
        document_ids: uploadedFiles.map(f => f.documentId).filter(Boolean)
      };

      // Create quote
      const quoteResponse = await axios.post(`${API}/calculate-quote`, quoteData);
      const quoteId = quoteResponse.data.id;

      // Step 2: Create Stripe checkout session
      const checkoutResponse = await axios.post(`${API}/create-payment-checkout`, {
        quote_id: quoteId,
        customer_email: guestEmail,
        customer_name: guestName,
        origin_url: window.location.origin + '/customer'
      });

      // Step 3: Redirect to Stripe checkout
      if (checkoutResponse.data.checkout_url) {
        window.location.href = checkoutResponse.data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process payment. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      {/* Exit Intent Popup - Special Discount Offer */}
      {showExitPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md text-center relative">
            <button
              onClick={() => setShowExitPopup(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl"
            >
              &times;
            </button>
            <div className="text-5xl mb-4">🎁</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.waitSpecialOffer}</h2>
            <p className="text-gray-600 mb-4">
              {t.completeOrderNow} <span className="text-teal-600 font-bold">5% {t.offDiscount}</span>!
            </p>
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg mb-4 border border-teal-200">
              <p className="text-2xl font-bold text-teal-600 mb-1">SAVE5</p>
              <p className="text-sm text-gray-600">{t.useCodeAtCheckout}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setDiscountCode('SAVE5');
                  setAppliedDiscount({ type: 'percentage', value: 5 });
                  setShowExitPopup(false);
                }}
                className="w-full py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-semibold text-lg"
              >
                {t.yesApplyDiscount}
              </button>
              <button
                onClick={() => setShowExitPopup(false)}
                className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium text-sm"
              >
                {t.noPayFullPrice}
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t.requestTranslation}</h1>

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

            {/* Contact Info - Subtle at top */}
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg border border-teal-100">
              <p className="text-sm text-gray-600 mb-3">{t.enterDetails}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div ref={nameRef}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.yourName}</label>
                  <input
                    type="text"
                    required
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 text-sm ${fieldErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    value={guestName}
                    onChange={(e) => { setGuestName(e.target.value); setFieldErrors(prev => ({...prev, name: null})); }}
                    placeholder="John Smith"
                    disabled={!!customer}
                  />
                  {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
                </div>
                <div ref={emailRef}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.yourEmail}</label>
                  <input
                    type="email"
                    required
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 text-sm ${fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    value={guestEmail}
                    onChange={(e) => { setGuestEmail(e.target.value); setFieldErrors(prev => ({...prev, email: null})); }}
                    placeholder="your@email.com"
                    disabled={!!customer}
                  />
                  {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{t.sendQuoteHere}</p>
            </div>

            {/* Service Type */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t.serviceType}</h2>
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
                      {t.certifiedTranslation}
                      <span className="text-gray-400 cursor-help" title={t.certifiedInfo}>&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">{t.certifiedDesc}</div>
                  </div>
                  <div className="font-semibold text-teal-600">$24.99{t.perPage}</div>
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
                      {t.standardTranslation}
                      <span className="text-gray-400 cursor-help" title={t.standardInfo}>&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">{t.standardDesc}</div>
                  </div>
                  <div className="font-semibold text-teal-600">$19.99{t.perPage}</div>
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
                      {t.swornTranslation}
                      <span className="text-gray-400 cursor-help" title={t.swornInfo}>&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">{t.swornDesc}</div>
                  </div>
                  <div className="font-semibold text-teal-600">$55.00{t.perPage}</div>
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
                      {t.rmvTranslation}
                      <span className="text-gray-400 cursor-help" title={t.rmvInfo}>&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">{t.rmvDesc}</div>
                  </div>
                  <div className="font-semibold text-teal-600">$24.99{t.perPage}</div>
                </label>
              </div>

              {/* Service Type Descriptions */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-2">
                <p><strong>{t.certifiedTranslation}:</strong> {t.certifiedInfo}</p>
                <p><strong>{t.standardTranslation}:</strong> {t.standardInfo}</p>
                <p><strong>{t.swornTranslation}:</strong> {t.swornInfo}</p>
                <p><strong>{t.rmvTranslation}:</strong> {t.rmvInfo}</p>
              </div>
            </div>

            {/* Languages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.translateFrom}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.translateTo}</label>
                {formData.service_type === 'sworn' ? (
                  <div>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                      value="pt-br"
                      disabled
                    >
                      <option value="pt-br">🇧🇷 Portuguese (Brasil)</option>
                    </select>
                    <p className="text-xs text-amber-600 mt-1">{t.swornOnlyPortuguese}</p>
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
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t.uploadDocument}</h2>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  fieldErrors.files ? 'border-red-500 bg-red-50' : isDragActive ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-500'
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-3xl mb-2">📁</div>
                <div className="font-medium text-teal-600">{t.uploadFiles}</div>
                <div className="text-sm text-gray-500">{t.acceptedFormats}</div>
              </div>
              {fieldErrors.files && <p className="text-red-500 text-sm mt-2">{fieldErrors.files}</p>}

              {isProcessing && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <div className="text-blue-800 font-medium">{processingStatus || t.processingDocument}</div>
                  <div className="text-xs text-blue-600 mt-1">{t.processingLargeFile}</div>
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
                          <span className="text-gray-400 text-sm ml-2">({pages} {pages === 1 ? t.page : t.pages})</span>
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
                    {t.total}: {uploadedFiles.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.wordCount / 250)), 0)} {uploadedFiles.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.wordCount / 250)), 0) === 1 ? t.page : t.pages}
                  </div>
                </div>
              )}

              {/* Contact support link - shown after upload section */}
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-400">
                  {t.uploadTrouble}{' '}
                  <a
                    href="mailto:info@legacytranslations.com?subject=Document Upload Issue"
                    className="text-teal-600 hover:underline"
                  >
                    {t.contactEmail}
                  </a>
                </p>
              </div>
            </div>

            {/* Urgency */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t.urgency}</h2>
              <div className="space-y-2">
                {[
                  { id: 'no', label: t.standard23Days, fee: '' },
                  { id: 'priority', label: t.priority24Hours, fee: '+25%' },
                  { id: 'urgent', label: t.urgent12Hours, fee: '+100%' }
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
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t.requirePhysicalCopy}</h2>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <label className={`flex-1 p-4 border rounded-lg cursor-pointer text-center ${
                    !needsPhysicalCopy && formData.service_type !== 'rmv' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="physical_copy"
                      checked={!needsPhysicalCopy && formData.service_type !== 'rmv'}
                      onChange={() => setNeedsPhysicalCopy(false)}
                      disabled={formData.service_type === 'rmv'}
                      className="sr-only"
                    />
                    <span className="font-medium">{t.no}</span>
                    <p className="text-xs text-gray-500 mt-1">{t.digitalOnly}</p>
                  </label>
                  <label className={`flex-1 p-4 border rounded-lg cursor-pointer text-center ${
                    needsPhysicalCopy || formData.service_type === 'rmv' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="physical_copy"
                      checked={needsPhysicalCopy || formData.service_type === 'rmv'}
                      onChange={() => setNeedsPhysicalCopy(true)}
                      className="sr-only"
                    />
                    <span className="font-medium">{t.yes}</span>
                    <p className="text-xs text-gray-500 mt-1">+ ${USPS_PRIORITY_MAIL} {t.priorityMail}</p>
                  </label>
                </div>

                {formData.service_type === 'rmv' && (
                  <div className="p-3 bg-amber-50 rounded-md border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> {t.rmvRequiresPhysical}
                    </p>
                  </div>
                )}

                {(needsPhysicalCopy || formData.service_type === 'rmv') && (
                  <div ref={shippingRef} className={`p-4 rounded-lg space-y-3 ${fieldErrors.shipping ? 'bg-red-50 border border-red-300' : 'bg-gray-50'}`}>
                    <p className="text-sm font-medium text-gray-700">{t.shippingAddressUSA}</p>
                    {fieldErrors.shipping && <p className="text-red-500 text-sm">{fieldErrors.shipping}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">{t.streetAddress}</label>
                        <input
                          type="text"
                          required={needsPhysicalCopy}
                          className={`w-full px-3 py-2 border rounded-md text-sm ${fieldErrors.shipping && !shippingAddress.street ? 'border-red-500' : 'border-gray-300'}`}
                          value={shippingAddress.street}
                          onChange={(e) => { setShippingAddress({...shippingAddress, street: e.target.value}); setFieldErrors(prev => ({...prev, shipping: null})); }}
                          placeholder="123 Main Street, Apt 4B"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t.city}</label>
                        <input
                          type="text"
                          required={needsPhysicalCopy}
                          className={`w-full px-3 py-2 border rounded-md text-sm ${fieldErrors.shipping && !shippingAddress.city ? 'border-red-500' : 'border-gray-300'}`}
                          value={shippingAddress.city}
                          onChange={(e) => { setShippingAddress({...shippingAddress, city: e.target.value}); setFieldErrors(prev => ({...prev, shipping: null})); }}
                          placeholder="Boston"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t.state}</label>
                        <input
                          type="text"
                          required={needsPhysicalCopy}
                          className={`w-full px-3 py-2 border rounded-md text-sm ${fieldErrors.shipping && !shippingAddress.state ? 'border-red-500' : 'border-gray-300'}`}
                          value={shippingAddress.state}
                          onChange={(e) => { setShippingAddress({...shippingAddress, state: e.target.value}); setFieldErrors(prev => ({...prev, shipping: null})); }}
                          placeholder="MA"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t.zipCode}</label>
                        <input
                          type="text"
                          required={needsPhysicalCopy}
                          className={`w-full px-3 py-2 border rounded-md text-sm ${fieldErrors.shipping && !shippingAddress.zipCode ? 'border-red-500' : 'border-gray-300'}`}
                          value={shippingAddress.zipCode}
                          onChange={(e) => { setShippingAddress({...shippingAddress, zipCode: e.target.value}); setFieldErrors(prev => ({...prev, shipping: null})); }}
                          placeholder="02101"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t.country}</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100"
                          value="USA"
                          disabled
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {t.estimatedDelivery}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.specialInstructions}</label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder={t.instructionsPlaceholder}
              />
            </div>

            {/* Questions about pricing? - Contact */}
            <div className="bg-gray-50 p-5 rounded-lg text-center">
              <p className="text-gray-600 mb-3">{t.questionsAboutPricing}</p>
              <a
                href="mailto:contact@legacytranslations.com?subject=Quote Request"
                className="inline-block px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-white hover:border-gray-400 transition-colors font-medium"
              >
                {t.requestQuoteInstead}
              </a>
            </div>

            {/* Continue to Payment Button */}
            <button
              type="submit"
              disabled={submitting || wordCount === 0 || !guestName || !guestEmail || ((needsPhysicalCopy || formData.service_type === 'rmv') && (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode))}
              className="w-full py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-400 font-semibold"
            >
              {submitting ? t.processingBtn : t.continueToPayment}
            </button>
          </form>
        </div>

        {/* Quote Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 h-fit sticky top-8">
          <h2 className="text-xl font-bold text-teal-600 mb-4">{t.quoteSummary}</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t.service}</span>
              <span className="font-medium">
                {formData.service_type === 'standard' && t.standardTranslation}
                {formData.service_type === 'certified' && t.certifiedTranslation}
                {formData.service_type === 'rmv' && t.rmvTranslation}
                {formData.service_type === 'sworn' && t.swornTranslation}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.pages}</span>
              <span className="font-medium">{quote?.pages || 0}</span>
            </div>
            <p className="text-xs text-gray-400 text-right">{t.pageInfo}</p>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t.basePrice}</span>
                <span className="font-medium">${(quote?.base_price || 0).toFixed(2)}</span>
              </div>
              {quote?.urgency_fee > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>{t.urgencyFee}</span>
                  <span>${quote.urgency_fee.toFixed(2)}</span>
                </div>
              )}
              {quote?.certification_fee > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>{t.certification}</span>
                  <span>${quote.certification_fee.toFixed(2)}</span>
                </div>
              )}
              {quote?.shipping_fee > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>{t.uspsPriorityMail}</span>
                  <span>${quote.shipping_fee.toFixed(2)}</span>
                </div>
              )}
              {quote?.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t.discount}</span>
                  <span>-${quote.discount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-lg">
                <span className="font-bold">{t.total}</span>
                <span className="font-bold text-teal-600">${(quote?.total_price || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Discount Code */}
            <div className="border-t pt-3 mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.discountCode}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder={t.enterCode}
                />
                <button
                  type="button"
                  onClick={applyDiscountCode}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                >
                  {t.apply}
                </button>
              </div>
              {appliedDiscount && (
                <p className="text-green-600 text-xs mt-1">
                  {appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}% ${t.off}` : `$${appliedDiscount.value} ${t.off}`} {t.applied}
                </p>
              )}
            </div>

            <div className="text-xs text-gray-500 mt-4">
              {t.paymentRequired}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== CUSTOMER ORDERS PAGE ====================
const CustomerOrdersPage = ({ token, t }) => {
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
      const response = await axios.get(`${API}/customer/orders?token=${token}${params}`);
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

  const filterLabels = {
    'all': t.all,
    'pending': t.pending,
    'paid': t.paid
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t.loadingOrders}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t.myOrders}</h1>
        <div className="flex gap-2">
          {['all', 'pending', 'paid'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.noOrdersYet}</h2>
          <p className="text-gray-600">{t.createFirstOrder}</p>
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
                      <div className="text-sm text-gray-500 mt-1">
                        {order.translate_from} → {order.translate_to} | {order.word_count} {t.words}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-800">${order.total_price?.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder === order.id && (
                <div className="border-t bg-gray-50 p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">{t.service}</div>
                      <div className="font-medium">{order.service_type === 'standard' ? t.standardTranslation : t.certifiedTranslation}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{t.created}</div>
                      <div className="font-medium">{new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{t.basePrice}</div>
                      <div className="font-medium">${order.base_price?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{t.urgencyFee}</div>
                      <div className="font-medium">${order.urgency_fee?.toFixed(2)}</div>
                    </div>
                  </div>
                  {order.reference && (
                    <div className="mt-4">
                      <div className="text-sm text-gray-500">{t.reference}</div>
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

// ==================== CUSTOMER MESSAGES PAGE ====================
const CustomerMessagesPage = ({ token, t }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/customer/messages?token=${token}`);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await axios.put(`${API}/customer/messages/${messageId}/read?token=${token}`);
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
        <p className="mt-4 text-gray-600">{t.loadingMessages}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t.messages}</h1>

      {messages.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.noMessages}</h2>
          <p className="text-gray-600">{t.messagesWillAppear}</p>
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
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">{t.new}</span>
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
                    {t.markAsRead}
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

// ==================== MAIN CUSTOMER APP ====================
function CustomerApp() {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('new-order');
  const [uiLang, setUiLang] = useState(getSavedUILanguage);

  // Get current translations
  const t = CUSTOMER_TRANSLATIONS[uiLang] || CUSTOMER_TRANSLATIONS.en;

  // Handle UI language change
  const changeUILanguage = (newLang) => {
    setUiLang(newLang);
    localStorage.setItem('customer_ui_language', newLang);
  };

  // Check for saved session
  useEffect(() => {
    const savedCustomer = localStorage.getItem('customer');
    const savedToken = localStorage.getItem('customer_token');
    if (savedCustomer && savedToken) {
      setCustomer(JSON.parse(savedCustomer));
      setToken(savedToken);
    }
  }, []);

  const handleLogin = (data) => {
    setCustomer(data);
    setToken(data.token);
    localStorage.setItem('customer', JSON.stringify(data));
    localStorage.setItem('customer_token', data.token);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/customer/auth/logout?token=${token}`);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCustomer(null);
    setToken(null);
    localStorage.removeItem('customer');
    localStorage.removeItem('customer_token');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'new-order':
        return (
          <CustomerNewOrderPage
            customer={customer}
            token={token}
            onOrderCreated={() => setActiveTab('orders')}
            t={t}
          />
        );
      case 'orders':
        return <CustomerOrdersPage token={token} t={t} />;
      case 'messages':
        return <CustomerMessagesPage token={token} t={t} />;
      default:
        return <CustomerNewOrderPage customer={customer} token={token} t={t} />;
    }
  };

  // If not logged in, show the order page (which has step-based email capture)
  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex justify-between items-center max-w-6xl mx-auto">
            <img
              src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
              alt="Legacy Translations"
              className="h-12"
            />
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              {UI_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeUILanguage(lang.code)}
                  className={`text-xl hover:scale-110 transition-transform ${
                    uiLang === lang.code ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'
                  }`}
                  title={lang.name}
                >
                  {lang.flag}
                </button>
              ))}
            </div>
          </div>
        </header>
        <CustomerNewOrderPage customer={null} token={null} onOrderCreated={() => {}} t={t} />
      </div>
    );
  }

  // Get header title based on active tab
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'new-order': return t.newOrder;
      case 'orders': return t.myOrders;
      case 'messages': return t.messages;
      default: return t.newOrder;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <CustomerSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        customer={customer}
        onLogout={handleLogout}
        t={t}
      />
      <div className="flex-1">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">
              {getHeaderTitle()}
            </h1>
            <div className="flex items-center gap-4">
              {/* Language Selector */}
              <div className="flex items-center gap-2">
                {UI_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeUILanguage(lang.code)}
                    className={`text-lg hover:scale-110 transition-transform ${
                      uiLang === lang.code ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'
                    }`}
                    title={lang.name}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>
              <div className="text-sm text-gray-600">
                {customer?.full_name} | {customer?.email}
              </div>
            </div>
          </div>
        </header>
        {renderContent()}
      </div>
    </div>
  );
}

export default CustomerApp;
