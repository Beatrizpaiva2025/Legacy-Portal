import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Translation stages for order tracking
const TRANSLATION_STAGES = [
  { id: 1, name: 'Order Received', icon: '📥' },
  { id: 2, name: 'In Translation', icon: '✍️' },
  { id: 3, name: 'Quality Review', icon: '🔍' },
  { id: 4, name: 'Final Review', icon: '✅' },
  { id: 5, name: 'Ready for Delivery', icon: '📦' },
  { id: 6, name: 'Delivered', icon: '🎉' }
];

// Sample orders data (in a real app, this would come from the backend)
const sampleOrders = [
  {
    id: '257525',
    client: 'Morad Chahidi',
    service: 'Certified Translation',
    sourceLanguage: 'Arabic (Saudi Arabia)',
    targetLanguage: 'English (USA)',
    amount: 31.24,
    currentStage: 6, // Delivered
    createdAt: 'December 9th, 2025, 8:32pm',
    estimatedDelivery: 'December 11th, 2025',
    flag: '🇺🇸'
  },
  {
    id: '256135',
    client: 'Lourdine Charles',
    service: 'Certified Translation',
    sourceLanguage: 'French',
    targetLanguage: 'English (USA)',
    amount: 102.22,
    currentStage: 4, // Final Review
    createdAt: 'December 3rd, 2025, 11:40pm',
    estimatedDelivery: 'December 12th, 2025',
    flag: '🇺🇸'
  },
  {
    id: '254144',
    client: 'Zachary Hurynowicz',
    service: 'Certified Translation',
    sourceLanguage: 'Portuguese (Brazil)',
    targetLanguage: 'English (USA)',
    amount: 24.99,
    currentStage: 3, // Quality Review
    createdAt: 'November 25th, 2025, 3:34pm',
    estimatedDelivery: 'December 13th, 2025',
    flag: '🇺🇸'
  },
  {
    id: '254016',
    client: 'Brunna Garcia',
    service: 'Professional Translation',
    sourceLanguage: 'Portuguese (Brazil)',
    targetLanguage: 'English (USA)',
    amount: 65.25,
    currentStage: 2, // In Translation
    createdAt: 'November 25th, 2025, 9:02am',
    estimatedDelivery: 'December 14th, 2025',
    flag: '🇺🇸'
  },
  {
    id: '252040',
    client: 'Ricardo Josenet Georges',
    service: 'Certified Translation',
    sourceLanguage: 'French',
    targetLanguage: 'English (USA)',
    amount: 31.24,
    currentStage: 1, // Order Received
    createdAt: 'November 17th, 2025, 8:32pm',
    estimatedDelivery: 'December 15th, 2025',
    flag: '🇺🇸'
  },
  {
    id: '251351',
    client: 'paul Carlton',
    service: 'Certified Translation',
    sourceLanguage: 'Thai',
    targetLanguage: 'English (USA)',
    amount: 71.47,
    currentStage: 5, // Ready for Delivery
    createdAt: 'November 14th, 2025, 11:28am',
    estimatedDelivery: 'December 10th, 2025',
    flag: '🇺🇸'
  }
];

