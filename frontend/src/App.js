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
  const [urgency, setUrgency] = useState('no');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [quote, setQuote] = useState(null);

  // Calculate quote whenever relevant values change
  useEffect(() => {
    calculateQuote();
  }, [wordCount, selectedService, urgency, translateFrom, translateTo]);

  const calculateQuote = async () => {
    if (!projectReference) {
      // Calculate a local quote even if no reference is provided
      const pages = Math.ceil(wordCount / 250);
      let basePrice;
      
      if (selectedService === "standard") {
        basePrice = wordCount * 0.02;
      } else if (selectedService === "professional") {
        basePrice = pages * 23.99;
      } else if (selectedService === "specialist") {
        basePrice = wordCount * 0.13;
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
        estimated_delivery: estimatedDelivery
      });
      return;
    }

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
      setQuote(response.data);
    } catch (error) {
      console.error('Error calculating quote:', error);
    }
  };

  // File upload handling
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Upload to backend for processing
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProcessingProgress(progress);
        }
      });

      setWordCount(response.data.word_count);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing file:', error);
      setIsProcessing(false);
      
      // Fallback to frontend OCR for images
      if (file.type.startsWith('image/')) {
        try {
          const result = await Tesseract.recognize(file, 'eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                setProcessingProgress(Math.round(m.progress * 100));
              }
            }
          });
          
          const extractedWordCount = countWords(result.data.text);
          setWordCount(extractedWordCount);
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
      'image/*': ['.png', '.jpg', '.jpeg', '.bmp', '.tiff'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: false
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
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                What type of translation do you require?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {[
                  {
                    id: 'standard',
                    title: 'Standard',
                    features: ['🤖 Machine Translation', '📝 Professional Review'],
                    price: '$0.02 / word'
                  },
                  {
                    id: 'professional',
                    title: 'Professional',
                    features: ['👨‍💼 Professional Translator', '📖 Proofreader'],
                    price: '$23.99 / page'
                  },
                  {
                    id: 'specialist',
                    title: 'Specialist',
                    features: ['🎯 Specialist Translator', '🏆 Domain Expertise'],
                    price: '$0.13 / word'
                  }
                ].map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                      selectedService === service.id
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : 'border-gray-200 bg-white hover:border-teal-300'
                    }`}
                  >
                    <h4 className="text-lg font-semibold mb-3">{service.title}</h4>
                    <ul className="text-sm mb-4 space-y-1">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="opacity-90">{feature}</li>
                      ))}
                    </ul>
                    <div className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      selectedService === service.id
                        ? 'bg-white bg-opacity-20 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {service.price}
                    </div>
                  </div>
                ))}
              </div>
              <a href="#" className="text-blue-600 text-sm hover:underline">
                Click here to read more about our different translation options.
              </a>
            </div>

            {/* Language Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                What language are you translating from, and into?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Translate From
                  </label>
                  <select
                    value={translateFrom}
                    onChange={(e) => setTranslateFrom(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="italian">Italian</option>
                    <option value="english">English</option>
                    <option value="spanish">Spanish</option>
                    <option value="french">French</option>
                    <option value="german">German</option>
                    <option value="portuguese">Portuguese</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Translate To
                  </label>
                  <select
                    value={translateTo}
                    onChange={(e) => setTranslateTo(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Upload the documents you need translated
              </h3>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-300 hover:border-teal-500'
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-2xl text-teal-500 mb-4">📁</div>
                <div className="text-lg font-semibold text-teal-500 mb-2">
                  + Upload File(s)
                </div>
                <p className="text-sm text-gray-500">
                  Drag and drop files here, or click to select files
                </p>
              </div>

              {/* File Info */}
              {uploadedFile && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <div className="text-sm font-medium">File: {uploadedFile.name}</div>
                  <div className="text-sm text-gray-600">
                    Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              )}

              {/* Processing Status */}
              {isProcessing && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <div className="text-blue-800 font-medium">Processing document with OCR...</div>
                  <div className="text-blue-600 text-sm">
                    Progress: {processingProgress}%
                  </div>
                </div>
              )}
            </div>

            {/* Word Count Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Number of words to be translated
              </h3>
              <div className="flex">
                <input
                  type="number"
                  value={wordCount}
                  onChange={(e) => setWordCount(parseInt(e.target.value) || 0)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="px-4 py-3 bg-gray-50 border border-l-0 border-gray-300 rounded-r-md text-gray-600">
                  words
                </div>
              </div>
              <a href="#" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                Click here to read more about file types supported.
              </a>
            </div>

            {/* Urgency Section */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Do you require your translation urgently?
              </h4>
              <div className="space-y-3">
                {[
                  { id: 'no', label: 'No', fee: '' },
                  { id: 'priority', label: 'Priority (24h)', fee: '+20%' },
                  { id: 'urgent', label: 'Urgent (12h)', fee: '+100%' }
                ].map((option) => (
                  <label key={option.id} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="urgency"
                      value={option.id}
                      checked={urgency === option.id}
                      onChange={(e) => setUrgency(e.target.value)}
                      className="mr-3 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-gray-900">
                      {option.label} 
                      {option.fee && <span className="text-gray-600 ml-1">{option.fee}</span>}
                    </span>
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
              <button className="px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors">
                Accept Quote & Start Order ✓
              </button>
            </div>
          </div>

          {/* Right Panel - Quote Summary */}
          <div className="bg-white rounded-lg shadow-sm p-8 h-fit sticky top-24">
            <h2 className="text-2xl font-semibold text-blue-800 mb-6">Quote Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Service</span>
                <span className="font-medium">Translation Service</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Translation Type</span>
                <span className="font-medium">{getServiceName(selectedService)}</span>
              </div>
            </div>

            {quote && (
              <>
                <div className="bg-gray-50 rounded-lg p-5 mb-6">
                  <div className="font-semibold text-gray-900 mb-3">
                    Pricing ({getServicePrice(selectedService)})
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{getPages()} page{getPages() !== 1 ? 's' : ''}</span>
                    <span>{formatPrice(quote.base_price)}</span>
                  </div>
                  {quote.urgency_fee > 0 && (
                    <div className="flex justify-between text-sm mt-2">
                      <span>Urgency Fee</span>
                      <span>{formatPrice(quote.urgency_fee)}</span>
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Enter Discount Code"
                    className="w-full mt-4 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div className="flex justify-between mb-6">
                  <span className="text-gray-600">Estimated Delivery</span>
                  <span className="font-medium">{quote.estimated_delivery}</span>
                </div>

                <div className="bg-blue-800 text-white rounded-lg p-5 text-center mb-8">
                  <div className="text-3xl font-bold">
                    Total: {formatPrice(quote.total_price)}
                  </div>
                </div>
              </>
            )}

            {/* Trustpilot Section */}
            <div className="text-center">
              <div className="text-lg font-semibold mb-1">Legacy Translations is rated</div>
              <div className="text-2xl font-bold mb-2">Excellent</div>
              <div className="text-green-500 text-xl mb-2">★★★★★</div>
              <div className="text-green-600 font-bold">Trustpilot</div>
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