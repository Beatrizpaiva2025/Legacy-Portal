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
    { id: 'translation', label: 'Translation', icon: '✍️' },
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
  const [activeSubTab, setActiveSubTab] = useState('upload');
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

  // Correction state
  const [correctionCommand, setCorrectionCommand] = useState('');
  const [applyingCorrection, setApplyingCorrection] = useState(false);

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

  // Refs
  const fileInputRef = useRef(null);
  const originalTextRef = useRef(null);
  const translatedTextRef = useRef(null);

  // Load saved API key and resources
  useEffect(() => {
    const savedKey = localStorage.getItem('claude_api_key');
    if (savedKey) setClaudeApiKey(savedKey);
    fetchResources();
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

  // Save API key
  const saveApiKey = () => {
    localStorage.setItem('claude_api_key', claudeApiKey);
    setProcessingStatus('✅ API Key saved!');
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
          action: 'translate'
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
  const handleDownload = () => {
    const translator = TRANSLATORS.find(t => t.name === selectedTranslator);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Certification of Translation Accuracy</title>
    <style>
        @page { size: Letter; margin: 0.75in 1in; }
        body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; color: #333; }
        .header { display: flex; justify-content: space-between; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0; margin-bottom: 30px; }
        .header-center { flex: 1; text-align: center; }
        .company-name { font-size: 18px; font-weight: bold; }
        .company-address { font-size: 11px; line-height: 1.4; }
        .order-number { text-align: right; margin-bottom: 30px; }
        .main-title { text-align: center; font-size: 28px; margin-bottom: 40px; }
        .subtitle { text-align: center; font-size: 16px; margin-bottom: 40px; line-height: 1.8; }
        .body-text { text-align: justify; margin-bottom: 20px; line-height: 1.8; }
        .footer-section { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
        .translation-page { page-break-before: always; margin-top: 30px; }
        .translation-content { white-space: pre-wrap; line-height: 1.8; }
    </style>
</head>
<body>
    <div class="header">
        <div style="width: 150px;"></div>
        <div class="header-center">
            <div class="company-name">Legacy Translations</div>
            <div class="company-address">
                867 Boylston Street 5th Floor #2073 Boston, MA 02116<br>
                (857) 316-7770 | contact@legacytranslations.com<br>
                ATA Member # 275993
            </div>
        </div>
        <div style="width: 100px;"></div>
    </div>

    <div class="order-number">Order # <strong>${orderNumber || 'N/A'}</strong></div>

    <h1 class="main-title">Certification of Translation Accuracy</h1>

    <div class="subtitle">
        Translation of a <strong>${documentType}</strong> from <strong>${sourceLanguage}</strong> to <strong>${targetLanguage}</strong>
    </div>

    <p class="body-text">
        We, Legacy Translations, a professional translation services company and ATA Member (#275993),
        having no relation to the client, hereby certify that the annexed <strong>${targetLanguage}</strong>
        translation of the <strong>${sourceLanguage}</strong> document, executed by us, is to the best
        of our knowledge and belief, a true and accurate translation of the original document, likewise
        annexed hereunto.
    </p>

    <p class="body-text">
        This is to certify the correctness of the translation only. We do not guarantee that the original
        is a genuine document, or that the statements contained in the original document are true.
    </p>

    <p class="body-text">A copy of the translation is attached to this certification.</p>

    <div class="footer-section">
        <div>
            <div style="font-weight: bold;">${translator?.name || 'Beatriz Paiva'}</div>
            <div style="font-weight: bold;">${translator?.title || 'Managing Director'}</div>
            <div>Dated: ${translationDate}</div>
        </div>
        <div style="text-align: center;">
            <div style="font-size: 12px; color: #666;">[ Official Seal ]</div>
        </div>
    </div>

    ${translationResults.map((result, index) => `
    <div class="translation-page">
        <h2 style="font-size: 18px; margin-bottom: 20px;">Translation - ${result.filename}</h2>
        <div class="translation-content">${result.translatedText}</div>
    </div>
    `).join('')}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certification_${orderNumber || 'translation'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-blue-600 mb-4">TRANSLATION WORKSPACE</h1>

      {/* Sub-tabs */}
      <div className="flex space-x-1 mb-4 border-b">
        {[
          { id: 'resources', label: 'Resources', icon: '📚' },
          { id: 'upload', label: '1. Upload', icon: '📤' },
          { id: 'config', label: '2. Config', icon: '⚙️' },
          { id: 'results', label: '3. Results', icon: '📊' }
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
                          <div className="flex space-x-2 mt-1">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">{gloss.language}</span>
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px]">{gloss.field}</span>
                            <span className="text-[10px] text-gray-500">{gloss.terms?.length || 0} terms</span>
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
                  <div className="grid grid-cols-3 gap-3">
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
                      <label className="block text-xs font-medium mb-1">Language</label>
                      <select
                        value={glossaryForm.language}
                        onChange={(e) => setGlossaryForm({ ...glossaryForm, language: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border rounded"
                      >
                        <option>All Languages</option>
                        {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
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

                  {/* Add Term */}
                  <div className="border-t pt-3">
                    <label className="block text-xs font-medium mb-2">Add Terms</label>
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

                  {/* Terms List */}
                  {glossaryForm.terms.length > 0 && (
                    <div className="border rounded max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1.5 text-left">Source</th>
                            <th className="px-2 py-1.5 text-left">Target</th>
                            <th className="px-2 py-1.5 text-left">Notes</th>
                            <th className="px-2 py-1.5 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {glossaryForm.terms.map((term) => (
                            <tr key={term.id}>
                              <td className="px-2 py-1.5">{term.source}</td>
                              <td className="px-2 py-1.5">{term.target}</td>
                              <td className="px-2 py-1.5 text-gray-500">{term.notes}</td>
                              <td className="px-2 py-1.5">
                                <button onClick={() => removeTermFromGlossary(term.id)} className="text-red-500 hover:text-red-700">×</button>
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
        </div>
      )}

      {/* UPLOAD TAB */}
      {activeSubTab === 'upload' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-2">Upload Documents</h2>
          <p className="text-xs text-gray-500 mb-4">Select documents for OCR and translation</p>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
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
            <button className="px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
              Choose Files
            </button>
            <p className="text-xs text-gray-500 mt-2">
              {files.length > 0 ? `${files.length} file(s) selected` : 'Click to select files (images or PDF)'}
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-700">Selected Files:</label>
              <div className="mt-1 space-y-1">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center text-xs p-2 bg-gray-50 rounded">
                    <span className="mr-2">📄</span>
                    <span>{file.name}</span>
                    <span className="ml-auto text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2 mt-4">
            <button
              onClick={handleOCR}
              disabled={files.length === 0 || isProcessing}
              className="flex-1 py-2 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? '⏳ Processing...' : '🔍 OCR (Extract Text)'}
            </button>

            <button
              onClick={handleTranslate}
              disabled={ocrResults.length === 0 || isProcessing}
              className="flex-1 py-2 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? '⏳ Processing...' : '🌐 Translate (Claude)'}
            </button>
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

          {/* OCR Results Preview */}
          {ocrResults.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-bold mb-2">📝 OCR Results (editable)</h3>
              {ocrResults.map((result, idx) => (
                <div key={idx} className="mb-3">
                  <label className="text-xs text-gray-600">{result.filename}</label>
                  <textarea
                    value={result.text}
                    onChange={(e) => {
                      const updated = [...ocrResults];
                      updated[idx].text = e.target.value;
                      setOcrResults(updated);
                    }}
                    className="w-full h-32 mt-1 p-2 text-xs font-mono border rounded"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONFIG TAB */}
      {activeSubTab === 'config' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-4">Translation Configuration</h2>

          {/* Claude API Key */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <label className="block text-xs font-medium text-gray-700 mb-1">🔑 Claude API Key</label>
            <div className="flex space-x-2">
              <input
                type="password"
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="flex-1 px-2 py-1.5 text-xs border rounded"
              />
              <button
                onClick={saveApiKey}
                className="px-3 py-1.5 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Required for translation. Get yours at console.anthropic.com</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Source Language</label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border rounded"
              >
                {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target Language</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border rounded"
              >
                {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Document Type</label>
            <input
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border rounded"
              placeholder="e.g., Birth Certificate, Diploma, Contract"
            />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Order Number</label>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border rounded"
              placeholder="e.g., P6312"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Translator</label>
              <select
                value={selectedTranslator}
                onChange={(e) => setSelectedTranslator(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border rounded"
              >
                {TRANSLATORS.map(t => (
                  <option key={t.name} value={t.name}>{t.name} - {t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                value={translationDate}
                onChange={(e) => setTranslationDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* RESULTS TAB */}
      {activeSubTab === 'results' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-2">Translation Results</h2>

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

              {/* Side by side view */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    📄 Original ({sourceLanguage})
                  </label>
                  <textarea
                    ref={originalTextRef}
                    value={translationResults[selectedResultIndex]?.originalText || ''}
                    readOnly
                    onScroll={() => handleScroll('original')}
                    className="w-full h-64 p-2 text-xs font-mono border rounded bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    🌐 Translation ({targetLanguage}) - Editable
                  </label>
                  <textarea
                    ref={translatedTextRef}
                    value={translationResults[selectedResultIndex]?.translatedText || ''}
                    onChange={(e) => handleTranslationEdit(e.target.value)}
                    onScroll={() => handleScroll('translated')}
                    className="w-full h-64 p-2 text-xs font-mono border rounded"
                  />
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

              <button
                onClick={handleDownload}
                className="w-full py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                📥 Download Certificate (HTML)
              </button>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📄</div>
              <p className="text-xs">No translations yet. Upload and translate documents first.</p>
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
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">API Configuration</h2>
          <div className="space-y-2 text-xs">
            <div><label className="block text-gray-500 mb-1">Backend URL</label><input type="text" className="w-full px-2 py-1.5 border rounded bg-gray-50" value={BACKEND_URL} readOnly /></div>
            <div><label className="block text-gray-500 mb-1">Admin Key</label><input type="password" className="w-full px-2 py-1.5 border rounded bg-gray-50" value={adminKey} readOnly /></div>
          </div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Pricing</h2>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Certified Translation</span><span className="font-bold text-teal-600">$24.99/page</span></div>
            <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Professional Translation</span><span className="font-bold text-teal-600">$19.50/page</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
function AdminApp() {
  const [adminKey, setAdminKey] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');

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
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'projects': return <ProjectsPage adminKey={adminKey} />;
      case 'translation': return <TranslationWorkspace adminKey={adminKey} />;
      case 'translators': return <TranslatorsPage adminKey={adminKey} />;
      case 'settings': return <SettingsPage adminKey={adminKey} />;
      default: return <ProjectsPage adminKey={adminKey} />;
    }
  };

  if (!adminKey) return <AdminLogin onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default AdminApp;
