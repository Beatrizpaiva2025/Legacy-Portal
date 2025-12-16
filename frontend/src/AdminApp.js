import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

// ==================== CONSTANTS ====================
const STATUS_COLORS = {
  'Quote': 'bg-gray-100 text-gray-700',
  'Confirmed': 'bg-blue-100 text-blue-700',
  'In progress': 'bg-yellow-100 text-yellow-700',
  'Completed': 'bg-green-100 text-green-700',
  'Client Review': 'bg-purple-100 text-purple-700',
  'Delivered': 'bg-teal-100 text-teal-700',
  'received': 'bg-gray-100 text-gray-700',
  'in_translation': 'bg-yellow-100 text-yellow-700',
  'review': 'bg-purple-100 text-purple-700',
  'ready': 'bg-green-100 text-green-700',
  'delivered': 'bg-teal-100 text-teal-700'
};

const PAYMENT_COLORS = {
  'pending': 'bg-yellow-100 text-yellow-700',
  'paid': 'bg-green-100 text-green-700',
  'overdue': 'bg-red-100 text-red-700'
};

const FLAGS = {
  'english': '🇺🇸', 'spanish': '🇪🇸', 'french': '🇫🇷', 'german': '🇩🇪',
  'portuguese': '🇧🇷', 'italian': '🇮🇹', 'chinese': '🇨🇳', 'japanese': '🇯🇵',
  'korean': '🇰🇷', 'arabic': '🇸🇦', 'russian': '🇷🇺', 'dutch': '🇳🇱',
  'Portuguese (Brazil)': '🇧🇷', 'English (USA)': '🇺🇸', 'French': '🇫🇷',
  'Arabic (Saudi Arabia)': '🇸🇦', 'Spanish': '🇪🇸'
};

const LANGUAGES = [
  "English", "Spanish", "Portuguese", "Portuguese (Brazil)", "French", "German",
  "Italian", "Chinese", "Japanese", "Korean", "Arabic", "Russian", "Dutch"
];

const TRANSLATORS = [
  { name: "Beatriz Paiva", title: "Managing Director" },
  { name: "Ana Clara", title: "Project Manager" },
  { name: "Yasmin Costa", title: "Certified Translator" },
  { name: "Noemi Santos", title: "Senior Translator" }
];

