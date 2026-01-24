import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

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

// Flag image helper - uses flagcdn.com for cross-platform compatibility
const getFlagUrl = (countryCode) => `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

// Languages list for FROM field (all common languages)
const FROM_LANGUAGES = [
  { code: 'english', name: 'English (USA)', countryCode: 'us' },
  { code: 'english_uk', name: 'English (UK)', countryCode: 'gb' },
  { code: 'spanish', name: 'Spanish', countryCode: 'es' },
  { code: 'french', name: 'French', countryCode: 'fr' },
  { code: 'german', name: 'German', countryCode: 'de' },
  { code: 'portuguese', name: 'Portuguese (Brazil)', countryCode: 'br' },
  { code: 'portuguese_pt', name: 'Portuguese (Portugal)', countryCode: 'pt' },
  { code: 'italian', name: 'Italian', countryCode: 'it' },
  { code: 'chinese_simplified', name: 'Chinese (Simplified)', countryCode: 'cn' },
  { code: 'chinese_traditional', name: 'Chinese (Traditional)', countryCode: 'tw' },
  { code: 'japanese', name: 'Japanese', countryCode: 'jp' },
  { code: 'korean', name: 'Korean', countryCode: 'kr' },
  { code: 'arabic', name: 'Arabic', countryCode: 'sa' },
  { code: 'russian', name: 'Russian', countryCode: 'ru' },
  { code: 'dutch', name: 'Dutch', countryCode: 'nl' },
  { code: 'polish', name: 'Polish', countryCode: 'pl' },
  { code: 'turkish', name: 'Turkish', countryCode: 'tr' },
  { code: 'vietnamese', name: 'Vietnamese', countryCode: 'vn' },
  { code: 'thai', name: 'Thai', countryCode: 'th' },
  { code: 'indonesian', name: 'Indonesian', countryCode: 'id' },
  { code: 'malay', name: 'Malay', countryCode: 'my' },
  { code: 'hindi', name: 'Hindi', countryCode: 'in' },
  { code: 'bengali', name: 'Bengali', countryCode: 'bd' },
  { code: 'urdu', name: 'Urdu', countryCode: 'pk' },
  { code: 'punjabi', name: 'Punjabi', countryCode: 'in' },
  { code: 'tamil', name: 'Tamil', countryCode: 'in' },
  { code: 'telugu', name: 'Telugu', countryCode: 'in' },
  { code: 'greek', name: 'Greek', countryCode: 'gr' },
  { code: 'czech', name: 'Czech', countryCode: 'cz' },
  { code: 'romanian', name: 'Romanian', countryCode: 'ro' },
  { code: 'hungarian', name: 'Hungarian', countryCode: 'hu' },
  { code: 'swedish', name: 'Swedish', countryCode: 'se' },
  { code: 'norwegian', name: 'Norwegian', countryCode: 'no' },
  { code: 'danish', name: 'Danish', countryCode: 'dk' },
  { code: 'finnish', name: 'Finnish', countryCode: 'fi' },
  { code: 'hebrew', name: 'Hebrew', countryCode: 'il' },
  { code: 'persian', name: 'Persian (Farsi)', countryCode: 'ir' },
  { code: 'ukrainian', name: 'Ukrainian', countryCode: 'ua' },
  { code: 'croatian', name: 'Croatian', countryCode: 'hr' },
  { code: 'serbian', name: 'Serbian', countryCode: 'rs' },
  { code: 'bulgarian', name: 'Bulgarian', countryCode: 'bg' },
  { code: 'slovak', name: 'Slovak', countryCode: 'sk' },
  { code: 'slovenian', name: 'Slovenian', countryCode: 'si' },
  { code: 'lithuanian', name: 'Lithuanian', countryCode: 'lt' },
  { code: 'latvian', name: 'Latvian', countryCode: 'lv' },
  { code: 'estonian', name: 'Estonian', countryCode: 'ee' },
  { code: 'swahili', name: 'Swahili', countryCode: 'ke' },
  { code: 'tagalog', name: 'Tagalog (Filipino)', countryCode: 'ph' },
  { code: 'afrikaans', name: 'Afrikaans', countryCode: 'za' },
  { code: 'catalan', name: 'Catalan', countryCode: 'es' },
  { code: 'haitian_creole', name: 'Haitian Creole', countryCode: 'ht' }
];

// Languages list for TO field (target languages)
const TO_LANGUAGES = [
  { code: 'english', name: 'English (USA)', countryCode: 'us' },
  { code: 'english_uk', name: 'English (UK)', countryCode: 'gb' },
  { code: 'spanish', name: 'Spanish', countryCode: 'es' },
  { code: 'french', name: 'French', countryCode: 'fr' },
  { code: 'german', name: 'German', countryCode: 'de' },
  { code: 'portuguese', name: 'Portuguese (Brazil)', countryCode: 'br' },
  { code: 'portuguese_pt', name: 'Portuguese (Portugal)', countryCode: 'pt' },
  { code: 'italian', name: 'Italian', countryCode: 'it' },
  { code: 'chinese_simplified', name: 'Chinese (Simplified)', countryCode: 'cn' },
  { code: 'chinese_traditional', name: 'Chinese (Traditional)', countryCode: 'tw' },
  { code: 'japanese', name: 'Japanese', countryCode: 'jp' },
  { code: 'korean', name: 'Korean', countryCode: 'kr' },
  { code: 'arabic', name: 'Arabic', countryCode: 'sa' },
  { code: 'russian', name: 'Russian', countryCode: 'ru' },
  { code: 'dutch', name: 'Dutch', countryCode: 'nl' }
];

// Keep LANGUAGES for backward compatibility
const LANGUAGES = TO_LANGUAGES;

// UI Languages (for interface translation)
const UI_LANGUAGES = [
  { code: 'en', countryCode: 'us', name: 'English' },
  { code: 'es', countryCode: 'es', name: 'Español' },
  { code: 'pt', countryCode: 'br', name: 'Português' }
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
    couponAtCheckout: 'Have a coupon? Apply it at checkout',
    apply: 'Apply',
    off: 'off',
    applied: 'applied!',
    paymentRequired: '* Payment required to start translation',

    // Payment Method Selection
    selectPaymentMethod: 'Select Payment Method',
    payWithCard: 'Pay with Card',
    payWithCardDesc: 'Secure payment via Stripe',
    payWithZelle: 'Pay with Zelle',
    payWithZelleDesc: 'Send payment to contact@legacytranslations.com',
    zelleInstructions: 'Zelle Payment Instructions',
    zelleStep1: '1. Open your bank app and select Zelle',
    zelleStep2: '2. Send payment to: contact@legacytranslations.com',
    zelleStep3: '3. Include your order number in the memo',
    zelleStep4: '4. Upload your payment receipt below',
    uploadReceipt: 'Upload Payment Receipt',
    receiptRequired: 'Receipt is required for Zelle payments',
    submitZelleOrder: 'Submit Order with Zelle',
    zelleOrderSubmitted: 'Order submitted! We will verify your Zelle payment and send a confirmation email once your translation begins.',
    zelleUsaOnly: '(USA only)',
    zelleSendTo: 'Send payment to',
    zelleIncludeEmail: 'Include your email in the payment note',
    zelleAmount: 'Amount',
    payWithZelleBtn: 'Pay with Zelle',
    couponCodeOptional: 'Coupon Code (optional)',
    enterCouponCode: 'Enter coupon code',
    invalidCoupon: 'Invalid coupon code',
    zelleAmountToPay: 'Amount to pay',

    // Buttons
    continueToPayment: 'Continue to Payment',
    processingBtn: 'Processing...',

    // Contact
    questionsAboutPricing: 'Questions about your pricing?',
    requestQuoteInstead: 'Request a quote instead',
    contactOptions: 'How would you like to contact us?',
    sendEmail: 'Send Email',
    chatWhatsApp: 'Chat on WhatsApp',
    orText: 'or',
    formDataRestored: 'Your previous form data has been restored.',

    // Support Modal
    needHelpGetSupport: 'NEED HELP? GET SUPPORT HERE',
    getSupport: 'Get Support',
    supportDescription: 'Share details about your issue and our team will respond via email.',
    whatHelpWith: 'What do you need help with?',
    selectIssueType: 'Select an issue type',
    problemsWithUpload: 'Problems with upload',
    notSureWhatTranslation: "I'm not sure what type of translation to order",
    otherIssue: 'Other',
    describeIssue: 'Describe the issue',
    issuePlaceholder: 'Include relevant order numbers, run IDs, or any other context so we can help faster.',
    provideDetail: 'Provide as much detail as possible.',
    attachments: 'Attachments (optional)',
    chooseFiles: 'CHOOSE FILES',
    noFileSelected: 'No file selected',
    attachInfo: 'Attach screenshots or PDFs (max 5 files, 10 MB each).',
    cancel: 'CANCEL',
    sendRequest: 'SEND REQUEST',
    supportSent: 'Support request sent! We will respond to your email shortly.',
    supportError: 'Error sending request. Please try again.',

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
    couponAtCheckout: '¿Tienes un cupón? Aplícalo en el checkout',
    apply: 'Aplicar',
    off: 'de descuento',
    applied: '¡aplicado!',
    paymentRequired: '* Se requiere pago para iniciar la traducción',

    // Payment Method Selection
    selectPaymentMethod: 'Seleccionar Método de Pago',
    payWithCard: 'Pagar con Tarjeta',
    payWithCardDesc: 'Pago seguro vía Stripe',
    payWithZelle: 'Pagar con Zelle',
    payWithZelleDesc: 'Enviar pago a contact@legacytranslations.com',
    zelleInstructions: 'Instrucciones de Pago Zelle',
    zelleStep1: '1. Abre tu app bancaria y selecciona Zelle',
    zelleStep2: '2. Envía el pago a: contact@legacytranslations.com',
    zelleStep3: '3. Incluye tu número de orden en el memo',
    zelleStep4: '4. Sube tu comprobante de pago abajo',
    uploadReceipt: 'Subir Comprobante de Pago',
    receiptRequired: 'El comprobante es requerido para pagos Zelle',
    submitZelleOrder: 'Enviar Orden con Zelle',
    zelleOrderSubmitted: '¡Orden enviada! Verificaremos tu pago Zelle y te enviaremos un email de confirmación cuando tu traducción comience.',
    zelleUsaOnly: '(Solo USA)',
    zelleSendTo: 'Enviar pago a',
    zelleIncludeEmail: 'Incluye tu email en la nota del pago',
    zelleAmount: 'Monto',
    payWithZelleBtn: 'Pagar con Zelle',
    couponCodeOptional: 'Código de Cupón (opcional)',
    enterCouponCode: 'Ingresa código de cupón',
    invalidCoupon: 'Código de cupón inválido',
    zelleAmountToPay: 'Monto a pagar',

    // Buttons
    continueToPayment: 'Continuar al Pago',
    processingBtn: 'Procesando...',

    // Contact
    questionsAboutPricing: '¿Preguntas sobre tu precio?',
    requestQuoteInstead: 'Solicitar una cotización en su lugar',
    contactOptions: '¿Cómo te gustaría contactarnos?',
    sendEmail: 'Enviar Email',
    chatWhatsApp: 'Chatear por WhatsApp',
    orText: 'o',
    formDataRestored: 'Tus datos del formulario anterior han sido restaurados.',

    // Support Modal
    needHelpGetSupport: '¿NECESITAS AYUDA? OBTÉN SOPORTE AQUÍ',
    getSupport: 'Obtener Soporte',
    supportDescription: 'Comparte detalles sobre tu problema y nuestro equipo responderá por email.',
    whatHelpWith: '¿Con qué necesitas ayuda?',
    selectIssueType: 'Selecciona un tipo de problema',
    problemsWithUpload: 'Problemas al subir documento',
    notSureWhatTranslation: 'No estoy seguro qué tipo de traducción pedir',
    otherIssue: 'Otro',
    describeIssue: 'Describe el problema',
    issuePlaceholder: 'Incluye números de pedido, IDs o cualquier contexto para ayudarte más rápido.',
    provideDetail: 'Proporciona el mayor detalle posible.',
    attachments: 'Adjuntos (opcional)',
    chooseFiles: 'ELEGIR ARCHIVOS',
    noFileSelected: 'Ningún archivo seleccionado',
    attachInfo: 'Adjunta capturas o PDFs (máx 5 archivos, 10 MB cada uno).',
    cancel: 'CANCELAR',
    sendRequest: 'ENVIAR SOLICITUD',
    supportSent: '¡Solicitud de soporte enviada! Responderemos a tu email pronto.',
    supportError: 'Error al enviar solicitud. Por favor intenta de nuevo.',

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
    couponAtCheckout: 'Tem um cupom? Aplique no checkout',
    apply: 'Aplicar',
    off: 'de desconto',
    applied: 'aplicado!',
    paymentRequired: '* Pagamento necessário para iniciar a tradução',

    // Payment Method Selection
    selectPaymentMethod: 'Selecionar Método de Pagamento',
    payWithCard: 'Pagar com Cartão',
    payWithCardDesc: 'Pagamento seguro via Stripe',
    payWithZelle: 'Pagar com Zelle',
    payWithZelleDesc: 'Enviar pagamento para contact@legacytranslations.com',
    zelleInstructions: 'Instruções de Pagamento Zelle',
    zelleStep1: '1. Abra seu app bancário e selecione Zelle',
    zelleStep2: '2. Envie o pagamento para: contact@legacytranslations.com',
    zelleStep3: '3. Inclua seu número do pedido no memo',
    zelleStep4: '4. Faça upload do comprovante abaixo',
    uploadReceipt: 'Enviar Comprovante de Pagamento',
    receiptRequired: 'Comprovante é obrigatório para pagamentos Zelle',
    submitZelleOrder: 'Enviar Pedido com Zelle',
    zelleOrderSubmitted: 'Pedido enviado! Verificaremos seu pagamento Zelle e enviaremos um email de confirmação quando sua tradução começar.',
    zelleUsaOnly: '(Somente EUA)',
    zelleSendTo: 'Enviar pagamento para',
    zelleIncludeEmail: 'Inclua seu email na nota do pagamento',
    zelleAmount: 'Valor',
    payWithZelleBtn: 'Pagar com Zelle',
    couponCodeOptional: 'Código do Cupom (opcional)',
    enterCouponCode: 'Digite o código do cupom',
    invalidCoupon: 'Código do cupom inválido',
    zelleAmountToPay: 'Valor a pagar',

    // Buttons
    continueToPayment: 'Continuar para Pagamento',
    processingBtn: 'Processando...',

    // Contact
    questionsAboutPricing: 'Dúvidas sobre seu preço?',
    requestQuoteInstead: 'Solicitar um orçamento em vez disso',
    contactOptions: 'Como você gostaria de nos contatar?',
    sendEmail: 'Enviar Email',
    chatWhatsApp: 'Conversar no WhatsApp',
    orText: 'ou',
    formDataRestored: 'Seus dados do formulário anterior foram restaurados.',

    // Support Modal
    needHelpGetSupport: 'PRECISA DE AJUDA? OBTENHA SUPORTE AQUI',
    getSupport: 'Obter Suporte',
    supportDescription: 'Compartilhe detalhes sobre seu problema e nossa equipe responderá por email.',
    whatHelpWith: 'Com o que você precisa de ajuda?',
    selectIssueType: 'Selecione um tipo de problema',
    problemsWithUpload: 'Problemas ao enviar documento',
    notSureWhatTranslation: 'Não tenho certeza qual tipo de tradução pedir',
    otherIssue: 'Outro',
    describeIssue: 'Descreva o problema',
    issuePlaceholder: 'Inclua números de pedido, IDs ou qualquer contexto para ajudarmos mais rápido.',
    provideDetail: 'Forneça o máximo de detalhes possível.',
    attachments: 'Anexos (opcional)',
    chooseFiles: 'ESCOLHER ARQUIVOS',
    noFileSelected: 'Nenhum arquivo selecionado',
    attachInfo: 'Anexe capturas de tela ou PDFs (máx 5 arquivos, 10 MB cada).',
    cancel: 'CANCELAR',
    sendRequest: 'ENVIAR SOLICITAÇÃO',
    supportSent: 'Solicitação de suporte enviada! Responderemos ao seu email em breve.',
    supportError: 'Erro ao enviar solicitação. Por favor tente novamente.',

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
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [abandonedQuoteId, setAbandonedQuoteId] = useState(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [exitPopupShown, setExitPopupShown] = useState(() => {
    return sessionStorage.getItem('exitPopupShown') === 'true';
  });
  const [showContactModal, setShowContactModal] = useState(false);
  const [formRestored, setFormRestored] = useState(false);

  // Payment method states
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'zelle'
  const [zelleReceipt, setZelleReceipt] = useState(null);
  const [showZelleModal, setShowZelleModal] = useState(false);
  const [zelleCouponCode, setZelleCouponCode] = useState('');
  const [zelleDiscount, setZelleDiscount] = useState(null); // {type: 'percentage'|'fixed', value: number}
  const [zelleDiscountError, setZelleDiscountError] = useState('');
  const zelleReceiptInputRef = useRef(null);

  // Support form states
  const [supportIssueType, setSupportIssueType] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [supportFiles, setSupportFiles] = useState([]);
  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState('');
  const [supportError, setSupportError] = useState('');
  const [supportEmail, setSupportEmail] = useState(''); // Email for support form when guestEmail not set
  const supportFileInputRef = useRef(null);


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

  // Multi-currency support
  const [userCurrency, setUserCurrency] = useState({ currency: 'usd', symbol: '$', country_code: 'US' });
  const [exchangeRates, setExchangeRates] = useState({ usd: 1.0, brl: 5.0, eur: 0.92, gbp: 0.79 });
  const [currencyLoaded, setCurrencyLoaded] = useState(false);

  // Detect user's country and currency on load
  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const geoResponse = await axios.get(`${API}/geo/detect`);
        if (geoResponse.data) {
          setUserCurrency(geoResponse.data);
        }

        const ratesResponse = await axios.get(`${API}/exchange-rates`);
        if (ratesResponse.data?.rates) {
          setExchangeRates(ratesResponse.data.rates);
        }
      } catch (err) {
        console.log('Using default currency (USD)');
      } finally {
        setCurrencyLoaded(true);
      }
    };
    detectCurrency();
  }, []);

  // Convert USD price to user's local currency
  const convertPrice = (priceUsd) => {
    if (!priceUsd) return 0;
    const rate = exchangeRates[userCurrency.currency] || 1;
    return priceUsd * rate;
  };

  // Format price in user's local currency
  const formatLocalPrice = (priceUsd) => {
    const converted = convertPrice(priceUsd);
    return `${userCurrency.symbol}${converted.toFixed(2)}`;
  };

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
      setSuccess(t.paymentSuccessful);
      // Clear saved form data on success
      sessionStorage.removeItem('pendingOrderData');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentCanceled === 'true') {
      // Restore saved form data
      const savedData = sessionStorage.getItem('pendingOrderData');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.formData) setFormData(parsed.formData);
          if (parsed.guestName) setGuestName(parsed.guestName);
          if (parsed.guestEmail) setGuestEmail(parsed.guestEmail);
          if (parsed.certifications) setCertifications(parsed.certifications);
          if (parsed.needsPhysicalCopy !== undefined) setNeedsPhysicalCopy(parsed.needsPhysicalCopy);
          if (parsed.shippingAddress) setShippingAddress(parsed.shippingAddress);
          if (parsed.uploadedFiles) setUploadedFiles(parsed.uploadedFiles);
          if (parsed.wordCount) setWordCount(parsed.wordCount);
          if (parsed.discountCode) setDiscountCode(parsed.discountCode);
          if (parsed.appliedDiscount) setAppliedDiscount(parsed.appliedDiscount);
          setFormRestored(true);
        } catch (e) {
          console.error('Error restoring form data:', e);
        }
      }
      setError(t.paymentCanceled);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [t]);

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
  // Uses both mouse leave (for exit intent) and beforeunload (for actual leaving)
  useEffect(() => {
    const handleMouseLeave = (e) => {
      // Detect mouse leaving at top of window (browser UI direction)
      if (e.clientY <= 0 && quote && !success && guestEmail && !exitPopupShown) {
        setShowExitPopup(true);
        setExitPopupShown(true);
        sessionStorage.setItem('exitPopupShown', 'true');
      }
    };

    // beforeunload catches: tab close, browser close, refresh, navigation
    // Note: Modern browsers limit what can be shown, but we can trigger the native dialog
    const handleBeforeUnload = (e) => {
      // Don't warn if redirecting to Stripe payment or payment completed
      if (redirectingToPayment || success) {
        return;
      }
      // Only warn if user has uploaded files
      if (uploadedFiles.length > 0) {
        // This message may not be shown in modern browsers, but the dialog will appear
        const message = 'You have an incomplete order. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message; // Required for Chrome
        return message; // Required for older browsers
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [quote, success, guestEmail, exitPopupShown, uploadedFiles.length, redirectingToPayment]);

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

    // Helper function to upload a single file with retry logic
    const uploadWithRetry = async (file, maxRetries = 2) => {
      let lastError = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            setProcessingStatus(`Retrying ${file.name} (attempt ${attempt + 1})...`);
            // Wait before retry: 1s, then 2s
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }

          const formDataUpload = new FormData();
          formDataUpload.append('file', file);

          const response = await axios.post(`${API}/upload-document`, formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000
          });

          return response;
        } catch (err) {
          lastError = err;
          console.log(`Upload attempt ${attempt + 1} failed for ${file.name}:`, err.message);

          // Don't retry on timeout errors - file is likely too large
          if (err.code === 'ECONNABORTED') {
            throw err;
          }
        }
      }

      throw lastError;
    };

    try {
      let newWords = 0;
      const newFiles = [];
      const failedFiles = [];

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setProcessingStatus(`Processing ${file.name} (${i + 1}/${acceptedFiles.length})...`);

        try {
          const response = await uploadWithRetry(file);

          // Always add file if upload succeeded, even if word_count is 0 (OCR might have failed)
          const fileWordCount = response.data?.word_count ?? 0;
          newWords += fileWordCount;
          newFiles.push({
            fileName: file.name,
            wordCount: fileWordCount,
            documentId: response.data.document_id
          });
        } catch (fileErr) {
          console.error(`Failed to upload ${file.name}:`, fileErr);
          failedFiles.push(file.name);
        }
      }

      // Update state with successfully uploaded files
      if (newFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
        setWordCount(prev => prev + newWords);
      }

      // Show error for failed files
      if (failedFiles.length > 0) {
        if (failedFiles.length === acceptedFiles.length) {
          setError(`Failed to process ${failedFiles.length === 1 ? 'file' : 'files'}. Please try again.`);
        } else {
          setError(`Some files failed to upload: ${failedFiles.join(', ')}. Please try uploading them again.`);
        }
      }

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
      errors.name = t.pleaseEnterName;
    }
    if (!guestEmail) {
      errors.email = t.pleaseEnterEmail;
    }
    if (uploadedFiles.length === 0) {
      errors.files = t.pleaseUploadDocument;
    }
    if ((needsPhysicalCopy || formData.service_type === 'rmv') &&
        (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode)) {
      errors.shipping = t.pleaseCompleteShipping;
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
        document_ids: uploadedFiles.map(f => f.documentId).filter(Boolean),
        shipping_fee: quote?.shipping_fee || 0,
        discount_amount: quote?.discount || 0,
        discount_code: appliedDiscount ? discountCode : null
      };

      // Create quote
      const quoteResponse = await axios.post(`${API}/calculate-quote`, quoteData);
      const quoteId = quoteResponse.data.id;

      // CARD PAYMENT FLOW (Stripe)
      // Step 2: Create Stripe checkout session
      // Note: origin_url should NOT include hash - backend will append query params before hash
      const checkoutResponse = await axios.post(`${API}/create-payment-checkout`, {
        quote_id: quoteId,
        customer_email: guestEmail,
        customer_name: guestName,
        origin_url: window.location.origin,
        currency: userCurrency.currency // Multi-currency support
      });

      // Step 3: Save form data before redirecting to Stripe
      const pendingOrderData = {
        formData,
        guestName,
        guestEmail,
        certifications,
        needsPhysicalCopy,
        shippingAddress,
        uploadedFiles,
        wordCount,
        discountCode,
        appliedDiscount
      };
      sessionStorage.setItem('pendingOrderData', JSON.stringify(pendingOrderData));

      // Step 4: Redirect to Stripe checkout
      if (checkoutResponse.data.checkout_url) {
        // Set flag to prevent beforeunload warning
        setRedirectingToPayment(true);
        // Small delay to ensure state is updated before redirect
        setTimeout(() => {
          window.location.href = checkoutResponse.data.checkout_url;
        }, 100);
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (err) {
      setError(err.response?.data?.detail || t.failedToProcess);
      setSubmitting(false);
    }
  };

  // Handle Zelle payment submission
  const handleZellePayment = async () => {
    if (!zelleReceipt) {
      setError(t.receiptRequired);
      return;
    }

    setSubmitting(true);
    setError('');

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
        document_ids: uploadedFiles.map(f => f.documentId).filter(Boolean),
        shipping_fee: quote?.shipping_fee || 0,
        discount_amount: quote?.discount || 0,
        discount_code: appliedDiscount ? discountCode : null
      };

      const quoteResponse = await axios.post(`${API}/calculate-quote`, quoteData);
      const quoteId = quoteResponse.data.id;

      // Step 2: Upload Zelle receipt
      const receiptFormData = new FormData();
      receiptFormData.append('file', zelleReceipt);
      const uploadResponse = await axios.post(`${API}/upload-document`, receiptFormData);
      const receiptUrl = uploadResponse.data.document_id;

      // Step 3: Create Zelle order with calculated discount
      const zelleTotal = getZelleTotal();
      const discountAmount = (quote?.total_price || 0) - zelleTotal;

      const zelleOrderData = {
        quote_id: quoteId,
        customer_email: guestEmail,
        customer_name: guestName,
        payment_method: 'zelle',
        zelle_receipt_id: receiptUrl,
        total_price: zelleTotal,
        original_price: quote?.total_price || 0,
        discount_amount: discountAmount > 0 ? discountAmount : 0,
        notes: zelleCouponCode ? `${formData.notes}\n\nCoupon Code: ${zelleCouponCode} (${zelleDiscount?.type === 'percentage' ? `${zelleDiscount.value}%` : `$${zelleDiscount?.value}`} off)` : formData.notes,
        coupon_code: zelleCouponCode || null,
        shipping_address: needsPhysicalCopy || formData.service_type === 'rmv' ? shippingAddress : null
      };

      await axios.post(`${API}/create-zelle-order`, zelleOrderData);

      // Step 4: Show success and close modal
      setSuccess(t.zelleOrderSubmitted);
      setShowZelleModal(false);
      setZelleReceipt(null);
      setZelleCouponCode('');
      setZelleDiscount(null);
      setZelleDiscountError('');

      // Clear form
      setFormData({
        service_type: 'certified',
        translate_from: 'portuguese',
        translate_to: 'english',
        urgency: 'no',
        reference: '',
        notes: ''
      });
      setUploadedFiles([]);
      setQuote(null);

    } catch (err) {
      setError(err.response?.data?.detail || t.failedToProcess);
    } finally {
      setSubmitting(false);
    }
  };

  // Validate Zelle coupon code
  const validateZelleCoupon = async () => {
    if (!zelleCouponCode.trim()) {
      setZelleDiscount(null);
      setZelleDiscountError('');
      return;
    }

    try {
      const response = await axios.get(`${API}/discount-codes/validate?code=${zelleCouponCode}`);
      if (response.data.valid) {
        setZelleDiscount({
          type: response.data.type,
          value: response.data.value
        });
        setZelleDiscountError('');
      } else {
        setZelleDiscount(null);
        setZelleDiscountError(t.invalidCoupon);
      }
    } catch (err) {
      setZelleDiscount(null);
      setZelleDiscountError(t.invalidCoupon);
    }
  };

  // Calculate Zelle total with discount
  const getZelleTotal = () => {
    const basePrice = quote?.total_price || 0;
    if (!zelleDiscount) return basePrice;

    if (zelleDiscount.type === 'percentage') {
      return basePrice * (1 - zelleDiscount.value / 100);
    } else {
      return Math.max(0, basePrice - zelleDiscount.value);
    }
  };

  // Handle support file selection
  const handleSupportFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024).slice(0, 5);
    setSupportFiles(validFiles);
  };

  // Handle support form submission
  const handleSupportSubmit = async () => {
    const emailToUse = guestEmail || supportEmail;

    // Validate required fields
    if (!emailToUse || !emailToUse.trim()) {
      setSupportError(t.pleaseEnterEmail);
      return;
    }
    if (!supportIssueType) {
      setSupportError(t.supportError);
      return;
    }

    setSendingSupport(true);
    setSupportError('');

    try {
      // Send support request to backend
      await axios.post(`${API}/send-support-request`, {
        issue_type: supportIssueType,
        description: supportDescription,
        customer_email: emailToUse,
        customer_name: guestName || 'Not provided',
        files_count: supportFiles.length
      });

      setSupportSuccess(t.supportSent);
      // Reset form
      setSupportIssueType('');
      setSupportDescription('');
      setSupportFiles([]);
      setSupportEmail('');
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowContactModal(false);
        setSupportSuccess('');
      }, 2000);
    } catch (err) {
      setSupportError(t.supportError);
    } finally {
      setSendingSupport(false);
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

      {/* Contact Options Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-md text-center relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{t.getSupport}</h2>
            <p className="text-gray-600 text-sm mb-4">{t.supportDescription}</p>

            {supportSuccess ? (
              <div className="p-4 bg-green-100 text-green-700 rounded-md">
                {supportSuccess}
              </div>
            ) : (
              <div className="space-y-4 text-left">
                {/* Email - required if not already provided */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.yourEmail}</label>
                  <input
                    type="email"
                    value={guestEmail || supportEmail}
                    onChange={(e) => {
                      if (!guestEmail) {
                        setSupportEmail(e.target.value);
                      } else {
                        setGuestEmail(e.target.value);
                      }
                    }}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll respond to your request at this email</p>
                </div>

                {/* Issue Type Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.whatHelpWith}</label>
                  <select
                    value={supportIssueType}
                    onChange={(e) => setSupportIssueType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">{t.selectIssueType}</option>
                    <option value="upload">{t.problemsWithUpload}</option>
                    <option value="translation_type">{t.notSureWhatTranslation}</option>
                    <option value="other">{t.otherIssue}</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.describeIssue}</label>
                  <textarea
                    value={supportDescription}
                    onChange={(e) => setSupportDescription(e.target.value.slice(0, 2000))}
                    placeholder={t.issuePlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md h-32 resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{t.provideDetail}</span>
                    <span>{supportDescription.length}/2000</span>
                  </div>
                </div>

                {/* File Attachments */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.attachments}</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => supportFileInputRef.current?.click()}
                      className="px-4 py-2 border-2 border-teal-600 text-teal-600 rounded-md font-semibold hover:bg-teal-50 transition-colors"
                    >
                      {t.chooseFiles}
                    </button>
                    <span className="text-gray-500 text-sm">
                      {supportFiles.length > 0 ? `${supportFiles.length} file(s) selected` : t.noFileSelected}
                    </span>
                    <input
                      ref={supportFileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleSupportFileChange}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t.attachInfo}</p>
                </div>

                {supportError && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {supportError}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowContactModal(false);
                      setSupportIssueType('');
                      setSupportDescription('');
                      setSupportFiles([]);
                      setSupportError('');
                      setSupportEmail('');
                    }}
                    className="px-6 py-2 text-gray-600 font-semibold hover:text-gray-800"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleSupportSubmit}
                    disabled={sendingSupport || !(guestEmail || supportEmail) || !supportIssueType}
                    className="px-6 py-2 bg-amber-200 text-gray-800 rounded-md font-semibold hover:bg-amber-300 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                  >
                    {sendingSupport ? '...' : t.sendRequest}
                  </button>
                </div>
              </div>
            )}
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
      {formRestored && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-md flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t.formDataRestored}
        </div>
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
                  <div className="font-semibold text-teal-600">{formatLocalPrice(24.99)}{t.perPage}</div>
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
                  <div className="font-semibold text-teal-600">{formatLocalPrice(19.99)}{t.perPage}</div>
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
                  <div className="font-semibold text-teal-600">{formatLocalPrice(55.00)}{t.perPage}</div>
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
                  <div className="font-semibold text-teal-600">{formatLocalPrice(24.99)}{t.perPage}</div>
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
                  {FROM_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
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
                    {TO_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
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
                    const hasNoWords = item.wordCount === 0;
                    return (
                      <div key={i} className={`p-3 rounded-md flex justify-between items-center ${hasNoWords ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center flex-wrap">
                          <span className={`mr-2 ${hasNoWords ? 'text-yellow-600' : 'text-green-600'}`}>{hasNoWords ? '⚠️' : '✓'}</span>
                          <span>{item.fileName}</span>
                          <span className="text-gray-400 text-sm ml-2">({pages} {pages === 1 ? t.page : t.pages})</span>
                          {hasNoWords && (
                            <span className="text-yellow-600 text-xs ml-2 block w-full mt-1">
                              Could not extract text - counted as 1 page
                            </span>
                          )}
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
                  <button
                    type="button"
                    onClick={() => setShowContactModal(true)}
                    className="text-teal-600 hover:underline"
                  >
                    {t.contactEmail}
                  </button>
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

            {/* Need Help? Get Support */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-lg text-center border border-gray-200">
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 text-teal-700 hover:text-teal-800 font-semibold text-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t.needHelpGetSupport}
              </button>
            </div>

            {/* Continue to Payment Button */}
            <button
              type="submit"
              disabled={submitting || uploadedFiles.length === 0 || !guestName || !guestEmail || ((needsPhysicalCopy || formData.service_type === 'rmv') && (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode))}
              className="w-full py-3 text-white rounded-md font-semibold bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400"
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
                <span className="font-medium">{formatLocalPrice(quote?.base_price || 0)}</span>
              </div>
              {quote?.urgency_fee > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>{t.urgencyFee}</span>
                  <span>{formatLocalPrice(quote.urgency_fee)}</span>
                </div>
              )}
              {quote?.certification_fee > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>{t.certification}</span>
                  <span>{formatLocalPrice(quote.certification_fee)}</span>
                </div>
              )}
              {quote?.shipping_fee > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>{t.uspsPriorityMail}</span>
                  <span>{formatLocalPrice(quote.shipping_fee)}</span>
                </div>
              )}
              {quote?.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t.discount}</span>
                  <span>-{formatLocalPrice(quote.discount)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-lg">
                <span className="font-bold">{t.total}</span>
                <span className="font-bold text-teal-600">{formatLocalPrice(quote?.total_price || 0)}</span>
              </div>
            </div>

            {/* Discount Code Info */}
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>{t.couponAtCheckout}</span>
              </div>
            </div>

            {/* Zelle Payment Option */}
            <div className="border-t pt-4 mt-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="font-semibold text-purple-800">{t.payWithZelle}</span>
                  <span className="text-xs text-purple-600 font-medium">{t.zelleUsaOnly}</span>
                </div>
                <div className="text-sm text-purple-700 space-y-1 mb-3">
                  <p>{t.zelleSendTo}: <strong>contact@legacytranslations.com</strong></p>
                  <p className="text-xs">{t.zelleIncludeEmail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowZelleModal(true)}
                  disabled={uploadedFiles.length === 0 || !guestName || !guestEmail}
                  className="w-full py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-400"
                >
                  {t.payWithZelleBtn}
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-4">
              {t.paymentRequired}
            </div>
          </div>
        </div>
      </div>

      {/* Zelle Payment Modal */}
      {showZelleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-purple-800">{t.payWithZelle}</h3>
              <button
                onClick={() => {
                  setShowZelleModal(false);
                  setZelleCouponCode('');
                  setZelleDiscount(null);
                  setZelleDiscountError('');
                  setZelleReceipt(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Coupon Code */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.couponCodeOptional}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={zelleCouponCode}
                  onChange={(e) => {
                    setZelleCouponCode(e.target.value.toUpperCase());
                    setZelleDiscount(null);
                    setZelleDiscountError('');
                  }}
                  placeholder={t.enterCouponCode}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 uppercase"
                />
                <button
                  type="button"
                  onClick={validateZelleCoupon}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  {t.apply}
                </button>
              </div>
              {zelleDiscountError && (
                <p className="text-red-500 text-xs mt-1">{zelleDiscountError}</p>
              )}
              {zelleDiscount && (
                <p className="text-green-600 text-xs mt-1">
                  {zelleDiscount.type === 'percentage' ? `${zelleDiscount.value}%` : `$${zelleDiscount.value}`} {t.off} {t.applied}
                </p>
              )}
            </div>

            {/* Price Summary */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-purple-700">
                  <span>Subtotal:</span>
                  <span>{formatLocalPrice(quote?.total_price || 0)}</span>
                </div>
                {zelleDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span>{t.discount} ({zelleDiscount.type === 'percentage' ? `${zelleDiscount.value}%` : formatLocalPrice(zelleDiscount.value)}):</span>
                    <span>-{formatLocalPrice(quote?.total_price - getZelleTotal())}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-purple-800 text-base border-t border-purple-200 pt-2">
                  <span>{t.zelleAmountToPay}:</span>
                  <span>{formatLocalPrice(getZelleTotal())}</span>
                </div>
              </div>
            </div>

            {/* Zelle Instructions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <div className="space-y-1 text-xs text-gray-600">
                <p><strong>1.</strong> {t.zelleStep1}</p>
                <p><strong>2.</strong> {t.zelleSendTo}: <strong>contact@legacytranslations.com</strong></p>
                <p><strong>3.</strong> {t.zelleIncludeEmail}</p>
              </div>
            </div>

            {/* Upload Receipt */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.uploadReceipt} *
              </label>
              <input
                type="file"
                ref={zelleReceiptInputRef}
                accept="image/*,.pdf"
                onChange={(e) => setZelleReceipt(e.target.files[0])}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => zelleReceiptInputRef.current?.click()}
                className="w-full p-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                {zelleReceipt ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {zelleReceipt.name}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {t.uploadReceipt}
                  </span>
                )}
              </button>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleZellePayment}
              disabled={submitting || !zelleReceipt}
              className="w-full py-3 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              {submitting ? t.processingBtn : t.submitZelleOrder}
            </button>
          </div>
        </div>
      )}
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
                    <div className="text-xl font-bold text-gray-800">{formatLocalPrice(order.total_price || 0)}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}
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
                      <div className="font-medium">{new Date(order.created_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{t.basePrice}</div>
                      <div className="font-medium">{formatLocalPrice(order.base_price || 0)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{t.urgencyFee}</div>
                      <div className="font-medium">{formatLocalPrice(order.urgency_fee || 0)}</div>
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
                  className={`hover:scale-110 transition-transform ${
                    uiLang === lang.code ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'
                  }`}
                  title={lang.name}
                >
                  <img src={getFlagUrl(lang.countryCode)} alt={lang.name} className="w-6 h-4 object-cover rounded-sm" />
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
                    className={`hover:scale-110 transition-transform ${
                      uiLang === lang.code ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'
                    }`}
                    title={lang.name}
                  >
                    <img src={getFlagUrl(lang.countryCode)} alt={lang.name} className="w-6 h-4 object-cover rounded-sm" />
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
