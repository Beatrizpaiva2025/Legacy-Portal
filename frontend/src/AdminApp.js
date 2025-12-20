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
  // Major Languages
  "English", "English (USA)", "English (UK)",
  "Spanish", "Spanish (Spain)", "Spanish (Latin America)",
  "Portuguese", "Portuguese (Brazil)", "Portuguese (Portugal)",
  "French", "French (France)", "French (Canada)",
  "German", "Italian", "Dutch",
  // Asian Languages
  "Chinese (Simplified)", "Chinese (Traditional)", "Japanese", "Korean",
  "Vietnamese", "Thai", "Indonesian", "Malay", "Filipino/Tagalog", "Hindi",
  "Bengali", "Punjabi", "Tamil", "Telugu", "Urdu", "Gujarati", "Nepali",
  "Burmese", "Khmer", "Lao", "Mongolian",
  // Middle Eastern & African
  "Arabic", "Arabic (Saudi Arabia)", "Hebrew", "Turkish", "Persian/Farsi",
  "Swahili", "Amharic", "Somali", "Yoruba", "Igbo", "Zulu", "Afrikaans",
  // European Languages
  "Russian", "Polish", "Ukrainian", "Czech", "Slovak", "Hungarian",
  "Romanian", "Bulgarian", "Greek", "Serbian", "Croatian", "Slovenian",
  "Swedish", "Norwegian", "Danish", "Finnish", "Icelandic",
  "Albanian", "Armenian", "Georgian", "Azerbaijani", "Kazakh", "Uzbek",
  "Lithuanian", "Latvian", "Estonian", "Maltese", "Belarusian",
  "Bosnian", "Macedonian", "Luxembourgish",
  // Celtic & Regional
  "Welsh", "Irish", "Scottish Gaelic", "Catalan", "Basque", "Galician",
  // Creole & Other
  "Haitian Creole", "Cape Verdean Creole", "Papiamento", "Latin", "Esperanto"
];

const TRANSLATORS = [
  { name: "Beatriz Paiva", title: "Managing Director" },
  { name: "Ana Clara", title: "Project Manager" },
  { name: "Yasmin Costa", title: "Certified Translator" },
  { name: "Noemi Santos", title: "Senior Translator" }
];