// ==================== ADMIN LOGIN ====================
const AdminLogin = ({ onLogin }) => {
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      if (response.data) {
        onLogin(adminKey);
      }
    } catch (err) {
      setError('Invalid admin key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-xl text-white">🔐</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-xs text-gray-500">Legacy Translations</p>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Admin Key</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin key..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {loading ? 'Verifying...' : 'Access'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/" className="text-teal-600 hover:underline text-xs">← Back to Partner Portal</a>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPACT SIDEBAR ====================
const Sidebar = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'projects', label: 'Projects', icon: '📋' },
    { id: 'translators', label: 'Translators', icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="w-48 bg-slate-800 text-white min-h-screen flex flex-col text-xs">
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center text-sm">🌐</div>
          <div>
            <div className="font-bold text-sm">Legacy Admin</div>
            <div className="text-[10px] text-slate-400">Management</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-3 py-2 text-left transition-colors ${
              activeTab === item.id
                ? 'bg-teal-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span className="mr-2">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        {/* Translation Tool - External Link */}
        <a
          href="/admin/translation-tool"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center px-3 py-2 text-left transition-colors text-slate-300 hover:bg-slate-700"
        >
          <span className="mr-2">✍️</span>
          <span>Translation Tool</span>
          <span className="ml-auto text-[10px]">↗</span>
        </a>
      </nav>

      <div className="p-2 border-t border-slate-700">
        <button
          onClick={onLogout}
          className="w-full py-1.5 text-red-400 hover:bg-red-900/30 rounded text-xs"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

// ==================== SEARCH BAR ====================
const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Search by name or email..."}
      className="w-64 px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 pl-8"
    />
    <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">🔍</span>
  </div>
);

// ==================== TRANSLATION WORKSPACE ====================
const TranslationWorkspace = ({ adminKey }) => {
  // State
  const [activeSubTab, setActiveSubTab] = useState('config');
  const [files, setFiles] = useState([]);
  const [ocrResults, setOcrResults] = useState([]);
  const [translationResults, setTranslationResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  // Config state
  const [sourceLanguage, setSourceLanguage] = useState('Portuguese (Brazil)');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [documentType, setDocumentType] = useState('Birth Certificate');
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedTranslator, setSelectedTranslator] = useState(TRANSLATORS[0].name);
  const [translationDate, setTranslationDate] = useState(new Date().toLocaleDateString('en-US'));
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [pageFormat, setPageFormat] = useState('letter'); // 'letter' or 'a4'
  const [translationType, setTranslationType] = useState('certified'); // 'certified' or 'sworn'
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [includeCover, setIncludeCover] = useState(true);
  const [originalImages, setOriginalImages] = useState([]); // base64 images of originals

  // Correction state
  const [correctionCommand, setCorrectionCommand] = useState('');
  const [applyingCorrection, setApplyingCorrection] = useState(false);

  // Send to Projects state
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [sendingToProjects, setSendingToProjects] = useState(false);

  // Resources state
  const [instructions, setInstructions] = useState([]);
  const [glossaries, setGlossaries] = useState([]);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [editingGlossary, setEditingGlossary] = useState(null);
  const [instructionForm, setInstructionForm] = useState({ sourceLang: 'Portuguese (Brazil)', targetLang: 'English', title: '', content: '' });
  const [glossaryForm, setGlossaryForm] = useState({ name: '', language: 'All Languages', field: 'All Fields', terms: [] });
  const [newTerm, setNewTerm] = useState({ source: '', target: '', notes: '' });
  const [resourcesFilter, setResourcesFilter] = useState({ language: 'All Languages', field: 'All Fields' });

  // Logo states (base64)
  const [logoLeft, setLogoLeft] = useState('');
  const [logoRight, setLogoRight] = useState('');
  const [logoStamp, setLogoStamp] = useState('');

  // Refs
  const fileInputRef = useRef(null);
  const logoLeftInputRef = useRef(null);
  const logoRightInputRef = useRef(null);
  const logoStampInputRef = useRef(null);
  const originalTextRef = useRef(null);
  const translatedTextRef = useRef(null);

  // Load saved API key, logos, instructions and resources
  useEffect(() => {
    const savedKey = localStorage.getItem('claude_api_key');
    if (savedKey) setClaudeApiKey(savedKey);

    // Load saved logos
    const savedLogoLeft = localStorage.getItem('logo_left');
    const savedLogoRight = localStorage.getItem('logo_right');
    const savedLogoStamp = localStorage.getItem('logo_stamp');
    if (savedLogoLeft) setLogoLeft(savedLogoLeft);
    if (savedLogoRight) setLogoRight(savedLogoRight);
    if (savedLogoStamp) setLogoStamp(savedLogoStamp);

    // Load saved general instructions
    const savedInstructions = localStorage.getItem('general_instructions');
    if (savedInstructions) setGeneralInstructions(savedInstructions);

    // Load saved page format and translation type
    const savedPageFormat = localStorage.getItem('page_format');
    const savedTranslationType = localStorage.getItem('translation_type');
    if (savedPageFormat) setPageFormat(savedPageFormat);
    if (savedTranslationType) setTranslationType(savedTranslationType);

    fetchResources();
    fetchAvailableOrders();
  }, []);

  // Fetch resources from backend
  const fetchResources = async () => {
    try {
      const [instrRes, glossRes] = await Promise.all([
        axios.get(`${API}/admin/translation-instructions?admin_key=${adminKey}`),
        axios.get(`${API}/admin/glossaries?admin_key=${adminKey}`)
      ]);
      setInstructions(instrRes.data.instructions || []);
      setGlossaries(glossRes.data.glossaries || []);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
    }
  };

  // Fetch available orders for sending translation
  const fetchAvailableOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      // Filter orders that are in translation or review status
      const orders = response.data.orders || [];
      const available = orders.filter(o =>
        ['received', 'in_translation', 'review'].includes(o.translation_status)
      );
      setAvailableOrders(available);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  // Send translation to Projects
  const sendToProjects = async () => {
    if (!selectedOrderId) {
      alert('Please select an order to link this translation');
      return;
    }

    if (translationResults.length === 0) {
      alert('No translation to send');
      return;
    }

    setSendingToProjects(true);
    try {
      // Generate the HTML content
      const translator = TRANSLATORS.find(t => t.name === selectedTranslator);
      const pageSizeCSS = pageFormat === 'a4' ? 'A4' : 'Letter';
      const certTitle = translationType === 'sworn' ? 'Sworn Translation Certificate' : 'Certification of Translation Accuracy';

      // Build translation HTML (simplified for storage)
      const translationHTML = translationResults.map(r => r.translatedText).join('\n\n---\n\n');

      // Send to backend
      const response = await axios.post(`${API}/admin/orders/${selectedOrderId}/translation?admin_key=${adminKey}`, {
        translation_html: translationHTML,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        document_type: documentType,
        translator_name: translator?.name || selectedTranslator,
        translation_date: translationDate,
        include_cover: includeCover,
        page_format: pageFormat,
        translation_type: translationType,
        original_images: originalImages.map(img => ({ filename: img.filename, data: img.data })),
        logo_left: logoLeft,
        logo_right: logoRight,
        logo_stamp: logoStamp
      });

      if (response.data.success) {
        setProcessingStatus('✅ Translation sent to Projects! Ready for review.');
        setSelectedOrderId('');
        // Refresh orders list
        fetchAvailableOrders();
      } else {
        throw new Error(response.data.error || 'Failed to send');
      }
    } catch (error) {
      console.error('Error sending to projects:', error);
      setProcessingStatus(`❌ Failed to send: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSendingToProjects(false);
    }
  };

  // Save API key
  const saveApiKey = () => {
    localStorage.setItem('claude_api_key', claudeApiKey);
    setProcessingStatus('✅ API Key saved!');
  };

  // Save general instructions
  const saveGeneralInstructions = () => {
    localStorage.setItem('general_instructions', generalInstructions);
    setProcessingStatus('✅ General instructions saved!');
  };

  // Save page format
  const savePageFormat = (format) => {
    setPageFormat(format);
    localStorage.setItem('page_format', format);
  };

  // Save translation type
  const saveTranslationType = (type) => {
    setTranslationType(type);
    localStorage.setItem('translation_type', type);
  };

  // Handle logo upload
  const handleLogoUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      if (type === 'left') {
        setLogoLeft(base64);
        localStorage.setItem('logo_left', base64);
      } else if (type === 'right') {
        setLogoRight(base64);
        localStorage.setItem('logo_right', base64);
      } else if (type === 'stamp') {
        setLogoStamp(base64);
        localStorage.setItem('logo_stamp', base64);
      }
      setProcessingStatus(`✅ ${type === 'left' ? 'Left logo' : type === 'right' ? 'ATA logo' : 'Stamp logo'} uploaded!`);
    };
    reader.readAsDataURL(file);
  };

  // Remove logo
  const removeLogo = (type) => {
    if (type === 'left') {
      setLogoLeft('');
      localStorage.removeItem('logo_left');
    } else if (type === 'right') {
      setLogoRight('');
      localStorage.removeItem('logo_right');
    } else if (type === 'stamp') {
      setLogoStamp('');
      localStorage.removeItem('logo_stamp');
    }
    setProcessingStatus(`Logo removed`);
  };

  // Translation Instructions CRUD
  const handleSaveInstruction = async () => {
    try {
      if (editingInstruction) {
        await axios.put(`${API}/admin/translation-instructions/${editingInstruction.id}?admin_key=${adminKey}`, instructionForm);
      } else {
        await axios.post(`${API}/admin/translation-instructions?admin_key=${adminKey}`, instructionForm);
      }
      setShowInstructionModal(false);
      setEditingInstruction(null);
      setInstructionForm({ sourceLang: 'Portuguese (Brazil)', targetLang: 'English', title: '', content: '' });
      fetchResources();
    } catch (err) {
      console.error('Failed to save instruction:', err);
      alert('Failed to save instruction');
    }
  };

  const handleDeleteInstruction = async (id) => {
    if (!window.confirm('Delete this instruction?')) return;
    try {
      await axios.delete(`${API}/admin/translation-instructions/${id}?admin_key=${adminKey}`);
      fetchResources();
    } catch (err) {
      console.error('Failed to delete instruction:', err);
    }
  };

  const handleEditInstruction = (instr) => {
    setEditingInstruction(instr);
    setInstructionForm({ sourceLang: instr.sourceLang, targetLang: instr.targetLang, title: instr.title, content: instr.content });
    setShowInstructionModal(true);
  };

  // Glossaries CRUD
  const handleSaveGlossary = async () => {
    try {
      if (editingGlossary) {
        await axios.put(`${API}/admin/glossaries/${editingGlossary.id}?admin_key=${adminKey}`, glossaryForm);
      } else {
        await axios.post(`${API}/admin/glossaries?admin_key=${adminKey}`, glossaryForm);
      }
      setShowGlossaryModal(false);
      setEditingGlossary(null);
      setGlossaryForm({ name: '', language: 'All Languages', field: 'All Fields', terms: [] });
      fetchResources();
    } catch (err) {
      console.error('Failed to save glossary:', err);
      alert('Failed to save glossary');
    }
  };

  const handleDeleteGlossary = async (id) => {
    if (!window.confirm('Delete this glossary?')) return;
    try {
      await axios.delete(`${API}/admin/glossaries/${id}?admin_key=${adminKey}`);
      fetchResources();
    } catch (err) {
      console.error('Failed to delete glossary:', err);
    }
  };

  const handleEditGlossary = (gloss) => {
    setEditingGlossary(gloss);
    setGlossaryForm({ name: gloss.name, language: gloss.language, field: gloss.field, terms: gloss.terms || [] });
    setShowGlossaryModal(true);
  };

  const addTermToGlossary = () => {
    if (newTerm.source && newTerm.target) {
      setGlossaryForm({ ...glossaryForm, terms: [...glossaryForm.terms, { ...newTerm, id: Date.now() }] });
      setNewTerm({ source: '', target: '', notes: '' });
    }
  };

  const removeTermFromGlossary = (termId) => {
    setGlossaryForm({ ...glossaryForm, terms: glossaryForm.terms.filter(t => t.id !== termId) });
  };

  const filteredGlossaries = glossaries.filter(g => {
    const matchLang = resourcesFilter.language === 'All Languages' || g.language === resourcesFilter.language;
    const matchField = resourcesFilter.field === 'All Fields' || g.field === resourcesFilter.field;
    return matchLang && matchField;
  });

  // Synchronized scrolling
  const handleScroll = (source) => {
    if (source === 'original' && translatedTextRef.current && originalTextRef.current) {
      translatedTextRef.current.scrollTop = originalTextRef.current.scrollTop;
    } else if (source === 'translated' && originalTextRef.current && translatedTextRef.current) {
      originalTextRef.current.scrollTop = translatedTextRef.current.scrollTop;
    }
  };

  // File handling
  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
    setOcrResults([]);
    setTranslationResults([]);
    setProcessingStatus('');

    // Save original images as base64 for later use in certificate
    const imagePromises = selectedFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ filename: file.name, data: reader.result });
        reader.readAsDataURL(file);
      });
    });
    Promise.all(imagePromises).then(images => setOriginalImages(images));
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // OCR with backend
  const handleOCR = async () => {
    if (files.length === 0) {
      alert('Please select files first');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Performing OCR...');
    setOcrResults([]);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingStatus(`Processing ${file.name} (${i + 1}/${files.length})...`);

        const fileBase64 = await fileToBase64(file);

        const response = await axios.post(`${API}/admin/ocr?admin_key=${adminKey}`, {
          file_base64: fileBase64,
          file_type: file.type,
          filename: file.name
        });

        if (response.data.success) {
          setOcrResults(prev => [...prev, {
            filename: file.name,
            text: response.data.text
          }]);
        } else {
          throw new Error(response.data.error || 'OCR failed');
        }
      }
      setProcessingStatus('✅ OCR completed!');
    } catch (error) {
      console.error('OCR error:', error);
      setProcessingStatus(`❌ OCR failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Translation with Claude
  const handleTranslate = async () => {
    if (ocrResults.length === 0) {
      alert('Please perform OCR first');
      return;
    }

    if (!claudeApiKey) {
      alert('Please configure your Claude API Key in the Config tab');
      setActiveSubTab('config');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Translating with Claude AI...');
    setTranslationResults([]);

    try {
      for (let i = 0; i < ocrResults.length; i++) {
        const ocrResult = ocrResults[i];
        setProcessingStatus(`Translating ${ocrResult.filename} (${i + 1}/${ocrResults.length})...`);

        const response = await axios.post(`${API}/admin/translate?admin_key=${adminKey}`, {
          text: ocrResult.text,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          document_type: documentType,
          claude_api_key: claudeApiKey,
          action: 'translate',
          general_instructions: generalInstructions,
          preserve_layout: true
        });

        if (response.data.success) {
          setTranslationResults(prev => [...prev, {
            filename: ocrResult.filename,
            originalText: ocrResult.text,
            translatedText: response.data.translation
          }]);
        } else {
          throw new Error(response.data.error || 'Translation failed');
        }
      }
      setProcessingStatus('✅ Translation completed!');
      setActiveSubTab('results');
    } catch (error) {
      console.error('Translation error:', error);
      setProcessingStatus(`❌ Translation failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply correction
  const handleApplyCorrection = async () => {
    if (!correctionCommand.trim() || translationResults.length === 0) return;

    setApplyingCorrection(true);

    try {
      const currentResult = translationResults[selectedResultIndex];

      const response = await axios.post(`${API}/admin/translate?admin_key=${adminKey}`, {
        text: currentResult.translatedText,
        corrections: correctionCommand,
        claude_api_key: claudeApiKey,
        action: 'correct'
      });

      if (response.data.success) {
        const updatedResults = [...translationResults];
        updatedResults[selectedResultIndex] = {
          ...currentResult,
          translatedText: response.data.translation
        };
        setTranslationResults(updatedResults);
        setCorrectionCommand('');
        setProcessingStatus('✅ Correction applied!');
      } else {
        throw new Error(response.data.error || 'Correction failed');
      }
    } catch (error) {
      console.error('Correction error:', error);
      alert('Error applying correction: ' + error.message);
    } finally {
      setApplyingCorrection(false);
    }
  };

  // Update translation text manually
  const handleTranslationEdit = (newText) => {
    const updatedResults = [...translationResults];
    updatedResults[selectedResultIndex] = {
      ...updatedResults[selectedResultIndex],
      translatedText: newText
    };
    setTranslationResults(updatedResults);
  };

  // Download certificate
  const handleDownload = (format = 'html') => {
    const translator = TRANSLATORS.find(t => t.name === selectedTranslator);
    const pageSizeCSS = pageFormat === 'a4' ? 'A4' : 'Letter';
    const certTitle = translationType === 'sworn' ? 'Sworn Translation Certificate' : 'Certification of Translation Accuracy';

    // Cover Letter HTML
    const coverLetterHTML = `
    <!-- COVER LETTER PAGE -->
    <div class="cover-page">
        <!-- HEADER WITH LOGOS -->
        <div class="header">
            <div class="logo-left">
                ${logoLeft
                  ? `<img src="${logoLeft}" alt="Logo" style="max-width: 120px; max-height: 50px; object-fit: contain;" />`
                  : `<div class="logo-placeholder" contenteditable="true" title="Click to add logo">
                    <span style="text-align:center;">LEGACY<br/>TRANSLATIONS</span>
                </div>`}
            </div>
            <div class="header-center">
                <div class="company-name">Legacy Translations</div>
                <div class="company-address">
                    867 Boylston Street · 5th Floor · #2073 · Boston, MA · 02116<br>
                    (857) 316-7770 · contact@legacytranslations.com
                </div>
            </div>
            <div class="logo-right">
                ${logoRight
                  ? `<img src="${logoRight}" alt="ATA Logo" style="max-width: 80px; max-height: 50px; object-fit: contain;" />`
                  : `<div class="logo-placeholder-right" contenteditable="true" title="Click to add ATA logo">
                    <span>ata<br/>Member #275993</span>
                </div>`}
            </div>
        </div>

        <div class="order-number">Order # <strong>${orderNumber || 'P0000'}</strong></div>
        <h1 class="main-title">${certTitle}</h1>
        <div class="subtitle">
            Translation of a <strong>${documentType}</strong> from <strong>${sourceLanguage}</strong> to<br>
            <strong>${targetLanguage}</strong>
        </div>

        <p class="body-text">
            We, Legacy Translations, a professional translation services company and ATA
            Member (#275993), having no relation to the client, hereby certify that the
            annexed <strong>${targetLanguage}</strong> translation of the <strong>${sourceLanguage}</strong> document,
            executed by us, is to the best of our knowledge and belief, a true and accurate
            translation of the original document, likewise annexed hereunto.
        </p>
        <p class="body-text">
            This is to certify the correctness of the translation only. We do not guarantee
            that the original is a genuine document, or that the statements contained in the
            original document are true. Further, Legacy Translations assumes no liability for
            the way in which the translation is used by the customer or any third party,
            including end-users of the translation.
        </p>
        <p class="body-text">
            A copy of the translation, and original files presented, are attached to this
            certification.
        </p>

        <div class="footer-section">
            <div class="signature-block">
                <div class="signature-name">${translator?.name || 'Beatriz Paiva'}</div>
                <div class="signature-title">${translator?.title || 'Managing Director'}</div>
                <div class="signature-date">Dated: ${translationDate}</div>
            </div>
            <div class="stamp-container">
                ${logoStamp
                  ? `<img src="${logoStamp}" alt="Stamp" style="width: 140px; height: 140px; object-fit: contain;" />`
                  : `<div class="stamp">
                    <div class="stamp-text-top">CERTIFIED TRANSLATOR</div>
                    <div class="stamp-center">
                        <div class="stamp-company">LEGACY TRANSLATIONS</div>
                        <div class="stamp-ata">ATA # 275993</div>
                    </div>
                </div>`}
            </div>
        </div>
    </div>`;

    // Translation pages HTML (starts directly with translated text)
    const translationPagesHTML = translationResults.map((result) => `
    <div class="translation-page">
        <div class="translation-content">${result.translatedText}</div>
    </div>
    `).join('');

    // Original documents pages HTML (last page with header and image below)
    const originalPagesHTML = originalImages.length > 0 ? `
    <div class="original-documents-page">
        <div class="page-header">Original Document</div>
        <div class="original-images-wrapper">
            ${originalImages.map(img => `
            <div class="original-image-container">
                <img src="${img.data}" alt="${img.filename}" class="original-image" />
            </div>
            `).join('')}
        </div>
    </div>` : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${certTitle}</title>
    <style>
        @page { size: ${pageSizeCSS}; margin: 0.6in 0.75in; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Times New Roman', Georgia, serif;
            font-size: 13px;
            line-height: 1.5;
            color: #333;
            padding: 40px 50px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
        }
        .logo-left { width: 120px; height: 50px; display: flex; align-items: center; }
        .logo-left img { max-width: 100%; max-height: 100%; }
        .logo-placeholder {
            width: 120px; height: 50px; border: 1px dashed #ccc;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; color: #999; background: #fafafa;
        }
        .header-center { text-align: center; flex: 1; padding: 0 20px; }
        .company-name { font-size: 16px; font-weight: bold; color: #2563eb; margin-bottom: 2px; }
        .company-address { font-size: 10px; line-height: 1.4; color: #333; }
        .logo-right { width: 80px; height: 50px; display: flex; align-items: center; justify-content: flex-end; }
        .logo-right img { max-width: 100%; max-height: 100%; }
        .logo-placeholder-right {
            width: 80px; height: 50px; border: 1px dashed #ccc;
            display: flex; align-items: center; justify-content: center;
            font-size: 9px; color: #1a365d; background: #fafafa; text-align: center; font-style: italic;
        }
        .order-number { text-align: right; margin-bottom: 30px; font-size: 13px; }
        .main-title { text-align: center; font-size: 28px; font-weight: normal; margin-bottom: 25px; color: #1a365d; }
        .subtitle { text-align: center; font-size: 14px; margin-bottom: 35px; line-height: 1.6; }
        .body-text { text-align: justify; margin-bottom: 18px; line-height: 1.7; font-size: 13px; }
        .body-text:last-of-type { margin-bottom: 50px; }
        .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
        .signature-block { line-height: 1.4; }
        .signature-name { font-weight: bold; font-size: 14px; }
        .signature-title { font-weight: bold; font-size: 13px; }
        .signature-date { font-size: 13px; }
        .stamp-container { width: 140px; height: 140px; position: relative; }
        .stamp {
            width: 140px; height: 140px; border: 3px solid #2563eb; border-radius: 50%;
            position: relative; display: flex; align-items: center; justify-content: center; background: white;
        }
        .stamp::before {
            content: ''; position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px;
            border: 1px solid #2563eb; border-radius: 50%;
        }
        .stamp-text-top {
            position: absolute; top: 15px; left: 50%; transform: translateX(-50%);
            font-size: 9px; font-weight: bold; color: #2563eb; letter-spacing: 2px;
        }
        .stamp-center { text-align: center; padding: 0 15px; }
        .stamp-company { font-size: 11px; font-weight: bold; color: #2563eb; margin-bottom: 2px; }
        .stamp-ata { font-size: 9px; color: #2563eb; }
        .translation-page { page-break-before: always; padding-top: 20px; }
        .page-header { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid #2563eb; color: #1a365d; text-transform: uppercase; letter-spacing: 2px; }
        .translation-content { white-space: pre-wrap; line-height: 1.8; font-size: 12px; }
        .original-documents-page { page-break-before: always; padding-top: 20px; }
        .original-images-wrapper { margin-top: 20px; }
        .original-image-container { text-align: center; }
        .original-image { max-width: 100%; max-height: 650px; border: 1px solid #ddd; object-fit: contain; }
        @media print { body { padding: 0; } .logo-placeholder { border: 1px dashed #ccc; } }
    </style>
</head>
<body>
    ${includeCover ? coverLetterHTML : ''}
    ${translationPagesHTML}
    ${originalPagesHTML}
</body>
</html>`;

    if (format === 'pdf') {
      // Open in new window for PDF printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      // Download as HTML
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${translationType === 'sworn' ? 'sworn' : 'certified'}_translation_${orderNumber || 'document'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="p-6">
      {/* 7 Tabs Navigation */}
      <div className="flex justify-center space-x-2 mb-6">
        {[
          { id: 'config', label: '1. Config' },
          { id: 'upload', label: '2. Upload' },
          { id: 'ocr', label: '3. Ocr' },
          { id: 'review', label: '4. Review' },
          { id: 'translate', label: '5. Translate' },
          { id: 'approval', label: '6. Approval' },
          { id: 'export', label: '7. Export' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-5 py-2 text-sm font-medium rounded-md border-2 transition-all ${
              activeSubTab === tab.id
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== 1. CONFIG TAB ==================== */}
      {activeSubTab === 'config' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Configurações</h2>

            {/* Claude API Key */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">🔑 Claude API Key</label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={claudeApiKey}
                  onChange={(e) => setClaudeApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={saveApiKey}
                  className="px-4 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600"
                >
                  Salvar
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Necessário para tradução. Obtenha em console.anthropic.com</p>
            </div>

            {/* Languages */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Idioma de Origem</label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Idioma de Destino</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
            </div>

            {/* Document Type & Order */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                <input
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                  placeholder="Ex: Certidão de Nascimento"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número do Pedido</label>
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                  placeholder="Ex: P6312"
                />
              </div>
            </div>

            {/* Translator & Date */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tradutor</label>
                <select
                  value={selectedTranslator}
                  onChange={(e) => setSelectedTranslator(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                >
                  {TRANSLATORS.map(t => <option key={t.name} value={t.name}>{t.name} - {t.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  value={translationDate}
                  onChange={(e) => setTranslationDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
            </div>

            {/* Translation Type & Page Format */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <h3 className="text-sm font-bold text-green-700 mb-3">📄 Formato da Página</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Tradução</label>
                  <select
                    value={translationType}
                    onChange={(e) => saveTranslationType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  >
                    <option value="certified">Certified Translation</option>
                    <option value="sworn">Sworn Translation (Juramentada)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho da Página</label>
                  <select
                    value={pageFormat}
                    onChange={(e) => savePageFormat(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  >
                    <option value="letter">Letter (8.5" x 11")</option>
                    <option value="a4">A4 (210mm x 297mm)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* General Instructions */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-4">
              <label className="block text-sm font-bold text-purple-700 mb-2">📝 Instruções Gerais</label>
              <textarea
                value={generalInstructions}
                onChange={(e) => setGeneralInstructions(e.target.value)}
                placeholder="Instruções gerais para o tradutor..."
                className="w-full h-24 px-3 py-2 text-sm border rounded-lg resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={saveGeneralInstructions}
                  className="px-4 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600"
                >
                  Salvar Instruções
                </button>
              </div>
            </div>

            {/* Logos */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-bold text-blue-700 mb-3">🖼️ Logos do Certificado</h3>
              <div className="grid grid-cols-3 gap-4">
                {/* Left Logo */}
                <div className="text-center">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Logo Esquerda</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white min-h-[80px] flex items-center justify-center">
                    {logoLeft ? <img src={logoLeft} alt="Logo" className="max-h-16 object-contain" /> : <span className="text-xs text-gray-400">Sem logo</span>}
                  </div>
                  <input ref={logoLeftInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'left')} className="hidden" />
                  <div className="flex justify-center space-x-1 mt-2">
                    <button onClick={() => logoLeftInputRef.current?.click()} className="px-2 py-1 bg-blue-500 text-white text-xs rounded">Upload</button>
                    {logoLeft && <button onClick={() => removeLogo('left')} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Remover</button>}
                  </div>
                </div>
                {/* Right Logo */}
                <div className="text-center">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Logo ATA</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white min-h-[80px] flex items-center justify-center">
                    {logoRight ? <img src={logoRight} alt="Logo ATA" className="max-h-16 object-contain" /> : <span className="text-xs text-gray-400">Sem logo</span>}
                  </div>
                  <input ref={logoRightInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'right')} className="hidden" />
                  <div className="flex justify-center space-x-1 mt-2">
                    <button onClick={() => logoRightInputRef.current?.click()} className="px-2 py-1 bg-blue-500 text-white text-xs rounded">Upload</button>
                    {logoRight && <button onClick={() => removeLogo('right')} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Remover</button>}
                  </div>
                </div>
                {/* Stamp Logo */}
                <div className="text-center">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Carimbo</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white min-h-[80px] flex items-center justify-center">
                    {logoStamp ? <img src={logoStamp} alt="Carimbo" className="max-h-16 object-contain" /> : <span className="text-xs text-gray-400">Sem logo</span>}
                  </div>
                  <input ref={logoStampInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'stamp')} className="hidden" />
                  <div className="flex justify-center space-x-1 mt-2">
                    <button onClick={() => logoStampInputRef.current?.click()} className="px-2 py-1 bg-blue-500 text-white text-xs rounded">Upload</button>
                    {logoStamp && <button onClick={() => removeLogo('stamp')} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Remover</button>}
                  </div>
                </div>
              </div>
            </div>

            {/* Next button */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setActiveSubTab('upload')}
                className="px-8 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600"
              >
                Próximo → Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. UPLOAD TAB ==================== */}
      {activeSubTab === 'upload' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload de Documentos</h2>
            <p className="text-sm text-gray-500 mb-6">Selecione os documentos para OCR e tradução</p>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
              <div className="text-5xl mb-4">📤</div>
              <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Escolher Arquivos
              </button>
              <p className="text-sm text-gray-500 mt-3">
                {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : 'Clique para selecionar (imagens ou PDF)'}
              </p>
            </div>

            {files.length > 0 && (
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-700">Arquivos Selecionados:</label>
                <div className="mt-2 space-y-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center text-sm p-3 bg-gray-50 rounded-lg">
                      <span className="mr-2">📄</span>
                      <span>{file.name}</span>
                      <span className="ml-auto text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex justify-between">
              <button onClick={() => setActiveSubTab('config')} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                ← Voltar
              </button>
              <button
                onClick={() => setActiveSubTab('ocr')}
                disabled={files.length === 0}
                className="px-8 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
              >
                Próximo → OCR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. OCR TAB ==================== */}
      {activeSubTab === 'ocr' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Extração de Texto (OCR)</h2>
            <p className="text-sm text-gray-500 mb-6">Extrair texto dos documentos enviados</p>

            {files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum arquivo selecionado. Volte para a aba Upload.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm"><strong>Arquivos:</strong> {files.map(f => f.name).join(', ')}</p>
                </div>

                <div className="text-center">
                  <button
                    onClick={async () => {
                      await handleOCR();
                      if (ocrResults.length > 0) setActiveSubTab('review');
                    }}
                    disabled={isProcessing}
                    className="px-8 py-3 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 disabled:bg-gray-300"
                  >
                    {isProcessing ? '⏳ Processando...' : '🔍 Executar OCR'}
                  </button>
                </div>

                {processingStatus && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${
                    processingStatus.includes('❌') ? 'bg-red-100 text-red-700' :
                    processingStatus.includes('✅') ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {processingStatus}
                  </div>
                )}
              </>
            )}

            {/* Navigation */}
            <div className="mt-6 flex justify-between">
              <button onClick={() => setActiveSubTab('upload')} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                ← Voltar
              </button>
              <button
                onClick={() => setActiveSubTab('review')}
                disabled={ocrResults.length === 0}
                className="px-8 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
              >
                Próximo → Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. REVIEW TAB ==================== */}
      {activeSubTab === 'review' && (
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Revisão do OCR</h2>
            <p className="text-sm text-gray-500 mb-6">Revise e edite o texto extraído antes de traduzir</p>

            {ocrResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum resultado de OCR. Execute o OCR primeiro.</p>
              </div>
            ) : (
              <>
                {ocrResults.map((result, idx) => (
                  <div key={idx} className="mb-6">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">📄 {result.filename}</label>
                    <textarea
                      value={result.text}
                      onChange={(e) => {
                        const updated = [...ocrResults];
                        updated[idx].text = e.target.value;
                        setOcrResults(updated);
                      }}
                      className="w-full h-64 p-3 text-sm font-mono border rounded-lg focus:ring-2 focus:ring-blue-500"
                      style={{fontWeight: 'bold'}}
                    />
                  </div>
                ))}
              </>
            )}

            {/* Navigation */}
            <div className="mt-6 flex justify-between">
              <button onClick={() => setActiveSubTab('ocr')} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                ← Voltar
              </button>
              <button
                onClick={() => setActiveSubTab('translate')}
                disabled={ocrResults.length === 0}
                className="px-8 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
              >
                Próximo → Translate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 5. TRANSLATE TAB ==================== */}
      {activeSubTab === 'translate' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Tradução</h2>
            <p className="text-sm text-gray-500 mb-6">Traduzir o texto com Claude AI</p>

            {ocrResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum texto para traduzir. Execute o OCR primeiro.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm"><strong>De:</strong> {sourceLanguage} → <strong>Para:</strong> {targetLanguage}</p>
                  <p className="text-sm"><strong>Documento:</strong> {documentType}</p>
                </div>

                <div className="text-center">
                  <button
                    onClick={async () => {
                      await handleTranslate();
                      if (translationResults.length > 0) setActiveSubTab('approval');
                    }}
                    disabled={isProcessing || !claudeApiKey}
                    className="px-8 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                  >
                    {isProcessing ? '⏳ Traduzindo...' : '🌐 Traduzir com Claude'}
                  </button>
                  {!claudeApiKey && (
                    <p className="text-xs text-red-500 mt-2">Configure a API Key do Claude na aba Config</p>
                  )}
                </div>

                {processingStatus && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${
                    processingStatus.includes('❌') ? 'bg-red-100 text-red-700' :
                    processingStatus.includes('✅') ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {processingStatus}
                  </div>
                )}
              </>
            )}

            {/* Navigation */}
            <div className="mt-6 flex justify-between">
              <button onClick={() => setActiveSubTab('review')} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                ← Voltar
              </button>
              <button
                onClick={() => setActiveSubTab('approval')}
                disabled={translationResults.length === 0}
                className="px-8 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
              >
                Próximo → Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 6. APPROVAL TAB ==================== */}
      {activeSubTab === 'approval' && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Aprovação da Tradução</h2>

            {translationResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma tradução para aprovar. Execute a tradução primeiro.</p>
              </div>
            ) : (
              <>
                {/* Document selector */}
                {translationResults.length > 1 && (
                  <div className="mb-4">
                    <label className="text-sm text-gray-600 mr-2">Documento:</label>
                    <select
                      value={selectedResultIndex}
                      onChange={(e) => setSelectedResultIndex(Number(e.target.value))}
                      className="px-3 py-1.5 text-sm border rounded-lg"
                    >
                      {translationResults.map((r, idx) => <option key={idx} value={idx}>{r.filename}</option>)}
                    </select>
                  </div>
                )}

                {/* Side by side view */}
                <div className="border rounded-lg overflow-hidden mb-6">
                  <div className="grid grid-cols-2 bg-gray-100 border-b">
                    <div className="px-4 py-2 border-r font-medium text-sm">📄 Original ({sourceLanguage})</div>
                    <div className="px-4 py-2 font-medium text-sm">🌐 Tradução ({targetLanguage})</div>
                  </div>
                  <div className="grid grid-cols-2 h-80">
                    <div className="border-r overflow-auto" ref={originalTextRef} onScroll={() => handleScroll('original')}>
                      <pre className="p-4 text-sm font-mono whitespace-pre-wrap bg-gray-50 min-h-full" style={{fontWeight: 'bold'}}>
                        {translationResults[selectedResultIndex]?.originalText || ''}
                      </pre>
                    </div>
                    <div className="overflow-auto" ref={translatedTextRef} onScroll={() => handleScroll('translated')}>
                      <textarea
                        value={translationResults[selectedResultIndex]?.translatedText || ''}
                        onChange={(e) => handleTranslationEdit(e.target.value)}
                        className="w-full min-h-full p-4 text-sm font-mono border-0 resize-none focus:outline-none"
                        style={{minHeight: '320px'}}
                      />
                    </div>
                  </div>
                </div>

                {/* Correction Command */}
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">📝 Comando de Correção</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={correctionCommand}
                      onChange={(e) => setCorrectionCommand(e.target.value)}
                      placeholder='Ex: "Mude certificado para diploma"'
                      className="flex-1 px-3 py-2 text-sm border rounded-lg"
                    />
                    <button
                      onClick={handleApplyCorrection}
                      disabled={!correctionCommand.trim() || applyingCorrection}
                      className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 disabled:bg-gray-300"
                    >
                      {applyingCorrection ? '⏳' : '✨ Aplicar'}
                    </button>
                  </div>
                </div>

                {/* Include Cover option */}
                <div className="mb-4">
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={includeCover}
                      onChange={(e) => setIncludeCover(e.target.checked)}
                      className="mr-2"
                    />
                    Incluir Carta de Apresentação (Cover Letter)
                  </label>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="mt-6 flex justify-between">
              <button onClick={() => setActiveSubTab('translate')} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                ← Voltar
              </button>
              <button
                onClick={() => setActiveSubTab('export')}
                disabled={translationResults.length === 0}
                className="px-8 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
              >
                Próximo → Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 7. EXPORT TAB ==================== */}
      {activeSubTab === 'export' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            {translationResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma tradução para exportar. Complete as etapas anteriores.</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Concluído!</h2>

                <button
                  onClick={() => handleDownload('html')}
                  className="w-full py-4 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 mb-4 flex items-center justify-center"
                >
                  <span className="mr-2">📥</span> Download HTML
                </button>

                <p className="text-sm text-gray-500 mb-6">
                  Abra o HTML e use Ctrl+P para salvar como PDF
                </p>

                <button
                  onClick={() => {
                    setFiles([]);
                    setOcrResults([]);
                    setTranslationResults([]);
                    setProcessingStatus('');
                    setActiveSubTab('config');
                  }}
                  className="w-full py-3 border-2 border-blue-500 text-blue-500 font-medium rounded-lg hover:bg-blue-50 flex items-center justify-center"
                >
                  <span className="mr-2">🔄</span> Novo
                </button>

                {/* Send to Projects */}
                <div className="mt-8 p-4 bg-gray-50 border rounded-lg text-left">
                  <h3 className="text-sm font-bold text-gray-700 mb-2">📤 Enviar para Projetos</h3>
                  <div className="flex space-x-2">
                    <select
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border rounded-lg"
                    >
                      <option value="">-- Selecione o Pedido --</option>
                      {availableOrders.map(order => (
                        <option key={order.id} value={order.id}>
                          {order.order_number} - {order.client_name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={sendToProjects}
                      disabled={!selectedOrderId || sendingToProjects}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                    >
                      {sendingToProjects ? '⏳' : '📤 Enviar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6">
              <button onClick={() => setActiveSubTab('approval')} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                ← Voltar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


// ==================== PROJECTS PAGE ====================
const ProjectsPage = ({ adminKey }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      setOrders(response.data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}?admin_key=${adminKey}`, { translation_status: newStatus });
      fetchOrders();
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const markPaid = async (orderId) => {
    try {
      await axios.post(`${API}/admin/orders/${orderId}/mark-paid?admin_key=${adminKey}`);
      fetchOrders();
    } catch (err) {
      console.error('Failed to mark paid:', err);
    }
  };

  const deliverOrder = async (orderId) => {
    try {
      await axios.post(`${API}/admin/orders/${orderId}/deliver?admin_key=${adminKey}`);
      fetchOrders();
    } catch (err) {
      console.error('Failed to deliver:', err);
    }
  };

  const filtered = orders.filter(o => {
    const matchSearch =
      o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.client_email?.toLowerCase().includes(search.toLowerCase()) ||
      o.order_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.translation_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalReceive = filtered.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalPaid = filtered.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalPending = filtered.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + (o.total_price || 0), 0);

  const getStatusLabel = (status) => {
    const labels = { 'received': 'Quote', 'in_translation': 'In progress', 'review': 'Client Review', 'ready': 'Completed', 'delivered': 'Delivered' };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="p-4 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded shadow p-3">
          <div className="text-[10px] text-gray-500 uppercase">Total Orders</div>
          <div className="text-xl font-bold text-gray-800">{orders.length}</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded shadow p-3 text-white">
          <div className="text-[10px] uppercase opacity-80">Total Revenue</div>
          <div className="text-xl font-bold">${totalReceive.toFixed(2)}</div>
        </div>
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded shadow p-3 text-white">
          <div className="text-[10px] uppercase opacity-80">Paid</div>
          <div className="text-xl font-bold">${totalPaid.toFixed(2)}</div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded shadow p-3 text-white">
          <div className="text-[10px] uppercase opacity-80">Pending</div>
          <div className="text-xl font-bold">${totalPending.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-bold text-blue-600">PROJECTS</h1>
          <div className="flex space-x-1">
            {['all', 'received', 'in_translation', 'review', 'ready', 'delivered'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-[10px] rounded ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {s === 'all' ? 'All' : getStatusLabel(s)}
              </button>
            ))}
          </div>
        </div>
        <SearchBar value={search} onChange={setSearch} />
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-blue-600">Code</th>
              <th className="px-2 py-2 text-left font-medium">Client</th>
              <th className="px-2 py-2 text-left font-medium">Start</th>
              <th className="px-2 py-2 text-left font-medium">Deadline</th>
              <th className="px-2 py-2 text-left font-medium">Status</th>
              <th className="px-2 py-2 text-left font-medium">Tags</th>
              <th className="px-2 py-2 text-right font-medium">Total</th>
              <th className="px-2 py-2 text-center font-medium">Payment</th>
              <th className="px-2 py-2 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((order) => {
              const created = new Date(order.created_at);
              const deadline = new Date(created); deadline.setDate(deadline.getDate() + 5);
              const daysUntil = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 font-medium text-blue-600">{order.order_number}</td>
                  <td className="px-2 py-2">{order.client_name}<span className="text-gray-400 text-[10px] block">{order.client_email}</span></td>
                  <td className="px-2 py-2 text-gray-500">{created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="px-2 py-2">{deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {daysUntil > 0 && order.translation_status !== 'delivered' && <span className={`text-[10px] block ${daysUntil <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>in {daysUntil}d</span>}
                  </td>
                  <td className="px-2 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[order.translation_status] || 'bg-gray-100'}`}>{getStatusLabel(order.translation_status)}</span></td>
                  <td className="px-2 py-2"><span className="px-1 py-0.5 bg-gray-100 border rounded text-[10px]">{order.translation_type === 'certified' ? 'CERT' : 'PROF'}</span><span className="ml-1">{FLAGS[order.translate_to] || '🌐'}</span></td>
                  <td className="px-2 py-2 text-right font-medium">${order.total_price?.toFixed(2)}</td>
                  <td className="px-2 py-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] ${PAYMENT_COLORS[order.payment_status]}`}>{order.payment_status}</span></td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {order.translation_status === 'received' && <button onClick={() => updateStatus(order.id, 'in_translation')} className="px-1.5 py-0.5 bg-yellow-500 text-white rounded text-[10px]">▶</button>}
                      {order.translation_status === 'in_translation' && <button onClick={() => updateStatus(order.id, 'review')} className="px-1.5 py-0.5 bg-purple-500 text-white rounded text-[10px]">👁</button>}
                      {order.translation_status === 'review' && <button onClick={() => updateStatus(order.id, 'ready')} className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[10px]">✓</button>}
                      {order.translation_status === 'ready' && <button onClick={() => deliverOrder(order.id)} className="px-1.5 py-0.5 bg-teal-500 text-white rounded text-[10px]">📤</button>}
                      {order.payment_status === 'pending' && <button onClick={() => markPaid(order.id)} className="px-1.5 py-0.5 bg-green-600 text-white rounded text-[10px]">$</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No projects found</div>}
      </div>
    </div>
  );
};

// ==================== TRANSLATORS PAGE ====================
const TranslatorsPage = ({ adminKey }) => {
  const [translators, setTranslators] = useState([
    { id: '1', name: 'Yasmin Costa', email: 'yasmin@legacy.com', languages: 'PT-BR, EN, ES', specialization: 'Legal, Certificates', status: 'available', orders: 89 },
    { id: '2', name: 'Noemi Santos', email: 'noemi@legacy.com', languages: 'PT-BR, EN', specialization: 'Certificates', status: 'busy', orders: 67 },
    { id: '3', name: 'Ana Clara', email: 'anaclara@legacy.com', languages: 'PT-BR, EN, FR', specialization: 'Legal, Technical', status: 'available', orders: 45 },
    { id: '4', name: 'Maria Silva', email: 'maria@legacy.com', languages: 'PT-BR, EN', specialization: 'Medical', status: 'available', orders: 32 },
  ]);
  const [search, setSearch] = useState('');

  const filtered = translators.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold text-blue-600">TRANSLATORS</h1>
        <SearchBar value={search} onChange={setSearch} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded shadow p-3 flex items-center">
          <div className="w-2 h-10 bg-blue-500 rounded mr-3"></div>
          <div><div className="text-xl font-bold">{translators.length}</div><div className="text-[10px] text-gray-500 uppercase">Total</div></div>
        </div>
        <div className="bg-white rounded shadow p-3 flex items-center">
          <div className="w-2 h-10 bg-green-500 rounded mr-3"></div>
          <div><div className="text-xl font-bold">{translators.filter(t => t.status === 'available').length}</div><div className="text-[10px] text-gray-500 uppercase">Available</div></div>
        </div>
        <div className="bg-white rounded shadow p-3 flex items-center">
          <div className="w-2 h-10 bg-yellow-500 rounded mr-3"></div>
          <div><div className="text-xl font-bold">{translators.filter(t => t.status === 'busy').length}</div><div className="text-[10px] text-gray-500 uppercase">Busy</div></div>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Languages</th>
              <th className="px-3 py-2 text-left font-medium">Specialization</th>
              <th className="px-3 py-2 text-center font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2 text-gray-500">{t.email}</td>
                <td className="px-3 py-2">{t.languages}</td>
                <td className="px-3 py-2">{t.specialization}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                </td>
                <td className="px-3 py-2 text-right">{t.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==================== SETTINGS PAGE ====================
const SettingsPage = ({ adminKey }) => {
  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-blue-600 mb-4">SETTINGS</h1>
      <div className="grid grid-cols-2 gap-4">
        {/* API Configuration */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">API Configuration</h2>
          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-gray-500 mb-1">Backend URL</label>
              <input type="text" className="w-full px-2 py-1.5 border rounded bg-gray-50" value={BACKEND_URL} readOnly />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Admin Key</label>
              <input type="password" className="w-full px-2 py-1.5 border rounded bg-gray-50" value={adminKey} readOnly />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Pricing</h2>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Certified Translation</span>
              <span className="font-bold text-teal-600">$24.99/page</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Professional Translation</span>
              <span className="font-bold text-teal-600">$19.50/page</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Priority Fee</span>
              <span className="font-bold text-teal-600">+25%</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Urgent Fee</span>
              <span className="font-bold text-red-500">+100%</span>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Integrations</h2>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center">
                <span className="mr-2">💳</span>
                <span>Stripe</span>
              </div>
              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[10px] font-medium">Connected</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center">
                <span className="mr-2">📧</span>
                <span>SendGrid</span>
              </div>
              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[10px] font-medium">Connected</span>
            </div>
          </div>
        </div>

        {/* External Tools */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">External Tools</h2>
          <div className="space-y-2 text-xs">
            <a
              href="/admin/translation-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="mr-2">✍️</span>
                <span>Translation Program</span>
              </div>
              <span className="text-orange-500 text-[10px] font-medium">Open ↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== TRANSLATION TOOL PAGE (Standalone) ====================
const TranslationToolPage = ({ adminKey, onLogout }) => {
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header - Legacy Translations style */}
      <div className="bg-slate-700 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🌐</span>
          <span className="font-semibold text-lg">Legacy Translations</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm">Beatriz Paiva</span>
          <button
            onClick={onLogout}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            Logout
          </button>
        </div>
      </div>
      {/* Translation Workspace */}
      <TranslationWorkspace adminKey={adminKey} />
    </div>
  );
};

// ==================== MAIN APP ====================
function AdminApp() {
  const [adminKey, setAdminKey] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');

  // Get current path
  const isTranslationTool = window.location.pathname.includes('/admin/translation-tool');

  useEffect(() => {
    const savedKey = localStorage.getItem('admin_key');
    if (savedKey) setAdminKey(savedKey);
  }, []);

  const handleLogin = (key) => {
    setAdminKey(key);
    localStorage.setItem('admin_key', key);
  };

  const handleLogout = () => {
    setAdminKey(null);
    localStorage.removeItem('admin_key');
    window.location.href = '/admin';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'projects': return <ProjectsPage adminKey={adminKey} />;
      case 'translators': return <TranslatorsPage adminKey={adminKey} />;
      case 'settings': return <SettingsPage adminKey={adminKey} />;
      default: return <ProjectsPage adminKey={adminKey} />;
    }
  };

  if (!adminKey) return <AdminLogin onLogin={handleLogin} />;

  // If translation-tool route, render standalone page
  if (isTranslationTool) {
    return <TranslationToolPage adminKey={adminKey} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default AdminApp;
