import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

// ==================== CONSTANTS ====================
const STATUS_COLORS = {
  'Quote': 'bg-gray-100 text-gray-700',
  'Confirmed': 'bg-blue-100 text-blue-700',
  'In progress': 'bg-yellow-100 text-yellow-700',
  'Completed': 'bg-green-100 text-green-700',
  'Client Review': 'bg-orange-100 text-orange-700',
  'Delivered': 'bg-teal-100 text-teal-700',
  'received': 'bg-gray-100 text-gray-700',
  'in_translation': 'bg-yellow-100 text-yellow-700',
  'review': 'bg-purple-100 text-purple-700',
  'client_review': 'bg-orange-100 text-orange-700',
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

const PROJECT_MANAGERS = [
  { name: "Ana Clara", title: "Project Manager" },
  { name: "Beatriz Paiva", title: "Managing Director" }
];

// ==================== SVG ICONS (Professional/Minimal) ====================
const EditIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const AssignIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const RefreshIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const NoteIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);

const MemoIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClockIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DocumentIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SendIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const PlayIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const EyeIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const SearchIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const MailIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const TrashIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CheckIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const UploadIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const WriteIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

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

// ==================== HORIZONTAL TOP BAR ====================
const TopBar = ({ activeTab, setActiveTab, onLogout, user, adminKey }) => {
  // Define menu items with role-based access
  const allMenuItems = [
    { id: 'projects', label: 'Projects', icon: '📋', roles: ['admin', 'pm', 'sales'] },
    { id: 'translation', label: 'Translation', icon: '✍️', roles: ['admin', 'pm', 'translator'] },
    { id: 'production', label: 'Reports', icon: '📊', roles: ['admin'] },
    { id: 'finances', label: 'Finances', icon: '💰', roles: ['admin'] },
    { id: 'users', label: 'Translators', icon: '👥', roles: ['admin', 'pm'], labelForPM: 'Translators' },
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

  return (
    <div className="bg-slate-800 text-white flex items-center justify-between px-4 py-2 text-xs">
      {/* Logo and Brand */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center text-sm">🌐</div>
          <div>
            <div className="font-bold text-sm">Legacy Admin</div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex items-center space-x-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center px-3 py-1.5 rounded transition-colors ${
              activeTab === item.id
                ? 'bg-teal-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span className="mr-1.5">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Info and Actions */}
      <div className="flex items-center space-x-3">
        {user && (
          <div className={`px-3 py-1 ${roleInfo.color} rounded text-[10px] font-medium text-center`}>
            {roleInfo.label}
          </div>
        )}
        <button
          onClick={onLogout}
          className="px-3 py-1.5 text-red-400 hover:bg-red-900/30 rounded text-xs"
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
const TranslationWorkspace = ({ adminKey, selectedOrder, onBack, user }) => {
  // State
  const [activeSubTab, setActiveSubTab] = useState('start');

  // Assigned orders for translator
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [selectedProjectFiles, setSelectedProjectFiles] = useState([]); // Files for selected project
  const [loadingProjectFiles, setLoadingProjectFiles] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null); // Currently loaded file
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
  const [quickTranslationFiles, setQuickTranslationFiles] = useState([]); // Ready translation files (images)
  const [quickTranslationHtml, setQuickTranslationHtml] = useState(''); // HTML content for translation (from Word/HTML/TXT)
  const [quickTranslationType, setQuickTranslationType] = useState('images'); // 'images' or 'html'
  const [quickOriginalFiles, setQuickOriginalFiles] = useState([]); // Original document files
  const [quickPackageLoading, setQuickPackageLoading] = useState(false); // Loading state for uploads
  const [quickPackageProgress, setQuickPackageProgress] = useState(''); // Progress message

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

  // Fetch assigned orders for translator/PM
  const fetchAssignedOrders = async () => {
    if (!user?.id) return;
    setLoadingAssigned(true);
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      // Filter orders assigned to this user (as translator or PM)
      const myOrders = (response.data.orders || []).filter(order =>
        order.assigned_translator_id === user.id ||
        order.assigned_pm_id === user.id ||
        order.assigned_translator === user.name ||
        order.assigned_pm_name === user.name
      ).filter(order =>
        ['received', 'in_translation', 'review'].includes(order.translation_status)
      );
      setAssignedOrders(myOrders);
    } catch (err) {
      console.error('Failed to fetch assigned orders:', err);
    } finally {
      setLoadingAssigned(false);
    }
  };

  useEffect(() => {
    // Fetch assigned orders for all roles (admin, pm, translator)
    if (user?.role) {
      fetchAssignedOrders();
    }
  }, [user]);

  // Select project and fetch its files
  const selectProject = async (order) => {
    setSelectedOrderId(order.id);
    setOrderNumber(order.order_number);
    if (order.translate_from) setSourceLanguage(order.translate_from);
    if (order.translate_to) setTargetLanguage(order.translate_to);
    setLoadingProjectFiles(true);
    setSelectedProjectFiles([]);
    setSelectedFileId(null);

    try {
      // Fetch documents for this order
      const response = await axios.get(`${API}/admin/orders/${order.id}/documents?admin_key=${adminKey}`);
      const docs = response.data.documents || [];
      setSelectedProjectFiles(docs);

      if (docs.length === 0) {
        setProcessingStatus(`⚠️ Nenhum documento encontrado para ${order.order_number}`);
      } else {
        setProcessingStatus(`📋 ${docs.length} arquivo(s) encontrado(s). Clique em um arquivo para carregar.`);
      }

      // Update order status to "in_translation" if it was "received"
      if (order.translation_status === 'received') {
        try {
          await axios.put(`${API}/admin/orders/${order.id}?admin_key=${adminKey}`, {
            translation_status: 'in_translation'
          });
          setAssignedOrders(prev => prev.map(o =>
            o.id === order.id ? { ...o, translation_status: 'in_translation' } : o
          ));
        } catch (e) {
          console.error('Failed to update status:', e);
        }
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setProcessingStatus(`❌ Erro ao buscar documentos: ${err.message}`);
    } finally {
      setLoadingProjectFiles(false);
    }
  };

  // Load a specific file from the project
  const loadProjectFile = async (doc) => {
    setProcessingStatus(`📂 Carregando "${doc.filename}"...`);
    try {
      const downloadResponse = await axios.get(`${API}/admin/order-documents/${doc.id}/download?admin_key=${adminKey}`);

      if (downloadResponse.data.file_data) {
        const contentType = downloadResponse.data.content_type || 'application/pdf';
        const base64Data = downloadResponse.data.file_data;

        // Convert base64 to File object for the workspace
        const byteString = atob(base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: contentType });
        const file = new File([blob], doc.filename || 'document.pdf', { type: blob.type });

        // Set the file in the workspace
        setFiles([file]);
        setSelectedFileId(doc.id);

        // Also set originalImages for PDF generation (needs data URL format)
        const dataUrl = `data:${contentType};base64,${base64Data}`;
        setOriginalImages([{ filename: doc.filename, data: dataUrl }]);

        setProcessingStatus(`✅ "${doc.filename}" carregado! Prossiga para traduzir.`);
        setActiveSubTab('translate');
      }
    } catch (err) {
      console.error('Failed to load file:', err);
      setProcessingStatus(`❌ Erro ao carregar arquivo: ${err.message}`);
    }
  };

  // Load document from order (legacy - loads first file automatically)
  const loadOrderDocument = async (order) => {
    await selectProject(order);
  };

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

  // Check if all approval checks are complete
  const isApprovalComplete = approvalChecks.projectNumber && approvalChecks.languageCorrect && approvalChecks.proofread;

  // Send translation to Projects
  const sendToProjects = async () => {
    // Validate document type
    if (!documentType.trim()) {
      alert('Please fill in the Document Type field');
      return;
    }

    // Validate approval checklist
    if (!isApprovalComplete) {
      alert('Please complete all items in the Approval Checklist before sending');
      return;
    }

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

  // Convert Word document (.docx) to HTML
  const convertWordToHtml = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const result = await mammoth.convertToHtml({ arrayBuffer });
          resolve(result.value);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Convert PDF to images (one image per page)
  const convertPdfToImages = async (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          const images = [];

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            if (onProgress) onProgress(pageNum, pdf.numPages);

            const page = await pdf.getPage(pageNum);
            const scale = 2; // Higher scale = better quality
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;

            // Convert canvas to base64 PNG
            const base64 = canvas.toDataURL('image/png').split(',')[1];
            images.push({
              filename: `${file.name}_page_${pageNum}.png`,
              data: base64,
              type: 'image/png'
            });
          }

          resolve(images);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Read HTML file content
  const readHtmlFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Read TXT file content
  const readTxtFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
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

    // Handle fontSize and fontName specially since execCommand doesn't work well for these
    if (command === 'fontSize' || command === 'fontName') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');

        if (command === 'fontSize') {
          // Map values 1-7 to actual pt sizes
          const sizeMap = { '1': '8pt', '2': '10pt', '3': '12pt', '4': '14pt', '5': '18pt', '6': '24pt', '7': '36pt' };
          span.style.fontSize = sizeMap[value] || value;
        } else if (command === 'fontName') {
          span.style.fontFamily = value;
        }

        try {
          span.appendChild(range.extractContents());
          range.insertNode(span);
          // Select the new span content
          selection.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          selection.addRange(newRange);
        } catch (e) {
          console.error('Error applying format:', e);
        }
      }
    } else {
      document.execCommand(command, false, value);
    }

    if (editableRef.current) {
      editableRef.current.focus();
    }
    // Save selection after command for next operation
    setTimeout(saveSelection, 0);
  };

  // Quick Package file handlers - with progress feedback and multi-format support
  const handleQuickTranslationUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setQuickPackageLoading(true);
    setQuickPackageProgress(`Processing ${files.length} translation file(s)...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.toLowerCase();
      setQuickPackageProgress(`Processing translation ${i + 1}/${files.length}: ${file.name}`);

      try {
        // Word document (.docx)
        if (fileName.endsWith('.docx')) {
          setQuickPackageProgress(`Converting Word document: ${file.name}`);
          const html = await convertWordToHtml(file);
          setQuickTranslationHtml(prev => prev + (prev ? '<div style="page-break-before: always;"></div>' : '') + html);
          setQuickTranslationType('html');
        }
        // HTML file
        else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
          setQuickPackageProgress(`Reading HTML: ${file.name}`);
          const html = await readHtmlFile(file);
          setQuickTranslationHtml(prev => prev + (prev ? '<div style="page-break-before: always;"></div>' : '') + html);
          setQuickTranslationType('html');
        }
        // Text file
        else if (fileName.endsWith('.txt')) {
          setQuickPackageProgress(`Reading text file: ${file.name}`);
          const text = await readTxtFile(file);
          const html = `<div style="white-space: pre-wrap; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6;">${text}</div>`;
          setQuickTranslationHtml(prev => prev + (prev ? '<div style="page-break-before: always;"></div>' : '') + html);
          setQuickTranslationType('html');
        }
        // PDF - convert to images
        else if (fileName.endsWith('.pdf')) {
          setQuickPackageProgress(`Converting PDF to images: ${file.name}`);
          const images = await convertPdfToImages(file, (page, total) => {
            setQuickPackageProgress(`Converting PDF page ${page}/${total}: ${file.name}`);
          });
          setQuickTranslationFiles(prev => [...prev, ...images]);
          if (!quickTranslationHtml) setQuickTranslationType('images');
        }
        // Images (JPG, PNG, etc.)
        else if (file.type.startsWith('image/')) {
          const base64 = await fileToBase64(file);
          setQuickTranslationFiles(prev => [...prev, {
            filename: file.name,
            data: base64,
            type: file.type
          }]);
          if (!quickTranslationHtml) setQuickTranslationType('images');
        }
        else {
          console.warn(`Unsupported file type: ${file.name}`);
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        setQuickPackageProgress(`⚠️ Error processing ${file.name}`);
      }
    }

    setQuickPackageLoading(false);
    setQuickPackageProgress(`✅ Translation file(s) ready`);
    setTimeout(() => setQuickPackageProgress(''), 3000);
  };

  const handleQuickOriginalUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setQuickPackageLoading(true);
    setQuickPackageProgress(`Processing ${files.length} original file(s)...`);
    const processedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.toLowerCase();
      setQuickPackageProgress(`Processing original ${i + 1}/${files.length}: ${file.name}`);

      try {
        // PDF - convert to images automatically
        if (fileName.endsWith('.pdf')) {
          setQuickPackageProgress(`Converting PDF to images: ${file.name}`);
          const images = await convertPdfToImages(file, (page, total) => {
            setQuickPackageProgress(`Converting PDF page ${page}/${total}: ${file.name}`);
          });
          processedFiles.push(...images);
        }
        // Images
        else if (file.type.startsWith('image/')) {
          const base64 = await fileToBase64(file);
          processedFiles.push({
            filename: file.name,
            data: base64,
            type: file.type
          });
        }
        else {
          console.warn(`Unsupported file type for original: ${file.name}`);
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
      }
    }

    setQuickOriginalFiles(prev => [...prev, ...processedFiles]);
    setQuickPackageLoading(false);
    setQuickPackageProgress(`✅ ${processedFiles.length} original page(s) ready`);
    setTimeout(() => setQuickPackageProgress(''), 3000);
  };

  // Quick Package Download - generates complete certified translation package (same layout as normal flow)
  const handleQuickPackageDownload = async () => {
    setQuickPackageLoading(true);
    setQuickPackageProgress('Generating package...');

    // Small delay to let UI update
    await new Promise(resolve => setTimeout(resolve, 100));

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

    // Translation pages - supports both HTML content and images
    let translationPagesHTML = '';

    // If we have HTML content (from Word/HTML/TXT)
    if (quickTranslationHtml) {
      // For HTML content, use a running header that appears on every printed page
      translationPagesHTML = `
    <div class="translation-text-page">
        ${includeLetterhead ? `
        <!-- Running header that repeats on each printed page -->
        <div class="running-header">
            ${letterheadHTML}
        </div>
        <div class="running-header-spacer"></div>
        ` : ''}
        <div class="translation-content translation-text">
            ${quickTranslationHtml}
        </div>
    </div>`;
    }

    // If we have image files (from images or PDF conversion)
    if (quickTranslationFiles.length > 0) {
      translationPagesHTML += quickTranslationFiles.map((file, idx) => `
    <div class="translation-page">
        ${includeLetterhead ? letterheadHTML : ''}
        <div class="translation-content">
            <img src="data:${file.type || 'image/png'};base64,${file.data}" alt="Translation page ${idx + 1}" class="translation-image" />
        </div>
    </div>`).join('');
    }

    // Original document pages (SAME structure as handleDownload)
    const originalPagesHTML = (includeOriginal && quickOriginalFiles.length > 0) ? quickOriginalFiles.map((file, idx) => `
    <div class="original-documents-page">
        ${includeLetterhead ? letterheadHTML : ''}
        ${idx === 0 ? '<div class="page-title">Original Document</div>' : ''}
        <div class="original-image-container">
            <img src="data:${file.type || 'image/png'};base64,${file.data}" alt="Original page ${idx + 1}" class="original-image" />
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
        .header-line {
            width: 100%;
            height: 3px;
            background: linear-gradient(to right, #93c5fd, #3b82f6, #93c5fd);
            margin-bottom: 15px;
            border: none;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .translation-page { page-break-before: always; padding-top: 20px; }
        .translation-content { text-align: center; }
        .translation-content.translation-text {
            text-align: left;
            font-family: 'Times New Roman', Georgia, serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
        }
        .translation-content.translation-text p { margin-bottom: 12px; text-align: justify; }
        .translation-content.translation-text table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .translation-content.translation-text td, .translation-content.translation-text th { border: 1px solid #333; padding: 8px; }
        .translation-content.translation-text h1, .translation-content.translation-text h2, .translation-content.translation-text h3 { margin: 15px 0 10px; color: #1a365d; }
        .translation-content.translation-text ul, .translation-content.translation-text ol { margin: 10px 0 10px 25px; }
        .translation-image { max-width: 100%; max-height: 700px; border: 1px solid #ddd; object-fit: contain; }
        .page-title { font-size: 14px; font-weight: bold; text-align: center; margin: 20px 0 15px 0; color: #1a365d; text-transform: uppercase; letter-spacing: 2px; }
        .original-documents-page { page-break-before: always; padding-top: 20px; }
        .original-image-container { text-align: center; margin-bottom: 15px; }
        .original-image { max-width: 100%; max-height: 600px; border: 1px solid #ddd; object-fit: contain; }
        @media print {
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header-line { background: linear-gradient(to right, #93c5fd, #3b82f6, #93c5fd) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

            /* Running header for HTML content pages */
            .running-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: white;
                padding: 20px 50px 10px;
            }
            .running-header-spacer {
                height: 100px;
            }
            .translation-text-page {
                page-break-before: always;
            }
            .translation-text-page:first-child {
                page-break-before: auto;
            }
        }
    </style>
</head>
<body>
    ${includeCover ? coverLetterHTML : ''}
    ${translationPagesHTML}
    ${originalPagesHTML}
</body>
</html>`;

    // Open in new window for printing - with proper handling for large documents
    setQuickPackageProgress(`Opening print preview (${quickTranslationFiles.length} translations + ${quickOriginalFiles.length} originals)...`);

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Pop-up blocked! Please allow pop-ups for this site.');
        setQuickPackageLoading(false);
        setQuickPackageProgress('');
        return;
      }

      // Write document in chunks for better browser handling
      printWindow.document.open();
      printWindow.document.write(fullHTML);
      printWindow.document.close();

      // Wait for all images to load before printing
      printWindow.onload = () => {
        setQuickPackageProgress('Package ready! Print dialog opening...');
        setTimeout(() => {
          printWindow.print();
          setQuickPackageLoading(false);
          setQuickPackageProgress('');
        }, 500);
      };

      // Fallback if onload doesn't fire (for some browsers)
      setTimeout(() => {
        if (quickPackageLoading) {
          setQuickPackageLoading(false);
          setQuickPackageProgress('');
        }
      }, 10000);
    } catch (err) {
      console.error('Error generating package:', err);
      alert('Error generating package. Please try with fewer files.');
      setQuickPackageLoading(false);
      setQuickPackageProgress('');
    }
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
        .header-line {
            width: 100%;
            height: 3px;
            background: linear-gradient(to right, #93c5fd, #3b82f6, #93c5fd);
            margin-bottom: 15px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .translation-page { page-break-before: always; padding-top: 20px; }
        .page-title { font-size: 14px; font-weight: bold; text-align: center; margin: 20px 0 15px 0; color: #1a365d; text-transform: uppercase; letter-spacing: 2px; }
        .page-header { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 25px; color: #1a365d; text-transform: uppercase; letter-spacing: 2px; }
        .translation-content { line-height: 1.6; font-size: 12px; }
        .translation-content table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .translation-content td, .translation-content th { border: 1px solid #333; padding: 6px 8px; }
        .original-documents-page { page-break-before: always; padding-top: 20px; }
        .original-images-wrapper { margin-top: 20px; }
        .original-image-container { text-align: center; margin-bottom: 15px; }
        .original-image { max-width: 100%; max-height: 600px; border: 1px solid #ddd; object-fit: contain; }
        @media print {
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .logo-placeholder { border: 1px dashed #ccc; }
            .header-line { background: linear-gradient(to right, #93c5fd, #3b82f6, #93c5fd) !important; }
        }
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
          {/* Assigned Orders for all users */}
          {(user?.role === 'admin' || user?.role === 'translator' || user?.role === 'pm') && (
            <div className="bg-white rounded shadow">
              <div className="p-3 border-b bg-gradient-to-r from-purple-600 to-purple-700">
                <h3 className="text-sm font-bold text-white flex items-center">
                  📋 Projetos
                  {assignedOrders.length > 0 && (
                    <span className="ml-2 bg-white text-purple-600 px-2 py-0.5 rounded-full text-xs font-bold">{assignedOrders.length}</span>
                  )}
                </h3>
                <p className="text-[10px] text-purple-200 mt-1">Clique em um projeto para abrir o documento</p>
              </div>
              <div className="p-3">
                {loadingAssigned ? (
                  <div className="text-center py-4 text-gray-500 text-xs">Carregando projetos...</div>
                ) : assignedOrders.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {assignedOrders.map(order => (
                      <div
                        key={order.id}
                        onClick={() => loadOrderDocument(order)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                          selectedOrderId === order.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-purple-700">{order.order_number}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                order.translation_status === 'received' ? 'bg-gray-200 text-gray-700' :
                                order.translation_status === 'in_translation' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-purple-200 text-purple-800'
                              }`}>
                                {order.translation_status === 'received' ? 'Novo' :
                                 order.translation_status === 'in_translation' ? 'Em progresso' : 'Revisão'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-700 mt-1">{order.client_name}</div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                              <span>🌐 {order.translate_from} → {order.translate_to}</span>
                              {order.page_count && <span>📄 {order.page_count} pg</span>}
                            </div>
                            {order.deadline && (
                              <div className="text-[10px] text-orange-600 mt-1">
                                ⏰ Prazo: {new Date(order.deadline).toLocaleDateString('pt-BR')} {new Date(order.deadline).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white text-lg">
                              📂
                            </div>
                            <span className="text-[9px] text-purple-600 font-medium">Abrir</span>
                          </div>
                        </div>
                        {/* Files list for selected project */}
                        {selectedOrderId === order.id && (
                          <div className="mt-2 pt-2 border-t border-purple-200">
                            <div className="text-[10px] text-purple-700 font-medium mb-2">
                              📁 Arquivos do Projeto ({selectedProjectFiles.length})
                            </div>
                            {loadingProjectFiles ? (
                              <div className="text-[10px] text-gray-500 text-center py-2">Carregando arquivos...</div>
                            ) : selectedProjectFiles.length > 0 ? (
                              <div className="space-y-1.5">
                                {selectedProjectFiles.map((doc, idx) => (
                                  <div
                                    key={doc.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      loadProjectFile(doc);
                                    }}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                                      selectedFileId === doc.id
                                        ? 'bg-green-100 border-2 border-green-500'
                                        : 'bg-white border border-gray-200 hover:bg-purple-100 hover:border-purple-400'
                                    }`}
                                  >
                                    <div className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
                                      selectedFileId === doc.id ? 'bg-green-500 text-white' : 'bg-gray-100'
                                    }`}>
                                      {doc.filename?.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className={`text-xs font-medium truncate ${
                                        selectedFileId === doc.id ? 'text-green-700' : 'text-gray-700'
                                      }`}>
                                        {doc.filename || `Arquivo ${idx + 1}`}
                                      </div>
                                      <div className="text-[9px] text-gray-400">
                                        {selectedFileId === doc.id ? '✓ Carregado' : 'Clique para abrir'}
                                      </div>
                                    </div>
                                    {selectedFileId === doc.id && (
                                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                                        ✓
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-400 text-center py-2">
                                Nenhum arquivo encontrado
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <div className="text-4xl mb-2">📭</div>
                    <div className="text-sm font-medium">Nenhum projeto atribuído</div>
                    <div className="text-xs mt-1">Aguarde novos projetos serem enviados para você</div>
                  </div>
                )}
                <button
                  onClick={fetchAssignedOrders}
                  className="mt-3 w-full py-2 text-xs text-purple-600 hover:text-white hover:bg-purple-600 border border-purple-300 rounded-lg transition-colors font-medium"
                >
                  🔄 Atualizar Lista
                </button>
              </div>
            </div>
          )}

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
                    <select onMouseDown={(e) => e.preventDefault()} onChange={(e) => { if(e.target.value) execFormatCommand('fontName', e.target.value); }} className="px-1 py-1 text-[10px] border rounded">
                      <option value="">Font</option>
                      <option value="Times New Roman, serif">Times New Roman</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="Verdana, sans-serif">Verdana</option>
                      <option value="Courier New, monospace">Courier New</option>
                      <option value="Garamond, serif">Garamond</option>
                    </select>
                    <select onMouseDown={(e) => e.preventDefault()} onChange={(e) => { if(e.target.value) execFormatCommand('fontSize', e.target.value); }} className="px-1 py-1 text-[10px] border rounded">
                      <option value="">Size</option>
                      <option value="1">8pt</option>
                      <option value="2">10pt</option>
                      <option value="3">12pt</option>
                      <option value="4">14pt</option>
                      <option value="5">18pt</option>
                      <option value="6">24pt</option>
                      <option value="7">36pt</option>
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

                {/* Document Type - REQUIRED */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Translation of <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    placeholder="Birth Certificate, Marriage Certificate, Diploma..."
                    className={`w-full px-3 py-2 text-sm border rounded ${
                      !documentType.trim() ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {!documentType.trim() && (
                    <p className="text-[10px] text-red-500 mt-1">⚠️ Document type is required</p>
                  )}
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
                <p className="text-[10px] text-green-600 mb-3">Upload your translation document</p>

                <div className={`border-2 border-dashed border-green-300 rounded-lg p-4 text-center transition-colors mb-2 ${quickPackageLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-green-500'}`}>
                  <input
                    type="file"
                    multiple
                    accept=".docx,.doc,.html,.htm,.txt,.pdf,image/*"
                    onChange={handleQuickTranslationUpload}
                    className="hidden"
                    id="quick-translation-upload"
                    disabled={quickPackageLoading}
                  />
                  <label htmlFor="quick-translation-upload" className={quickPackageLoading ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    <UploadIcon className="w-6 h-6 mx-auto mb-1 text-green-600" />
                    <span className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                      Upload Translation
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">Word (.docx), HTML, TXT, PDF, Images</p>
                  </label>
                </div>

                {/* Show HTML content indicator */}
                {quickTranslationHtml && (
                  <div className="mb-2 p-2 bg-white rounded border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-green-700">
                        ✓ Document content loaded (Word/HTML/TXT)
                      </span>
                      <button
                        onClick={() => { setQuickTranslationHtml(''); setQuickTranslationType('images'); }}
                        className="text-gray-400 hover:text-red-500 p-1"
                        disabled={quickPackageLoading}
                        title="Clear document"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Show image files */}
                {quickTranslationFiles.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-green-700">{quickTranslationFiles.length} image page(s):</p>
                      <button
                        onClick={() => setQuickTranslationFiles([])}
                        className="text-[10px] text-gray-400 hover:text-red-500"
                        disabled={quickPackageLoading}
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {quickTranslationFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white px-2 py-1 rounded text-xs mb-1">
                          <span className="truncate flex-1">{idx + 1}. {file.filename}</span>
                          <button
                            onClick={() => setQuickTranslationFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-500 ml-2 p-1"
                            disabled={quickPackageLoading}
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Originals */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded mb-4">
                <h3 className="text-sm font-bold text-orange-700 mb-2">📑 Upload Original Documents</h3>
                <p className="text-[10px] text-orange-600 mb-3">Upload original document (PDF auto-converted to images)</p>

                <div className={`border-2 border-dashed border-orange-300 rounded-lg p-4 text-center transition-colors mb-2 ${quickPackageLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-orange-500'}`}>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={handleQuickOriginalUpload}
                    className="hidden"
                    id="quick-original-upload"
                    disabled={quickPackageLoading}
                  />
                  <label htmlFor="quick-original-upload" className={quickPackageLoading ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    <UploadIcon className="w-6 h-6 mx-auto mb-1 text-orange-600" />
                    <span className="px-3 py-1.5 bg-orange-600 text-white text-xs rounded hover:bg-orange-700">
                      Upload Originals
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">Multiple files allowed (images)</p>
                  </label>
                </div>

                {quickOriginalFiles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-orange-700">{quickOriginalFiles.length} page(s) uploaded:</p>
                    <div className="max-h-32 overflow-y-auto">
                      {quickOriginalFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white px-2 py-1 rounded text-xs mb-1">
                          <span className="truncate flex-1">{idx + 1}. {file.filename}</span>
                          <button
                            onClick={() => setQuickOriginalFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-500 ml-2 p-1"
                            disabled={quickPackageLoading}
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
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
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                    📄 Translation {quickTranslationHtml ? '(Document)' : `(${quickTranslationFiles.length} pages)`}
                  </span>
                  {includeOriginal && quickOriginalFiles.length > 0 && (
                    <>
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">📑 Original ({quickOriginalFiles.length} pages)</span>
                    </>
                  )}
                </div>
              </div>

              {/* Loading/Progress Indicator */}
              {quickPackageProgress && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    {quickPackageLoading && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                    <span className="text-sm text-blue-700 font-medium">{quickPackageProgress}</span>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleQuickPackageDownload}
                disabled={(quickTranslationFiles.length === 0 && !quickTranslationHtml) || quickPackageLoading}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white text-sm font-bold rounded-lg hover:from-green-700 hover:to-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {quickPackageLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  '📦 Generate Complete Package (Print/PDF)'
                )}
              </button>
              <p className="text-[10px] text-gray-500 mt-2 text-center">
                Opens print window - save as PDF
              </p>
            </>
          )}

          {/* ============ NORMAL FLOW ============ */}
          {!quickPackageMode && translationResults.length > 0 && (
            <>
              {/* Approval Checklist - ALL REQUIRED */}
              <div className={`p-4 rounded mb-4 ${
                isApprovalComplete
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-purple-50 border-2 border-purple-300'
              }`}>
                <h3 className="text-sm font-bold text-purple-700 mb-1">
                  📋 Translation Approval Checklist <span className="text-red-500">*</span>
                </h3>
                <p className="text-[10px] text-purple-600 mb-3">⚠️ All items must be checked before sending</p>
                <div className="space-y-2">
                  <label className={`flex items-center text-xs cursor-pointer p-2 rounded ${
                    approvalChecks.projectNumber ? 'bg-green-100' : 'bg-white'
                  }`}>
                    <input
                      type="checkbox"
                      checked={approvalChecks.projectNumber}
                      onChange={(e) => setApprovalChecks({...approvalChecks, projectNumber: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Did you include the correct project number?</span>
                    {approvalChecks.projectNumber && <span className="ml-auto text-green-600">✓</span>}
                  </label>
                  <label className={`flex items-center text-xs cursor-pointer p-2 rounded ${
                    approvalChecks.languageCorrect ? 'bg-green-100' : 'bg-white'
                  }`}>
                    <input
                      type="checkbox"
                      checked={approvalChecks.languageCorrect}
                      onChange={(e) => setApprovalChecks({...approvalChecks, languageCorrect: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Is the source and target language correct?</span>
                    {approvalChecks.languageCorrect && <span className="ml-auto text-green-600">✓</span>}
                  </label>
                  <label className={`flex items-center text-xs cursor-pointer p-2 rounded ${
                    approvalChecks.proofread ? 'bg-green-100' : 'bg-white'
                  }`}>
                    <input
                      type="checkbox"
                      checked={approvalChecks.proofread}
                      onChange={(e) => setApprovalChecks({...approvalChecks, proofread: e.target.checked})}
                      className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Did you proofread the entire document carefully?</span>
                    {approvalChecks.proofread && <span className="ml-auto text-green-600">✓</span>}
                  </label>
                </div>
                {!isApprovalComplete && (
                  <p className="text-[10px] text-red-500 mt-3 font-medium">
                    ⚠️ Complete all checklist items to enable sending
                  </p>
                )}
                {isApprovalComplete && (
                  <p className="text-[10px] text-green-600 mt-3 font-medium">
                    ✅ All checks completed - Ready to send!
                  </p>
                )}
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
              <div className={`p-4 rounded ${
                isApprovalComplete && documentType.trim()
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <h3 className="text-sm font-bold text-green-700 mb-3">📤 Send to Projects</h3>
                <p className="text-[10px] text-gray-600 mb-3">Send this translation to a project for final review and delivery to client.</p>

                {/* Validation warnings */}
                {(!isApprovalComplete || !documentType.trim()) && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-[10px] text-yellow-700 font-medium">⚠️ Before sending, please complete:</p>
                    <ul className="text-[10px] text-yellow-600 mt-1 ml-4 list-disc">
                      {!documentType.trim() && <li>Fill in Document Type (in Details tab)</li>}
                      {!isApprovalComplete && <li>Complete all Approval Checklist items</li>}
                    </ul>
                  </div>
                )}

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
                    disabled={!selectedOrderId || sendingToProjects || !isApprovalComplete || !documentType.trim()}
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
  const [assigningPM, setAssigningPM] = useState(null); // Order ID being assigned PM

  // Translator stats for PM view
  const [translatorStats, setTranslatorStats] = useState({ available: 0, busy: 0, total: 0 });
  const [translatorsWithStatus, setTranslatorsWithStatus] = useState([]); // List of translators with details
  const [showTranslatorsList, setShowTranslatorsList] = useState(false); // Toggle translator list view

  // Check if user is PM
  const isPM = user?.role === 'pm';
  const isAdmin = user?.role === 'admin';

  // New Project Form
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [pmList, setPmList] = useState([]);
  const [translatorList, setTranslatorList] = useState([]);
  const [creatingProject, setCreatingProject] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);

  // Document viewer state
  const [viewingOrder, setViewingOrder] = useState(null);
  const [orderDocuments, setOrderDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [projectModalTab, setProjectModalTab] = useState('details');
  const [uploadingProjectDoc, setUploadingProjectDoc] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState({ client: '', internal: '' });

  // Editing states for inline edits
  const [editingTags, setEditingTags] = useState(null); // Order ID being edited
  const [editingDeadline, setEditingDeadline] = useState(null); // Order ID being edited
  const [tempTagValue, setTempTagValue] = useState({ type: 'professional', notes: '' });
  const [tempDeadlineValue, setTempDeadlineValue] = useState({ date: '', time: '' });

  // Send to Client modal state
  const [sendingOrder, setSendingOrder] = useState(null); // Order being sent
  const [translatedDocInfo, setTranslatedDocInfo] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sendingToClient, setSendingToClient] = useState(false);
  const [sendBccEmail, setSendBccEmail] = useState(''); // BCC email address
  const [notifyPM, setNotifyPM] = useState(true); // Notify assigned PM

  // Translator Assignment Modal state
  const [assigningTranslatorModal, setAssigningTranslatorModal] = useState(null); // Order to assign
  const [assignmentDetails, setAssignmentDetails] = useState({
    translator_id: '',
    due_date: '',
    due_time: '17:00',
    project_notes: '',
    language_pair: ''
  });
  const [sendingAssignment, setSendingAssignment] = useState(false);

  // Quick Add Translator state (for PM)
  const [showQuickAddTranslator, setShowQuickAddTranslator] = useState(false);
  const [newTranslatorData, setNewTranslatorData] = useState({
    name: '',
    email: '',
    password: '',
    rate_per_page: '',
    rate_per_word: '',
    language_pairs: ''
  });
  const [addingTranslator, setAddingTranslator] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Review Modal state (PM Side-by-Side Review)
  const [reviewingOrder, setReviewingOrder] = useState(null);
  const [reviewOriginalDocs, setReviewOriginalDocs] = useState([]);
  const [reviewTranslatedDoc, setReviewTranslatedDoc] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewCurrentPage, setReviewCurrentPage] = useState(0);

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
    deadline_time: '17:00',
    base_price: '',
    total_price: '',
    revenue_source: 'website',
    payment_method: '',
    payment_received: false,
    payment_tag: '',
    create_invoice: false,
    invoice_terms: '30_days',
    invoice_custom_date: ''
  });

  const REVENUE_SOURCES = [
    { value: 'website', label: 'Website' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'referral', label: 'Referral' },
    { value: 'partner', label: 'Partner' },
    { value: 'other', label: 'Other' }
  ];

  const PAYMENT_METHODS = [
    { value: '', label: '-- Select --' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit', label: 'Debit Card' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'zelle', label: 'Zelle' },
    { value: 'venmo', label: 'Venmo' },
    { value: 'pix', label: 'PIX' },
    { value: 'apple_pay', label: 'Apple Pay' },
    { value: 'bank_transfer', label: 'Bank Transfer' }
  ];

  const LANGUAGES = ['Portuguese', 'English', 'Spanish', 'French', 'German', 'Italian', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Arabic'];

  useEffect(() => {
    fetchOrders();
    fetchUsers();
    if (isPM) fetchTranslatorStats();
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

  // Fetch translator availability stats (for PM view)
  const fetchTranslatorStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/translators/status?admin_key=${adminKey}`);
      const data = response.data;
      setTranslatorStats({
        total: data.summary.total,
        busy: data.summary.busy,
        available: data.summary.available
      });
      setTranslatorsWithStatus(data.translators || []);
    } catch (err) {
      console.error('Failed to fetch translator stats:', err);
      // Fallback to old method if new endpoint fails
      try {
        const [transRes, ordersRes] = await Promise.all([
          axios.get(`${API}/admin/users/by-role/translator?admin_key=${adminKey}`),
          axios.get(`${API}/admin/orders?admin_key=${adminKey}`)
        ]);
        const translators = transRes.data || [];
        const activeOrders = (ordersRes.data.orders || []).filter(o =>
          ['received', 'in_translation', 'review'].includes(o.translation_status)
        );
        const busyTranslatorIds = new Set(activeOrders.map(o => o.assigned_translator_id).filter(Boolean));
        const busyTranslatorNames = new Set(activeOrders.map(o => o.assigned_translator).filter(Boolean));
        const busy = translators.filter(t => busyTranslatorIds.has(t.id) || busyTranslatorNames.has(t.name)).length;
        setTranslatorStats({
          total: translators.length,
          busy: busy,
          available: translators.length - busy
        });
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      let allOrders = response.data.orders || [];

      // PM only sees orders assigned to them
      if (isPM && user?.id) {
        allOrders = allOrders.filter(order =>
          order.assigned_pm_id === user.id ||
          order.assigned_pm_name === user.name
        );
      }

      setOrders(allOrders);
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

  const deleteOrder = async (orderId, orderNumber) => {
    if (!window.confirm(`Are you sure you want to delete order ${orderNumber}?\n\nThis action cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/admin/orders/${orderId}?admin_key=${adminKey}`);
      fetchOrders();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Erro ao deletar pedido');
    }
  };

  // Edit tags
  const startEditingTags = (order) => {
    setEditingTags(order.id);
    setTempTagValue({
      type: order.translation_type || 'professional',
      notes: order.internal_notes || ''
    });
  };

  const saveTagsEdit = async (orderId) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}?admin_key=${adminKey}`, {
        translation_type: tempTagValue.type,
        internal_notes: tempTagValue.notes
      });
      setEditingTags(null);
      fetchOrders();
    } catch (err) {
      console.error('Failed to update tags:', err);
    }
  };

  // Edit deadline
  const startEditingDeadline = (order) => {
    setEditingDeadline(order.id);
    const deadlineDate = order.deadline ? new Date(order.deadline) : new Date();
    setTempDeadlineValue({
      date: deadlineDate.toISOString().split('T')[0],
      time: deadlineDate.toTimeString().slice(0, 5)
    });
  };

  const saveDeadlineEdit = async (orderId) => {
    try {
      const deadlineDateTime = `${tempDeadlineValue.date}T${tempDeadlineValue.time || '17:00'}:00`;
      await axios.put(`${API}/admin/orders/${orderId}?admin_key=${adminKey}`, {
        deadline: deadlineDateTime
      });
      setEditingDeadline(null);
      fetchOrders();
    } catch (err) {
      console.error('Failed to update deadline:', err);
    }
  };

  // Open "Send to Client" modal
  const openSendToClientModal = async (order) => {
    setSendingOrder(order);
    setTranslatedDocInfo(null);
    try {
      const response = await axios.get(`${API}/admin/orders/${order.id}/translated-document?admin_key=${adminKey}`);
      setTranslatedDocInfo(response.data);
    } catch (err) {
      console.error('Failed to get translated document info:', err);
      setTranslatedDocInfo({ has_translated_document: false });
    }
  };

  // Download translated document
  const downloadTranslatedDocument = async (orderId, filename) => {
    try {
      const response = await axios.get(`${API}/admin/orders/${orderId}/download-translation?admin_key=${adminKey}`);
      if (response.data.type === 'file' && response.data.file_data) {
        const link = document.createElement('a');
        link.href = `data:${response.data.content_type};base64,${response.data.file_data}`;
        link.download = response.data.filename || filename || 'translation.pdf';
        link.click();
      } else if (response.data.type === 'html') {
        // Open HTML in new tab for printing
        const newWindow = window.open('', '_blank');
        newWindow.document.write(response.data.html_content);
        newWindow.document.close();
      }
    } catch (err) {
      console.error('Failed to download translation:', err);
      alert('Error downloading translation');
    }
  };

  // Upload new translated document
  const uploadTranslatedDocument = async (orderId, file) => {
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await axios.post(`${API}/admin/orders/${orderId}/upload-translation?admin_key=${adminKey}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Refresh doc info
      const response = await axios.get(`${API}/admin/orders/${orderId}/translated-document?admin_key=${adminKey}`);
      setTranslatedDocInfo(response.data);
      alert('Document uploaded successfully!');
    } catch (err) {
      console.error('Failed to upload translation:', err);
      alert('Error uploading document');
    } finally {
      setUploadingFile(false);
    }
  };

  // Send translation to client (deliver)
  const sendTranslationToClient = async (orderId) => {
    setSendingToClient(true);
    try {
      const response = await axios.post(`${API}/admin/orders/${orderId}/deliver?admin_key=${adminKey}`, {
        bcc_email: sendBccEmail || null,
        notify_pm: notifyPM && sendingOrder?.assigned_pm_id ? true : false
      });

      let message = response.data.attachment_sent
        ? 'Translation sent to client successfully! (with attachment)'
        : 'Order marked as delivered! (email sent without attachment)';

      if (response.data.pm_notified) {
        message += '\nPM notified.';
      }
      if (response.data.bcc_sent) {
        message += '\nBCC copy sent.';
      }

      alert(message);
      setSendingOrder(null);
      setSendBccEmail(''); // Reset BCC field
      fetchOrders();
    } catch (err) {
      console.error('Failed to deliver:', err);
      alert('Error sending to client');
    } finally {
      setSendingToClient(false);
    }
  };

  // View order documents
  const viewOrderDocuments = async (order) => {
    setViewingOrder(order);
    setLoadingDocuments(true);
    setOrderDocuments([]);
    try {
      const response = await axios.get(`${API}/admin/orders/${order.id}/documents?admin_key=${adminKey}`);
      setOrderDocuments(response.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Download document
  const downloadDocument = async (docId, filename) => {
    try {
      const response = await axios.get(`${API}/admin/order-documents/${docId}/download?admin_key=${adminKey}`);
      if (response.data.file_data) {
        const link = document.createElement('a');
        link.href = `data:${response.data.content_type};base64,${response.data.file_data}`;
        link.download = filename || 'document.pdf';
        link.click();
      } else {
        alert('Document not found');
      }
    } catch (err) {
      console.error('Failed to download:', err);
      alert('Error downloading document');
    }
  };

  // Upload document to order (Admin/PM only)
  const uploadDocumentToOrder = async (orderId, file) => {
    if (!file) return;
    setUploadingProjectDoc(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      await axios.post(`${API}/admin/orders/${orderId}/documents?admin_key=${adminKey}`, {
        filename: file.name,
        file_data: base64Data,
        content_type: file.type,
        source: 'manual_upload'
      });

      // Refresh documents
      viewOrderDocuments(viewingOrder);
    } catch (err) {
      console.error('Failed to upload document:', err);
      alert('Error uploading document');
    } finally {
      setUploadingProjectDoc(false);
    }
  };

  // Update order notes
  const updateOrderNotes = async (orderId, clientNotes, internalNotes) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}?admin_key=${adminKey}`, {
        notes: clientNotes,
        internal_notes: internalNotes
      });
      // Refresh order in modal
      setViewingOrder(prev => ({ ...prev, notes: clientNotes, internal_notes: internalNotes }));
      setEditingNotes(false);
      fetchOrders();
    } catch (err) {
      console.error('Failed to update notes:', err);
      alert('Error updating notes');
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/admin/notifications?admin_key=${adminKey}&token=${user?.token || ''}`);
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notifId) => {
    try {
      await axios.put(`${API}/admin/notifications/${notifId}/read?admin_key=${adminKey}&token=${user?.token || ''}`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Poll for notifications
  useEffect(() => {
    if (adminKey && (isAdmin || isPM)) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [adminKey, user]);

  // Open translator assignment modal
  const openAssignTranslatorModal = (order) => {
    setAssigningTranslatorModal(order);
    setAssignmentDetails({
      translator_id: '',
      due_date: order.deadline ? order.deadline.split('T')[0] : '',
      due_time: '17:00',
      project_notes: order.internal_notes || '',
      language_pair: `${order.translate_from} → ${order.translate_to}`
    });
  };

  // Quick Add Translator (PM can add new translators from assignment modal)
  const quickAddTranslator = async () => {
    if (!newTranslatorData.name || !newTranslatorData.email || !newTranslatorData.password) {
      alert('Please fill in name, email and password');
      return;
    }
    setAddingTranslator(true);
    try {
      const response = await axios.post(`${API}/admin/auth/register?admin_key=${adminKey}`, {
        name: newTranslatorData.name,
        email: newTranslatorData.email,
        password: newTranslatorData.password,
        role: 'translator',
        rate_per_page: newTranslatorData.rate_per_page ? parseFloat(newTranslatorData.rate_per_page) : null,
        rate_per_word: newTranslatorData.rate_per_word ? parseFloat(newTranslatorData.rate_per_word) : null,
        language_pairs: newTranslatorData.language_pairs || null
      });

      alert(`Translator "${newTranslatorData.name}" created successfully!`);

      // Reset form and refresh translator list
      setNewTranslatorData({ name: '', email: '', password: '', rate_per_page: '', rate_per_word: '', language_pairs: '' });
      setShowQuickAddTranslator(false);

      // Refresh translator list
      const usersRes = await axios.get(`${API}/admin/users/by-role/translator?admin_key=${adminKey}`);
      setTranslatorList(usersRes.data || []);

      // Auto-select the new translator
      if (response.data.user_id) {
        setAssignmentDetails({...assignmentDetails, translator_id: response.data.user_id});
      }
    } catch (err) {
      console.error('Failed to add translator:', err);
      alert(err.response?.data?.detail || 'Error creating translator');
    } finally {
      setAddingTranslator(false);
    }
  };

  // Open Review Modal (PM Side-by-Side Review)
  const openReviewModal = async (order) => {
    setReviewingOrder(order);
    setLoadingReview(true);
    setReviewComment('');
    setReviewCurrentPage(0);
    setReviewOriginalDocs([]);
    setReviewTranslatedDoc(null);

    try {
      // Fetch original documents
      const docsResponse = await axios.get(`${API}/admin/orders/${order.id}/documents?admin_key=${adminKey}`);
      const docs = docsResponse.data.documents || [];

      // Download each original document as base64
      const originalDocsWithData = [];
      for (const doc of docs) {
        try {
          const downloadRes = await axios.get(`${API}/admin/order-documents/${doc.id}/download?admin_key=${adminKey}`);
          if (downloadRes.data.file_data) {
            const contentType = downloadRes.data.content_type || 'application/pdf';
            originalDocsWithData.push({
              ...doc,
              data: `data:${contentType};base64,${downloadRes.data.file_data}`,
              contentType
            });
          }
        } catch (e) {
          console.error('Failed to download doc:', e);
        }
      }
      setReviewOriginalDocs(originalDocsWithData);

      // Fetch translated document (if exists)
      try {
        const translatedRes = await axios.get(`${API}/admin/orders/${order.id}/translated-document?admin_key=${adminKey}`);
        if (translatedRes.data.translation_html) {
          setReviewTranslatedDoc({
            type: 'html',
            content: translatedRes.data.translation_html,
            settings: translatedRes.data
          });
        } else if (translatedRes.data.file_data) {
          const contentType = translatedRes.data.content_type || 'application/pdf';
          setReviewTranslatedDoc({
            type: 'file',
            data: `data:${contentType};base64,${translatedRes.data.file_data}`,
            filename: translatedRes.data.filename,
            contentType
          });
        }
      } catch (e) {
        console.error('No translated document found:', e);
      }
    } catch (err) {
      console.error('Failed to load review documents:', err);
      alert('Error loading documents for review');
    } finally {
      setLoadingReview(false);
    }
  };

  // Approve translation (PM approves, moves to ready)
  const approveTranslation = async () => {
    if (!reviewingOrder) return;
    setSubmittingReview(true);
    try {
      await axios.put(`${API}/admin/orders/${reviewingOrder.id}?admin_key=${adminKey}`, {
        translation_status: 'ready',
        pm_review_status: 'approved',
        pm_review_comment: reviewComment,
        pm_reviewed_at: new Date().toISOString()
      });
      alert('Translation approved! Ready for delivery.');
      setReviewingOrder(null);
      fetchOrders();
    } catch (err) {
      console.error('Failed to approve:', err);
      alert('Error approving translation');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Request correction (PM sends back to translator)
  const requestCorrection = async () => {
    if (!reviewingOrder) return;
    if (!reviewComment.trim()) {
      alert('Please add a comment explaining what needs to be corrected');
      return;
    }
    setSubmittingReview(true);
    try {
      await axios.put(`${API}/admin/orders/${reviewingOrder.id}?admin_key=${adminKey}`, {
        translation_status: 'in_translation',
        pm_review_status: 'correction_requested',
        pm_review_comment: reviewComment,
        pm_reviewed_at: new Date().toISOString()
      });
      alert('Correction requested. Translator will be notified.');
      setReviewingOrder(null);
      fetchOrders();
    } catch (err) {
      console.error('Failed to request correction:', err);
      alert('Error requesting correction');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Send translator assignment with email invitation
  const sendTranslatorAssignment = async () => {
    if (!assignmentDetails.translator_id) {
      alert('Please select a translator');
      return;
    }
    setSendingAssignment(true);
    try {
      // Find translator info
      const selectedTranslator = translatorList.find(t => t.id === assignmentDetails.translator_id);

      // Build deadline if provided
      let deadline = null;
      if (assignmentDetails.due_date) {
        deadline = `${assignmentDetails.due_date}T${assignmentDetails.due_time}:00`;
      }

      // Update order with translator assignment
      await axios.put(`${API}/admin/orders/${assigningTranslatorModal.id}?admin_key=${adminKey}`, {
        assigned_translator_id: assignmentDetails.translator_id,
        deadline: deadline,
        internal_notes: assignmentDetails.project_notes
      });

      alert(`Invitation sent to ${selectedTranslator?.name || 'translator'}! They will receive an email to accept or decline.`);
      setAssigningTranslatorModal(null);
      setAssigningTranslator(null);
      fetchOrders();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to assign translator:', err);
      alert('Error sending assignment');
    } finally {
      setSendingAssignment(false);
    }
  };

  // Simple assign translator (from dropdown)
  const assignTranslator = async (orderId, translatorName) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}?admin_key=${adminKey}`, {
        assigned_translator: translatorName
      });
      setAssigningTranslator(null);
      fetchOrders();
    } catch (err) {
      console.error('Failed to assign translator:', err);
    }
  };

  // Assign PM to order
  const assignPM = async (orderId, pmName) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}?admin_key=${adminKey}`, {
        assigned_pm: pmName
      });
      setAssigningPM(null);
      fetchOrders();
    } catch (err) {
      console.error('Failed to assign PM:', err);
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
      // Prepare project data with document if uploaded
      let projectData = { ...newProject };

      // Clean up empty string fields - convert to null or proper types
      if (projectData.assigned_pm_id === '') projectData.assigned_pm_id = null;
      if (projectData.assigned_translator_id === '') projectData.assigned_translator_id = null;
      if (projectData.payment_method === '') projectData.payment_method = null;
      if (projectData.base_price === '' || projectData.base_price === null) projectData.base_price = 0;
      if (projectData.total_price === '' || projectData.total_price === null) projectData.total_price = 0;
      if (projectData.page_count === '' || projectData.page_count === null) projectData.page_count = 1;
      if (projectData.word_count === '' || projectData.word_count === null) projectData.word_count = 0;

      // Convert numeric fields to numbers
      projectData.base_price = parseFloat(projectData.base_price) || 0;
      projectData.total_price = parseFloat(projectData.total_price) || 0;
      projectData.page_count = parseInt(projectData.page_count) || 1;
      projectData.word_count = parseInt(projectData.word_count) || 0;

      // Convert document to base64 if provided
      if (documentFile) {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result.split(',')[1]; // Remove data:...;base64, prefix
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(documentFile);
        const base64Data = await base64Promise;
        projectData.document_data = base64Data;
        projectData.document_filename = documentFile.name;
      }

      // Set payment status based on received flag
      if (newProject.payment_received) {
        projectData.payment_status = 'paid';
      } else {
        projectData.payment_status = 'pending';
      }

      // Combine deadline date and time
      if (projectData.deadline && projectData.deadline_time) {
        projectData.deadline = `${projectData.deadline}T${projectData.deadline_time}`;
      } else if (!projectData.deadline) {
        projectData.deadline = null;
      }

      await axios.post(`${API}/admin/orders/manual?admin_key=${adminKey}`, projectData);
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
        deadline_time: '17:00',
        base_price: '',
        total_price: '',
        revenue_source: 'website',
        payment_method: '',
        payment_received: false,
        payment_tag: '',
        create_invoice: false,
        invoice_terms: '30_days',
        invoice_custom_date: ''
      });
      setDocumentFile(null);
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
    const labels = {
      'received': 'Quote',
      'in_translation': 'In progress',
      'review': 'PM Review',
      'client_review': 'Client Review',
      'ready': 'Completed',
      'delivered': 'Delivered'
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="p-4 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;
  }

  return (
    <div className="p-4">
      {/* Notification Banner - Show unread notifications */}
      {(isAdmin || isPM) && notifications.filter(n => !n.is_read).length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-blue-600 mr-2">🔔</span>
              <span className="text-sm font-medium text-blue-800">
                {notifications.filter(n => !n.is_read).length} new notification(s)
              </span>
            </div>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {showNotifications ? 'Hide' : 'View'}
            </button>
          </div>
          {showNotifications && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {notifications.filter(n => !n.is_read).map((notif) => (
                <div
                  key={notif.id}
                  className={`p-2 rounded text-xs ${
                    notif.type === 'assignment_declined' ? 'bg-red-100 border border-red-200' :
                    notif.type === 'assignment_accepted' ? 'bg-green-100 border border-green-200' :
                    'bg-white border'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {notif.type === 'assignment_declined' ? '❌' :
                         notif.type === 'assignment_accepted' ? '✅' : '📋'} {notif.title}
                      </div>
                      <div className="text-gray-600 mt-0.5">{notif.message}</div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {new Date(notif.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => markNotificationRead(notif.id)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Mark read
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Translator Assignment Modal */}
      {assigningTranslatorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b flex justify-between items-center bg-purple-600 text-white rounded-t-lg">
              <div>
                <h3 className="font-bold">👤 Assign Translator</h3>
                <p className="text-xs opacity-80">{assigningTranslatorModal.order_number} - {assigningTranslatorModal.client_name}</p>
              </div>
              <button onClick={() => setAssigningTranslatorModal(null)} className="text-white hover:text-gray-200 text-xl">×</button>
            </div>

            <div className="p-4 space-y-4">
              {/* Project Info */}
              <div className="p-3 bg-gray-50 rounded border text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Language:</span>
                    <span className="ml-1 font-medium">{assignmentDetails.language_pair}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pages:</span>
                    <span className="ml-1 font-medium">{assigningTranslatorModal.page_count || 1}</span>
                  </div>
                </div>
              </div>

              {/* Select Translator */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Translator *</label>
                <select
                  value={assignmentDetails.translator_id}
                  onChange={(e) => setAssignmentDetails({...assignmentDetails, translator_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">-- Choose Translator --</option>
                  {translatorList.filter(t => t.role === 'translator' && t.is_active !== false).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.language_pairs ? `(${t.language_pairs})` : ''} {t.rate_per_page ? `- $${t.rate_per_page}/pg` : ''}
                    </option>
                  ))}
                </select>
                {translatorList.filter(t => t.role === 'translator').length === 0 && (
                  <p className="text-[10px] text-orange-600 mt-1">No translators found. Register translators in the Translators tab first.</p>
                )}
              </div>

              {/* Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={assignmentDetails.due_date}
                    onChange={(e) => setAssignmentDetails({...assignmentDetails, due_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Due Time</label>
                  <input
                    type="time"
                    value={assignmentDetails.due_time}
                    onChange={(e) => setAssignmentDetails({...assignmentDetails, due_time: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes for Translator</label>
                <textarea
                  value={assignmentDetails.project_notes}
                  onChange={(e) => setAssignmentDetails({...assignmentDetails, project_notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  rows="2"
                  placeholder="Special instructions for the translator..."
                />
              </div>

              {/* Info */}
              <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
                <span className="font-medium">📧 Email Invitation:</span> The translator will receive an email with accept/decline links. You will be notified of their response.
              </div>
            </div>

            <div className="p-3 border-t bg-gray-50 flex justify-end gap-2 rounded-b-lg">
              <button
                onClick={() => setAssigningTranslatorModal(null)}
                className="px-4 py-1.5 text-gray-600 text-sm hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={sendTranslatorAssignment}
                disabled={sendingAssignment || !assignmentDetails.translator_id}
                className="px-4 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
              >
                {sendingAssignment ? 'Sending...' : '📤 Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PM Review Modal - Side by Side */}
      {reviewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <div>
                <h3 className="font-bold text-lg">📋 Review Translation</h3>
                <p className="text-xs opacity-80">
                  {reviewingOrder.order_number} - {reviewingOrder.client_name} | {reviewingOrder.translate_from} → {reviewingOrder.translate_to}
                </p>
              </div>
              <button onClick={() => setReviewingOrder(null)} className="text-white hover:text-gray-200 text-2xl">×</button>
            </div>

            {loadingReview ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-3">⏳</div>
                  <p className="text-gray-600">Loading documents...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Document Navigation */}
                {reviewOriginalDocs.length > 1 && (
                  <div className="px-4 py-2 bg-gray-100 border-b flex items-center justify-center gap-2">
                    <button
                      onClick={() => setReviewCurrentPage(Math.max(0, reviewCurrentPage - 1))}
                      disabled={reviewCurrentPage === 0}
                      className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50"
                    >
                      ← Previous
                    </button>
                    <span className="text-sm font-medium">
                      Document {reviewCurrentPage + 1} of {reviewOriginalDocs.length}
                    </span>
                    <button
                      onClick={() => setReviewCurrentPage(Math.min(reviewOriginalDocs.length - 1, reviewCurrentPage + 1))}
                      disabled={reviewCurrentPage >= reviewOriginalDocs.length - 1}
                      className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50"
                    >
                      Next →
                    </button>
                  </div>
                )}

                {/* Side by Side Content */}
                <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
                  {/* Left: Original Document */}
                  <div className="border-r flex flex-col">
                    <div className="px-4 py-2 bg-orange-50 border-b">
                      <span className="text-sm font-bold text-orange-700">📄 Original Document</span>
                      {reviewOriginalDocs[reviewCurrentPage] && (
                        <span className="text-xs text-gray-500 ml-2">{reviewOriginalDocs[reviewCurrentPage].filename}</span>
                      )}
                    </div>
                    <div className="flex-1 overflow-auto p-4 bg-gray-50">
                      {reviewOriginalDocs[reviewCurrentPage] ? (
                        reviewOriginalDocs[reviewCurrentPage].contentType?.includes('pdf') ? (
                          <embed
                            src={reviewOriginalDocs[reviewCurrentPage].data}
                            type="application/pdf"
                            className="w-full h-full min-h-[500px]"
                          />
                        ) : (
                          <img
                            src={reviewOriginalDocs[reviewCurrentPage].data}
                            alt="Original"
                            className="max-w-full border shadow-sm"
                          />
                        )
                      ) : (
                        <div className="text-center text-gray-400 py-8">
                          <div className="text-4xl mb-2">📭</div>
                          <p>No original document found</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Translated Document */}
                  <div className="flex flex-col">
                    <div className="px-4 py-2 bg-blue-50 border-b">
                      <span className="text-sm font-bold text-blue-700">🌐 Translation ({reviewingOrder.translate_to})</span>
                    </div>
                    <div className="flex-1 overflow-auto p-4 bg-gray-50">
                      {reviewTranslatedDoc ? (
                        reviewTranslatedDoc.type === 'html' ? (
                          <div
                            className="bg-white p-4 border shadow-sm prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: reviewTranslatedDoc.content }}
                          />
                        ) : reviewTranslatedDoc.contentType?.includes('pdf') ? (
                          <embed
                            src={reviewTranslatedDoc.data}
                            type="application/pdf"
                            className="w-full h-full min-h-[500px]"
                          />
                        ) : (
                          <img
                            src={reviewTranslatedDoc.data}
                            alt="Translation"
                            className="max-w-full border shadow-sm"
                          />
                        )
                      ) : (
                        <div className="text-center text-gray-400 py-8">
                          <div className="text-4xl mb-2">📝</div>
                          <p>No translation found</p>
                          <p className="text-xs mt-1">Translation not yet submitted</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Review Actions Footer */}
                <div className="p-4 border-t bg-gray-50">
                  {/* Comment */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      💬 Review Comment {!reviewTranslatedDoc && '(required for correction request)'}
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full px-3 py-2 border rounded text-sm"
                      rows="2"
                      placeholder="Add your feedback, corrections needed, or approval notes..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setReviewingOrder(null)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Close
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={requestCorrection}
                        disabled={submittingReview || !reviewTranslatedDoc}
                        className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 flex items-center gap-2"
                      >
                        {submittingReview ? '...' : '❌ Request Correction'}
                      </button>
                      <button
                        onClick={approveTranslation}
                        disabled={submittingReview || !reviewTranslatedDoc}
                        className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 flex items-center gap-2"
                      >
                        {submittingReview ? '...' : '✅ Approve Translation'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards - Different for Admin vs PM */}
      {isPM ? (
        /* PM sees: My Orders, Translators Available, Translators Busy */
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded shadow p-3">
              <div className="text-[10px] text-gray-500 uppercase">Meus Pedidos</div>
              <div className="text-xl font-bold text-gray-800">{orders.length}</div>
            </div>
            <div
              onClick={() => setShowTranslatorsList(!showTranslatorsList)}
              className="bg-gradient-to-r from-green-500 to-green-600 rounded shadow p-3 text-white cursor-pointer hover:from-green-600 hover:to-green-700 transition-all"
            >
              <div className="text-[10px] uppercase opacity-80">Available Translators</div>
              <div className="text-xl font-bold">{translatorStats.available}</div>
              <div className="text-[9px] opacity-70 mt-1">Click to view list</div>
            </div>
            <div
              onClick={() => setShowTranslatorsList(!showTranslatorsList)}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded shadow p-3 text-white cursor-pointer hover:from-yellow-600 hover:to-yellow-700 transition-all"
            >
              <div className="text-[10px] uppercase opacity-80">Busy Translators</div>
              <div className="text-xl font-bold">{translatorStats.busy}</div>
              <div className="text-[9px] opacity-70 mt-1">Click to view list</div>
            </div>
          </div>

          {/* Translators List Panel */}
          {showTranslatorsList && (
            <div className="bg-white rounded-lg shadow mb-4 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-800">👥 Translators List</h3>
                <button onClick={() => setShowTranslatorsList(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
              </div>
              {translatorsWithStatus.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">No translators registered</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {translatorsWithStatus.map((translator) => (
                    <div
                      key={translator.id}
                      className={`p-3 rounded-lg border-2 ${
                        translator.status === 'available'
                          ? 'border-green-200 bg-green-50'
                          : 'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${translator.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          <span className="font-medium text-sm text-gray-800">{translator.name}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          translator.status === 'available'
                            ? 'bg-green-500 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}>
                          {translator.status === 'available' ? 'Available' : 'Busy'}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 mb-1">{translator.email}</div>
                      {translator.status === 'busy' && translator.projects && translator.projects.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="text-[10px] font-medium text-gray-600 mb-1">Projetos Ativos:</div>
                          {translator.projects.map((proj, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] py-0.5">
                              <span className="text-blue-600 font-mono">{proj.code}</span>
                              <span className="text-gray-500">
                                {proj.deadline ? new Date(proj.deadline).toLocaleDateString('pt-BR') : 'Sem prazo'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {translator.status === 'available' && (
                        <div className="mt-2 text-[10px] text-green-600">✓ Pronto para novos projetos</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : null}

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-bold text-blue-600">{isPM ? 'MEUS PROJETOS' : 'PROJECTS'}</h1>
          {/* New Project button - Admin only */}
          {isAdmin && (
            <button
              onClick={() => setShowNewProjectForm(!showNewProjectForm)}
              className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700"
            >
              + New Project
            </button>
          )}
          <div className="flex space-x-1">
            {['all', 'received', 'in_translation', 'review', 'client_review', 'ready', 'delivered'].map((s) => (
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
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={newProject.deadline}
                    onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
                    className="flex-1 px-2 py-1.5 text-xs border rounded"
                  />
                  <input
                    type="time"
                    value={newProject.deadline_time}
                    onChange={(e) => setNewProject({...newProject, deadline_time: e.target.value})}
                    className="w-20 px-1 py-1.5 text-xs border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Price ($)</label>
                <input
                  type="number"
                  value={newProject.total_price}
                  onChange={(e) => setNewProject({...newProject, total_price: e.target.value, base_price: e.target.value})}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Payment Method</label>
                <select
                  value={newProject.payment_method}
                  onChange={(e) => setNewProject({...newProject, payment_method: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  {PAYMENT_METHODS.map(pm => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                </select>
              </div>
            </div>

            {/* Payment Status Section */}
            <div className="mb-3 p-3 bg-gray-50 rounded border">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-medium text-gray-700">Payment Status</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProject.payment_received}
                    onChange={(e) => setNewProject({...newProject, payment_received: e.target.checked, payment_tag: e.target.checked ? '' : newProject.payment_tag})}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className={`text-xs font-medium ${newProject.payment_received ? 'text-green-600' : 'text-gray-600'}`}>
                    {newProject.payment_received ? '✓ Payment Received' : 'Payment Received'}
                  </span>
                </label>
              </div>

              {!newProject.payment_received && (
                <div className="space-y-2">
                  <div className="text-[10px] text-gray-500 mb-1">Payment Tag:</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: '', label: 'Awaiting Payment' },
                      { value: 'bonus', label: '🎁 Bonus' },
                      { value: 'no_charge', label: '🚫 No Charge' },
                      { value: 'partner', label: '🤝 Partner' }
                    ].map(tag => (
                      <label key={tag.value} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="payment_tag"
                          value={tag.value}
                          checked={newProject.payment_tag === tag.value}
                          onChange={(e) => setNewProject({...newProject, payment_tag: e.target.value})}
                          className="w-3 h-3"
                        />
                        <span className="text-[10px] text-gray-600">{tag.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Invoice Options */}
                  <div className="mt-3 pt-2 border-t">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={newProject.create_invoice}
                        onChange={(e) => setNewProject({...newProject, create_invoice: e.target.checked})}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-[10px] font-medium text-gray-700">📄 Create Invoice</span>
                    </label>

                    {newProject.create_invoice && (
                      <div className="ml-6 flex flex-wrap gap-2">
                        {[
                          { value: '15_days', label: '15 Days' },
                          { value: '30_days', label: '30 Days' },
                          { value: 'custom', label: 'Custom Date' }
                        ].map(term => (
                          <label key={term.value} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="invoice_terms"
                              value={term.value}
                              checked={newProject.invoice_terms === term.value}
                              onChange={(e) => setNewProject({...newProject, invoice_terms: e.target.value})}
                              className="w-3 h-3"
                            />
                            <span className="text-[10px] text-gray-600">{term.label}</span>
                          </label>
                        ))}
                        {newProject.invoice_terms === 'custom' && (
                          <input
                            type="date"
                            value={newProject.invoice_custom_date}
                            onChange={(e) => setNewProject({...newProject, invoice_custom_date: e.target.value})}
                            className="px-2 py-1 text-xs border rounded"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Document Upload */}
            <div className="mb-3">
              <label className="block text-[10px] font-medium text-gray-600 mb-1">Document to Translate</label>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  onChange={(e) => setDocumentFile(e.target.files[0])}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  className="text-xs"
                />
                {documentFile && (
                  <span className="text-xs text-green-600">✓ {documentFile.name}</span>
                )}
              </div>
              <p className="text-[9px] text-gray-400 mt-1">Accepted: PDF, DOC, DOCX, TXT, JPG, PNG</p>
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

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Revenue Source</label>
                <select
                  value={newProject.revenue_source}
                  onChange={(e) => setNewProject({...newProject, revenue_source: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  {REVENUE_SOURCES.map(src => <option key={src.value} value={src.value}>{src.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Internal Notes (Admin/PM only)</label>
                <textarea
                  value={newProject.internal_notes}
                  onChange={(e) => setNewProject({...newProject, internal_notes: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  rows="1"
                  placeholder="Internal notes"
                />
              </div>
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
              <th className="px-2 py-2 text-left font-medium">Order Date</th>
              <th className="px-2 py-2 text-left font-medium">Client</th>
              {/* PM column - Admin only */}
              {isAdmin && <th className="px-2 py-2 text-left font-medium">PM</th>}
              <th className="px-2 py-2 text-left font-medium">Translator</th>
              <th className="px-2 py-2 text-left font-medium">Deadline</th>
              <th className="px-2 py-2 text-left font-medium">Status</th>
              <th className="px-2 py-2 text-left font-medium">Notes</th>
              {/* Translation Ready column - shows when translation is complete */}
              <th className="px-2 py-2 text-center font-medium">Translation</th>
              {/* Total and Payment columns - Admin only */}
              {isAdmin && <th className="px-2 py-2 text-right font-medium">Total</th>}
              {isAdmin && <th className="px-2 py-2 text-center font-medium">Payment</th>}
              <th className="px-2 py-2 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((order) => {
              const created = new Date(order.created_at);
              const orderDeadline = order.deadline ? new Date(order.deadline) : new Date(created.getTime() + 5 * 24 * 60 * 60 * 1000);
              const daysUntil = Math.ceil((orderDeadline - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  {/* Code */}
                  <td className="px-2 py-2 font-medium">
                    <button
                      onClick={() => viewOrderDocuments(order)}
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      title="Ver documento original"
                    >
                      {order.order_number}
                    </button>
                  </td>
                  {/* Order Date */}
                  <td className="px-2 py-2 text-gray-600">
                    {created.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    <span className="text-[10px] text-gray-400 block">{created.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  {/* Client with email and send buttons */}
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <div>
                        {order.client_name}
                        <span className="text-gray-400 text-[10px] block">{order.client_email}</span>
                      </div>
                      {/* Send translation button - shows when ready or review */}
                      {['ready', 'review'].includes(order.translation_status) && (isAdmin || isPM) && (
                        <button
                          onClick={() => openSendToClientModal(order)}
                          className="px-1 py-0.5 bg-teal-500 text-white rounded text-[9px] hover:bg-teal-600"
                          title="Send translation to client"
                        >
                          📤
                        </button>
                      )}
                    </div>
                  </td>
                  {/* PM - Admin only */}
                  {isAdmin && (
                    <td className={`px-2 py-2 ${(order.assigned_pm_name || order.assigned_pm) ? 'bg-green-50' : ''}`}>
                      {assigningPM === order.id ? (
                        <select
                          autoFocus
                          className="px-1 py-0.5 text-[10px] border rounded w-24"
                          onChange={(e) => {
                            if (e.target.value) assignPM(order.id, e.target.value);
                          }}
                          onBlur={() => setAssigningPM(null)}
                        >
                          <option value="">Select...</option>
                          {PROJECT_MANAGERS.map(pm => (
                            <option key={pm.name} value={pm.name}>{pm.name}</option>
                          ))}
                        </select>
                      ) : (order.assigned_pm_name || order.assigned_pm) ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-green-700 font-medium">{order.assigned_pm_name || order.assigned_pm}</span>
                          <button
                            onClick={() => setAssigningPM(order.id)}
                            className="p-0.5 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500"
                            title="Change PM"
                          >
                            <EditIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningPM(order.id)}
                          className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] hover:bg-gray-200"
                        >
                          Assign
                        </button>
                      )}
                    </td>
                  )}
                  {/* Translator */}
                  <td className={`px-2 py-2 ${(order.assigned_translator_name || order.assigned_translator) ? 'bg-green-50' : ''}`}>
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
                    ) : (order.assigned_translator_name || order.assigned_translator) ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-green-700 font-medium">{order.assigned_translator_name || order.assigned_translator}</span>
                          {/* Edit translator button for Admin and PM */}
                          {(isAdmin || isPM) && (
                            <button
                              onClick={() => openAssignTranslatorModal(order)}
                              className="p-0.5 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500"
                              title="Change translator"
                            >
                              <EditIcon className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {order.translator_assignment_status === 'pending' && (
                          <span className="text-[9px] px-1 py-0.5 bg-yellow-50 text-yellow-600 rounded mt-0.5 inline-block w-fit border border-yellow-200">Pending</span>
                        )}
                        {order.translator_assignment_status === 'accepted' && (
                          <span className="text-[9px] px-1 py-0.5 bg-green-100 text-green-700 rounded mt-0.5 inline-block w-fit">✓ Accepted</span>
                        )}
                        {order.translator_assignment_status === 'declined' && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] px-1 py-0.5 bg-red-100 text-red-700 rounded inline-block w-fit">✕ Declined</span>
                            {(isAdmin || isPM) && (
                              <button
                                onClick={() => openAssignTranslatorModal(order)}
                                className="text-[9px] px-1 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 flex items-center gap-0.5"
                              >
                                <RefreshIcon className="w-2.5 h-2.5" /> Reassign
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (isAdmin || isPM) ? (
                      <button
                        onClick={() => openAssignTranslatorModal(order)}
                        className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] hover:bg-gray-200 flex items-center gap-0.5"
                      >
                        <AssignIcon className="w-3 h-3" /> Assign
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400">-</span>
                    )}
                  </td>
                  {/* Deadline with date+time */}
                  <td className="px-2 py-2">
                    {editingDeadline === order.id && isAdmin ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="date"
                          value={tempDeadlineValue.date}
                          onChange={(e) => setTempDeadlineValue({...tempDeadlineValue, date: e.target.value})}
                          className="px-1 py-0.5 text-[10px] border rounded w-24"
                        />
                        <input
                          type="time"
                          value={tempDeadlineValue.time}
                          onChange={(e) => setTempDeadlineValue({...tempDeadlineValue, time: e.target.value})}
                          className="px-1 py-0.5 text-[10px] border rounded w-24"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => saveDeadlineEdit(order.id)} className="px-1 py-0.5 bg-green-500 text-white rounded text-[10px]">✓</button>
                          <button onClick={() => setEditingDeadline(null)} className="px-1 py-0.5 bg-gray-300 text-gray-700 rounded text-[10px]">✕</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div>
                          {orderDeadline.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          <span className="text-[10px] text-gray-500 block">{orderDeadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {daysUntil > 0 && order.translation_status !== 'delivered' && (
                            <span className={`text-[10px] ${daysUntil <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>({daysUntil}d)</span>
                          )}
                        </div>
                        {isAdmin && (
                          <button onClick={() => startEditingDeadline(order)} className="p-0.5 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500" title="Edit deadline"><EditIcon className="w-3 h-3" /></button>
                        )}
                      </div>
                    )}
                  </td>
                  {/* Status */}
                  <td className="px-2 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[order.translation_status] || 'bg-gray-100'}`}>{getStatusLabel(order.translation_status)}</span></td>
                  {/* Notes */}
                  <td className="px-2 py-2">
                    {editingTags === order.id && isAdmin ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          placeholder="Internal note..."
                          value={tempTagValue.notes}
                          onChange={(e) => setTempTagValue({...tempTagValue, notes: e.target.value})}
                          className="px-1 py-0.5 text-[10px] border rounded w-28"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => saveTagsEdit(order.id)} className="px-1 py-0.5 bg-green-500 text-white rounded text-[10px]">✓</button>
                          <button onClick={() => setEditingTags(null)} className="px-1 py-0.5 bg-gray-300 text-gray-700 rounded text-[10px]">✕</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {order.notes && (
                          <span className="px-1 py-0.5 bg-blue-50 text-blue-500 rounded text-[10px] cursor-help border border-blue-100" title={`Client message: ${order.notes}`}><NoteIcon className="w-3 h-3 inline" /></span>
                        )}
                        {order.internal_notes && (
                          <span className="px-1 py-0.5 bg-amber-50 text-amber-500 rounded text-[10px] cursor-help border border-amber-100" title={`Internal note: ${order.internal_notes}`}><MemoIcon className="w-3 h-3 inline" /></span>
                        )}
                        {isAdmin && (
                          <button onClick={() => startEditingTags(order)} className="p-0.5 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500" title="Edit notes"><EditIcon className="w-3 h-3" /></button>
                        )}
                        {!order.notes && !order.internal_notes && !isAdmin && (
                          <span className="text-gray-300 text-[10px]">-</span>
                        )}
                      </div>
                    )}
                  </td>
                  {/* Translation Ready column - shows when translation is complete */}
                  <td className="px-2 py-2 text-center">
                    {order.translation_ready ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                          ✅ Ready
                        </span>
                        {order.translation_ready_at && (
                          <span className="text-[9px] text-gray-500">
                            {new Date(order.translation_ready_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ) : ['review', 'ready', 'delivered'].includes(order.translation_status) ? (
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-medium border border-blue-200 flex items-center gap-1">
                        <RefreshIcon className="w-3 h-3" /> Review
                      </span>
                    ) : order.translation_status === 'in_translation' ? (
                      <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded text-[10px] font-medium border border-yellow-200 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" /> Working
                      </span>
                    ) : (
                      <span className="text-gray-300 text-[10px]">-</span>
                    )}
                  </td>
                  {/* Total and Payment columns - Admin only */}
                  {isAdmin && <td className="px-2 py-2 text-right font-medium">${order.total_price?.toFixed(2)}</td>}
                  {isAdmin && <td className="px-2 py-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] ${PAYMENT_COLORS[order.payment_status]}`}>{order.payment_status}</span></td>}
                  <td className="px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* View Documents - Always visible */}
                      <button
                        onClick={() => viewOrderDocuments(order)}
                        className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                        title="View Documents"
                      >
                        <DocumentIcon className="w-3.5 h-3.5" />
                      </button>

                      {/* PM Actions */}
                      {isPM && (
                        <>
                          {/* Open Translation Tool for review */}
                          {['in_translation', 'review'].includes(order.translation_status) && (
                            <button
                              onClick={() => startTranslation(order)}
                              className="w-6 h-6 flex items-center justify-center border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors"
                              title="Open Translation / Review"
                            >
                              <span className="text-xs">✍️</span>
                            </button>
                          )}
                          {/* Review Side-by-Side button - when translation is in review or ready */}
                          {['review', 'ready', 'client_review'].includes(order.translation_status) && (
                            <button
                              onClick={() => openReviewModal(order)}
                              className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-green-300 hover:text-green-500 hover:bg-green-50 transition-colors"
                              title="Review Translation (Side-by-Side)"
                            >
                              <SearchIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Mark as In Translation (start work) */}
                          {order.translation_status === 'received' && order.translator_assignment_status === 'accepted' && (
                            <button onClick={() => updateStatus(order.id, 'in_translation')} className="w-6 h-6 flex items-center justify-center border border-amber-300 text-amber-600 rounded hover:bg-amber-50 transition-colors" title="Start Translation">
                              <span className="text-xs">▶</span>
                            </button>
                          )}
                          {/* Send to PM Review */}
                          {order.translation_status === 'in_translation' && (
                            <button onClick={() => updateStatus(order.id, 'review')} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50 transition-colors" title="Send to PM Review">
                              <EyeIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* From Review: Send to Client Review OR Mark as Final */}
                          {order.translation_status === 'review' && (
                            <>
                              <button onClick={() => updateStatus(order.id, 'client_review')} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-colors" title="Send to Client Review">
                                <MailIcon className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => updateStatus(order.id, 'ready')} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-green-300 hover:text-green-500 hover:bg-green-50 transition-colors" title="Mark as Final">
                                <CheckIcon className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {/* Client Review: Back to revision or Mark as Final */}
                          {order.translation_status === 'client_review' && (
                            <>
                              <button onClick={() => updateStatus(order.id, 'review')} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-yellow-300 hover:text-yellow-500 hover:bg-yellow-50 transition-colors" title="Back to Revision">
                                <RefreshIcon className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => updateStatus(order.id, 'ready')} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-green-300 hover:text-green-500 hover:bg-green-50 transition-colors" title="Mark as Final">
                                <CheckIcon className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {/* Ready: Deliver to client */}
                          {order.translation_status === 'ready' && (
                            <button onClick={() => deliverOrder(order.id)} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-teal-300 hover:text-teal-500 hover:bg-teal-50 transition-colors" title="Deliver to Client">
                              <SendIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      {/* Admin Actions */}
                      {isAdmin && (
                        <>
                          {['received', 'in_translation', 'review'].includes(order.translation_status) && (
                            <button
                              onClick={() => startTranslation(order)}
                              className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                              title="Open Translation Tool"
                            >
                              <WriteIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Review Side-by-Side button - when translation is in review or ready */}
                          {['review', 'ready', 'client_review'].includes(order.translation_status) && (
                            <button
                              onClick={() => openReviewModal(order)}
                              className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-green-300 hover:text-green-500 hover:bg-green-50 transition-colors"
                              title="Review Translation (Side-by-Side)"
                            >
                              <SearchIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {order.translation_status === 'received' && (
                            <button onClick={() => updateStatus(order.id, 'in_translation')} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-amber-300 hover:text-amber-500 hover:bg-amber-50 transition-colors" title="Start">
                              <PlayIcon className="w-3 h-3" />
                            </button>
                          )}
                          {order.translation_status === 'in_translation' && (
                            <button onClick={() => updateStatus(order.id, 'review')} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50 transition-colors" title="Send to PM Review">
                              <EyeIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {order.translation_status === 'review' && (
                            <>
                              <button onClick={() => updateStatus(order.id, 'client_review')} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-colors" title="Send to Client Review">
                                <MailIcon className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => updateStatus(order.id, 'ready')} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-green-300 hover:text-green-500 hover:bg-green-50 transition-colors" title="Mark as Final">
                                <CheckIcon className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {order.translation_status === 'client_review' && (
                            <>
                              <button onClick={() => updateStatus(order.id, 'review')} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-yellow-300 hover:text-yellow-500 hover:bg-yellow-50 transition-colors" title="Back to Revision">
                                <RefreshIcon className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => updateStatus(order.id, 'ready')} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-green-300 hover:text-green-500 hover:bg-green-50 transition-colors" title="Mark as Final">
                                <CheckIcon className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {order.translation_status === 'ready' && (
                            <button onClick={() => deliverOrder(order.id)} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-teal-300 hover:text-teal-500 hover:bg-teal-50 transition-colors" title="Deliver">
                              <SendIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {order.payment_status === 'pending' && (
                            <button onClick={() => markPaid(order.id)} className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50 transition-colors" title="Mark Paid">
                              <span className="text-xs font-medium">$</span>
                            </button>
                          )}
                          <button
                            onClick={() => deleteOrder(order.id, order.order_number)}
                            className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-400 rounded hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete Order"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Summary Footer */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                <td colSpan={isAdmin ? 11 : 10} className="px-4 py-3">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-700">
                      📊 Total Orders: <span className="text-blue-600 font-bold">{filtered.length}</span>
                    </span>
                    {isAdmin && (
                      <span className="text-slate-700">
                        💰 Total Revenue: <span className="text-green-600 font-bold">${filtered.reduce((sum, order) => sum + (order.total_price || 0), 0).toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No projects found</div>}
      </div>

      {/* Enhanced Project Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <div>
                <h3 className="font-bold text-lg">PROJECT {viewingOrder.order_number}</h3>
                <p className="text-xs opacity-80">{viewingOrder.client_name}</p>
              </div>
              <div className="flex items-center gap-2">
                {(isAdmin || isPM) && (
                  <button
                    onClick={() => {
                      setTempNotes({ client: viewingOrder.notes || '', internal: viewingOrder.internal_notes || '' });
                      setEditingNotes(true);
                    }}
                    className="px-2 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30"
                  >
                    Update
                  </button>
                )}
                <button onClick={() => { setViewingOrder(null); setProjectModalTab('details'); setEditingNotes(false); }} className="text-white hover:text-gray-200 text-xl">×</button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-gray-50">
              {['details', 'files', 'workflow'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setProjectModalTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    projectModalTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'details' ? 'Details' : tab === 'files' ? 'Files' : 'Workflow'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Details Tab */}
              {projectModalTab === 'details' && (
                <div className="space-y-4">
                  {/* Client Section */}
                  <div>
                    <h4 className="text-sm font-bold text-blue-600 mb-2">Client</h4>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 font-medium text-gray-600 w-1/3">Client</td>
                          <td className="py-2 text-blue-600">{viewingOrder.client_name}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 font-medium text-gray-600">Email</td>
                          <td className="py-2">{viewingOrder.client_email}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Requirements Section */}
                  <div>
                    <h4 className="text-sm font-bold text-blue-600 mb-2">Requirements</h4>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 font-medium text-gray-600 w-1/3">Language Pair</td>
                          <td className="py-2">{viewingOrder.translate_from} → {viewingOrder.translate_to}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 font-medium text-gray-600">Service Type</td>
                          <td className="py-2 capitalize">{viewingOrder.service_type || 'Standard'}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 font-medium text-gray-600">Pages</td>
                          <td className="py-2">{viewingOrder.page_count || 1}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 font-medium text-gray-600">Urgency</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${viewingOrder.urgency === 'urgent' ? 'bg-red-100 text-red-700' : viewingOrder.urgency === 'priority' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                              {viewingOrder.urgency === 'no' ? 'Normal' : viewingOrder.urgency || 'Normal'}
                            </span>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 font-medium text-gray-600">Created</td>
                          <td className="py-2">{new Date(viewingOrder.created_at).toLocaleString()}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 font-medium text-gray-600">Deadline</td>
                          <td className="py-2">
                            {viewingOrder.deadline ? (
                              <span className="text-orange-600 font-medium">
                                {new Date(viewingOrder.deadline).toLocaleString()}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Notes Section */}
                  <div>
                    <h4 className="text-sm font-bold text-blue-600 mb-2">Notes</h4>
                    {editingNotes ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">💬 Client Note</label>
                          <textarea
                            value={tempNotes.client}
                            onChange={(e) => setTempNotes(prev => ({ ...prev, client: e.target.value }))}
                            className="w-full px-2 py-1.5 border rounded text-xs"
                            rows="2"
                            placeholder="Notes visible to client..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">📝 Internal Note (Admin/PM only)</label>
                          <textarea
                            value={tempNotes.internal}
                            onChange={(e) => setTempNotes(prev => ({ ...prev, internal: e.target.value }))}
                            className="w-full px-2 py-1.5 border rounded text-xs"
                            rows="2"
                            placeholder="Internal notes..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateOrderNotes(viewingOrder.id, tempNotes.client, tempNotes.internal)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Save Notes
                          </button>
                          <button
                            onClick={() => setEditingNotes(false)}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {viewingOrder.notes ? (
                          <div className="p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="text-[10px] font-medium text-blue-600 mb-1">💬 Client Note:</div>
                            <p className="text-xs text-gray-700">{viewingOrder.notes}</p>
                          </div>
                        ) : (
                          <div className="p-2 bg-gray-50 rounded border text-xs text-gray-400">No client notes</div>
                        )}
                        {(isAdmin || isPM) && (
                          viewingOrder.internal_notes ? (
                            <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                              <div className="text-[10px] font-medium text-yellow-600 mb-1">📝 Internal Note:</div>
                              <p className="text-xs text-gray-700">{viewingOrder.internal_notes}</p>
                            </div>
                          ) : (
                            <div className="p-2 bg-gray-50 rounded border text-xs text-gray-400">No internal notes</div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Assignment Section */}
                  <div>
                    <h4 className="text-sm font-bold text-blue-600 mb-2">Assignment</h4>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 font-medium text-gray-600 w-1/3">Project Manager</td>
                          <td className="py-2">{viewingOrder.assigned_pm_name || viewingOrder.assigned_pm || '-'}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 font-medium text-gray-600">Translator</td>
                          <td className="py-2">
                            {viewingOrder.assigned_translator_name || viewingOrder.assigned_translator || '-'}
                            {viewingOrder.translator_assignment_status && (
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                                viewingOrder.translator_assignment_status === 'accepted' ? 'bg-green-100 text-green-700' :
                                viewingOrder.translator_assignment_status === 'declined' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {viewingOrder.translator_assignment_status}
                              </span>
                            )}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 font-medium text-gray-600">Status</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${STATUS_COLORS[viewingOrder.translation_status] || 'bg-gray-100'}`}>
                              {viewingOrder.translation_status}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Section - Admin only */}
                  {isAdmin && (
                    <div>
                      <h4 className="text-sm font-bold text-blue-600 mb-2">Financial</h4>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 font-medium text-gray-600 w-1/3">Total Price</td>
                            <td className="py-2 font-bold text-green-600">${viewingOrder.total_price?.toFixed(2) || '0.00'}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-medium text-gray-600">Payment Status</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${PAYMENT_COLORS[viewingOrder.payment_status] || 'bg-gray-100'}`}>
                                {viewingOrder.payment_status || 'pending'}
                              </span>
                            </td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-medium text-gray-600">Payment Method</td>
                            <td className="py-2 capitalize">{viewingOrder.payment_method || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Files Tab */}
              {projectModalTab === 'files' && (
                <div className="space-y-4">
                  {/* Upload Section - Admin/PM only */}
                  {(isAdmin || isPM) && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-xs font-medium text-blue-700 mb-2">📤 Upload Document</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="project-doc-upload"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          onChange={(e) => uploadDocumentToOrder(viewingOrder.id, e.target.files[0])}
                          className="hidden"
                        />
                        <label
                          htmlFor="project-doc-upload"
                          className={`px-3 py-1.5 rounded text-xs cursor-pointer ${uploadingProjectDoc ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          {uploadingProjectDoc ? 'Uploading...' : 'Choose File'}
                        </label>
                        <span className="text-[10px] text-gray-500">PDF, DOC, DOCX, TXT, JPG, PNG</span>
                      </div>
                    </div>
                  )}

                  {/* Documents List */}
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">📁 Original Documents</div>
                    {loadingDocuments ? (
                      <div className="text-center py-4 text-gray-500 text-xs">Loading documents...</div>
                    ) : orderDocuments.length > 0 ? (
                      <div className="space-y-2">
                        {orderDocuments.map((doc, idx) => (
                          <div key={doc.id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100">
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">
                                {doc.filename?.endsWith('.pdf') ? '📕' : doc.filename?.match(/\.(jpg|jpeg|png)$/i) ? '🖼️' : '📄'}
                              </span>
                              <div>
                                <div className="text-sm font-medium">{doc.filename || 'Document'}</div>
                                <div className="text-[10px] text-gray-500">
                                  {doc.source === 'manual_upload' ? 'Manual upload' : 'Partner portal'}
                                  {doc.uploaded_at && ` • ${new Date(doc.uploaded_at).toLocaleDateString()}`}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => downloadDocument(doc.id, doc.filename)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center gap-1"
                            >
                              <span>⬇️</span> Download
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <div className="text-4xl mb-2">📭</div>
                        <div className="text-sm">No documents found</div>
                        {viewingOrder.document_filename && (
                          <div className="mt-2 text-xs text-gray-500">
                            Registered file: {viewingOrder.document_filename}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Workflow Tab */}
              {projectModalTab === 'workflow' && (
                <div className="space-y-4">
                  <div className="text-xs font-medium text-gray-600 mb-3">Project Workflow Status</div>

                  {/* Workflow Steps */}
                  <div className="space-y-3">
                    {[
                      { status: 'received', label: 'Received', icon: '📥', desc: 'Project received and awaiting assignment' },
                      { status: 'in_translation', label: 'In Translation', icon: '✍️', desc: 'Translator is working on the document' },
                      { status: 'review', label: 'PM Review', icon: '🔍', desc: 'Project Manager reviewing translation' },
                      { status: 'client_review', label: 'Client Review', icon: '👤', desc: 'Client reviewing the translation' },
                      { status: 'ready', label: 'Ready', icon: '✅', desc: 'Translation approved and ready for delivery' },
                      { status: 'delivered', label: 'Delivered', icon: '📤', desc: 'Sent to client' }
                    ].map((step, idx) => {
                      const currentIdx = ['received', 'in_translation', 'review', 'client_review', 'ready', 'delivered'].indexOf(viewingOrder.translation_status);
                      const stepIdx = idx;
                      const isCompleted = stepIdx < currentIdx;
                      const isCurrent = viewingOrder.translation_status === step.status;

                      return (
                        <div key={step.status} className={`flex items-start p-3 rounded-lg border ${isCurrent ? 'bg-blue-50 border-blue-300' : isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${isCurrent ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                            {isCompleted ? '✓' : step.icon}
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'}`}>
                              {step.label}
                              {isCurrent && <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px]">Current</span>}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{step.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Translator Assignment Status */}
                  {(viewingOrder.assigned_translator_name || viewingOrder.assigned_translator) && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-xs font-medium text-purple-700 mb-2">Translator Assignment</div>
                      <div className="text-sm">{viewingOrder.assigned_translator_name || viewingOrder.assigned_translator}</div>
                      <div className={`text-xs mt-1 ${
                        viewingOrder.translator_assignment_status === 'accepted' ? 'text-green-600' :
                        viewingOrder.translator_assignment_status === 'declined' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        Status: {viewingOrder.translator_assignment_status || 'pending'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-gray-50 flex justify-end gap-2 rounded-b-lg">
              <button
                onClick={() => { setViewingOrder(null); setProjectModalTab('details'); setEditingNotes(false); }}
                className="px-4 py-1.5 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send to Client Modal */}
      {sendingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b flex justify-between items-center bg-teal-600 text-white rounded-t-lg">
              <div>
                <h3 className="font-bold">📤 Send to Client</h3>
                <p className="text-xs opacity-80">{sendingOrder.order_number} - {sendingOrder.client_name}</p>
              </div>
              <button onClick={() => setSendingOrder(null)} className="text-white hover:text-gray-200 text-xl">×</button>
            </div>

            <div className="p-4">
              {/* Client Info */}
              <div className="mb-4 p-3 bg-gray-50 rounded border">
                <div className="text-xs font-medium text-gray-600 mb-1">Client:</div>
                <div className="text-sm font-medium">{sendingOrder.client_name}</div>
                <div className="text-xs text-gray-500">{sendingOrder.client_email}</div>
              </div>

              {/* Translated Document Status */}
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-600 mb-2">📄 Translated Document:</div>
                {!translatedDocInfo ? (
                  <div className="text-center py-3 text-gray-500 text-xs">Loading...</div>
                ) : translatedDocInfo.has_translated_document ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-green-600 text-lg mr-2">✅</span>
                        <div>
                          <div className="text-xs font-medium text-green-800">Translation available</div>
                          <div className="text-[10px] text-green-600">
                            {translatedDocInfo.translated_filename || 'HTML generated in workspace'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadTranslatedDocument(sendingOrder.id, translatedDocInfo.translated_filename)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        ⬇️ Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-center">
                      <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                      <div className="text-xs text-yellow-800">
                        No translation attached. Upload below or send without attachment.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload new document */}
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-600 mb-2">📎 Upload new document:</div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="translationFile"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        uploadTranslatedDocument(sendingOrder.id, e.target.files[0]);
                      }
                    }}
                  />
                  <label
                    htmlFor="translationFile"
                    className={`flex-1 px-3 py-2 border-2 border-dashed rounded text-center cursor-pointer hover:bg-gray-50 text-xs ${uploadingFile ? 'opacity-50' : ''}`}
                  >
                    {uploadingFile ? 'Uploading...' : '📁 Click to select file (PDF, DOC)'}
                  </label>
                </div>
              </div>

              {/* Notify PM Option */}
              {sendingOrder?.assigned_pm_id && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyPM}
                      onChange={(e) => setNotifyPM(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-medium text-purple-700">Notify Project Manager</span>
                      <p className="text-[10px] text-purple-600">
                        {sendingOrder.assigned_pm_name || sendingOrder.assigned_pm || 'Assigned PM'} will receive a copy
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* BCC Field */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  📧 BCC (Blind Carbon Copy):
                </label>
                <input
                  type="email"
                  value={sendBccEmail}
                  onChange={(e) => setSendBccEmail(e.target.value)}
                  placeholder="email@example.com (optional)"
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Send a hidden copy to another email address
                </p>
              </div>

              {/* Warning */}
              <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-700">
                💡 By clicking "Send", the client will receive an email with the translation attached (if available).
              </div>
            </div>

            <div className="p-3 border-t bg-gray-50 flex justify-between rounded-b-lg">
              <button
                onClick={() => setSendingOrder(null)}
                className="px-4 py-1.5 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => sendTranslationToClient(sendingOrder.id)}
                disabled={sendingToClient}
                className="px-4 py-1.5 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 disabled:bg-gray-400"
              >
                {sendingToClient ? 'Sending...' : '📤 Send to Client'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  // Permissions matrix data
  const PERMISSIONS = {
    roles: ['Administrator', 'Project Manager', 'Sales', 'Translator'],
    permissions: [
      { name: 'Projects', desc: 'View and manage projects', admin: true, pm: true, sales: true, translator: false },
      { name: 'Create Projects', desc: 'Create new projects', admin: true, pm: true, sales: true, translator: false },
      { name: 'Assign Translator', desc: 'Assign translators to projects', admin: true, pm: true, sales: false, translator: false },
      { name: 'Translation Tool', desc: 'Access translation workspace', admin: true, pm: true, sales: false, translator: true },
      { name: 'Review Translation', desc: 'Review and approve translations', admin: true, pm: true, sales: false, translator: false },
      { name: 'Send to Client', desc: 'Send completed work to client', admin: true, pm: true, sales: false, translator: false },
      { name: 'Clients', desc: 'View client profiles', admin: true, pm: true, sales: true, translator: false },
      { name: 'Translators', desc: 'View translator profiles', admin: true, pm: true, sales: false, translator: false },
      { name: 'Register Translators', desc: 'Add new translators', admin: true, pm: true, sales: false, translator: false },
      { name: 'Delete Translators', desc: 'Remove translators', admin: true, pm: false, sales: false, translator: false },
      { name: 'Finances', desc: 'View financial reports', admin: true, pm: false, sales: false, translator: false },
      { name: 'Reports', desc: 'Access analytics and reports', admin: true, pm: false, sales: false, translator: false },
      { name: 'Settings', desc: 'Manage system settings', admin: true, pm: false, sales: false, translator: false },
      { name: 'User Management', desc: 'Create and manage users', admin: true, pm: false, sales: false, translator: false },
    ]
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-lg font-bold text-blue-600 mb-4">SETTINGS</h1>

      {/* Permissions Matrix */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-sm font-bold text-gray-800">Role Permissions Matrix</h2>
          <p className="text-xs text-gray-500 mt-1">Only Administrator can modify role permissions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 font-semibold text-gray-700 border-b">Permission</th>
                <th className="text-center p-3 font-semibold text-gray-700 border-b w-24">Admin</th>
                <th className="text-center p-3 font-semibold text-gray-700 border-b w-24">PM</th>
                <th className="text-center p-3 font-semibold text-gray-700 border-b w-24">Sales</th>
                <th className="text-center p-3 font-semibold text-gray-700 border-b w-24">Translator</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.permissions.map((perm, idx) => (
                <tr key={perm.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 border-b">
                    <div className="font-medium text-gray-800">{perm.name}</div>
                    <div className="text-[10px] text-gray-500">{perm.desc}</div>
                  </td>
                  <td className={`p-3 border-b text-center ${perm.admin ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${perm.admin ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {perm.admin ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className={`p-3 border-b text-center ${perm.pm ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${perm.pm ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {perm.pm ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className={`p-3 border-b text-center ${perm.sales ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${perm.sales ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {perm.sales ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className={`p-3 border-b text-center ${perm.translator ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${perm.translator ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {perm.translator ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center">
                <span className="mr-2">📊</span>
                <span>QuickBooks (Make.com)</span>
              </div>
              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[10px] font-medium">Connected</span>
            </div>
          </div>
        </div>

        {/* Workflow Info */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Workflow Status Legend</h2>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
              <span>Received</span>
              <span className="text-gray-600">Awaiting assignment</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
              <span>In Translation</span>
              <span className="text-yellow-700">Translator working</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
              <span>PM Review</span>
              <span className="text-purple-700">PM reviewing</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
              <span>Client Review</span>
              <span className="text-orange-700">Client reviewing</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <span>Ready</span>
              <span className="text-green-700">Ready to deliver</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-teal-50 rounded">
              <span>Delivered</span>
              <span className="text-teal-700">Sent to client</span>
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
const UsersPage = ({ adminKey, user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'translator', rate_per_page: '', rate_per_word: '', language_pairs: '' });
  const [creating, setCreating] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isPM = user?.role === 'pm';

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
      // Build user data with optional translator pricing
      const userData = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        rate_per_page: newUser.rate_per_page ? parseFloat(newUser.rate_per_page) : null,
        rate_per_word: newUser.rate_per_word ? parseFloat(newUser.rate_per_word) : null,
        language_pairs: newUser.language_pairs || null
      };
      await axios.post(`${API}/admin/auth/register?admin_key=${adminKey}`, userData);
      setNewUser({ name: '', email: '', password: '', role: 'translator', rate_per_page: '', rate_per_word: '', language_pairs: '' });
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

  // PM can only see translators
  const filteredUsers = isPM ? users.filter(u => u.role === 'translator') : users;

  if (loading) return <div className="p-6 text-center">Loading users...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{isPM ? '👥 Translators' : '👤 User Management'}</h1>
          {isPM && <p className="text-xs text-gray-500 mt-1">Register and manage translators</p>}
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm"
        >
          + {isPM ? 'Register Translator' : 'Create User'}
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="font-bold text-sm mb-3">{isPM ? 'Register New Translator' : 'Create New User'}</h3>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
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
              {isPM ? (
                <input type="hidden" value="translator" />
              ) : (
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
              )}
            </div>

            {/* Translator Pricing - always show for translators */}
            {(newUser.role === 'translator' || isPM) && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rate per Page ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 15.00"
                    value={newUser.rate_per_page}
                    onChange={(e) => setNewUser({...newUser, rate_per_page: e.target.value})}
                    className="w-full px-3 py-2 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rate per Word ($)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="e.g. 0.08"
                    value={newUser.rate_per_word}
                    onChange={(e) => setNewUser({...newUser, rate_per_word: e.target.value})}
                    className="w-full px-3 py-2 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Language Pairs</label>
                  <input
                    type="text"
                    placeholder="e.g. EN-PT, ES-EN"
                    value={newUser.language_pairs}
                    onChange={(e) => setNewUser({...newUser, language_pairs: e.target.value})}
                    className="w-full px-3 py-2 text-sm border rounded"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
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
              {!isPM && <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>}
              {isPM && <th className="px-4 py-3 text-left font-medium text-gray-700">Rate/Page</th>}
              {isPM && <th className="px-4 py-3 text-left font-medium text-gray-700">Languages</th>}
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                {!isPM && (
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[u.role]}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                )}
                {isPM && (
                  <td className="px-4 py-3 text-gray-600">
                    {u.rate_per_page ? `$${u.rate_per_page}` : '-'}
                  </td>
                )}
                {isPM && (
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {u.language_pairs || '-'}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 space-x-2">
                  {isAdmin && (
                    <button
                      onClick={() => handleToggleActive(u.id)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  )}
                  {isPM && (
                    <span className="text-gray-400 text-xs">View only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
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
    if (!window.confirm('Delete this payment record?')) return;
    try {
      await axios.delete(`${API}/admin/payments/${paymentId}?admin_key=${adminKey}`);
      fetchPayments();
      fetchStats();
    } catch (err) {
      alert('Error deleting payment');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  if (loading) return <div className="p-6 text-center">Loading statistics...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">📊 Production & Payments</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('stats')}
            className={`px-4 py-2 rounded text-sm ${activeView === 'stats' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveView('payments')}
            className={`px-4 py-2 rounded text-sm ${activeView === 'payments' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Payment History
          </button>
        </div>
      </div>

      {activeView === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Translator Stats Cards */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-sm font-bold text-gray-800">Translators</h2>
            </div>
            <div className="p-4 space-y-3">
              {stats.length === 0 ? (
                <div className="text-center text-gray-500 py-4">No translators found</div>
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
                        <div className="text-green-600">Completed</div>
                        <div className="font-bold text-green-700">{translator.completed_pages}</div>
                      </div>
                      <div className="bg-blue-100 rounded p-2">
                        <div className="text-blue-600">Paid</div>
                        <div className="font-bold text-blue-700">{translator.paid_pages}</div>
                      </div>
                      <div className="bg-yellow-100 rounded p-2">
                        <div className="text-yellow-600">To Pay</div>
                        <div className="font-bold text-yellow-700">{translator.pending_payment_pages}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {translator.completed_orders} of {translator.orders_count} projects completed
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
                {selectedTranslator ? `${selectedTranslator.translator_name}'s Projects` : 'Select a translator'}
              </h2>
            </div>
            <div className="p-4">
              {!selectedTranslator ? (
                <div className="text-center text-gray-500 py-8">
                  Click on a translator to view their projects
                </div>
              ) : translatorOrders.length === 0 ? (
                <div className="text-center text-gray-500 py-4">No completed projects</div>
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
                          <div className="font-bold text-teal-600">{order.page_count || 0} pages</div>
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
            <h2 className="text-sm font-bold text-gray-800">Payment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Translator</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Period</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Pages</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Payment Date</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      No payments registered
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
                          Delete
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
                  <option value="">Select...</option>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                >
                  Register Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== FINANCES PAGE ====================
const FinancesPage = ({ adminKey }) => {
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [activeView, setActiveView] = useState('overview'); // overview, expenses
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'fixed',
    subcategory: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurring_period: '',
    vendor: '',
    notes: ''
  });

  const EXPENSE_CATEGORIES = {
    fixed: { label: 'Fixed Expenses', color: '#3B82F6' },
    translators: { label: 'Translators', color: '#10B981' },
    ai: { label: 'AI & Technology', color: '#8B5CF6' },
    marketing: { label: 'Marketing', color: '#F59E0B' },
    office: { label: 'Office', color: '#EF4444' },
    utilities: { label: 'Utilities', color: '#06B6D4' },
    other: { label: 'Other', color: '#6B7280' }
  };

  const REVENUE_SOURCES = {
    website: { label: 'Website', color: '#3B82F6' },
    whatsapp: { label: 'WhatsApp', color: '#22C55E' },
    social_media: { label: 'Social Media', color: '#A855F7' },
    referral: { label: 'Referral', color: '#F59E0B' },
    partner: { label: 'Partner', color: '#06B6D4' },
    other: { label: 'Other', color: '#6B7280' }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/admin/finances/summary?admin_key=${adminKey}&period=${period}`);
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching financial summary:', err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await axios.get(`${API}/admin/expenses?admin_key=${adminKey}`);
      setExpenses(response.data.expenses || []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchExpenses()]);
      setLoading(false);
    };
    loadData();
  }, [adminKey, period]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/expenses?admin_key=${adminKey}`, expenseForm);
      setShowExpenseModal(false);
      setExpenseForm({
        category: 'fixed', subcategory: '', description: '', amount: 0,
        date: new Date().toISOString().split('T')[0], is_recurring: false,
        recurring_period: '', vendor: '', notes: ''
      });
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      alert('Error creating expense');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await axios.delete(`${API}/admin/expenses/${expenseId}?admin_key=${adminKey}`);
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      alert('Error deleting expense');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Simple Donut Chart Component
  const DonutChart = ({ data, total }) => {
    const items = Object.entries(data).filter(([_, v]) => v.amount > 0);
    if (items.length === 0) return <div className="text-center text-gray-500 py-8">Sem dados</div>;

    let currentAngle = 0;
    const segments = items.map(([key, value]) => {
      const percentage = total > 0 ? (value.amount / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const segment = { key, ...value, percentage, startAngle: currentAngle, angle };
      currentAngle += angle;
      return segment;
    });

    return (
      <div className="flex items-center justify-center space-x-4">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {segments.map((seg, i) => {
              const radius = 40;
              const circumference = 2 * Math.PI * radius;
              const strokeDasharray = (seg.angle / 360) * circumference;
              const strokeDashoffset = -(seg.startAngle / 360) * circumference;
              const color = EXPENSE_CATEGORIES[seg.key]?.color || REVENUE_SOURCES[seg.key]?.color || '#6B7280';
              return (
                <circle
                  key={seg.key}
                  cx="50" cy="50" r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="20"
                  strokeDasharray={`${strokeDasharray} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-700">{formatCurrency(total)}</span>
          </div>
        </div>
        <div className="space-y-1 text-xs">
          {segments.map((seg) => {
            const catInfo = EXPENSE_CATEGORIES[seg.key] || REVENUE_SOURCES[seg.key] || { label: seg.key, color: '#6B7280' };
            return (
              <div key={seg.key} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: catInfo.color }}></div>
                <span className="text-gray-600">{catInfo.label}: {formatCurrency(seg.amount)}</span>
                <span className="ml-1 text-gray-400">({seg.percentage.toFixed(0)}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-6 text-center">Carregando dados financeiros...</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">💰 Finances</h1>
        <div className="flex items-center space-x-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="month">This Month</option>
            <option value="last30">Last 30 days</option>
            <option value="year">This Year</option>
            <option value="last365">Last 365 days</option>
          </select>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 rounded text-sm ${activeView === 'overview' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('expenses')}
              className={`px-4 py-2 rounded text-sm ${activeView === 'expenses' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Expenses
            </button>
          </div>
        </div>
      </div>

      {activeView === 'overview' && summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Profit & Loss */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Profit & Loss</h3>
              </div>
              <div className={`text-2xl font-bold ${summary.profit_loss.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.profit_loss.net_profit)}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Revenue</span>
                  <span className="font-medium text-green-600">{formatCurrency(summary.profit_loss.total_revenue)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, (summary.profit_loss.total_revenue / (summary.profit_loss.total_revenue + summary.profit_loss.total_expenses)) * 100)}%` }}></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Expenses</span>
                  <span className="font-medium text-red-600">{formatCurrency(summary.profit_loss.total_expenses)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(100, (summary.profit_loss.total_expenses / (summary.profit_loss.total_revenue + summary.profit_loss.total_expenses)) * 100)}%` }}></div>
                </div>
              </div>
              {summary.profit_loss.revenue_change_percent !== 0 && (
                <div className={`mt-3 text-xs ${summary.profit_loss.revenue_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.profit_loss.revenue_change_percent >= 0 ? '↑' : '↓'} {Math.abs(summary.profit_loss.revenue_change_percent)}% vs previous period
                </div>
              )}
            </div>

            {/* Expenses Breakdown */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Expenses</h3>
                <span className="text-lg font-bold text-gray-800">{formatCurrency(summary.expenses.total)}</span>
              </div>
              <DonutChart data={summary.expenses.by_category} total={summary.expenses.total} />
            </div>

            {/* Invoices */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Invoices</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-bold text-yellow-600">{formatCurrency(summary.invoices.pending)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Overdue</span>
                  <span className="font-bold text-red-600">{formatCurrency(summary.invoices.overdue)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Paid (period)</span>
                    <span className="font-bold text-green-600">{formatCurrency(summary.invoices.paid)}</span>
                  </div>
                </div>
                <div className="mt-2 flex space-x-1">
                  <div className="h-2 bg-red-500 rounded" style={{ width: `${(summary.invoices.overdue / (summary.invoices.paid + summary.invoices.pending + summary.invoices.overdue || 1)) * 100}%` }}></div>
                  <div className="h-2 bg-yellow-500 rounded" style={{ width: `${(summary.invoices.pending / (summary.invoices.paid + summary.invoices.pending + summary.invoices.overdue || 1)) * 100}%` }}></div>
                  <div className="h-2 bg-green-500 rounded flex-1"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Sources & Languages */}
          <div className="grid grid-cols-2 gap-6">
            {/* Revenue by Source */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">Revenue by Source</h3>
              <div className="space-y-3">
                {Object.entries(summary.revenue.by_source).map(([key, value]) => {
                  const sourceInfo = REVENUE_SOURCES[key] || { label: key, color: '#6B7280' };
                  const percentage = summary.revenue.total > 0 ? (value.amount / summary.revenue.total) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{sourceInfo.label}</span>
                        <span className="font-medium">{formatCurrency(value.amount)} ({value.count})</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${percentage}%`, backgroundColor: sourceInfo.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revenue by Language */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">Revenue by Language</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(summary.revenue.by_language).map(([langPair, value]) => {
                  const percentage = summary.revenue.total > 0 ? (value.amount / summary.revenue.total) * 100 : 0;
                  return (
                    <div key={langPair} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{langPair}</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="h-2 rounded-full bg-teal-500" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="font-medium w-20 text-right">{formatCurrency(value.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {activeView === 'expenses' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Expenses List</h3>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
            >
              + New Expense
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Categoria</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Descrição</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fornecedor</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Valor</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No expenses registered</td></tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{formatDate(expense.date)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs" style={{
                          backgroundColor: `${EXPENSE_CATEGORIES[expense.category]?.color}20`,
                          color: EXPENSE_CATEGORIES[expense.category]?.color
                        }}>
                          {EXPENSE_CATEGORIES[expense.category]?.label || expense.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">{expense.description}</td>
                      <td className="px-4 py-3 text-gray-500">{expense.vendor || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(expense.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-600 hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">New Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleCreateExpense} className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Categoria</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  required
                >
                  {Object.entries(EXPENSE_CATEGORIES).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Descrição</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Valor ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Data</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fornecedor (opcional)</label>
                <input
                  type="text"
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({...expenseForm, vendor: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={expenseForm.is_recurring}
                  onChange={(e) => setExpenseForm({...expenseForm, is_recurring: e.target.checked})}
                  className="mr-2"
                />
                <label className="text-sm text-gray-600">Recurring expense</label>
              </div>
              {expenseForm.is_recurring && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Period</label>
                  <select
                    value={expenseForm.recurring_period}
                    onChange={(e) => setExpenseForm({...expenseForm, recurring_period: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 border rounded text-sm text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700">Save</button>
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
      case 'finances':
        return userRole === 'admin'
          ? <FinancesPage adminKey={adminKey} />
          : <div className="p-6 text-center text-gray-500">Access denied</div>;
      case 'users':
        return ['admin', 'pm'].includes(userRole)
          ? <UsersPage adminKey={adminKey} user={user} />
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <TopBar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} user={user} adminKey={adminKey} />
      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default AdminApp;
