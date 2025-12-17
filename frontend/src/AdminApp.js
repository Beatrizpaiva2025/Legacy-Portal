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
  const [activeSubTab, setActiveSubTab] = useState('resources');
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
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [includeOriginal, setIncludeOriginal] = useState(true);
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
  const [glossaryForm, setGlossaryForm] = useState({
    name: '',
    sourceLang: 'Portuguese (Brazil)',
    targetLang: 'English',
    bidirectional: true,  // Create entries for both directions
    field: 'All Fields',
    terms: []
  });
  const [newTerm, setNewTerm] = useState({ source: '', target: '', notes: '' });
  const [resourcesFilter, setResourcesFilter] = useState({ language: 'All Languages', field: 'All Fields' });

  // Logo states (base64)
  const [logoLeft, setLogoLeft] = useState('');
  const [logoRight, setLogoRight] = useState('');
  const [logoStamp, setLogoStamp] = useState('');
  const [signatureImage, setSignatureImage] = useState('');

  // Refs
  const fileInputRef = useRef(null);
  const logoLeftInputRef = useRef(null);
  const logoRightInputRef = useRef(null);
  const logoStampInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const originalTextRef = useRef(null);
  const translatedTextRef = useRef(null);
  const uploadOriginalRef = useRef(null);
  const uploadOcrRef = useRef(null);
  const editableRef = useRef(null);

  // OCR Editor state
  const [ocrFontFamily, setOcrFontFamily] = useState('monospace');
  const [ocrFontSize, setOcrFontSize] = useState('12px');
  const [useClaudeOcr, setUseClaudeOcr] = useState(true); // Default to Claude for better formatting
  const [ocrSpecialCommands, setOcrSpecialCommands] = useState('Maintain the EXACT original layout and formatting. Preserve all line breaks, spacing, and document structure. Extract tables with proper alignment.');

  // Approval checkboxes state
  const [approvalChecks, setApprovalChecks] = useState({
    projectNumber: false,
    languageChanged: false,
    proofread: false
  });

  // Review view mode: 'preview' shows rendered HTML, 'edit' shows raw code
  const [reviewViewMode, setReviewViewMode] = useState('preview');

  // Bulk upload state for glossary
  const [bulkTermsText, setBulkTermsText] = useState('');

  // Load saved API key, logos, instructions and resources
  useEffect(() => {
    const savedKey = localStorage.getItem('claude_api_key');
    if (savedKey) setClaudeApiKey(savedKey);

    // Load saved logos
    const savedLogoLeft = localStorage.getItem('logo_left');
    const savedLogoRight = localStorage.getItem('logo_right');
    const savedLogoStamp = localStorage.getItem('logo_stamp');
    const savedSignature = localStorage.getItem('signature_image');
    if (savedLogoLeft) setLogoLeft(savedLogoLeft);
    if (savedLogoRight) setLogoRight(savedLogoRight);
    if (savedLogoStamp) setLogoStamp(savedLogoStamp);
    if (savedSignature) setSignatureImage(savedSignature);

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

      if (response.data.status === 'success' || response.data.success) {
        setProcessingStatus('✅ Translation sent to Projects! Ready for review.');
        setSelectedOrderId('');
        // Refresh orders list
        fetchAvailableOrders();
      } else {
        throw new Error(response.data.error || response.data.detail || 'Failed to send');
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
      } else if (type === 'signature') {
        setSignatureImage(base64);
        localStorage.setItem('signature_image', base64);
      }
      const typeLabels = { left: 'Left logo', right: 'ATA logo', stamp: 'Stamp logo', signature: 'Signature' };
      setProcessingStatus(`✅ ${typeLabels[type] || type} uploaded!`);
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
    } else if (type === 'signature') {
      setSignatureImage('');
      localStorage.removeItem('signature_image');
    }
    setProcessingStatus(`${type === 'signature' ? 'Signature' : 'Logo'} removed`);
  };

  // Translation Instructions CRUD
  const handleSaveInstruction = async () => {
    // Validate required fields
    if (!instructionForm.title || !instructionForm.title.trim()) {
      alert('Please enter a title for the instruction');
      return;
    }
    if (!instructionForm.content || !instructionForm.content.trim()) {
      alert('Please enter instruction content');
      return;
    }

    setProcessingStatus('Saving instruction...');

    try {
      const dataToSend = {
        sourceLang: instructionForm.sourceLang,
        targetLang: instructionForm.targetLang,
        title: instructionForm.title.trim(),
        content: instructionForm.content.trim()
      };

      const config = { timeout: 30000 }; // 30 second timeout

      if (editingInstruction) {
        await axios.put(`${API}/admin/translation-instructions/${editingInstruction.id}?admin_key=${adminKey}`, dataToSend, config);
      } else {
        await axios.post(`${API}/admin/translation-instructions?admin_key=${adminKey}`, dataToSend, config);
      }
      setShowInstructionModal(false);
      setEditingInstruction(null);
      setInstructionForm({ sourceLang: 'Portuguese (Brazil)', targetLang: 'English', title: '', content: '' });
      fetchResources();
      setProcessingStatus('✅ Instruction saved!');
    } catch (err) {
      console.error('Failed to save instruction:', err);

      // Save locally as backup
      const localInstructions = JSON.parse(localStorage.getItem('backup_instructions') || '[]');
      localInstructions.push({
        ...instructionForm,
        id: `local_${Date.now()}`,
        savedAt: new Date().toISOString()
      });
      localStorage.setItem('backup_instructions', JSON.stringify(localInstructions));

      const errorMsg = err.code === 'ECONNABORTED'
        ? 'Request timeout - server may be slow. Saved locally as backup.'
        : err.message === 'Network Error'
          ? 'Network Error - Server may be restarting. Saved locally as backup.'
          : (err.response?.data?.detail || err.message);

      alert('Failed to save instruction: ' + errorMsg);
      setProcessingStatus('❌ Save failed - backed up locally');
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
    if (!glossaryForm.name || !glossaryForm.name.trim()) {
      alert('Please enter a name for the glossary');
      return;
    }

    setProcessingStatus('Saving glossary...');

    try {
      const config = { timeout: 30000 }; // 30 second timeout

      if (editingGlossary) {
        await axios.put(`${API}/admin/glossaries/${editingGlossary.id}?admin_key=${adminKey}`, glossaryForm, config);
      } else {
        await axios.post(`${API}/admin/glossaries?admin_key=${adminKey}`, glossaryForm, config);
      }
      setShowGlossaryModal(false);
      setEditingGlossary(null);
      setGlossaryForm({
        name: '',
        sourceLang: 'Portuguese (Brazil)',
        targetLang: 'English',
        bidirectional: true,
        field: 'All Fields',
        terms: []
      });
      fetchResources();
      setProcessingStatus('✅ Glossary saved!');
    } catch (err) {
      console.error('Failed to save glossary:', err);

      // Save locally as backup
      const localGlossaries = JSON.parse(localStorage.getItem('backup_glossaries') || '[]');
      localGlossaries.push({
        ...glossaryForm,
        id: `local_${Date.now()}`,
        savedAt: new Date().toISOString()
      });
      localStorage.setItem('backup_glossaries', JSON.stringify(localGlossaries));

      const errorMsg = err.code === 'ECONNABORTED'
        ? 'Request timeout - server may be slow. Saved locally as backup.'
        : err.message === 'Network Error'
          ? 'Network Error - Server may be restarting. Saved locally as backup.'
          : (err.response?.data?.detail || err.message);

      alert('Failed to save glossary: ' + errorMsg);
      setProcessingStatus('❌ Save failed - backed up locally');
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
    setGlossaryForm({
      name: gloss.name,
      sourceLang: gloss.sourceLang || 'Portuguese (Brazil)',
      targetLang: gloss.targetLang || 'English',
      bidirectional: gloss.bidirectional !== undefined ? gloss.bidirectional : true,
      field: gloss.field || 'All Fields',
      terms: gloss.terms || []
    });
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

  // Synchronized scrolling for Review tab
  const handleScroll = (source) => {
    if (source === 'original' && translatedTextRef.current && originalTextRef.current) {
      translatedTextRef.current.scrollTop = originalTextRef.current.scrollTop;
    } else if (source === 'translated' && originalTextRef.current && translatedTextRef.current) {
      originalTextRef.current.scrollTop = translatedTextRef.current.scrollTop;
    }
  };

  // Synchronized scrolling for Upload tab
  const handleUploadScroll = (source) => {
    if (source === 'original' && uploadOcrRef.current && uploadOriginalRef.current) {
      uploadOcrRef.current.scrollTop = uploadOriginalRef.current.scrollTop;
    } else if (source === 'ocr' && uploadOriginalRef.current && uploadOcrRef.current) {
      uploadOriginalRef.current.scrollTop = uploadOcrRef.current.scrollTop;
    }
  };

  // Apply formatting to OCR text
  const applyOcrFormatting = (format) => {
    const textarea = document.getElementById('ocr-editor');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    if (!selectedText) return;

    let formattedText = selectedText;
    if (format === 'bold') {
      formattedText = `**${selectedText}**`;
    } else if (format === 'italic') {
      formattedText = `*${selectedText}*`;
    }

    const newText = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    const updated = [...ocrResults];
    updated[0].text = newText;
    setOcrResults(updated);
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

  // OCR with backend (supports regular OCR or Claude OCR)
  const handleOCR = async () => {
    if (files.length === 0) {
      alert('Please select files first');
      return;
    }

    if (useClaudeOcr && !claudeApiKey) {
      alert('Claude API Key is required for Claude OCR. Please add it in Resources tab.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus(useClaudeOcr ? 'Performing OCR with Claude AI...' : 'Performing OCR...');
    setOcrResults([]);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingStatus(`Processing ${file.name} (${i + 1}/${files.length})${useClaudeOcr ? ' with Claude AI' : ''}...`);

        const fileBase64 = await fileToBase64(file);

        const response = await axios.post(`${API}/admin/ocr?admin_key=${adminKey}`, {
          file_base64: fileBase64,
          file_type: file.type,
          filename: file.name,
          use_claude: useClaudeOcr,
          claude_api_key: useClaudeOcr ? claudeApiKey : null,
          special_commands: ocrSpecialCommands || null,
          preserve_layout: true
        });

        if (response.data.status === 'success' || response.data.text) {
          setOcrResults(prev => [...prev, {
            filename: file.name,
            text: response.data.text
          }]);
        } else {
          throw new Error(response.data.error || response.data.detail || 'OCR failed');
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
      alert('Please configure your Claude API Key in the Setup tab');
      setActiveSubTab('resources');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Translating with Claude AI...');
    setTranslationResults([]);

    try {
      for (let i = 0; i < ocrResults.length; i++) {
        const ocrResult = ocrResults[i];
        setProcessingStatus(`Translating ${ocrResult.filename} (${i + 1}/${ocrResults.length})...`);

        // Find corresponding original image for this file
        const originalImage = originalImages.find(img => img.filename === ocrResult.filename);

        const response = await axios.post(`${API}/admin/translate?admin_key=${adminKey}`, {
          text: ocrResult.text,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          document_type: documentType,
          claude_api_key: claudeApiKey,
          action: 'translate',
          general_instructions: generalInstructions,
          preserve_layout: true,
          page_format: pageFormat,
          // Send original image so Claude can see the visual layout
          original_image: originalImage ? originalImage.data : null
        });

        if (response.data.status === 'success' || response.data.translation) {
          setTranslationResults(prev => [...prev, {
            filename: ocrResult.filename,
            originalText: ocrResult.text,
            translatedText: response.data.translation
          }]);
        } else {
          throw new Error(response.data.error || response.data.detail || 'Translation failed');
        }
      }
      setProcessingStatus('✅ Translation completed!');
      setActiveSubTab('review');
    } catch (error) {
      console.error('Translation error:', error);
      setProcessingStatus(`❌ Translation failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct translation - Claude sees image directly, no OCR needed
  const handleDirectTranslate = async () => {
    if (originalImages.length === 0) {
      alert('Please upload a document first');
      return;
    }

    if (!claudeApiKey) {
      alert('Please configure your Claude API Key in the Setup tab');
      setActiveSubTab('resources');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('🌐 Translating with Claude AI (analyzing image directly)...');
    setTranslationResults([]);

    try {
      const totalPages = originalImages.length;

      for (let i = 0; i < originalImages.length; i++) {
        const img = originalImages[i];
        const pageNumber = i + 1;
        setProcessingStatus(`Translating page ${pageNumber} of ${totalPages}: ${img.filename}...`);

        // Add page context to help Claude understand this is part of a multi-page document
        const pageContext = totalPages > 1
          ? `IMPORTANT: This is PAGE ${pageNumber} of ${totalPages} of a multi-page document. Translate ONLY the content visible in THIS image completely. Do NOT ask for other pages - they will be translated separately.`
          : '';

        const response = await axios.post(`${API}/admin/translate?admin_key=${adminKey}`, {
          text: `[Document image attached - translate directly from image] ${pageContext}`,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          document_type: documentType,
          claude_api_key: claudeApiKey,
          action: 'translate',
          general_instructions: `${generalInstructions}\n\n${pageContext}`.trim(),
          preserve_layout: true,
          page_format: pageFormat,
          original_image: img.data
        });

        if (response.data.status === 'success' || response.data.translation) {
          setTranslationResults(prev => [...prev, {
            filename: img.filename,
            originalText: `[Page ${pageNumber} of ${totalPages}]`,
            translatedText: response.data.translation
          }]);
        } else {
          throw new Error(response.data.error || response.data.detail || 'Translation failed');
        }
      }
      setProcessingStatus(`✅ Translation completed! ${totalPages} page(s) translated.`);
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
        source_language: sourceLanguage,
        target_language: targetLanguage,
        document_type: documentType,
        claude_api_key: claudeApiKey,
        action: correctionCommand,
        current_translation: currentResult.translatedText
      });

      if (response.data.status === 'success' || response.data.translation) {
        const updatedResults = [...translationResults];
        updatedResults[selectedResultIndex] = {
          ...currentResult,
          translatedText: response.data.translation
        };
        setTranslationResults(updatedResults);
        setCorrectionCommand('');
        setProcessingStatus('✅ Correction applied!');
      } else {
        throw new Error(response.data.error || response.data.detail || 'Correction failed');
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

  // Save and restore selection for formatting commands
  const savedSelection = useRef(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelection.current);
    }
  };

  // Execute formatting command and maintain focus on contentEditable
  const execFormatCommand = (command, value = null) => {
    restoreSelection();
    document.execCommand(command, false, value);
    if (editableRef.current) {
      editableRef.current.focus();
    }
    // Save selection after command for next operation
    setTimeout(saveSelection, 0);
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
                ${signatureImage ? `<img src="${signatureImage}" alt="Signature" style="max-height: 24px; max-width: 100px; object-fit: contain; margin-bottom: 2px;" />` : ''}
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

    // Letterhead for all pages
    const letterheadHTML = `
        <div class="header">
            <div class="logo-left">
                ${logoLeft
                  ? `<img src="${logoLeft}" alt="Logo" style="max-width: 120px; max-height: 50px; object-fit: contain;" />`
                  : `<div class="logo-placeholder"><span style="text-align:center;">LEGACY<br/>TRANSLATIONS</span></div>`}
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
                  : `<div class="logo-placeholder-right"><span>ata<br/>Member #275993</span></div>`}
            </div>
        </div>`;

    // Translation pages HTML (with or without letterhead)
    const translationPagesHTML = translationResults.map((result, index) => `
    <div class="translation-page">
        ${includeLetterhead ? letterheadHTML : ''}
        <div class="translation-content">${result.translatedText}</div>
    </div>
    `).join('');

    // Original documents pages HTML (each image on separate page, title only on first)
    const originalPagesHTML = (includeOriginal && originalImages.length > 0) ? originalImages.map((img, index) => `
    <div class="original-documents-page">
        ${includeLetterhead ? letterheadHTML : ''}
        ${index === 0 ? '<div class="page-title">Original Document</div>' : ''}
        <div class="original-image-container">
            <img src="${img.data}" alt="${img.filename}" class="original-image" />
        </div>
    </div>
    `).join('') : '';

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
        .page-title { font-size: 14px; font-weight: bold; text-align: center; margin: 20px 0; padding-bottom: 10px; border-bottom: 2px solid #2563eb; color: #1a365d; text-transform: uppercase; letter-spacing: 2px; }
        .page-header { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid #2563eb; color: #1a365d; text-transform: uppercase; letter-spacing: 2px; }
        .translation-content { line-height: 1.6; font-size: 12px; }
        .translation-content table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .translation-content td, .translation-content th { border: 1px solid #333; padding: 6px 8px; }
        .original-documents-page { page-break-before: always; padding-top: 20px; }
        .original-images-wrapper { margin-top: 20px; }
        .original-image-container { text-align: center; margin-bottom: 15px; }
        .original-image { max-width: 100%; max-height: 600px; border: 1px solid #ddd; object-fit: contain; }
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
    <div className="p-4">
      <h1 className="text-lg font-bold text-blue-600 mb-4">TRANSLATION WORKSPACE</h1>

      {/* Sub-tabs */}
      <div className="flex space-x-1 mb-4 border-b overflow-x-auto">
        {[
          { id: 'resources', label: '1. Setup', icon: '⚙️' },
          { id: 'cover', label: '2. Details', icon: '📝' },
          { id: 'ocr', label: '3. Document', icon: '📄' },
          { id: 'review', label: '4. Review', icon: '🔍' },
          { id: 'approval', label: '5. Deliver', icon: '✅' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium rounded-t ${
              activeSubTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* RESOURCES TAB */}
      {activeSubTab === 'resources' && (
        <div className="space-y-6">
          {/* Quick Start Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-xs text-blue-700">
              <strong>Quick Start:</strong> 1️⃣ Add your Claude API Key → 2️⃣ Go to Details tab → 3️⃣ Upload Document → 4️⃣ Review → 5️⃣ Deliver
            </p>
          </div>

          {/* Claude API Key Section */}
          <div className="bg-white rounded shadow p-4">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-lg">🔑</span>
              <h2 className="text-sm font-bold">Claude API Key</h2>
            </div>
            <div className="flex space-x-2">
              <input
                type="password"
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="flex-1 px-3 py-2 text-xs border rounded"
              />
              <button
                onClick={saveApiKey}
                className="px-4 py-2 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">Required for translation. Get yours at console.anthropic.com</p>
          </div>

          {/* OCR for CAT Tool Section */}
          <div className="bg-white rounded shadow p-4">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-lg">📝</span>
              <h2 className="text-sm font-bold">OCR for CAT Tool</h2>
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Optional</span>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Extract text from documents to use in external CAT tools (SDL Trados, MemoQ, etc.)
            </p>

            {/* File Upload for OCR */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors mb-3"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-2xl mb-1">📤</div>
              <button className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">
                Upload Document for OCR
              </button>
              <p className="text-[10px] text-gray-500 mt-1">
                {files.length > 0 ? `${files.length} file(s) selected` : 'Images or PDF'}
              </p>
            </div>

            {/* OCR Options */}
            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-4 text-xs">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!useClaudeOcr}
                      onChange={() => setUseClaudeOcr(false)}
                      className="mr-2"
                    />
                    AWS Textract OCR
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={useClaudeOcr}
                      onChange={() => setUseClaudeOcr(true)}
                      className="mr-2"
                    />
                    Claude AI OCR (better formatting)
                  </label>
                </div>

                <button
                  onClick={handleOCR}
                  disabled={isProcessing || (useClaudeOcr && !claudeApiKey)}
                  className="w-full py-2 bg-gray-700 text-white text-xs rounded hover:bg-gray-800 disabled:bg-gray-300"
                >
                  {isProcessing ? processingStatus : '🔍 Extract Text (OCR)'}
                </button>

                {/* OCR Results */}
                {ocrResults.length > 0 && (
                  <div className="border rounded p-3 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium">Extracted Text:</span>
                      <button
                        onClick={() => {
                          const text = ocrResults.map(r => r.text).join('\n\n---\n\n');
                          const blob = new Blob([text], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'ocr_text_for_cat.txt';
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        📥 Download for CAT Tool
                      </button>
                    </div>
                    <textarea
                      value={ocrResults.map(r => r.text).join('\n\n---\n\n')}
                      readOnly
                      className="w-full h-32 text-xs font-mono border rounded p-2 bg-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Translation Instructions Section */}
          <div className="bg-white rounded shadow">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📖</span>
                <div>
                  <h2 className="text-sm font-bold">Translation Instructions</h2>
                  <p className="text-xs text-gray-500">Manage translation guidelines by language pair</p>
                </div>
              </div>
              <button
                onClick={() => { setEditingInstruction(null); setInstructionForm({ sourceLang: 'Portuguese (Brazil)', targetLang: 'English', title: '', content: '' }); setShowInstructionModal(true); }}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center"
              >
                <span className="mr-1">+</span> Add
              </button>
            </div>
            <div className="p-4">
              {instructions.length > 0 ? (
                <div className="space-y-2">
                  {instructions.map((instr) => (
                    <div key={instr.id} className="p-3 border rounded hover:bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center text-xs">
                          <span className="px-2 py-0.5 bg-gray-100 rounded">{FLAGS[instr.sourceLang?.toLowerCase()] || '🌐'} {instr.sourceLang}</span>
                          <span className="mx-2">→</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded">{FLAGS[instr.targetLang?.toLowerCase()] || '🌐'} {instr.targetLang}</span>
                        </div>
                        <span className="text-xs font-medium">{instr.title}</span>
                      </div>
                      <div className="flex space-x-1">
                        <button onClick={() => handleEditInstruction(instr)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">✏️</button>
                        <button onClick={() => handleDeleteInstruction(instr.id)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-xs">No instructions yet. Click "Add" to create one.</p>
                </div>
              )}
            </div>
          </div>

          {/* Glossaries & Translation Memories Section */}
          <div className="bg-white rounded shadow">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🌐</span>
                <div>
                  <h2 className="text-sm font-bold">Glossaries & Translation Memories</h2>
                  <p className="text-xs text-gray-500">Upload and manage terminology resources</p>
                </div>
              </div>
              <button
                onClick={() => { setEditingGlossary(null); setGlossaryForm({ name: '', language: 'All Languages', field: 'All Fields', terms: [] }); setShowGlossaryModal(true); }}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center"
              >
                <span className="mr-1">+</span> Add
              </button>
            </div>
            <div className="p-4">
              {/* Filters */}
              <div className="flex space-x-3 mb-4">
                <select
                  value={resourcesFilter.language}
                  onChange={(e) => setResourcesFilter({ ...resourcesFilter, language: e.target.value })}
                  className="px-3 py-1.5 text-xs border rounded"
                >
                  <option>All Languages</option>
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
                <select
                  value={resourcesFilter.field}
                  onChange={(e) => setResourcesFilter({ ...resourcesFilter, field: e.target.value })}
                  className="px-3 py-1.5 text-xs border rounded"
                >
                  <option>All Fields</option>
                  <option>Legal</option>
                  <option>Medical</option>
                  <option>Technical</option>
                  <option>Financial</option>
                  <option>Certificates</option>
                </select>
              </div>

              {filteredGlossaries.length > 0 ? (
                <div className="space-y-2">
                  {filteredGlossaries.map((gloss) => (
                    <div key={gloss.id} className="p-3 border rounded hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium">{gloss.name}</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">
                              {gloss.sourceLang || 'PT'} {gloss.bidirectional ? '↔' : '→'} {gloss.targetLang || 'EN'}
                            </span>
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px]">{gloss.field}</span>
                            <span className="text-[10px] text-gray-500">{gloss.terms?.length || 0} terms</span>
                            {gloss.bidirectional && (
                              <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[10px]">↔ Bidirectional</span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button onClick={() => handleEditGlossary(gloss)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">✏️</button>
                          <button onClick={() => handleDeleteGlossary(gloss.id)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-xs">No glossaries/TM yet. Click "Add" to upload one.</p>
                </div>
              )}
            </div>
          </div>

          {/* Instruction Modal */}
          {showInstructionModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
                <div className="p-4 border-b">
                  <h3 className="font-bold">{editingInstruction ? 'Edit' : 'Add'} Translation Instruction</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Source Language</label>
                      <select
                        value={instructionForm.sourceLang}
                        onChange={(e) => setInstructionForm({ ...instructionForm, sourceLang: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border rounded"
                      >
                        {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Target Language</label>
                      <select
                        value={instructionForm.targetLang}
                        onChange={(e) => setInstructionForm({ ...instructionForm, targetLang: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border rounded"
                      >
                        {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Title</label>
                    <input
                      type="text"
                      value={instructionForm.title}
                      onChange={(e) => setInstructionForm({ ...instructionForm, title: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border rounded"
                      placeholder="e.g., Birth Certificate Guidelines"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Instructions</label>
                    <textarea
                      value={instructionForm.content}
                      onChange={(e) => setInstructionForm({ ...instructionForm, content: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border rounded h-32"
                      placeholder="Enter translation guidelines and instructions..."
                    />
                  </div>
                </div>
                <div className="p-4 border-t flex justify-end space-x-2">
                  <button onClick={() => setShowInstructionModal(false)} className="px-4 py-2 text-xs border rounded hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveInstruction} className="px-4 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
              </div>
            </div>
          )}

          {/* Glossary Modal */}
          {showGlossaryModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b">
                  <h3 className="font-bold">{editingGlossary ? 'Edit' : 'Add'} Glossary / TM</h3>
                </div>
                <div className="p-4 space-y-3">
                  {/* Name and Field */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Name</label>
                      <input
                        type="text"
                        value={glossaryForm.name}
                        onChange={(e) => setGlossaryForm({ ...glossaryForm, name: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border rounded"
                        placeholder="e.g., Legal Terms PT-EN"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Field</label>
                      <select
                        value={glossaryForm.field}
                        onChange={(e) => setGlossaryForm({ ...glossaryForm, field: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border rounded"
                      >
                        <option>All Fields</option>
                        <option>Legal</option>
                        <option>Medical</option>
                        <option>Technical</option>
                        <option>Financial</option>
                        <option>Certificates</option>
                      </select>
                    </div>
                  </div>

                  {/* Language Pair */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <label className="block text-xs font-bold mb-2">🌐 Language Pair</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={glossaryForm.sourceLang}
                        onChange={(e) => setGlossaryForm({ ...glossaryForm, sourceLang: e.target.value })}
                        className="flex-1 px-2 py-1.5 text-xs border rounded"
                      >
                        {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                      <span className="text-lg font-bold text-blue-600">
                        {glossaryForm.bidirectional ? '↔' : '→'}
                      </span>
                      <select
                        value={glossaryForm.targetLang}
                        onChange={(e) => setGlossaryForm({ ...glossaryForm, targetLang: e.target.value })}
                        className="flex-1 px-2 py-1.5 text-xs border rounded"
                      >
                        {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={glossaryForm.bidirectional}
                        onChange={(e) => setGlossaryForm({ ...glossaryForm, bidirectional: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-xs text-blue-700">
                        <strong>Bidirectional:</strong> Terms work both ways (PT → EN and EN → PT)
                      </span>
                    </label>
                  </div>

                  {/* Add Single Term */}
                  <div className="border-t pt-3">
                    <label className="block text-xs font-medium mb-2">Add Single Term</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newTerm.source}
                        onChange={(e) => setNewTerm({ ...newTerm, source: e.target.value })}
                        className="flex-1 px-2 py-1.5 text-xs border rounded"
                        placeholder="Source term"
                      />
                      <input
                        type="text"
                        value={newTerm.target}
                        onChange={(e) => setNewTerm({ ...newTerm, target: e.target.value })}
                        className="flex-1 px-2 py-1.5 text-xs border rounded"
                        placeholder="Target term"
                      />
                      <input
                        type="text"
                        value={newTerm.notes}
                        onChange={(e) => setNewTerm({ ...newTerm, notes: e.target.value })}
                        className="flex-1 px-2 py-1.5 text-xs border rounded"
                        placeholder="Notes (optional)"
                      />
                      <button onClick={addTermToGlossary} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700">+</button>
                    </div>
                  </div>

                  {/* Bulk Upload Terms */}
                  <div className="border-t pt-3">
                    <label className="block text-xs font-medium mb-2">📤 Bulk Upload Terms (Paste Entire Glossary)</label>
                    <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                      <p className="text-[10px] text-green-700">
                        <strong>Format:</strong> One term per line: <code className="bg-green-100 px-1">{glossaryForm.sourceLang} | {glossaryForm.targetLang} | notes (optional)</code>
                      </p>
                      {glossaryForm.bidirectional && (
                        <p className="text-[10px] text-green-600 mt-1">
                          ↔ <strong>Bidirectional enabled:</strong> Terms will work in both translation directions automatically!
                        </p>
                      )}
                    </div>
                    <textarea
                      value={bulkTermsText}
                      onChange={(e) => setBulkTermsText(e.target.value)}
                      placeholder={`certidão de nascimento | birth certificate | legal document
carteira de identidade | identity card | ID document
CPF | individual taxpayer number | Brazilian tax ID
registro civil | civil registry
cartório | notary office | public registry
certidão de casamento | marriage certificate
certidão de óbito | death certificate
reconhecimento de firma | notarized signature
autenticação | authentication
tradução juramentada | certified translation`}
                      className="w-full px-2 py-1.5 text-xs border rounded h-40 font-mono resize-y"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {bulkTermsText.trim() ? `${bulkTermsText.trim().split('\n').filter(l => l.trim() && l.includes('|')).length} valid terms detected` : 'Paste your glossary above'}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setBulkTermsText('')}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => {
                            const lines = bulkTermsText.trim().split('\n').filter(l => l.trim() && l.includes('|'));
                            const newTerms = lines.map(line => {
                              const parts = line.split('|').map(p => p.trim());
                              return {
                                id: Date.now() + Math.random(),
                                source: parts[0] || '',
                                target: parts[1] || '',
                                notes: parts[2] || ''
                              };
                            }).filter(t => t.source && t.target);

                            if (newTerms.length > 0) {
                              setGlossaryForm({
                                ...glossaryForm,
                                terms: [...glossaryForm.terms, ...newTerms]
                              });
                              setBulkTermsText('');
                              alert(`✅ Added ${newTerms.length} terms to glossary!`);
                            } else {
                              alert('No valid terms found. Use format: source | target | notes');
                            }
                          }}
                          disabled={!bulkTermsText.trim()}
                          className="px-4 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          📥 Import {bulkTermsText.trim().split('\n').filter(l => l.trim() && l.includes('|')).length} Terms
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Terms List */}
                  {glossaryForm.terms.length > 0 && (
                    <div className="border rounded max-h-64 overflow-y-auto">
                      <div className="flex justify-between items-center px-2 py-1 bg-gray-100 border-b">
                        <span className="text-xs font-medium">{glossaryForm.terms.length} terms loaded</span>
                        <button
                          onClick={() => {
                            if (window.confirm('Clear all terms?')) {
                              setGlossaryForm({...glossaryForm, terms: []});
                            }
                          }}
                          className="text-[10px] text-red-600 hover:underline"
                        >
                          Clear All
                        </button>
                      </div>
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1.5 text-left">{glossaryForm.sourceLang}</th>
                            <th className="px-2 py-1.5 text-left">{glossaryForm.targetLang}</th>
                            <th className="px-2 py-1.5 text-left">Notes</th>
                            <th className="px-2 py-1.5 w-16 text-center">🗑️</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {glossaryForm.terms.map((term, idx) => (
                            <tr key={term.id} className="hover:bg-gray-50">
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={term.source}
                                  onChange={(e) => {
                                    const updated = [...glossaryForm.terms];
                                    updated[idx].source = e.target.value;
                                    setGlossaryForm({...glossaryForm, terms: updated});
                                  }}
                                  className="w-full px-1 py-0.5 text-xs border-0 bg-transparent hover:bg-white hover:border focus:bg-white focus:border focus:border-blue-400 rounded"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={term.target}
                                  onChange={(e) => {
                                    const updated = [...glossaryForm.terms];
                                    updated[idx].target = e.target.value;
                                    setGlossaryForm({...glossaryForm, terms: updated});
                                  }}
                                  className="w-full px-1 py-0.5 text-xs border-0 bg-transparent hover:bg-white hover:border focus:bg-white focus:border focus:border-blue-400 rounded"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={term.notes || ''}
                                  onChange={(e) => {
                                    const updated = [...glossaryForm.terms];
                                    updated[idx].notes = e.target.value;
                                    setGlossaryForm({...glossaryForm, terms: updated});
                                  }}
                                  className="w-full px-1 py-0.5 text-xs text-gray-500 border-0 bg-transparent hover:bg-white hover:border focus:bg-white focus:border focus:border-blue-400 rounded"
                                  placeholder="notes..."
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button
                                  onClick={() => removeTermFromGlossary(term.id)}
                                  className="text-red-500 hover:text-red-700 px-1"
                                  title="Delete term"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t flex justify-end space-x-2">
                  <button onClick={() => setShowGlossaryModal(false)} className="px-4 py-2 text-xs border rounded hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveGlossary} className="px-4 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setActiveSubTab('cover')}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center"
            >
              Next: Details <span className="ml-2">→</span>
            </button>
          </div>
        </div>
      )}

      {/* COVER LETTER TAB */}
      {activeSubTab === 'cover' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-4">📋 Cover Letter & Certificate Setup</h2>

          {/* Certificate Logos Section */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
            <h3 className="text-xs font-bold text-blue-700 mb-3">🖼️ Certificate Logos</h3>
            <p className="text-[10px] text-gray-600 mb-4">Upload custom logos for the certificate. They will be saved in your browser.</p>

            <div className="grid grid-cols-3 gap-4">
              {/* Left Logo (Legacy/Partner) */}
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-700 mb-2">Left Logo (Partner)</label>
                <div className="border-2 border-dashed border-gray-300 rounded p-2 bg-white min-h-[80px] flex items-center justify-center">
                  {logoLeft ? (
                    <img src={logoLeft} alt="Left Logo" className="max-h-16 max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-gray-400">No logo</span>
                  )}
                </div>
                <input
                  ref={logoLeftInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, 'left')}
                  className="hidden"
                />
                <button
                  onClick={() => logoLeftInputRef.current?.click()}
                  className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600 mt-2"
                >
                  Upload
                </button>
              </div>

              {/* Center Logo (ATA) */}
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-700 mb-2">Center Logo (ATA)</label>
                <div className="border-2 border-dashed border-gray-300 rounded p-2 bg-white min-h-[80px] flex items-center justify-center">
                  {logoRight ? (
                    <img src={logoRight} alt="ATA Logo" className="max-h-16 max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-gray-400">No logo</span>
                  )}
                </div>
                <input
                  ref={logoRightInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, 'right')}
                  className="hidden"
                />
                <button
                  onClick={() => logoRightInputRef.current?.click()}
                  className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600 mt-2"
                >
                  Upload
                </button>
              </div>

              {/* Stamp Logo */}
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-700 mb-2">Stamp Logo</label>
                <div className="border-2 border-dashed border-gray-300 rounded p-2 bg-white min-h-[80px] flex items-center justify-center">
                  {logoStamp ? (
                    <img src={logoStamp} alt="Stamp Logo" className="max-h-16 max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-gray-400">No logo</span>
                  )}
                </div>
                <input
                  ref={logoStampInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, 'stamp')}
                  className="hidden"
                />
                <button
                  onClick={() => logoStampInputRef.current?.click()}
                  className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600 mt-2"
                >
                  Upload
                </button>
              </div>

              {/* Signature Image */}
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-700 mb-2">Signature</label>
                <div className="border-2 border-dashed border-gray-300 rounded p-2 bg-white min-h-[80px] flex items-center justify-center">
                  {signatureImage ? (
                    <img src={signatureImage} alt="Signature" className="max-h-16 max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-gray-400">No signature</span>
                  )}
                </div>
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, 'signature')}
                  className="hidden"
                />
                <button
                  onClick={() => signatureInputRef.current?.click()}
                  className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600 mt-2"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>

          {/* Certificate Preview - LIVE with Editable Fields */}
          <div className="p-4 bg-white border-2 border-blue-300 rounded mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-blue-700">📄 Certificate Preview (Live)</h3>
              <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded">🔄 Edit highlighted fields directly</span>
            </div>

            {/* The Certificate Document */}
            <div className="border rounded p-8 bg-white" style={{fontFamily: 'Georgia, Times New Roman, serif', fontSize: '12px', lineHeight: '1.6', maxWidth: '800px', margin: '0 auto'}}>

              {/* Header with logos */}
              <div className="flex justify-between items-center mb-4 pb-2">
                <div className="w-32">
                  {logoLeft ? <img src={logoLeft} alt="Logo" className="max-h-12" /> : <div className="text-[10px] text-blue-600 font-bold">LEGACY<br/><span className="font-normal text-[8px]">TRANSLATIONS</span></div>}
                </div>
                <div className="text-center flex-1 px-4">
                  <div className="font-bold text-blue-600 text-sm">Legacy Translations</div>
                  <div className="text-[9px] text-gray-600">867 Boylston Street · 5th Floor · #2073 · Boston, MA · 02116</div>
                  <div className="text-[9px] text-gray-600">(857) 316-7770 · contact@legacytranslations.com</div>
                </div>
                <div className="w-20 text-right">
                  {logoRight ? <img src={logoRight} alt="ATA" className="max-h-10 ml-auto" /> : <div className="text-[9px] text-gray-600 italic">ata<br/><span className="text-[8px]">Member # 275993</span></div>}
                </div>
              </div>

              {/* Order Number */}
              <div className="text-right mb-6 text-sm">
                <span>Order # </span>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="font-bold border-b-2 border-blue-400 bg-blue-50 px-2 py-0.5 w-20 text-center focus:outline-none focus:border-blue-600"
                  placeholder="P6287"
                />
              </div>

              {/* Main Title */}
              <h1 className="text-2xl text-center mb-6 font-normal" style={{color: '#1a365d'}}>Certification of Translation Accuracy</h1>

              {/* Translation of ... */}
              <p className="text-center mb-6 text-sm">
                Translation of{' '}
                <input
                  type="text"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="font-bold border-b-2 border-blue-400 bg-blue-50 px-2 py-0.5 w-32 text-center focus:outline-none focus:border-blue-600"
                  placeholder="School Transcript"
                />
                {' '}from<br/>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="font-bold border-b-2 border-blue-400 bg-blue-50 px-2 py-0.5 focus:outline-none focus:border-blue-600 mt-1"
                >
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
                {' '}to{' '}
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="font-bold border-b-2 border-blue-400 bg-blue-50 px-2 py-0.5 focus:outline-none focus:border-blue-600"
                >
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </p>

              {/* Body paragraphs */}
              <p className="mb-4 text-justify text-xs leading-relaxed">
                We, <strong>Legacy Translations Inc.</strong>, a professional translation services company and an <strong>American Translators Association (ATA) Member (No. 275993)</strong>, having no relation to the client, hereby certify that the attached {targetLanguage} (United States) translation of the {sourceLanguage} document was performed by us and is, to the best of our knowledge and belief, a <strong>true, complete, and accurate translation</strong> of the original document submitted.
              </p>

              <p className="mb-4 text-justify text-xs leading-relaxed">
                This certification attests <strong>only to the accuracy and completeness of the translation</strong>. We do not certify or guarantee the authenticity of the original document, nor the truthfulness of the statements contained therein. <strong>Legacy Translations Inc.</strong> assumes no responsibility or liability for the manner in which this translation is used by the client or any third party, including governmental, educational, or legal institutions.
              </p>

              <p className="mb-4 text-justify text-xs leading-relaxed">
                I, <strong>Beatriz Paiva</strong>, hereby certify that this translation has been <strong>reviewed and proofread</strong> and that the attached translated document is a <strong>faithful and authentic representation</strong> of the original document.
              </p>

              <p className="mb-6 text-justify text-xs leading-relaxed">
                A copy of the translated document and the original file(s) provided are attached hereto and form an integral part of this certification.
              </p>

              {/* Signature Section - FIXED */}
              <div className="mt-8">
                {signatureImage ? (
                  <img src={signatureImage} alt="Signature" className="h-6 mb-1" style={{maxWidth: '100px'}} />
                ) : (
                  <div className="h-6 mb-1 text-xs text-gray-400 italic">No signature uploaded</div>
                )}
                <div className="text-xs">Authorized Representative</div>
                <div className="text-xs">Legacy Translations Inc.</div>
                <div className="text-xs mt-2">
                  Dated:{' '}
                  <input
                    type="text"
                    value={translationDate}
                    onChange={(e) => setTranslationDate(e.target.value)}
                    className="font-bold border-b-2 border-blue-400 bg-blue-50 px-2 py-0.5 w-28 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Page Format Section */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded mb-4">
            <h3 className="text-xs font-bold text-gray-700 mb-3">📄 Page Format</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Translation Type</label>
                <select
                  value={translationType}
                  onChange={(e) => saveTranslationType(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  <option value="certified">Certified Translation</option>
                  <option value="sworn">Sworn Translation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Page Size</label>
                <select
                  value={pageFormat}
                  onChange={(e) => savePageFormat(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  <option value="letter">Letter (8.5" x 11") - US Standard</option>
                  <option value="a4">A4 (210mm x 297mm) - International</option>
                </select>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setActiveSubTab('resources')}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 flex items-center"
            >
              <span className="mr-2">←</span> Back: Setup
            </button>
            <button
              onClick={() => setActiveSubTab('ocr')}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center"
            >
              Next: Document <span className="ml-2">→</span>
            </button>
          </div>
        </div>
      )}

      {/* DOCUMENT TAB - Direct Translation */}
      {activeSubTab === 'ocr' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-2">📄 Document Translation</h2>
          <p className="text-xs text-gray-500 mb-4">Upload document and translate directly with Claude AI</p>

          {/* Language Selection */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="text-xs font-bold text-blue-700 mb-3">🌐 Translation Direction</h3>
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">From:</label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded font-medium"
                >
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
              <div className="pt-5 text-2xl text-blue-500">→</div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">To:</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded font-medium"
                >
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          {!originalImages.length && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors mb-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-4xl mb-2">📤</div>
              <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                Upload Document
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Upload image or PDF of the document to translate
              </p>
            </div>
          )}

          {/* Processing Status */}
          {processingStatus && (
            <div className={`mb-4 p-3 rounded text-xs ${
              processingStatus.includes('❌') ? 'bg-red-100 text-red-700' :
              processingStatus.includes('✅') ? 'bg-green-100 text-green-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {processingStatus}
            </div>
          )}

          {/* Side-by-Side View: Original + Translation */}
          {originalImages.length > 0 && (
            <div className="mt-2">
              {/* Header */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-600">
                  {sourceLanguage} → {targetLanguage}
                </span>
                <button
                  onClick={() => {
                    setOriginalImages([]);
                    setTranslationResults([]);
                    setFiles([]);
                  }}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                >
                  🗑️ Clear & Start Over
                </button>
              </div>

              {/* Side-by-Side Panels */}
              <div className="border rounded">
                <div className="grid grid-cols-2 gap-0 bg-gray-100 border-b">
                  <div className="px-3 py-2 border-r">
                    <span className="text-xs font-bold text-gray-700">📄 Original Document</span>
                  </div>
                  <div className="px-3 py-2">
                    <span className="text-xs font-bold text-gray-700">🌐 Translation ({targetLanguage})</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-0" style={{height: '450px'}}>
                  {/* Left: Original Document */}
                  <div className="border-r overflow-auto bg-gray-50 p-2">
                    {originalImages.map((img, idx) => (
                      <div key={idx} className="mb-2">
                        {img.filename.toLowerCase().endsWith('.pdf') ? (
                          <embed
                            src={img.data}
                            type="application/pdf"
                            className="w-full border shadow-sm"
                            style={{height: '430px'}}
                          />
                        ) : (
                          <img
                            src={img.data}
                            alt={img.filename}
                            className="max-w-full border shadow-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Right: Translation Result */}
                  <div className="overflow-auto bg-white">
                    {translationResults.length > 0 ? (
                      <iframe
                        srcDoc={translationResults[0]?.translatedText || '<p>No translation</p>'}
                        title="Translation"
                        className="w-full h-full border-0"
                        style={{minHeight: '450px'}}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm p-4">
                        <div className="text-center">
                          <div className="text-3xl mb-2">🌐</div>
                          <p>Click "Translate" to start</p>
                          <p className="text-xs mt-1">Claude will see the image and translate directly</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Special Instructions for Claude */}
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded">
                <label className="block text-xs font-medium text-purple-700 mb-1">
                  📝 Special Instructions for Claude (Optional)
                </label>
                <textarea
                  value={generalInstructions}
                  onChange={(e) => setGeneralInstructions(e.target.value)}
                  placeholder='e.g., "Describe what is written in Arabic between brackets" or "Keep original formatting with tables"'
                  className="w-full px-2 py-1.5 text-xs border rounded h-16 resize-none"
                />
                <p className="text-[10px] text-purple-600 mt-1">
                  These instructions will be sent to Claude along with each page. Max recommended: 5-10 pages at once.
                </p>
              </div>

              {/* Translate Button */}
              <div className="mt-4">
                <button
                  onClick={handleDirectTranslate}
                  disabled={isProcessing || !claudeApiKey}
                  className="w-full py-3 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '⏳ Translating...' : `🌐 Translate ${originalImages.length > 0 ? `(${originalImages.length} page${originalImages.length > 1 ? 's' : ''})` : ''} with Claude AI`}
                </button>
                {!claudeApiKey && (
                  <p className="text-[10px] text-red-500 mt-1 text-center">
                    ⚠️ Please add your Claude API Key in the Setup tab
                  </p>
                )}
              </div>

              {translationResults.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded flex justify-between items-center">
                  <p className="text-xs text-green-700">✅ Translation complete!</p>
                  <button
                    onClick={() => setActiveSubTab('review')}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Go to Review →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setActiveSubTab('cover')}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 flex items-center"
            >
              <span className="mr-2">←</span> Back: Details
            </button>
            <button
              onClick={() => setActiveSubTab('review')}
              disabled={translationResults.length === 0}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              Next: Review <span className="ml-2">→</span>
            </button>
          </div>
        </div>
      )}

      {/* REVIEW TAB */}
      {activeSubTab === 'review' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-2">✏️ Review & Edit Translation</h2>

          {translationResults.length > 0 ? (
            <>
              {/* Document selector */}
              {translationResults.length > 1 && (
                <div className="mb-3">
                  <label className="text-xs text-gray-600 mr-2">Document:</label>
                  <select
                    value={selectedResultIndex}
                    onChange={(e) => setSelectedResultIndex(Number(e.target.value))}
                    className="px-2 py-1 text-xs border rounded"
                  >
                    {translationResults.map((r, idx) => (
                      <option key={idx} value={idx}>{r.filename}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* View Mode Toggle + Edit Toolbar */}
              <div className="flex justify-between items-center mb-2">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button
                    onClick={() => setReviewViewMode('preview')}
                    className={`px-3 py-1 text-xs font-medium rounded-l-md border ${
                      reviewViewMode === 'preview'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    👁️ Preview
                  </button>
                  <button
                    onClick={() => setReviewViewMode('edit')}
                    className={`px-3 py-1 text-xs font-medium rounded-r-md border-t border-b border-r ${
                      reviewViewMode === 'edit'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    ✏️ Edit
                  </button>
                </div>

                {/* Edit Toolbar - Only visible in edit mode */}
                {reviewViewMode === 'edit' && (
                  <div className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded">
                    <button onMouseDown={(e) => { e.preventDefault(); execFormatCommand('bold'); }} className="px-2 py-1 text-xs font-bold bg-white border rounded hover:bg-gray-200" title="Bold">B</button>
                    <button onMouseDown={(e) => { e.preventDefault(); execFormatCommand('italic'); }} className="px-2 py-1 text-xs italic bg-white border rounded hover:bg-gray-200" title="Italic">I</button>
                    <button onMouseDown={(e) => { e.preventDefault(); execFormatCommand('underline'); }} className="px-2 py-1 text-xs underline bg-white border rounded hover:bg-gray-200" title="Underline">U</button>
                    <div className="w-px h-5 bg-gray-300 mx-1"></div>
                    <select onMouseDown={(e) => e.preventDefault()} onChange={(e) => { execFormatCommand('fontSize', e.target.value); }} className="px-1 py-1 text-[10px] border rounded" defaultValue="3">
                      <option value="1">8pt</option>
                      <option value="2">10pt</option>
                      <option value="3">12pt</option>
                      <option value="4">14pt</option>
                      <option value="5">18pt</option>
                      <option value="6">24pt</option>
                    </select>
                    <div className="w-px h-5 bg-gray-300 mx-1"></div>
                    <button onMouseDown={(e) => { e.preventDefault(); execFormatCommand('justifyLeft'); }} className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-200" title="Align Left">⬅</button>
                    <button onMouseDown={(e) => { e.preventDefault(); execFormatCommand('justifyCenter'); }} className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-200" title="Center">⬌</button>
                    <button onMouseDown={(e) => { e.preventDefault(); execFormatCommand('justifyRight'); }} className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-200" title="Align Right">➡</button>
                  </div>
                )}
              </div>

              {/* Side by side view */}
              <div className="border rounded mb-4">
                <div className="grid grid-cols-2 gap-0 bg-gray-100 border-b">
                  <div className="px-3 py-2 border-r">
                    <span className="text-xs font-bold text-gray-700">📄 Original Document</span>
                  </div>
                  <div className="px-3 py-2">
                    <span className="text-xs font-bold text-gray-700">
                      🌐 Translation ({targetLanguage}) - {reviewViewMode === 'preview' ? 'Preview' : '✏️ Editing'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-0 h-96 overflow-hidden">
                  {/* Left: Original Document Image or Text */}
                  <div className="border-r overflow-auto bg-gray-50 p-2" ref={originalTextRef} onScroll={() => handleScroll('original')}>
                    {originalImages[selectedResultIndex] ? (
                      originalImages[selectedResultIndex].filename?.toLowerCase().endsWith('.pdf') ? (
                        <embed src={originalImages[selectedResultIndex].data} type="application/pdf" className="w-full border shadow-sm" style={{height: '380px'}} />
                      ) : (
                        <img src={originalImages[selectedResultIndex].data} alt={originalImages[selectedResultIndex].filename} className="max-w-full border shadow-sm" />
                      )
                    ) : (
                      <pre className="p-3 text-xs font-mono whitespace-pre-wrap min-h-full" style={{fontWeight: 'bold'}}>
                        {translationResults[selectedResultIndex]?.originalText || ''}
                      </pre>
                    )}
                  </div>
                  {/* Right: Translation - Preview or Editable */}
                  <div className="overflow-auto bg-white" ref={translatedTextRef} onScroll={() => handleScroll('translated')}>
                    {reviewViewMode === 'preview' ? (
                      <iframe
                        srcDoc={translationResults[selectedResultIndex]?.translatedText || '<p>No translation</p>'}
                        title="Translation Preview"
                        className="w-full h-full border-0"
                        style={{minHeight: '384px'}}
                      />
                    ) : (
                      <div
                        ref={editableRef}
                        contentEditable
                        dangerouslySetInnerHTML={{ __html: translationResults[selectedResultIndex]?.translatedText || '' }}
                        onBlur={(e) => handleTranslationEdit(e.target.innerHTML)}
                        onMouseUp={saveSelection}
                        onKeyUp={saveSelection}
                        className="w-full h-full p-3 text-xs focus:outline-none overflow-auto"
                        style={{minHeight: '384px', height: '384px', border: '3px solid #10B981', borderRadius: '4px'}}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Correction Command */}
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  📝 Send Correction Command to Claude
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={correctionCommand}
                    onChange={(e) => setCorrectionCommand(e.target.value)}
                    placeholder='e.g., "Change certificate to diploma" or "Fix formatting"'
                    className="flex-1 px-2 py-1.5 text-xs border rounded"
                  />
                  <button
                    onClick={handleApplyCorrection}
                    disabled={!correctionCommand.trim() || applyingCorrection}
                    className="px-3 py-1.5 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 disabled:bg-gray-300"
                  >
                    {applyingCorrection ? '⏳' : '✨ Apply'}
                  </button>
                </div>
              </div>

              {/* Navigation */}
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={() => setActiveSubTab('ocr')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 flex items-center"
                >
                  <span className="mr-2">←</span> Back: Document
                </button>
                <button
                  onClick={() => setActiveSubTab('approval')}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center"
                >
                  Next: Deliver <span className="ml-2">→</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📄</div>
              <p className="text-xs">No translations yet. Complete OCR and translation in <strong>3. Document</strong> first.</p>
              <button
                onClick={() => setActiveSubTab('ocr')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Go to Document
              </button>
            </div>
          )}
        </div>
      )}

      {/* APPROVAL TAB */}
      {activeSubTab === 'approval' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-2">✅ Approval & Delivery</h2>

          {translationResults.length > 0 ? (
            <>
              {/* Approval Checklist */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded mb-4">
                <h3 className="text-sm font-bold text-purple-700 mb-3">📋 Approval Checklist</h3>
                <div className="space-y-2">
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalChecks.projectNumber}
                      onChange={(e) => setApprovalChecks({...approvalChecks, projectNumber: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Você colocou o número do projeto?</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalChecks.languageChanged}
                      onChange={(e) => setApprovalChecks({...approvalChecks, languageChanged: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Mudou o idioma?</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalChecks.proofread}
                      onChange={(e) => setApprovalChecks({...approvalChecks, proofread: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Fez o proofreading do documento?</span>
                  </label>
                </div>
              </div>

              {/* Non-Certified Translation Options */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded mb-4">
                <h3 className="text-sm font-bold text-orange-700 mb-2">📄 Para traduções não certificadas</h3>
                <p className="text-[10px] text-orange-600 mb-3">Marque para EXCLUIR do documento final:</p>
                <div className="space-y-2">
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!includeCover}
                      onChange={(e) => setIncludeCover(!e.target.checked)}
                      className="mr-3 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="font-medium">Excluir Certificate of Accuracy</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!includeLetterhead}
                      onChange={(e) => setIncludeLetterhead(!e.target.checked)}
                      className="mr-3 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="font-medium">Excluir Letterhead</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!includeOriginal}
                      onChange={(e) => setIncludeOriginal(!e.target.checked)}
                      className="mr-3 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="font-medium">Excluir Original Document</span>
                  </label>
                </div>
              </div>

              {/* Download Options */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
                <h3 className="text-sm font-bold text-blue-700 mb-3">📥 Download Complete Package</h3>

                {/* Document Order Preview */}
                <div className="bg-white rounded border p-3 mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">📋 Document Order:</p>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {includeCover && (
                      <>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Certificate</span>
                        <span className="text-gray-400">→</span>
                      </>
                    )}
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Translation</span>
                    {includeOriginal && (
                      <>
                        <span className="text-gray-400">→</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Original</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    {includeLetterhead ? '✓ Letterhead em todas as páginas' : '✗ Sem letterhead'}
                  </p>
                </div>

                {/* Download Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownload('html')}
                    className="py-3 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    📄 Download HTML
                  </button>
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="py-3 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    📑 Print / Save PDF
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  HTML: Edit in browser before printing | PDF: Opens print dialog
                </p>
              </div>

              {/* Send to Projects */}
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <h3 className="text-sm font-bold text-green-700 mb-3">📤 Send to Projects</h3>
                <p className="text-[10px] text-gray-600 mb-3">Send this translation to a project for final review and delivery to client.</p>
                <div className="flex space-x-2">
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-xs border rounded"
                  >
                    <option value="">-- Select Order --</option>
                    {availableOrders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.order_number} - {order.client_name} ({order.translation_status})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={sendToProjects}
                    disabled={!selectedOrderId || sendingToProjects}
                    className="px-4 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {sendingToProjects ? '⏳ Sending...' : '📤 Send'}
                  </button>
                </div>
                {availableOrders.length === 0 && (
                  <p className="text-[10px] text-yellow-600 mt-2">No orders available. Create an order first in the Projects tab.</p>
                )}
              </div>

              {processingStatus && (
                <div className={`mt-4 p-3 rounded text-xs ${
                  processingStatus.includes('❌') ? 'bg-red-100 text-red-700' :
                  processingStatus.includes('✅') ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {processingStatus}
                </div>
              )}

              {/* Navigation */}
              <div className="mt-6 flex justify-start">
                <button
                  onClick={() => setActiveSubTab('review')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 flex items-center"
                >
                  <span className="mr-2">←</span> Back: Review
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📄</div>
              <p className="text-xs">No translations yet. Complete the translation workflow first.</p>
              <button
                onClick={() => setActiveSubTab('ocr')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Go to Document
              </button>
            </div>
          )}
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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center text-sm">✍️</div>
          <div>
            <div className="font-bold text-sm">Translation Tool</div>
            <div className="text-[10px] text-slate-400">Legacy Translations</div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <a href="/admin" className="text-xs text-slate-300 hover:text-white">← Back to Admin</a>
          <button onClick={onLogout} className="text-xs text-red-400 hover:text-red-300">Logout</button>
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
