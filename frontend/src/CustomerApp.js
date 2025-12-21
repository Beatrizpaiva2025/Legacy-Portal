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

// ==================== LOGIN PAGE (Customer) ====================
const CustomerLoginPage = ({ onLogin }) => {
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
          <h1 className="text-2xl font-bold text-gray-800">Customer Portal</h1>
          <p className="text-gray-600">{isLogin ? 'Sign in to your account' : 'Create a new account'}</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
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
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-teal-600 hover:underline"
          >
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-sm text-gray-500">
            Are you a partner?{' '}
            <a href="/partner" className="text-teal-600 hover:underline">
              Go to Partner Portal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

// ==================== CUSTOMER SIDEBAR ====================
const CustomerSidebar = ({ activeTab, setActiveTab, customer, onLogout }) => {
  const menuItems = [
    { id: 'new-order', label: 'New Order', icon: '➕' },
    { id: 'orders', label: 'My Orders', icon: '📋' },
    { id: 'messages', label: 'Messages', icon: '✉️' }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4">
        <img
          src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
          alt="Legacy Translations"
          className="w-40 h-auto mb-4"
        />
        <div className="text-sm text-gray-600 mb-2">Welcome,</div>
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
          Logout
        </button>
      </div>
    </div>
  );
};

// ==================== CUSTOMER NEW ORDER PAGE (Single page with inline email capture) ====================
const CustomerNewOrderPage = ({ customer, token, onOrderCreated }) => {
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

  // Exit intent detection
  useEffect(() => {
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && quote && !success && guestEmail) {
        setShowExitPopup(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [quote, success, guestEmail]);

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
        urgency: formData.urgency
      };

      // Create quote
      const quoteResponse = await axios.post(`${API}/calculate-quote`, quoteData);
      const quoteId = quoteResponse.data.id;

      // Step 2: Create Stripe checkout session
      const checkoutResponse = await axios.post(`${API}/create-payment-checkout`, {
        quote_id: quoteId,
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
      {/* Exit Intent Popup */}
      {showExitPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md text-center">
            <div className="text-5xl mb-4">🎁</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Wait! Don't leave yet!</h2>
            <p className="text-gray-600 mb-4">
              We'll save your quote and send you a reminder with a special discount!
            </p>
            <div className="bg-teal-50 p-4 rounded-lg mb-4">
              <p className="text-teal-800 font-semibold">Your quote has been saved</p>
              <p className="text-sm text-teal-600">Check your email ({guestEmail}) for details</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitPopup(false)}
                className="flex-1 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium"
              >
                Continue with Order
              </button>
              <button
                onClick={() => setShowExitPopup(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Request Translation</h1>

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
              <p className="text-sm text-gray-600 mb-3">Enter your details to receive your quote</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div ref={nameRef}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Your Name *</label>
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
                  <label className="block text-xs font-medium text-gray-500 mb-1">Your Email *</label>
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
              <p className="text-xs text-gray-400 mt-2">We'll send your quote and order updates here</p>
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
                  <div className="font-semibold text-teal-600">$24.99/page</div>
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
                  <div className="font-semibold text-teal-600">$19.99/page</div>
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
                  <div className="font-semibold text-teal-600">$55.00/page</div>
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
                  <div className="font-semibold text-teal-600">$24.99/page</div>
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
                    <p className="text-xs text-amber-600 mt-1">Sworn translations are only available for Portuguese (Brasil)</p>
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
                  fieldErrors.files ? 'border-red-500 bg-red-50' : isDragActive ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-500'
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-3xl mb-2">📁</div>
                <div className="font-medium text-teal-600">+ Upload File(s)</div>
                <div className="text-sm text-gray-500">PDF, DOCX, Images, TXT</div>
              </div>
              {fieldErrors.files && <p className="text-red-500 text-sm mt-2">{fieldErrors.files}</p>}

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

              {/* Contact support link - shown after upload section */}
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-400">
                  Having trouble uploading?{' '}
                  <a
                    href="mailto:info@legacytranslations.com?subject=Document Upload Issue"
                    className="text-teal-600 hover:underline"
                  >
                    Contact us via email
                  </a>
                </p>
              </div>
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
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Do you require the physical copy of the translation?</h2>
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
                    <span className="font-medium">No</span>
                    <p className="text-xs text-gray-500 mt-1">Digital copy only</p>
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
                    <span className="font-medium">Yes</span>
                    <p className="text-xs text-gray-500 mt-1">+ ${USPS_PRIORITY_MAIL} Priority Mail</p>
                  </label>
                </div>

                {formData.service_type === 'rmv' && (
                  <div className="p-3 bg-amber-50 rounded-md border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> RMV requires a physical copy. Shipping is automatically included.
                    </p>
                  </div>
                )}

                {(needsPhysicalCopy || formData.service_type === 'rmv') && (
                  <div ref={shippingRef} className={`p-4 rounded-lg space-y-3 ${fieldErrors.shipping ? 'bg-red-50 border border-red-300' : 'bg-gray-50'}`}>
                    <p className="text-sm font-medium text-gray-700">Shipping Address (USA)</p>
                    {fieldErrors.shipping && <p className="text-red-500 text-sm">{fieldErrors.shipping}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Street Address *</label>
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
                        <label className="block text-xs text-gray-500 mb-1">City *</label>
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
                        <label className="block text-xs text-gray-500 mb-1">State *</label>
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
                        <label className="block text-xs text-gray-500 mb-1">ZIP Code *</label>
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
                        <label className="block text-xs text-gray-500 mb-1">Country</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100"
                          value="USA"
                          disabled
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      USPS Priority Mail - Estimated delivery: 1-3 business days
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (optional)</label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any special instructions for our translators..."
              />
            </div>

            {/* Questions about pricing? - Contact */}
            <div className="bg-gray-50 p-5 rounded-lg text-center">
              <p className="text-gray-600 mb-3">Questions about your pricing?</p>
              <a
                href="mailto:contact@legacytranslations.com?subject=Quote Request"
                className="inline-block px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-white hover:border-gray-400 transition-colors font-medium"
              >
                Request a quote instead
              </a>
            </div>

            {/* Continue to Payment Button */}
            <button
              type="submit"
              disabled={submitting || wordCount === 0 || !guestName || !guestEmail || ((needsPhysicalCopy || formData.service_type === 'rmv') && (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode))}
              className="w-full py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-400 font-semibold"
            >
              {submitting ? 'Processing...' : 'Continue to Payment'}
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
                {formData.service_type === 'standard' && 'Standard'}
                {formData.service_type === 'certified' && 'Certified'}
                {formData.service_type === 'rmv' && 'RMV Certified'}
                {formData.service_type === 'sworn' && 'Sworn'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pages</span>
              <span className="font-medium">{quote?.pages || 0}</span>
            </div>
            <p className="text-xs text-gray-400 text-right">1 page = 250 words max</p>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Price</span>
                <span className="font-medium">${(quote?.base_price || 0).toFixed(2)}</span>
              </div>
              {quote?.urgency_fee > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Urgency Fee</span>
                  <span>${quote.urgency_fee.toFixed(2)}</span>
                </div>
              )}
              {quote?.certification_fee > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>Certification</span>
                  <span>${quote.certification_fee.toFixed(2)}</span>
                </div>
              )}
              {quote?.shipping_fee > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>USPS Priority Mail</span>
                  <span>${quote.shipping_fee.toFixed(2)}</span>
                </div>
              )}
              {quote?.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${quote.discount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold text-teal-600">${(quote?.total_price || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Discount Code */}
            <div className="border-t pt-3 mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                />
                <button
                  type="button"
                  onClick={applyDiscountCode}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                >
                  Apply
                </button>
              </div>
              {appliedDiscount && (
                <p className="text-green-600 text-xs mt-1">
                  {appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}% off` : `$${appliedDiscount.value} off`} applied!
                </p>
              )}
            </div>

            <div className="text-xs text-gray-500 mt-4">
              * Payment required to start translation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== CUSTOMER ORDERS PAGE ====================
const CustomerOrdersPage = ({ token }) => {
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
                      <div className="text-sm text-gray-500 mt-1">
                        {order.translate_from} → {order.translate_to} | {order.word_count} words
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

// ==================== CUSTOMER MESSAGES PAGE ====================
const CustomerMessagesPage = ({ token }) => {
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

// ==================== MAIN CUSTOMER APP ====================
function CustomerApp() {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('new-order');

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
          />
        );
      case 'orders':
        return <CustomerOrdersPage token={token} />;
      case 'messages':
        return <CustomerMessagesPage token={token} />;
      default:
        return <CustomerNewOrderPage customer={customer} token={token} />;
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
          </div>
        </header>
        <CustomerNewOrderPage customer={null} token={null} onOrderCreated={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <CustomerSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        customer={customer}
        onLogout={handleLogout}
      />
      <div className="flex-1">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800 capitalize">
              {activeTab === 'new-order' ? 'New Order' : activeTab.replace('-', ' ')}
            </h1>
            <div className="text-sm text-gray-600">
              {customer?.full_name} | {customer?.email}
            </div>
          </div>
        </header>
        {renderContent()}
      </div>
    </div>
  );
}

export default CustomerApp;
