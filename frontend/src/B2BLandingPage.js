import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ==================== INTERNATIONALIZATION ====================
const TRANSLATIONS = {
  en: {
    // Header
    home: 'Home',
    services: 'Services',
    partnerLogin: 'Partner Login',
    // Hero
    yearsExperience: '15+ Years of Experience',
    heroTitle1: 'Certified Translation',
    heroTitle2: 'Powered by Technology',
    heroDescription: 'Enterprise-grade translation services powered by certified professionals and cutting-edge technology. Trusted by law firms and immigration agencies.',
    requestPartnership: 'Request Partnership',
    viewBenefits: 'View Benefits',
    uscisAccepted: 'USCIS Accepted',
    ataMember: 'ATA Member',
    turnaround24h: '24h Turnaround',
    // Free Translation Banner
    freeTranslationTitle: 'First Certified Translation FREE!',
    freeTranslationSubtitle: '1 page - No commitment required',
    claimFreeTranslation: 'Claim Your Free Translation',
    // Stats
    yearsExperienceStats: 'Years Experience',
    languages: 'Languages',
    uscisAcceptedStats: 'USCIS Accepted',
    // Benefits Section
    partnershipBenefits: 'Partnership Benefits',
    benefitsDescription: 'Join our B2B program and enjoy exclusive advantages designed for businesses with ongoing translation needs.',
    monthlyInvoicing: 'Monthly Invoicing',
    monthlyInvoicingDesc: 'Net 30 payment terms for approved partners. Simplify your accounting with consolidated monthly billing.',
    volumeDiscounts: 'Volume Discounts',
    volumeDiscountsDesc: 'Special pricing based on your monthly translation volume. The more you translate, the more you save.',
    priorityProcessing: 'Priority Processing',
    priorityProcessingDesc: 'Your projects receive priority in our queue. Fast turnaround times to meet your business deadlines.',
    dedicatedSupport: 'Dedicated Support',
    dedicatedSupportDesc: 'Direct access to your account manager for personalized service and quick issue resolution.',
    onlineDashboard: 'Online Dashboard',
    onlineDashboardDesc: 'Track all your orders, download completed translations, and manage your account from one place.',
    certifiedQuality: 'Certified Quality',
    certifiedQualityDesc: 'ATA member. Certified translations in full compliance with strict USCIS standards.',
    // How It Works
    howItWorks: 'How It Works',
    gettingStartedSimple: 'Getting started is simple',
    step1Title: 'Create Your Account',
    step1Desc: 'Sign up in minutes with your company information. No approval needed!',
    step2Title: 'Get Your Free Page',
    step2Desc: 'Receive a welcome coupon for 1 FREE certified translation page instantly via email.',
    step3Title: 'Start Translating',
    step3Desc: 'Access your dashboard immediately and submit your first order with pay-per-order pricing.',
    // CTA Section
    readyToGetStarted: 'Ready to Get Started?',
    ctaDescription: 'Create your account in minutes and start translating today. No approval process, no waiting!',
    instantActivation: 'Instant account activation',
    payPerOrder: 'Pay per order - no commitments',
    invoicePlansAvailable: 'Invoice plans available after qualification',
    digitalVerificationTitle: 'Exclusive: Digital Verification System',
    digitalVerificationDesc: 'Each document includes QR code & unique serial number for instant authenticity verification by any institution',
    firstTranslationFree: 'First Certified Translation FREE (1 page)',
    firstTranslationFreeDesc: 'We trust our quality — enjoy one free certified page of any document type',
    createFreeAccount: 'Create Your Free Account',
    signUpReceiveCoupon: 'Sign up now and receive a coupon for',
    oneFreePageBold: '1 FREE certified translation page!',
    noCreditCard: 'No credit card required',
    setupTime: 'Setup takes less than 2 minutes',
    cancelAnytime: 'Cancel anytime - no fees',
    createAccountGetFree: 'Create Account & Get Free Page',
    alreadyHaveAccount: 'Already have an account?',
    signInHere: 'Sign in here',
    // Footer
    professionalServices: 'Professional Certified Translation Services',
    contact: 'Contact',
    quickLinks: 'Quick Links',
    partnerPortal: 'Partner Portal',
    allRightsReserved: 'All rights reserved.',
    // Already Partner
    alreadyPartner: 'Already a partner?',
    accessPartnerPortal: 'Access Partner Portal',
  },
  es: {
    // Header
    home: 'Inicio',
    services: 'Servicios',
    partnerLogin: 'Acceso Socios',
    // Hero
    yearsExperience: '15+ Años de Experiencia',
    heroTitle1: 'Traducción Certificada',
    heroTitle2: 'Impulsada por Tecnología',
    heroDescription: 'Servicios de traducción de nivel empresarial impulsados por profesionales certificados y tecnología de vanguardia. Confianza de bufetes de abogados y agencias de inmigración.',
    requestPartnership: 'Solicitar Asociación',
    viewBenefits: 'Ver Beneficios',
    uscisAccepted: 'Aceptado por USCIS',
    ataMember: 'Miembro de ATA',
    turnaround24h: 'Entrega en 24h',
    // Free Translation Banner
    freeTranslationTitle: '¡Primera Traducción Certificada GRATIS!',
    freeTranslationSubtitle: '1 página - Sin compromiso',
    claimFreeTranslation: 'Obtener Traducción Gratis',
    // Stats
    yearsExperienceStats: 'Años de Experiencia',
    languages: 'Idiomas',
    uscisAcceptedStats: 'Aceptado por USCIS',
    // Benefits Section
    partnershipBenefits: 'Beneficios de la Asociación',
    benefitsDescription: 'Únase a nuestro programa B2B y disfrute de ventajas exclusivas diseñadas para empresas con necesidades continuas de traducción.',
    monthlyInvoicing: 'Facturación Mensual',
    monthlyInvoicingDesc: 'Condiciones de pago Net 30 para socios aprobados. Simplifique su contabilidad con facturación mensual consolidada.',
    volumeDiscounts: 'Descuentos por Volumen',
    volumeDiscountsDesc: 'Precios especiales según su volumen mensual de traducción. Cuanto más traduce, más ahorra.',
    priorityProcessing: 'Procesamiento Prioritario',
    priorityProcessingDesc: 'Sus proyectos reciben prioridad en nuestra cola. Tiempos de entrega rápidos para cumplir con sus plazos comerciales.',
    dedicatedSupport: 'Soporte Dedicado',
    dedicatedSupportDesc: 'Acceso directo a su gerente de cuenta para servicio personalizado y resolución rápida de problemas.',
    onlineDashboard: 'Panel en Línea',
    onlineDashboardDesc: 'Rastree todos sus pedidos, descargue traducciones completadas y administre su cuenta desde un solo lugar.',
    certifiedQuality: 'Calidad Certificada',
    certifiedQualityDesc: 'Miembro de ATA. Traducciones certificadas en total cumplimiento con los estrictos estándares de USCIS.',
    // How It Works
    howItWorks: 'Cómo Funciona',
    gettingStartedSimple: 'Comenzar es simple',
    step1Title: 'Cree Su Cuenta',
    step1Desc: '¡Regístrese en minutos con la información de su empresa. No necesita aprobación!',
    step2Title: 'Obtenga Su Página Gratis',
    step2Desc: 'Reciba un cupón de bienvenida para 1 página de traducción certificada GRATIS al instante por correo.',
    step3Title: 'Comience a Traducir',
    step3Desc: 'Acceda a su panel de inmediato y envíe su primer pedido con precios de pago por pedido.',
    // CTA Section
    readyToGetStarted: '¿Listo para Comenzar?',
    ctaDescription: 'Cree su cuenta en minutos y comience a traducir hoy. ¡Sin proceso de aprobación, sin esperas!',
    instantActivation: 'Activación instantánea de cuenta',
    payPerOrder: 'Pago por pedido - sin compromisos',
    invoicePlansAvailable: 'Planes de factura disponibles tras calificación',
    digitalVerificationTitle: 'Exclusivo: Sistema de Verificación Digital',
    digitalVerificationDesc: 'Cada documento incluye código QR y número de serie único para verificación instantánea de autenticidad por cualquier institución',
    firstTranslationFree: 'Primera Traducción Certificada GRATIS (1 página)',
    firstTranslationFreeDesc: 'Confiamos en nuestra calidad — disfrute una página certificada gratis de cualquier tipo de documento',
    createFreeAccount: 'Cree Su Cuenta Gratis',
    signUpReceiveCoupon: 'Regístrese ahora y reciba un cupón por',
    oneFreePageBold: '¡1 página de traducción certificada GRATIS!',
    noCreditCard: 'No requiere tarjeta de crédito',
    setupTime: 'Configuración en menos de 2 minutos',
    cancelAnytime: 'Cancele cuando quiera - sin cargos',
    createAccountGetFree: 'Crear Cuenta y Obtener Página Gratis',
    alreadyHaveAccount: '¿Ya tiene una cuenta?',
    signInHere: 'Inicie sesión aquí',
    // Footer
    professionalServices: 'Servicios Profesionales de Traducción Certificada',
    contact: 'Contacto',
    quickLinks: 'Enlaces Rápidos',
    partnerPortal: 'Portal de Socios',
    allRightsReserved: 'Todos los derechos reservados.',
    // Already Partner
    alreadyPartner: '¿Ya es socio?',
    accessPartnerPortal: 'Acceder al Portal de Socios',
  },
  pt: {
    // Header
    home: 'Início',
    services: 'Serviços',
    partnerLogin: 'Login Parceiro',
    // Hero
    yearsExperience: '15+ Anos de Experiência',
    heroTitle1: 'Tradução Certificada',
    heroTitle2: 'Impulsionada por Tecnologia',
    heroDescription: 'Serviços de tradução de nível empresarial impulsionados por profissionais certificados e tecnologia de ponta. Confiança de escritórios de advocacia e agências de imigração.',
    requestPartnership: 'Solicitar Parceria',
    viewBenefits: 'Ver Benefícios',
    uscisAccepted: 'Aceito pelo USCIS',
    ataMember: 'Membro da ATA',
    turnaround24h: 'Entrega em 24h',
    // Free Translation Banner
    freeTranslationTitle: 'Primeira Tradução Certificada GRÁTIS!',
    freeTranslationSubtitle: '1 página - Sem compromisso',
    claimFreeTranslation: 'Obter Tradução Grátis',
    // Stats
    yearsExperienceStats: 'Anos de Experiência',
    languages: 'Idiomas',
    uscisAcceptedStats: 'Aceito pelo USCIS',
    // Benefits Section
    partnershipBenefits: 'Benefícios da Parceria',
    benefitsDescription: 'Junte-se ao nosso programa B2B e aproveite vantagens exclusivas projetadas para empresas com necessidades contínuas de tradução.',
    monthlyInvoicing: 'Faturamento Mensal',
    monthlyInvoicingDesc: 'Condições de pagamento Net 30 para parceiros aprovados. Simplifique sua contabilidade com faturamento mensal consolidado.',
    volumeDiscounts: 'Descontos por Volume',
    volumeDiscountsDesc: 'Preços especiais com base no seu volume mensal de tradução. Quanto mais você traduz, mais economiza.',
    priorityProcessing: 'Processamento Prioritário',
    priorityProcessingDesc: 'Seus projetos recebem prioridade em nossa fila. Tempos de entrega rápidos para cumprir seus prazos comerciais.',
    dedicatedSupport: 'Suporte Dedicado',
    dedicatedSupportDesc: 'Acesso direto ao seu gerente de conta para serviço personalizado e resolução rápida de problemas.',
    onlineDashboard: 'Painel Online',
    onlineDashboardDesc: 'Acompanhe todos os seus pedidos, baixe traduções concluídas e gerencie sua conta em um só lugar.',
    certifiedQuality: 'Qualidade Certificada',
    certifiedQualityDesc: 'Membro da ATA. Traduções certificadas em total conformidade com os rigorosos padrões do USCIS.',
    // How It Works
    howItWorks: 'Como Funciona',
    gettingStartedSimple: 'Começar é simples',
    step1Title: 'Crie Sua Conta',
    step1Desc: 'Cadastre-se em minutos com as informações da sua empresa. Não precisa de aprovação!',
    step2Title: 'Receba Sua Página Grátis',
    step2Desc: 'Receba um cupom de boas-vindas para 1 página de tradução certificada GRÁTIS instantaneamente por e-mail.',
    step3Title: 'Comece a Traduzir',
    step3Desc: 'Acesse seu painel imediatamente e envie seu primeiro pedido com preços de pagamento por pedido.',
    // CTA Section
    readyToGetStarted: 'Pronto para Começar?',
    ctaDescription: 'Crie sua conta em minutos e comece a traduzir hoje. Sem processo de aprovação, sem espera!',
    instantActivation: 'Ativação instantânea da conta',
    payPerOrder: 'Pague por pedido - sem compromissos',
    invoicePlansAvailable: 'Planos de fatura disponíveis após qualificação',
    digitalVerificationTitle: 'Exclusivo: Sistema de Verificação Digital',
    digitalVerificationDesc: 'Cada documento inclui código QR e número de série único para verificação instantânea de autenticidade por qualquer instituição',
    firstTranslationFree: 'Primeira Tradução Certificada GRÁTIS (1 página)',
    firstTranslationFreeDesc: 'Confiamos em nossa qualidade — aproveite uma página certificada grátis de qualquer tipo de documento',
    createFreeAccount: 'Crie Sua Conta Grátis',
    signUpReceiveCoupon: 'Cadastre-se agora e receba um cupom por',
    oneFreePageBold: '1 página de tradução certificada GRÁTIS!',
    noCreditCard: 'Não requer cartão de crédito',
    setupTime: 'Configuração em menos de 2 minutos',
    cancelAnytime: 'Cancele quando quiser - sem taxas',
    createAccountGetFree: 'Criar Conta e Obter Página Grátis',
    alreadyHaveAccount: 'Já tem uma conta?',
    signInHere: 'Entrar aqui',
    // Footer
    professionalServices: 'Serviços Profissionais de Tradução Certificada',
    contact: 'Contato',
    quickLinks: 'Links Rápidos',
    partnerPortal: 'Portal do Parceiro',
    allRightsReserved: 'Todos os direitos reservados.',
    // Already Partner
    alreadyPartner: 'Já é parceiro?',
    accessPartnerPortal: 'Acessar Portal do Parceiro',
  }
};