// ==================== ADMIN LOGIN ====================
const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useAdminKey, setUseAdminKey] = useState(false); // Fallback to admin key login
  const [adminKey, setAdminKey] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (useAdminKey) {
        // Legacy admin key login (for backward compatibility)
        const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
        if (response.data) {
          onLogin({ adminKey, role: 'admin', name: 'Admin', email: 'admin@legacy.com' });
        }
      } else {
        // New user-based login
        const response = await axios.post(`${API}/admin/auth/login`, { email, password });
        if (response.data && response.data.token) {
          onLogin({
            adminKey: response.data.token,
            token: response.data.token,
            role: response.data.role,
            name: response.data.name,
            email: response.data.email,
            id: response.data.id
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
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
          {useAdminKey ? (
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
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          <button
            onClick={() => setUseAdminKey(!useAdminKey)}
            className="text-gray-500 hover:text-teal-600 text-xs"
          >
            {useAdminKey ? '← Login with email' : 'Use admin key instead'}
          </button>
          <div>
            <a href="/" className="text-teal-600 hover:underline text-xs">← Back to Partner Portal</a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== NOTIFICATION BELL ====================
const NotificationBell = ({ adminKey, user, onNotificationClick }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.token) return;
    try {
      const response = await axios.get(`${API}/admin/notifications?admin_key=${adminKey}&token=${user.token}`);
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.token]);

  const markAsRead = async (notifId) => {
    try {
      await axios.put(`${API}/admin/notifications/${notifId}/read?admin_key=${adminKey}&token=${user.token}`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/admin/notifications/read-all?admin_key=${adminKey}&token=${user.token}`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute left-full top-0 ml-2 w-72 bg-white rounded-lg shadow-xl z-50 text-gray-800 max-h-96 overflow-hidden">
          <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
            <span className="font-bold text-xs">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-blue-600 hover:text-blue-800">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-xs">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => { markAsRead(notif.id); if (onNotificationClick) onNotificationClick(notif); }}
                  className={`p-2 border-b cursor-pointer hover:bg-gray-50 ${!notif.is_read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start">
                    <span className="text-sm mr-2">
                      {notif.type === 'project_assigned' ? '📋' : notif.type === 'revision_requested' ? '🔄' : '📌'}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-xs">{notif.title}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{notif.message}</div>
                      <div className="text-[9px] text-gray-400 mt-1">
                        {new Date(notif.created_at).toLocaleString()}
                      </div>
                    </div>
                    {!notif.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== COMPACT SIDEBAR ====================
const Sidebar = ({ activeTab, setActiveTab, onLogout, user, adminKey }) => {
  // Define menu items with role-based access
  const allMenuItems = [
    { id: 'projects', label: 'Projects', icon: '📋', roles: ['admin', 'pm', 'sales'] },
    { id: 'translation', label: 'Translation', icon: '✍️', roles: ['admin', 'pm', 'translator'] },
    { id: 'production', label: 'Production', icon: '📊', roles: ['admin'] },
    { id: 'users', label: 'Users', icon: '👤', roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: '⚙️', roles: ['admin'] }
  ];

  // Filter menu items based on user role
  const userRole = user?.role || 'admin';
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  // Role display names and colors
  const roleConfig = {
    admin: { label: 'Administrator', color: 'bg-red-500' },
    pm: { label: 'Project Manager', color: 'bg-blue-500' },
    translator: { label: 'Translator', color: 'bg-green-500' },
    sales: { label: 'Sales', color: 'bg-purple-500' }
  };

  const roleInfo = roleConfig[userRole] || roleConfig.admin;

  const handleNotificationClick = (notif) => {
    // Navigate to the relevant project if it's a project notification
    if (notif.order_id && (notif.type === 'project_assigned' || notif.type === 'revision_requested')) {
      setActiveTab('translation');
    }
  };

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
        {/* User info */}
        {user && (
          <div className="mt-3 pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-white truncate">{user.name}</div>
                <div className={`inline-block mt-1 px-2 py-0.5 ${roleInfo.color} rounded text-[9px] font-medium`}>
                  {roleInfo.label}
                </div>
              </div>
              <NotificationBell adminKey={adminKey} user={user} onNotificationClick={handleNotificationClick} />
            </div>
          </div>
        )}
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
const TranslationWorkspace = ({ adminKey, selectedOrder, onBack }) => {
  // State
  const [activeSubTab, setActiveSubTab] = useState('start');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState('default');
  const [customCoverLetters, setCustomCoverLetters] = useState(() => {
    const saved = localStorage.getItem('custom_cover_letters');
    return saved ? JSON.parse(saved) : [];
  });
  const [files, setFiles] = useState([]);
  const [ocrResults, setOcrResults] = useState([]);
  const [translationResults, setTranslationResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  // Config state - initialize from selectedOrder if available
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

  // Workflow Mode: 'ai', 'external', or 'ocr'
  const [workflowMode, setWorkflowMode] = useState('ai');
  const [documentCategory, setDocumentCategory] = useState('general'); // 'financial', 'education', 'general', 'personal'
  const [externalOriginalImages, setExternalOriginalImages] = useState([]); // Original document images
  const [externalTranslationText, setExternalTranslationText] = useState(''); // External translation text
  const [externalTranslationImages, setExternalTranslationImages] = useState([]); // External translation as images (if PDF)

  // Correction state
  const [correctionCommand, setCorrectionCommand] = useState('');
  const [applyingCorrection, setApplyingCorrection] = useState(false);
  const [claudeNotes, setClaudeNotes] = useState(''); // Notes/changes made by Claude

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
  const externalOriginalInputRef = useRef(null);
  const externalTranslationInputRef = useRef(null);

  // OCR Editor state
  const [ocrFontFamily, setOcrFontFamily] = useState('monospace');
  const [ocrFontSize, setOcrFontSize] = useState('12px');
  const [useClaudeOcr, setUseClaudeOcr] = useState(true); // Default to Claude for better formatting
  const [ocrSpecialCommands, setOcrSpecialCommands] = useState('Maintain the EXACT original layout and formatting. Preserve all line breaks, spacing, and document structure. Extract tables with proper alignment.');

  // Approval checkboxes state
  const [approvalChecks, setApprovalChecks] = useState({
    projectNumber: false,
    languageCorrect: false,
    proofread: false,
    namesAccurate: false,
    formattingPreserved: false,
    translatorNotes: false,
    readyForDelivery: false
  });
  const [saveToTM, setSaveToTM] = useState(true); // Save to Translation Memory on approval

  // Quick Package state (for ready translations)
  const [quickPackageMode, setQuickPackageMode] = useState(false);
  const [quickTranslationFiles, setQuickTranslationFiles] = useState([]); // Ready translation files
  const [quickOriginalFiles, setQuickOriginalFiles] = useState([]); // Original document files

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

  // Pre-fill from selectedOrder when coming from Projects
  useEffect(() => {
    if (selectedOrder) {
      // Set order number
      setOrderNumber(selectedOrder.order_number || '');

      // Set languages from order
      if (selectedOrder.translate_from) setSourceLanguage(selectedOrder.translate_from);
      if (selectedOrder.translate_to) setTargetLanguage(selectedOrder.translate_to);

      // Set translator if assigned
      if (selectedOrder.assigned_translator) {
        setSelectedTranslator(selectedOrder.assigned_translator);
      }

      // Set translation type
      if (selectedOrder.translation_type) {
        setTranslationType(selectedOrder.translation_type === 'certified' ? 'certified' : 'professional');
      }

      // Pre-select this order for sending
      setSelectedOrderId(selectedOrder.id);

      // Show status
      setProcessingStatus(`📋 Working on order ${selectedOrder.order_number} - ${selectedOrder.client_name}`);

      // Skip to start tab
      setActiveSubTab('start');
    }
  }, [selectedOrder]);

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
        setProcessingStatus('✅ Translation sent to Projects! Returning to Projects...');
        setSelectedOrderId('');

        // Navigate back to Projects after a short delay
        if (onBack) {
          setTimeout(() => {
            onBack();
          }, 1500);
        }

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

  // Handle external original document upload
  const handleExternalOriginalUpload = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const imagePromises = selectedFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ filename: file.name, data: reader.result });
        reader.readAsDataURL(file);
      });
    });
    Promise.all(imagePromises).then(images => {
      setExternalOriginalImages(images);
      // Also set as originalImages for certificate generation
      setOriginalImages(images);
      setProcessingStatus(`✅ ${images.length} original document(s) uploaded`);
    });
  };

  // Handle external translation upload (text or images)
  const handleExternalTranslationUpload = (event) => {
    const selectedFiles = Array.from(event.target.files);

    // Check if any file is a text file
    const textFiles = selectedFiles.filter(f => f.type === 'text/plain' || f.name.endsWith('.txt'));
    const imageFiles = selectedFiles.filter(f => !f.type.includes('text'));

    if (textFiles.length > 0) {
      // Read all text files and combine
      const textPromises = textFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsText(file);
        });
      });
      Promise.all(textPromises).then(texts => {
        setExternalTranslationText(texts.join('\n\n--- Page Break ---\n\n'));
        setProcessingStatus(`✅ ${textFiles.length} translation text file(s) uploaded`);
      });
    }

    if (imageFiles.length > 0) {
      // Image/PDF - read as base64
      const imagePromises = imageFiles.map(f => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ filename: f.name, data: reader.result });
          reader.readAsDataURL(f);
        });
      });
      Promise.all(imagePromises).then(images => {
        setExternalTranslationImages(images);
        setProcessingStatus(`✅ ${images.length} translation document(s) uploaded`);
      });
    }
  };

  // Send external translation to Review
  const handleExternalToReview = () => {
    if (externalOriginalImages.length === 0) {
      alert('Please upload the original document first');
      return;
    }
    if (!externalTranslationText && externalTranslationImages.length === 0) {
      alert('Please upload or paste the translation');
      return;
    }

    // Create translation results for review
    const results = [];

    if (externalTranslationText) {
      // If we have text, create one result per original page
      // Split text by page breaks if present
      const textPages = externalTranslationText.split(/---\s*Page\s*Break\s*---/i).map(t => t.trim()).filter(t => t);

      externalOriginalImages.forEach((img, idx) => {
        results.push({
          original: img.data,
          translatedText: textPages[idx] || textPages[0] || externalTranslationText,
          filename: img.filename || `page_${idx + 1}`
        });
      });
    } else if (externalTranslationImages.length > 0) {
      // If we have translation images, pair them with originals
      externalOriginalImages.forEach((origImg, idx) => {
        const transImg = externalTranslationImages[idx] || externalTranslationImages[0];
        results.push({
          original: origImg.data,
          translatedText: `<div style="text-align:center;"><img src="${transImg.data}" style="max-width:100%; height:auto;" alt="Translation page ${idx + 1}" /></div>`,
          filename: origImg.filename || `page_${idx + 1}`
        });
      });
    }

    if (results.length > 0) {
      setTranslationResults(results);
    }

    setActiveSubTab('review');
    setProcessingStatus('✅ Ready for review');
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
      alert('API Key is required for AI OCR. Please add it in Setup tab.');
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
      alert('Please configure your API Key in the Setup tab');
      setActiveSubTab('start');
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
      alert('Please configure your API Key in the Setup tab');
      setActiveSubTab('start');
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
        let translationText = response.data.translation;
        let notesText = '';

        // Extract notes/changes made by Claude (text after "**Changes made:**" or similar patterns)
        const notesPatterns = [
          /(\*\*Changes made:\*\*[\s\S]*?)$/i,
          /(\*\*Corrections:\*\*[\s\S]*?)$/i,
          /(\*\*Notes:\*\*[\s\S]*?)$/i,
          /(Note:[\s\S]*?changes[\s\S]*?)$/i,
          /(\*\*Altera[çc][õo]es:\*\*[\s\S]*?)$/i,
          /(\*\*Corre[çc][õo]es:\*\*[\s\S]*?)$/i,
          /(\*\*Observa[çc][õo]es:\*\*[\s\S]*?)$/i,
          /(---\s*\n[\s\S]*?(?:changes|alterações|correções|notes|notas)[\s\S]*?)$/i,
          /(<hr[\s\S]*?>[\s\S]*?(?:changes|alterações|correções|notes|notas)[\s\S]*?)$/i,
          /(I (?:made|applied|corrected|changed|fixed)[\s\S]*?)$/i,
          /(Eu (?:fiz|apliquei|corrigi|mudei|alterei)[\s\S]*?)$/i,
          /(Here are the changes[\s\S]*?)$/i,
          /(The following changes[\s\S]*?)$/i,
          /(Summary of changes[\s\S]*?)$/i,
          /(As alterações foram[\s\S]*?)$/i
        ];

        for (const pattern of notesPatterns) {
          const match = translationText.match(pattern);
          if (match) {
            notesText = match[1].trim();
            translationText = translationText.replace(pattern, '').trim();
            break;
          }
        }

        // Also check for notes at the beginning (outside of HTML)
        if (!notesText && !translationText.startsWith('<!DOCTYPE') && !translationText.startsWith('<html')) {
          const htmlStart = translationText.search(/<(!DOCTYPE|html)/i);
          if (htmlStart > 0) {
            notesText = translationText.substring(0, htmlStart).trim();
            translationText = translationText.substring(htmlStart).trim();
          }
        }

        const updatedResults = [...translationResults];
        updatedResults[selectedResultIndex] = {
          ...currentResult,
          translatedText: translationText
        };
        setTranslationResults(updatedResults);

        // Save notes separately
        if (notesText) {
          setClaudeNotes(prev => prev ? prev + '\n\n---\n\n' + notesText : notesText);
        }

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

  // Quick Package file handlers
  const handleQuickTranslationUpload = async (e) => {
    const files = Array.from(e.target.files);
    const processedFiles = [];

    for (const file of files) {
      const base64 = await fileToBase64(file);
      processedFiles.push({
        filename: file.name,
        data: base64,
        type: file.type
      });
    }
    setQuickTranslationFiles(prev => [...prev, ...processedFiles]);
  };

  const handleQuickOriginalUpload = async (e) => {
    const files = Array.from(e.target.files);
    const processedFiles = [];

    for (const file of files) {
      const base64 = await fileToBase64(file);
      processedFiles.push({
        filename: file.name,
        data: base64,
        type: file.type
      });
    }
    setQuickOriginalFiles(prev => [...prev, ...processedFiles]);
  };

  // Quick Package Download - generates complete certified translation package (same layout as normal flow)
  const handleQuickPackageDownload = () => {
    const translator = TRANSLATORS.find(t => t.name === selectedTranslator);
    const pageSizeCSS = pageFormat === 'a4' ? 'A4' : 'Letter';
    const certTitle = translationType === 'sworn' ? 'Sworn Translation Certificate' : 'Certification of Translation Accuracy';

    // Cover Letter HTML (SAME as handleDownload)
    const coverLetterHTML = `
    <!-- COVER LETTER PAGE -->
    <div class="cover-page">
        <!-- HEADER WITH LOGOS -->
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
                ${signatureImage
                  ? `<img src="${signatureImage}" alt="Signature" style="max-height: 32px; max-width: 150px; object-fit: contain; margin-bottom: 2px;" />`
                  : `<div style="font-family: 'Rage Italic', cursive; font-size: 20px; color: #1a365d; margin-bottom: 2px;">Beatriz Paiva</div>`}
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

    // Letterhead for all pages (SAME as handleDownload) with blue line
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
        </div>
        <div class="header-line"></div>`;

    // Translation pages with letterhead (uploaded images)
    const translationPagesHTML = quickTranslationFiles.map((file, idx) => `
    <div class="translation-page">
        ${includeLetterhead ? letterheadHTML : ''}
        <div class="translation-content">
            <img src="${file.data}" alt="Translation page ${idx + 1}" class="translation-image" />
        </div>
    </div>`).join('');

    // Original document pages (SAME structure as handleDownload)
    const originalPagesHTML = (includeOriginal && quickOriginalFiles.length > 0) ? quickOriginalFiles.map((file, idx) => `
    <div class="original-documents-page">
        ${includeLetterhead ? letterheadHTML : ''}
        ${idx === 0 ? '<div class="page-title">Original Document</div>' : ''}
        <div class="original-image-container">
            <img src="${file.data}" alt="Original page ${idx + 1}" class="original-image" />
        </div>
    </div>`).join('') : '';

    // Complete HTML with SAME styles as handleDownload
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${certTitle} - ${orderNumber || 'Document'}</title>
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
        .cover-page { page-break-after: always; }
        .header-line { width: 100%; height: 2px; background: linear-gradient(to right, #93c5fd, #3b82f6, #93c5fd); margin-bottom: 15px; }
        .translation-page { page-break-before: always; padding-top: 20px; }
        .translation-content { text-align: center; }
        .translation-image { max-width: 100%; max-height: 700px; border: 1px solid #ddd; object-fit: contain; }
        .page-title { font-size: 14px; font-weight: bold; text-align: center; margin: 20px 0; padding-bottom: 10px; border-bottom: 2px solid #2563eb; color: #1a365d; text-transform: uppercase; letter-spacing: 2px; }
        .original-documents-page { page-break-before: always; padding-top: 20px; }
        .original-image-container { text-align: center; margin-bottom: 15px; }
        .original-image { max-width: 100%; max-height: 600px; border: 1px solid #ddd; object-fit: contain; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    ${includeCover ? coverLetterHTML : ''}
    ${translationPagesHTML}
    ${originalPagesHTML}
</body>
</html>`;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(fullHTML);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  // Save Translation Memory
  const saveTranslationMemory = async () => {
    if (!saveToTM || translationResults.length === 0) return;

    const typeLabels = {
      'financial': 'Financial',
      'education': 'Education',
      'general': 'General',
      'personal': 'Personal Documents'
    };

    // Extract text from translations (strip HTML)
    const extractText = (html) => {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      return temp.textContent || temp.innerText || '';
    };

    // Create TM entry
    const tmEntry = {
      id: Date.now(),
      name: `TM - ${documentType || 'Document'} - ${new Date().toLocaleDateString()}`,
      sourceLang: sourceLanguage,
      targetLang: targetLanguage,
      field: typeLabels[documentCategory] || 'General',
      bidirectional: false,
      terms: translationResults.map((result, idx) => ({
        source: result.originalText || extractText(result.original || ''),
        target: extractText(result.translatedText || ''),
        context: `Page ${idx + 1} - ${orderNumber || 'No order'}`
      })).filter(t => t.source && t.target)
    };

    if (tmEntry.terms.length > 0) {
      // Save to glossaries
      const newGlossaries = [...glossaries, tmEntry];
      setGlossaries(newGlossaries);

      // Persist to backend
      try {
        await axios.post(`${API_BASE_URL}/glossaries`, tmEntry, { withCredentials: true });
      } catch (err) {
        // Save to localStorage as fallback
        localStorage.setItem('glossaries', JSON.stringify(newGlossaries));
      }
    }
  };

  // Download certificate
  const handleDownload = (format = 'html') => {
    // Save TM if enabled
    if (saveToTM) {
      saveTranslationMemory();
    }

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
                ${signatureImage
                  ? `<img src="${signatureImage}" alt="Signature" style="max-height: 32px; max-width: 150px; object-fit: contain; margin-bottom: 2px;" />`
                  : `<div style="font-family: 'Rage Italic', cursive; font-size: 20px; color: #1a365d; margin-bottom: 2px;">Beatriz Paiva</div>`}
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

    // Letterhead for all pages with blue line
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
        </div>
        <div class="header-line"></div>`;

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
        .header-line { width: 100%; height: 2px; background: linear-gradient(to right, #93c5fd, #3b82f6, #93c5fd); margin-bottom: 15px; }
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
      {/* Header with order info and back button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-bold text-blue-600">TRANSLATION WORKSPACE</h1>
          {selectedOrder && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
              <span className="text-blue-600 text-xs font-medium">📋 {selectedOrder.order_number}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600 text-xs">{selectedOrder.client_name}</span>
              <span className="text-gray-400">|</span>
              <span className="text-xs text-gray-500">{selectedOrder.translate_from} → {selectedOrder.translate_to}</span>
            </div>
          )}
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 flex items-center"
          >
            <span className="mr-1">←</span> Back to Projects
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex space-x-1 mb-4 border-b overflow-x-auto">
        {[
          { id: 'start', label: 'START', icon: '📝' },
          { id: 'translate', label: 'TRANSLATE', icon: '📄' },
          { id: 'review', label: 'REVIEW', icon: '🔍' },
          { id: 'deliver', label: 'DELIVER', icon: '✅' }
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

      {/* START TAB - Combined Setup & Cover Letter */}
      {activeSubTab === 'start' && (
        <div className="space-y-4">
          {/* Quick Start Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-xs text-blue-700">
              <strong>Quick Start:</strong> 1️⃣ Setup Cover Letter → 2️⃣ Upload Document → 3️⃣ Review → 4️⃣ Deliver
            </p>
          </div>

          {/* API Key - Collapsible */}
          <div className="bg-white rounded shadow">
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">🔑</span>
                <span className="text-sm font-medium">API Key Settings</span>
                {claudeApiKey && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">✓ Configured</span>}
              </div>
              <span className="text-gray-400">{showApiKey ? '▼' : '▶'}</span>
            </button>
            {showApiKey && (
              <div className="p-4 border-t">
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
            )}
          </div>

          {/* Cover Letter Template Selector */}
          <div className="bg-white rounded shadow p-4">
            <h3 className="text-sm font-bold mb-3">📋 Cover Letter Template</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <button
                onClick={() => setSelectedCoverLetter('default')}
                className={`p-3 text-xs rounded border-2 transition-all ${selectedCoverLetter === 'default' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="font-bold">Default</div>
                <div className="text-[10px] text-gray-500">Standard Certificate</div>
              </button>
              <button
                onClick={() => setSelectedCoverLetter('rmv-ma')}
                className={`p-3 text-xs rounded border-2 transition-all ${selectedCoverLetter === 'rmv-ma' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="font-bold">RMV - Massachusetts</div>
                <div className="text-[10px] text-gray-500">Driver's License</div>
              </button>
              <button
                onClick={() => setSelectedCoverLetter('dmv-fl')}
                className={`p-3 text-xs rounded border-2 transition-all ${selectedCoverLetter === 'dmv-fl' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="font-bold">DMV - Florida</div>
                <div className="text-[10px] text-gray-500">Driver's License</div>
              </button>
              <button
                onClick={() => {
                  const name = prompt('Enter template name:');
                  if (name) {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf,.doc,.docx,.html';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const newTemplate = { id: Date.now(), name, content: ev.target.result, type: file.type };
                          const updated = [...customCoverLetters, newTemplate];
                          setCustomCoverLetters(updated);
                          localStorage.setItem('custom_cover_letters', JSON.stringify(updated));
                          setSelectedCoverLetter(`custom-${newTemplate.id}`);
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }
                }}
                className="p-3 text-xs rounded border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <div className="font-bold text-blue-600">+ Upload Custom</div>
                <div className="text-[10px] text-gray-500">Add your template</div>
              </button>
            </div>
            {/* Custom Templates */}
            {customCoverLetters.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Custom Templates:</p>
                <div className="flex flex-wrap gap-2">
                  {customCoverLetters.map(tpl => (
                    <div key={tpl.id} className="flex items-center">
                      <button
                        onClick={() => setSelectedCoverLetter(`custom-${tpl.id}`)}
                        className={`px-3 py-1.5 text-xs rounded-l border ${selectedCoverLetter === `custom-${tpl.id}` ? 'bg-blue-100 border-blue-500' : 'bg-gray-50 border-gray-200'}`}
                      >
                        {tpl.name}
                      </button>
                      <button
                        onClick={() => {
                          const updated = customCoverLetters.filter(t => t.id !== tpl.id);
                          setCustomCoverLetters(updated);
                          localStorage.setItem('custom_cover_letters', JSON.stringify(updated));
                          if (selectedCoverLetter === `custom-${tpl.id}`) setSelectedCoverLetter('default');
                        }}
                        className="px-2 py-1.5 text-xs bg-red-50 text-red-600 border border-l-0 border-red-200 rounded-r hover:bg-red-100"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Glossaries & Translation Memories Section - Collapsible */}
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
                  <option>Financial</option>
                  <option>Education</option>
                  <option>General</option>
                  <option>Personal Documents</option>
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
                        <option>Financial</option>
                        <option>Education</option>
                        <option>General</option>
                        <option>Personal Documents</option>
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

          {/* Certificate Logos Section */}
          <div className="bg-white rounded shadow p-4">
            <h3 className="text-xs font-bold text-gray-700 mb-3">🖼️ Certificate Logos & Signature</h3>
            <div className="grid grid-cols-4 gap-4">
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
                <input ref={logoLeftInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'left')} className="hidden" />
                <div className="flex justify-center gap-1 mt-2">
                  <button onClick={() => logoLeftInputRef.current?.click()} className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600">Upload</button>
                  {logoLeft && <button onClick={() => removeLogo('left')} className="px-2 py-1 bg-red-500 text-white text-[10px] rounded hover:bg-red-600">🗑️</button>}
                </div>
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
                <input ref={logoRightInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'right')} className="hidden" />
                <div className="flex justify-center gap-1 mt-2">
                  <button onClick={() => logoRightInputRef.current?.click()} className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600">Upload</button>
                  {logoRight && <button onClick={() => removeLogo('right')} className="px-2 py-1 bg-red-500 text-white text-[10px] rounded hover:bg-red-600">🗑️</button>}
                </div>
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
                <input ref={logoStampInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'stamp')} className="hidden" />
                <div className="flex justify-center gap-1 mt-2">
                  <button onClick={() => logoStampInputRef.current?.click()} className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600">Upload</button>
                  {logoStamp && <button onClick={() => removeLogo('stamp')} className="px-2 py-1 bg-red-500 text-white text-[10px] rounded hover:bg-red-600">🗑️</button>}
                </div>
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
                <input ref={signatureInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'signature')} className="hidden" />
                <div className="flex justify-center gap-1 mt-2">
                  <button onClick={() => signatureInputRef.current?.click()} className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600">Upload</button>
                  {signatureImage && <button onClick={() => removeLogo('signature')} className="px-2 py-1 bg-red-500 text-white text-[10px] rounded hover:bg-red-600">🗑️</button>}
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Preview - LIVE with Editable Fields */}
          <div className="bg-white rounded shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-blue-700">📄 Certificate Preview (Live)</h3>
              <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded">🔄 Edit highlighted fields directly</span>
            </div>

            {/* The Certificate Document */}
            <div className="border rounded p-8 bg-white" style={{fontFamily: 'Georgia, Times New Roman, serif', fontSize: '12px', lineHeight: '1.6', maxWidth: '800px', margin: '0 auto'}}>

              {/* Header with logos */}
              <div className="flex justify-between items-center mb-2 pb-2">
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
              {/* Light blue line below header */}
              <div className="w-full h-0.5 bg-blue-200 mb-4"></div>

              {/* Order Number */}
              <div className="text-right mb-6 text-sm">
                <span>Order # </span>
                <input type="text" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="font-bold border-b-2 border-blue-400 bg-blue-50 px-2 py-0.5 w-20 text-center focus:outline-none focus:border-blue-600" placeholder="P6287" />
              </div>

              {/* Main Title */}
              <h1 className="text-2xl text-center mb-6 font-normal" style={{color: '#1a365d'}}>Certification of Translation Accuracy</h1>

              {/* Translation of ... */}
              <p className="text-center mb-6 text-sm">
                Translation of{' '}
                <input type="text" value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="font-bold border-b-2 border-blue-400 bg-blue-50 px-2 py-0.5 w-32 text-center focus:outline-none focus:border-blue-600" placeholder="School Transcript" />
                {' '}from<br/>
                <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)} className="font-bold border-b-2 border-blue-400 bg-blue-50 px-2 py-0.5 focus:outline-none focus:border-blue-600 mt-1">
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
                {' '}to{' '}
                <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} className="font-bold border-b-2 border-blue-400 bg-blue-50 px-2 py-0.5 focus:outline-none focus:border-blue-600">
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

              {/* Signature and Stamp Section */}
              <div className="mt-8 flex justify-between items-end">
                <div>
                  {signatureImage ? (
                    <img src={signatureImage} alt="Signature" className="h-8 mb-1" style={{maxWidth: '150px'}} />
                  ) : (
                    <div className="mb-1" style={{fontFamily: 'Rage Italic, cursive', fontSize: '20px', color: '#1a365d'}}>Beatriz Paiva</div>
                  )}
                  <div className="text-xs">Authorized Representative</div>
                  <div className="text-xs">Legacy Translations Inc.</div>
                  <div className="text-xs mt-2">
                    Dated:{' '}
                    <input type="text" value={translationDate} onChange={(e) => setTranslationDate(e.target.value)} className="font-bold border-b-2 border-blue-400 bg-blue-50 px-2 py-0.5 w-28 focus:outline-none focus:border-blue-600" />
                  </div>
                </div>
                <div className="text-center">
                  {logoStamp ? (
                    <img src={logoStamp} alt="Stamp" className="w-28 h-28 object-contain" />
                  ) : (
                    <div className="w-28 h-28 rounded-full border-4 border-blue-600 flex flex-col items-center justify-center p-2" style={{borderStyle: 'double'}}>
                      <div className="text-[8px] text-blue-600 font-bold">CERTIFIED TRANSLATOR</div>
                      <div className="text-[10px] text-blue-600 font-bold mt-1">LEGACY TRANSLATIONS</div>
                      <div className="text-[8px] text-blue-600">ATA # 275993</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Page Format Section */}
          <div className="bg-white rounded shadow p-4">
            <h3 className="text-xs font-bold text-gray-700 mb-3">📄 Page Format</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Translation Type</label>
                <select value={translationType} onChange={(e) => saveTranslationType(e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded">
                  <option value="certified">Certified Translation</option>
                  <option value="sworn">Sworn Translation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Page Size</label>
                <select value={pageFormat} onChange={(e) => savePageFormat(e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded">
                  <option value="letter">Letter (8.5" x 11") - US Standard</option>
                  <option value="a4">A4 (210mm x 297mm) - International</option>
                </select>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setActiveSubTab('translate')}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center"
            >
              Next: Translate <span className="ml-2">→</span>
            </button>
          </div>
        </div>
      )}

      {/* DOCUMENT TAB - Direct Translation */}
      {activeSubTab === 'translate' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-2">📄 Document Translation</h2>

          {/* Translation Type Selector */}
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <label className="block text-xs font-medium text-purple-700 mb-2">📁 Document Type</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setDocumentCategory('financial')}
                className={`px-3 py-2 text-xs rounded-lg transition-all ${documentCategory === 'financial' ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-purple-100 border'}`}
              >
                📊 Financial
              </button>
              <button
                onClick={() => setDocumentCategory('education')}
                className={`px-3 py-2 text-xs rounded-lg transition-all ${documentCategory === 'education' ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-purple-100 border'}`}
              >
                🎓 Education
              </button>
              <button
                onClick={() => setDocumentCategory('general')}
                className={`px-3 py-2 text-xs rounded-lg transition-all ${documentCategory === 'general' ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-purple-100 border'}`}
              >
                📄 General
              </button>
              <button
                onClick={() => setDocumentCategory('personal')}
                className={`px-3 py-2 text-xs rounded-lg transition-all ${documentCategory === 'personal' ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-purple-100 border'}`}
              >
                👤 Personal
              </button>
            </div>
          </div>

          {/* Workflow Mode Switch */}
          <div className="mb-4 p-3 bg-gray-100 rounded-lg">
            <div className="flex items-center justify-center gap-3">
              <label className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all ${workflowMode === 'ai' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="workflowMode"
                  value="ai"
                  checked={workflowMode === 'ai'}
                  onChange={() => setWorkflowMode('ai')}
                  className="sr-only"
                />
                <span className="mr-2">🤖</span>
                <span className="text-sm font-medium">Translate with AI</span>
              </label>
              <label className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all ${workflowMode === 'external' ? 'bg-green-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="workflowMode"
                  value="external"
                  checked={workflowMode === 'external'}
                  onChange={() => setWorkflowMode('external')}
                  className="sr-only"
                />
                <span className="mr-2">📥</span>
                <span className="text-sm font-medium">External Translation</span>
              </label>
              <label className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all ${workflowMode === 'ocr' ? 'bg-gray-700 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="workflowMode"
                  value="ocr"
                  checked={workflowMode === 'ocr'}
                  onChange={() => setWorkflowMode('ocr')}
                  className="sr-only"
                />
                <span className="mr-2">📝</span>
                <span className="text-sm font-medium">OCR (CAT Tool)</span>
              </label>
            </div>
            <p className="text-[10px] text-gray-500 text-center mt-2">
              {workflowMode === 'ai' ? 'Upload document and translate with AI' : workflowMode === 'external' ? 'Upload original + existing translation for review' : 'Extract text for external CAT tools (SDL Trados, MemoQ, etc.)'}
            </p>
          </div>

          {/* ============ AI TRANSLATION MODE ============ */}
          {workflowMode === 'ai' && (
            <>
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
                    ⚠️ Please add your API Key in the Setup tab
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
              onClick={() => setActiveSubTab('start')}
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
            </>
          )}

          {/* ============ EXTERNAL TRANSLATION MODE ============ */}
          {workflowMode === 'external' && (
            <>
              {/* Language Selection for External */}
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
                <h3 className="text-xs font-bold text-green-700 mb-3">🌐 Translation Direction</h3>
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
                  <div className="pt-5 text-2xl text-green-500">→</div>
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

              {/* Side by Side Upload */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Original Document Upload */}
                <div className="border-2 border-dashed border-orange-300 rounded-lg p-4 bg-orange-50">
                  <h3 className="text-sm font-bold text-orange-700 mb-2 text-center">📄 Original Document</h3>
                  <div
                    className="text-center cursor-pointer hover:bg-orange-100 rounded p-4 transition-colors"
                    onClick={() => externalOriginalInputRef.current?.click()}
                  >
                    <input
                      ref={externalOriginalInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleExternalOriginalUpload}
                      className="hidden"
                    />
                    {externalOriginalImages.length > 0 ? (
                      <div>
                        <div className="text-3xl mb-2">✅</div>
                        <p className="text-xs text-orange-700 font-medium">{externalOriginalImages.length} file(s) uploaded</p>
                        <div className="mt-2 max-h-32 overflow-auto">
                          {externalOriginalImages.map((img, idx) => (
                            <img key={idx} src={img.data} alt={img.filename} className="max-h-24 mx-auto mb-1 border rounded" />
                          ))}
                        </div>
                        <button className="mt-2 px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600">
                          Change Files
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-3xl mb-2">📤</div>
                        <button className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600">
                          Upload Original
                        </button>
                        <p className="text-[10px] text-gray-500 mt-1">Image or PDF</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Translation Upload */}
                <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
                  <h3 className="text-sm font-bold text-green-700 mb-2 text-center">📝 Translation (External)</h3>
                  <div
                    className="text-center cursor-pointer hover:bg-green-100 rounded p-4 transition-colors"
                    onClick={() => externalTranslationInputRef.current?.click()}
                  >
                    <input
                      ref={externalTranslationInputRef}
                      type="file"
                      accept=".txt,.pdf,image/*"
                      onChange={handleExternalTranslationUpload}
                      className="hidden"
                    />
                    {externalTranslationText || externalTranslationImages.length > 0 ? (
                      <div>
                        <div className="text-3xl mb-2">✅</div>
                        <p className="text-xs text-green-700 font-medium">
                          {externalTranslationText ? 'Text uploaded' : `${externalTranslationImages.length} file(s) uploaded`}
                        </p>
                        <button className="mt-2 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                          Change File
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-3xl mb-2">📤</div>
                        <button className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                          Upload Translation
                        </button>
                        <p className="text-[10px] text-gray-500 mt-1">TXT, PDF, or Image</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Or paste translation text */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">Or paste translation text directly:</label>
                <textarea
                  value={externalTranslationText}
                  onChange={(e) => setExternalTranslationText(e.target.value)}
                  placeholder="Paste the translated text here..."
                  className="w-full h-40 px-3 py-2 text-sm border rounded font-mono"
                />
              </div>

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

              {/* Navigation for External Mode */}
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={() => setActiveSubTab('start')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 flex items-center"
                >
                  <span className="mr-2">←</span> Back: Details
                </button>
                <button
                  onClick={handleExternalToReview}
                  disabled={externalOriginalImages.length === 0 || (!externalTranslationText && externalTranslationImages.length === 0)}
                  className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                >
                  Go to Review <span className="ml-2">→</span>
                </button>
              </div>
            </>
          )}

          {/* ============ OCR MODE ============ */}
          {workflowMode === 'ocr' && (
            <>
              {/* File Upload for OCR */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-500 transition-colors mb-4"
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
                <div className="text-3xl mb-2">📝</div>
                <button className="px-4 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-800">
                  Upload Document for OCR
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  {files.length > 0 ? `${files.length} file(s) selected` : 'Images or PDF - Extract text for CAT tools'}
                </p>
              </div>

              {/* OCR Options */}
              {files.length > 0 && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
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
                      AI OCR (better formatting)
                    </label>
                  </div>

                  <button
                    onClick={handleOCR}
                    disabled={isProcessing || (useClaudeOcr && !claudeApiKey)}
                    className="w-full py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 disabled:bg-gray-300"
                  >
                    {isProcessing ? processingStatus : '🔍 Extract Text (OCR)'}
                  </button>

                  {/* OCR Results */}
                  {ocrResults.length > 0 && (
                    <div className="border rounded p-3 bg-white">
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
                        className="w-full h-40 text-xs font-mono border rounded p-2 bg-gray-50"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="mt-4 flex justify-start">
                <button
                  onClick={() => setActiveSubTab('start')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 flex items-center"
                >
                  <span className="mr-2">←</span> Back: Details
                </button>
              </div>
            </>
          )}
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
                    <select onMouseDown={(e) => e.preventDefault()} onChange={(e) => { execFormatCommand('fontName', e.target.value); }} className="px-1 py-1 text-[10px] border rounded" defaultValue="Georgia">
                      <option value="Arial">Arial</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Times New Roman">Times</option>
                      <option value="Courier New">Courier</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Tahoma">Tahoma</option>
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
                    ) : translationResults[selectedResultIndex]?.original ? (
                      // External translation: original image stored directly in results
                      translationResults[selectedResultIndex].filename?.toLowerCase().endsWith('.pdf') ? (
                        <embed src={translationResults[selectedResultIndex].original} type="application/pdf" className="w-full border shadow-sm" style={{height: '380px'}} />
                      ) : (
                        <img src={translationResults[selectedResultIndex].original} alt={translationResults[selectedResultIndex].filename || 'Original'} className="max-w-full border shadow-sm" />
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

              {/* Claude Notes/Changes - Separate Field */}
              {claudeNotes && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-green-700">
                      📝 Changes Made by Claude
                    </label>
                    <button
                      onClick={() => setClaudeNotes('')}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="text-xs text-green-800 bg-white p-2 rounded border border-green-200 whitespace-pre-wrap">
                    {claudeNotes}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={() => setActiveSubTab('translate')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 flex items-center"
                >
                  <span className="mr-2">←</span> Back: Document
                </button>
                <button
                  onClick={() => setActiveSubTab('deliver')}
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
                onClick={() => setActiveSubTab('translate')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Go to Document
              </button>
            </div>
          )}
        </div>
      )}

      {/* APPROVAL TAB */}
      {activeSubTab === 'deliver' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-2">✅ Approval & Delivery</h2>

          {/* Mode Switch: Normal vs Quick Package */}
          <div className="mb-4 p-3 bg-gray-100 rounded-lg">
            <div className="flex items-center justify-center gap-3">
              <label className={`flex items-center px-4 py-2 rounded-lg cursor-pointer transition-all ${!quickPackageMode ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  checked={!quickPackageMode}
                  onChange={() => setQuickPackageMode(false)}
                  className="sr-only"
                />
                <span className="mr-2">📝</span>
                <span className="text-sm font-medium">Normal Flow</span>
              </label>
              <label className={`flex items-center px-4 py-2 rounded-lg cursor-pointer transition-all ${quickPackageMode ? 'bg-green-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  checked={quickPackageMode}
                  onChange={() => setQuickPackageMode(true)}
                  className="sr-only"
                />
                <span className="mr-2">📦</span>
                <span className="text-sm font-medium">Quick Package</span>
              </label>
            </div>
            <p className="text-[10px] text-gray-500 text-center mt-2">
              {!quickPackageMode ? 'Use translation from previous flow' : 'Build package with ready translation (upload)'}
            </p>
          </div>

          {/* ============ QUICK PACKAGE MODE ============ */}
          {quickPackageMode && (
            <>
              {/* Certificate Fields */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
                <h3 className="text-sm font-bold text-blue-700 mb-3">📜 Certificate Information</h3>

                {/* Order Number */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Order #</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l text-sm">P</span>
                    <input
                      type="text"
                      value={orderNumber.replace('P', '')}
                      onChange={(e) => setOrderNumber('P' + e.target.value.replace(/\D/g, ''))}
                      placeholder="0000"
                      className="flex-1 px-3 py-2 text-sm border rounded-r"
                    />
                  </div>
                </div>

                {/* Document Type */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Translation of</label>
                  <input
                    type="text"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    placeholder="Birth Certificate"
                    className="w-full px-3 py-2 text-sm border rounded"
                  />
                </div>

                {/* Language Pair */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                    <select
                      value={sourceLanguage}
                      onChange={(e) => setSourceLanguage(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded"
                    >
                      {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded"
                    >
                      {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Upload Translation (Ready) */}
              <div className="p-4 bg-green-50 border border-green-200 rounded mb-4">
                <h3 className="text-sm font-bold text-green-700 mb-2">📄 Upload Ready Translation</h3>
                <p className="text-[10px] text-green-600 mb-3">Upload translation pages (will be adjusted with letterhead)</p>

                <div className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center cursor-pointer hover:border-green-500 transition-colors mb-2">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleQuickTranslationUpload}
                    className="hidden"
                    id="quick-translation-upload"
                  />
                  <label htmlFor="quick-translation-upload" className="cursor-pointer">
                    <div className="text-2xl mb-1">📤</div>
                    <span className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                      Upload Translation
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">Multiple files allowed</p>
                  </label>
                </div>

                {quickTranslationFiles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-green-700">{quickTranslationFiles.length} arquivo(s):</p>
                    {quickTranslationFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white px-2 py-1 rounded text-xs">
                        <span className="truncate">{file.filename}</span>
                        <button
                          onClick={() => setQuickTranslationFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Originals */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded mb-4">
                <h3 className="text-sm font-bold text-orange-700 mb-2">📑 Upload Original Documents</h3>
                <p className="text-[10px] text-orange-600 mb-3">Upload original document pages</p>

                <div className="border-2 border-dashed border-orange-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-500 transition-colors mb-2">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleQuickOriginalUpload}
                    className="hidden"
                    id="quick-original-upload"
                  />
                  <label htmlFor="quick-original-upload" className="cursor-pointer">
                    <div className="text-2xl mb-1">📤</div>
                    <span className="px-3 py-1.5 bg-orange-600 text-white text-xs rounded hover:bg-orange-700">
                      Upload Originais
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">Multiple files allowed</p>
                  </label>
                </div>

                {quickOriginalFiles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-orange-700">{quickOriginalFiles.length} arquivo(s):</p>
                    {quickOriginalFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white px-2 py-1 rounded text-xs">
                        <span className="truncate">{file.filename}</span>
                        <button
                          onClick={() => setQuickOriginalFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded mb-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2">⚙️ Options</h3>
                <div className="space-y-2">
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCover}
                      onChange={(e) => setIncludeCover(e.target.checked)}
                      className="mr-3 w-4 h-4"
                    />
                    <span>Include Certificate of Accuracy</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLetterhead}
                      onChange={(e) => setIncludeLetterhead(e.target.checked)}
                      className="mr-3 w-4 h-4"
                    />
                    <span>Include Letterhead on pages</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeOriginal}
                      onChange={(e) => setIncludeOriginal(e.target.checked)}
                      className="mr-3 w-4 h-4"
                    />
                    <span>Include Original Documents</span>
                  </label>
                </div>
              </div>

              {/* Document Order Preview */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded mb-4">
                <h3 className="text-sm font-bold text-purple-700 mb-2">📋 Final Document Order</h3>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  {includeCover && (
                    <>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">📜 Certificate</span>
                      <span className="text-gray-400">→</span>
                    </>
                  )}
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">📄 Translation ({quickTranslationFiles.length} pages)</span>
                  {includeOriginal && quickOriginalFiles.length > 0 && (
                    <>
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">📑 Original ({quickOriginalFiles.length} pages)</span>
                    </>
                  )}
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={handleQuickPackageDownload}
                disabled={quickTranslationFiles.length === 0}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white text-sm font-bold rounded-lg hover:from-green-700 hover:to-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                📦 Generate Complete Package (Print/PDF)
              </button>
              <p className="text-[10px] text-gray-500 mt-2 text-center">
                Opens print window - save as PDF
              </p>
            </>
          )}

          {/* ============ NORMAL FLOW ============ */}
          {!quickPackageMode && translationResults.length > 0 && (
            <>
              {/* Translation Approval Checklist */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded mb-4">
                <h3 className="text-sm font-bold text-purple-700 mb-3">📋 Translation Approval Checklist</h3>
                <div className="space-y-2">
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalChecks.projectNumber}
                      onChange={(e) => setApprovalChecks({...approvalChecks, projectNumber: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Did you include the correct project number?</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalChecks.languageCorrect}
                      onChange={(e) => setApprovalChecks({...approvalChecks, languageCorrect: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Is the source and target language correct?</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalChecks.proofread}
                      onChange={(e) => setApprovalChecks({...approvalChecks, proofread: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Did you proofread the entire document carefully?</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalChecks.namesAccurate}
                      onChange={(e) => setApprovalChecks({...approvalChecks, namesAccurate: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Are names, dates, numbers, and addresses accurate and consistent with the source document?</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalChecks.formattingPreserved}
                      onChange={(e) => setApprovalChecks({...approvalChecks, formattingPreserved: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Were formatting, layout, and page order preserved when applicable?</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalChecks.translatorNotes}
                      onChange={(e) => setApprovalChecks({...approvalChecks, translatorNotes: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">If applicable, did you include the correct translator's notes or annotations?</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalChecks.readyForDelivery}
                      onChange={(e) => setApprovalChecks({...approvalChecks, readyForDelivery: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Is the document ready for certification and final delivery?</span>
                  </label>
                </div>
              </div>

              {/* Non-Certified Translation Options */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded mb-4">
                <h3 className="text-sm font-bold text-orange-700 mb-2">📄 For non-certified translations</h3>
                <p className="text-[10px] text-orange-600 mb-3">Check to EXCLUDE from final document:</p>
                <div className="space-y-2">
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!includeCover}
                      onChange={(e) => setIncludeCover(!e.target.checked)}
                      className="mr-3 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="font-medium">Exclude Certificate of Accuracy</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!includeLetterhead}
                      onChange={(e) => setIncludeLetterhead(!e.target.checked)}
                      className="mr-3 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="font-medium">Exclude Letterhead</span>
                  </label>
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!includeOriginal}
                      onChange={(e) => setIncludeOriginal(!e.target.checked)}
                      className="mr-3 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="font-medium">Exclude Original Document</span>
                  </label>
                </div>
              </div>

              {/* Translation Memory Option */}
              <div className="p-4 bg-teal-50 border border-teal-200 rounded mb-4">
                <label className="flex items-center text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveToTM}
                    onChange={(e) => setSaveToTM(e.target.checked)}
                    className="mr-3 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-medium">💾 Save to Translation Memory</span>
                    <p className="text-[10px] text-teal-600 mt-0.5">
                      Category: {documentCategory === 'financial' ? '📊 Financial' : documentCategory === 'education' ? '🎓 Education' : documentCategory === 'personal' ? '👤 Personal' : '📄 General'}
                    </p>
                  </div>
                </label>
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
                    {includeLetterhead ? '✓ Letterhead on all pages' : '✗ No letterhead'}
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
          )}

          {/* No translations message - only in normal flow */}
          {!quickPackageMode && translationResults.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📄</div>
              <p className="text-xs">No translations yet. Complete the translation workflow first,</p>
              <p className="text-xs mb-4">or use <strong>Quick Package</strong> mode to upload ready translations.</p>
              <button
                onClick={() => setActiveSubTab('translate')}
                className="px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
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
const ProjectsPage = ({ adminKey, onTranslate, user }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigningTranslator, setAssigningTranslator] = useState(null); // Order ID being assigned

  // New Project Form
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [pmList, setPmList] = useState([]);
  const [translatorList, setTranslatorList] = useState([]);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProject, setNewProject] = useState({
    client_name: '',
    client_email: '',
    translate_from: 'Portuguese',
    translate_to: 'English',
    service_type: 'standard',
    page_count: 1,
    word_count: 0,
    urgency: 'no',
    notes: '',
    internal_notes: '',
    assigned_pm_id: '',
    assigned_translator_id: '',
    deadline: '',
    base_price: 0,
    total_price: 0
  });

  const LANGUAGES = ['Portuguese', 'English', 'Spanish', 'French', 'German', 'Italian', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Arabic'];

  useEffect(() => {
    fetchOrders();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const [pmRes, transRes] = await Promise.all([
        axios.get(`${API}/admin/users/by-role/pm?admin_key=${adminKey}`),
        axios.get(`${API}/admin/users/by-role/translator?admin_key=${adminKey}`)
      ]);
      setPmList(pmRes.data || []);
      setTranslatorList(transRes.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Use filtered endpoint for PM and Translator roles
      const userRole = user?.role || 'admin';
      const userToken = user?.token || '';

      if (userRole === 'admin') {
        // Admin sees all projects
        const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
        setOrders(response.data.orders || []);
      } else {
        // PM and Translator see only their assigned projects
        const response = await axios.get(`${API}/admin/orders/my-projects?admin_key=${adminKey}&token=${userToken}`);
        setOrders(response.data.orders || []);
      }
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

  // Assign translator to order
  const assignTranslator = async (orderId, translatorName) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}?admin_key=${adminKey}`, {
        assigned_translator: translatorName,
        translation_status: 'in_translation'
      });
      setAssigningTranslator(null);
      fetchOrders();
    } catch (err) {
      console.error('Failed to assign translator:', err);
    }
  };

  // Start translation - navigate to Translation Tool with order
  const startTranslation = (order) => {
    if (onTranslate) {
      onTranslate(order);
    }
  };

  // Create new project manually
  const createProject = async (e) => {
    e.preventDefault();
    setCreatingProject(true);
    try {
      await axios.post(`${API}/admin/orders/manual?admin_key=${adminKey}`, newProject);
      setShowNewProjectForm(false);
      setNewProject({
        client_name: '',
        client_email: '',
        translate_from: 'Portuguese',
        translate_to: 'English',
        service_type: 'standard',
        page_count: 1,
        word_count: 0,
        urgency: 'no',
        notes: '',
        internal_notes: '',
        assigned_pm_id: '',
        assigned_translator_id: '',
        deadline: '',
        base_price: 0,
        total_price: 0
      });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating project');
    } finally {
      setCreatingProject(false);
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
          <button
            onClick={() => setShowNewProjectForm(!showNewProjectForm)}
            className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700"
          >
            + New Project
          </button>
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

      {/* New Project Form */}
      {showNewProjectForm && (
        <div className="bg-white rounded-lg shadow mb-4 p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">📝 Create New Project</h3>
          <form onSubmit={createProject}>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {/* Client Info */}
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={newProject.client_name}
                  onChange={(e) => setNewProject({...newProject, client_name: e.target.value})}
                  required
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Client Email *</label>
                <input
                  type="email"
                  value={newProject.client_email}
                  onChange={(e) => setNewProject({...newProject, client_email: e.target.value})}
                  required
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  placeholder="client@email.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">From Language *</label>
                <select
                  value={newProject.translate_from}
                  onChange={(e) => setNewProject({...newProject, translate_from: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">To Language *</label>
                <select
                  value={newProject.translate_to}
                  onChange={(e) => setNewProject({...newProject, translate_to: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Service Type</label>
                <select
                  value={newProject.service_type}
                  onChange={(e) => setNewProject({...newProject, service_type: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  <option value="standard">Certified</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Pages</label>
                <input
                  type="number"
                  value={newProject.page_count}
                  onChange={(e) => setNewProject({...newProject, page_count: parseInt(e.target.value) || 1})}
                  min="1"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Urgency</label>
                <select
                  value={newProject.urgency}
                  onChange={(e) => setNewProject({...newProject, urgency: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  <option value="no">Normal</option>
                  <option value="priority">Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Deadline</label>
                <input
                  type="date"
                  value={newProject.deadline}
                  onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Price ($)</label>
                <input
                  type="number"
                  value={newProject.total_price}
                  onChange={(e) => setNewProject({...newProject, total_price: parseFloat(e.target.value) || 0, base_price: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="0.01"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Project Manager</label>
                <select
                  value={newProject.assigned_pm_id}
                  onChange={(e) => setNewProject({...newProject, assigned_pm_id: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  <option value="">-- Select PM --</option>
                  {pmList.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Translator</label>
                <select
                  value={newProject.assigned_translator_id}
                  onChange={(e) => setNewProject({...newProject, assigned_translator_id: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  <option value="">-- Select Translator --</option>
                  {translatorList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Client Notes</label>
                <input
                  type="text"
                  value={newProject.notes}
                  onChange={(e) => setNewProject({...newProject, notes: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  placeholder="Notes visible to client"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-[10px] font-medium text-gray-600 mb-1">Internal Notes (Admin/PM only)</label>
              <textarea
                value={newProject.internal_notes}
                onChange={(e) => setNewProject({...newProject, internal_notes: e.target.value})}
                className="w-full px-2 py-1.5 text-xs border rounded"
                rows="2"
                placeholder="Internal notes not visible to client or translator"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewProjectForm(false)} className="px-4 py-1.5 text-gray-600 text-xs">
                Cancel
              </button>
              <button type="submit" disabled={creatingProject} className="px-4 py-1.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:bg-gray-400">
                {creatingProject ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-blue-600">Code</th>
              <th className="px-2 py-2 text-left font-medium">Client</th>
              <th className="px-2 py-2 text-left font-medium">Translator</th>
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
                  <td className="px-2 py-2">
                    {assigningTranslator === order.id ? (
                      <select
                        autoFocus
                        className="px-1 py-0.5 text-[10px] border rounded w-24"
                        onChange={(e) => {
                          if (e.target.value) assignTranslator(order.id, e.target.value);
                        }}
                        onBlur={() => setAssigningTranslator(null)}
                      >
                        <option value="">Select...</option>
                        {TRANSLATORS.map(t => (
                          <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    ) : order.assigned_translator ? (
                      <span className="text-[10px] text-gray-700">{order.assigned_translator}</span>
                    ) : (
                      <button
                        onClick={() => setAssigningTranslator(order.id)}
                        className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] hover:bg-gray-200"
                      >
                        + Assign
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2">{deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {daysUntil > 0 && order.translation_status !== 'delivered' && <span className={`text-[10px] block ${daysUntil <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>in {daysUntil}d</span>}
                  </td>
                  <td className="px-2 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[order.translation_status] || 'bg-gray-100'}`}>{getStatusLabel(order.translation_status)}</span></td>
                  <td className="px-2 py-2"><span className="px-1 py-0.5 bg-gray-100 border rounded text-[10px]">{order.translation_type === 'certified' ? 'CERT' : 'PROF'}</span><span className="ml-1">{FLAGS[order.translate_to] || '🌐'}</span></td>
                  <td className="px-2 py-2 text-right font-medium">${order.total_price?.toFixed(2)}</td>
                  <td className="px-2 py-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] ${PAYMENT_COLORS[order.payment_status]}`}>{order.payment_status}</span></td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {/* Translate button - show for received or in_translation */}
                      {['received', 'in_translation'].includes(order.translation_status) && (
                        <button
                          onClick={() => startTranslation(order)}
                          className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px]"
                          title="Open Translation Tool"
                        >
                          ✍️
                        </button>
                      )}
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

// ==================== USERS MANAGEMENT PAGE ====================
const UsersPage = ({ adminKey }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'translator' });
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users?admin_key=${adminKey}&token=`);
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [adminKey]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post(`${API}/admin/auth/register?admin_key=${adminKey}`, newUser);
      setNewUser({ name: '', email: '', password: '', role: 'translator' });
      setShowCreateForm(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating user');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/toggle-active?admin_key=${adminKey}`);
      fetchUsers();
    } catch (err) {
      alert('Error toggling user status');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"?`)) return;
    try {
      await axios.delete(`${API}/admin/users/${userId}?admin_key=${adminKey}`);
      fetchUsers();
    } catch (err) {
      alert('Error deleting user');
    }
  };

  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    pm: 'bg-blue-100 text-blue-800',
    translator: 'bg-green-100 text-green-800',
    sales: 'bg-purple-100 text-purple-800'
  };

  if (loading) return <div className="p-6 text-center">Loading users...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">👤 User Management</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm"
        >
          + Create User
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="font-bold text-sm mb-3">Create New User</h3>
          <form onSubmit={handleCreateUser} className="grid grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              required
              className="px-3 py-2 text-sm border rounded"
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              required
              className="px-3 py-2 text-sm border rounded"
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              required
              className="px-3 py-2 text-sm border rounded"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              className="px-3 py-2 text-sm border rounded"
            >
              <option value="translator">Translator</option>
              <option value="pm">Project Manager</option>
              <option value="sales">Sales</option>
              <option value="admin">Admin</option>
            </select>
            <div className="col-span-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
              <button type="submit" disabled={creating} className="px-4 py-2 bg-teal-600 text-white rounded text-sm disabled:bg-gray-400">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[user.role]}`}>
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    onClick={() => handleToggleActive(user.id)}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-6 text-center text-gray-500">No users found. Create your first user above.</div>
        )}
      </div>
    </div>
  );
};

// ==================== PRODUCTION & PAYMENTS PAGE ====================
const ProductionPage = ({ adminKey }) => {
  const [stats, setStats] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('stats'); // stats, payments
  const [selectedTranslator, setSelectedTranslator] = useState(null);
  const [translatorOrders, setTranslatorOrders] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    translator_id: '',
    period_start: '',
    period_end: '',
    pages_count: 0,
    rate_per_page: 25.0,
    total_amount: 0,
    payment_method: '',
    payment_reference: '',
    notes: ''
  });

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/production/stats?admin_key=${adminKey}`);
      setStats(response.data.stats || []);
    } catch (err) {
      console.error('Error fetching production stats:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${API}/admin/payments?admin_key=${adminKey}`);
      setPayments(response.data.payments || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  const fetchTranslatorOrders = async (translatorId) => {
    try {
      const response = await axios.get(`${API}/admin/production/translator/${translatorId}/orders?admin_key=${adminKey}&status=completed`);
      setTranslatorOrders(response.data.orders || []);
    } catch (err) {
      console.error('Error fetching translator orders:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchPayments()]);
      setLoading(false);
    };
    loadData();
  }, [adminKey]);

  const handleSelectTranslator = async (translator) => {
    setSelectedTranslator(translator);
    await fetchTranslatorOrders(translator.translator_id);
  };

  const openPaymentModal = (translator) => {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    setPaymentForm({
      translator_id: translator.translator_id,
      period_start: firstOfMonth,
      period_end: today,
      pages_count: translator.pending_payment_pages || 0,
      rate_per_page: 25.0,
      total_amount: (translator.pending_payment_pages || 0) * 25.0,
      payment_method: 'bank_transfer',
      payment_reference: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/payments?admin_key=${adminKey}`, paymentForm);
      setShowPaymentModal(false);
      fetchStats();
      fetchPayments();
      alert('Pagamento registrado com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao registrar pagamento');
    }
  };

  const handleMarkAsPaid = async (paymentId) => {
    if (!window.confirm('Confirmar pagamento como realizado?')) return;
    try {
      await axios.put(`${API}/admin/payments/${paymentId}?admin_key=${adminKey}`, { status: 'paid' });
      fetchPayments();
      fetchStats();
    } catch (err) {
      alert('Erro ao atualizar pagamento');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Excluir este registro de pagamento?')) return;
    try {
      await axios.delete(`${API}/admin/payments/${paymentId}?admin_key=${adminKey}`);
      fetchPayments();
      fetchStats();
    } catch (err) {
      alert('Erro ao excluir pagamento');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  if (loading) return <div className="p-6 text-center">Carregando estatísticas...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">📊 Produção & Pagamentos</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('stats')}
            className={`px-4 py-2 rounded text-sm ${activeView === 'stats' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Estatísticas
          </button>
          <button
            onClick={() => setActiveView('payments')}
            className={`px-4 py-2 rounded text-sm ${activeView === 'payments' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Histórico de Pagamentos
          </button>
        </div>
      </div>

      {activeView === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Translator Stats Cards */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-sm font-bold text-gray-800">Tradutores</h2>
            </div>
            <div className="p-4 space-y-3">
              {stats.length === 0 ? (
                <div className="text-center text-gray-500 py-4">Nenhum tradutor encontrado</div>
              ) : (
                stats.map((translator) => (
                  <div
                    key={translator.translator_id}
                    onClick={() => handleSelectTranslator(translator)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTranslator?.translator_id === translator.translator_id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-gray-800">{translator.translator_name}</div>
                        <div className="text-xs text-gray-500">{translator.translator_email}</div>
                      </div>
                      {translator.pending_payment_pages > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openPaymentModal(translator); }}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          Registrar Pagamento
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-gray-100 rounded p-2">
                        <div className="text-gray-500">Total</div>
                        <div className="font-bold text-gray-800">{translator.total_pages}</div>
                      </div>
                      <div className="bg-green-100 rounded p-2">
                        <div className="text-green-600">Concluídas</div>
                        <div className="font-bold text-green-700">{translator.completed_pages}</div>
                      </div>
                      <div className="bg-blue-100 rounded p-2">
                        <div className="text-blue-600">Pagas</div>
                        <div className="font-bold text-blue-700">{translator.paid_pages}</div>
                      </div>
                      <div className="bg-yellow-100 rounded p-2">
                        <div className="text-yellow-600">A Pagar</div>
                        <div className="font-bold text-yellow-700">{translator.pending_payment_pages}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {translator.completed_orders} de {translator.orders_count} projetos concluídos
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Translator Orders */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-sm font-bold text-gray-800">
                {selectedTranslator ? `Projetos de ${selectedTranslator.translator_name}` : 'Selecione um tradutor'}
              </h2>
            </div>
            <div className="p-4">
              {!selectedTranslator ? (
                <div className="text-center text-gray-500 py-8">
                  Clique em um tradutor para ver seus projetos
                </div>
              ) : translatorOrders.length === 0 ? (
                <div className="text-center text-gray-500 py-4">Nenhum projeto concluído</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {translatorOrders.map((order) => (
                    <div key={order.id} className="p-3 border rounded-lg text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-800">{order.order_number || order.reference}</div>
                          <div className="text-gray-500">{order.client_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-teal-600">{order.page_count || 0} pág.</div>
                          <div className="text-gray-500">{formatDate(order.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeView === 'payments' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-sm font-bold text-gray-800">Histórico de Pagamentos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tradutor</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Período</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Páginas</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Valor</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Data Pag.</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      Nenhum pagamento registrado
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{payment.translator_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                      </td>
                      <td className="px-4 py-3 text-center">{payment.pages_count}</td>
                      <td className="px-4 py-3 text-center font-bold text-teal-600">
                        {formatCurrency(payment.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {payment.payment_date ? formatDate(payment.payment_date) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        {payment.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkAsPaid(payment.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Confirmar
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Registrar Pagamento</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleCreatePayment} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Período Início</label>
                  <input
                    type="date"
                    value={paymentForm.period_start}
                    onChange={(e) => setPaymentForm({...paymentForm, period_start: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Período Fim</label>
                  <input
                    type="date"
                    value={paymentForm.period_end}
                    onChange={(e) => setPaymentForm({...paymentForm, period_end: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Páginas</label>
                  <input
                    type="number"
                    value={paymentForm.pages_count}
                    onChange={(e) => {
                      const pages = parseInt(e.target.value) || 0;
                      setPaymentForm({
                        ...paymentForm,
                        pages_count: pages,
                        total_amount: pages * paymentForm.rate_per_page
                      });
                    }}
                    className="w-full px-3 py-2 border rounded text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Valor por Página ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.rate_per_page}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      setPaymentForm({
                        ...paymentForm,
                        rate_per_page: rate,
                        total_amount: paymentForm.pages_count * rate
                      });
                    }}
                    className="w-full px-3 py-2 border rounded text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Valor Total</label>
                <input
                  type="text"
                  value={formatCurrency(paymentForm.total_amount)}
                  readOnly
                  className="w-full px-3 py-2 border rounded text-sm bg-gray-100 font-bold text-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Método de Pagamento</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">Selecione...</option>
                  <option value="bank_transfer">Transferência Bancária</option>
                  <option value="paypal">PayPal</option>
                  <option value="pix">PIX</option>
                  <option value="check">Cheque</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Referência/ID da Transação</label>
                <input
                  type="text"
                  value={paymentForm.payment_reference}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_reference: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Notas</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  rows="2"
                  placeholder="Observações opcionais..."
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border rounded text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                >
                  Registrar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== MAIN APP ====================
function AdminApp() {
  const [adminKey, setAdminKey] = useState(null);
  const [user, setUser] = useState(null); // User info: { name, email, role, id }
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedOrder, setSelectedOrder] = useState(null); // Order selected for translation

  // Get current path
  const isTranslationTool = window.location.pathname.includes('/admin/translation-tool');

  useEffect(() => {
    const savedKey = localStorage.getItem('admin_key');
    const savedUser = localStorage.getItem('admin_user');
    if (savedKey) {
      setAdminKey(savedKey);
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          // Set default tab based on role
          if (parsedUser.role === 'translator') {
            setActiveTab('translation');
          }
        } catch (e) {
          console.error('Error parsing saved user:', e);
        }
      }
    }
  }, []);

  const handleLogin = (userData) => {
    // userData can be: { adminKey, role, name, email, id, token }
    const key = userData.adminKey || userData.token;
    setAdminKey(key);
    setUser(userData);
    localStorage.setItem('admin_key', key);
    localStorage.setItem('admin_user', JSON.stringify(userData));

    // Set default tab based on role
    if (userData.role === 'translator') {
      setActiveTab('translation');
    }
  };

  const handleLogout = async () => {
    // Try to logout from server if we have a token
    if (user?.token) {
      try {
        await axios.post(`${API}/admin/auth/logout?token=${user.token}`);
      } catch (e) {
        // Ignore logout errors
      }
    }
    setAdminKey(null);
    setUser(null);
    localStorage.removeItem('admin_key');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin';
  };

  // Navigate to translation with order
  const navigateToTranslation = (order) => {
    setSelectedOrder(order);
    setActiveTab('translation');
  };

  // Navigate back to projects
  const navigateToProjects = () => {
    setSelectedOrder(null);
    setActiveTab('projects');
  };

  const renderContent = () => {
    const userRole = user?.role || 'admin';

    switch (activeTab) {
      case 'projects':
        return userRole !== 'translator'
          ? <ProjectsPage adminKey={adminKey} onTranslate={navigateToTranslation} user={user} />
          : <div className="p-6 text-center text-gray-500">Access denied</div>;
      case 'translation':
        return <TranslationWorkspace adminKey={adminKey} selectedOrder={selectedOrder} onBack={navigateToProjects} user={user} />;
      case 'production':
        return userRole === 'admin'
          ? <ProductionPage adminKey={adminKey} />
          : <div className="p-6 text-center text-gray-500">Access denied</div>;
      case 'users':
        return userRole === 'admin'
          ? <UsersPage adminKey={adminKey} />
          : <div className="p-6 text-center text-gray-500">Access denied</div>;
      case 'settings':
        return userRole === 'admin'
          ? <SettingsPage adminKey={adminKey} />
          : <div className="p-6 text-center text-gray-500">Access denied</div>;
      default:
        return userRole !== 'translator'
          ? <ProjectsPage adminKey={adminKey} onTranslate={navigateToTranslation} user={user} />
          : <TranslationWorkspace adminKey={adminKey} selectedOrder={selectedOrder} onBack={navigateToProjects} user={user} />;
    }
  };

  if (!adminKey) return <AdminLogin onLogin={handleLogin} />;

  // If translation-tool route, render standalone page
  if (isTranslationTool) {
    return <TranslationToolPage adminKey={adminKey} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} user={user} adminKey={adminKey} />
      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default AdminApp;