// Sidebar Component
const Sidebar = ({ activeTab, setActiveTab, messageCount = 2 }) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'orders', label: 'Orders', icon: '🛒' },
    { id: 'messages', label: 'Messages', icon: '✉️', badge: messageCount },
    { id: 'payouts', label: 'Payouts', icon: '💰' }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <img
          src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
          alt="Legacy Translations"
          className="w-40 h-auto mb-6"
        />
      </div>
      <nav className="mt-4">
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
            {item.badge && (
              <span className="ml-auto bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

// Progress Tracker Component
const ProgressTracker = ({ currentStage }) => {
  return (
    <div className="flex items-center space-x-1">
      {TRANSLATION_STAGES.map((stage, index) => {
        const isCompleted = stage.id <= currentStage;
        const isCurrent = stage.id === currentStage;

        return (
          <React.Fragment key={stage.id}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                  isCompleted
                    ? isCurrent
                      ? 'bg-teal-500 text-white ring-4 ring-teal-200'
                      : 'bg-teal-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
                title={stage.name}
              >
                {stage.icon}
              </div>
              <span className={`text-xs mt-1 text-center max-w-16 leading-tight ${
                isCompleted ? 'text-teal-600 font-medium' : 'text-gray-400'
              }`}>
                {stage.name.split(' ').slice(0, 2).join(' ')}
              </span>
            </div>
            {index < TRANSLATION_STAGES.length - 1 && (
              <div
                className={`flex-1 h-1 min-w-4 mt-[-16px] ${
                  stage.id < currentStage ? 'bg-teal-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Orders Page Component
const OrdersPage = () => {
  const [orders, setOrders] = useState(sampleOrders);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const getServiceColor = (service) => {
    if (service.toLowerCase().includes('certified')) {
      return 'text-teal-600';
    }
    return 'text-purple-600';
  };

  const getCurrentStageName = (stageId) => {
    const stage = TRANSLATION_STAGES.find(s => s.id === stageId);
    return stage ? stage.name : 'Unknown';
  };

  const getStageColor = (stageId) => {
    if (stageId === 6) return 'bg-green-500 text-white';
    if (stageId >= 4) return 'bg-teal-500 text-white';
    if (stageId >= 2) return 'bg-blue-500 text-white';
    return 'bg-yellow-500 text-white';
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-lg text-gray-600">Track your translation orders progress</h2>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* Order Header */}
            <div
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{order.flag}</span>
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="text-teal-600 font-semibold text-lg">#{order.id}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(order.currentStage)}`}>
                        {getCurrentStageName(order.currentStage)}
                      </span>
                    </div>
                    <div className={`font-medium ${getServiceColor(order.service)}`}>
                      {order.service}: {order.sourceLanguage} → {order.targetLanguage}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-800">${order.amount.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">
                    {order.currentStage === 6 ? 'Delivered' : `Est. Delivery: ${order.estimatedDelivery}`}
                  </div>
                </div>
              </div>

              {/* Progress Tracker */}
              <div className="mt-4">
                <ProgressTracker currentStage={order.currentStage} />
              </div>
            </div>

            {/* Expanded Details */}
            {selectedOrder === order.id && (
              <div className="border-t border-gray-100 bg-gray-50 p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Client</div>
                    <div className="font-medium text-gray-800">{order.client}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Created</div>
                    <div className="font-medium text-gray-800">{order.createdAt}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Estimated Delivery</div>
                    <div className="font-medium text-gray-800">{order.estimatedDelivery}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Current Stage</div>
                    <div className="font-medium text-teal-600">{getCurrentStageName(order.currentStage)}</div>
                  </div>
                </div>

                {order.currentStage === 6 && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-700">
                      <span className="text-xl">🎉</span>
                      <span className="font-medium">Translation delivered successfully!</span>
                    </div>
                  </div>
                )}

                {order.currentStage === 5 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-blue-700">
                      <span className="text-xl">📦</span>
                      <span className="font-medium">Your translation is ready and will be delivered soon!</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Quote Portal Component (existing functionality)
const QuotePortal = () => {
  // State management
  const [projectReference, setProjectReference] = useState('');
  const [selectedService, setSelectedService] = useState('professional');
  const [translateFrom, setTranslateFrom] = useState('italian');
  const [translateTo, setTranslateTo] = useState('english');
  const [wordCount, setWordCount] = useState(200);
  const [pageCount, setPageCount] = useState(1);
  const [urgency, setUrgency] = useState('no');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [totalWordCount, setTotalWordCount] = useState(0);
  const [quote, setQuote] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Payment handling functions
  const handleAcceptQuote = async () => {
    if (!quote || !quote.id) {
      alert('Please calculate a quote first');
      return;
    }

    if (!projectReference.trim()) {
      alert('Please enter a project reference before proceeding');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Create checkout session
      const paymentData = {
        quote_id: quote.id,
        origin_url: window.location.origin
      };

      const response = await axios.post(`${API}/create-payment-checkout`, paymentData);

      // Redirect to Stripe checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Error creating payment session. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const checkPaymentStatus = useCallback(async (sessionId) => {
    try {
      const response = await axios.get(`${API}/payment-status/${sessionId}`);

      if (response.data.payment_status === 'paid') {
        alert('Payment successful! Your translation order has been confirmed. You will receive an email confirmation shortly.');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        alert('Payment is being processed. Please check your email for confirmation.');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      alert('Error checking payment status. Please contact support if you completed the payment.');
    }
  }, []);

  // Check for payment result on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const paymentSuccess = urlParams.get('payment_success');
    const paymentCancelled = urlParams.get('payment_cancelled');

    if (sessionId && paymentSuccess) {
      checkPaymentStatus(sessionId);
    } else if (paymentCancelled) {
      alert('Payment was cancelled. You can try again when ready.');
    }
  }, [checkPaymentStatus]);

  const calculateQuote = useCallback(async () => {
    // Don't do local calculation - always use backend
    if (!projectReference || !selectedService || !translateFrom || !translateTo) {
      console.log('Missing required fields for quote calculation');
      return;
    }

    try {
      // Send to backend for accurate pricing
      const quoteData = {
        reference: projectReference,
        service_type: selectedService,
        translate_from: translateFrom,
        translate_to: translateTo,
        word_count: wordCount,
        urgency: urgency
      };

      const response = await axios.post(`${API}/calculate-quote`, quoteData);
      setQuote(response.data);

    } catch (error) {
      console.error('Error calculating quote:', error);
    }
  }, [projectReference, selectedService, translateFrom, translateTo, wordCount, urgency]);

  // Calculate quote whenever relevant values change
  useEffect(() => {
    calculateQuote();
  }, [wordCount, selectedService, urgency, translateFrom, translateTo, calculateQuote]);

  // File upload handling - Multiple files support
  const onDrop = useCallback(async (acceptedFiles) => {
    console.log('onDrop called with files:', acceptedFiles);

    if (acceptedFiles.length === 0) {
      console.log('No files accepted');
      return;
    }

    setUploadedFiles(acceptedFiles);
    setIsProcessing(true);
    setProcessingProgress(0);

    let totalWords = 0;
    let processedFiles = 0;

    try {
      // Process each file
      for (const file of acceptedFiles) {
        console.log('Processing file:', file.name, 'Size:', file.size);
        setProcessingProgress(Math.round((processedFiles / acceptedFiles.length) * 100));

        const formData = new FormData();
        formData.append('file', file);

        try {
          console.log('Sending file to backend...');
          const response = await axios.post(`${API}/upload-document`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          console.log('Backend response:', response.data);

          if (response.data && response.data.word_count) {
            totalWords += response.data.word_count;
          }

          processedFiles++;
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          processedFiles++; // Continue with other files
        }
      }

      console.log('Total words processed:', totalWords);

      // Update total word count and page count
      setWordCount(totalWords);
      setTotalWordCount(totalWords);
      setPageCount(Math.ceil(totalWords / 250));
      setProcessingProgress(100);

      // Update quote if we have enough data
      setTimeout(() => {
        if (projectReference && selectedService && translateFrom && translateTo && totalWords > 0) {
          console.log('Calculating quote...');
          calculateQuote();
        }
        setIsProcessing(false);
      }, 500);

    } catch (error) {
      console.error('Error processing files:', error);
      setIsProcessing(false);

      // Fallback to frontend OCR for single image files
      if (acceptedFiles.length === 1 && acceptedFiles[0].type.startsWith('image/')) {
        try {
          console.log('Falling back to frontend OCR...');
          setProcessingProgress(50);
          const result = await Tesseract.recognize(acceptedFiles[0], 'eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                setProcessingProgress(50 + Math.round(m.progress * 40));
              }
            }
          });

          const extractedWordCount = countWords(result.data.text);
          setWordCount(extractedWordCount);
          setTotalWordCount(extractedWordCount);
          setPageCount(Math.ceil(extractedWordCount / 250));
          setIsProcessing(false);

          // Update quote
          if (projectReference && selectedService && translateFrom && translateTo) {
            calculateQuote();
          }
        } catch (ocrError) {
          console.error('OCR Error:', ocrError);
          setIsProcessing(false);
          alert('Error processing image. Please try again.');
        }
      }
    }
  }, [projectReference, selectedService, translateFrom, translateTo, calculateQuote]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp', '.gif'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024 // 50MB per file
  });

  // Utility functions
  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const calculateUrgencyFee = () => {
    if (!quote) return 0;
    return quote.urgency_fee || 0;
  };

  const calculateTotal = () => {
    if (!quote) return 0;
    return quote.total_price || 0;
  };

  const calculateBasePrice = () => {
    if (!quote) return 0;
    return quote.base_price || 0;
  };

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-8">
          {/* Reference Section */}
          <div className="mb-8">
            <h3 className="text-base font-semibold text-gray-600 mb-4">Your Reference</h3>
            <input
              type="text"
              value={projectReference}
              onChange={(e) => setProjectReference(e.target.value)}
              placeholder="e.g. Website Translation Project"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              Enter a project name, PO number or description. Will appear on invoice.
            </p>
          </div>

          {/* Service Type Selection */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Check Prices & Place Order
            </h3>

            <div className="space-y-4 mb-6">
              {[
                {
                  id: 'standard',
                  title: 'Certified Translation',
                  subtitle: 'Certified, sworn, notarised and legalised translations, acceptable globally.',
                  price: '$24.99 / page',
                  recommended: false
                },
                {
                  id: 'professional',
                  title: 'Professional Translation',
                  subtitle: 'Standard, regular translation for individual and business use.',
                  price: '$0.08 / word',
                  recommended: true
                }
              ].map((service) => (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`relative border rounded-lg p-6 cursor-pointer transition-all ${
                    selectedService === service.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        checked={selectedService === service.id}
                        onChange={() => setSelectedService(service.id)}
                        className="mr-4 text-teal-500"
                      />
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{service.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{service.subtitle}</p>
                        {service.recommended && (
                          <span className="inline-block bg-teal-500 text-white text-xs px-2 py-1 rounded-full mt-2">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{service.price}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Translate From
                </label>
                <select
                  value={translateFrom}
                  onChange={(e) => setTranslateFrom(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="english">English (USA)</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                  <option value="portuguese">Portuguese</option>
                  <option value="italian">Italian</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Translate To
                </label>
                <select
                  value={translateTo}
                  onChange={(e) => setTranslateTo(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="english">English (USA)</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                  <option value="portuguese">Portuguese</option>
                  <option value="italian">Italian</option>
                </select>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Upload the documents you need translated
            </h3>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-300 hover:border-teal-500'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-2xl text-teal-500 mb-3">📁</div>
              <div className="text-base font-semibold text-teal-500 mb-2">
                + Upload File(s)
              </div>
              <p className="text-sm text-gray-500">
                Drag and drop or click to select
              </p>
            </div>

            {/* File Info - Multiple Files */}
            {uploadedFiles && uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">{file.name}</div>
                        <div className="text-sm text-gray-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <div className="text-sm text-green-600">
                        ✓ Uploaded
                      </div>
                    </div>
                  </div>
                ))}
                {uploadedFiles.length > 1 && (
                  <div className="text-sm text-gray-600 text-center pt-2">
                    Total: {uploadedFiles.length} files
                  </div>
                )}
              </div>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <div className="text-blue-800 font-medium">
                  {uploadedFiles && uploadedFiles.length > 1
                    ? `Processing ${uploadedFiles.length} documents with OCR...`
                    : 'Processing document with OCR...'
                  }
                </div>
                <div className="text-blue-600 text-sm">
                  Progress: {processingProgress}%
                </div>
                {uploadedFiles && uploadedFiles.length > 1 && (
                  <div className="text-blue-600 text-xs mt-1">
                    Enhanced OCR for images and scanned PDFs
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pages Count Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Number of pages to be translated
            </h3>
            <div className="flex">
              <input
                type="number"
                value={pageCount}
                onChange={(e) => {
                  const pages = parseInt(e.target.value) || 1;
                  setPageCount(pages);
                  setWordCount(pages * 250); // Convert pages to words (250 words per page)
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Number of pages"
                min="1"
              />
              <div className="px-4 py-3 bg-gray-50 border border-l-0 border-gray-300 rounded-r-md text-gray-600">
                page
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              1 page = 250 words max
            </div>
          </div>

          {/* Urgency Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Do you require your translation urgently?
            </label>
            <div className="space-y-2">
              {[
                { id: 'no', label: 'No', fee: '' },
                { id: 'priority', label: 'Priority (24 hours)', fee: '+25%' },
                { id: 'urgent', label: 'Urgent (12 hours)', fee: '+100%' }
              ].map((option) => (
                <label key={option.id} className="flex items-center cursor-pointer p-3 border rounded-md hover:bg-gray-50">
                  <input
                    type="radio"
                    name="urgency"
                    value={option.id}
                    checked={urgency === option.id}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="mr-3 text-teal-500"
                  />
                  <span className="flex-1">{option.label}</span>
                  {option.fee && (
                    <span className="text-sm text-gray-600 font-medium">{option.fee}</span>
                  )}
                </label>
              ))}
            </div>
            <a href="#" className="text-blue-600 text-sm hover:underline mt-3 inline-block">
              Click here to read more about our delivery timelines.
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
              ← Back to Service
            </button>
            <button
              onClick={calculateQuote}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Save Quote
            </button>
            <button
              onClick={handleAcceptQuote}
              disabled={isProcessingPayment || !quote}
              className={`px-6 py-3 text-white rounded-md transition-colors ${
                isProcessingPayment || !quote
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {isProcessingPayment ? 'Processing...' : 'Accept Quote & Start Order ✓'}
            </button>
          </div>
        </div>

        {/* Quote Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-blue-600 mb-4">Quote Summary</h2>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Service</span>
              <strong className="text-gray-900">
                {selectedService === 'standard' ? 'Certified Translation' :
                 selectedService === 'professional' ? 'Professional Translation' : 'Certified Translation'}
              </strong>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Certification Type</span>
              <strong className="text-gray-900">
                {selectedService === 'standard' ? 'Certified Translation' :
                 selectedService === 'professional' ? 'Professional Translation' : 'Certified Translation'}
              </strong>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Translation Type</span>
              <strong className="text-gray-900">
                {selectedService === 'standard' ? 'Certified' :
                 selectedService === 'professional' ? 'Professional' : 'Certified'}
              </strong>
            </div>

            <div className="mt-6 mb-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">
                Pricing ({selectedService === 'professional' ? '$0.08 / word' : '$24.99 / page'})
              </h4>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {selectedService === 'professional'
                    ? `${wordCount} words`
                    : `${pageCount} page${pageCount !== 1 ? 's' : ''}`
                  }
                </span>
                <strong className="text-gray-900">
                  ${calculateBasePrice().toFixed(2)}
                </strong>
              </div>
            </div>

            {urgency !== 'no' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Urgency Fee ({urgency === 'priority' ? '+25%' : '+100%'})</span>
                <strong className="text-gray-900">${calculateUrgencyFee().toFixed(2)}</strong>
              </div>
            )}

            <div className="mt-4">
              <input
                type="text"
                placeholder="Enter Discount Code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">Total</span>
              <strong className="text-2xl font-bold text-blue-600">${calculateTotal().toFixed(2)}</strong>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="text-gray-600 text-sm mb-2">Estimated Delivery</div>
            <div className="font-medium text-gray-900">
              {urgency === 'urgent' ? 'Tomorrow (12h)' :
               urgency === 'priority' ? 'Saturday, August 23 (24h)' :
               'Saturday, August 23 (2 days)'}
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600 mb-2">Legacy Translations is rated</div>
            <div className="text-2xl font-bold text-gray-900 mb-2">Excellent</div>
            <div className="flex justify-center items-center space-x-1 mb-2">
              {[1,2,3,4,5].map(star => (
                <span key={star} className="text-green-500 text-lg">★</span>
              ))}
            </div>
            <div className="text-sm text-green-600 font-medium">Trustpilot</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const TranslationPortal = () => {
  const [activeTab, setActiveTab] = useState('orders');

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <QuotePortal />;
      case 'orders':
        return <OrdersPage />;
      case 'messages':
        return (
          <div className="p-8">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
              <span className="text-4xl mb-4 block">✉️</span>
              <h2 className="text-xl font-semibold mb-2">Messages</h2>
              <p>You have 2 unread messages.</p>
            </div>
          </div>
        );
      case 'payouts':
        return (
          <div className="p-8">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
              <span className="text-4xl mb-4 block">💰</span>
              <h2 className="text-xl font-semibold mb-2">Payouts</h2>
              <p>No payouts available at the moment.</p>
            </div>
          </div>
        );
      default:
        return <OrdersPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-gray-800 capitalize">
                {activeTab === 'home' ? 'Quote Portal' : activeTab}
              </h1>
              <div className="text-gray-600">
                <span>Partner Portal ▼</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        {renderContent()}
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <TranslationPortal />
    </div>
  );
}

export default App;