// UI Languages with flags
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

// Get user's language preference
const getInitialLanguage = () => {
  const saved = localStorage.getItem('ui_language');
  if (saved && ['en', 'es', 'pt'].includes(saved)) return saved;
  return isInBrazil() ? 'pt' : 'en';
};

const B2BLandingPage = () => {
  const [lang, setLang] = useState(getInitialLanguage);
  const t = TRANSLATIONS[lang];

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('ui_language', newLang);
  };

  // Check for reset_token, verify route, ref parameter, or orders path and redirect appropriately
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset_token');
    const pathname = window.location.pathname;

    // Check for verification route in hash
    const hash = window.location.hash;
    const verifyMatch = hash.match(/^#\/verify\/(.+)$/);

    // Check for ref parameter in hash (e.g., #/partner?ref=GZNSEK)
    const hashQueryString = hash.includes('?') ? hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashQueryString);
    const refCode = hashParams.get('ref');

    // Redirect /orders/* paths to customer portal
    if (pathname.startsWith('/orders')) {
      window.location.href = '/#/customer';
      return;
    }

    // Redirect /customer path to customer portal (hash route)
    if (pathname.startsWith('/customer')) {
      window.location.href = '/#/customer';
      return;
    }

    if (resetToken) {
      // Redirect to partner portal with reset token
      window.location.href = `/#/partner?reset_token=${resetToken}`;
      return;
    }

    // Redirect to registration page when ref parameter is present (salesperson referral link)
    if (refCode) {
      window.location.href = `/#/partner/login?ref=${refCode}&register=true`;
      return;
    }

    if (verifyMatch) {
      // Already handled by hash router, but ensure it stays
      return;
    }
  }, []);

  // Scroll to section helper (avoids HashRouter conflict)
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    estimated_volume: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API}/b2b-interest`, formData);
      setSuccess(true);
      // No automatic redirect - user will receive email with registration link
    } catch (err) {
      try {
        await axios.post(`${API}/support-request`, {
          email: formData.email,
          category: 'B2B Partnership Interest',
          description: `
