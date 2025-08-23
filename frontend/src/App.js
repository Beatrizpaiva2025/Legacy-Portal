import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TranslationPortal = () => {
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

      const response = await axios.post(`${API}/payment/checkout`, paymentData);
      
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

  const checkPaymentStatus = async (sessionId) => {
    try {
      const response = await axios.get(`${API}/payment/status/${sessionId}`);
      
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
  };

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

  // Calculate quote whenever relevant values change
  useEffect(() => {
    calculateQuote();
  }, [wordCount, selectedService, urgency, translateFrom, translateTo]);

  const calculateQuote = async () => {
    // Calculate a local quote (updated pricing logic)
    const pages = Math.ceil(wordCount / 250);
    let basePrice;
    
    if (selectedService === "standard") {
      // Standard: Minimum $18.00 (up to 250 words), then $0.02 per word
      if (wordCount <= 250) {
        basePrice = 18.00;
      } else {
        basePrice = 18.00 + ((wordCount - 250) * 0.02);
      }
    } else if (selectedService === "professional") {
      // Professional: $23.99 per page (250 words = 1 page)
      basePrice = pages * 23.99;
    } else if (selectedService === "specialist") {
      // Specialist: Minimum $29.00 for first page, then $0.13 per word for additional
      if (wordCount <= 250) {
        basePrice = 29.00;
      } else {
        basePrice = 29.00 + ((wordCount - 250) * 0.13);
      }
    } else {
      basePrice = pages * 23.99;
    }
    
    let urgencyFee = 0;
    if (urgency === "priority") {
      urgencyFee = basePrice * 0.20; // 20% of base price
    } else if (urgency === "urgent") {
      urgencyFee = basePrice * 1.00; // 100% of base price
    }
    
    const totalPrice = basePrice + urgencyFee;
    const today = new Date();
    let deliveryDate;
    let daysText;
    
    if (urgency === "urgent") {
      deliveryDate = new Date(today.getTime() + 12 * 60 * 60 * 1000);
      daysText = "12 hours";
    } else if (urgency === "priority") {
      deliveryDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);  
      daysText = "24 hours";
    } else {
      deliveryDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
      daysText = "2 days";
    }
    
    const estimatedDelivery = `${deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} (${daysText})`;
    
    setQuote({
      base_price: basePrice,
      urgency_fee: urgencyFee,
      total_price: totalPrice,
      estimated_delivery: estimatedDelivery,
      id: `local-${Date.now()}` // For payment processing
    });

    // If project reference exists, also save to backend
    if (projectReference) {
      try {
        const quoteData = {
          reference: projectReference,
          service_type: selectedService,
          translate_from: translateFrom,
          translate_to: translateTo,
          word_count: wordCount,
          urgency: urgency
        };

        const response = await axios.post(`${API}/calculate-quote`, quoteData);
        setQuote(prev => ({ ...prev, id: response.data.id })); // Update with backend ID
      } catch (error) {
        console.error('Error saving quote to backend:', error);
      }
    }
  };

  // File upload handling - Multiple files support
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploadedFiles(acceptedFiles);
    setIsProcessing(true);
    setProcessingProgress(0);

    let totalWords = 0;
    let processedFiles = 0;

    try {
      // Process each file
      for (const file of acceptedFiles) {
        setProcessingProgress(Math.round((processedFiles / acceptedFiles.length) * 100));
        
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await axios.post(`${API}/upload-document`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          if (response.data && response.data.word_count) {
            totalWords += response.data.word_count;
          }
          
          processedFiles++;
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          processedFiles++; // Continue with other files
        }
      }

      // Update total word count and page count
      setWordCount(totalWords);
      setTotalWordCount(totalWords);
      setPageCount(Math.ceil(totalWords / 250));
      setProcessingProgress(100);

      // Update quote if we have enough data
      setTimeout(() => {
        if (reference && selectedService && translateFrom && translateTo && totalWords > 0) {
          updateQuote();
        }
        setIsProcessing(false);
      }, 500);

    } catch (error) {
      console.error('Error processing files:', error);
      setIsProcessing(false);
      
      // Fallback to frontend OCR for single image files
      if (acceptedFiles.length === 1 && acceptedFiles[0].type.startsWith('image/')) {
        try {
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
        } catch (ocrError) {
          console.error('OCR Error:', ocrError);
          setIsProcessing(false);
          alert('Error processing image. Please try again.');
        }
      }
    }
  }, []);

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

  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  const getServiceName = (serviceType) => {
    const serviceNames = {
      'standard': 'Standard Translation',
      'professional': 'Professional Translation',
      'specialist': 'Specialist Translation'
    };
    return serviceNames[serviceType] || 'Professional Translation';
  };

  const getServicePrice = (serviceType) => {
    const servicePrices = {
      'standard': '$0.02 / word',
      'professional': '$23.99 / page',
      'specialist': '$0.13 / word'
    };
    return servicePrices[serviceType] || '$23.99 / page';
  };

  const getPages = () => {
    return Math.ceil(wordCount / 250);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img 
                src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
                alt="Legacy Translations"
                className="w-54 h-20"
              />
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Services ▼</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">For Business</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">About ▼</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Resources ▼</a>
            </nav>
            <div className="text-gray-600">
              <span>Partner Portal ▼</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    recommended: true
                  },
                  {
                    id: 'professional', 
                    title: 'Professional Translation',
                    subtitle: 'Standard, regular translation for individual and business use.',
                    price: '$0.08 / word',
                    recommended: false
                  },
                  {
                    id: 'specialist',
                    title: 'Specialist Translation',
                    subtitle: 'Expert translation for technical and specialized content.',
                    price: 'Min $29.00',
                    recommended: false
                  }
                ].map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`relative border rounded-lg p-4 cursor-pointer transition-all flex items-center justify-between ${
                      selectedService === service.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        checked={selectedService === service.id}
                        onChange={() => setSelectedService(service.id)}
                        className="mr-4 text-teal-500"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{service.title}</h4>
                        {service.subtitle && (
                          <p className="text-sm text-gray-600 mt-1">{service.subtitle}</p>
                        )}
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
                   selectedService === 'professional' ? 'Professional Translation' :
                   selectedService === 'specialist' ? 'Specialist Translation' : 'Certified Translation'}
                </strong>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Certification Type</span>
                <strong className="text-gray-900">
                  {selectedService === 'standard' ? 'Standard Certified Translation' :
                   selectedService === 'professional' ? 'Professional Translation' :
                   selectedService === 'specialist' ? 'Specialist Translation' : 'Standard Certified Translation'}
                </strong>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Translation Type</span>
                <strong className="text-gray-900">
                  {selectedService === 'standard' ? 'Standard' :
                   selectedService === 'professional' ? 'Professional' :
                   selectedService === 'specialist' ? 'Specialist' : 'Standard'}
                </strong>
              </div>
              
              <div className="mt-6 mb-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">
                  Pricing ({selectedService === 'standard' ? '$24.99 / page' : 
                           selectedService === 'professional' ? '$0.08 / word' : 
                           'Min $29.00'})
                </h4>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {selectedService === 'standard' ? `${pageCount} page${pageCount !== 1 ? 's' : ''}` :
                     selectedService === 'professional' ? `${wordCount} words` :
                     `${pageCount} page${pageCount !== 1 ? 's' : ''}`}
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