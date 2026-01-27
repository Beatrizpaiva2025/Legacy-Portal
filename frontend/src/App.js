import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    welcomeGift: '🎁 1 FREE Certified Page on signup!',
    // Navigation
    newOrder: 'New Order',
    createNewOrder: 'Create New Order',
    myOrders: 'My Orders',
    messages: 'Messages',
    invoices: 'Invoices',
    paymentPlanMenu: 'Payment Plan',
    welcome: 'Welcome',
    logout: 'Logout',
    // Payment Plan Page
    paymentPlanTitle: 'Payment Plan',
    currentPlan: 'Current Plan',
    qualificationStatus: 'Qualification Status',
    qualifiedForInvoice: 'You qualify for biweekly invoice!',
    notQualifiedYet: 'Not yet qualified',
    translationsCompleted: 'translations completed',
    translationsRemaining: 'more translations to qualify',
    requestUpgrade: 'Request Upgrade',
    upgradeRequested: 'Upgrade Requested',
    awaitingApproval: 'Awaiting admin approval',
    selectPlanToUpgrade: 'Select the plan you want:',
    submitUpgradeRequest: 'Submit Upgrade Request',
    upgradeSuccess: 'Upgrade request submitted successfully!',
    // Payment Plan Terms Explanation
    paymentPlanTermsTitle: 'Payment Terms',
    paymentPlanTerm1: 'Biweekly invoicing available upon completion of 10 paid translations.',
    paymentPlanTerm2: 'Net 30 payment terms granted after 3 consecutive months of timely invoice settlement.',
    currentTerms: 'Current Terms',
    paymentDueOnInvoice: 'Payment due on invoice date',
    net30Terms: '30-day payment terms',
    monthsOnTime: 'months of on-time payments',
    monthsRequired: '3 months required',
    // Invoice Page
    myInvoices: 'My Invoices',
    noInvoices: 'No invoices found',
    invoiceNumber: 'Invoice #',
    dueDate: 'Due Date',
    status: 'Status',
    amount: 'Amount',
    payNow: 'Pay Now',
    payWithCard: 'Pay with Card',
    payWithZelle: 'Pay with Zelle',
    zelleUsaOnly: '(USA only)',
    payWithPix: 'Pay with PIX',
    pixBrazilOnly: '(Brazil only)',
    uploadReceipt: 'Upload Receipt',
    zelleInstructions: 'Send payment via Zelle to: payments@legacytranslations.com',
    receiptUploaded: 'Receipt uploaded successfully. Payment will be verified shortly.',
    invoicePaid: 'Paid',
    invoicePending: 'Pending',
    invoiceOverdue: 'Overdue',
    viewDetails: 'View Details',
    ordersIncluded: 'Orders Included',
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
    register: 'Register',
    // Registration - Address
    companyAddress: 'Company Address',
    street: 'Street Address',
    city: 'City',
    state: 'State',
    zipCode: 'ZIP Code',
    country: 'Country',
    taxId: 'Tax ID (EIN/CNPJ) - Optional',
    taxIdPlaceholder: 'XX-XXXXXXX',
    // Estimated Volume
    estimatedVolume: 'Estimated Monthly Volume',
    selectVolume: 'Select estimated volume',
    volume1to10: '1-10 pages per month',
    volume11to50: '11-50 pages per month',
    volume51to100: '51-100 pages per month',
    volume100plus: '100+ pages per month',
    // Payment Plan
    paymentPlan: 'How would you like to pay?',
    payPerOrder: 'Pay Per Order',
    payPerOrderDesc: 'Pay for each order via Zelle or card',
    biweeklyInvoice: 'Biweekly Invoice',
    biweeklyInvoiceDesc: 'Receive invoice every 2 weeks',
    monthlyInvoice: 'Monthly Invoice',
    monthlyInvoiceDesc: 'Receive monthly invoice',
    invoiceRequiresApproval: 'Invoice plans require account approval after registration',
    invoiceComingSoon: 'Available after qualification',
    invoiceQualificationNote: 'Biweekly invoice unlocks after 10 paid translations. Request upgrade from your dashboard.',
    paymentMethod: 'Preferred Payment Method',
    zelle: 'Zelle',
    creditCard: 'Credit Card',
    invoice: 'Invoice',
    // Agreement
    partnerAgreement: 'Partner Agreement',
    agreementTerms: 'Terms and Conditions',
    termsIntro: 'By registering as a Partner, you agree to the following terms:',
    term1: 'No fees or commitments to cancel at any time',
    term2: 'Pay Per Order: Payment required before delivery',
    term3: 'Invoice Plans: Payment due within 30 days of invoice',
    term4: 'Late payments may result in service suspension',
    iAgreeToTerms: 'I agree to the Partner Agreement terms',
    mustAgreeToTerms: 'You must agree to the terms to register',
    // Partner Benefits
    partnerBenefits: 'Partner Benefits',
    net30Terms: 'Net 30 payment terms',
    volumeDiscounts: 'Volume discounts on translations',
    dedicatedSupport: 'Dedicated account support',
    priorityProcessing: 'Priority order processing',
    // Discount Structure
    discountStructure: 'Partner Discount Structure',
    discountDescription: 'Earn volume discounts based on your monthly page count',
    tier: 'Tier',
    monthlyVolume: 'Monthly Volume',
    discount: 'Discount',
    pricePerPage: 'Price/Page',
    monthlySavings: 'Monthly Savings',
    partnerMargin: 'Partner Margin*',
    pages: 'pages',
    page: 'page',
    upTo: 'up to',
    marginNote: 'Partner margin calculated based on resale at $30/page (common market rate)',
    yourCurrentTier: 'Your Current Tier',
    pagesLast30Days: 'pages in last 30 days',
    pagesToNextTier: 'pages to',
    youSaved: 'You saved',
    thisMonth: 'this month',
    current: 'Current',
    // Welcome Gift Modal
    welcomeGiftTitle: 'Welcome Gift!',
    welcomeGiftThankYou: 'Thank you for joining Legacy Translations',
    welcomeGiftDescription: '1 FREE Page (up to 250 words) + Certification of Accuracy',
    welcomeGiftCouponLabel: 'Your Coupon Code',
    welcomeGiftCouponDesc: '1 free page (up to 250 words) + certification',
    welcomeGiftValid: 'Valid for 30 days',
    welcomeGiftUse: 'Use at checkout on your first order',
    // New Order Form - Partner Portal
    clientInformation: 'Client Information',
    clientName: 'Client Name',
    clientEmail: 'Client Email',
    standardTranslation: 'Standard Translation',
    standardDesc: 'General use, no certification',
    swornTranslation: 'Sworn Translation',
    swornDesc: 'For use outside USA - official sworn translation (5 business days)',
    rmvCertifiedTranslation: 'RMV Certified Translation',
    rmvDesc: 'Massachusetts Motor Vehicle - requires physical copy',
    physicalCopy: 'Physical Copy',
    physicalCopyRequired: 'Physical copy required',
    physicalCopyDesc: 'USPS Priority Mail (1-3 business days)',
    havingTroubleUploading: 'Having trouble uploading?',
    contactViaEmail: 'Contact us via email',
    certifiedTooltip: 'Includes a signed Statement of Accuracy, stamp, and signature; accepted by most institutions.',
    standardTooltip: 'Accurate translation for general use; does not include certification.',
    swornTooltip: 'Completed by a sworn translator registered in the country of use; required for specific countries.',
    rmvTooltip: 'Certified on official letterhead with all required elements; accepted by the RMV for licenses, IDs, and related purposes.',
    // Partner Portal Urgency (different times)
    partnerStandard: 'Standard (24 hours)',
    partnerPriority: 'Priority (12 hours)',
    partnerUrgent: 'Urgent (6 hours)',
    // Service type descriptions footer
    certifiedDescFull: 'Includes a signed Statement of Accuracy, stamp, and signature; accepted by most institutions.',
    standardDescFull: 'Accurate translation for general use; does not include certification.',
    swornDescFull: 'Completed by a sworn translator registered in the country of use; required for specific countries.',
    rmvDescFull: 'Certified on official letterhead with all required elements; accepted by the RMV for licenses, IDs, and related purposes.',
    rmvNote: 'RMV Certified translations require physical delivery.',
    swornLanguageNote: 'Sworn translations are only available for Portuguese (Brasil)',
    clientEmailRequired: 'Client email is required',
    pleaseUploadDocument: 'Please upload a document',
    couldNotExtractText: 'Could not extract text - counted as 1 page',
    removeFile: 'Remove file',
    // Payment method
    payByInvoice: 'Pay by Invoice',
    invoiceSentToEmail: 'Invoice sent to your email',
    sendToZelle: 'Send to',
    // Quote Summary
    quoteSummary: 'Quote Summary',
    service: 'Service',
    certified: 'Certified',
    standardService: 'Standard',
    sworn: 'Sworn',
    rmvCertified: 'RMV Certified',
    shipping: 'Shipping (USPS Priority)',
    creatingOrder: 'Creating Order...',
    submitOrderZelle: 'Submit Order with Zelle',
    createOrder: 'Create Order',
    youSaveAmount: 'You save',
    coupon: 'Coupon',
    selectCoupon: 'Select coupon...',
    apply: 'Apply',
    paymentViaInvoice: 'Payment via invoice (Net 30)',
    pageInfo: '1 page = 250 words max',
    invoiceNotAvailable: 'Invoice payment available after 10 paid orders',
    invoiceBlocked: 'Invoice payment not yet available'
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
    welcomeGift: '🎁 1 Página Certificada GRATIS al registrarse!',
    // Navigation
    newOrder: 'Nuevo Pedido',
    createNewOrder: 'Crear Nuevo Pedido',
    myOrders: 'Mis Pedidos',
    messages: 'Mensajes',
    invoices: 'Facturas',
    paymentPlanMenu: 'Plan de Pago',
    welcome: 'Bienvenido',
    logout: 'Cerrar Sesión',
    // Payment Plan Page
    paymentPlanTitle: 'Plan de Pago',
    currentPlan: 'Plan Actual',
    qualificationStatus: 'Estado de Calificación',
    qualifiedForInvoice: '¡Califica para factura quincenal!',
    notQualifiedYet: 'Aún no calificado',
    translationsCompleted: 'traducciones completadas',
    translationsRemaining: 'traducciones más para calificar',
    requestUpgrade: 'Solicitar Mejora',
    upgradeRequested: 'Mejora Solicitada',
    awaitingApproval: 'Esperando aprobación del administrador',
    selectPlanToUpgrade: 'Seleccione el plan que desea:',
    submitUpgradeRequest: 'Enviar Solicitud',
    upgradeSuccess: '¡Solicitud de mejora enviada exitosamente!',
    // Payment Plan Terms Explanation
    paymentPlanTermsTitle: 'Condiciones de Pago',
    paymentPlanTerm1: 'Facturación quincenal disponible tras completar 10 traducciones pagadas.',
    paymentPlanTerm2: 'Plazo de pago Net 30 otorgado después de 3 meses consecutivos con facturas liquidadas puntualmente.',
    currentTerms: 'Condiciones Actuales',
    paymentDueOnInvoice: 'Pago vence en fecha de factura',
    net30Terms: 'Plazo de pago de 30 días',
    monthsOnTime: 'meses de pagos puntuales',
    monthsRequired: '3 meses requeridos',
    // Invoice Page
    myInvoices: 'Mis Facturas',
    noInvoices: 'No se encontraron facturas',
    invoiceNumber: 'Factura #',
    dueDate: 'Fecha de Vencimiento',
    status: 'Estado',
    amount: 'Monto',
    payNow: 'Pagar Ahora',
    payWithCard: 'Pagar con Tarjeta',
    payWithZelle: 'Pagar con Zelle',
    zelleUsaOnly: '(Solo USA)',
    payWithPix: 'Pagar con PIX',
    pixBrazilOnly: '(Solo Brasil)',
    uploadReceipt: 'Subir Recibo',
    zelleInstructions: 'Enviar pago via Zelle a: payments@legacytranslations.com',
    receiptUploaded: 'Recibo subido exitosamente. El pago sera verificado pronto.',
    invoicePaid: 'Pagado',
    invoicePending: 'Pendiente',
    invoiceOverdue: 'Vencido',
    viewDetails: 'Ver Detalles',
    ordersIncluded: 'Pedidos Incluidos',
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
    register: 'Registrar',
    // Registration - Address
    companyAddress: 'Dirección de la Empresa',
    street: 'Dirección',
    city: 'Ciudad',
    state: 'Estado',
    zipCode: 'Código Postal',
    country: 'País',
    taxId: 'ID Fiscal (EIN/RFC) - Opcional',
    taxIdPlaceholder: 'XX-XXXXXXX',
    // Estimated Volume
    estimatedVolume: 'Volumen Mensual Estimado',
    selectVolume: 'Seleccione volumen estimado',
    volume1to10: '1-10 páginas por mes',
    volume11to50: '11-50 páginas por mes',
    volume51to100: '51-100 páginas por mes',
    volume100plus: '100+ páginas por mes',
    // Payment Plan
    paymentPlan: '¿Cómo prefiere pagar?',
    payPerOrder: 'Pago Por Pedido',
    payPerOrderDesc: 'Pague cada pedido vía Zelle o tarjeta',
    biweeklyInvoice: 'Factura Quincenal',
    biweeklyInvoiceDesc: 'Reciba factura cada 2 semanas',
    monthlyInvoice: 'Factura Mensual',
    monthlyInvoiceDesc: 'Reciba factura mensual',
    invoiceRequiresApproval: 'Planes de factura requieren aprobación después del registro',
    invoiceComingSoon: 'Disponible tras calificación',
    invoiceQualificationNote: 'Factura quincenal se desbloquea después de 10 traducciones pagas. Solicite desde su panel.',
    paymentMethod: 'Método de Pago Preferido',
    zelle: 'Zelle',
    creditCard: 'Tarjeta de Crédito',
    invoice: 'Factura',
    // Agreement
    partnerAgreement: 'Acuerdo de Partner',
    agreementTerms: 'Términos y Condiciones',
    termsIntro: 'Al registrarse como Partner, acepta los siguientes términos:',
    term1: 'Sin tarifas ni compromisos para cancelar en cualquier momento',
    term2: 'Pago Por Pedido: Pago requerido antes de la entrega',
    term3: 'Planes de Factura: Pago debido dentro de 30 días',
    term4: 'Pagos atrasados pueden resultar en suspensión del servicio',
    iAgreeToTerms: 'Acepto los términos del Acuerdo de Partner',
    mustAgreeToTerms: 'Debe aceptar los términos para registrarse',
    // Partner Benefits
    partnerBenefits: 'Beneficios de Socio',
    net30Terms: 'Términos de pago Net 30',
    volumeDiscounts: 'Descuentos por volumen en traducciones',
    dedicatedSupport: 'Soporte de cuenta dedicado',
    priorityProcessing: 'Procesamiento prioritario de pedidos',
    // Discount Structure
    discountStructure: 'Estructura de Descuentos para Partners',
    discountDescription: 'Obtenga descuentos por volumen según su cantidad mensual de páginas',
    tier: 'Nivel',
    monthlyVolume: 'Volumen Mensual',
    discount: 'Descuento',
    pricePerPage: 'Precio/Página',
    monthlySavings: 'Ahorro Mensual',
    partnerMargin: 'Margen del Partner*',
    pages: 'páginas',
    page: 'página',
    upTo: 'hasta',
    marginNote: 'Margen del partner calculado en base a reventa a $30/página (precio común de mercado)',
    yourCurrentTier: 'Tu Nivel Actual',
    pagesLast30Days: 'páginas en los últimos 30 días',
    pagesToNextTier: 'páginas para',
    youSaved: 'Ahorraste',
    thisMonth: 'este mes',
    current: 'Actual',
    // Welcome Gift Modal
    welcomeGiftTitle: '¡Regalo de Bienvenida!',
    welcomeGiftThankYou: 'Gracias por unirse a Legacy Translations',
    welcomeGiftDescription: '1 Página GRATIS (hasta 250 palabras) + Certificación de Precisión',
    welcomeGiftCouponLabel: 'Tu Código de Cupón',
    welcomeGiftCouponDesc: '1 página gratis (hasta 250 palabras) + certificación',
    welcomeGiftValid: 'Válido por 30 días',
    welcomeGiftUse: 'Usar al finalizar tu primer pedido',
    // New Order Form - Partner Portal
    clientInformation: 'Información del Cliente',
    clientName: 'Nombre del Cliente',
    clientEmail: 'Correo del Cliente',
    standardTranslation: 'Traducción Estándar',
    standardDesc: 'Uso general, sin certificación',
    swornTranslation: 'Traducción Jurada',
    swornDesc: 'Para uso fuera de EE.UU. - traducción jurada oficial (5 días hábiles)',
    rmvCertifiedTranslation: 'Traducción Certificada RMV',
    rmvDesc: 'Massachusetts Motor Vehicle - requiere copia física',
    physicalCopy: 'Copia Física',
    physicalCopyRequired: 'Se requiere copia física',
    physicalCopyDesc: 'USPS Priority Mail (1-3 días hábiles)',
    havingTroubleUploading: '¿Tiene problemas para subir?',
    contactViaEmail: 'Contáctenos por correo',
    certifiedTooltip: 'Incluye una Declaración de Precisión firmada, sello y firma; aceptado por la mayoría de las instituciones.',
    standardTooltip: 'Traducción precisa para uso general; no incluye certificación.',
    swornTooltip: 'Realizada por un traductor jurado registrado en el país de uso; requerido para países específicos.',
    rmvTooltip: 'Certificada en papel membretado oficial con todos los elementos requeridos; aceptada por el RMV para licencias, identificaciones y propósitos relacionados.',
    // Partner Portal Urgency (different times)
    partnerStandard: 'Estándar (24 horas)',
    partnerPriority: 'Prioridad (12 horas)',
    partnerUrgent: 'Urgente (6 horas)',
    // Service type descriptions footer
    certifiedDescFull: 'Incluye una Declaración de Precisión firmada, sello y firma; aceptado por la mayoría de las instituciones.',
    standardDescFull: 'Traducción precisa para uso general; no incluye certificación.',
    swornDescFull: 'Realizada por un traductor jurado registrado en el país de uso; requerido para países específicos.',
    rmvDescFull: 'Certificada en papel membretado oficial con todos los elementos requeridos; aceptada por el RMV para licencias, identificaciones y propósitos relacionados.',
    rmvNote: 'Las traducciones Certificadas RMV requieren entrega física.',
    swornLanguageNote: 'Las traducciones juradas solo están disponibles para Portugués (Brasil)',
    clientEmailRequired: 'El correo del cliente es requerido',
    pleaseUploadDocument: 'Por favor suba un documento',
    couldNotExtractText: 'No se pudo extraer texto - contado como 1 página',
    removeFile: 'Eliminar archivo',
    // Payment method
    payByInvoice: 'Pagar por Factura',
    invoiceSentToEmail: 'Factura enviada a su correo',
    sendToZelle: 'Enviar a',
    // Quote Summary
    quoteSummary: 'Resumen de Cotización',
    service: 'Servicio',
    certified: 'Certificada',
    standardService: 'Estándar',
    sworn: 'Jurada',
    rmvCertified: 'Certificada RMV',
    shipping: 'Envío (USPS Priority)',
    creatingOrder: 'Creando Pedido...',
    submitOrderZelle: 'Enviar Pedido con Zelle',
    createOrder: 'Crear Pedido',
    youSaveAmount: 'Ahorra',
    coupon: 'Cupón',
    selectCoupon: 'Seleccionar cupón...',
    apply: 'Aplicar',
    paymentViaInvoice: 'Pago via factura (Net 30)',
    pageInfo: '1 página = 250 palabras máx.',
    invoiceNotAvailable: 'Pago por factura disponible después de 10 pedidos pagados',
    invoiceBlocked: 'Pago por factura aún no disponible'
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
    benefit2: 'Chat de suporte exclusivo para B2B',
    benefit3: 'Processamento prioritário',
    benefit4: 'Exclusivo: Verificação Digital com QR Code',
    welcomeGift: '🎁 1 Página Certificada GRÁTIS no cadastro!',
    // Navigation
    newOrder: 'Novo Pedido',
    createNewOrder: 'Criar Novo Pedido',
    myOrders: 'Meus Pedidos',
    messages: 'Mensagens',
    invoices: 'Faturas',
    paymentPlanMenu: 'Plano de Pagamento',
    welcome: 'Bem-vindo',
    logout: 'Sair',
    // Payment Plan Page
    paymentPlanTitle: 'Plano de Pagamento',
    currentPlan: 'Plano Atual',
    qualificationStatus: 'Status de Qualificação',
    qualifiedForInvoice: 'Você se qualifica para fatura quinzenal!',
    notQualifiedYet: 'Ainda não qualificado',
    translationsCompleted: 'traduções concluídas',
    translationsRemaining: 'traduções restantes para qualificar',
    requestUpgrade: 'Solicitar Upgrade',
    upgradeRequested: 'Upgrade Solicitado',
    awaitingApproval: 'Aguardando aprovação do administrador',
    selectPlanToUpgrade: 'Selecione o plano desejado:',
    submitUpgradeRequest: 'Enviar Solicitação',
    upgradeSuccess: 'Solicitação de upgrade enviada com sucesso!',
    // Payment Plan Terms Explanation
    paymentPlanTermsTitle: 'Condições de Pagamento',
    paymentPlanTerm1: 'Faturamento quinzenal disponível após a conclusão de 10 traduções pagas.',
    paymentPlanTerm2: 'Prazo de pagamento Net 30 concedido após 3 meses consecutivos com faturas quitadas pontualmente.',
    currentTerms: 'Condições Atuais',
    paymentDueOnInvoice: 'Pagamento vence na data da fatura',
    net30Terms: 'Prazo de pagamento de 30 dias',
    monthsOnTime: 'meses de pagamentos em dia',
    monthsRequired: '3 meses necessários',
    // Invoice Page
    myInvoices: 'Minhas Faturas',
    noInvoices: 'Nenhuma fatura encontrada',
    invoiceNumber: 'Fatura #',
    dueDate: 'Data de Vencimento',
    status: 'Status',
    amount: 'Valor',
    payNow: 'Pagar Agora',
    payWithCard: 'Pagar com Cartao',
    payWithZelle: 'Pagar com Zelle',
    zelleUsaOnly: '(Somente EUA)',
    payWithPix: 'Pagar com PIX',
    pixBrazilOnly: '(Somente Brasil)',
    uploadReceipt: 'Enviar Comprovante',
    zelleInstructions: 'Enviar pagamento via Zelle para: payments@legacytranslations.com',
    receiptUploaded: 'Comprovante enviado com sucesso. O pagamento sera verificado em breve.',
    invoicePaid: 'Pago',
    invoicePending: 'Pendente',
    invoiceOverdue: 'Vencido',
    viewDetails: 'Ver Detalhes',
    ordersIncluded: 'Pedidos Incluidos',
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
    register: 'Registrar',
    // Registration - Address
    companyAddress: 'Endereço da Empresa',
    street: 'Endereço',
    city: 'Cidade',
    state: 'Estado',
    zipCode: 'CEP',
    country: 'País',
    taxId: 'CNPJ/CPF - Opcional',
    taxIdPlaceholder: 'XX.XXX.XXX/0001-XX',
    // Estimated Volume
    estimatedVolume: 'Volume Mensal Estimado',
    selectVolume: 'Selecione o volume estimado',
    volume1to10: '1-10 páginas por mês',
    volume11to50: '11-50 páginas por mês',
    volume51to100: '51-100 páginas por mês',
    volume100plus: '100+ páginas por mês',
    // Payment Plan
    paymentPlan: 'Como prefere pagar?',
    payPerOrder: 'Pagar Por Pedido',
    payPerOrderDesc: 'Pague cada pedido via Zelle ou cartão',
    biweeklyInvoice: 'Fatura Quinzenal',
    biweeklyInvoiceDesc: 'Receba fatura a cada 2 semanas',
    monthlyInvoice: 'Fatura Mensal',
    monthlyInvoiceDesc: 'Receba fatura mensal',
    invoiceRequiresApproval: 'Planos de fatura requerem aprovação após o cadastro',
    invoiceComingSoon: 'Disponível após qualificação',
    invoiceQualificationNote: 'Fatura quinzenal é liberada após 10 traduções pagas. Solicite pelo painel.',
    paymentMethod: 'Método de Pagamento Preferido',
    zelle: 'Zelle',
    creditCard: 'Cartão de Crédito',
    invoice: 'Fatura',
    // Agreement
    partnerAgreement: 'Acordo de Partner',
    agreementTerms: 'Termos e Condições',
    termsIntro: 'Ao se cadastrar como Partner, você concorda com os seguintes termos:',
    term1: 'Sem taxas ou compromissos para cancelar a qualquer momento',
    term2: 'Pagar Por Pedido: Pagamento necessário antes da entrega',
    term3: 'Planos de Fatura: Pagamento em até 30 dias',
    term4: 'Pagamentos atrasados podem resultar em suspensão do serviço',
    iAgreeToTerms: 'Concordo com os termos do Acordo de Partner',
    mustAgreeToTerms: 'Você deve concordar com os termos para se cadastrar',
    // Partner Benefits
    partnerBenefits: 'Benefícios de Parceiro',
    net30Terms: 'Condições de pagamento Net 30',
    volumeDiscounts: 'Descontos por volume em traduções',
    dedicatedSupport: 'Suporte de conta dedicado',
    priorityProcessing: 'Processamento prioritário de pedidos',
    // Discount Structure
    discountStructure: 'Estrutura de Descontos para Parceiros',
    discountDescription: 'Ganhe descontos por volume com base na sua quantidade mensal de páginas',
    tier: 'Nível',
    monthlyVolume: 'Volume Mensal',
    discount: 'Desconto',
    pricePerPage: 'Preço/Página',
    monthlySavings: 'Economia Mensal',
    partnerMargin: 'Margem do Parceiro*',
    pages: 'páginas',
    page: 'página',
    upTo: 'até',
    marginNote: 'Margem do parceiro calculada com base na revenda a $30/página (preço comum de mercado)',
    yourCurrentTier: 'Seu Nível Atual',
    pagesLast30Days: 'páginas nos últimos 30 dias',
    pagesToNextTier: 'páginas para',
    youSaved: 'Você economizou',
    thisMonth: 'este mês',
    current: 'Atual',
    // Welcome Gift Modal
    welcomeGiftTitle: 'Presente de Boas-vindas!',
    welcomeGiftThankYou: 'Obrigado por se juntar à Legacy Translations',
    welcomeGiftDescription: '1 Página GRÁTIS (até 250 palavras) + Certificação de Precisão',
    welcomeGiftCouponLabel: 'Seu Código de Cupom',
    welcomeGiftCouponDesc: '1 página grátis (até 250 palavras) + certificação',
    welcomeGiftValid: 'Válido por 30 dias',
    welcomeGiftUse: 'Use no checkout do seu primeiro pedido',
    // New Order Form - Partner Portal
    clientInformation: 'Informações do Cliente',
    clientName: 'Nome do Cliente',
    clientEmail: 'E-mail do Cliente',
    standardTranslation: 'Tradução Padrão',
    standardDesc: 'Uso geral, sem certificação',
    swornTranslation: 'Tradução Juramentada',
    swornDesc: 'Para uso fora dos EUA - tradução juramentada oficial (5 dias úteis)',
    rmvCertifiedTranslation: 'Tradução Certificada RMV',
    rmvDesc: 'Massachusetts Motor Vehicle - requer cópia física',
    physicalCopy: 'Cópia Física',
    physicalCopyRequired: 'Cópia física necessária',
    physicalCopyDesc: 'USPS Priority Mail (1-3 dias úteis)',
    havingTroubleUploading: 'Está com problemas para enviar?',
    contactViaEmail: 'Entre em contato por e-mail',
    certifiedTooltip: 'Inclui uma Declaração de Precisão assinada, carimbo e assinatura; aceito pela maioria das instituições.',
    standardTooltip: 'Tradução precisa para uso geral; não inclui certificação.',
    swornTooltip: 'Realizada por um tradutor juramentado registrado no país de uso; exigido para países específicos.',
    rmvTooltip: 'Certificada em papel timbrado oficial com todos os elementos necessários; aceita pelo RMV para licenças, identificações e fins relacionados.',
    // Partner Portal Urgency (different times)
    partnerStandard: 'Padrão (24 horas)',
    partnerPriority: 'Prioridade (12 horas)',
    partnerUrgent: 'Urgente (6 horas)',
    // Service type descriptions footer
    certifiedDescFull: 'Inclui uma Declaração de Precisão assinada, carimbo e assinatura; aceito pela maioria das instituições.',
    standardDescFull: 'Tradução precisa para uso geral; não inclui certificação.',
    swornDescFull: 'Realizada por um tradutor juramentado registrado no país de uso; exigido para países específicos.',
    rmvDescFull: 'Certificada em papel timbrado oficial com todos os elementos necessários; aceita pelo RMV para licenças, identificações e fins relacionados.',
    rmvNote: 'Traduções Certificadas RMV requerem entrega física.',
    swornLanguageNote: 'Traduções juramentadas só estão disponíveis para Português (Brasil)',
    clientEmailRequired: 'E-mail do cliente é obrigatório',
    pleaseUploadDocument: 'Por favor, envie um documento',
    couldNotExtractText: 'Não foi possível extrair texto - contado como 1 página',
    removeFile: 'Remover arquivo',
    // Payment method
    payByInvoice: 'Pagar por Fatura',
    invoiceSentToEmail: 'Fatura enviada para seu e-mail',
    sendToZelle: 'Enviar para',
    // Quote Summary
    quoteSummary: 'Resumo da Cotação',
    service: 'Serviço',
    certified: 'Certificada',
    standardService: 'Padrão',
    sworn: 'Juramentada',
    rmvCertified: 'Certificada RMV',
    shipping: 'Envio (USPS Priority)',
    creatingOrder: 'Criando Pedido...',
    submitOrderZelle: 'Enviar Pedido com Zelle',
    createOrder: 'Criar Pedido',
    youSaveAmount: 'Você economiza',
    coupon: 'Cupom',
    selectCoupon: 'Selecionar cupom...',
    apply: 'Aplicar',
    paymentViaInvoice: 'Pagamento via fatura (Net 30)',
    pageInfo: '1 página = 250 palavras máx.',
    invoiceNotAvailable: 'Pagamento por fatura disponível após 10 pedidos pagos',
    invoiceBlocked: 'Pagamento por fatura ainda não disponível'
  }
};