Company: ${formData.company_name}
Contact: ${formData.contact_name}
Email: ${formData.email}
Phone: ${formData.phone}
Estimated Monthly Volume: ${formData.estimated_volume}
Message: ${formData.message}
          `.trim()
        });
        setSuccess(true);
        // No automatic redirect - user will receive email with registration link
      } catch (err2) {
        setError('Failed to send request. Please try again or contact us directly.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <img
            src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
            alt="Legacy Translations"
            className="h-14 md:h-16"
          />
          <nav className="flex items-center space-x-4 md:space-x-6">
            {/* Language Flags */}
            <div className="flex items-center space-x-1 md:space-x-2">
              {UI_LANGUAGES.map((uiLang) => (
                <button
                  key={uiLang.code}
                  onClick={() => changeLanguage(uiLang.code)}
                  className={`hover:scale-110 transition-transform ${
                    lang === uiLang.code ? 'opacity-100 scale-110 ring-2 ring-blue-500 rounded' : 'opacity-60'
                  }`}
                  title={uiLang.name}
                >
                  <img
                    src={getFlagUrl(uiLang.countryCode)}
                    alt={uiLang.name}
                    className="w-6 h-4 md:w-7 md:h-5 object-cover rounded-sm"
                  />
                </button>
              ))}
            </div>
            <a href="https://legacytranslations.com" className="text-gray-600 hover:text-blue-900 text-sm font-medium hidden md:block">
              {t.home}
            </a>
            <a href="https://legacytranslations.com/services" className="text-gray-600 hover:text-blue-900 text-sm font-medium hidden md:block">
              {t.services}
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section - Clean Professional */}
      <section className="pt-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-900 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                {t.yearsExperience}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
                {t.heroTitle1}
                <span className="block text-blue-900 italic">{t.heroTitle2}</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t.heroDescription}
              </p>
              <div className="flex flex-wrap gap-4 mb-8">
                <button onClick={() => scrollToSection('contact-form')} className="bg-blue-900 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-800 transition-colors shadow-lg shadow-blue-900/25">
                  {t.requestPartnership}
                </button>
                <button onClick={() => scrollToSection('benefits')} className="border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-lg font-semibold hover:border-blue-900 hover:text-blue-900 transition-colors">
                  {t.viewBenefits}
                </button>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {t.uscisAccepted}
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {t.ataMember}
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {t.turnaround24h}
                </div>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-slate-100 rounded-3xl transform rotate-3"></div>
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663028493717/GnDnCrLJEsQqGTWB.png"
                alt="Global technology with international flags"
                className="relative rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Free Translation Offer Banner */}
      <section className="py-8 bg-gradient-to-r from-green-600 to-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-white text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold">{t.freeTranslationTitle}</div>
                <div className="text-green-100 text-sm md:text-base">{t.freeTranslationSubtitle}</div>
              </div>
            </div>
            <button
              onClick={() => scrollToSection('contact-form')}
              className="px-6 py-3 bg-white text-green-600 rounded-full font-semibold hover:bg-green-50 transition-colors shadow-lg"
            >
              {t.claimFreeTranslation}
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-bold text-white">15+</div>
              <div className="text-slate-400 mt-2 text-sm uppercase tracking-wide">{t.yearsExperienceStats}</div>
            </div>
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-bold text-white">50+</div>
              <div className="text-slate-400 mt-2 text-sm uppercase tracking-wide">{t.languages}</div>
            </div>
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-bold text-white">100%</div>
              <div className="text-slate-400 mt-2 text-sm uppercase tracking-wide">{t.uscisAcceptedStats}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-4">
              {t.partnershipBenefits}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t.benefitsDescription}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">{t.monthlyInvoicing}</h3>
              <p className="text-gray-600">{t.monthlyInvoicingDesc}</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">{t.volumeDiscounts}</h3>
              <p className="text-gray-600">{t.volumeDiscountsDesc}</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">{t.priorityProcessing}</h3>
              <p className="text-gray-600">{t.priorityProcessingDesc}</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">{t.dedicatedSupport}</h3>
              <p className="text-gray-600">{t.dedicatedSupportDesc}</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">{t.onlineDashboard}</h3>
              <p className="text-gray-600">{t.onlineDashboardDesc}</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">{t.certifiedQuality}</h3>
              <p className="text-gray-600">{t.certifiedQualityDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-4">
              {t.howItWorks}
            </h2>
            <p className="text-xl text-gray-600">
              {t.gettingStartedSimple}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">{t.step1Title}</h3>
              <p className="text-gray-600">{t.step1Desc}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">{t.step2Title}</h3>
              <p className="text-gray-600">{t.step2Desc}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">{t.step3Title}</h3>
              <p className="text-gray-600">{t.step3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Signup CTA Section */}
      <section id="contact-form" className="py-20 bg-gradient-to-br from-blue-900 to-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {t.readyToGetStarted}
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                {t.ctaDescription}
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-blue-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-blue-100">{t.instantActivation}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-blue-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-blue-100">{t.payPerOrder}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-blue-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-blue-100">{t.invoicePlansAvailable}</span>
                </div>
                <div className="flex items-start bg-gradient-to-r from-blue-800/50 to-purple-800/50 rounded-lg p-3 border border-blue-400/30">
                  <svg className="w-6 h-6 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <span className="text-yellow-200 font-bold block">{t.digitalVerificationTitle}</span>
                    <span className="text-blue-200 text-sm">{t.digitalVerificationDesc}</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-yellow-300 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  <div>
                    <span className="text-yellow-200 font-semibold block">{t.firstTranslationFree}</span>
                    <span className="text-blue-200 text-xs">{t.firstTranslationFreeDesc}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              {/* Direct Signup CTA */}
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t.createFreeAccount}</h3>
                <p className="text-gray-600 mb-6">
                  {t.signUpReceiveCoupon} <span className="font-bold text-teal-600">{t.oneFreePageBold}</span>
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t.noCreditCard}
                  </div>
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t.setupTime}
                  </div>
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t.cancelAnytime}
                  </div>
                </div>

                <a
                  href="/#/partner/login?register=true"
                  className="block w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-600 hover:to-cyan-600 font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  {t.createAccountGetFree}
                </a>

                <p className="text-sm text-gray-500 mt-4">
                  {t.alreadyHaveAccount} <a href="/#/partner/login" className="text-blue-600 hover:underline font-medium">{t.signInHere}</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {/* ATA Member Logo */}
            <div className="text-center">
              <div className="h-24 md:h-28 mx-auto flex items-center justify-center">
                <img
                  src="/images/ata_member_hq.png"
                  alt="ATA Member - American Translators Association - Member #275993"
                  className="h-full object-contain"
                />
              </div>
            </div>

            {/* BBB Accredited Business A+ Logo */}
            <div className="text-center">
              <div className="h-24 md:h-28 mx-auto flex items-center justify-center">
                <img
                  src="/images/bbb-accredited-logo.png"
                  alt="BBB Accredited Business A+"
                  className="h-full object-contain"
                />
              </div>
            </div>

            {/* NETA Logo */}
            <div className="text-center">
              <div className="h-24 md:h-28 mx-auto flex items-center justify-center">
                <img
                  src="/images/neta-logo.jpg"
                  alt="NETA - New England Translators Association"
                  className="h-full object-contain"
                />
              </div>
            </div>

            {/* USCIS Logo */}
            <div className="text-center">
              <div className="h-16 md:h-20 mx-auto flex items-center justify-center">
                <img
                  src="/images/uscis-logo.png"
                  alt="USCIS - U.S. Citizenship and Immigration Services"
                  className="h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <img
                src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
                alt="Legacy Translations"
                className="h-14 mb-4 brightness-0 invert"
              />
              <p className="text-blue-200">
                {t.professionalServices}
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">{t.contact}</h4>
              <p className="text-blue-200">contact@legacytranslations.com</p>
              <a href="https://wa.me/18573167770" className="flex items-center gap-2 text-blue-200 hover:text-green-400 transition-colors">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                +1 (857) 316-7770
              </a>
            </div>
            <div>
              <h4 className="font-bold mb-4">{t.quickLinks}</h4>
              <div className="space-y-2">
                <a href="https://legacytranslations.com" className="block text-blue-200 hover:text-white">{t.home}</a>
                <a href="https://legacytranslations.com/services" className="block text-blue-200 hover:text-white">{t.services}</a>
              </div>
            </div>
          </div>
          <div className="border-t border-blue-800 mt-8 pt-8 text-center text-blue-300">
            <p>&copy; {new Date().getFullYear()} Legacy Translations. {t.allRightsReserved}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default B2BLandingPage;
