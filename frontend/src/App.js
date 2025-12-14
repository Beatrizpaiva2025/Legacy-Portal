import React, { useState, useEffect, useCallback } from 'react';
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

// ==================== LOGIN PAGE ====================
const LoginPage = ({ onLogin, onRegister }) => {
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
            alt="Legacy Translations"
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">Partner Portal</h1>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
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
      </div>
    </div>
  );
};

// ==================== SIDEBAR ====================
const Sidebar = ({ activeTab, setActiveTab, partner, onLogout }) => {
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
          Logout
        </button>
      </div>
    </div>
  );
};

// ==================== NEW ORDER PAGE ====================
const NewOrderPage = ({ partner, token, onOrderCreated }) => {
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calculate quote when relevant fields change
  useEffect(() => {
    if (wordCount > 0) {
      calculateQuote();
    }
  }, [wordCount, formData.service_type, formData.urgency]);

  const calculateQuote = () => {
    let basePrice = 0;
    const pages = Math.max(1, Math.ceil(wordCount / 250));

    if (formData.service_type === 'standard') {
      basePrice = pages * 24.99;  // Certified Translation
    } else {
      basePrice = pages * 19.50;  // Professional Translation
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

        const response = await axios.post(`${API}/upload-document`, formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000 // 2 minute timeout for OCR processing
        });

        if (response.data?.word_count) {
          newWords += response.data.word_count;
          newFiles.push({ file, wordCount: response.data.word_count });
        }
      }

      // Add new files to existing files (accumulate)
      setUploadedFiles(prev => [...prev, ...acceptedFiles]);
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
        document_filename: uploadedFiles[0]?.name || null
      };

      const response = await axios.post(`${API}/orders/create?token=${token}`, orderData);

      setSuccess(`Order ${response.data.order.order_number} created successfully!`);

      // Reset form
      setFormData({
        client_name: '',
        client_email: '',
        service_type: 'professional',
        translate_from: 'english',
        translate_to: 'spanish',
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Order</h1>

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
                    <div className="font-medium">Certified Translation</div>
                    <div className="text-sm text-gray-500">Official documents, legal, immigration</div>
                  </div>
                  <div className="font-semibold text-teal-600">$24.99/page</div>
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
                    <div className="font-medium">Professional Translation</div>
                    <div className="text-sm text-gray-500">Business, marketing, general content</div>
                  </div>
                  <div className="font-semibold text-teal-600">$19.50/page</div>
                </label>
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
                  {uploadedFiles.map((file, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = uploadedFiles.filter((_, index) => index !== i);
                          setUploadedFiles(newFiles);
                          if (newFiles.length === 0) {
                            setWordCount(0);
                            setQuote(null);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove file"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <div className="text-lg font-semibold text-teal-600">
                    Word Count: {wordCount} words ({Math.ceil(wordCount / 250)} pages)
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
                {formData.service_type === 'standard' ? 'Certified' : 'Professional'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Words</span>
              <span className="font-medium">{wordCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pages</span>
              <span className="font-medium">{quote?.pages || 0}</span>
            </div>

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
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold text-teal-600">${(quote?.total_price || 0).toFixed(2)}</span>
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
const MessagesPage = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Messages</h1>
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">No messages</h2>
        <p className="text-gray-600">Messages from Legacy Translations will appear here</p>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
function App() {
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

  const renderContent = () => {
    switch (activeTab) {
      case 'new-order':
        return <NewOrderPage partner={partner} token={token} onOrderCreated={() => setActiveTab('orders')} />;
      case 'orders':
        return <OrdersPage token={token} />;
      case 'messages':
        return <MessagesPage />;
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
            <h1 className="text-xl font-semibold text-gray-800 capitalize">
              {activeTab === 'new-order' ? 'New Order' : activeTab}
            </h1>
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