// UI Languages with flags
// Flag image helper - uses flagcdn.com for cross-platform compatibility
const getFlagUrl = (countryCode) => `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

const UI_LANGUAGES = [
  { code: 'en', countryCode: 'us', name: 'English' },
  { code: 'es', countryCode: 'es', name: 'Español' },
  { code: 'pt', countryCode: 'br', name: 'Português' }
];

// Check if user is in Brazil based on timezone
const isInBrazil = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone.includes('Sao_Paulo') || timezone.includes('Fortaleza') ||
           timezone.includes('Recife') || timezone.includes('Bahia') ||
           timezone.includes('Manaus') || timezone.includes('Cuiaba') ||
           timezone.includes('Porto_Velho') || timezone.includes('Boa_Vista') ||
           timezone.includes('Rio_Branco') || timezone.includes('Belem') ||
           timezone.includes('Araguaina') || timezone.includes('Maceio') ||
           timezone.includes('Campo_Grande') || timezone.includes('Noronha');
  } catch {
    return false;
  }
};

// Get user's language preference (Portuguese for Brazil, English for others)
const getInitialLanguage = () => {
  const saved = localStorage.getItem('ui_language');
  if (saved && ['en', 'es', 'pt'].includes(saved)) return saved;
  // Auto-detect: Portuguese for Brazil, English for everyone else
  return isInBrazil() ? 'pt' : 'en';
};

// Detect currency based on timezone (only Brazil changes to BRL)
const getLocalCurrency = () => {
  if (isInBrazil()) {
    return { code: 'BRL', symbol: 'R$', rate: 5.0, isUSA: false };
  }
  return { code: 'USD', symbol: '$', rate: 1, isUSA: true };
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

// ==================== LOGIN PAGE ====================
const LoginPage = ({ onLogin, onRegister, t, lang, changeLanguage }) => {
  // Check for registration params from B2B form or referral link
  const getInitialState = () => {
    const hash = window.location.hash;
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    const isRegister = params.get('register') === 'true' || params.get('ref');
    return {
      isLogin: !isRegister,
      email: params.get('email') || '',
      company: params.get('company') || '',
      name: params.get('name') || '',
      phone: params.get('phone') || '',
      referral_code: params.get('ref') || ''
    };
  };

  const initialState = getInitialState();
  const [isLogin, setIsLogin] = useState(initialState.isLogin);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: initialState.email,
    password: '',
    company_name: initialState.company,
    contact_name: initialState.name,
    phone: initialState.phone,
    // Address
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    address_country: 'USA',
    tax_id: '',
    // Estimated Volume
    estimated_volume: '',
    // Payment
    payment_plan: 'pay_per_order',
    default_payment_method: 'zelle',
    // Agreement
    agreed_to_terms: false,
    // Referral
    referral_code: initialState.referral_code || ''
  });
  const [showAgreement, setShowAgreement] = useState(false);
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

    // Validate agreement for registration
    if (!isLogin && !formData.agreed_to_terms) {
      setError(t.mustAgreeToTerms);
      return;
    }

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
          phone: formData.phone,
          // Address
          address_street: formData.address_street || null,
          address_city: formData.address_city || null,
          address_state: formData.address_state || null,
          address_zip: formData.address_zip || null,
          address_country: formData.address_country || 'USA',
          tax_id: formData.tax_id || null,
          // Estimated Volume
          estimated_volume: formData.estimated_volume || null,
          // Payment
          payment_plan: formData.payment_plan,
          default_payment_method: formData.default_payment_method,
          // Agreement
          agreed_to_terms: formData.agreed_to_terms,
          // Referral
          referral_code: formData.referral_code || null
        });
        onLogin(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  // Registration mode - compact single-page layout
  if (!isLogin) {
    return (
      <div className="min-h-screen bg-gray-200 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
          {/* Left Side - Branding (White background) */}
          <div className="lg:w-2/5 bg-white p-6 flex flex-col justify-center items-center">
            <img
              src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
              alt="Legacy Translations"
              className="w-48 object-contain mb-6"
            />
            <h1 className="text-xl font-bold mb-1 text-gray-800">{t.createAccount}</h1>
            <p className="text-gray-500 text-xs mb-4">{t.corporateOnly}</p>

            {/* Welcome Gift Highlight */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg p-3 mb-4 text-center">
              <span className="font-semibold text-sm">{t.welcomeGift}</span>
            </div>

            {/* Referral Indicator */}
            {formData.referral_code && (
              <div className="bg-purple-100 text-purple-700 rounded-lg p-3 mb-4 text-center text-sm">
                <span>🤝 Você foi indicado! Código: </span>
                <span className="font-mono font-bold">{formData.referral_code.toUpperCase()}</span>
              </div>
            )}

            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>{t.benefit1}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>{t.benefit2}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>{t.benefit3}</span>
              </div>
            </div>

            {/* Language Selector */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2">
              {UI_LANGUAGES.map((uiLang) => (
                <button
                  key={uiLang.code}
                  onClick={() => changeLanguage(uiLang.code)}
                  className={`hover:scale-110 transition-transform ${lang === uiLang.code ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'}`}
                  title={uiLang.name}
                >
                  <img src={getFlagUrl(uiLang.countryCode)} alt={uiLang.name} className="w-6 h-4 object-cover rounded-sm" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Side - Form (Light gray background) */}
          <div className="lg:w-3/5 p-5 lg:p-6 bg-gray-100">
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Row 1: Company & Contact */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.companyName} *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="Your Company Inc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.contactName} *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    placeholder="John Smith"
                  />
                </div>
              </div>

              {/* Row 2: Email & Phone */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.companyEmail} *</label>
                  <input
                    type="email"
                    required
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.phoneOptional}</label>
                  <input
                    type="tel"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Estimated Monthly Volume */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.estimatedVolume} *</label>
                <select
                  required
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  value={formData.estimated_volume}
                  onChange={(e) => setFormData({...formData, estimated_volume: e.target.value})}
                >
                  <option value="">{t.selectVolume}</option>
                  <option value="1-10">{t.volume1to10}</option>
                  <option value="11-50">{t.volume11to50}</option>
                  <option value="51-100">{t.volume51to100}</option>
                  <option value="100+">{t.volume100plus}</option>
                </select>
              </div>

              {/* Payment Plan */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.paymentPlan}</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Pay Per Order - Always available */}
                  <label className={`flex flex-col p-2 rounded border-2 cursor-pointer transition-all text-center border-blue-500 bg-blue-50`}>
                    <input type="radio" name="payment_plan" value="pay_per_order" checked={true} readOnly className="sr-only" />
                    <span className="font-medium text-xs text-gray-800">{t.payPerOrder}</span>
                    <span className="text-[10px] text-gray-500">{t.payPerOrderDesc}</span>
                  </label>
                  {/* Biweekly Invoice - Disabled for new signups */}
                  <div className="flex flex-col p-2 rounded border-2 border-gray-200 text-center opacity-50 cursor-not-allowed relative" title={t.invoiceQualificationNote}>
                    <div className="absolute -top-1 -right-1 bg-amber-100 rounded-full p-0.5">
                      <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                    </div>
                    <span className="font-medium text-xs text-gray-500">{t.biweeklyInvoice}</span>
                    <span className="text-[10px] text-gray-400">{t.invoiceComingSoon}</span>
                  </div>
                  {/* Monthly Invoice - Disabled for new signups */}
                  <div className="flex flex-col p-2 rounded border-2 border-gray-200 text-center opacity-50 cursor-not-allowed relative" title={t.invoiceQualificationNote}>
                    <div className="absolute -top-1 -right-1 bg-amber-100 rounded-full p-0.5">
                      <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                    </div>
                    <span className="font-medium text-xs text-gray-500">{t.monthlyInvoice}</span>
                    <span className="text-[10px] text-gray-400">{t.invoiceComingSoon}</span>
                  </div>
                </div>
                {/* Qualification note */}
                <p className="text-[10px] text-gray-500 mt-1 italic">{t.invoiceQualificationNote}</p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.password} *</label>
                <input
                  type="password"
                  required
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Create a secure password"
                />
              </div>

              {/* Terms - Compact */}
              <div className="bg-gray-50 rounded p-2 text-[10px] text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
                <span>✓ {t.term1}</span>
                <span>• {t.term2}</span>
                <span>• {t.term3}</span>
                <span className="text-amber-600">! {t.term4}</span>
              </div>

              {/* Agreement Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreed_to_terms}
                  onChange={(e) => setFormData({...formData, agreed_to_terms: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-xs text-gray-700">{t.iAgreeToTerms}</span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !formData.agreed_to_terms}
                className={`w-full py-2.5 text-white rounded font-semibold text-sm transition-all ${!formData.agreed_to_terms ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-900 hover:bg-blue-800'}`}
              >
                {loading ? t.pleaseWait : t.createAccount}
              </button>

              {/* Login Link */}
              <p className="text-center text-xs text-gray-600">
                {t.haveAccount}{' '}
                <button type="button" onClick={() => setIsLogin(true)} className="text-blue-600 hover:underline font-medium">
                  Login
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Login mode - compact centered layout
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
          {/* Legacy Logo in white box */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-xl mx-auto inline-block">
            <img
              src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
              alt="Legacy Translations"
              className="h-16 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">{isLogin ? 'Business Partner Portal' : t.createAccount}</h1>
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
                  className={`hover:scale-110 transition-transform ${
                    lang === uiLang.code ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'
                  }`}
                  title={uiLang.name}
                >
                  <img src={getFlagUrl(uiLang.countryCode)} alt={uiLang.name} className="w-6 h-4 object-cover rounded-sm" />
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
              {t.accessPortal}
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

            <div className="text-right">
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setResetEmail(formData.email); setResetSent(false); }}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                {t.forgotPassword}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500"
            >
              {loading ? t.pleaseWait : t.accessPortal}
            </button>
          </form>

          {/* Mobile Benefits */}
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

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(false)}
              className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium"
            >
              {t.noAccount}
            </button>
          </div>

          {/* Contact link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              {t.notB2B}{' '}
              <a href="mailto:contact@legacytranslations.com" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                contact@legacytranslations.com
              </a>
            </p>
          </div>
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
    { id: 'orders', label: t.myOrders, icon: '📦' },
    { id: 'invoices', label: t.invoices, icon: '🧾' },
    { id: 'messages', label: t.messages, icon: '✉️' },
    { id: 'payment-plan', label: t.paymentPlanMenu, icon: '💳' }
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

  // Coupon states
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  // Refs for scroll-to-error
  const clientNameRef = useRef(null);
  const clientEmailRef = useRef(null);
  const fileUploadRef = useRef(null);
  const shippingRef = useRef(null);

  // Contact/Support form states
  const [showContactModal, setShowContactModal] = useState(false);
  const [supportIssueType, setSupportIssueType] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [supportFiles, setSupportFiles] = useState([]);
  const [supportError, setSupportError] = useState('');
  const [supportSuccess, setSupportSuccess] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const supportFileInputRef = useRef(null);

  // Human messaging states
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState('');
  const [partnerOrders, setPartnerOrders] = useState([]);

  // Fetch partner's orders to get assigned PMs
  useEffect(() => {
    const fetchPartnerOrders = async () => {
      if (!token) return;
      try {
        const response = await axios.get(`${API}/orders?token=${token}`);
        setPartnerOrders(response.data.orders || []);
      } catch (err) {
        console.error('Failed to fetch orders for PM info:', err);
      }
    };
    fetchPartnerOrders();
  }, [token]);

  // Fetch available coupons for this partner
  useEffect(() => {
    const fetchAvailableCoupons = async () => {
      if (!token) return;
      try {
        const response = await axios.get(`${API}/partner/coupons?token=${token}`);
        setAvailableCoupons(response.data || []);
      } catch (err) {
        console.error('Failed to fetch available coupons:', err);
      }
    };
    fetchAvailableCoupons();
  }, [token]);

  // Get unique PMs from orders
  const getAvailablePMs = () => {
    const pms = new Set();
    partnerOrders.forEach(order => {
      if (order.assigned_pm) {
        pms.add(order.assigned_pm);
      }
    });
    return Array.from(pms);
  };

  // Send human message
  const sendHumanMessage = async () => {
    if (!messageRecipient || !messageContent.trim()) {
      alert('Please select a recipient and enter a message');
      return;
    }
    setSendingMessage(true);
    try {
      await axios.post(`${API}/partner/messages`, {
        token,
        recipient: messageRecipient,
        content: messageContent,
        partner_name: partner?.company_name || partner?.name || 'Partner',
        partner_email: partner?.email
      });
      setMessageSuccess('Message sent successfully! You will receive a response via email.');
      setMessageContent('');
      setMessageRecipient('');
      setTimeout(() => {
        setShowMessageModal(false);
        setMessageSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

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

  // Payment method options - Check if partner is eligible for invoice payments
  // Invoice is available if: 1) payment_plan_approved is true, OR 2) total_paid_orders >= 10
  const isInvoiceAllowed = partner?.payment_plan_approved || (partner?.total_paid_orders >= 10);
  const [paymentMethod, setPaymentMethod] = useState(isInvoiceAllowed ? 'invoice' : 'zelle');
  const [zelleReceipt, setZelleReceipt] = useState(null);
  const zelleReceiptInputRef = useRef(null);
  const ZELLE_EMAIL = 'contact@legacytranslations.com';
  const PIX_EMAIL = 'contact@legacytranslations.com';
  const ZELLE_NAME = 'Legacy Translations Inc.';

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

  // Validate and apply coupon
  const validateCoupon = async () => {
    if (!selectedCoupon) {
      setCouponError('Please select a coupon');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const orderTotal = quote?.total_price || 0;
      const res = await fetch(`${API}/partner/validate-coupon?token=${token}&code=${encodeURIComponent(selectedCoupon)}&order_total=${orderTotal}`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        setAppliedCoupon(data);
        setCouponError('');
      } else {
        const err = await res.json();
        setCouponError(err.detail || 'Invalid coupon');
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setCouponError('Failed to validate coupon');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  // Remove applied coupon
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
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
      const failedFiles = [];

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setProcessingStatus(`Processing ${file.name} (${i + 1}/${acceptedFiles.length})...`);

        try {
          const formDataUpload = new FormData();
          formDataUpload.append('file', file);

          const response = await axios.post(`${API}/upload-document?token=${token}`, formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000 // 2 minute timeout for OCR processing
          });

          // Always add file if upload succeeded, even if word_count is 0 (OCR might have failed)
          const fileWordCount = response.data?.word_count ?? 0;
          newWords += fileWordCount;
          newFiles.push({
            fileName: file.name,
            wordCount: fileWordCount,
            documentId: response.data.document_id,
            ocrFailed: fileWordCount === 0
          });
        } catch (fileErr) {
          console.error(`Failed to upload ${file.name}:`, fileErr);
          failedFiles.push(file.name);
        }
      }

      // Add new files to existing files (accumulate) - store with word counts and document IDs
      if (newFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
        setWordCount(prev => prev + newWords);
        // Clear file upload error when files are added
        if (fieldErrors.file_upload) setFieldErrors(prev => ({...prev, file_upload: false}));
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
  }, [token]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/bmp': ['.bmp'],
      'image/tiff': ['.tiff', '.tif'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: true
  });

  // Support file change handler
  const handleSupportFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024).slice(0, 5);
    setSupportFiles(validFiles);
  };

  // Handle support form submission
  const handleSupportSubmit = async () => {
    if (!partner?.email) {
      setSupportError('Email is required');
      return;
    }
    if (!supportIssueType) {
      setSupportError('Please select an issue type');
      return;
    }

    setSendingSupport(true);
    setSupportError('');

    try {
      await axios.post(`${API}/send-support-request`, {
        issue_type: supportIssueType,
        description: supportDescription,
        customer_email: partner.email,
        customer_name: partner.company_name || partner.name || 'Partner',
        files_count: supportFiles.length
      });

      setSupportSuccess('Request sent successfully! We will respond to your email shortly.');
      setSupportIssueType('');
      setSupportDescription('');
      setSupportFiles([]);
      setTimeout(() => {
        setShowContactModal(false);
        setSupportSuccess('');
      }, 2000);
    } catch (err) {
      setSupportError('Failed to send request. Please try again.');
    } finally {
      setSendingSupport(false);
    }
  };

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
      // If Zelle payment, upload receipt first
      let zelleReceiptId = null;
      if (paymentMethod === 'zelle' && zelleReceipt) {
        const receiptFormData = new FormData();
        receiptFormData.append('file', zelleReceipt);
        const uploadResponse = await axios.post(`${API}/upload-document`, receiptFormData);
        zelleReceiptId = uploadResponse.data.document_id;
      }

      const orderData = {
        ...formData,
        word_count: wordCount,
        document_filename: uploadedFiles[0]?.fileName || null,
        document_ids: uploadedFiles.map(f => f.documentId).filter(Boolean),
        payment_method: paymentMethod,
        create_invoice: paymentMethod === 'invoice',
        zelle_receipt_id: zelleReceiptId,
        payment_status: paymentMethod === 'zelle' ? 'pending_zelle' : 'pending',
        total_price: quote?.total || 0,
        shipping_address: (needsPhysicalCopy || formData.service_type === 'rmv') ? shippingAddress : null
      };

      const response = await axios.post(`${API}/orders/create?token=${token}`, orderData);

      const invoiceMsg = paymentMethod === 'invoice'
        ? ' Invoice will be sent to your email shortly.'
        : ' We will verify your Zelle payment and send a confirmation email once confirmed.';
      setSuccess(`Order ${response.data.order.order_number} created successfully!${invoiceMsg}`);

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
      setPaymentMethod('invoice');
      setZelleReceipt(null);

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
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t.clientInformation}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.clientName} *
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
                    <p className="text-red-500 text-sm mt-1">{t.clientName} is required</p>
                  )}
                </div>
                <div ref={clientEmailRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.clientEmail} *
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
                    <p className="text-red-500 text-sm mt-1">{t.clientEmailRequired}</p>
                  )}
                </div>
              </div>
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
                      <span className="text-gray-400 cursor-help" title={t.certifiedTooltip}>&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">{t.certifiedDesc}</div>
                  </div>
                  <div className="font-semibold text-teal-600">{formatPrice(24.99)}/{t.page}</div>
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
                      <span className="text-gray-400 cursor-help" title={t.standardTooltip}>&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">{t.standardDesc}</div>
                  </div>
                  <div className="font-semibold text-teal-600">{formatPrice(19.99)}/{t.page}</div>
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
                      <span className="text-gray-400 cursor-help" title={t.swornTooltip}>&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">{t.swornDesc}</div>
                  </div>
                  <div className="font-semibold text-teal-600">{formatPrice(55.00)}/{t.page}</div>
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
                      {t.rmvCertifiedTranslation}
                      <span className="text-gray-400 cursor-help" title={t.rmvTooltip}>&#9432;</span>
                    </div>
                    <div className="text-sm text-gray-500">{t.rmvDesc}</div>
                  </div>
                  <div className="font-semibold text-teal-600">{formatPrice(24.99)}/{t.page}</div>
                </label>
              </div>

              {/* Service Type Descriptions */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-2">
                <p><strong>{t.certifiedTranslation}:</strong> {t.certifiedDescFull}</p>
                <p><strong>{t.standardTranslation}:</strong> {t.standardDescFull}</p>
                <p><strong>{t.swornTranslation}:</strong> {t.swornDescFull}</p>
                <p><strong>{t.rmvCertifiedTranslation}:</strong> {t.rmvDescFull}</p>
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
                    <p className="text-xs text-gray-500 mt-1">{t.swornLanguageNote}</p>
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
                  fieldErrors.file_upload
                    ? 'border-red-500 bg-red-50'
                    : isDragActive
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-300 hover:border-teal-500'
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-3xl mb-2">📁</div>
                <div className="font-medium text-teal-600">{t.uploadFiles}</div>
                <div className="text-sm text-gray-500">{t.fileTypes}</div>
              </div>
              {fieldErrors.file_upload && (
                <p className="text-red-500 text-sm mt-2">{t.pleaseUploadDocument}</p>
              )}

              {isProcessing && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <div className="text-blue-800 font-medium">{processingStatus || t.processing}</div>
                  <div className="text-xs text-blue-600 mt-1">{t.processingNote}</div>
                </div>
              )}

              {uploadedFiles.length > 0 && !isProcessing && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((item, i) => {
                    const pages = Math.max(1, Math.ceil(item.wordCount / 250));
                    return (
                      <div key={i} className={`p-3 rounded-md flex justify-between items-center ${item.ocrFailed ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className={item.ocrFailed ? "text-yellow-600 mr-2" : "text-green-600 mr-2"}>
                              {item.ocrFailed ? "⚠️" : "✓"}
                            </span>
                            <span>{item.fileName}</span>
                            <span className="text-gray-400 text-sm ml-2">({pages} {pages === 1 ? 'page' : 'pages'})</span>
                          </div>
                          {item.ocrFailed && (
                            <div className="text-yellow-600 text-xs ml-6 mt-1">
                              {t.couldNotExtractText}
                            </div>
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
                    Total: {uploadedFiles.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.wordCount / 250)), 0)} {uploadedFiles.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.wordCount / 250)), 0) === 1 ? 'page' : 'pages'}
                  </div>
                </div>
              )}

              {/* Having trouble link */}
              <div className="mt-3 text-center text-sm text-gray-500">
                {t.havingTroubleUploading}{' '}
                <button
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  {t.contactViaEmail}
                </button>
              </div>
            </div>

            {/* Urgency */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t.urgency}</h2>
              <div className="space-y-2">
                {[
                  { id: 'no', label: t.partnerStandard, fee: '' },
                  { id: 'priority', label: t.partnerPriority, fee: '+25%' },
                  { id: 'urgent', label: t.partnerUrgent, fee: '+100%' }
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
                <h2 className="text-lg font-semibold text-gray-800 mb-4">{t.physicalCopy}</h2>
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
                      <div className="font-medium">{t.physicalCopyRequired}</div>
                      <div className="text-sm text-gray-500">{t.physicalCopyDesc}</div>
                    </div>
                    <div className="font-semibold text-teal-600">{formatPrice(18.99)}</div>
                  </label>

                  {formData.service_type === 'rmv' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> {t.rmvNote}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.reference}</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  placeholder={t.referencePlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.notes}</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder={t.notesPlaceholder}
                />
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">{t.paymentMethod}</label>
              <div className="grid grid-cols-2 gap-4">
                {/* Invoice Payment Option - Blocked if not eligible */}
                {isInvoiceAllowed ? (
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${paymentMethod === 'invoice' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="invoice"
                      checked={paymentMethod === 'invoice'}
                      onChange={() => setPaymentMethod('invoice')}
                      className="sr-only"
                    />
                    <div>
                      <span className="font-medium">{t.payByInvoice}</span>
                      <p className="text-sm text-gray-500 mt-1">{t.invoiceSentToEmail}</p>
                    </div>
                  </label>
                ) : (
                  <div className="flex items-center p-4 border-2 rounded-lg border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed relative" title={t.invoiceNotAvailable}>
                    <div className="absolute -top-2 -right-2 bg-amber-100 rounded-full p-1">
                      <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">{t.payByInvoice}</span>
                      <p className="text-xs text-amber-600 mt-1">{t.invoiceNotAvailable}</p>
                    </div>
                  </div>
                )}
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${paymentMethod === 'zelle' ? 'border-slate-400 bg-slate-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="zelle"
                    checked={paymentMethod === 'zelle'}
                    onChange={() => setPaymentMethod('zelle')}
                    className="sr-only"
                  />
                  <div>
                    <span className="font-medium">{t.payWithZelle}</span>
                    <span className="text-xs text-slate-500 font-medium ml-1">(USA)</span>
                    <span className="text-xs text-slate-500 font-medium"> or </span>
                    <span className="font-medium">{t.payWithPix}</span>
                    <span className="text-xs text-green-600 font-medium ml-1">(Brazil)</span>
                    <p className="text-sm text-gray-500 mt-1">{ZELLE_EMAIL}</p>
                  </div>
                </label>
              </div>

              {/* Zelle/PIX Instructions & Receipt Upload */}
              {paymentMethod === 'zelle' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                  <h4 className="font-semibold text-slate-700">Zelle / PIX Payment Instructions</h4>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="font-semibold">1. Open your bank app and select Zelle (USA) or PIX (Brazil)</p>
                    <p className="font-semibold">2. Send payment to: {ZELLE_EMAIL}</p>
                    <p className="font-semibold">3. Include your company name in the memo</p>
                    <p className="font-semibold">4. Upload your payment receipt below</p>
                  </div>

                  {/* Receipt Upload */}
                  <div>
                    <input
                      type="file"
                      ref={zelleReceiptInputRef}
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setZelleReceipt(e.target.files[0])}
                    />
                    <button
                      type="button"
                      onClick={() => zelleReceiptInputRef.current?.click()}
                      className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-slate-400 hover:bg-slate-100 transition-colors"
                    >
                      {zelleReceipt ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          {zelleReceipt.name}
                        </span>
                      ) : (
                        <span>Click to upload payment receipt</span>
                      )}
                    </button>
                  </div>

                  {paymentMethod === 'zelle' && !zelleReceipt && (
                    <p className="text-sm text-red-500">* Receipt is required for Zelle/PIX payments</p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || wordCount === 0 || (paymentMethod === 'zelle' && !zelleReceipt)}
              className={`w-full py-3 text-white rounded-md font-semibold ${paymentMethod === 'zelle' ? 'bg-slate-600 hover:bg-slate-700 disabled:bg-gray-400' : 'bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400'}`}
            >
              {submitting ? t.creatingOrder : (paymentMethod === 'zelle' ? t.submitOrderZelle : t.createOrder)}
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
                {formData.service_type === 'certified' && t.certified}
                {formData.service_type === 'standard' && t.standardService}
                {formData.service_type === 'sworn' && t.sworn}
                {formData.service_type === 'rmv' && t.rmvCertified}
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
                <span className="font-medium">{formatPrice(quote?.base_price || 0)}</span>
              </div>
              {quote?.urgency_fee > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>{t.urgencyFee}</span>
                  <span>{formatPrice(quote.urgency_fee)}</span>
                </div>
              )}
              {quote?.shipping_fee > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>{t.shipping}</span>
                  <span>{formatPrice(quote.shipping_fee)}</span>
                </div>
              )}

              {/* Applied Coupon Discount */}
              {appliedCoupon && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-{formatPrice(appliedCoupon.discount_amount)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-lg">
                <span className="font-bold">{t.total}</span>
                <span className="font-bold text-teal-600">
                  {formatPrice(Math.max(0, (quote?.total_price || 0) - (appliedCoupon?.discount_amount || 0)))}
                </span>
              </div>
              {appliedCoupon && (
                <div className="text-xs text-green-600 text-right mt-1">
                  {t.youSaveAmount} {formatPrice(appliedCoupon.discount_amount)}!
                </div>
              )}
            </div>

            {/* Coupon/Discount Section */}
            <div className="border-t pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.coupon}
              </label>
              {appliedCoupon ? (
                /* Coupon Applied - Show discount */
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-green-700 font-medium">{appliedCoupon.code}</span>
                    <span className="text-green-600 text-sm ml-2">({appliedCoupon.discount_description})</span>
                  </div>
                </div>
              ) : (
                /* Coupon Selection - Dropdown + Apply Button */
                <div className="flex gap-2">
                  <select
                    value={selectedCoupon}
                    onChange={(e) => setSelectedCoupon(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  >
                    {availableCoupons.length > 0 ? (
                      <>
                        <option value="">{t.selectCoupon}</option>
                        {availableCoupons.map((coupon) => (
                          <option key={coupon.code} value={coupon.code}>
                            {coupon.code}
                          </option>
                        ))}
                      </>
                    ) : (
                      <option value="">{t.selectCoupon}</option>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={validateCoupon}
                    disabled={couponLoading || !selectedCoupon || availableCoupons.length === 0}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {couponLoading ? '...' : t.apply}
                  </button>
                </div>
              )}
              {couponError && (
                <p className="text-red-500 text-xs mt-1">{couponError}</p>
              )}
            </div>

            <div className="text-xs text-gray-500 mt-4">
              * {t.paymentViaInvoice}
            </div>
          </div>
        </div>
      </div>

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
            <h2 className="text-xl font-bold text-gray-800 mb-1">Get Support</h2>
            <p className="text-gray-600 text-sm mb-4">Share details about your issue and our team will respond via email.</p>

            {/* Message Your Team Option */}
            <button
              onClick={() => {
                setShowContactModal(false);
                setShowMessageModal(true);
              }}
              className="block w-full mb-6 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:from-purple-100 hover:to-purple-150 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-purple-800">Message Your Team</h3>
                    <p className="text-xs text-purple-600">Send a message to your PM or Admin</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm">
                  Send Message
                </span>
              </div>
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">or submit a request</span>
              </div>
            </div>

            {supportSuccess ? (
              <div className="p-4 bg-green-100 text-green-700 rounded-md">
                {supportSuccess}
              </div>
            ) : (
              <div className="space-y-4 text-left">
                {/* Email - show partner email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Your Email *</label>
                  <input
                    type="email"
                    value={partner?.email || ''}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll respond to your request at this email</p>
                </div>

                {/* Issue Type Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">What do you need help with? *</label>
                  <select
                    value={supportIssueType}
                    onChange={(e) => setSupportIssueType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">-- Select issue type --</option>
                    <option value="upload">Problems with upload</option>
                    <option value="translation_type">Not sure what translation type I need</option>
                    <option value="other">Other issue</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Describe the issue</label>
                  <textarea
                    value={supportDescription}
                    onChange={(e) => setSupportDescription(e.target.value.slice(0, 2000))}
                    placeholder="Provide details about your issue..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-md h-32 resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Provide as much detail as possible.</span>
                    <span>{supportDescription.length}/2000</span>
                  </div>
                </div>

                {/* File Attachments */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Attachments (optional)</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => supportFileInputRef.current?.click()}
                      className="px-4 py-2 border-2 border-teal-600 text-teal-600 rounded-md font-semibold hover:bg-teal-50 transition-colors"
                    >
                      CHOOSE FILES
                    </button>
                    <span className="text-gray-500 text-sm">
                      {supportFiles.length > 0 ? `${supportFiles.length} file(s) selected` : 'No file selected'}
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
                  <p className="text-xs text-gray-500 mt-1">Attach screenshots or PDFs (max 5 files, 10 MB each).</p>
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
                    }}
                    className="px-6 py-2 text-gray-600 font-semibold hover:text-gray-800"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleSupportSubmit}
                    disabled={sendingSupport || !supportIssueType}
                    className="px-6 py-2 bg-amber-200 text-gray-800 rounded-md font-semibold hover:bg-amber-300 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                  >
                    {sendingSupport ? '...' : 'SEND REQUEST'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Human Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button
              onClick={() => {
                setShowMessageModal(false);
                setMessageContent('');
                setMessageRecipient('');
                setMessageSuccess('');
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl"
            >
              &times;
            </button>

            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💬</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">How can we help you?</h2>
              <p className="text-gray-600 text-sm">Send a message to your team</p>
            </div>

            {messageSuccess ? (
              <div className="p-4 bg-green-100 text-green-700 rounded-md text-center">
                <span className="text-2xl mb-2 block">✅</span>
                {messageSuccess}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recipient Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Send to *</label>
                  <select
                    value={messageRecipient}
                    onChange={(e) => setMessageRecipient(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">-- Select recipient --</option>
                    {getAvailablePMs().map(pm => (
                      <option key={pm} value={`pm:${pm}`}>
                        📋 {pm} (Project Manager)
                      </option>
                    ))}
                    <option value="admin">👤 Admin - Legacy Translations</option>
                  </select>
                  {getAvailablePMs().length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">No PM assigned yet. You can message the Admin directly.</p>
                  )}
                </div>

                {/* Message Content */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Your Message *</label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type your message here..."
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  />
                </div>

                {/* Info */}
                <div className="p-3 bg-purple-50 rounded-md text-xs text-purple-700">
                  <span className="font-medium">📧 Note:</span> You will receive a response via email at {partner?.email}
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowMessageModal(false);
                      setMessageContent('');
                      setMessageRecipient('');
                    }}
                    className="px-4 py-2 text-gray-600 font-medium hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendHumanMessage}
                    disabled={sendingMessage || !messageRecipient || !messageContent.trim()}
                    className="px-6 py-2 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
                  >
                    {sendingMessage ? 'Sending...' : '📤 Send Message'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== ORDERS LIST PAGE ====================
const OrdersPage = ({ token, currency }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDocuments, setOrderDocuments] = useState({});
  const [loadingDocuments, setLoadingDocuments] = useState({});
  // Messaging state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageOrder, setMessageOrder] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Format price helper with currency conversion
  const formatPrice = (price) => {
    const converted = (price || 0) * (currency?.rate || 1);
    return `${currency?.symbol || '$'}${converted.toFixed(2)}`;
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrderDocuments = async (orderId) => {
    if (orderDocuments[orderId]) return; // Already fetched

    setLoadingDocuments(prev => ({ ...prev, [orderId]: true }));
    try {
      const response = await axios.get(`${API}/orders/${orderId}/documents?token=${token}`);
      setOrderDocuments(prev => ({ ...prev, [orderId]: response.data.documents || [] }));
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setOrderDocuments(prev => ({ ...prev, [orderId]: [] }));
    } finally {
      setLoadingDocuments(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const downloadDocument = async (documentId, filename) => {
    try {
      const response = await axios.get(`${API}/documents/${documentId}/download?token=${token}`);
      const { file_data, content_type } = response.data;

      // Decode base64 and create download
      const byteCharacters = atob(file_data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: content_type });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document:', err);
      alert('Failed to download document. Please try again.');
    }
  };

  const handleOrderClick = (orderId) => {
    if (selectedOrder === orderId) {
      setSelectedOrder(null);
    } else {
      setSelectedOrder(orderId);
      fetchOrderDocuments(orderId);
    }
  };

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

  const sendMessage = async () => {
    if (!messageContent.trim() || !messageOrder) return;
    setSendingMessage(true);
    try {
      await axios.post(`${API}/partner/messages`, {
        token,
        recipient: 'admin',
        content: messageContent,
        order_number: messageOrder.order_number
      });
      alert('Message sent successfully!');
      setShowMessageModal(false);
      setMessageContent('');
      setMessageOrder(null);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
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
                onClick={() => handleOrderClick(order.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-teal-600">#{order.order_number}</span>
                        {getTranslationBadge(order.translation_status)}
                        {getStatusBadge(order.payment_status)}
                        {order.quickbooks_invoice_number && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Invoice #{order.quickbooks_invoice_number}
                          </span>
                        )}
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
                    <div className="text-xl font-bold text-gray-800">{formatPrice(order.total_price || 0)}</div>
                    <div className="text-sm text-gray-500">
                      Due: {order.due_date ? new Date(order.due_date).toLocaleDateString('en-US', { timeZone: 'America/New_York' }) : 'N/A'}
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
                      <div className="font-medium">{new Date(order.created_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Base Price</div>
                      <div className="font-medium">{formatPrice(order.base_price || 0)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Urgency Fee</div>
                      <div className="font-medium">{formatPrice(order.urgency_fee || 0)}</div>
                    </div>
                  </div>
                  {order.reference && (
                    <div className="mt-4">
                      <div className="text-sm text-gray-500">Reference</div>
                      <div className="font-medium">{order.reference}</div>
                    </div>
                  )}
                  {order.quickbooks_invoice_number && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-500">QuickBooks Invoice</div>
                          <div className="font-medium text-green-700">
                            Invoice #{order.quickbooks_invoice_number}
                          </div>
                          {order.quickbooks_synced_at && (
                            <div className="text-xs text-gray-400 mt-1">
                              Created: {new Date(order.quickbooks_synced_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}
                            </div>
                          )}
                        </div>
                        <div className="text-green-600">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Documents Section */}
                  <div className="mt-4">
                    <div className="text-sm text-gray-500 mb-2">Documents Sent for Translation</div>
                    {loadingDocuments[order.id] ? (
                      <div className="flex items-center text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mr-2"></div>
                        Loading documents...
                      </div>
                    ) : orderDocuments[order.id]?.length > 0 ? (
                      <div className="space-y-2">
                        {orderDocuments[order.id].map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-teal-300 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="text-teal-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <div className="font-medium text-gray-800">{doc.filename}</div>
                                <div className="text-xs text-gray-500">
                                  {doc.word_count > 0 && `${doc.word_count} words`}
                                  {doc.word_count > 0 && doc.file_size && ' • '}
                                  {doc.file_size && `${(doc.file_size / 1024).toFixed(1)} KB`}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadDocument(doc.id, doc.filename);
                              }}
                              className="flex items-center space-x-1 px-3 py-1 text-sm text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span>Download</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm p-3 bg-white rounded-lg border border-gray-200">
                        No documents uploaded for this order
                      </div>
                    )}
                  </div>

                  {/* Send Message Button */}
                  <div className="mt-4 pt-4 border-t">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMessageOrder(order);
                        setShowMessageModal(true);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>Send Message About This Order</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && messageOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Send Message</h3>
                  <p className="text-sm opacity-80">Order: #{messageOrder.order_number}</p>
                </div>
                <button
                  onClick={() => { setShowMessageModal(false); setMessageContent(''); setMessageOrder(null); }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Message:</label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message here..."
                className="w-full border rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={5}
              />
              <p className="text-xs text-gray-500 mt-2">
                This message will be sent to our team regarding order #{messageOrder.order_number}
              </p>
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => { setShowMessageModal(false); setMessageContent(''); setMessageOrder(null); }}
                className="px-4 py-2 bg-gray-400 text-white rounded-lg text-sm hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={sendMessage}
                disabled={sendingMessage || !messageContent.trim()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:bg-gray-300 flex items-center gap-2"
              >
                {sendingMessage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>Send Message</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== INVOICES PAGE ====================
const InvoicesPage = ({ token, t, currency, lang }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceOrders, setInvoiceOrders] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [zelleReceipt, setZelleReceipt] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/partner/invoices?token=${token}`);
      setInvoices(response.data.invoices || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceDetails = async (invoiceId) => {
    try {
      const response = await axios.get(`${API}/partner/invoices/${invoiceId}?token=${token}`);
      setSelectedInvoice(response.data.invoice);
      setInvoiceOrders(response.data.orders || []);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
    }
  };

  const handleViewDetails = async (invoice) => {
    await fetchInvoiceDetails(invoice.id);
  };

  const handlePayNow = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentMethod('card');
    setZelleReceipt(null);
    setShowPayModal(true);
  };

  const handlePayWithStripe = async () => {
    if (!selectedInvoice) return;
    setSubmittingPayment(true);
    try {
      const response = await axios.post(`${API}/partner/invoices/${selectedInvoice.id}/pay-stripe`, {
        invoice_id: selectedInvoice.id,
        origin_url: window.location.origin,
        currency: currency?.code?.toLowerCase() || 'usd', // Pass currency for BRL/PIX support (fallback to USD)
        locale: lang || 'en' // Send UI language for Stripe checkout translation
      });
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (err) {
      alert('Error creating payment: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setZelleReceipt({
        id: response.data.document_id,
        filename: file.name
      });
    } catch (err) {
      alert('Error uploading receipt: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmitZellePayment = async () => {
    if (!selectedInvoice || !zelleReceipt) {
      alert('Please upload a receipt');
      return;
    }

    setSubmittingPayment(true);
    try {
      await axios.post(`${API}/partner/invoices/${selectedInvoice.id}/pay-zelle?token=${token}`, {
        invoice_id: selectedInvoice.id,
        zelle_receipt_id: zelleReceipt.id
      });
      alert(t?.receiptUploaded || 'Receipt uploaded successfully. Payment will be verified shortly.');
      setShowPayModal(false);
      setZelleReceipt(null);
      fetchInvoices();
    } catch (err) {
      alert('Error submitting payment: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const formatCurrency = (amount) => {
    const converted = (amount || 0) * (currency?.rate || 1);
    return `${currency?.symbol || '$'}${converted.toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return t?.invoicePaid || 'Paid';
      case 'overdue': return t?.invoiceOverdue || 'Overdue';
      default: return t?.invoicePending || 'Pending';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t?.myInvoices || 'My Invoices'}</h1>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <span className="text-4xl mb-4 block">📋</span>
          {t?.noInvoices || 'No invoices found'}
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-mono font-bold text-lg">{invoice.invoice_number}</div>
                    <div className="text-sm text-gray-500">
                      {t?.dueDate || 'Due Date'}: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                    <span className="text-2xl font-bold text-gray-800">{formatCurrency(invoice.total_amount)}</span>
                  </div>
                </div>

                <div className="text-sm text-gray-500 mb-4">
                  {invoice.order_ids?.length || 0} {t?.ordersIncluded || 'orders'} |
                  {t?.invoiceNumber || 'Created'}: {new Date(invoice.created_at).toLocaleDateString()}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleViewDetails(invoice)}
                    className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                  >
                    {t?.viewDetails || 'View Details'}
                  </button>

                  {invoice.status !== 'paid' && (
                    <button
                      onClick={() => handlePayNow(invoice)}
                      className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                    >
                      {t?.payNow || 'Pay Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && !showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">{selectedInvoice.invoice_number}</h2>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedInvoice.status)}`}>
                  {getStatusLabel(selectedInvoice.status)}
                </span>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-gray-500">{t?.dueDate || 'Due Date'}</div>
                  <div className="font-medium">{selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{t?.amount || 'Amount'}</div>
                  <div className="font-bold text-xl">{formatCurrency(selectedInvoice.total_amount)}</div>
                </div>
              </div>

              <h3 className="font-bold text-gray-700 mb-3">{t?.ordersIncluded || 'Orders Included'}</h3>
              <div className="space-y-2">
                {invoiceOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-sm text-gray-500">
                          {order.client_name} - {order.translate_from} to {order.translate_to}
                        </div>
                        <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="font-medium">{formatCurrency(order.total_price)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedInvoice.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">{selectedInvoice.notes}</div>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
              {selectedInvoice.status !== 'paid' && (
                <button
                  onClick={() => { setShowPayModal(true); }}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  {t?.payNow || 'Pay Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold">{t?.payNow || 'Pay Invoice'}</h2>
              <button onClick={() => { setShowPayModal(false); setZelleReceipt(null); }} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-sm text-gray-500">{t?.amount || 'Amount'}</div>
                <div className="text-3xl font-bold text-gray-800">{formatCurrency(selectedInvoice.total_amount)}</div>
                <div className="text-xs text-gray-500 mt-1">{selectedInvoice.invoice_number}</div>
              </div>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-4 border rounded-lg flex items-center justify-between ${
                    paymentMethod === 'card' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">💳</span>
                    <span className="font-medium">{t?.payWithCard || 'Pay with Card'}</span>
                  </div>
                  {paymentMethod === 'card' && <span className="text-teal-600">✓</span>}
                </button>

                <button
                  onClick={() => setPaymentMethod('zelle')}
                  className={`w-full p-4 border rounded-lg flex items-center justify-between ${
                    paymentMethod === 'zelle' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🏦</span>
                    <span className="font-medium">{t?.payWithZelle || 'Pay with Zelle'}</span>
                  </div>
                  {paymentMethod === 'zelle' && <span className="text-teal-600">✓</span>}
                </button>
              </div>

              {paymentMethod === 'card' && (
                <button
                  onClick={handlePayWithStripe}
                  disabled={submittingPayment}
                  className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium disabled:bg-gray-300"
                >
                  {submittingPayment ? 'Processing...' : `${t?.payNow || 'Pay'} ${formatCurrency(selectedInvoice.total_amount)}`}
                </button>
              )}

              {paymentMethod === 'zelle' && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-sm font-medium text-purple-800 mb-2">Zelle Payment Instructions:</div>
                    <div className="text-sm text-purple-700">
                      {t?.zelleInstructions || 'Send payment via Zelle to: payments@legacytranslations.com'}
                    </div>
                    <div className="text-sm text-purple-600 mt-2">Amount: {formatCurrency(selectedInvoice.total_amount)}</div>
                    <div className="text-xs text-purple-500 mt-1">Reference: {selectedInvoice.invoice_number}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t?.uploadReceipt || 'Upload Payment Receipt'}
                    </label>
                    <input
                      type="file"
                      onChange={handleReceiptUpload}
                      accept="image/*,.pdf"
                      className="w-full border rounded-lg p-2 text-sm"
                      disabled={uploadingReceipt}
                    />
                    {uploadingReceipt && (
                      <div className="text-sm text-gray-500 mt-1">Uploading...</div>
                    )}
                    {zelleReceipt && (
                      <div className="text-sm text-green-600 mt-1">
                        ✓ {zelleReceipt.filename}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSubmitZellePayment}
                    disabled={!zelleReceipt || submittingPayment}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:bg-gray-300"
                  >
                    {submittingPayment ? 'Submitting...' : 'Submit Zelle Payment'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== PAYMENT PLAN PAGE ====================
const PaymentPlanPage = ({ token, t }) => {
  const [qualification, setQualification] = useState(null);
  const [tierInfo, setTierInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('biweekly');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      // Fetch both qualification and tier info in parallel
      const [qualRes, tierRes] = await Promise.all([
        fetch(`${API}/partner/credit-qualification?token=${token}`),
        fetch(`${API}/partner/tier-info?token=${token}`)
      ]);

      if (qualRes.ok) {
        const qualData = await qualRes.json();
        setQualification(qualData);
      }

      if (tierRes.ok) {
        const tierData = await tierRes.json();
        setTierInfo(tierData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQualification = async () => {
    try {
      const res = await fetch(`${API}/partner/credit-qualification?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setQualification(data);
      }
    } catch (error) {
      console.error('Error fetching qualification:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'platinum': return '💎';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '📊';
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'platinum': return 'text-purple-700 bg-purple-100';
      case 'gold': return 'text-yellow-700 bg-yellow-100';
      case 'silver': return 'text-slate-600 bg-slate-200';
      case 'bronze': return 'text-amber-700 bg-amber-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleRequestUpgrade = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/partner/request-payment-upgrade?token=${token}&plan=${selectedPlan}`, {
        method: 'POST'
      });
      if (res.ok) {
        setSuccess(true);
        fetchQualification();
      } else {
        const err = await res.json();
        alert(err.detail || 'Error submitting request');
      }
    } catch (error) {
      console.error('Error requesting upgrade:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getPlanDisplayName = (plan) => {
    switch (plan) {
      case 'pay_per_order': return t?.payPerOrder || 'Pay Per Order';
      case 'biweekly': return t?.biweeklyInvoice || 'Biweekly Invoice';
      case 'monthly': return t?.monthlyInvoice || 'Monthly Invoice';
      default: return plan;
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t?.paymentPlanTitle || 'Payment Plan'}</h1>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Payment Plan Info */}
        <div className="lg:w-1/2 space-y-6">
          {/* Payment Plan Terms Explanation */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {t?.paymentPlanTermsTitle || 'Payment Terms'}
            </h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>{t?.paymentPlanTerm1 || 'Biweekly invoicing available upon completion of 10 paid translations.'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>{t?.paymentPlanTerm2 || 'Net 30 payment terms granted after 3 consecutive months of timely invoice settlement.'}</span>
              </li>
            </ul>
          </div>

          {/* Current Plan Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">{t?.currentPlan || 'Current Plan'}</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <div className="text-xl font-semibold text-gray-800">{getPlanDisplayName(qualification?.current_plan)}</div>
                {qualification?.plan_approved && qualification?.current_plan !== 'pay_per_order' && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Approved</span>
                )}
              </div>
            </div>
          </div>

          {/* Qualification Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">{t?.qualificationStatus || 'Qualification Status'}</h2>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{qualification?.total_paid_orders || 0} {t?.translationsCompleted || 'translations completed'}</span>
                <span className="text-gray-500">{qualification?.orders_required || 10} required</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${qualification?.qualifies_for_invoice ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, ((qualification?.total_paid_orders || 0) / (qualification?.orders_required || 10)) * 100)}%` }}
                />
              </div>
            </div>

            {qualification?.qualifies_for_invoice ? (
              <div className="flex items-center gap-2 text-green-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">{t?.qualifiedForInvoice || 'You qualify for biweekly invoice!'}</span>
              </div>
            ) : (
              <div className="text-gray-600">
                <span>{qualification?.orders_remaining || 10} {t?.translationsRemaining || 'more translations to qualify'}</span>
              </div>
            )}
          </div>

          {/* Upgrade Section */}
          {qualification?.current_plan === 'pay_per_order' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-sm font-medium text-gray-500 mb-4">{t?.requestUpgrade || 'Request Upgrade'}</h2>

              {qualification?.upgrade_pending ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                    <span className="font-medium">{t?.upgradeRequested || 'Upgrade Requested'}</span>
                  </div>
                  <p className="text-sm text-amber-600 mt-2">{t?.awaitingApproval || 'Awaiting admin approval'}</p>
                  <p className="text-sm text-amber-600 mt-1">Requested: {getPlanDisplayName(qualification?.requested_plan)}</p>
                </div>
              ) : success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="font-medium">{t?.upgradeSuccess || 'Upgrade request submitted successfully!'}</span>
                  </div>
                </div>
              ) : qualification?.qualifies_for_invoice ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">{t?.selectPlanToUpgrade || 'Select the plan you want:'}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPlan === 'biweekly' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                      <input type="radio" name="upgrade_plan" value="biweekly" checked={selectedPlan === 'biweekly'} onChange={(e) => setSelectedPlan(e.target.value)} className="sr-only" />
                      <span className="font-medium text-gray-800">{t?.biweeklyInvoice || 'Biweekly Invoice'}</span>
                      <span className="text-xs text-gray-500 mt-1">{t?.biweeklyInvoiceDesc || 'Receive invoice every 2 weeks'}</span>
                    </label>
                    <label className={`flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                      <input type="radio" name="upgrade_plan" value="monthly" checked={selectedPlan === 'monthly'} onChange={(e) => setSelectedPlan(e.target.value)} className="sr-only" />
                      <span className="font-medium text-gray-800">{t?.monthlyInvoice || 'Monthly Invoice'}</span>
                      <span className="text-xs text-gray-500 mt-1">{t?.monthlyInvoiceDesc || 'Receive monthly invoice'}</span>
                    </label>
                  </div>

                  <button
                    onClick={handleRequestUpgrade}
                    disabled={submitting}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 transition-colors"
                  >
                    {submitting ? '...' : (t?.submitUpgradeRequest || 'Submit Upgrade Request')}
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-sm text-gray-600">{t?.notQualifiedYet || 'Not yet qualified'}</p>
                  <p className="text-xs text-gray-500 mt-1">{qualification?.orders_remaining} {t?.translationsRemaining || 'more translations to qualify'}</p>
                </div>
              )}
            </div>
          )}

          {/* Current Tier Status */}
          {tierInfo && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-medium text-gray-500 mb-1">{t?.yourCurrentTier || 'Your Current Tier'}</h2>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${getTierColor(tierInfo.current_tier)}`}>
                    {tierInfo.current_tier}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{tierInfo.discount_percent}% OFF</div>
                  <div className="text-sm text-gray-600">{currency?.symbol || '$'}{(tierInfo.price_per_page * (currency?.rate || 1)).toFixed(2)}/{t?.page || 'page'}</div>
                </div>
              </div>

              {/* Volume Progress */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{tierInfo.volume_stats?.total_pages || 0} {t?.pagesLast30Days || 'pages in last 30 days'}</span>
                  {tierInfo.next_tier && (
                    <span className="text-gray-500">{tierInfo.pages_to_next_tier} {t?.pagesToNextTier || 'pages to'} {tierInfo.next_tier}</span>
                  )}
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: tierInfo.next_tier
                        ? `${Math.min(100, ((tierInfo.volume_stats?.total_pages || 0) / (tierInfo.volume_stats?.total_pages + tierInfo.pages_to_next_tier)) * 100)}%`
                        : '100%'
                    }}
                  />
                </div>
                {tierInfo.monthly_savings > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    {t?.youSaved || 'You saved'} <span className="font-semibold">{currency?.symbol || '$'}{(tierInfo.monthly_savings * (currency?.rate || 1)).toFixed(2)}</span> {t?.thisMonth || 'this month'}!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Partner Discount Structure */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-lg shadow-sm border p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">{t?.discountStructure || 'Partner Discount Structure'}</h2>
                <p className="text-xs text-gray-500">{t?.certifiedTranslationNote || 'Prices for "Certified Translation" services'}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">{t?.discountDescription || 'Earn volume discounts based on your monthly page count'}</p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-3 py-3 text-left rounded-tl-lg">{t?.tier || 'Tier'}</th>
                    <th className="px-3 py-3 text-center">{t?.monthlyVolume || 'Monthly Volume'}</th>
                    <th className="px-3 py-3 text-center">{t?.discount || 'Discount'}</th>
                    <th className="px-3 py-3 text-center">{t?.pricePerPage || 'Price/Page'}</th>
                    <th className="px-3 py-3 text-center">{t?.monthlySavings || 'Savings'}</th>
                    <th className="px-3 py-3 text-center rounded-tr-lg">{t?.partnerMargin || 'Margin*'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={`border-b border-gray-100 ${tierInfo?.current_tier === 'bronze' ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-amber-700">B</span>
                        </div>
                        <span className="font-semibold text-gray-700">Bronze</span>
                        {tierInfo?.current_tier === 'bronze' && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{t?.current || 'Current'}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">10-29</td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">10%</span>
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-gray-700">{currency?.symbol || '$'}{(22.49 * (currency?.rate || 1)).toFixed(2)}</td>
                    <td className="px-3 py-3 text-center text-green-600 text-xs">{t?.upTo || 'up to'} {currency?.symbol || '$'}{(72 * (currency?.rate || 1)).toFixed(0)}</td>
                    <td className="px-3 py-3 text-center font-semibold text-blue-600">{currency?.symbol || '$'}{(7.50 * (currency?.rate || 1)).toFixed(2)}</td>
                  </tr>
                  <tr className={`border-b border-gray-100 ${tierInfo?.current_tier === 'silver' ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-600">S</span>
                        </div>
                        <span className="font-semibold text-gray-700">Silver</span>
                        {tierInfo?.current_tier === 'silver' && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{t?.current || 'Current'}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">30-59</td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">15%</span>
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-gray-700">{currency?.symbol || '$'}{(21.24 * (currency?.rate || 1)).toFixed(2)}</td>
                    <td className="px-3 py-3 text-center text-green-600 text-xs">{t?.upTo || 'up to'} {currency?.symbol || '$'}{(225 * (currency?.rate || 1)).toFixed(0)}</td>
                    <td className="px-3 py-3 text-center font-semibold text-blue-600">{currency?.symbol || '$'}{(8.75 * (currency?.rate || 1)).toFixed(2)}</td>
                  </tr>
                  <tr className={`border-b border-gray-100 ${tierInfo?.current_tier === 'gold' ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-yellow-700">G</span>
                        </div>
                        <span className="font-semibold text-gray-700">Gold</span>
                        {tierInfo?.current_tier === 'gold' && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{t?.current || 'Current'}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">60-99</td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">25%</span>
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-gray-700">{currency?.symbol || '$'}{(18.74 * (currency?.rate || 1)).toFixed(2)}</td>
                    <td className="px-3 py-3 text-center text-green-600 text-xs">{t?.upTo || 'up to'} {currency?.symbol || '$'}{(618 * (currency?.rate || 1)).toFixed(0)}</td>
                    <td className="px-3 py-3 text-center font-semibold text-blue-600">{currency?.symbol || '$'}{(11.25 * (currency?.rate || 1)).toFixed(2)}</td>
                  </tr>
                  <tr className={`${tierInfo?.current_tier === 'platinum' ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-3 rounded-bl-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">P</span>
                        </div>
                        <span className="font-semibold text-gray-700">Platinum</span>
                        {tierInfo?.current_tier === 'platinum' && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{t?.current || 'Current'}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">100+</td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">35%</span>
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-gray-700">{currency?.symbol || '$'}{(16.24 * (currency?.rate || 1)).toFixed(2)}</td>
                    <td className="px-3 py-3 text-center text-green-600 text-xs">{currency?.symbol || '$'}{(875 * (currency?.rate || 1)).toFixed(0)}+</td>
                    <td className="px-3 py-3 text-center font-semibold text-blue-600 rounded-br-lg">{currency?.symbol || '$'}{(13.75 * (currency?.rate || 1)).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              *{t?.marginNote || 'Partner margin calculated based on resale at $30/page (common market rate)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MESSAGES PAGE ====================
const MessagesPage = ({ token }) => {
  const [conversations, setConversations] = useState([]);
  const [systemMessages, setSystemMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversations');
  const [expandedThreads, setExpandedThreads] = useState({});

  useEffect(() => {
    fetchAllMessages();
  }, []);

  // Auto-mark unread system messages as read when viewing notifications tab
  useEffect(() => {
    if (activeTab === 'notifications' && systemMessages.length > 0) {
      const unreadMsgs = systemMessages.filter(m => !m.read);
      unreadMsgs.forEach(msg => {
        markSystemMessageAsRead(msg.id);
      });
    }
  }, [activeTab, systemMessages.length]);

  const fetchAllMessages = async () => {
    try {
      // Fetch conversations (sent messages + admin replies)
      const convResponse = await axios.get(`${API}/partner/conversations?token=${token}`);
      setConversations(convResponse.data.conversations || []);

      // Also fetch system messages
      const msgResponse = await axios.get(`${API}/messages?token=${token}`);
      setSystemMessages(msgResponse.data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markConversationAsRead = async (conversationId) => {
    try {
      await axios.put(`${API}/partner/conversations/${conversationId}/read?token=${token}`);
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, read: true } : conv
      ));
    } catch (err) {
      console.error('Failed to mark conversation as read:', err);
    }
  };

  const markSystemMessageAsRead = async (messageId) => {
    try {
      await axios.put(`${API}/messages/${messageId}/read?token=${token}`);
      setSystemMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (isThisYear) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return '';
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
      case 'admin_reply': return '💬';
      case 'partner_message': return '📤';
      default: return '✉️';
    }
  };

  // Group conversations by order_number or thread
  const groupedConversations = useMemo(() => {
    const groups = {};

    conversations.forEach(conv => {
      // Use order_number as key, or 'general' for messages without order
      const key = conv.order_number || 'general';
      if (!groups[key]) {
        groups[key] = {
          order_number: conv.order_number,
          messages: [],
          hasUnread: false,
          lastMessage: null,
          lastDate: null
        };
      }
      groups[key].messages.push(conv);

      // Track unread status
      if (conv.direction === 'received' && !conv.read) {
        groups[key].hasUnread = true;
      }

      // Track last message date
      const msgDate = new Date(conv.created_at);
      if (!groups[key].lastDate || msgDate > groups[key].lastDate) {
        groups[key].lastDate = msgDate;
        groups[key].lastMessage = conv;
      }
    });

    // Sort messages within each group by date (newest first for display, oldest first for thread)
    Object.values(groups).forEach(group => {
      group.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });

    // Convert to array and sort by last message date (newest first)
    return Object.entries(groups)
      .map(([key, group]) => ({ key, ...group }))
      .sort((a, b) => b.lastDate - a.lastDate);
  }, [conversations]);

  const toggleThread = (key) => {
    setExpandedThreads(prev => {
      const newExpanded = { ...prev, [key]: !prev[key] };

      // Mark unread messages as read when expanding
      if (newExpanded[key]) {
        const group = groupedConversations.find(g => g.key === key);
        if (group) {
          group.messages.forEach(msg => {
            if (msg.direction === 'received' && !msg.read) {
              markConversationAsRead(msg.id);
            }
          });
        }
      }

      return newExpanded;
    });
  };

  const unreadConversations = conversations.filter(c => c.direction === 'received' && !c.read).length;
  const unreadSystemMessages = systemMessages.filter(m => !m.read).length;

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

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('conversations')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px ${
            activeTab === 'conversations'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Conversations
          {unreadConversations > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {unreadConversations}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px ${
            activeTab === 'notifications'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          System Notifications
          {unreadSystemMessages > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {unreadSystemMessages}
            </span>
          )}
        </button>
      </div>

      {/* Conversations Tab - Compact Inbox Style */}
      {activeTab === 'conversations' && (
        <>
          {groupedConversations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No conversations</h2>
              <p className="text-gray-600">Your messages with Legacy Translations will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {groupedConversations.map((group) => (
                <div key={group.key} className="border-b last:border-b-0">
                  {/* Compact Row - One line per conversation thread */}
                  <div
                    onClick={() => toggleThread(group.key)}
                    className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      group.hasUnread ? 'bg-teal-50' : ''
                    }`}
                  >
                    {/* Unread indicator */}
                    <div className="w-2 mr-3">
                      {group.hasUnread && (
                        <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                      )}
                    </div>

                    {/* Direction icon */}
                    <div className="text-lg mr-3">
                      {group.lastMessage?.direction === 'sent' ? '📤' : '📥'}
                    </div>

                    {/* Order/Project badge */}
                    <div className="w-28 flex-shrink-0 mr-3">
                      {group.order_number ? (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                          #{group.order_number}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          General
                        </span>
                      )}
                    </div>

                    {/* Message preview */}
                    <div className="flex-1 min-w-0 mr-3">
                      <p className={`text-sm truncate ${group.hasUnread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {group.lastMessage?.direction === 'sent' ? (
                          <span className="text-gray-400">You: </span>
                        ) : (
                          <span className="text-gray-400">Admin: </span>
                        )}
                        {group.lastMessage?.content}
                      </p>
                    </div>

                    {/* Message count */}
                    <div className="flex-shrink-0 mr-3">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                        {group.messages.length} msg{group.messages.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Status badges */}
                    <div className="flex-shrink-0 mr-3 flex items-center space-x-1">
                      {group.lastMessage?.replied && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Replied
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="w-20 text-right flex-shrink-0 mr-2">
                      <span className="text-xs text-gray-400">
                        {formatDate(group.lastMessage?.created_at)}
                      </span>
                    </div>

                    {/* Expand/Collapse icon */}
                    <div className="flex-shrink-0 text-gray-400">
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedThreads[group.key] ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Thread View */}
                  {expandedThreads[group.key] && (
                    <div className="bg-gray-50 px-4 py-3 border-t">
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {group.messages.map((msg, idx) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                msg.direction === 'sent'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white border border-gray-200'
                              }`}
                            >
                              {/* Show original message context for replies */}
                              {msg.direction === 'received' && msg.original_message_content && (
                                <div className="text-xs text-gray-400 border-l-2 border-gray-300 pl-2 mb-2 italic">
                                  Re: {msg.original_message_content.substring(0, 50)}...
                                </div>
                              )}
                              <p className={`text-sm ${msg.direction === 'sent' ? 'text-white' : 'text-gray-700'}`}>
                                {msg.content}
                              </p>
                              <div className={`flex items-center justify-between mt-1 text-xs ${
                                msg.direction === 'sent' ? 'text-blue-100' : 'text-gray-400'
                              }`}>
                                <span>{formatFullDate(msg.created_at)}</span>
                                {msg.direction === 'sent' && msg.replied && (
                                  <span className="ml-2 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Replied
                                  </span>
                                )}
                                {msg.direction === 'received' && msg.read && (
                                  <span className="ml-2 flex items-center text-green-500">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Read
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* System Notifications Tab - Compact Style */}
      {activeTab === 'notifications' && (
        <>
          {systemMessages.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-4xl mb-4">✉️</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No notifications</h2>
              <p className="text-gray-600">System notifications will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {systemMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-center px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 ${
                    !message.read ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Unread indicator */}
                  <div className="w-2 mr-3">
                    {!message.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="text-lg mr-3">{getMessageIcon(message.type)}</div>

                  {/* Title and content */}
                  <div className="flex-1 min-w-0 mr-3">
                    <p className={`text-sm ${!message.read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                      <span className="font-medium">{message.title}</span>
                      <span className="text-gray-400 mx-2">-</span>
                      <span className="text-gray-500 truncate">{message.content}</span>
                    </p>
                  </div>

                  {/* Date */}
                  <div className="flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
            Legacy Translations Inc. • Certified Translation Services
          </p>
          <a href="https://legacytranslations.com" className="text-xs text-blue-600 hover:underline">
            www.legacytranslations.com
          </a>
        </div>
      </div>
    </div>
  );
};

// ==================== PARTNER FLOATING CHAT WIDGET ====================
const PartnerFloatingChatWidget = ({ token, partner, onNavigateToMessages }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    if (token) {
      fetchConversations();
      const interval = setInterval(fetchConversations, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Auto-mark messages as read when opening inbox
  useEffect(() => {
    if (showNotifications && isOpen) {
      const unreadConvs = conversations.filter(c => c.direction === 'received' && !c.read);
      unreadConvs.forEach(conv => {
        markAsRead(conv.id);
      });
    }
  }, [showNotifications, isOpen]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/partner/conversations?token=${token}`);
      setConversations(response.data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      await axios.put(`${API}/partner/conversations/${conversationId}/read?token=${token}`);
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, read: true } : conv
      ));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const sendMessage = async () => {
    if (!messageContent.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/partner/messages`, {
        token,
        recipient: 'admin',
        content: messageContent,
        partner_name: partner?.company_name || partner?.contact_name || 'Partner',
        partner_email: partner?.email
      });
      setMessageContent('');
      setMessageSent(true);
      fetchConversations();
      setTimeout(() => setMessageSent(false), 5000);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Count unread received messages
  const unreadCount = conversations.filter(c => c.direction === 'received' && !c.read).length;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setShowNotifications(false); }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:from-blue-700 hover:to-blue-800 flex items-center justify-center z-50 transition-all hover:scale-105"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 bg-white rounded-lg shadow-2xl z-50 overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <h3 className="font-bold text-lg">Contact Us</h3>
            <p className="text-xs text-blue-100">Send a message to Legacy Translations</p>
          </div>

          {/* Tab Toggle */}
          <div className="flex border-b">
            <button
              onClick={() => setShowNotifications(false)}
              className={`flex-1 py-2 text-sm font-medium ${!showNotifications ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600'}`}
            >
              New Message
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className={`flex-1 py-2 text-sm font-medium relative ${showNotifications ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600'}`}
            >
              Inbox
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {!showNotifications ? (
              <div className="space-y-4">
                {messageSent && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-700 text-sm font-medium">Message sent successfully!</p>
                    <p className="text-green-600 text-xs mt-1">
                      You can view all your messages in the{' '}
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          if (onNavigateToMessages) onNavigateToMessages();
                        }}
                        className="underline hover:text-green-800"
                      >
                        Messages section
                      </button>
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your Message:</label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="How can we help you?"
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={sending || !messageContent.trim()}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Message
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {conversations.filter(c => c.direction === 'received').length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    <div className="text-2xl mb-2">📭</div>
                    <p className="text-sm">No replies yet</p>
                  </div>
                ) : (
                  conversations.filter(c => c.direction === 'received').slice(0, 5).map((conv) => (
                    <div
                      key={conv.id}
                      className="p-3 rounded-lg border bg-gray-50 border-gray-200"
                    >
                      <div className="mb-1">
                        <span className="text-xs font-medium text-blue-700">{conv.from_admin_name || 'Admin'}</span>
                      </div>
                      {conv.original_message_content && (
                        <p className="text-[10px] text-gray-500 italic mb-1">Re: {conv.original_message_content.substring(0, 50)}...</p>
                      )}
                      <p className="text-sm text-gray-700">{conv.content}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {conv.created_at ? new Date(conv.created_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : ''}
                      </p>
                    </div>
                  ))
                )}
                {conversations.filter(c => c.direction === 'received').length > 5 && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      if (onNavigateToMessages) onNavigateToMessages();
                    }}
                    className="w-full text-center text-sm text-blue-600 hover:underline py-2"
                  >
                    View all messages
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// ==================== MAIN APP ====================
function App() {
  const [partner, setPartner] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('new-order');
  const [lang, setLang] = useState(getInitialLanguage);
  const [currency, setCurrency] = useState(getLocalCurrency);
  const [verificationId, setVerificationId] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [isValidatingSession, setIsValidatingSession] = useState(true);
  const [showWelcomeCouponModal, setShowWelcomeCouponModal] = useState(false);
  const [welcomeCouponCode, setWelcomeCouponCode] = useState(null);

  // Get translations for current language
  const t = TRANSLATIONS[lang];

  // Handle language change
  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('ui_language', newLang);
  };

  // Fetch real-time exchange rate for BRL if user is in Brazil
  useEffect(() => {
    const fetchExchangeRate = async () => {
      if (currency.code !== 'BRL') return; // Only fetch for Brazilian users

      try {
        const response = await axios.get(`${API}/exchange-rates`);
        if (response.data?.rates?.brl) {
          setCurrency(prev => ({
            ...prev,
            rate: response.data.rates.brl
          }));
        }
      } catch (err) {
        console.log('Using default BRL rate');
      }
    };
    fetchExchangeRate();
  }, [currency.code]);

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

  // Check for saved session and validate token
  useEffect(() => {
    const validateSession = async () => {
      const savedToken = localStorage.getItem('token');
      if (!savedToken) {
        setIsValidatingSession(false);
        return;
      }

      try {
        // Validate token with backend
        const response = await axios.get(`${API}/partner/verify-token?token=${savedToken}`);
        if (response.data.valid && response.data.partner) {
          const partnerData = response.data.partner;
          setPartner(partnerData);
          setToken(savedToken);
          // Update localStorage with fresh partner data
          localStorage.setItem('partner', JSON.stringify(partnerData));

          // Show welcome coupon modal if partner hasn't seen it yet
          if (!partnerData.has_seen_welcome_coupon && partnerData.welcome_coupon_code) {
            setWelcomeCouponCode(partnerData.welcome_coupon_code);
            setShowWelcomeCouponModal(true);
          }
        }
      } catch (err) {
        // Token is invalid or expired, clear localStorage
        console.log('Session expired, clearing localStorage');
        localStorage.removeItem('partner');
        localStorage.removeItem('token');
      } finally {
        setIsValidatingSession(false);
      }
    };
    validateSession();
  }, []);

  const handleLogin = (data) => {
    setPartner(data);
    setToken(data.token);
    localStorage.setItem('partner', JSON.stringify(data));
    localStorage.setItem('token', data.token);

    // Show welcome coupon modal if partner hasn't seen it yet
    if (!data.has_seen_welcome_coupon && data.welcome_coupon_code) {
      setWelcomeCouponCode(data.welcome_coupon_code);
      setShowWelcomeCouponModal(true);
    }
  };

  const dismissWelcomeCoupon = async () => {
    try {
      await axios.post(`${API}/partner/dismiss-welcome-coupon?token=${token}`);
      setShowWelcomeCouponModal(false);
      setWelcomeCouponCode(null);
      // Update local partner data
      if (partner) {
        const updatedPartner = { ...partner, has_seen_welcome_coupon: true };
        setPartner(updatedPartner);
        localStorage.setItem('partner', JSON.stringify(updatedPartner));
      }
    } catch (err) {
      console.error('Error dismissing welcome coupon:', err);
      setShowWelcomeCouponModal(false);
    }
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
        return <OrdersPage token={token} currency={currency} />;
      case 'invoices':
        return <InvoicesPage token={token} t={t} currency={currency} lang={lang} />;
      case 'messages':
        return <MessagesPage token={token} />;
      case 'payment-plan':
        return <PaymentPlanPage token={token} t={t} />;
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

  // Show loading while validating session
  if (isValidatingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
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
                  className={`hover:scale-110 transition-transform ${
                    lang === uiLang.code ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'
                  }`}
                  title={uiLang.name}
                >
                  <img src={getFlagUrl(uiLang.countryCode)} alt={uiLang.name} className="w-7 h-5 object-cover rounded-sm" />
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
      <PartnerFloatingChatWidget token={token} partner={partner} onNavigateToMessages={() => setActiveTab('messages')} />

      {/* Welcome Coupon Modal - First Login */}
      {showWelcomeCouponModal && welcomeCouponCode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white text-center">
              <div className="text-5xl mb-3">🎁</div>
              <h2 className="text-2xl font-bold">{t.welcomeGiftTitle}</h2>
              <p className="text-teal-100 mt-2">{t.welcomeGiftThankYou}</p>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-4">
                  {t.welcomeGiftDescription}
                </p>

                {/* Coupon Code Box */}
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-dashed border-teal-400 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t.welcomeGiftCouponLabel}</p>
                  <div className="bg-white rounded-lg px-4 py-3 shadow-inner">
                    <span className="text-2xl font-bold text-teal-600 font-mono tracking-wider">
                      {welcomeCouponCode}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{t.welcomeGiftCouponDesc}</p>
                </div>

                <div className="text-sm text-gray-500 space-y-1">
                  <p>{t.welcomeGiftValid}</p>
                  <p>{t.welcomeGiftUse}</p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={dismissWelcomeCoupon}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
              >
                {lang === 'es' ? '¡Entendido! Empezar a pedir' : lang === 'pt' ? 'Entendi! Começar a pedir' : 'Got it! Start ordering'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
