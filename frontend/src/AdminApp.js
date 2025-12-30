import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

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
  'review': 'bg-indigo-100 text-indigo-700',
  'pending_pm_review': 'bg-purple-100 text-purple-700',
  'pending_admin_approval': 'bg-blue-100 text-blue-700',
  'client_review': 'bg-orange-100 text-orange-700',
  'ready': 'bg-green-100 text-green-700',
  'delivered': 'bg-teal-100 text-teal-700',
  'final': 'bg-purple-100 text-purple-700'
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
  // Primary Languages (Top 3)
  "English", "Spanish", "Portuguese",
  // All other languages in alphabetical order
  "Afrikaans", "Albanian", "Amharic", "Arabic", "Arabic (Saudi Arabia)", "Armenian",
  "Azerbaijani", "Basque", "Belarusian", "Bengali", "Bosnian", "Bulgarian",
  "Burmese", "Cape Verdean Creole", "Catalan", "Chinese (Simplified)", "Chinese (Traditional)",
  "Croatian", "Czech", "Danish", "Dutch", "English (UK)", "English (USA)",
  "Esperanto", "Estonian", "Filipino/Tagalog", "Finnish", "French", "French (Canada)",
  "French (France)", "Galician", "Georgian", "German", "Greek", "Gujarati",
  "Haitian Creole", "Hebrew", "Hindi", "Hungarian", "Icelandic", "Igbo",
  "Indonesian", "Irish", "Italian", "Japanese", "Kazakh", "Khmer",
  "Korean", "Lao", "Latin", "Latvian", "Lithuanian", "Luxembourgish",
  "Macedonian", "Malay", "Maltese", "Mongolian", "Nepali", "Norwegian",
  "Papiamento", "Persian/Farsi", "Polish", "Portuguese (Brazil)", "Portuguese (Portugal)",
  "Punjabi", "Romanian", "Russian", "Scottish Gaelic", "Serbian", "Slovak",
  "Slovenian", "Somali", "Spanish (Latin America)", "Spanish (Spain)", "Swahili",
  "Swedish", "Tamil", "Telugu", "Thai", "Turkish", "Ukrainian",
  "Urdu", "Uzbek", "Vietnamese", "Welsh", "Yoruba", "Zulu"
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

// Document Types for translation projects
const DOCUMENT_TYPES = [
  { value: '', label: '-- Select Document Type --' },
  { value: 'birth_certificate', label: 'Certidão de Nascimento / Birth Certificate' },
  { value: 'marriage_certificate', label: 'Certidão de Casamento / Marriage Certificate' },
  { value: 'vaccination_card', label: 'Cartão de Vacina / Vaccination Card' },
  { value: 'divorce_certificate', label: 'Divórcio / Divorce Certificate' },
  { value: 'rg', label: 'RG (Brazilian ID)' },
  { value: 'cnh', label: 'CNH (Brazilian Driver\'s License)' },
  { value: 'dmv', label: 'DMV Document' },
  { value: 'rmv', label: 'RMV Document' },
  { value: 'passport', label: 'Passaporte / Passport' },
  { value: 'diploma', label: 'Diploma / Academic Degree' },
  { value: 'transcript', label: 'Histórico Escolar / Academic Transcript' },
  { value: 'power_of_attorney', label: 'Procuração / Power of Attorney' },
  { value: 'criminal_record', label: 'Antecedentes Criminais / Criminal Record' },
  { value: 'medical_report', label: 'Relatório Médico / Medical Report' },
  { value: 'contract', label: 'Contrato / Contract' },
  { value: 'immigration_doc', label: 'Documento de Imigração / Immigration Document' },
  { value: 'other', label: 'Outros / Other' }
];

// Document Categories for uploaded files
const DOCUMENT_CATEGORIES = [
  { value: '', label: '-- Select Category --' },
  { value: 'financial', label: 'Financial / Financeiro' },
  { value: 'educational', label: 'Educational / Educacional' },
  { value: 'personal', label: 'Personal Documents / Documentos Pessoais' },
  { value: 'bank_statement', label: 'Bank Statement / Extrato Bancário' },
  { value: 'legal', label: 'Legal / Jurídico' },
  { value: 'medical', label: 'Medical / Médico' },
  { value: 'immigration', label: 'Immigration / Imigração' },
  { value: 'business', label: 'Business / Empresarial' },
  { value: 'government', label: 'Government / Governamental' },
  { value: 'other', label: 'Other / Outros' }
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
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [useAdminKey, setUseAdminKey] = useState(false); // Fallback to admin key login
  const [adminKey, setAdminKey] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.post(`${API}/admin/auth/forgot-password`, { email: forgotEmail });
      setSuccess('If an account exists with this email, a password reset link has been sent.');
      setForgotEmail('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error sending reset email');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password modal
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl text-white">🔑</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Reset Password</h1>
            <p className="text-xs text-gray-500">Enter your email to receive a reset link</p>
          </div>

          {error && (
            <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-xs text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-3 p-2 bg-green-100 text-green-700 rounded text-xs text-center">
              {success}
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400 text-sm font-medium"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setShowForgotPassword(false); setError(''); setSuccess(''); }}
              className="text-teal-600 hover:underline text-xs"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        {success && (
          <div className="mb-3 p-2 bg-green-100 text-green-700 rounded text-xs text-center">
            {success}
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
          {!useAdminKey && (
            <button
              onClick={() => setShowForgotPassword(true)}
              className="text-teal-600 hover:underline text-xs block w-full"
            >
              Forgot Password?
            </button>
          )}
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
    { id: 'new-quote', label: 'New Quote', icon: '📝', roles: ['admin', 'sales'] },
    { id: 'translation', label: 'Translation', icon: '✍️', roles: ['admin', 'pm', 'translator'] },
    { id: 'production', label: 'Reports', icon: '📊', roles: ['admin'] },
    { id: 'finances', label: 'Finances', icon: '💰', roles: ['admin'] },
    { id: 'followups', label: 'Follow-ups', icon: '🔔', roles: ['admin', 'pm'] },
    { id: 'pm-dashboard', label: 'PM Dashboard', icon: '🎯', roles: ['admin', 'pm'] },
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
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 ${roleInfo.color} rounded text-[10px] font-medium text-center`}>
              {roleInfo.label}
            </div>
            {(userRole === 'pm' || userRole === 'translator') && user.name && (
              <span className="text-white text-[11px]">
                Welcome, {user.name.split(' ')[0]}
              </span>
            )}
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

// ==================== CURRENCY DATA (SHARED) ====================
const CURRENCIES = {
  BRL: { name: 'Brazilian Real', symbol: 'R$', country: 'Brazil', flag: '🇧🇷' },
  USD: { name: 'US Dollar', symbol: '$', country: 'USA', flag: '🇺🇸' },
  CAD: { name: 'Canadian Dollar', symbol: 'CA$', country: 'Canada', flag: '🇨🇦' },
  EUR: { name: 'Euro', symbol: '€', country: 'Eurozone', flag: '🇪🇺' },
  GBP: { name: 'British Pound', symbol: '£', country: 'UK', flag: '🇬🇧' },
  MXN: { name: 'Mexican Peso', symbol: '$', country: 'Mexico', flag: '🇲🇽' },
  ARS: { name: 'Argentine Peso', symbol: '$', country: 'Argentina', flag: '🇦🇷' },
  CLP: { name: 'Chilean Peso', symbol: '$', country: 'Chile', flag: '🇨🇱' },
  COP: { name: 'Colombian Peso', symbol: '$', country: 'Colombia', flag: '🇨🇴' },
  PEN: { name: 'Peruvian Sol', symbol: 'S/', country: 'Peru', flag: '🇵🇪' },
  NOK: { name: 'Norwegian Krone', symbol: 'kr', country: 'Norway', flag: '🇳🇴' },
  SEK: { name: 'Swedish Krona', symbol: 'kr', country: 'Sweden', flag: '🇸🇪' },
  DKK: { name: 'Danish Krone', symbol: 'kr', country: 'Denmark', flag: '🇩🇰' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF', country: 'Switzerland', flag: '🇨🇭' },
  JPY: { name: 'Japanese Yen', symbol: '¥', country: 'Japan', flag: '🇯🇵' },
  CNY: { name: 'Chinese Yuan', symbol: '¥', country: 'China', flag: '🇨🇳' },
  KRW: { name: 'South Korean Won', symbol: '₩', country: 'South Korea', flag: '🇰🇷' },
  INR: { name: 'Indian Rupee', symbol: '₹', country: 'India', flag: '🇮🇳' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', country: 'Australia', flag: '🇦🇺' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', country: 'New Zealand', flag: '🇳🇿' },
  ZAR: { name: 'South African Rand', symbol: 'R', country: 'South Africa', flag: '🇿🇦' },
  RUB: { name: 'Russian Ruble', symbol: '₽', country: 'Russia', flag: '🇷🇺' },
  TRY: { name: 'Turkish Lira', symbol: '₺', country: 'Turkey', flag: '🇹🇷' },
  PLN: { name: 'Polish Zloty', symbol: 'zł', country: 'Poland', flag: '🇵🇱' },
  CZK: { name: 'Czech Koruna', symbol: 'Kč', country: 'Czech Republic', flag: '🇨🇿' },
  HUF: { name: 'Hungarian Forint', symbol: 'Ft', country: 'Hungary', flag: '🇭🇺' },
  ILS: { name: 'Israeli Shekel', symbol: '₪', country: 'Israel', flag: '🇮🇱' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', country: 'Singapore', flag: '🇸🇬' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', country: 'Hong Kong', flag: '🇭🇰' },
  PHP: { name: 'Philippine Peso', symbol: '₱', country: 'Philippines', flag: '🇵🇭' },
  THB: { name: 'Thai Baht', symbol: '฿', country: 'Thailand', flag: '🇹🇭' },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM', country: 'Malaysia', flag: '🇲🇾' },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', country: 'Indonesia', flag: '🇮🇩' },
  VND: { name: 'Vietnamese Dong', symbol: '₫', country: 'Vietnam', flag: '🇻🇳' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', country: 'UAE', flag: '🇦🇪' },
  SAR: { name: 'Saudi Riyal', symbol: '﷼', country: 'Saudi Arabia', flag: '🇸🇦' },
  EGP: { name: 'Egyptian Pound', symbol: '£', country: 'Egypt', flag: '🇪🇬' },
  NGN: { name: 'Nigerian Naira', symbol: '₦', country: 'Nigeria', flag: '🇳🇬' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', country: 'Kenya', flag: '🇰🇪' }
};

const RATE_SOURCES = [
  { id: 'xe.com', name: 'XE.com', url: 'https://www.xe.com/currencyconverter/' },
  { id: 'google', name: 'Google Finance', url: 'https://www.google.com/finance/' },
  { id: 'bloomberg', name: 'Bloomberg', url: 'https://www.bloomberg.com/markets/currencies' },
  { id: 'businessinsider', name: 'Business Insider', url: 'https://markets.businessinsider.com/currencies' },
  { id: 'oanda', name: 'OANDA', url: 'https://www.oanda.com/currency-converter/' }
];

const LANGUAGE_TO_CURRENCY = {
  'Portuguese': 'BRL',
  'English': 'USD',
  'Spanish': 'MXN',
  'French': 'EUR',
  'German': 'EUR',
  'Italian': 'EUR',
  'Dutch': 'EUR',
  'Norwegian': 'NOK',
  'Swedish': 'SEK',
  'Danish': 'DKK',
  'Finnish': 'EUR',
  'Japanese': 'JPY',
  'Chinese': 'CNY',
  'Korean': 'KRW',
  'Russian': 'RUB',
  'Arabic': 'AED',
  'Hebrew': 'ILS',
  'Turkish': 'TRY',
  'Polish': 'PLN',
  'Czech': 'CZK',
  'Hungarian': 'HUF',
  'Thai': 'THB',
  'Vietnamese': 'VND',
  'Indonesian': 'IDR',
  'Malay': 'MYR',
  'Hindi': 'INR',
  'Greek': 'EUR',
  'Romanian': 'EUR',
  'Ukrainian': 'EUR',
  'Bulgarian': 'EUR'
};

const getCurrencyFromLanguage = (language) => {
  return LANGUAGE_TO_CURRENCY[language] || 'USD';
};

// ==================== TRANSLATION WORKSPACE ====================
const TranslationWorkspace = ({ adminKey, selectedOrder, onBack, user }) => {
  // User role checks
  const isAdmin = user?.role === 'admin';
  const isPM = user?.role === 'pm';

  // State
  const [activeSubTab, setActiveSubTab] = useState('start');
  const [showProjectMenu, setShowProjectMenu] = useState(false);

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

  // Certificate Template state - for customizing certificate body text while keeping header/logos/signature
  const [selectedCertificateTemplate, setSelectedCertificateTemplate] = useState(() => {
    return localStorage.getItem('selected_certificate_template') || 'default';
  });
  const [customCertificateTemplates, setCustomCertificateTemplates] = useState(() => {
    const saved = localStorage.getItem('custom_certificate_templates');
    return saved ? JSON.parse(saved) : [];
  });

  // Predefined certificate templates with body text only (header, logos, signature are separate)
  // Template Categories for organization
  const TEMPLATE_CATEGORIES = {
    'certificates': { name: 'Certificates', icon: '📜', description: 'Standard translation certificates' },
    'rmv-forms': { name: 'RMV / DMV Forms', icon: '🚗', description: 'Motor vehicle forms' },
    'brazil-docs': { name: 'Brazilian Documents', icon: '🇧🇷', description: 'Brazilian official documents' },
    'education': { name: 'Education', icon: '🎓', description: 'Academic documents' }
  };

  const CERTIFICATE_TEMPLATES = {
    'default': {
      name: 'Default',
      description: 'Standard Certificate',
      category: 'certificates',
      bodyParagraphs: [
        'We, <strong>Legacy Translations Inc.</strong>, a professional translation services company and an <strong>American Translators Association (ATA) Member (No. 275993)</strong>, having no relation to the client, hereby certify that the attached {{targetLanguage}} (United States) translation of the {{sourceLanguage}} document was performed by us and is, to the best of our knowledge and belief, a <strong>true, complete, and accurate translation</strong> of the original document submitted.',
        'This certification attests <strong>only to the accuracy and completeness of the translation</strong>. We do not certify or guarantee the authenticity of the original document, nor the truthfulness of the statements contained therein. <strong>Legacy Translations Inc.</strong> assumes no responsibility or liability for the manner in which this translation is used by the client or any third party, including governmental, educational, or legal institutions.',
        'I, <strong>Beatriz Paiva</strong>, hereby certify that this translation has been <strong>reviewed and proofread</strong> and that the attached translated document is a <strong>faithful and authentic representation</strong> of the original document.',
        'A copy of the translated document and the original file(s) provided are attached hereto and form an integral part of this certification.'
      ]
    },
    'rmv-ma': {
      name: 'RMV Massachusetts',
      description: 'MA Registry',
      category: 'certificates',
      bodyParagraphs: [
        'We, <strong>Legacy Translations Inc.</strong>, a professional translation services company and an <strong>American Translators Association (ATA) Member (No. 275993)</strong>, hereby certify that the attached English translation of the {{sourceLanguage}} <strong>Driver\'s License / Identification Document</strong> was performed by us and is, to the best of our knowledge and belief, a <strong>true, complete, and accurate translation</strong> of the original document submitted.',
        'This translation is being provided for use with the <strong>Massachusetts Registry of Motor Vehicles (RMV)</strong> for the purpose of driver\'s license application, identification verification, or other official purposes as required by the Commonwealth of Massachusetts.',
        'This certification attests <strong>only to the accuracy and completeness of the translation</strong>. We do not certify or guarantee the authenticity of the original document, nor the truthfulness of the statements contained therein. <strong>Legacy Translations Inc.</strong> assumes no responsibility or liability for the manner in which this translation is used.',
        'I, <strong>Beatriz Paiva</strong>, hereby certify that this translation has been <strong>reviewed and proofread</strong> and that the attached translated document is a <strong>faithful and authentic representation</strong> of the original document.',
        'A copy of the translated document and the original file(s) provided are attached hereto and form an integral part of this certification.'
      ]
    },
    'dmv-fl': {
      name: 'DMV Florida',
      description: 'FL DMV',
      category: 'certificates',
      bodyParagraphs: [
        'We, <strong>Legacy Translations Inc.</strong>, a professional translation services company and an <strong>American Translators Association (ATA) Member (No. 275993)</strong>, hereby certify that the attached English translation of the {{sourceLanguage}} <strong>Driver\'s License / Identification Document</strong> was performed by us and is, to the best of our knowledge and belief, a <strong>true, complete, and accurate translation</strong> of the original document submitted.',
        'This translation is being provided for use with the <strong>Florida Department of Highway Safety and Motor Vehicles (FLHSMV)</strong> for the purpose of driver\'s license application, identification verification, or other official purposes as required by the State of Florida.',
        'This certification attests <strong>only to the accuracy and completeness of the translation</strong>. We do not certify or guarantee the authenticity of the original document, nor the truthfulness of the statements contained therein. <strong>Legacy Translations Inc.</strong> assumes no responsibility or liability for the manner in which this translation is used.',
        'I, <strong>Beatriz Paiva</strong>, hereby certify that this translation has been <strong>reviewed and proofread</strong> and that the attached translated document is a <strong>faithful and authentic representation</strong> of the original document.',
        'A copy of the translated document and the original file(s) provided are attached hereto and form an integral part of this certification.'
      ]
    },
    'uscis': {
      name: 'USCIS Immigration',
      description: 'Immigration',
      category: 'certificates',
      bodyParagraphs: [
        'We, <strong>Legacy Translations Inc.</strong>, a professional translation services company and an <strong>American Translators Association (ATA) Member (No. 275993)</strong>, hereby certify that the attached English translation of the {{sourceLanguage}} document was performed by us and is, to the best of our knowledge and belief, a <strong>true, complete, and accurate translation</strong> of the original document submitted.',
        'This translation is being provided for use with the <strong>United States Citizenship and Immigration Services (USCIS)</strong> and complies with the USCIS translation requirements as specified in 8 CFR 103.2(b)(3).',
        'I, <strong>Beatriz Paiva</strong>, am competent to translate from {{sourceLanguage}} to English, and hereby certify that this translation is complete and accurate to the best of my knowledge and ability.',
        'This certification attests <strong>only to the accuracy and completeness of the translation</strong>. We do not certify or guarantee the authenticity of the original document, nor the truthfulness of the statements contained therein.',
        'A copy of the translated document and the original file(s) provided are attached hereto and form an integral part of this certification.'
      ]
    },
    'education': {
      name: 'WES/ECE',
      description: 'Academic Eval',
      category: 'education',
      bodyParagraphs: [
        'We, <strong>Legacy Translations Inc.</strong>, a professional translation services company and an <strong>American Translators Association (ATA) Member (No. 275993)</strong>, hereby certify that the attached English translation of the {{sourceLanguage}} <strong>academic document(s)</strong> was performed by us and is, to the best of our knowledge and belief, a <strong>true, complete, and accurate translation</strong> of the original document submitted.',
        'This translation is suitable for submission to <strong>credential evaluation services</strong> such as World Education Services (WES), Educational Credential Evaluators (ECE), and similar organizations, as well as educational institutions in the United States.',
        'This certification attests <strong>only to the accuracy and completeness of the translation</strong>. We do not certify or guarantee the authenticity of the original document, nor the truthfulness of the statements contained therein. <strong>Legacy Translations Inc.</strong> assumes no responsibility or liability for the manner in which this translation is used.',
        'I, <strong>Beatriz Paiva</strong>, hereby certify that this translation has been <strong>reviewed and proofread</strong> and that the attached translated document is a <strong>faithful and authentic representation</strong> of the original document.',
        'A copy of the translated document and the original file(s) provided are attached hereto and form an integral part of this certification.'
      ]
    },
    'rmv-foreign-dl': {
      name: "Foreign DL Form",
      description: 'LIC114',
      category: 'rmv-forms',
      isForm: true,
      formHTML: `
        <div style="font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; max-width: 750px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 50px; height: 50px; border: 1px solid #ccc; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; text-align: center;">MA State Seal</div>
              <div style="display: flex; gap: 2px;">
                <div style="background: #000; color: #fff; padding: 5px 8px; font-weight: bold;">r</div>
                <div style="background: #c00; color: #fff; padding: 5px 8px; font-weight: bold;">m</div>
                <div style="background: #006; color: #fff; padding: 5px 8px; font-weight: bold;">v</div>
              </div>
              <div style="font-size: 8px; color: #666;">REGISTRY OF MOTOR VEHICLES</div>
            </div>
            <div>
              <div style="font-size: 18px; font-weight: bold;">Translation into English</div>
              <div style="font-size: 16px; font-weight: bold;">of a Foreign Driver License</div>
            </div>
            <div style="border: 1px solid #000; width: 100px; height: 120px; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center;">Attach photo here</div>
          </div>

          <!-- Yellow Box Notice -->
          <div style="background: #fff3cd; border: 1px solid #000; padding: 10px; margin-bottom: 15px; font-style: italic; font-size: 10px;">
            <p style="margin: 0 0 5px 0;"><em>Massachusetts General Law (Chapter 90, Section 10) was changed July 2018. Everyone operating a motor vehicle in Massachusetts with a foreign driver's license that is not written in English must carry either this completed translation, an International Driving Permit (IDP) issued from the country that issued the license, or an alternative translation document that contains a photo and English translation that closely matches the information from an IDP.</em></p>
            <p style="margin: 0; font-weight: bold;"><em>This form must be completed <u>for</u> an applicant who does not have an IDP or alternative translation document and whose license is not written in English.</em></p>
          </div>

          <!-- Qualified Translator Section -->
          <div style="margin-bottom: 15px;">
            <p style="font-weight: bold; margin-bottom: 10px;">All information below must be completed by a <u>qualified</u> translator.</p>

            <p style="margin-bottom: 10px;">I hereby certify that this is a true and complete original translation from (original language)</p>
            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
              <input type="text" placeholder="Original Language" style="border: none; border-bottom: 1px solid #000; width: 150px; padding: 2px;" contenteditable="true" />
              <span>into English of a driver's license issued by the Country of</span>
              <input type="text" placeholder="Country" style="border: none; border-bottom: 1px solid #000; width: 150px; padding: 2px;" contenteditable="true" />
              <span>.</span>
            </div>

            <p style="margin-bottom: 10px;">I further certify that I speak the language of the original driver's license fluently and I (check one):</p>

            <div style="margin-left: 20px; margin-bottom: 8px;">
              <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 5px;">
                <input type="checkbox" style="margin-top: 3px;" />
                <span>Work for a college, university, or private language school. Name, Address, and Department:</span>
              </div>
              <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; margin-left: 20px;" contenteditable="true" />
            </div>

            <div style="margin-left: 20px; margin-bottom: 8px;">
              <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 5px;">
                <input type="checkbox" style="margin-top: 3px;" />
                <span>Work for a local consulate. Name and Address of Consulate:</span>
              </div>
              <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; margin-left: 20px;" contenteditable="true" />
            </div>

            <div style="margin-left: 20px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" style="margin-top: 0;" />
              <span>Am a Massachusetts bilingual notary public ---------------------------- (place official notary seal below)</span>
            </div>

            <div style="margin-left: 20px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" style="margin-top: 0;" checked />
              <span>Am a member of the American Translators Association</span>
            </div>
          </div>

          <!-- Licensee Information Box -->
          <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px;">
            <p style="font-weight: bold; margin: 0 0 5px 0;">Licensee Information:</p>
            <p style="font-style: italic; margin: 0 0 10px 0; font-size: 10px;">In translating information fields from the license into English, I find the following is indicated on the license:</p>

            <div style="margin-bottom: 8px; display: flex; align-items: center;">
              <span style="width: 220px;">Country where the license was issued:</span>
              <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
            </div>

            <div style="margin-bottom: 8px; display: flex; align-items: center;">
              <span style="width: 220px;">Full name of the license holder:</span>
              <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
            </div>

            <div style="margin-bottom: 8px; display: flex; align-items: center;">
              <span style="width: 220px;">Date of birth (month/ day/ year):</span>
              <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
            </div>

            <div style="margin-bottom: 8px; display: flex; align-items: center;">
              <span style="width: 220px;">Place of residence on license:</span>
              <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
            </div>

            <div style="margin-bottom: 8px; display: flex; align-items: center;">
              <span style="width: 250px;">Type of vehicle for which the license is valid:</span>
              <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
            </div>

            <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 20px;">
              <div style="display: flex; align-items: center; flex: 1;">
                <span style="width: 150px;">Driver license number:</span>
                <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
              </div>
              <div style="display: flex; align-items: center; flex: 1;">
                <span style="width: 100px;">Class of license:</span>
                <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
              </div>
            </div>

            <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 20px;">
              <div style="display: flex; align-items: center; flex: 1;">
                <span style="width: 120px;">License issue date:</span>
                <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
              </div>
              <div style="display: flex; align-items: center; flex: 1;">
                <span style="width: 150px;">License expiration date:</span>
                <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
              </div>
            </div>

            <p style="font-weight: bold; margin: 10px 0 0 0; font-size: 10px;"><u>Note: A passport-sized photo of the person depicted on the license must be securely attached to this document in the area provided in the top right corner.</u></p>
          </div>

          <!-- Translator Attestation Box -->
          <div style="border: 1px solid #000; padding: 10px; margin-bottom: 10px;">
            <p style="font-weight: bold; margin: 0 0 5px 0;">Translator Attestation:</p>
            <p style="margin: 0 0 10px 0; font-size: 10px;">I understand that the original driver's license document for this certified translation and the translation itself may be relied on by law enforcement officers and/or other drivers (in the event of a crash) to properly identify the individual shown on the driver's license and I further understand that false statements may be punished by fine, imprisonment, or both (M.G.L. Chapter 90, Section 24).</p>

            <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 20px;">
              <div style="display: flex; align-items: center; flex: 2;">
                <span style="width: 180px;">Translator's name (printed):</span>
                <input type="text" value="Beatriz Paiva" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
              </div>
              <div style="display: flex; align-items: center; flex: 1;">
                <span style="width: 40px;">Date:</span>
                <input type="text" placeholder="" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
              </div>
            </div>

            <div style="margin-bottom: 8px; display: flex; align-items: center;">
              <span style="width: 150px;">Translator's full address:</span>
              <input type="text" value="867 Boylston Street, 5th Floor, #2073, Boston, MA 02116" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
            </div>

            <div style="margin-bottom: 8px; display: flex; align-items: center;">
              <span style="width: 220px;">Translator's tel. number/ Email address:</span>
              <input type="text" value="(857) 316-7770 / contact@legacytranslations.com" style="border: none; border-bottom: 1px solid #000; flex: 1; padding: 2px;" contenteditable="true" />
            </div>

            <p style="margin: 5px 0;">Signed under the penalties of perjury:</p>

            <div style="margin-bottom: 5px; display: flex; align-items: center;">
              <span style="width: 150px;">Translator's signature:</span>
              <div style="border-bottom: 1px solid #000; flex: 1; height: 30px;"></div>
            </div>
          </div>

          <div style="text-align: right; font-size: 9px; color: #666;">LIC114_1118</div>
        </div>
      `
    },
    'rmv-formulario': {
      name: "RMV Formulário",
      description: 'Tradução CNH',
      category: 'rmv-forms',
      isForm: true,
      formHTML: `
        <div style="font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; max-width: 750px; margin: 0 auto; padding: 20px; background: #fff;">
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; border-bottom: 2px solid #003366; padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 55px; height: 55px; border: 2px solid #003366; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 7px; text-align: center; color: #003366; font-weight: bold;">
                <div>Commonwealth<br/>of<br/>Massachusetts</div>
              </div>
              <div style="display: flex; gap: 2px;">
                <div style="background: #000; color: #fff; padding: 6px 10px; font-weight: bold; font-size: 14px;">r</div>
                <div style="background: #cc0000; color: #fff; padding: 6px 10px; font-weight: bold; font-size: 14px;">m</div>
                <div style="background: #003366; color: #fff; padding: 6px 10px; font-weight: bold; font-size: 14px;">v</div>
              </div>
              <div style="font-size: 9px; color: #666; text-transform: uppercase;">Registry of<br/>Motor Vehicles</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #003366;">Translation into English</div>
              <div style="font-size: 16px; font-weight: bold; color: #003366;">of a Foreign Driver License</div>
            </div>
            <div style="border: 2px solid #000; width: 110px; height: 130px; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center; color: #666;">
              <div>Attach<br/>passport-sized<br/>photo here</div>
            </div>
          </div>

          <!-- Yellow Box Notice -->
          <div style="background: #fff8dc; border: 2px solid #d4a800; padding: 12px; margin-bottom: 15px; font-size: 10px;">
            <p style="margin: 0 0 8px 0; font-style: italic;"><em>Massachusetts General Law (Chapter 90, Section 10) was changed July 2018. Everyone operating a motor vehicle in Massachusetts with a foreign driver's license that is not written in English must carry either this completed translation, an International Driving Permit (IDP) issued from the country that issued the license, or an alternative translation document that contains a photo and English translation that closely matches the information from an IDP.</em></p>
            <p style="margin: 0; font-weight: bold; font-style: italic;"><em>This form must be completed <u>for</u> an applicant who does not have an IDP or alternative translation document and whose license is not written in English.</em></p>
          </div>

          <!-- Qualified Translator Section -->
          <div style="margin-bottom: 15px;">
            <p style="font-weight: bold; margin-bottom: 12px; font-size: 12px;">All information below must be completed by a <u>qualified</u> translator.</p>

            <p style="margin-bottom: 8px;">I hereby certify that this is a true and complete original translation from (original language)</p>
            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 12px; flex-wrap: wrap;">
              <input type="text" style="border: none; border-bottom: 2px solid #003366; width: 180px; padding: 4px; font-size: 11px; background: #f8f9fa;" />
              <span>into English of a driver's license issued by the Country of</span>
              <input type="text" style="border: none; border-bottom: 2px solid #003366; width: 180px; padding: 4px; font-size: 11px; background: #f8f9fa;" />
            </div>

            <p style="margin-bottom: 10px;">I further certify that I speak the language of the original driver's license fluently and I (check one):</p>

            <div style="margin-left: 25px; margin-bottom: 10px;">
              <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px;">
                <input type="checkbox" style="margin-top: 4px; width: 16px; height: 16px;" />
                <span>Work for a college, university, or private language school. Name, Address, and Department:</span>
              </div>
              <input type="text" style="border: none; border-bottom: 2px solid #003366; width: calc(100% - 30px); padding: 4px; margin-left: 26px; font-size: 11px; background: #f8f9fa;" />
            </div>

            <div style="margin-left: 25px; margin-bottom: 10px;">
              <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px;">
                <input type="checkbox" style="margin-top: 4px; width: 16px; height: 16px;" />
                <span>Work for a local consulate. Name and Address of Consulate:</span>
              </div>
              <input type="text" style="border: none; border-bottom: 2px solid #003366; width: calc(100% - 30px); padding: 4px; margin-left: 26px; font-size: 11px; background: #f8f9fa;" />
            </div>

            <div style="margin-left: 25px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" style="width: 16px; height: 16px;" />
              <span>Am a Massachusetts bilingual notary public <span style="color: #666;">------------------------</span> (place official notary seal below)</span>
            </div>

            <div style="margin-left: 25px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" checked style="width: 16px; height: 16px;" />
              <span><strong>Am a member of the American Translators Association</strong></span>
            </div>
          </div>

          <!-- Licensee Information Box -->
          <div style="border: 2px solid #003366; padding: 15px; margin-bottom: 15px; background: #fafafa;">
            <p style="font-weight: bold; margin: 0 0 5px 0; font-size: 13px; color: #003366;">Licensee Information:</p>
            <p style="font-style: italic; margin: 0 0 12px 0; font-size: 10px; color: #555;">In translating information fields from the license into English, I find the following is indicated on the license:</p>

            <div style="margin-bottom: 10px; display: flex; align-items: center;">
              <span style="width: 240px; font-weight: 500;">Country where the license was issued:</span>
              <input type="text" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
            </div>

            <div style="margin-bottom: 10px; display: flex; align-items: center;">
              <span style="width: 240px; font-weight: 500;">Full name of the license holder:</span>
              <input type="text" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
            </div>

            <div style="margin-bottom: 10px; display: flex; align-items: center;">
              <span style="width: 240px; font-weight: 500;">Date of birth (month/day/year):</span>
              <input type="text" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
            </div>

            <div style="margin-bottom: 10px; display: flex; align-items: center;">
              <span style="width: 240px; font-weight: 500;">Place of residence on license:</span>
              <input type="text" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
            </div>

            <div style="margin-bottom: 10px; display: flex; align-items: center;">
              <span style="width: 270px; font-weight: 500;">Type of vehicle for which the license is valid:</span>
              <input type="text" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
            </div>

            <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 25px;">
              <div style="display: flex; align-items: center; flex: 1;">
                <span style="width: 160px; font-weight: 500;">Driver license number:</span>
                <input type="text" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
              </div>
              <div style="display: flex; align-items: center; flex: 1;">
                <span style="width: 110px; font-weight: 500;">Class of license:</span>
                <input type="text" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
              </div>
            </div>

            <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 25px;">
              <div style="display: flex; align-items: center; flex: 1;">
                <span style="width: 130px; font-weight: 500;">License issue date:</span>
                <input type="text" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
              </div>
              <div style="display: flex; align-items: center; flex: 1;">
                <span style="width: 160px; font-weight: 500;">License expiration date:</span>
                <input type="text" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
              </div>
            </div>

            <p style="font-weight: bold; margin: 12px 0 0 0; font-size: 10px; color: #cc0000;"><u>Note: A passport-sized photo of the person depicted on the license must be securely attached to this document in the area provided in the top right corner.</u></p>
          </div>

          <!-- Translator Attestation Box -->
          <div style="border: 2px solid #003366; padding: 15px; margin-bottom: 10px; background: #fafafa;">
            <p style="font-weight: bold; margin: 0 0 8px 0; font-size: 13px; color: #003366;">Translator Attestation:</p>
            <p style="margin: 0 0 12px 0; font-size: 10px; line-height: 1.5;">I understand that the original driver's license document for this certified translation and the translation itself may be relied on by law enforcement officers and/or other drivers (in the event of a crash) to properly identify the individual shown on the driver's license and I further understand that false statements may be punished by fine, imprisonment, or both (M.G.L. Chapter 90, Section 24).</p>

            <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 25px;">
              <div style="display: flex; align-items: center; flex: 2;">
                <span style="width: 190px; font-weight: 500;">Translator's name (printed):</span>
                <input type="text" value="Beatriz Paiva" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff; font-weight: bold;" />
              </div>
              <div style="display: flex; align-items: center; flex: 1;">
                <span style="width: 50px; font-weight: 500;">Date:</span>
                <input type="text" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
              </div>
            </div>

            <div style="margin-bottom: 10px; display: flex; align-items: center;">
              <span style="width: 160px; font-weight: 500;">Translator's full address:</span>
              <input type="text" value="867 Boylston Street, 5th Floor, #2073, Boston, MA 02116" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
            </div>

            <div style="margin-bottom: 10px; display: flex; align-items: center;">
              <span style="width: 235px; font-weight: 500;">Translator's tel. number / Email address:</span>
              <input type="text" value="(857) 316-7770 / contact@legacytranslations.com" style="border: none; border-bottom: 2px solid #003366; flex: 1; padding: 4px; font-size: 11px; background: #fff;" />
            </div>

            <p style="margin: 8px 0; font-weight: 500;">Signed under the penalties of perjury:</p>

            <div style="margin-bottom: 5px; display: flex; align-items: flex-end;">
              <span style="width: 160px; font-weight: 500;">Translator's signature:</span>
              <div style="border-bottom: 2px solid #003366; flex: 1; height: 35px; background: #fff;"></div>
            </div>
          </div>

          <div style="text-align: right; font-size: 9px; color: #666; margin-top: 5px;">LIC114_1118</div>
        </div>
      `
    },
    'rmv-documents': {
      name: "RMV Certification",
      description: 'Translation Accuracy',
      category: 'rmv-forms',
      isForm: true,
      formHTML: `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 14px; line-height: 2; max-width: 700px; margin: 0 auto; padding: 60px 50px; background: #fff;">

          <!-- Title -->
          <h1 style="text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 60px; letter-spacing: 0.5px;">
            CERTIFICATION OF TRANSLATION ACCURACY AND COMPLETION
          </h1>

          <!-- Main Certification Paragraph -->
          <p style="text-align: justify; text-indent: 50px; margin-bottom: 40px; line-height: 2;">
            I hereby certify that this is a true and complete original translation from <strong><span style="border-bottom: 1px solid #000; display: inline-block; min-width: 80px; padding: 0 5px;" contenteditable="true">Spanish</span></strong> into English of a <strong><span style="border-bottom: 1px solid #000; display: inline-block; min-width: 120px; padding: 0 5px;" contenteditable="true">Birth Certificate</span></strong> that I have translated. I further certify that I speak the language of the original document fluently and I am a translator and sole proprietor of Legacy Translations LLC (ATA member under # 275993). I understand that the original document and this certified translation may be presented to the Massachusetts Registry of Motor Vehicles (RMV) in support of an application for a permit, license, or Identification Card, and I further understand that false statements to the RMV may be punished by fine, imprisonment, or both (M.G.L. Chapter 90, Section 24).
          </p>

          <!-- Blank Space -->
          <div style="height: 80px;"></div>

          <!-- Fields Section -->
          <div style="margin-top: 40px; line-height: 2.2;">
            <p style="margin-bottom: 18px;">
              <strong>Applicant's Name:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; min-width: 420px; padding: 0 5px;" contenteditable="true">&nbsp;</span>
            </p>

            <p style="margin-bottom: 18px;">
              <strong>Translator's Full Address:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; min-width: 350px; padding: 0 5px;" contenteditable="true">867 Boylston Street, 5th Floor, #2073, Boston, MA 02116</span>
            </p>

            <p style="margin-bottom: 18px;">
              <strong>Translator's Telephone Number:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; min-width: 300px; padding: 0 5px;" contenteditable="true">(857) 316-7770</span>
            </p>

            <p style="margin-bottom: 18px;">
              <strong>Translator's Name:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; min-width: 380px; padding: 0 5px;" contenteditable="true">Beatriz Paiva</span>
            </p>

            <p style="margin-bottom: 10px;">
              <strong>Translator's Signature:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; min-width: 250px; height: 22px;">&nbsp;</span>
              <strong style="margin-left: 40px;">Date:</strong><span style="border-bottom: 1px solid #000; display: inline-block; min-width: 150px; padding: 0 5px;" contenteditable="true">&nbsp;</span>
            </p>
          </div>

        </div>
      `
    },
    'historico-escolar-sp': {
      name: "Histórico Escolar SP",
      description: 'Ensino Fundamental',
      category: 'education',
      isForm: true,
      formHTML: `
        <div style="font-family: Arial, sans-serif; font-size: 10px; line-height: 1.3; max-width: 800px; margin: 0 auto; padding: 15px; background: #fff; border: 1px solid #000;">

          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #000;">
            <div style="text-align: center; width: 80px;">
              <div style="width: 60px; height: 60px; border: 1px solid #000; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 7px;">
                State of<br/>São Paulo<br/>Coat of Arms
              </div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 11px; font-weight: bold;">SECRETARIA DA EDUCAÇÃO DO ESTADO DE SÃO PAULO</div>
              <div style="font-size: 10px; font-weight: bold;">DEPARTMENT OF EDUCATION OF THE STATE OF SÃO PAULO</div>
              <div style="font-size: 13px; font-weight: bold; margin-top: 5px;">HISTÓRICO ESCOLAR / SCHOOL TRANSCRIPT</div>
              <div style="font-size: 9px;">ENSINO FUNDAMENTAL / ELEMENTARY AND MIDDLE SCHOOL</div>
            </div>
            <div style="text-align: center; width: 80px;">
              <div style="width: 60px; height: 60px; border: 1px solid #000; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 7px;">
                School<br/>Logo
              </div>
            </div>
          </div>

          <!-- School Information -->
          <div style="border: 1px solid #000; padding: 8px; margin-bottom: 8px; background: #f5f5f5;">
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 9px;">ESTABELECIMENTO DE ENSINO / EDUCATIONAL INSTITUTION:</div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <div style="flex: 2;">
                <span style="font-size: 8px;">Nome/Name:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
              <div style="flex: 1;">
                <span style="font-size: 8px;">Código CIE:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px;">
              <div style="flex: 2;">
                <span style="font-size: 8px;">Endereço/Address:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
              <div style="flex: 1;">
                <span style="font-size: 8px;">Município/City:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
              <div style="width: 80px;">
                <span style="font-size: 8px;">UF/State:</span>
                <input type="text" value="SP" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
            </div>
          </div>

          <!-- Student Information -->
          <div style="border: 1px solid #000; padding: 8px; margin-bottom: 8px;">
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 9px;">IDENTIFICAÇÃO DO ALUNO / STUDENT IDENTIFICATION:</div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <div style="flex: 2;">
                <span style="font-size: 8px;">Nome Completo/Full Name:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
              <div style="flex: 1;">
                <span style="font-size: 8px;">RA (Registro do Aluno):</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px;">
              <div style="width: 120px;">
                <span style="font-size: 8px;">Data de Nascimento/DOB:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
              <div style="flex: 1;">
                <span style="font-size: 8px;">Naturalidade/Place of Birth:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
              <div style="width: 100px;">
                <span style="font-size: 8px;">Nacionalidade/Nationality:</span>
                <input type="text" value="Brasileira/Brazilian" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px;">
              <div style="flex: 1;">
                <span style="font-size: 8px;">Filiação - Pai/Father:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
              <div style="flex: 1;">
                <span style="font-size: 8px;">Mãe/Mother:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px;">
              <div style="width: 150px;">
                <span style="font-size: 8px;">RG/ID Number:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
              <div style="width: 150px;">
                <span style="font-size: 8px;">CPF:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
              <div style="flex: 1;">
                <span style="font-size: 8px;">Certidão de Nascimento/Birth Certificate:</span>
                <input type="text" style="border: none; border-bottom: 1px solid #000; width: 100%; padding: 2px; font-size: 10px; background: #fff;" contenteditable="true" />
              </div>
            </div>
          </div>

          <!-- Grades Table -->
          <div style="margin-bottom: 8px;">
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 9px;">APROVEITAMENTO ESCOLAR / ACADEMIC RECORD:</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
              <thead>
                <tr style="background: #e0e0e0;">
                  <th style="border: 1px solid #000; padding: 4px; text-align: left; width: 180px;">COMPONENTES CURRICULARES<br/><span style="font-size: 7px; font-weight: normal;">SUBJECTS</span></th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 45px;">1º Ano<br/><span style="font-size: 7px;">1st Grade</span></th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 45px;">2º Ano<br/><span style="font-size: 7px;">2nd Grade</span></th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 45px;">3º Ano<br/><span style="font-size: 7px;">3rd Grade</span></th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 45px;">4º Ano<br/><span style="font-size: 7px;">4th Grade</span></th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 45px;">5º Ano<br/><span style="font-size: 7px;">5th Grade</span></th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 45px;">6º Ano<br/><span style="font-size: 7px;">6th Grade</span></th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 45px;">7º Ano<br/><span style="font-size: 7px;">7th Grade</span></th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 45px;">8º Ano<br/><span style="font-size: 7px;">8th Grade</span></th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 45px;">9º Ano<br/><span style="font-size: 7px;">9th Grade</span></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border: 1px solid #000; padding: 3px;">Língua Portuguesa / Portuguese</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 3px;">Matemática / Mathematics</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 3px;">Ciências / Science</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 3px;">História / History</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 3px;">Geografia / Geography</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 3px;">Educação Física / Physical Ed.</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 3px;">Arte / Art</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 3px;">Língua Inglesa / English</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                </tr>
                <tr style="background: #f0f0f0;">
                  <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">RESULTADO / RESULT</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 7px;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 7px;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 7px;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 7px;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 7px;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 7px;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 7px;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 7px;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 7px;" contenteditable="true"></td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 3px;">Carga Horária / Hours</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 3px;">Dias Letivos / School Days</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 3px;">Frequência % / Attendance %</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;" contenteditable="true"></td>
                </tr>
              </tbody>
            </table>
            <div style="font-size: 8px; margin-top: 3px; color: #555;">
              <strong>Legenda / Legend:</strong> A = Aprovado/Passed | R = Retido/Retained | AP = Aprovado por Progressão/Passed by Progression | T = Transferido/Transferred
            </div>
          </div>

          <!-- Observations -->
          <div style="border: 1px solid #000; padding: 8px; margin-bottom: 8px;">
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 9px;">OBSERVAÇÕES / OBSERVATIONS:</div>
            <div style="min-height: 40px; border: 1px dashed #ccc; padding: 5px; font-size: 9px;" contenteditable="true">
              Escala de notas: 0 a 10 (Média para aprovação: 5,0) / Grading scale: 0 to 10 (Passing grade: 5.0)
            </div>
          </div>

          <!-- Signatures -->
          <div style="display: flex; gap: 20px; margin-top: 15px;">
            <div style="flex: 1; text-align: center;">
              <div style="border-top: 1px solid #000; margin-top: 40px; padding-top: 5px;">
                <div style="font-size: 9px;">Local e Data / Place and Date</div>
                <input type="text" style="border: none; width: 100%; text-align: center; font-size: 10px; margin-top: 5px;" contenteditable="true" />
              </div>
            </div>
            <div style="flex: 1; text-align: center;">
              <div style="border-top: 1px solid #000; margin-top: 40px; padding-top: 5px;">
                <div style="font-size: 9px;">Secretário(a) Escolar / School Secretary</div>
                <input type="text" style="border: none; width: 100%; text-align: center; font-size: 10px; margin-top: 5px;" contenteditable="true" />
              </div>
            </div>
            <div style="flex: 1; text-align: center;">
              <div style="border-top: 1px solid #000; margin-top: 40px; padding-top: 5px;">
                <div style="font-size: 9px;">Diretor(a) / Principal</div>
                <input type="text" style="border: none; width: 100%; text-align: center; font-size: 10px; margin-top: 5px;" contenteditable="true" />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="margin-top: 15px; padding-top: 8px; border-top: 1px solid #000; font-size: 8px; text-align: center; color: #666;">
            <div>Este documento não contém emendas ou rasuras / This document contains no amendments or erasures</div>
            <div style="margin-top: 3px;">Documento válido em todo território nacional conforme Lei nº 9.394/96 (LDB)</div>
            <div>Valid document throughout national territory according to Law No. 9,394/96 (LDB)</div>
          </div>

        </div>
      `
    },
    'cnh-brasil': {
      name: "CNH Brasil",
      description: 'Driver License',
      category: 'brazil-docs',
      isForm: true,
      formHTML: `
        <div style="font-family: Arial, sans-serif; font-size: 10px; line-height: 1.3; max-width: 800px; margin: 0 auto; padding: 0; background: #fff;">

          <!-- Green Header -->
          <div style="background: linear-gradient(135deg, #006847 0%, #004d35 100%); color: #fff; padding: 8px 15px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 14px; font-weight: bold;">REPÚBLICA FEDERATIVA DO BRASIL</div>
              <div style="font-size: 9px;">MINISTÉRIO DOS TRANSPORTES</div>
              <div style="font-size: 9px;">SECRETARIA NACIONAL DE TRÂNSITO - SENATRAN</div>
            </div>
            <div style="font-size: 16px; font-weight: bold; color: #ffdf00;">gov.br</div>
          </div>

          <!-- Main Card -->
          <div style="border: 2px solid #006847; margin: 10px; padding: 0;">

            <!-- Card Header -->
            <div style="background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); padding: 8px 10px; border-bottom: 2px solid #006847; display: flex; align-items: center; justify-content: space-between;">
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 9px; font-weight: bold;">REPÚBLICA FEDERATIVA DO BRASIL</div>
                <div style="font-size: 8px;">MINISTÉRIO DOS TRANSPORTES</div>
                <div style="font-size: 8px;">SECRETARIA NACIONAL DE TRÂNSITO</div>
              </div>
              <div style="background: #006847; color: #fff; padding: 5px 10px; border-radius: 3px; font-weight: bold; font-size: 12px;">BR</div>
            </div>

            <!-- Title -->
            <div style="background: #006847; color: #fff; text-align: center; padding: 5px; font-size: 10px; font-weight: bold;">
              CARTEIRA NACIONAL DE HABILITAÇÃO / DRIVER LICENSE / PERMISO DE CONDUCCIÓN
            </div>

            <!-- Main Content -->
            <div style="display: flex; padding: 10px; gap: 10px;">

              <!-- Left: Photo and Barcode -->
              <div style="width: 120px;">
                <div style="border: 1px solid #000; height: 150px; display: flex; align-items: center; justify-content: center; background: #f9f9f9; margin-bottom: 8px;">
                  <span style="font-size: 8px; color: #666; text-align: center;">Photo<br/>3x4</span>
                </div>
                <div style="writing-mode: vertical-rl; text-orientation: mixed; font-size: 8px; background: #000; color: #fff; padding: 3px; text-align: center;">
                  VÁLIDO EM TODO O TERRITÓRIO NACIONAL
                </div>
                <div style="margin-top: 5px; font-size: 9px; text-align: center;" contenteditable="true">5005512811</div>
              </div>

              <!-- Right: Information Fields -->
              <div style="flex: 1;">

                <!-- Row 1: Name and First License -->
                <div style="display: flex; gap: 10px; margin-bottom: 6px;">
                  <div style="flex: 2;">
                    <div style="font-size: 7px; color: #666;">2+9 NOME E SOBRENOME / NAME AND SURNAME / NOMBRE Y APELLIDOS</div>
                    <div style="border-bottom: 1px solid #ccc; padding: 2px; font-weight: bold; font-size: 10px;" contenteditable="true"></div>
                  </div>
                  <div style="width: 80px;">
                    <div style="font-size: 7px; color: #666;">1ª HABILITAÇÃO / FIRST LICENSE</div>
                    <div style="border-bottom: 1px solid #ccc; padding: 2px; font-size: 10px;" contenteditable="true"></div>
                  </div>
                </div>

                <!-- Row 2: Birth Date/Place -->
                <div style="margin-bottom: 6px;">
                  <div style="font-size: 7px; color: #666;">3 DATA, LOCAL E UF DE NASCIMENTO / DATE AND PLACE OF BIRTH</div>
                  <div style="border-bottom: 1px solid #ccc; padding: 2px; font-size: 10px;" contenteditable="true"></div>
                </div>

                <!-- Row 3: Issue Date, Validity, ACC -->
                <div style="display: flex; gap: 10px; margin-bottom: 6px;">
                  <div style="flex: 1;">
                    <div style="font-size: 7px; color: #666;">4a DATA EMISSÃO / ISSUE DATE</div>
                    <div style="border-bottom: 1px solid #ccc; padding: 2px; font-size: 10px;" contenteditable="true"></div>
                  </div>
                  <div style="flex: 1;">
                    <div style="font-size: 7px; color: #666;">4b VALIDADE / EXPIRY DATE</div>
                    <div style="border-bottom: 1px solid #ccc; padding: 2px; font-size: 10px; color: #c00;" contenteditable="true"></div>
                  </div>
                  <div style="width: 60px;">
                    <div style="font-size: 7px; color: #666;">ACC</div>
                    <div style="border: 1px solid #000; padding: 2px; font-size: 10px; text-align: center; background: #f0f0f0;" contenteditable="true">P</div>
                  </div>
                </div>

                <!-- Row 4: ID Document -->
                <div style="margin-bottom: 6px;">
                  <div style="font-size: 7px; color: #666;">4c DOC IDENTIDADE / ORG EMISSOR / UF - ID DOCUMENT / ISSUING AUTHORITY</div>
                  <div style="border-bottom: 1px solid #ccc; padding: 2px; font-size: 10px;" contenteditable="true"></div>
                </div>

                <!-- Row 5: CPF, Registration, Category -->
                <div style="display: flex; gap: 10px; margin-bottom: 6px;">
                  <div style="flex: 1;">
                    <div style="font-size: 7px; color: #666;">4d CPF</div>
                    <div style="border-bottom: 1px solid #ccc; padding: 2px; font-size: 10px;" contenteditable="true"></div>
                  </div>
                  <div style="flex: 1;">
                    <div style="font-size: 7px; color: #666;">5 Nº REGISTRO / REGISTRATION NUMBER</div>
                    <div style="border-bottom: 1px solid #ccc; padding: 2px; font-size: 10px; color: #c00;" contenteditable="true"></div>
                  </div>
                  <div style="width: 50px;">
                    <div style="font-size: 7px; color: #666;">9 CAT/HAB</div>
                    <div style="border: 1px solid #c00; padding: 2px; font-size: 12px; text-align: center; font-weight: bold; color: #c00; background: #fff0f0;" contenteditable="true">B</div>
                  </div>
                </div>

                <!-- Row 6: Nationality -->
                <div style="margin-bottom: 6px;">
                  <div style="font-size: 7px; color: #666;">10 NACIONALIDADE / NATIONALITY</div>
                  <div style="border-bottom: 1px solid #ccc; padding: 2px; font-size: 10px;" contenteditable="true">BRASILEIRO(A) / BRAZILIAN</div>
                </div>

                <!-- Row 7: Parents -->
                <div style="margin-bottom: 6px;">
                  <div style="font-size: 7px; color: #666;">8 FILIAÇÃO / PARENTS</div>
                  <div style="border-bottom: 1px solid #ccc; padding: 2px; font-size: 10px;" contenteditable="true"></div>
                  <div style="border-bottom: 1px solid #ccc; padding: 2px; font-size: 10px;" contenteditable="true"></div>
                </div>

                <!-- Row 8: Signature -->
                <div>
                  <div style="font-size: 7px; color: #666;">7 ASSINATURA DO PORTADOR / HOLDER'S SIGNATURE</div>
                  <div style="border: 1px solid #ccc; height: 30px; background: #fafafa;"></div>
                </div>

              </div>
            </div>

            <!-- Categories Table -->
            <div style="padding: 10px; border-top: 1px solid #ccc;">
              <div style="display: flex; gap: 20px;">
                <table style="border-collapse: collapse; font-size: 8px; flex: 1;">
                  <tr>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">ACC</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">D</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">A</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">D1</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">A1</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">BE</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">A2</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">CE</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">B</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">C1E</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">B1</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">DE</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">C</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">D1E</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;">C1</td>
                    <td style="border: 1px solid #000; padding: 2px 10px;" contenteditable="true"></td>
                    <td style="border: 1px solid #000; padding: 2px 5px; background: #f0f0f0;"></td>
                    <td style="border: 1px solid #000; padding: 2px 10px;"></td>
                  </tr>
                </table>

                <!-- Observations -->
                <div style="flex: 1;">
                  <div style="font-size: 7px; color: #666; margin-bottom: 3px;">12 OBSERVAÇÕES / OBSERVATIONS / OBSERVACIONES</div>
                  <div style="border: 1px solid #ccc; min-height: 80px; padding: 5px; font-size: 9px;" contenteditable="true">EAR</div>
                </div>
              </div>
            </div>

            <!-- Footer with Location -->
            <div style="display: flex; justify-content: space-between; padding: 8px 10px; border-top: 1px solid #ccc; background: #f5f5f5;">
              <div>
                <div style="font-size: 7px; color: #666;">LOCAL / PLACE</div>
                <div style="font-size: 10px;" contenteditable="true">SÃO PAULO, SP</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 7px; color: #666;">ASSINADO DIGITALMENTE / DIGITALLY SIGNED</div>
                <div style="font-size: 8px;">DEPARTAMENTO ESTADUAL DE TRÂNSITO</div>
                <div style="font-size: 9px;" contenteditable="true">15575604402</div>
                <div style="font-size: 9px;" contenteditable="true">SP027650816</div>
              </div>
            </div>

          </div>

          <!-- State Name -->
          <div style="text-align: center; margin: 10px 0;">
            <div style="font-size: 18px; font-weight: bold;" contenteditable="true">SÃO PAULO</div>
          </div>

          <!-- QR Code Section -->
          <div style="margin: 10px; padding: 15px; border: 1px solid #ccc; display: flex; gap: 20px;">
            <div>
              <div style="font-weight: bold; margin-bottom: 10px;">QR-CODE</div>
              <div style="width: 120px; height: 120px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #666;">
                QR Code<br/>Area
              </div>
            </div>
            <div style="flex: 1; font-size: 9px; line-height: 1.5;">
              <p>Documento assinado com certificado digital em conformidade com a Medida Provisória nº 2200-2/2001. Sua validade poderá ser confirmada por meio do programa Assinador Serpro.</p>
              <p style="margin-top: 10px;">As orientações para instalar o Assinador Serpro e realizar a validação do documento digital estão disponíveis em:<br/>
              <strong>https://www.serpro.gov.br/assinador-digital</strong></p>
              <div style="margin-top: 15px; text-align: right;">
                <span style="font-weight: bold; color: #006847;">SERPRO</span> / <span style="font-weight: bold;">SENATRAN</span>
              </div>
            </div>
          </div>

          <!-- Legend -->
          <div style="margin: 10px; padding: 10px; background: #f5f5f5; font-size: 7px; line-height: 1.6; border: 1px solid #ddd;">
            <div><strong>2+9.</strong> Nome e Sobrenome / Name and Surname / Nombre y Apellidos - <strong>1ª Habilitação</strong> - Primeira Habilitação / First Driver License / Primera Licencia de Conducir - <strong>3.</strong> Data e Local de Nascimento / Date and Place of Birth (DD/MM/YYYY) / Fecha y Lugar de Nacimiento - <strong>4a.</strong> Data de Emissão / Issuing Date (DD/MM/YYYY) / Fecha de Emisión - <strong>4b.</strong> Data de Validade / Expiration Date (DD/MM/YYYY) / Válido Hasta - <strong>ACC</strong> - Autorização para Conduzir Ciclomotor / Moped Authorization / Autorización Ciclomotor - <strong>4c.</strong> Documento de Identificação / Identity Document / Documento de Identificación - Órgão emissor / Issuing Authority / Autoridad Emisora - <strong>4d.</strong> CPF - <strong>5.</strong> Número de registro da CNH / Driver License Number / Número de Permiso de Conducir - <strong>9.</strong> Categoria de Veículos de Carteira de Habilitação / Driver license Class / Categoría de Permiso de Conducir - Nacionalidade / Nationality / Nacionalidad - <strong>8.</strong> Filiação / Filiation / Filiación - <strong>12.</strong> Observações / Observations / Observaciones - Local / Place / Lugar</div>
          </div>

          <!-- MRZ Code -->
          <div style="margin: 10px; padding: 10px; background: #fff; font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 1px; border: 1px solid #000;">
            <div contenteditable="true">I&lt;BRA0897718O1&lt;218&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
            <div contenteditable="true">0501068F2604228BRA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;4</div>
            <div contenteditable="true">SURNAME&lt;&lt;GIVEN&lt;NAMES&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
          </div>

        </div>
      `
    }
  };

  const [files, setFiles] = useState([]);
  const [ocrResults, setOcrResults] = useState([]);
  const [translationResults, setTranslationResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  // Proofreading state (admin only)
  const [proofreadingResult, setProofreadingResult] = useState(null);
  const [isProofreading, setIsProofreading] = useState(false);
  const [proofreadingError, setProofreadingError] = useState('');

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
  const [includeCertification, setIncludeCertification] = useState(true);
  const [includeAuthenticityStatement, setIncludeAuthenticityStatement] = useState(true); // Atestado de Autenticidade
  const [certificationData, setCertificationData] = useState(null);
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
  const [sendDestination, setSendDestination] = useState('pm'); // 'pm' or 'admin'

  // Resources state
  const [instructions, setInstructions] = useState([]);
  const [glossaries, setGlossaries] = useState([]);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [editingGlossary, setEditingGlossary] = useState(null);
  const [instructionForm, setInstructionForm] = useState({ sourceLang: 'Portuguese (Brazil)', targetLang: 'English', title: '', content: '', field: 'All Fields', documentType: 'All Documents' });
  const [glossaryForm, setGlossaryForm] = useState({
    name: '',
    sourceLang: 'Portuguese (Brazil)',
    targetLang: 'English',
    bidirectional: true,  // Create entries for both directions
    field: 'All Fields',
    terms: []
  });
  const [newTerm, setNewTerm] = useState({ source: '', target: '', notes: '' });
  const [termSearchQuery, setTermSearchQuery] = useState(''); // Search filter for glossary terms
  const [resourcesFilter, setResourcesFilter] = useState({ language: 'All Languages', field: 'All Fields' });

  // Translator's Note for Financial Documents (Bank Statements, Tax Returns)
  const [translatorNoteEnabled, setTranslatorNoteEnabled] = useState(false);
  const [translatorNoteSettings, setTranslatorNoteSettings] = useState({
    sourceCurrency: 'BRL',
    targetCurrency: 'USD',
    exchangeRate: '',
    rateDate: new Date().toISOString().split('T')[0],
    rateSource: 'xe.com',
    convertValues: true,
    customNote: ''
  });
  const [fetchingRate, setFetchingRate] = useState(false);

  // Fetch exchange rate from API (ExchangeRate-API for real-time rates)
  const fetchExchangeRate = async () => {
    setFetchingRate(true);
    try {
      // Using ExchangeRate-API (more accurate, real-time rates)
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${translatorNoteSettings.targetCurrency}`
      );
      const data = await response.json();
      if (data.rates && data.rates[translatorNoteSettings.sourceCurrency]) {
        setTranslatorNoteSettings(prev => ({
          ...prev,
          exchangeRate: data.rates[translatorNoteSettings.sourceCurrency].toFixed(4),
          rateDate: data.date || new Date().toISOString().split('T')[0]
        }));
      } else {
        throw new Error('Rate not found');
      }
    } catch (error) {
      // Fallback to Frankfurter API (ECB rates)
      try {
        const response = await fetch(
          `https://api.frankfurter.app/latest?from=${translatorNoteSettings.targetCurrency}&to=${translatorNoteSettings.sourceCurrency}`
        );
        const data = await response.json();
        if (data.rates && data.rates[translatorNoteSettings.sourceCurrency]) {
          setTranslatorNoteSettings(prev => ({
            ...prev,
            exchangeRate: data.rates[translatorNoteSettings.sourceCurrency].toFixed(4),
            rateDate: data.date || new Date().toISOString().split('T')[0]
          }));
        }
      } catch (err) {
        console.error('Error fetching exchange rate:', err);
        alert('Could not fetch exchange rate. Please enter manually.');
      }
    } finally {
      setFetchingRate(false);
    }
  };

  // Generate Translator's Note text
  const generateTranslatorNote = () => {
    const src = CURRENCIES[translatorNoteSettings.sourceCurrency];
    const tgt = CURRENCIES[translatorNoteSettings.targetCurrency];
    const rate = translatorNoteSettings.exchangeRate;
    const date = new Date(translatorNoteSettings.rateDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const source = RATE_SOURCES.find(s => s.id === translatorNoteSettings.rateSource);

    // Format: NOK 10.19 ≈ US$1.00
    const noteText = `[TRANSLATOR'S NOTE: Converting ${src.name} into ${tgt.name} (Source: ${source?.url || 'https://www.xe.com/currencyconverter/'}), on this date ${date}, ${translatorNoteSettings.sourceCurrency} ${src.symbol}${rate} is equivalent (≈) to ${tgt.symbol}1.00 (One ${tgt.name}) / the corresponding total available balance in ${tgt.currency || 'dollar'} is between brackets [ ] below].`;

    return noteText;
  };

  // Convert a value from source to target currency
  const convertCurrencyValue = (value, addBrackets = true) => {
    if (!translatorNoteSettings.exchangeRate || !value) return value;
    const numValue = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    if (isNaN(numValue)) return value;
    const converted = numValue / parseFloat(translatorNoteSettings.exchangeRate);
    const tgt = CURRENCIES[translatorNoteSettings.targetCurrency];
    const formattedConverted = converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (addBrackets) {
      return `[<strong>${tgt.symbol}${formattedConverted}</strong>]`;
    }
    return `${tgt.symbol}${formattedConverted}`;
  };

  // Logo states (base64)
  const [logoLeft, setLogoLeft] = useState('');
  const [logoRight, setLogoRight] = useState('');
  const [logoStamp, setLogoStamp] = useState('');
  const [signatureImage, setSignatureImage] = useState('');

  // Certificate Header Info
  const [certCompanyName, setCertCompanyName] = useState('Legacy Translations, LLC');
  const [certCompanyAddress, setCertCompanyAddress] = useState('123 Business St, Suite 100');
  const [certCompanyPhone, setCertCompanyPhone] = useState('+1 (555) 123-4567');
  const [certCompanyEmail, setCertCompanyEmail] = useState('contact@legacytranslations.com');

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
    // Load saved logos from localStorage as fallback
    const savedLogoLeft = localStorage.getItem('logo_left');
    const savedLogoRight = localStorage.getItem('logo_right');
    const savedLogoStamp = localStorage.getItem('logo_stamp');
    const savedSignature = localStorage.getItem('signature_image');
    if (savedLogoLeft) setLogoLeft(savedLogoLeft);
    if (savedLogoRight) setLogoRight(savedLogoRight);
    if (savedLogoStamp) setLogoStamp(savedLogoStamp);
    if (savedSignature) setSignatureImage(savedSignature);

    // Load saved certificate header info
    const savedCertCompanyName = localStorage.getItem('cert_company_name');
    const savedCertCompanyAddress = localStorage.getItem('cert_company_address');
    const savedCertCompanyPhone = localStorage.getItem('cert_company_phone');
    const savedCertCompanyEmail = localStorage.getItem('cert_company_email');
    if (savedCertCompanyName) setCertCompanyName(savedCertCompanyName);
    if (savedCertCompanyAddress) setCertCompanyAddress(savedCertCompanyAddress);
    if (savedCertCompanyPhone) setCertCompanyPhone(savedCertCompanyPhone);
    if (savedCertCompanyEmail) setCertCompanyEmail(savedCertCompanyEmail);

    // Load saved general instructions
    const savedInstructions = localStorage.getItem('general_instructions');
    if (savedInstructions) setGeneralInstructions(savedInstructions);

    // Load saved page format and translation type
    const savedPageFormat = localStorage.getItem('page_format');
    const savedTranslationType = localStorage.getItem('translation_type');
    if (savedPageFormat) setPageFormat(savedPageFormat);
    if (savedTranslationType) setTranslationType(savedTranslationType);

    // Load API key from localStorage first (will be replaced by backend key if available)
    const savedKey = localStorage.getItem('claude_api_key');
    if (savedKey) setClaudeApiKey(savedKey);

    fetchResources();
    fetchAvailableOrders();
  }, []);

  // Load shared API key from backend when adminKey is available
  useEffect(() => {
    if (adminKey) {
      loadSharedApiKey();
    }
  }, [adminKey]);

  // Load shared assets (logos, stamp, signature) from backend for all users
  useEffect(() => {
    const loadSharedAssets = async () => {
      if (!adminKey) return;
      try {
        const response = await axios.get(`${API}/admin/shared-assets?admin_key=${adminKey}`);
        if (response.data) {
          if (response.data.logo_left) setLogoLeft(response.data.logo_left);
          if (response.data.logo_right) setLogoRight(response.data.logo_right);
          if (response.data.logo_stamp) setLogoStamp(response.data.logo_stamp);
          if (response.data.signature_image) setSignatureImage(response.data.signature_image);
        }
      } catch (error) {
        console.log('Could not load shared assets from backend, using localStorage fallback');
      }
    };
    loadSharedAssets();
  }, [adminKey]);

  // Function to save an individual asset to backend (admin only)
  const saveAssetToBackend = async (assetType, value) => {
    if (!adminKey) {
      setProcessingStatus('❌ User not logged in');
      return false;
    }
    if (user?.role !== 'admin') {
      setProcessingStatus('❌ Only admin can save shared assets');
      return false;
    }
    try {
      const assetData = { [assetType]: value };
      await axios.put(`${API}/admin/shared-assets?admin_key=${adminKey}`, assetData);
      setProcessingStatus(`✅ ${assetType === 'logo_left' ? 'Left logo' : assetType === 'logo_right' ? 'Center logo' : assetType === 'logo_stamp' ? 'Stamp' : assetType === 'signature_image' ? 'Signature' : assetType} salvo!`);
      return true;
    } catch (error) {
      console.error('Error saving asset:', error);
      setProcessingStatus(`❌ Falha ao salvar ${assetType}`);
      return false;
    }
  };

  // Pre-fill from selectedOrder when coming from Projects
  useEffect(() => {
    if (selectedOrder) {
      // Set order number
      setOrderNumber(selectedOrder.order_number || '');

      // Set languages from order
      if (selectedOrder.translate_from) setSourceLanguage(selectedOrder.translate_from);
      if (selectedOrder.translate_to) setTargetLanguage(selectedOrder.translate_to);

      // Auto-fill currencies based on languages
      const srcCurrency = getCurrencyFromLanguage(selectedOrder.translate_from);
      const tgtCurrency = getCurrencyFromLanguage(selectedOrder.translate_to);
      setTranslatorNoteSettings(prev => ({
        ...prev,
        sourceCurrency: srcCurrency,
        targetCurrency: tgtCurrency,
        exchangeRate: ''
      }));

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

  // Auto-update currencies when source/target language changes
  useEffect(() => {
    if (sourceLanguage) {
      const srcCurrency = getCurrencyFromLanguage(sourceLanguage);
      setTranslatorNoteSettings(prev => ({ ...prev, sourceCurrency: srcCurrency, exchangeRate: '' }));
    }
  }, [sourceLanguage]);

  useEffect(() => {
    if (targetLanguage) {
      const tgtCurrency = getCurrencyFromLanguage(targetLanguage);
      setTranslatorNoteSettings(prev => ({ ...prev, targetCurrency: tgtCurrency, exchangeRate: '' }));
    }
  }, [targetLanguage]);

  // Close project menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showProjectMenu && !e.target.closest('.project-menu-container')) {
        setShowProjectMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProjectMenu]);

  // Fetch assigned orders for translator/PM
  const fetchAssignedOrders = async () => {
    if (!user?.id) return;
    setLoadingAssigned(true);
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      // Filter orders assigned to this user (as translator or PM) or with pending review
      const myOrders = (response.data.orders || []).filter(order => {
        // For translators: check if assigned to them
        if (user.role === 'translator') {
          return (
            order.assigned_translator_id === user.id ||
            order.assigned_translator === user.name ||
            order.assigned_translator_name === user.name
          );
        }
        // For PM: check if assigned to them or ready for review
        if (user.role === 'pm') {
          return (
            order.assigned_pm_id === user.id ||
            order.assigned_pm_name === user.name ||
            order.translation_ready ||
            order.translation_html
          );
        }
        // For admin: show all orders with translation
        return order.translation_ready || order.translation_html;
      }).filter(order =>
        // Include most statuses for translators to see their work
        ['pending', 'quote', 'received', 'in_translation', 'review', 'pending_review', 'pending_pm_review', 'client_review', 'ready'].includes(order.translation_status) ||
        order.translation_ready
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

  // Auto-load project when selectedOrder prop is provided (e.g., coming from Projects page or PM Dashboard)
  useEffect(() => {
    const loadOrderData = async () => {
      if (selectedOrder && selectedOrder.id) {
        // Reset state for new order
        setSelectedOrderId(null);
        setTranslationResults([]);

        // Auto-select the project to load its documents
        await selectProject(selectedOrder);

        // Always try to load translation for PM review orders
        const hasTranslation = selectedOrder.translation_ready ||
                               selectedOrder.translation_html ||
                               ['review', 'pending_pm_review', 'pending_review'].includes(selectedOrder.translation_status);

        if (hasTranslation) {
          const loaded = await loadSavedTranslation(selectedOrder);
          if (loaded) {
            setActiveSubTab('review');
            setProcessingStatus(`✅ Tradução do projeto ${selectedOrder.order_number} carregada para revisão!`);
          } else {
            // If loadSavedTranslation failed, try to fetch directly
            try {
              const response = await axios.get(`${API}/admin/orders/${selectedOrder.id}?admin_key=${adminKey}`);
              const orderData = response.data.order || response.data;
              if (orderData.translation_html) {
                setTranslationResults([{
                  translatedText: orderData.translation_html,
                  filename: 'Translation',
                  originalText: ''
                }]);
                setActiveSubTab('review');
                setProcessingStatus(`✅ Tradução carregada!`);
              }
            } catch (err) {
              console.error('Failed to load translation:', err);
              setProcessingStatus(`⚠️ Não foi possível carregar a tradução`);
            }
          }
        }
      }
    };
    loadOrderData();
  }, [selectedOrder]);

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

        // For PDFs, convert to images (one per page)
        if (contentType === 'application/pdf' || doc.filename?.toLowerCase().endsWith('.pdf')) {
          setProcessingStatus(`📄 Extraindo páginas do PDF...`);
          try {
            const images = await convertPdfToImages(file, (currentPage, totalPages) => {
              setProcessingStatus(`📄 Extraindo página ${currentPage} de ${totalPages}...`);
            });
            setOriginalImages(images);
            setProcessingStatus(`✅ "${doc.filename}" carregado! (${images.length} página${images.length > 1 ? 's' : ''})`);
          } catch (pdfErr) {
            console.error('Failed to convert PDF to images:', pdfErr);
            // Fallback to single image
            const dataUrl = `data:${contentType};base64,${base64Data}`;
            setOriginalImages([{ filename: doc.filename, data: dataUrl }]);
            setProcessingStatus(`✅ "${doc.filename}" carregado! (PDF não pôde ser dividido em páginas)`);
          }
        } else {
          // For images, just store directly
          const dataUrl = `data:${contentType};base64,${base64Data}`;
          setOriginalImages([{ filename: doc.filename, data: base64Data, type: contentType }]);
          setProcessingStatus(`✅ "${doc.filename}" carregado!`);
        }

        // Only redirect to translate tab if coming from start tab
        // Stay on current tab if already on translate or ai-pipeline
        if (activeSubTab === 'start') {
          setActiveSubTab('translate');
        }
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

  // Load saved translation from order (for Review tab)
  const loadSavedTranslation = async (order) => {
    if (!order) return false;

    // Check if order has saved translation data
    if (order.translation_html || order.translation_ready) {
      try {
        // Fetch full order details to get translation data
        const response = await axios.get(`${API}/admin/orders/${order.id}?admin_key=${adminKey}`);
        const orderData = response.data.order || response.data;

        if (orderData.translation_html) {
          // Set translation results
          setTranslationResults([{
            translatedText: orderData.translation_html,
            filename: orderData.translation_document_type || 'Translation',
            originalText: ''
          }]);

          // Set original images if available
          if (orderData.translation_original_images && orderData.translation_original_images.length > 0) {
            setOriginalImages(orderData.translation_original_images);
          }

          // Set other translation settings
          if (orderData.translation_source_language) setSourceLanguage(orderData.translation_source_language);
          if (orderData.translation_target_language) setTargetLanguage(orderData.translation_target_language);
          if (orderData.translation_document_type) setDocumentType(orderData.translation_document_type);
          if (orderData.translation_translator_name) setSelectedTranslator(orderData.translation_translator_name);
          if (orderData.translation_type_setting) setTranslationType(orderData.translation_type_setting);
          if (orderData.translation_page_format) setPageFormat(orderData.translation_page_format);
          if (orderData.translation_include_cover !== undefined) setIncludeCover(orderData.translation_include_cover);

          setProcessingStatus(`✅ Tradução carregada: ${orderData.translation_document_type || 'Documento'}`);
          return true;
        }
      } catch (err) {
        console.error('Failed to load saved translation:', err);
      }
    }
    return false;
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
      // Filter orders that are in translation or review status (including pending review)
      const orders = response.data.orders || [];
      const available = orders.filter(o =>
        ['received', 'in_translation', 'review', 'pending_review', 'pending_pm_review'].includes(o.translation_status) ||
        o.translation_ready
      );
      setAvailableOrders(available);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  // Check if all approval checks are complete
  const isApprovalComplete = approvalChecks.projectNumber && approvalChecks.languageCorrect && approvalChecks.proofread;

  // Send translation to Projects
  const sendToProjects = async (destination = 'admin') => {
    // For 'save' destination, only require basic info
    if (destination !== 'save') {
      // Validate document type
      if (!documentType.trim()) {
        alert('Please fill in the Document Type field');
        return;
      }

      // Validate approval checklist only for delivery
      if (destination === 'deliver' && !isApprovalComplete) {
        alert('Please complete all items in the Approval Checklist before sending');
        return;
      }
    }

    if (!selectedOrderId) {
      alert('Please select an order to link this translation.\n\nGo to the START tab and select a project first.');
      return;
    }

    if (translationResults.length === 0) {
      alert('No translation to save. Please translate the document first.');
      return;
    }

    setSendingToProjects(true);
    setProcessingStatus(destination === 'save' ? '💾 Saving translation...' : '📤 Sending translation...');
    try {
      // Generate the HTML content
      const translator = TRANSLATORS.find(t => t.name === selectedTranslator);

      // Build translation HTML (simplified for storage)
      const translationHTML = translationResults.map(r => r.translatedText).join('\n\n---\n\n');

      // Send to backend with destination info
      const response = await axios.post(`${API}/admin/orders/${selectedOrderId}/translation?admin_key=${adminKey}`, {
        translation_html: translationHTML,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        document_type: documentType || 'Document',
        translator_name: translator?.name || selectedTranslator,
        translation_date: translationDate,
        include_cover: includeCover,
        page_format: pageFormat,
        translation_type: translationType,
        original_images: originalImages.map(img => ({ filename: img.filename, data: img.data })),
        logo_left: logoLeft,
        logo_right: logoRight,
        logo_stamp: logoStamp,
        send_to: destination, // 'save', 'pm', 'ready', 'deliver'
        submitted_by: user?.name || 'Unknown',
        submitted_by_role: user?.role || 'unknown'
      });

      const destinationLabels = {
        'save': 'Saved',
        'pm': 'PM Review',
        'ready': 'Ready for Delivery',
        'deliver': 'Client'
      };
      const destinationLabel = destinationLabels[destination] || destination;

      if (response.data.status === 'success' || response.data.success) {
        const isTranslator = user?.role === 'translator';

        if (destination === 'save') {
          setProcessingStatus(`✅ Translation saved successfully!`);
          // Clear status after 3 seconds for save action
          setTimeout(() => setProcessingStatus(''), 3000);
        } else if (destination === 'pm') {
          setProcessingStatus(`✅ Translation sent to PM for review!`);
          if (isTranslator) {
            // Translator stays on translation page and goes to START tab to see other projects
            setTimeout(() => {
              // Reset the form and go back to START tab
              setSelectedOrderId('');
              setOrderNumber('');
              setTranslationResults([]);
              setOriginalImages([]);
              setActiveSubTab('start');
              setProcessingStatus('');
              // Refresh assigned orders list
              fetchAssignedOrders();
            }, 2000);
          } else {
            // For PM/Admin, just clear status after showing success
            setTimeout(() => setProcessingStatus(''), 3000);
          }
        } else {
          setProcessingStatus(`✅ Translation sent to ${destinationLabel}!`);
          setTimeout(() => setProcessingStatus(''), 3000);
        }

        // Refresh orders list
        fetchAvailableOrders();
        fetchAssignedOrders();
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

  // Approve translation (PM/Admin) - sends to admin for final approval or marks as ready
  const approveTranslation = async (sendDirectToReady = false) => {
    if (!selectedOrderId) {
      alert('No order selected');
      return;
    }

    // PM sends to Admin for approval, Admin marks as ready
    const isPMApproval = isPM && !isAdmin && !sendDirectToReady;
    const newStatus = isPMApproval ? 'pending_admin_approval' : 'ready';
    const message = isPMApproval
      ? '✅ Approve and send to Admin?\n\nThe translation will be sent to Admin for final approval before delivery.'
      : '✅ Approve this translation?\n\nThe translation will be marked as "Ready for Delivery".';

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    setSendingToProjects(true);
    try {
      await axios.put(`${API}/admin/orders/${selectedOrderId}?admin_key=${adminKey}`, {
        translation_status: newStatus,
        proofreading_status: 'approved',
        proofreading_score: proofreadingResult?.pontuacao_final || null,
        proofreading_by: user?.name || 'PM',
        proofreading_date: new Date().toISOString()
      });

      if (isPMApproval) {
        setProcessingStatus('✅ Translation APPROVED and sent to Admin for final review!');
      } else {
        setProcessingStatus('✅ Translation APPROVED! Ready for delivery.');
      }

      // Refresh lists
      fetchAvailableOrders();
      fetchAssignedOrders();

      // Navigate back for PM
      if (isPM && !isAdmin && onBack) {
        setTimeout(() => onBack(), 1500);
      } else if (isAdmin) {
        // Admin can go directly to deliver
        setActiveSubTab('deliver');
      }
    } catch (error) {
      console.error('Error approving translation:', error);
      setProcessingStatus(`❌ Failed to approve: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSendingToProjects(false);
    }
  };

  // Reject translation (PM/Admin) - returns to translator
  const rejectTranslation = async () => {
    if (!selectedOrderId) {
      alert('No order selected');
      return;
    }

    const reason = window.prompt(
      '❌ Reject this translation?\n\n' +
      'Please provide a reason for rejection (will be sent to translator):'
    );

    if (reason === null) return; // Cancelled
    if (!reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setSendingToProjects(true);
    try {
      // Update order status back to in_translation
      await axios.put(`${API}/admin/orders/${selectedOrderId}?admin_key=${adminKey}`, {
        translation_status: 'in_translation',
        proofreading_status: 'rejected',
        proofreading_notes: reason,
        proofreading_by: user?.name || 'PM',
        proofreading_date: new Date().toISOString()
      });

      setProcessingStatus('❌ Translation REJECTED. Returned to translator with feedback.');

      // Refresh lists
      fetchAvailableOrders();
      fetchAssignedOrders();

      // Navigate back
      if (onBack) {
        setTimeout(() => onBack(), 1500);
      }
    } catch (error) {
      console.error('Error rejecting translation:', error);
      setProcessingStatus(`❌ Failed to reject: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSendingToProjects(false);
    }
  };

  // Save API key (to backend for sharing with all users)
  const saveApiKey = async () => {
    if (!claudeApiKey) {
      setProcessingStatus('❌ Please enter an API key');
      return;
    }

    try {
      // Save to backend (shared with all users)
      await axios.post(`${API}/admin/settings/api-key?admin_key=${adminKey}`, {
        api_key: claudeApiKey
      });

      // Also save locally as backup
      localStorage.setItem('claude_api_key', claudeApiKey);
      setProcessingStatus('✅ API Key saved! All translators can now use it.');
    } catch (err) {
      console.error('Failed to save API key to backend:', err);
      // Fallback to localStorage only
      localStorage.setItem('claude_api_key', claudeApiKey);
      setProcessingStatus('⚠️ API Key saved locally only. Backend save failed.');
    }
  };

  // Load shared API key from backend
  const loadSharedApiKey = async () => {
    try {
      // First try to get from backend
      const response = await axios.get(`${API}/settings/api-key/use?token=${adminKey}`);
      if (response.data?.api_key) {
        setClaudeApiKey(response.data.api_key);
        localStorage.setItem('claude_api_key', response.data.api_key);
        return true;
      }
    } catch (err) {
      // If backend fails, try localStorage
      const savedKey = localStorage.getItem('claude_api_key');
      if (savedKey) {
        setClaudeApiKey(savedKey);
        return true;
      }
    }
    return false;
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
    setTermSearchQuery('');
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

  // Handle external original document upload (with PDF to image conversion)
  const handleExternalOriginalUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    setProcessingStatus('📤 Processing original documents...');
    const allImages = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileName = file.name.toLowerCase();

      // PDF - store directly as data URL
      if (fileName.endsWith('.pdf')) {
        setProcessingStatus(`Loading PDF: ${file.name}`);
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        allImages.push({ filename: file.name, data: dataUrl, type: 'application/pdf' });
      }
      // Images - read as data URL
      else if (file.type.startsWith('image/')) {
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        allImages.push({ filename: file.name, data: dataUrl });
      }
    }

    if (allImages.length > 0) {
      setExternalOriginalImages(allImages);
      // Also set as originalImages for certificate generation
      setOriginalImages(allImages);
      setProcessingStatus(`✅ ${allImages.length} original page(s) uploaded`);
    }
  };

  // Handle external translation upload (text or images)
  const handleExternalTranslationUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    setProcessingStatus('Processing uploaded translation...');

    for (const file of selectedFiles) {
      const fileName = file.name.toLowerCase();

      try {
        // Word document (.docx) - convert to HTML
        if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
          setProcessingStatus(`Converting Word document: ${file.name}`);
          const html = await convertWordToHtml(file);
          setExternalTranslationText(html);
          setProcessingStatus(`✅ Word document converted`);
        }
        // HTML file - read as HTML
        else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
          setProcessingStatus(`Reading HTML: ${file.name}`);
          const html = await readHtmlFile(file);
          setExternalTranslationText(html);
          setProcessingStatus(`✅ HTML file loaded`);
        }
        // Text file
        else if (fileName.endsWith('.txt') || file.type === 'text/plain') {
          setProcessingStatus(`Reading text file: ${file.name}`);
          const text = await readTxtFile(file);
          setExternalTranslationText(text);
          setProcessingStatus(`✅ Text file loaded`);
        }
        // PDF - store directly
        else if (fileName.endsWith('.pdf')) {
          setProcessingStatus(`Loading PDF: ${file.name}`);
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
          setExternalTranslationImages(prev => [...prev, { filename: file.name, data: dataUrl, type: 'application/pdf' }]);
          setProcessingStatus(`✅ PDF loaded`);
        }
        // Images (JPG, PNG, etc.)
        else if (file.type.startsWith('image/')) {
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
          setExternalTranslationImages(prev => [...prev, { filename: file.name, data: base64 }]);
          setProcessingStatus(`✅ Image uploaded`);
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        setProcessingStatus(`⚠️ Error processing ${file.name}`);
      }
    }

    setTimeout(() => setProcessingStatus(''), 3000);
    event.target.value = '';
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

    // Also populate Quick Package files for DELIVER tab
    // Convert full data URLs to base64-only format
    if (externalOriginalImages.length > 0) {
      const origFiles = externalOriginalImages.map(img => {
        const dataUrl = img.data;
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          return {
            filename: img.filename,
            data: matches[2], // Just the base64 part
            type: matches[1]  // The mime type
          };
        }
        return { filename: img.filename, data: dataUrl, type: 'image/png' };
      });
      setQuickOriginalFiles(origFiles);
    }

    if (externalTranslationImages.length > 0) {
      const transFiles = externalTranslationImages.map(img => {
        const dataUrl = img.data;
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          return {
            filename: img.filename,
            data: matches[2], // Just the base64 part
            type: matches[1]  // The mime type
          };
        }
        return { filename: img.filename, data: dataUrl, type: 'image/png' };
      });
      setQuickTranslationFiles(transFiles);
      setQuickTranslationType('images');
    } else if (externalTranslationText) {
      // If text was pasted, convert to HTML for Quick Package
      const html = `<div style="white-space: pre-wrap; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6;">${externalTranslationText}</div>`;
      setQuickTranslationHtml(html);
      setQuickTranslationType('html');
    }

    setActiveSubTab('review');
    setProcessingStatus('✅ Ready for review');
  };

  // Run detailed proofreading (admin only)
  const runProofreading = async () => {
    if (!claudeApiKey) {
      alert('Please configure Claude API key in Settings');
      return;
    }

    const currentResult = translationResults[selectedResultIndex];
    if (!currentResult?.translatedText) {
      alert('No translation to proofread');
      return;
    }

    // Extract text from translation (remove HTML tags for proofreading)
    const translatedText = currentResult.translatedText
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Get original text (from OCR or extracted)
    const originalText = ocrResults[selectedResultIndex]?.text ||
                        currentResult.originalText ||
                        'Original text not available';

    setIsProofreading(true);
    setProofreadingError('');
    setProofreadingResult(null);

    try {
      const response = await fetch(`${API}/admin/proofread?admin_key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_text: originalText,
          translated_text: translatedText,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          document_type: documentType,
          claude_api_key: claudeApiKey
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Proofreading failed');
      }

      if (data.proofreading_result) {
        setProofreadingResult(data.proofreading_result);
      } else if (data.raw_response) {
        // Show raw response if JSON parsing failed
        setProofreadingError(`JSON parsing failed. Raw response:\n${data.raw_response}`);
      }
    } catch (error) {
      console.error('Proofreading error:', error);
      setProofreadingError(error.message);
    } finally {
      setIsProofreading(false);
    }
  };

  // Apply a single proofreading correction
  const applyProofreadingCorrection = (erro, index) => {
    // Handle both field name conventions (encontrado/original and sugestao/correcao)
    const foundText = erro.encontrado || erro.original || erro.traducao_errada;
    const suggestionText = erro.sugestao || erro.correcao;

    if (!foundText || !suggestionText) {
      alert('Cannot apply correction: missing original text or suggestion');
      return;
    }

    const currentResult = translationResults[selectedResultIndex];
    if (!currentResult?.translatedText) return;

    // Replace the found text with the suggestion
    const updatedHtml = currentResult.translatedText.replace(
      new RegExp(foundText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      suggestionText
    );

    // Update translation results
    const newResults = [...translationResults];
    newResults[selectedResultIndex] = {
      ...currentResult,
      translatedText: updatedHtml
    };
    setTranslationResults(newResults);

    // Mark this error as applied in proofreading result
    if (proofreadingResult?.erros) {
      const updatedErros = [...proofreadingResult.erros];
      updatedErros[index] = { ...updatedErros[index], applied: true };
      setProofreadingResult({
        ...proofreadingResult,
        erros: updatedErros
      });
    }
  };

  // Apply all proofreading corrections at once
  const applyAllProofreadingCorrections = () => {
    if (!proofreadingResult?.erros || proofreadingResult.erros.length === 0) return;

    const currentResult = translationResults[selectedResultIndex];
    if (!currentResult?.translatedText) return;

    let updatedHtml = currentResult.translatedText;
    const updatedErros = proofreadingResult.erros.map(erro => {
      // Handle both field name conventions
      const foundText = erro.encontrado || erro.original || erro.traducao_errada;
      const suggestionText = erro.sugestao || erro.correcao;

      if (foundText && suggestionText && !erro.applied) {
        updatedHtml = updatedHtml.replace(
          new RegExp(foundText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
          suggestionText
        );
        return { ...erro, applied: true };
      }
      return erro;
    });

    // Update translation results
    const newResults = [...translationResults];
    newResults[selectedResultIndex] = {
      ...currentResult,
      translatedText: updatedHtml
    };
    setTranslationResults(newResults);

    // Update proofreading result
    setProofreadingResult({
      ...proofreadingResult,
      erros: updatedErros
    });
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

        // Build translator note settings for value conversion
        const translatorNoteData = translatorNoteEnabled ? {
          enabled: true,
          source_currency: translatorNoteSettings.sourceCurrency,
          target_currency: translatorNoteSettings.targetCurrency,
          exchange_rate: parseFloat(translatorNoteSettings.exchangeRate) || 0,
          rate_date: translatorNoteSettings.rateDate,
          rate_source: RATE_SOURCES.find(s => s.id === translatorNoteSettings.rateSource)?.url || '',
          convert_values: translatorNoteSettings.convertValues,
          source_currency_symbol: CURRENCIES[translatorNoteSettings.sourceCurrency]?.symbol || '',
          target_currency_symbol: CURRENCIES[translatorNoteSettings.targetCurrency]?.symbol || ''
        } : null;

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
          original_image: originalImage ? originalImage.data : null,
          // Translator's note for financial documents
          translator_note: translatorNoteData
        });

        if (response.data.status === 'success' || response.data.translation) {
          // Get the translation and optionally prepend translator's note
          let finalTranslation = response.data.translation;

          // Add translator's note at the beginning of each file (not page)
          if (translatorNoteEnabled && translatorNoteSettings.exchangeRate) {
            const noteHTML = `
<div style="background-color: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-style: italic;">
  <strong style="color: #b45309;">[TRANSLATOR'S NOTE:</strong> ${generateTranslatorNote().replace('[TRANSLATOR\'S NOTE:', '').replace(/\]$/, '')}<strong style="color: #b45309;">]</strong>
</div>`;

            // Insert the note after the opening body tag or at the start
            if (finalTranslation.includes('<body>')) {
              finalTranslation = finalTranslation.replace('<body>', '<body>' + noteHTML);
            } else if (finalTranslation.includes('<body')) {
              // Handle <body class="..."> or similar
              finalTranslation = finalTranslation.replace(/(<body[^>]*>)/, '$1' + noteHTML);
            } else {
              // Just prepend if no body tag
              finalTranslation = noteHTML + finalTranslation;
            }
          }

          setTranslationResults(prev => [...prev, {
            filename: ocrResult.filename,
            originalText: ocrResult.text,
            translatedText: finalTranslation
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

    // Handle font size increase/decrease
    if (command === 'increaseFontSize' || command === 'decreaseFontSize') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');

        // Get current font size from selection or default to 12pt
        let currentSize = 12;
        const parentElement = range.commonAncestorContainer.parentElement;
        if (parentElement) {
          const computedStyle = window.getComputedStyle(parentElement);
          currentSize = parseFloat(computedStyle.fontSize) || 12;
        }

        // Increase or decrease by 2pt
        const newSize = command === 'increaseFontSize'
          ? Math.min(currentSize + 2, 48)
          : Math.max(currentSize - 2, 8);
        span.style.fontSize = `${newSize}pt`;

        try {
          span.appendChild(range.extractContents());
          range.insertNode(span);
          selection.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          selection.addRange(newRange);
        } catch (e) {
          console.error('Error applying font size:', e);
        }
      }
    }
    // Handle fontSize and fontName specially since execCommand doesn't work well for these
    else if (command === 'fontSize' || command === 'fontName') {
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
        // PDF - store directly
        else if (fileName.endsWith('.pdf')) {
          setQuickPackageProgress(`Loading PDF: ${file.name}`);
          const base64 = await fileToBase64(file);
          setQuickTranslationFiles(prev => [...prev, {
            filename: file.name,
            data: base64,
            type: 'application/pdf'
          }]);
          if (!quickTranslationHtml) setQuickTranslationType('files');
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
        // PDF - store directly
        if (fileName.endsWith('.pdf')) {
          setQuickPackageProgress(`Loading PDF: ${file.name}`);
          const base64 = await fileToBase64(file);
          processedFiles.push({
            filename: file.name,
            data: base64,
            type: 'application/pdf'
          });
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

  // Generate Authenticity Statement HTML (Atestado de Autenticidade) - follows US legal requirements
  const generateAuthenticityStatementHtml = (config = {}) => {
    const {
      orderNum = orderNumber || 'P0000',
      docType = documentType,
      srcLang = sourceLanguage,
      tgtLang = targetLanguage,
      translatorData = TRANSLATORS.find(t => t.name === selectedTranslator),
      dateStr = translationDate
    } = config;

    // Generate document hash (SHA-256 simulation for display)
    const generateHash = () => {
      const data = `${orderNum}-${docType}-${srcLang}-${tgtLang}-${dateStr}-${Date.now()}`;
      let hash = '';
      for (let i = 0; i < 64; i++) {
        hash += '0123456789ABCDEF'[Math.floor(Math.random() * 16)];
      }
      return hash;
    };

    // Generate verification code
    const generateVerificationCode = () => {
      const chars = '0123456789ABCDEF';
      let code = '';
      for (let i = 0; i < 4; i++) {
        if (i > 0) code += '-';
        for (let j = 0; j < 4; j++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      return code;
    };

    const documentHash = generateHash();
    const verificationCode = generateVerificationCode();
    const verificationUrl = `https://portal.legacytranslations.com/verify/${verificationCode}`;

    return `
    <!-- STATEMENT OF AUTHENTICITY PAGE -->
    <div class="authenticity-page" style="page-break-before: always; padding: 40px 50px; font-family: 'Times New Roman', Georgia, serif; max-width: 800px; margin: 0 auto;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1a365d; padding-bottom: 20px;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-bottom: 10px;">
                ${logoLeft
                  ? `<img src="${logoLeft}" alt="Logo" style="max-height: 50px; object-fit: contain;" />`
                  : `<div style="font-weight: bold; color: #1a365d; font-size: 18px;">LEGACY TRANSLATIONS</div>`
                }
            </div>
            <div style="font-size: 11px; color: #4a5568;">
                867 Boylston Street · 5th Floor · #2073 · Boston, MA · 02116<br>
                (857) 316-7770 · contact@legacytranslations.com
            </div>
        </div>

        <!-- Title -->
        <h1 style="text-align: center; font-size: 22px; color: #1a365d; margin: 30px 0 10px 0; font-weight: bold; letter-spacing: 2px;">
            STATEMENT OF AUTHENTICITY
        </h1>
        <h2 style="text-align: center; font-size: 14px; color: #4a5568; margin: 0 0 30px 0; font-weight: normal;">
            Authentication Protocol for Certified Translation
        </h2>

        <!-- Document Reference -->
        <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <p style="margin: 0 0 15px 0; font-size: 12px; line-height: 1.8; text-align: justify;">
                The document <strong>${orderNum} - ${docType.toUpperCase()}</strong> has been translated by
                <strong>Legacy Translations Inc.</strong>, a professional translation services company and
                <strong>American Translators Association (ATA) Member (No. 275993)</strong>.
            </p>
            <p style="margin: 0; font-size: 12px; line-height: 1.8; text-align: justify;">
                Translation performed from <strong>${srcLang}</strong> to <strong>${tgtLang}</strong>.
            </p>
        </div>

        <!-- Verification Code -->
        <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 13px; color: #4a5568; margin-bottom: 10px;">Verification Code:</div>
            <div style="font-size: 24px; font-family: 'Courier New', monospace; font-weight: bold; color: #1a365d; letter-spacing: 3px;">
                ${verificationCode}
            </div>
        </div>

        <!-- Barcode placeholder -->
        <div style="text-align: center; margin: 20px 0;">
            <div style="display: inline-block; padding: 10px 30px; background: linear-gradient(90deg, #000 2px, transparent 2px) 0 0 / 4px 100%, linear-gradient(90deg, #000 1px, transparent 1px) 0 0 / 2px 100%; background-color: #fff; height: 50px; width: 250px; border: 1px solid #e2e8f0;"></div>
        </div>

        <!-- Document Hash -->
        <div style="text-align: center; margin: 25px 0;">
            <div style="font-size: 12px; font-weight: bold; color: #1a365d; margin-bottom: 8px;">Document Hash</div>
            <div style="font-size: 9px; font-family: 'Courier New', monospace; color: #4a5568; word-break: break-all; max-width: 500px; margin: 0 auto;">
                ${documentHash}
            </div>
        </div>

        <!-- QR Code -->
        <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block;">
                <div style="width: 120px; height: 120px; border: 2px solid #1a365d; display: flex; align-items: center; justify-content: center; background: #f7fafc; margin: 0 auto;">
                    <div style="font-size: 8px; color: #4a5568; text-align: center;">
                        QR CODE<br/>
                        <span style="font-size: 7px;">Scan to verify</span>
                    </div>
                </div>
                <div style="font-size: 10px; color: #4a5568; margin-top: 8px;">Scan to verify authenticity</div>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; font-size: 9px; color: #a0aec0;">
            This document is digitally generated and forms an integral part of the certified translation package.
        </div>
    </div>`;
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
        <div class="header-line"></div>

        <div class="order-number">Order # <strong>${orderNumber || 'P0000'}</strong></div>
        <h1 class="main-title">${certTitle}</h1>
        <div class="subtitle">
            Translation of a <strong>${documentType}</strong> from <strong>${sourceLanguage}</strong> to<br>
            <strong>${targetLanguage}</strong>
        </div>

        ${(() => {
          // Get the template paragraphs for download
          let templateParagraphs;
          if (selectedCertificateTemplate.startsWith('custom-')) {
            const customTemplate = customCertificateTemplates.find(t => `custom-${t.id}` === selectedCertificateTemplate);
            templateParagraphs = customTemplate?.bodyParagraphs || CERTIFICATE_TEMPLATES['default'].bodyParagraphs;
          } else {
            templateParagraphs = CERTIFICATE_TEMPLATES[selectedCertificateTemplate]?.bodyParagraphs || CERTIFICATE_TEMPLATES['default'].bodyParagraphs;
          }

          // Replace placeholders and generate HTML
          return templateParagraphs.map(paragraph => {
            const processedParagraph = paragraph
              .replace(/\{\{sourceLanguage\}\}/g, sourceLanguage)
              .replace(/\{\{targetLanguage\}\}/g, targetLanguage);
            return `<p class="body-text">${processedParagraph}</p>`;
          }).join('\n        ');
        })()}

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
            margin-bottom: 10px;
            padding-bottom: 10px;
        }
        .header-line {
            height: 2px;
            background: #93C5FD;
            margin-bottom: 15px;
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
        .cover-page { page-break-after: always; padding: 30px 40px; }
        .translation-page { page-break-before: always; padding-top: 15px; }
        .translation-content { text-align: center; }
        .translation-content.translation-text {
            text-align: left;
            font-family: 'Times New Roman', Georgia, serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #333;
            orphans: 4;
            widows: 4;
        }
        .translation-content.translation-text p {
            margin-bottom: 10px;
            text-align: justify;
            page-break-inside: avoid;
        }
        .translation-content.translation-text table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            page-break-inside: avoid;
        }
        .translation-content.translation-text td, .translation-content.translation-text th { border: 1px solid #333; padding: 6px; font-size: 10pt; }
        .translation-content.translation-text h1, .translation-content.translation-text h2, .translation-content.translation-text h3 {
            margin: 12px 0 8px;
            color: #1a365d;
            page-break-after: avoid;
        }
        .translation-content.translation-text ul, .translation-content.translation-text ol { margin: 8px 0 8px 20px; }
        .translation-image { max-width: 100%; max-height: 700px; border: 1px solid #ddd; object-fit: contain; }
        .page-title { font-size: 13px; font-weight: bold; text-align: center; margin: 15px 0 10px 0; color: #1a365d; text-transform: uppercase; letter-spacing: 2px; page-break-after: avoid; }
        .original-documents-page { page-break-before: always; padding-top: 15px; }
        .original-image-container { text-align: center; margin-bottom: 10px; }
        .original-image { max-width: 100%; max-height: 650px; border: 1px solid #ddd; object-fit: contain; }

        /* Bank statement / Financial document optimization */
        .financial-doc .translation-content.translation-text {
            font-size: 10pt;
            line-height: 1.3;
        }
        .financial-doc table td { padding: 4px 6px; font-size: 9pt; }

        @media print {
            body {
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                orphans: 4;
                widows: 4;
            }

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
    ${includeAuthenticityStatement ? generateAuthenticityStatementHtml() : ''}
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
        await axios.post(`${API}/glossaries`, tmEntry, { withCredentials: true });
      } catch (err) {
        // Save to localStorage as fallback
        localStorage.setItem('glossaries', JSON.stringify(newGlossaries));
      }
    }
  };

  // Create document certification with QR code
  const createCertification = async () => {
    try {
      const translator = TRANSLATORS.find(t => t.name === selectedTranslator);
      const translationContent = translationResults.map(r => r.translatedText).join('\n');

      const response = await axios.post(`${API}/certifications/create?admin_key=${adminKey}`, {
        order_id: selectedOrderId,
        order_number: orderNumber,
        document_type: documentType,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        page_count: translationResults.length,
        document_content: translationContent,
        certifier_name: translator?.name || 'Beatriz Paiva',
        certifier_title: 'Legal Representative',
        certifier_credentials: 'ATA Member # 275993',
        company_name: certCompanyName || 'Legacy Translations, LLC',
        company_address: certCompanyAddress || '867 Boylston Street, 5th Floor, #2073, Boston, MA 02116',
        company_phone: certCompanyPhone || '(857) 316-7770',
        company_email: certCompanyEmail || 'contact@legacytranslations.com',
        client_name: selectedOrder?.client_name || ''
      });

      setCertificationData(response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to create certification:', err);
      return null;
    }
  };

  // Download certificate
  const handleDownload = async (format = 'html') => {
    // Save TM if enabled
    if (saveToTM) {
      saveTranslationMemory();
    }

    // Create certification if enabled
    let certData = certificationData;
    if (includeCertification && !certData) {
      certData = await createCertification();
    }

    const translator = TRANSLATORS.find(t => t.name === selectedTranslator);
    const pageSizeCSS = pageFormat === 'a4' ? 'A4' : 'Letter';
    const certTitle = translationType === 'sworn' ? 'Sworn Translation Certificate' : 'Certification of Translation Accuracy';

    // Check if selected template is a form (like RMV Foreign DL)
    const isFormTemplate = CERTIFICATE_TEMPLATES[selectedCertificateTemplate]?.isForm;

    // Cover Letter HTML - use form HTML if it's a form template
    const coverLetterHTML = isFormTemplate ? `
    <!-- FORM TEMPLATE PAGE -->
    <div class="cover-page" style="padding: 20px;">
        ${CERTIFICATE_TEMPLATES[selectedCertificateTemplate].formHTML}
    </div>` : `
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
        <div class="header-line"></div>

        <div class="order-number">Order # <strong>${orderNumber || 'P0000'}</strong></div>
        <h1 class="main-title">${certTitle}</h1>
        <div class="subtitle">
            Translation of a <strong>${documentType}</strong> from <strong>${sourceLanguage}</strong> to<br>
            <strong>${targetLanguage}</strong>
        </div>

        ${(() => {
          // Get the template paragraphs for download
          let templateParagraphs;
          if (selectedCertificateTemplate.startsWith('custom-')) {
            const customTemplate = customCertificateTemplates.find(t => `custom-${t.id}` === selectedCertificateTemplate);
            templateParagraphs = customTemplate?.bodyParagraphs || CERTIFICATE_TEMPLATES['default'].bodyParagraphs;
          } else {
            templateParagraphs = CERTIFICATE_TEMPLATES[selectedCertificateTemplate]?.bodyParagraphs || CERTIFICATE_TEMPLATES['default'].bodyParagraphs;
          }

          // Replace placeholders and generate HTML
          return templateParagraphs.map(paragraph => {
            const processedParagraph = paragraph
              .replace(/\{\{sourceLanguage\}\}/g, sourceLanguage)
              .replace(/\{\{targetLanguage\}\}/g, targetLanguage);
            return `<p class="body-text">${processedParagraph}</p>`;
          }).join('\n        ');
        })()}

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

    // Certification verification page HTML (with QR code and serial number)
    const certificationPageHTML = (includeCertification && certData) ? `
    <div class="certification-verification-page">
        ${includeLetterhead ? letterheadHTML : ''}
        <div class="certification-box">
            <div class="cert-header">
                <div class="cert-icon">🔐</div>
                <h2 class="cert-title">Document Verification</h2>
                <p class="cert-subtitle">This certified translation can be verified online</p>
            </div>

            <div class="cert-content">
                <div class="cert-info">
                    <div class="cert-row">
                        <span class="cert-label">Certification ID:</span>
                        <span class="cert-value cert-id">${certData.certification_id}</span>
                    </div>
                    <div class="cert-row">
                        <span class="cert-label">Document Type:</span>
                        <span class="cert-value">${documentType}</span>
                    </div>
                    <div class="cert-row">
                        <span class="cert-label">Translation:</span>
                        <span class="cert-value">${sourceLanguage} → ${targetLanguage}</span>
                    </div>
                    <div class="cert-row">
                        <span class="cert-label">Certified Date:</span>
                        <span class="cert-value">${new Date(certData.certified_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div class="cert-row">
                        <span class="cert-label">Document Hash:</span>
                        <span class="cert-value cert-hash">${certData.document_hash?.substring(0, 16)}...</span>
                    </div>
                </div>

                <div class="cert-qr">
                    ${certData.qr_code_data ? `<img src="data:image/png;base64,${certData.qr_code_data}" alt="QR Code" class="qr-image" />` : '<div class="qr-placeholder">QR Code</div>'}
                    <p class="qr-instruction">Scan to verify</p>
                </div>
            </div>

            <div class="cert-footer">
                <p class="verify-url">Verify at: <strong>${certData.verification_url}</strong></p>
                <p class="cert-notice">This document has been digitally certified by Legacy Translations, LLC. Any alterations to this document will invalidate this certification.</p>
            </div>
        </div>
    </div>
    ` : '';

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
            margin-bottom: 10px;
            padding-bottom: 10px;
        }
        .header-line {
            height: 2px;
            background: #93C5FD;
            margin-bottom: 15px;
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
        .cover-page { page-break-after: always; padding: 30px 40px; }
        .translation-page { page-break-before: always; padding-top: 15px; }
        .page-title { font-size: 13px; font-weight: bold; text-align: center; margin: 15px 0 10px 0; color: #1a365d; text-transform: uppercase; letter-spacing: 2px; page-break-after: avoid; }
        .page-header { font-size: 13px; font-weight: bold; text-align: center; margin-bottom: 20px; color: #1a365d; text-transform: uppercase; letter-spacing: 2px; page-break-after: avoid; }
        .translation-content {
            line-height: 1.5;
            font-size: 11pt;
            orphans: 4;
            widows: 4;
        }
        .translation-content p {
            margin-bottom: 10px;
            text-align: justify;
            page-break-inside: avoid;
        }
        .translation-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            page-break-inside: avoid;
        }
        .translation-content td, .translation-content th { border: 1px solid #333; padding: 5px 6px; font-size: 10pt; }
        .translation-content h1, .translation-content h2, .translation-content h3 { page-break-after: avoid; margin: 10px 0 8px; }
        .original-documents-page { page-break-before: always; padding-top: 15px; }
        .original-images-wrapper { margin-top: 15px; }
        .original-image-container { text-align: center; margin-bottom: 10px; }
        .original-image { max-width: 100%; max-height: 650px; border: 1px solid #ddd; object-fit: contain; }
        /* Certification Verification Page Styles */
        .certification-verification-page { page-break-before: always; padding-top: 20px; }
        .certification-box {
            border: 2px solid #2563eb;
            border-radius: 12px;
            padding: 30px;
            margin: 30px auto;
            max-width: 600px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        }
        .cert-header { text-align: center; margin-bottom: 25px; }
        .cert-icon { font-size: 40px; margin-bottom: 10px; }
        .cert-title { font-size: 22px; color: #1e40af; margin: 0 0 5px 0; font-weight: bold; }
        .cert-subtitle { font-size: 12px; color: #64748b; margin: 0; }
        .cert-content { display: flex; justify-content: space-between; align-items: flex-start; gap: 30px; }
        .cert-info { flex: 1; }
        .cert-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #cbd5e1; }
        .cert-row:last-child { border-bottom: none; }
        .cert-label { font-size: 11px; color: #64748b; font-weight: 500; }
        .cert-value { font-size: 12px; color: #1e293b; font-weight: 600; }
        .cert-id { font-family: 'Courier New', monospace; color: #2563eb; font-size: 14px; letter-spacing: 1px; }
        .cert-hash { font-family: 'Courier New', monospace; font-size: 10px; color: #64748b; }
        .cert-qr { text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .qr-image { width: 120px; height: 120px; }
        .qr-placeholder { width: 120px; height: 120px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999; font-size: 10px; }
        .qr-instruction { font-size: 10px; color: #64748b; margin-top: 8px; }
        .cert-footer { margin-top: 25px; text-align: center; padding-top: 20px; border-top: 1px solid #cbd5e1; }
        .verify-url { font-size: 11px; color: #1e40af; margin-bottom: 10px; word-break: break-all; }
        .cert-notice { font-size: 9px; color: #94a3b8; line-height: 1.4; max-width: 500px; margin: 0 auto; }
        @media print {
            body {
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                orphans: 4;
                widows: 4;
            }
            .logo-placeholder { border: 1px dashed #ccc; }
            .certification-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            p, li { page-break-inside: avoid; }
            h1, h2, h3, h4 { page-break-after: avoid; }
            table { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    ${includeCover ? coverLetterHTML : ''}
    ${translationPagesHTML}
    ${originalPagesHTML}
    ${includeAuthenticityStatement ? generateAuthenticityStatementHtml() : ''}
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
            <div className="relative group project-menu-container">
              <button
                className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setShowProjectMenu(!showProjectMenu)}
              >
                <span className="text-blue-600 text-xs font-bold">📋 {selectedOrder.order_number}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600 text-xs">{selectedOrder.client_name}</span>
                <span className="text-gray-400">|</span>
                <span className="text-xs text-gray-500">{selectedOrder.translate_from} → {selectedOrder.translate_to}</span>
                <span className="text-gray-400 ml-1">▼</span>
              </button>

              {/* Dropdown Menu */}
              {showProjectMenu && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="font-bold text-sm">{selectedOrder.order_number}</div>
                    <div className="text-xs opacity-80">{selectedOrder.client_name}</div>
                  </div>

                  <div className="p-1">
                    {/* Load Document */}
                    <button
                      onClick={() => {
                        setShowProjectMenu(false);
                        setActiveSubTab('start');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      <span className="text-lg">📂</span>
                      <div className="text-left">
                        <div className="font-medium">Abrir Documentos</div>
                        <div className="text-[10px] text-gray-500">Ver arquivos do projeto</div>
                      </div>
                    </button>

                    {/* Translate */}
                    <button
                      onClick={() => {
                        setShowProjectMenu(false);
                        setActiveSubTab('translate');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-yellow-50 rounded transition-colors"
                    >
                      <span className="text-lg">📄</span>
                      <div className="text-left">
                        <div className="font-medium">Traduzir Documento</div>
                        <div className="text-[10px] text-gray-500">OCR e tradução manual</div>
                      </div>
                    </button>

                    {/* Review - highlighted if translation ready */}
                    <button
                      onClick={async () => {
                        setShowProjectMenu(false);
                        if (selectedOrder.translation_ready || selectedOrder.translation_html) {
                          await loadSavedTranslation(selectedOrder);
                        }
                        setActiveSubTab('review');
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
                        selectedOrder.translation_ready || selectedOrder.translation_html
                          ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                          : 'text-gray-700 hover:bg-green-50'
                      }`}
                    >
                      <span className="text-lg">🔍</span>
                      <div className="text-left">
                        <div className="font-medium">
                          {selectedOrder.translation_ready ? '✅ Revisar Tradução' : 'Review'}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {selectedOrder.translation_ready ? 'Tradução pronta para revisão' : 'Revisar e aprovar'}
                        </div>
                      </div>
                    </button>

                    {/* Deliver */}
                    <button
                      onClick={() => {
                        setShowProjectMenu(false);
                        setActiveSubTab('deliver');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      <span className="text-lg">✅</span>
                      <div className="text-left">
                        <div className="font-medium">Entregar ao Cliente</div>
                        <div className="text-[10px] text-gray-500">Finalizar e enviar</div>
                      </div>
                    </button>
                  </div>

                  <div className="border-t border-gray-100 p-1">
                    <div className="px-3 py-2 text-[10px] text-gray-400">
                      Status: <span className="font-medium">{selectedOrder.translation_status || 'received'}</span>
                    </div>
                  </div>
                </div>
              )}
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
          { id: 'start', label: 'START', icon: '📝', roles: ['admin', 'pm', 'translator'] },
          { id: 'translate', label: 'TRADUÇÃO', icon: '📄', roles: ['admin', 'pm', 'translator'] },
          { id: 'review', label: 'PROOFREADING', icon: '🔍', roles: ['admin', 'pm', 'translator'] },
          { id: 'deliver', label: 'DELIVER', icon: '✅', roles: ['admin', 'pm', 'translator'] },
          { id: 'glossaries', label: 'GLOSSARIES', icon: '🌐', roles: ['admin', 'pm', 'translator'] },
          { id: 'instructions', label: 'INSTRUCTIONS', icon: '📋', roles: ['admin', 'pm', 'translator'] }
        ].filter(tab => tab.roles.includes(user?.role || 'translator')).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium rounded-t relative ${
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
          {/* Assigned Projects Section - For Translators */}
          {user?.role === 'translator' && (
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-teal-800 mb-3">📋 Meus Projetos Atribuídos</h3>
              {loadingAssigned ? (
                <div className="text-center py-4 text-gray-500 text-sm">Carregando projetos...</div>
              ) : assignedOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assignedOrders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => selectProject(order)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${
                        selectedOrderId === order.id
                          ? 'bg-teal-100 border-teal-500 shadow-md'
                          : 'bg-white border-gray-200 hover:border-teal-400 hover:shadow'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-teal-700 text-sm">{order.order_number}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          order.translation_status === 'received' ? 'bg-yellow-100 text-yellow-700' :
                          order.translation_status === 'in_translation' ? 'bg-blue-100 text-blue-700' :
                          order.translation_status === 'review' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.translation_status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {order.translate_from} → {order.translate_to}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.document_type || 'Document'} • {order.page_count || 1} página(s)
                      </div>
                      {order.deadline && (
                        <div className="text-[10px] text-orange-600 mt-1">
                          ⏰ Prazo: {new Date(order.deadline).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      {selectedOrderId === order.id && (
                        <div className="mt-2 text-[10px] text-teal-600 font-medium">✓ Projeto selecionado</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm">Nenhum projeto atribuído ainda</p>
                  <p className="text-xs mt-1">Aguarde a atribuição de projetos pelo PM</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Start Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-xs text-blue-700">
              <strong>Quick Start:</strong> 1️⃣ Setup Cover Letter → 2️⃣ Upload Document → 3️⃣ Review → 4️⃣ Deliver
            </p>
          </div>

          {/* Translation Direction */}
          <div className="bg-white rounded shadow p-4">
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

          {/* Document Type - Expandable */}
          <div className="bg-white rounded shadow">
            <details className="group" open>
              <summary className="p-3 cursor-pointer flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📁</span>
                  <span className="text-sm font-bold">Document Type</span>
                  {documentType && <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{documentType}</span>}
                </div>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 pt-0 border-t">
                {/* Document Category Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <button
                    onClick={() => setDocumentCategory('financial')}
                    className={`px-3 py-2 text-xs rounded-lg transition-all ${documentCategory === 'financial' ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-purple-100 border'}`}
                  >
                    📊 Financial
                  </button>
                  <button
                    onClick={() => setDocumentCategory('education')}
                    className={`px-3 py-2 text-xs rounded-lg transition-all ${documentCategory === 'education' ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-purple-100 border'}`}
                  >
                    🎓 Education
                  </button>
                  <button
                    onClick={() => setDocumentCategory('general')}
                    className={`px-3 py-2 text-xs rounded-lg transition-all ${documentCategory === 'general' ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-purple-100 border'}`}
                  >
                    📄 General
                  </button>
                  <button
                    onClick={() => setDocumentCategory('personal')}
                    className={`px-3 py-2 text-xs rounded-lg transition-all ${documentCategory === 'personal' ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-purple-100 border'}`}
                  >
                    👤 Personal
                  </button>
                </div>
                {/* Document Type Input */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Document Type:</label>
                  <input
                    type="text"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    placeholder="e.g., Bank Statement, Birth Certificate, Diploma..."
                    className="w-full px-3 py-2 text-sm border rounded"
                  />
                </div>
              </div>
            </details>
          </div>

          {/* Page Format Section - Moved up before Logos */}
          <div className="bg-white rounded shadow p-4">
            <h3 className="text-xs font-bold text-gray-700 mb-3">📄 Page Format</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Page Size</label>
                <select value={pageFormat} onChange={(e) => savePageFormat(e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded">
                  <option value="letter">Letter (8.5" x 11") - US Standard</option>
                  <option value="a4">A4 (210mm x 297mm) - International</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Translation Type</label>
                <select value={translationType} onChange={(e) => saveTranslationType(e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded">
                  <option value="certified">Certified Translation</option>
                  <option value="sworn">Sworn Translation</option>
                </select>
              </div>
            </div>
          </div>

          {/* Translator's Note for Financial Documents */}
          <div className="bg-white rounded shadow">
            <button
              onClick={() => setTranslatorNoteEnabled(!translatorNoteEnabled)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">💱</span>
                <div>
                  <span className="text-sm font-medium">Translator's Note (Financial Documents)</span>
                  <p className="text-[10px] text-gray-500">Currency conversion for bank statements, tax returns</p>
                </div>
                {translatorNoteEnabled && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">✓ Active</span>}
              </div>
              <span className="text-gray-400">{translatorNoteEnabled ? '▼' : '▶'}</span>
            </button>

            {translatorNoteEnabled && (
              <div className="p-4 border-t space-y-4">
                {/* Currency Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Source Currency (Document)</label>
                    <select
                      value={translatorNoteSettings.sourceCurrency}
                      onChange={(e) => setTranslatorNoteSettings({...translatorNoteSettings, sourceCurrency: e.target.value, exchangeRate: ''})}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                      {Object.entries(CURRENCIES).map(([code, curr]) => (
                        <option key={code} value={code}>{curr.flag} {code} - {curr.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Target Currency (Translation)</label>
                    <select
                      value={translatorNoteSettings.targetCurrency}
                      onChange={(e) => setTranslatorNoteSettings({...translatorNoteSettings, targetCurrency: e.target.value, exchangeRate: ''})}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                      {Object.entries(CURRENCIES).map(([code, curr]) => (
                        <option key={code} value={code}>{curr.flag} {code} - {curr.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Exchange Rate */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      1 {translatorNoteSettings.targetCurrency} ({CURRENCIES[translatorNoteSettings.targetCurrency]?.symbol}) = _____ {translatorNoteSettings.sourceCurrency} ({CURRENCIES[translatorNoteSettings.sourceCurrency]?.symbol})
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={translatorNoteSettings.exchangeRate}
                        onChange={(e) => setTranslatorNoteSettings({...translatorNoteSettings, exchangeRate: e.target.value})}
                        placeholder="Ex: 5.1234"
                        className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        onClick={fetchExchangeRate}
                        disabled={fetchingRate}
                        className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
                      >
                        {fetchingRate ? '⏳' : '🔄'} Fetch Rate
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rate Date</label>
                    <input
                      type="date"
                      value={translatorNoteSettings.rateDate}
                      onChange={(e) => setTranslatorNoteSettings({...translatorNoteSettings, rateDate: e.target.value})}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Rate Source */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rate Source (for citation)</label>
                  <select
                    value={translatorNoteSettings.rateSource}
                    onChange={(e) => setTranslatorNoteSettings({...translatorNoteSettings, rateSource: e.target.value})}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    {RATE_SOURCES.map(source => (
                      <option key={source.id} value={source.id}>{source.name} - {source.url}</option>
                    ))}
                  </select>
                </div>

                {/* Convert Values Toggle */}
                <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="convertValues"
                    checked={translatorNoteSettings.convertValues}
                    onChange={(e) => setTranslatorNoteSettings({...translatorNoteSettings, convertValues: e.target.checked})}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <label htmlFor="convertValues" className="text-xs text-yellow-800">
                    <strong>Convert main values in document</strong> (totals, subtotals, balances, loans, credits)
                    <br />
                    <span className="text-yellow-600">Format: 3,113,492.10 [<strong>CA$807,126.92</strong>]</span>
                  </label>
                </div>

                {/* Preview Note */}
                {translatorNoteSettings.exchangeRate && (
                  <div className="p-3 bg-gray-50 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">📝 Preview Translator's Note:</span>
                      <button
                        onClick={() => {
                          const note = generateTranslatorNote();
                          navigator.clipboard.writeText(note);
                          alert('Note copied to clipboard!');
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-600 italic leading-relaxed">
                      {generateTranslatorNote()}
                    </p>

                    {/* Example Conversion */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-[10px] font-medium text-gray-500">Example Conversion:</span>
                      <div className="mt-1 text-sm">
                        <span className="text-gray-700">{CURRENCIES[translatorNoteSettings.sourceCurrency].symbol}1,000.00 </span>
                        <span dangerouslySetInnerHTML={{ __html: convertCurrencyValue(1000 * parseFloat(translatorNoteSettings.exchangeRate || 1)) }} className="text-green-700" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Info */}
                <div className="text-[10px] text-gray-500 bg-blue-50 p-2 rounded">
                  <strong>💡 How it works:</strong> When enabled, the translator's note will be added at the beginning of the FIRST PAGE of EACH FILE (if multiple files).
                  If "Convert values" is checked, main financial values will show converted amounts in brackets.
                  <br/><strong>Note:</strong> The preview above auto-updates when you change currency, date, or source.
                </div>
              </div>
            )}
          </div>

          {/* Certificate Preview - LIVE with Editable Fields */}
          <div className="bg-white rounded shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-blue-700">📄 Certificate Preview (Live)</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded">
                  Template: {selectedCertificateTemplate.startsWith('custom-')
                    ? customCertificateTemplates.find(t => `custom-${t.id}` === selectedCertificateTemplate)?.name || 'Custom'
                    : CERTIFICATE_TEMPLATES[selectedCertificateTemplate]?.name || 'Default'}
                </span>
                <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded">🔄 Edit highlighted fields directly</span>
              </div>
            </div>

            {/* Check if selected template is a form type */}
            {CERTIFICATE_TEMPLATES[selectedCertificateTemplate]?.isForm ? (
              /* Render Form Template (like RMV Foreign DL) */
              <div
                className="border rounded bg-white overflow-auto"
                style={{maxHeight: '800px'}}
                dangerouslySetInnerHTML={{ __html: CERTIFICATE_TEMPLATES[selectedCertificateTemplate].formHTML }}
              />
            ) : (
              /* Render Standard Certificate Template */
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

                {/* Body paragraphs - Dynamic based on selected template */}
                {(() => {
                  // Get the template paragraphs
                  let templateParagraphs;
                  if (selectedCertificateTemplate.startsWith('custom-')) {
                    const customTemplate = customCertificateTemplates.find(t => `custom-${t.id}` === selectedCertificateTemplate);
                    templateParagraphs = customTemplate?.bodyParagraphs || CERTIFICATE_TEMPLATES['default'].bodyParagraphs;
                  } else {
                    templateParagraphs = CERTIFICATE_TEMPLATES[selectedCertificateTemplate]?.bodyParagraphs || CERTIFICATE_TEMPLATES['default'].bodyParagraphs;
                  }

                  // Replace placeholders with actual values
                  return templateParagraphs.map((paragraph, index) => {
                    const processedParagraph = paragraph
                      .replace(/\{\{sourceLanguage\}\}/g, sourceLanguage)
                      .replace(/\{\{targetLanguage\}\}/g, targetLanguage);

                    return (
                      <p
                        key={index}
                        className={`${index === templateParagraphs.length - 1 ? 'mb-6' : 'mb-4'} text-justify text-xs leading-relaxed`}
                        dangerouslySetInnerHTML={{ __html: processedParagraph }}
                      />
                    );
                  });
                })()}

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
            )}
          </div>

          {/* Certificate Logos Section - Admin Only */}
          {isAdmin && (
          <div className="bg-white rounded shadow p-4">
            <h3 className="text-xs font-bold text-gray-700 mb-3">🖼️ Certificate Logos & Signature</h3>

            {/* Header Info Section */}
            <div className="mb-4 p-3 bg-gray-50 rounded border">
              <h4 className="text-[10px] font-bold text-gray-600 mb-2">📝 Certificate Header Info</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">Company Name</label>
                  <input
                    type="text"
                    value={certCompanyName}
                    onChange={(e) => {
                      setCertCompanyName(e.target.value);
                      localStorage.setItem('cert_company_name', e.target.value);
                    }}
                    className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="Legacy Translations, LLC"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">Address</label>
                  <input
                    type="text"
                    value={certCompanyAddress}
                    onChange={(e) => {
                      setCertCompanyAddress(e.target.value);
                      localStorage.setItem('cert_company_address', e.target.value);
                    }}
                    className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="123 Business St, Suite 100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">Phone</label>
                  <input
                    type="text"
                    value={certCompanyPhone}
                    onChange={(e) => {
                      setCertCompanyPhone(e.target.value);
                      localStorage.setItem('cert_company_phone', e.target.value);
                    }}
                    className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">Email</label>
                  <input
                    type="text"
                    value={certCompanyEmail}
                    onChange={(e) => {
                      setCertCompanyEmail(e.target.value);
                      localStorage.setItem('cert_company_email', e.target.value);
                    }}
                    className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="contact@legacytranslations.com"
                  />
                </div>
              </div>
            </div>

            {/* Logos Grid - Made smaller */}
            <div className="grid grid-cols-4 gap-2">
              {/* Left Logo (Legacy/Partner) */}
              <div className="text-center">
                <label className="block text-[10px] font-medium text-gray-700 mb-1">Left Logo</label>
                <div className="border-2 border-dashed border-gray-300 rounded p-1 bg-white h-14 flex items-center justify-center">
                  {logoLeft ? (
                    <img src={logoLeft} alt="Left Logo" className="max-h-10 max-w-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-gray-400">No logo</span>
                  )}
                </div>
                <input ref={logoLeftInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'left')} className="hidden" />
                <div className="flex justify-center gap-1 mt-1">
                  {user?.role === 'admin' && <button onClick={() => logoLeftInputRef.current?.click()} className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] rounded hover:bg-blue-600">Upload</button>}
                  {user?.role === 'admin' && logoLeft && <button onClick={() => saveAssetToBackend('logo_left', logoLeft)} className="px-1.5 py-0.5 bg-green-500 text-white text-[9px] rounded hover:bg-green-600">Salvar</button>}
                  {user?.role === 'admin' && logoLeft && <button onClick={() => removeLogo('left')} className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded hover:bg-red-600">🗑️</button>}
                </div>
              </div>

              {/* Center Logo (ATA) */}
              <div className="text-center">
                <label className="block text-[10px] font-medium text-gray-700 mb-1">Center Logo</label>
                <div className="border-2 border-dashed border-gray-300 rounded p-1 bg-white h-14 flex items-center justify-center">
                  {logoRight ? (
                    <img src={logoRight} alt="ATA Logo" className="max-h-10 max-w-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-gray-400">No logo</span>
                  )}
                </div>
                <input ref={logoRightInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'right')} className="hidden" />
                <div className="flex justify-center gap-1 mt-1">
                  {user?.role === 'admin' && <button onClick={() => logoRightInputRef.current?.click()} className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] rounded hover:bg-blue-600">Upload</button>}
                  {user?.role === 'admin' && logoRight && <button onClick={() => saveAssetToBackend('logo_right', logoRight)} className="px-1.5 py-0.5 bg-green-500 text-white text-[9px] rounded hover:bg-green-600">Salvar</button>}
                  {user?.role === 'admin' && logoRight && <button onClick={() => removeLogo('right')} className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded hover:bg-red-600">🗑️</button>}
                </div>
              </div>

              {/* Stamp Logo */}
              <div className="text-center">
                <label className="block text-[10px] font-medium text-gray-700 mb-1">Stamp</label>
                <div className="border-2 border-dashed border-gray-300 rounded p-1 bg-white h-14 flex items-center justify-center">
                  {logoStamp ? (
                    <img src={logoStamp} alt="Stamp Logo" className="max-h-10 max-w-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-gray-400">No stamp</span>
                  )}
                </div>
                <input ref={logoStampInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'stamp')} className="hidden" />
                <div className="flex justify-center gap-1 mt-1">
                  {user?.role === 'admin' && <button onClick={() => logoStampInputRef.current?.click()} className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] rounded hover:bg-blue-600">Upload</button>}
                  {user?.role === 'admin' && logoStamp && <button onClick={() => saveAssetToBackend('logo_stamp', logoStamp)} className="px-1.5 py-0.5 bg-green-500 text-white text-[9px] rounded hover:bg-green-600">Salvar</button>}
                  {user?.role === 'admin' && logoStamp && <button onClick={() => removeLogo('stamp')} className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded hover:bg-red-600">🗑️</button>}
                </div>
              </div>

              {/* Signature Image */}
              <div className="text-center">
                <label className="block text-[10px] font-medium text-gray-700 mb-1">Signature</label>
                <div className="border-2 border-dashed border-gray-300 rounded p-1 bg-white h-14 flex items-center justify-center">
                  {signatureImage ? (
                    <img src={signatureImage} alt="Signature" className="max-h-10 max-w-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-gray-400">No signature</span>
                  )}
                </div>
                <input ref={signatureInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'signature')} className="hidden" />
                <div className="flex justify-center gap-1 mt-1">
                  {user?.role === 'admin' && <button onClick={() => signatureInputRef.current?.click()} className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] rounded hover:bg-blue-600">Upload</button>}
                  {user?.role === 'admin' && signatureImage && <button onClick={() => saveAssetToBackend('signature_image', signatureImage)} className="px-1.5 py-0.5 bg-green-500 text-white text-[9px] rounded hover:bg-green-600">Salvar</button>}
                  {user?.role === 'admin' && signatureImage && <button onClick={() => removeLogo('signature')} className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded hover:bg-red-600">🗑️</button>}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Certificate Template Selector - Organized by Category */}
          <div className="bg-white rounded shadow p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold">📜 Certificate Template</h3>
              <button
                onClick={() => {
                  const name = prompt('Template name:');
                  if (name) {
                    const templateText = prompt('Certificate paragraphs (use {{sourceLanguage}}, {{targetLanguage}}). Separate with ||:');
                    if (templateText) {
                      const paragraphs = templateText.split('||').map(p => p.trim()).filter(p => p);
                      if (paragraphs.length > 0) {
                        const newTemplate = { id: Date.now(), name, description: 'Custom', bodyParagraphs: paragraphs };
                        const updated = [...customCertificateTemplates, newTemplate];
                        setCustomCertificateTemplates(updated);
                        localStorage.setItem('custom_certificate_templates', JSON.stringify(updated));
                        setSelectedCertificateTemplate(`custom-${newTemplate.id}`);
                        localStorage.setItem('selected_certificate_template', `custom-${newTemplate.id}`);
                      }
                    }
                  }
                }}
                className="text-[10px] px-2 py-1 rounded border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50"
              >
                + Custom
              </button>
            </div>

            {/* Templates by Category */}
            <div className="space-y-2">
              {Object.entries(TEMPLATE_CATEGORIES).map(([catKey, category]) => {
                const templatesInCategory = Object.entries(CERTIFICATE_TEMPLATES).filter(([_, t]) => t.category === catKey);
                if (templatesInCategory.length === 0) return null;
                return (
                  <div key={catKey} className="border rounded p-2">
                    <div className="text-[10px] font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                      <span className="text-[9px] text-gray-400 font-normal">({templatesInCategory.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {templatesInCategory.map(([key, template]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedCertificateTemplate(key);
                            localStorage.setItem('selected_certificate_template', key);
                          }}
                          className={`px-2 py-1 text-[9px] rounded transition-all ${selectedCertificateTemplate === key
                            ? 'bg-blue-500 text-white font-medium'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                          title={template.description}
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Custom Templates */}
              {customCertificateTemplates.length > 0 && (
                <div className="border rounded p-2 border-dashed">
                  <div className="text-[10px] font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                    <span>⭐</span>
                    <span>Custom Templates</span>
                    <span className="text-[9px] text-gray-400 font-normal">({customCertificateTemplates.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {customCertificateTemplates.map(tpl => (
                      <div key={tpl.id} className="flex items-center">
                        <button
                          onClick={() => {
                            setSelectedCertificateTemplate(`custom-${tpl.id}`);
                            localStorage.setItem('selected_certificate_template', `custom-${tpl.id}`);
                          }}
                          className={`px-2 py-1 text-[9px] rounded-l transition-all ${selectedCertificateTemplate === `custom-${tpl.id}`
                            ? 'bg-blue-500 text-white font-medium'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {tpl.name}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${tpl.name}"?`)) {
                              const updated = customCertificateTemplates.filter(t => t.id !== tpl.id);
                              setCustomCertificateTemplates(updated);
                              localStorage.setItem('custom_certificate_templates', JSON.stringify(updated));
                              if (selectedCertificateTemplate === `custom-${tpl.id}`) {
                                setSelectedCertificateTemplate('default');
                                localStorage.setItem('selected_certificate_template', 'default');
                              }
                            }
                          }}
                          className="px-1 py-1 text-[9px] bg-red-100 text-red-600 rounded-r hover:bg-red-200"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

          {/* Project Documents Section - Select to Load */}
          {selectedOrderId && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start gap-4">
                {/* Left side - Files */}
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-blue-800 mb-3">📁 Documentos do Projeto - Clique para Carregar</h3>

                  {loadingProjectFiles ? (
                    <div className="text-sm text-gray-500 text-center py-4">Carregando arquivos...</div>
                  ) : selectedProjectFiles.length > 0 ? (
                    <>
                      <div className="space-y-2">
                        {selectedProjectFiles.map((doc, idx) => (
                          <div
                            key={doc.id}
                            className={`p-3 rounded-lg transition-all ${
                              selectedFileId === doc.id
                                ? 'bg-green-100 border-2 border-green-500 shadow-md'
                                : 'bg-white border border-gray-200 hover:bg-blue-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* File Icon and Info - Clickable to load */}
                              <div
                                onClick={() => loadProjectFile(doc)}
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                                  selectedFileId === doc.id ? 'bg-green-500 text-white' : 'bg-gray-100'
                                }`}>
                                  {doc.filename?.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-medium truncate ${
                                    selectedFileId === doc.id ? 'text-green-700' : 'text-gray-700'
                                  }`}>
                                    {doc.filename || `Arquivo ${idx + 1}`}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {selectedFileId === doc.id ? '✓ Carregado - Pronto para traduzir' : 'Clique para carregar'}
                                  </div>
                                </div>
                                {selectedFileId === doc.id && (
                                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                                    ✓
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-1">
                                {/* Download Button */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const response = await axios.get(`${API}/admin/order-documents/${doc.id}/download?admin_key=${adminKey}`);
                                      if (response.data.file_data) {
                                        const link = document.createElement('a');
                                        link.href = `data:${response.data.content_type || 'application/pdf'};base64,${response.data.file_data}`;
                                        link.download = doc.filename || 'document.pdf';
                                        link.click();
                                      }
                                    } catch (err) {
                                      alert('Erro ao baixar arquivo');
                                    }
                                  }}
                                  className="px-2 py-1.5 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200 transition-colors"
                                  title="Download"
                                >
                                  ⬇️
                                </button>

                                {/* Replace Button - File input */}
                                <label
                                  className="px-2 py-1.5 bg-orange-100 text-orange-600 rounded text-xs hover:bg-orange-200 transition-colors cursor-pointer"
                                  title="Substituir arquivo"
                                >
                                  🔄
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*,.pdf"
                                    onChange={async (e) => {
                                      const file = e.target.files[0];
                                      if (!file) return;
                                      try {
                                        const reader = new FileReader();
                                        reader.onload = async () => {
                                          const base64 = reader.result.split(',')[1];
                                          await axios.put(`${API}/admin/order-documents/${doc.id}?admin_key=${adminKey}`, {
                                            filename: file.name,
                                            file_data: base64,
                                            content_type: file.type
                                          });
                                          // Refresh files
                                          const response = await axios.get(`${API}/admin/orders/${selectedOrderId}/documents?admin_key=${adminKey}`);
                                          setSelectedProjectFiles(response.data.documents || []);
                                          setProcessingStatus(`✅ Arquivo substituído: ${file.name}`);
                                        };
                                        reader.readAsDataURL(file);
                                      } catch (err) {
                                        alert('Erro ao substituir arquivo');
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {originalImages.length > 0 && (
                        <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-sm text-green-700">
                          ✅ Documento carregado: {originalImages[0]?.filename || 'Pronto'} ({originalImages.length} página{originalImages.length > 1 ? 's' : ''})
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 mb-3">Nenhum documento encontrado neste projeto</p>
                      <button
                        onClick={() => setActiveSubTab('start')}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Fazer Upload na aba START
                      </button>
                    </div>
                  )}
                </div>

                {/* Right side - Field Selector */}
                <div className="w-48 flex-shrink-0">
                  <label className="block text-xs font-bold text-blue-800 mb-2">📂 Field</label>
                  <select
                    value={documentCategory}
                    onChange={(e) => setDocumentCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="financial">📊 Financial</option>
                    <option value="education">🎓 Education</option>
                    <option value="general">📄 General</option>
                    <option value="personal">👤 Personal</option>
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">Auto-selected from document type</p>
                </div>
              </div>
            </div>
          )}

          {/* Hint when no project selected */}
          {!selectedOrderId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm text-yellow-800 font-medium">Selecione um projeto primeiro</p>
              <p className="text-xs text-yellow-600 mt-1">Vá para a aba START e selecione um projeto para carregar os documentos</p>
              <button
                onClick={() => setActiveSubTab('start')}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                Ir para START
              </button>
            </div>
          )}

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
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs text-green-700 font-medium">✅ Translation complete!</p>
                    <button
                      onClick={() => setActiveSubTab('review')}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Go to Review →
                    </button>
                  </div>

                  {/* Download Options */}
                  <div className="flex gap-2 pt-2 border-t border-green-200">
                    <button
                      onClick={() => {
                        // Download Original
                        originalImages.forEach((img, idx) => {
                          const link = document.createElement('a');
                          link.href = img.data;
                          link.download = `original_${idx + 1}_${img.filename || 'document'}`;
                          link.click();
                        });
                      }}
                      className="flex-1 px-3 py-2 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200 flex items-center justify-center gap-1"
                    >
                      📄 Download Original ({originalImages.length})
                    </button>
                    <button
                      onClick={() => {
                        // Download Translation as HTML
                        const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Translation - ${documentType || 'Document'}</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px;line-height:1.8;}</style></head>
<body>${translationResults.map((r, i) => `<div style="margin-bottom:30px;"><h3>Page ${i + 1}</h3>${r.translatedText}</div>`).join('')}</body></html>`;
                        const blob = new Blob([htmlContent], { type: 'text/html' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `translation_${orderNumber || 'document'}.html`;
                        link.click();
                      }}
                      className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 flex items-center justify-center gap-1"
                    >
                      🌐 Download Translation (HTML)
                    </button>
                    <button
                      onClick={() => {
                        // Download Translation as TXT
                        const extractText = (html) => {
                          const temp = document.createElement('div');
                          temp.innerHTML = html;
                          return temp.textContent || temp.innerText || '';
                        };
                        const txtContent = translationResults.map((r, i) =>
                          `=== PAGE ${i + 1} ===\n\n${extractText(r.translatedText)}\n\n`
                        ).join('');
                        const blob = new Blob([txtContent], { type: 'text/plain' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `translation_${orderNumber || 'document'}.txt`;
                        link.click();
                      }}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 flex items-center justify-center gap-1"
                    >
                      📝 Download Translation (TXT)
                    </button>
                  </div>
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
                        <p className="text-[10px] text-gray-500 mt-1">Image or PDF (auto-converted)</p>
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
                      accept=".docx,.doc,.html,.htm,.txt,.pdf,image/*"
                      onChange={handleExternalTranslationUpload}
                      className="hidden"
                    />
                    {externalTranslationText || externalTranslationImages.length > 0 ? (
                      <div>
                        <div className="text-3xl mb-2">✅</div>
                        <p className="text-xs text-green-700 font-medium">
                          {externalTranslationText ? 'Text uploaded' : `${externalTranslationImages.length} file(s) uploaded`}
                        </p>
                        {/* Show translation image previews */}
                        {externalTranslationImages.length > 0 && (
                          <div className="mt-2 max-h-32 overflow-auto">
                            {externalTranslationImages.map((img, idx) => (
                              <img key={idx} src={img.data} alt={img.filename} className="max-h-24 mx-auto mb-1 border rounded" />
                            ))}
                          </div>
                        )}
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
                        <p className="text-[10px] text-gray-500 mt-1">Word, PDF, HTML, TXT, or Image</p>
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

      {/* AI PIPELINE TAB */}
      {activeSubTab === 'ai-pipeline' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-4">🤖 AI Translation Pipeline</h2>

          {!selectedOrderId ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-3">📋</div>
              <p>Please select an order from the START tab first</p>
              <button
                onClick={() => setActiveSubTab('start')}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Go to START
              </button>
            </div>
          ) : (
            <>
              {/* Project Files Section - Load documents here */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-xs font-bold text-blue-800 mb-3">📁 Project Documents - Select to Load</h3>

                {loadingProjectFiles ? (
                  <div className="text-sm text-gray-500 text-center py-4">Loading files...</div>
                ) : selectedProjectFiles.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedProjectFiles.map((doc, idx) => (
                      <div
                        key={doc.id}
                        onClick={() => loadProjectFile(doc)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          selectedFileId === doc.id
                            ? 'bg-green-100 border-2 border-green-500 shadow-md'
                            : 'bg-white border border-gray-200 hover:bg-blue-100 hover:border-blue-400 hover:shadow'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                          selectedFileId === doc.id ? 'bg-green-500 text-white' : 'bg-gray-100'
                        }`}>
                          {doc.filename?.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${
                            selectedFileId === doc.id ? 'text-green-700' : 'text-gray-700'
                          }`}>
                            {doc.filename || `File ${idx + 1}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            {selectedFileId === doc.id ? '✓ Loaded - Ready' : 'Click to load'}
                          </div>
                        </div>
                        {selectedFileId === doc.id && (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">No documents found in this project</p>
                    <button
                      onClick={() => setActiveSubTab('start')}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Upload Document in START tab
                    </button>
                  </div>
                )}

                {originalImages.length > 0 && (
                  <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-sm text-green-700">
                    ✅ Document loaded: {originalImages[0]?.filename || 'Ready'} ({originalImages.length} page{originalImages.length > 1 ? 's' : ''})
                  </div>
                )}
              </div>

              {/* Processing Status */}
              {processingStatus && (
                <div className={`mt-3 p-2 rounded text-xs ${
                  processingStatus.includes('❌') ? 'bg-red-100 text-red-700' :
                  processingStatus.includes('✅') ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {processingStatus}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* REVIEW TAB */}
      {activeSubTab === 'review' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-2">🔍 Proofreading & Review</h2>

          {/* ========== UPLOAD & PROOFREADING - ALWAYS VISIBLE AT TOP ========== */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-2 gap-4 mb-3">
              {/* Upload Translation */}
              <div>
                <label className="flex items-center justify-center px-4 py-2 bg-green-500 text-white text-sm rounded cursor-pointer hover:bg-green-600 transition">
                  📄 Upload Translation (Word/HTML/TXT)
                  <input
                    type="file"
                    accept=".docx,.doc,.html,.htm,.txt,.pdf,image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files);
                      if (files.length === 0) return;
                      setProcessingStatus('Processing uploaded translation...');
                      for (const file of files) {
                        const fileName = file.name.toLowerCase();
                        try {
                          if (fileName.endsWith('.docx')) {
                            const html = await convertWordToHtml(file);
                            setTranslationResults(prev => [...prev, { translatedText: html, originalText: '', filename: file.name }]);
                          } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
                            const html = await readHtmlFile(file);
                            setTranslationResults(prev => [...prev, { translatedText: html, originalText: '', filename: file.name }]);
                          } else if (fileName.endsWith('.txt')) {
                            const text = await readTxtFile(file);
                            const html = `<div style="white-space: pre-wrap; font-family: 'Times New Roman', serif; font-size: 12pt;">${text}</div>`;
                            setTranslationResults(prev => [...prev, { translatedText: html, originalText: '', filename: file.name }]);
                          } else if (fileName.endsWith('.pdf') || file.type.startsWith('image/')) {
                            const dataUrl = await new Promise((resolve) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result);
                              reader.readAsDataURL(file);
                            });
                            const html = `<div style="text-align:center;"><img src="${dataUrl}" style="max-width:100%; height:auto;" alt="${file.name}" /></div>`;
                            setTranslationResults(prev => [...prev, { translatedText: html, originalText: '', filename: file.name }]);
                          }
                        } catch (err) {
                          console.error('Upload error:', err);
                          setProcessingStatus(`⚠️ Error: ${file.name}`);
                        }
                      }
                      setProcessingStatus('✅ Translation uploaded!');
                      setTimeout(() => setProcessingStatus(''), 3000);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
                {translationResults.length > 0 && (
                  <p className="text-xs text-green-600 mt-1 text-center">✓ Translation loaded</p>
                )}
              </div>
              {/* Proofreading */}
              <div>
                <button
                  onClick={async () => {
                    if (!translationResults.length) {
                      alert('Please upload or translate a document first');
                      return;
                    }
                    setIsProofreading(true);
                    setProofreadingError('');
                    try {
                      const textToProofread = translationResults.map(r => r.translatedText).join('\n\n');
                      const response = await axios.post(`${API}/ai/proofread?admin_key=${adminKey}`, {
                        text: textToProofread,
                        source_language: sourceLanguage,
                        target_language: targetLanguage
                      });
                      setProofreadingResult(response.data);
                    } catch (err) {
                      setProofreadingError(err.response?.data?.detail || err.message);
                    } finally {
                      setIsProofreading(false);
                    }
                  }}
                  disabled={isProofreading || !translationResults.length}
                  className="w-full px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {isProofreading ? '⏳ Analyzing...' : '🔍 Run Proofreading'}
                </button>
              </div>
            </div>
            {/* Proofreading Results */}
            {proofreadingError && (
              <div className="p-2 bg-red-100 text-red-700 text-xs rounded mb-2">❌ {proofreadingError}</div>
            )}
            {proofreadingResult && (
              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                {/* Score and Summary */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      proofreadingResult.classificacao === 'APROVADO'
                        ? 'bg-green-500 text-white'
                        : proofreadingResult.classificacao === 'APROVADO_COM_OBSERVACOES'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      {proofreadingResult.classificacao === 'APROVADO' ? '✅ APROVADO' :
                       proofreadingResult.classificacao === 'APROVADO_COM_OBSERVACOES' ? '⚠️ COM OBSERVAÇÕES' :
                       '❌ REPROVADO'}
                    </span>
                    <span className="font-bold text-purple-700">Score: {proofreadingResult.pontuacao_final || proofreadingResult.score || 'N/A'}%</span>
                  </div>
                  {proofreadingResult.erros && proofreadingResult.erros.length > 0 && (
                    <button
                      onClick={applyAllProofreadingCorrections}
                      disabled={proofreadingResult.erros.every(e => e.applied)}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      ✅ Aplicar Todas Correções
                    </button>
                  )}
                </div>
                {proofreadingResult.resumo && (
                  <p className="text-xs text-gray-600 mb-2">📝 {proofreadingResult.resumo}</p>
                )}

                {/* Error Summary Counts */}
                {proofreadingResult.total_erros > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                      Total: <strong>{proofreadingResult.total_erros || 0}</strong>
                    </span>
                    {proofreadingResult.criticos > 0 && (
                      <span className="px-2 py-1 bg-red-200 text-red-700 rounded text-xs">
                        Críticos: <strong>{proofreadingResult.criticos}</strong>
                      </span>
                    )}
                    {proofreadingResult.altos > 0 && (
                      <span className="px-2 py-1 bg-orange-200 text-orange-700 rounded text-xs">
                        Altos: <strong>{proofreadingResult.altos}</strong>
                      </span>
                    )}
                    {proofreadingResult.medios > 0 && (
                      <span className="px-2 py-1 bg-yellow-200 text-yellow-700 rounded text-xs">
                        Médios: <strong>{proofreadingResult.medios}</strong>
                      </span>
                    )}
                    {proofreadingResult.baixos > 0 && (
                      <span className="px-2 py-1 bg-blue-200 text-blue-700 rounded text-xs">
                        Baixos: <strong>{proofreadingResult.baixos}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Suggestions Table */}
                {proofreadingResult.erros && proofreadingResult.erros.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-2 py-2 text-left font-medium text-gray-600">Severidade</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-600">Tipo</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-600">Encontrado</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-600">Sugestão</th>
                          <th className="px-2 py-2 text-center font-medium text-gray-600">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proofreadingResult.erros.map((erro, idx) => {
                          const severity = erro.severidade || erro.gravidade || 'MÉDIO';
                          const errorType = erro.tipo || 'Geral';
                          const foundText = erro.encontrado || erro.original || erro.traducao_errada || '';
                          const suggestionText = erro.sugestao || erro.correcao || '';
                          const explanation = erro.explicacao || erro.descricao || '';

                          return (
                            <tr key={idx} className={`border-t ${
                              erro.applied ? 'bg-green-50 opacity-60' :
                              severity === 'CRÍTICO' ? 'bg-red-50' :
                              severity === 'ALTO' ? 'bg-orange-50' :
                              severity === 'MÉDIO' ? 'bg-yellow-50' :
                              'bg-blue-50'
                            }`}>
                              <td className="px-2 py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  severity === 'CRÍTICO' ? 'bg-red-500 text-white' :
                                  severity === 'ALTO' ? 'bg-orange-500 text-white' :
                                  severity === 'MÉDIO' ? 'bg-yellow-500 text-white' :
                                  'bg-blue-500 text-white'
                                }`}>
                                  {severity}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-gray-700">{errorType}</td>
                              <td className="px-2 py-2 text-red-600 max-w-[150px] truncate" title={`${foundText}\n\n${explanation}`}>
                                {erro.applied ? <s>{foundText}</s> : foundText || '-'}
                              </td>
                              <td className="px-2 py-2 text-green-600 max-w-[150px] truncate" title={suggestionText}>
                                {suggestionText || '-'}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {erro.applied ? (
                                  <span className="text-green-600 text-[10px] font-medium">✓ Aplicado</span>
                                ) : foundText && suggestionText ? (
                                  <button
                                    onClick={() => applyProofreadingCorrection(erro, idx)}
                                    className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600"
                                  >
                                    Aplicar
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-[10px]">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* No Errors Message */}
                {(!proofreadingResult.erros || proofreadingResult.erros.length === 0) && proofreadingResult.pontuacao_final >= 85 && (
                  <div className="p-3 bg-green-100 border border-green-300 rounded text-center mt-2">
                    <span className="text-green-700 text-xs font-medium">
                      ✅ Nenhum erro encontrado na tradução!
                    </span>
                  </div>
                )}

                {/* Observations */}
                {proofreadingResult.observacoes && typeof proofreadingResult.observacoes === 'string' && (
                  <div className="p-2 bg-gray-100 border border-gray-200 rounded mt-2">
                    <p className="text-xs text-gray-600">💡 {proofreadingResult.observacoes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Processing Status - Important for user feedback */}
          {processingStatus && (
            <div className={`mb-3 p-3 rounded text-sm font-medium ${
              processingStatus.includes('❌') ? 'bg-red-100 text-red-700 border border-red-300' :
              processingStatus.includes('✅') ? 'bg-green-100 text-green-700 border border-green-300' :
              processingStatus.includes('Error') ? 'bg-red-100 text-red-700 border border-red-300' :
              'bg-blue-100 text-blue-700 border border-blue-300 animate-pulse'
            }`}>
              {processingStatus}
            </div>
          )}

          {/* Loading indicator when sending */}
          {sendingToProjects && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
              <span className="text-sm text-yellow-700">Processing... Please wait.</span>
            </div>
          )}

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
                    <button onMouseDown={(e) => { e.preventDefault(); execFormatCommand('decreaseFontSize'); }} className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-200" title="Decrease Font Size">A-</button>
                    <button onMouseDown={(e) => { e.preventDefault(); execFormatCommand('increaseFontSize'); }} className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-200" title="Increase Font Size">A+</button>
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
                <div className="flex gap-2">
                  {/* Upload external translation - for all users */}
                  <label className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 cursor-pointer flex items-center gap-2">
                    📄 Upload Translation
                    <input
                      type="file"
                      accept=".docx,.doc,.html,.htm,.txt,.pdf,image/*"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files);
                        if (files.length === 0) return;
                        setProcessingStatus('Processing uploaded translation...');

                        for (const file of files) {
                          const fileName = file.name.toLowerCase();
                          try {
                            if (fileName.endsWith('.docx')) {
                              const html = await convertWordToHtml(file);
                              setTranslationResults(prev => [...prev, { translatedText: html, originalText: '' }]);
                            } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
                              const html = await readHtmlFile(file);
                              setTranslationResults(prev => [...prev, { translatedText: html, originalText: '' }]);
                            } else if (fileName.endsWith('.txt')) {
                              const text = await readTxtFile(file);
                              const html = `<div style="white-space: pre-wrap; font-family: 'Times New Roman', serif;">${text}</div>`;
                              setTranslationResults(prev => [...prev, { translatedText: html, originalText: '' }]);
                            } else if (fileName.endsWith('.pdf')) {
                              const images = await convertPdfToImages(file, (page, total) => {
                                setProcessingStatus(`Converting PDF page ${page}/${total}`);
                              });
                              images.forEach(img => {
                                const imgHtml = `<div class="pdf-page"><img src="data:${img.type};base64,${img.data}" style="max-width:100%;" /></div>`;
                                setTranslationResults(prev => [...prev, { translatedText: imgHtml, originalText: '' }]);
                              });
                            } else if (file.type.startsWith('image/')) {
                              const base64 = await fileToBase64(file);
                              const imgHtml = `<div class="image-page"><img src="data:${file.type};base64,${base64}" style="max-width:100%;" /></div>`;
                              setTranslationResults(prev => [...prev, { translatedText: imgHtml, originalText: '' }]);
                            }
                          } catch (err) {
                            console.error('Upload error:', err);
                          }
                        }
                        setProcessingStatus('✅ Translation uploaded!');
                        setTimeout(() => setProcessingStatus(''), 3000);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* Save button for all users */}
                  <button
                    onClick={() => sendToProjects('save')}
                    disabled={sendingToProjects || translationResults.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
                  >
                    💾 Save Translation
                  </button>

                  {/* Next: Deliver - for translators */}
                  {!isAdmin && !isPM && (
                    <button
                      onClick={() => setActiveSubTab('deliver')}
                      disabled={translationResults.length === 0}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 disabled:bg-gray-300 flex items-center gap-2"
                    >
                      Next: Deliver →
                    </button>
                  )}

                </div>
              </div>
            </>
          ) : (
            <div className="py-4">
              {/* Show orders with saved translations */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-bold text-blue-800 mb-3">📋 Projetos com Tradução para Revisar</h3>
                <p className="text-xs text-gray-600 mb-3">Selecione um projeto para carregar a tradução salva:</p>

                {assignedOrders.filter(o => o.translation_ready || o.translation_html).length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {assignedOrders.filter(o => o.translation_ready || o.translation_html).map(order => (
                      <div
                        key={order.id}
                        onClick={async () => {
                          setSelectedOrderId(order.id);
                          setOrderNumber(order.order_number);
                          const loaded = await loadSavedTranslation(order);
                          if (loaded) {
                            setProcessingStatus(`✅ Tradução do projeto ${order.order_number} carregada!`);
                          }
                        }}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-400 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📝</span>
                          <div>
                            <div className="font-medium text-sm text-gray-800">{order.order_number}</div>
                            <div className="text-xs text-gray-500">{order.client_name || order.partner_name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-[10px] rounded-full ${
                            order.translation_status === 'review' ? 'bg-indigo-100 text-indigo-700' :
                            order.translation_status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {order.translation_status === 'review' ? 'Aguardando Review' :
                             order.translation_status === 'pending_review' ? 'Para Revisar' : 'Tradução Pronta'}
                          </span>
                          <span className="text-green-600">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">Nenhum projeto com tradução salva encontrado.</p>
                )}
              </div>

              {/* Alternative: go to translate */}
              <div className="text-center py-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-3">Ou comece uma nova tradução:</p>
                <button
                  onClick={() => setActiveSubTab('translate')}
                  className="px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Ir para Documento
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROOFREADING TAB - Admin and PM Only */}
      {activeSubTab === 'proofreading' && (isAdmin || isPM) && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold mb-4">🔍 Proofreading & Quality Assurance</h2>

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

              {/* Translation Preview */}
              <div className="mb-4 border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-100 border-b">
                  <span className="text-xs font-bold text-gray-700">📄 Translation to Review</span>
                </div>
                <div className="p-4 bg-white max-h-64 overflow-y-auto">
                  <div
                    className="text-xs"
                    dangerouslySetInnerHTML={{ __html: translationResults[selectedResultIndex]?.translatedText || '<p>No translation</p>' }}
                  />
                </div>
              </div>

              {/* Proofreading Controls */}
              <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                    🔎 AI Proofreading Analysis
                  </h3>
                  <button
                    onClick={runProofreading}
                    disabled={isProofreading || !translationResults[selectedResultIndex]?.translatedText}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isProofreading ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        🔎 Run Proofreading
                      </>
                    )}
                  </button>
                </div>

                {/* Error Display */}
                {proofreadingError && (
                  <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded text-xs text-red-700">
                    ❌ {proofreadingError}
                  </div>
                )}

                {/* Proofreading Results */}
                {proofreadingResult && (
                  <div className="space-y-3">
                    {/* Classification Badge */}
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                        proofreadingResult.classificacao === 'APROVADO'
                          ? 'bg-green-500 text-white'
                          : proofreadingResult.classificacao === 'APROVADO_COM_OBSERVACOES'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {proofreadingResult.classificacao === 'APROVADO' ? '✅ APROVADO' :
                         proofreadingResult.classificacao === 'APROVADO_COM_OBSERVACOES' ? '⚠️ APROVADO COM OBSERVAÇÕES' :
                         '❌ REPROVADO'}
                      </span>
                      <span className="text-xs text-gray-600">
                        Score: {proofreadingResult.pontuacao_final || proofreadingResult.score || 'N/A'}%
                      </span>
                    </div>

                    {/* Summary Counts */}
                    <div className="flex gap-4 text-xs">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Total: <strong>{proofreadingResult.total_erros || 0}</strong>
                      </span>
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                        Críticos: <strong>{proofreadingResult.criticos || 0}</strong>
                      </span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                        Altos: <strong>{proofreadingResult.altos || 0}</strong>
                      </span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                        Médios: <strong>{proofreadingResult.medios || 0}</strong>
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        Baixos: <strong>{proofreadingResult.baixos || 0}</strong>
                      </span>
                    </div>

                    {/* Errors Table */}
                    {proofreadingResult.erros && proofreadingResult.erros.length > 0 && (
                      <div>
                        {/* Apply All Button */}
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={applyAllProofreadingCorrections}
                            disabled={proofreadingResult.erros.every(e => e.applied)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            ✅ Apply All Corrections
                          </button>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-2 py-2 text-left font-medium text-gray-600">Severidade</th>
                                <th className="px-2 py-2 text-left font-medium text-gray-600">Tipo</th>
                                <th className="px-2 py-2 text-left font-medium text-gray-600">Original</th>
                                <th className="px-2 py-2 text-left font-medium text-gray-600">Encontrado</th>
                                <th className="px-2 py-2 text-left font-medium text-gray-600">Sugestão</th>
                                <th className="px-2 py-2 text-center font-medium text-gray-600">Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {proofreadingResult.erros.map((erro, idx) => {
                                // Handle both field name conventions
                                const severity = erro.severidade || erro.gravidade || 'MÉDIO';
                                const errorType = erro.tipo || 'Geral';
                                const originalText = erro.original || erro.traducao_errada || '';
                                const foundText = erro.encontrado || erro.original || erro.traducao_errada || '';
                                const suggestionText = erro.sugestao || erro.correcao || '';
                                const explanation = erro.explicacao || erro.descricao || '';

                                return (
                                  <tr key={idx} className={`border-t ${
                                    erro.applied ? 'bg-green-50 opacity-60' :
                                    severity === 'CRÍTICO' ? 'bg-red-50' :
                                    severity === 'ALTO' ? 'bg-orange-50' :
                                    severity === 'MÉDIO' ? 'bg-yellow-50' :
                                    'bg-blue-50'
                                  }`}>
                                    <td className="px-2 py-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        severity === 'CRÍTICO' ? 'bg-red-500 text-white' :
                                        severity === 'ALTO' ? 'bg-orange-500 text-white' :
                                        severity === 'MÉDIO' ? 'bg-yellow-500 text-white' :
                                        'bg-blue-500 text-white'
                                      }`}>
                                        {severity}
                                      </span>
                                    </td>
                                    <td className="px-2 py-2 text-gray-700">{errorType}</td>
                                    <td className="px-2 py-2 text-gray-600 max-w-[120px] truncate" title={originalText || explanation}>
                                      {originalText || explanation || '-'}
                                    </td>
                                    <td className="px-2 py-2 text-red-600 max-w-[120px] truncate" title={foundText}>
                                      {erro.applied ? <s>{foundText}</s> : foundText || '-'}
                                    </td>
                                    <td className="px-2 py-2 text-green-600 max-w-[120px] truncate" title={suggestionText}>
                                      {suggestionText || '-'}
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      {erro.applied ? (
                                        <span className="text-green-600 text-[10px] font-medium">✓ Aplicado</span>
                                      ) : foundText && suggestionText ? (
                                        <button
                                          onClick={() => applyProofreadingCorrection(erro, idx)}
                                          className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600"
                                        >
                                          Aplicar
                                        </button>
                                      ) : (
                                        <span className="text-gray-400 text-[10px]">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* No Errors Message */}
                    {(!proofreadingResult.erros || proofreadingResult.erros.length === 0) && (
                      <div className="p-4 bg-green-100 border border-green-300 rounded text-center">
                        <span className="text-green-700 text-sm font-medium">
                          ✅ Nenhum erro encontrado na tradução!
                        </span>
                      </div>
                    )}

                    {/* Observations */}
                    {proofreadingResult.observacoes && (
                      <div className="p-3 bg-gray-100 border border-gray-200 rounded">
                        <h4 className="text-xs font-medium text-gray-700 mb-1">📝 Observações:</h4>
                        <p className="text-xs text-gray-600">{proofreadingResult.observacoes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Instructions when no result */}
                {!proofreadingResult && !isProofreading && !proofreadingError && (
                  <p className="text-xs text-gray-500">
                    Clique em "Run Proofreading" para analisar a tradução e identificar erros.
                  </p>
                )}
              </div>

              {/* Approval Actions */}
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-bold text-gray-700 mb-3">📋 Approval Decision</h4>
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setActiveSubTab('review')}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 flex items-center"
                  >
                    <span className="mr-2">←</span> Back: Review
                  </button>
                  <div className="flex gap-3">
                    {/* Reject Button */}
                    <button
                      onClick={rejectTranslation}
                      disabled={sendingToProjects}
                      className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:bg-gray-300 flex items-center gap-2"
                    >
                      ❌ Reject
                    </button>

                    {/* Approve Button - Different behavior for PM vs Admin */}
                    <button
                      onClick={() => approveTranslation(false)}
                      disabled={sendingToProjects}
                      className={`px-6 py-2 text-white text-sm font-medium rounded disabled:bg-gray-300 flex items-center gap-2 ${
                        isPM && !isAdmin ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isPM && !isAdmin ? '📤 Send to Admin' : '✅ Approve'}
                    </button>

                    {/* Admin: Go directly to Deliver */}
                    {isAdmin && (
                      <button
                        onClick={() => setActiveSubTab('deliver')}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center gap-2"
                      >
                        📤 Go to Deliver
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                  {isPM && !isAdmin ? (
                    <>
                      📤 <strong>Send to Admin:</strong> Sends translation to Admin for final approval
                      <br/>
                      ❌ <strong>Reject:</strong> Returns translation to translator with feedback
                    </>
                  ) : (
                    <>
                      ✅ <strong>Approve:</strong> Marks translation as "Ready for Delivery"
                      <br/>
                      ❌ <strong>Reject:</strong> Returns translation to translator with feedback
                    </>
                  )}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-xs mb-4">Nenhuma tradução para revisar. Vá para a aba REVIEW para carregar uma tradução.</p>
              <button
                onClick={() => setActiveSubTab('review')}
                className="px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Ir para Review
              </button>
            </div>
          )}
        </div>
      )}

      {/* APPROVAL TAB - Admin, PM and Translator */}
      {activeSubTab === 'deliver' && (isAdmin || isPM || user?.role === 'translator') && (
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
                <p className="text-[10px] text-green-600 mb-3">Upload your translation document (recommended: Word .docx)</p>

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

                {/* Paste HTML/Text directly */}
                <div className="mt-3">
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">Or paste text/HTML directly:</label>
                  <textarea
                    placeholder="Paste your translation text or HTML here..."
                    className="w-full h-24 px-3 py-2 text-xs border border-green-200 rounded resize-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    onChange={(e) => {
                      const text = e.target.value;
                      if (text.trim()) {
                        // Check if it looks like HTML
                        const isHtml = text.includes('<') && text.includes('>');
                        const html = isHtml ? text : `<div style="white-space: pre-wrap; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6;">${text}</div>`;
                        setQuickTranslationHtml(html);
                        setQuickTranslationType('html');
                      }
                    }}
                    disabled={quickPackageLoading}
                  />
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
                    <p className="text-[10px] text-gray-500 mt-1">PDF or images (PDF auto-converted)</p>
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
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAuthenticityStatement}
                      onChange={(e) => setIncludeAuthenticityStatement(e.target.checked)}
                      className="mr-3 w-4 h-4"
                    />
                    <span>📋 Include Authenticity Statement (Atestado de Autenticidade)</span>
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
                  {includeAuthenticityStatement && (
                    <>
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">📋 Authenticity Statement</span>
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

              {/* Approval Checklist for Quick Package - Required before submitting */}
              <div className={`p-4 rounded mb-4 ${
                isApprovalComplete
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-purple-50 border-2 border-purple-300'
              }`}>
                <h3 className="text-sm font-bold text-purple-700 mb-1">
                  📋 Translation Checklist <span className="text-red-500">*</span>
                </h3>
                <p className="text-[10px] text-purple-600 mb-3">⚠️ Complete all items before submitting</p>
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
                    ⚠️ Complete all checklist items to enable submission
                  </p>
                )}
                {isApprovalComplete && (
                  <p className="text-[10px] text-green-600 mt-3 font-medium">
                    ✅ All checks completed - Ready to submit!
                  </p>
                )}
              </div>

              {/* Submit for Review - For All Roles */}
              <div className="p-4 bg-teal-50 border border-teal-200 rounded mb-4">
                <h3 className="text-sm font-bold text-teal-700 mb-2">
                  📤 {user?.role === 'translator' ? 'Submit for Review' : 'Submit & Notify Team'}
                </h3>
                <p className="text-[10px] text-teal-600 mb-3">
                  {user?.role === 'translator'
                    ? 'Send your translation to Admin/PM for review and approval'
                    : 'Link translation to order and notify team members'}
                </p>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Select Order *</label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                  >
                    <option value="">-- Select Order --</option>
                    {availableOrders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.order_number} - {order.client_name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => sendToProjects('review')}
                  disabled={!selectedOrderId || sendingToProjects || !isApprovalComplete || !documentType.trim() || (quickTranslationFiles.length === 0 && !quickTranslationHtml)}
                  className="w-full py-2 bg-teal-600 text-white text-sm font-bold rounded hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {sendingToProjects ? '⏳ Sending...' : (user?.role === 'translator' ? '📤 Submit for Admin/PM Review' : '📤 Submit & Notify Admin/PM')}
                </button>

                {(!documentType.trim() || (quickTranslationFiles.length === 0 && !quickTranslationHtml)) && (
                  <p className="text-[10px] text-orange-600 mt-2">
                    ⚠️ Fill document type and upload translation first
                  </p>
                )}
              </div>

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

              {/* Send options after package generation */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-bold text-gray-700 mb-3">📤 Submit Translation</h4>
                <div className="flex gap-3 items-center">
                  <select
                    value={sendDestination}
                    onChange={(e) => setSendDestination(e.target.value)}
                    className="flex-1 px-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={sendingToProjects}
                  >
                    <option value="pm">📤 Send to PM</option>
                    <option value="admin">📤 Send to Admin</option>
                  </select>
                  <button
                    onClick={() => sendToProjects(sendDestination)}
                    disabled={sendingToProjects || (quickTranslationFiles.length === 0 && !quickTranslationHtml)}
                    className={`px-6 py-3 text-white text-sm font-medium rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2 ${
                      sendDestination === 'pm' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {sendingToProjects ? '⏳ Sending...' : '📤 Send'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  Select destination and click Send
                </p>
              </div>
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
                  <label className="flex items-center text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!includeAuthenticityStatement}
                      onChange={(e) => setIncludeAuthenticityStatement(!e.target.checked)}
                      className="mr-3 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="font-medium">Exclude STATEMENT OF AUTHENTICITY</span>
                  </label>
                </div>
              </div>

              {/* Translation Memory Option */}
              <div className="p-4 bg-teal-50 border border-teal-200 rounded mb-4">
                <div className="flex items-center justify-between mb-3">
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
                  <span className="text-[10px] bg-teal-200 text-teal-800 px-2 py-0.5 rounded">
                    {glossaries.filter(g => g.name?.startsWith('TM -')).length} TMs saved
                  </span>
                </div>

                {/* View Saved TMs */}
                {glossaries.filter(g => g.name?.startsWith('TM -')).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-teal-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium text-teal-700">📚 Saved Translation Memories:</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            // Download all TMs as JSON
                            const tms = glossaries.filter(g => g.name?.startsWith('TM -'));
                            const blob = new Blob([JSON.stringify(tms, null, 2)], { type: 'application/json' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = `translation_memories_${new Date().toISOString().split('T')[0]}.json`;
                            link.click();
                          }}
                          className="px-2 py-1 text-[9px] bg-teal-600 text-white rounded hover:bg-teal-700"
                        >
                          📥 Export All (JSON)
                        </button>
                        <button
                          onClick={() => {
                            // Download all TMs as TMX
                            const tms = glossaries.filter(g => g.name?.startsWith('TM -'));
                            let tmxContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE tmx SYSTEM "tmx14.dtd">
<tmx version="1.4">
  <header creationtool="Legacy Translations TM" creationtoolversion="1.0" datatype="plaintext" segtype="sentence" adminlang="en-US" srclang="*all*"/>
  <body>
`;
                            tms.forEach(tm => {
                              (tm.terms || []).forEach(term => {
                                tmxContent += `    <tu>
      <tuv xml:lang="${tm.sourceLang || 'pt-BR'}">
        <seg>${term.source?.replace(/</g, '&lt;').replace(/>/g, '&gt;') || ''}</seg>
      </tuv>
      <tuv xml:lang="${tm.targetLang || 'en-US'}">
        <seg>${term.target?.replace(/</g, '&lt;').replace(/>/g, '&gt;') || ''}</seg>
      </tuv>
    </tu>
`;
                              });
                            });
                            tmxContent += `  </body>
</tmx>`;
                            const blob = new Blob([tmxContent], { type: 'application/xml' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = `translation_memories_${new Date().toISOString().split('T')[0]}.tmx`;
                            link.click();
                          }}
                          className="px-2 py-1 text-[9px] bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          📥 Export All (TMX)
                        </button>
                      </div>
                    </div>
                    <div className="max-h-32 overflow-auto space-y-1">
                      {glossaries.filter(g => g.name?.startsWith('TM -')).map((tm, idx) => (
                        <div key={tm.id || idx} className="flex items-center justify-between p-2 bg-white rounded border text-[10px]">
                          <div className="flex-1">
                            <span className="font-medium text-gray-700">{tm.name}</span>
                            <span className="text-gray-400 ml-2">({tm.terms?.length || 0} segments)</span>
                            <span className="text-gray-400 ml-1">{tm.sourceLang} → {tm.targetLang}</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                // Download single TM as JSON
                                const blob = new Blob([JSON.stringify(tm, null, 2)], { type: 'application/json' });
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = `${tm.name?.replace(/[^a-z0-9]/gi, '_') || 'tm'}.json`;
                                link.click();
                              }}
                              className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                              title="Download JSON"
                            >
                              📥
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete "${tm.name}"?`)) {
                                  const updated = glossaries.filter(g => g.id !== tm.id);
                                  setGlossaries(updated);
                                  localStorage.setItem('glossaries', JSON.stringify(updated));
                                }
                              }}
                              className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded hover:bg-red-200"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">Certificate</span>
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

                <div className="flex flex-col space-y-2">
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                  >
                    <option value="">-- Select Order --</option>
                    {availableOrders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.order_number} - {order.client_name} ({order.translation_status})
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-2">
                    {/* Translator: Submit for Review button */}
                    {user?.role === 'translator' ? (
                      <button
                        onClick={() => sendToProjects('review')}
                        disabled={!selectedOrderId || sendingToProjects || !isApprovalComplete || !documentType.trim()}
                        className="flex-1 px-4 py-2 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {sendingToProjects ? '⏳ Sending...' : '📤 Submit for Review (Admin/PM)'}
                      </button>
                    ) : (
                      <>
                        <select
                          value={sendDestination}
                          onChange={(e) => setSendDestination(e.target.value)}
                          className="px-2 py-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          disabled={sendingToProjects}
                        >
                          <option value="pm">Send to PM</option>
                          <option value="admin">Send to Admin</option>
                        </select>
                        <button
                          onClick={() => sendToProjects(sendDestination)}
                          disabled={!selectedOrderId || sendingToProjects || !isApprovalComplete || !documentType.trim()}
                          className={`flex-1 px-4 py-2 text-white text-xs rounded disabled:bg-gray-300 disabled:cursor-not-allowed ${
                            sendDestination === 'pm' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {sendingToProjects ? '⏳ Sending...' : '📤 Send'}
                        </button>
                      </>
                    )}
                  </div>
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

      {/* GLOSSARIES TAB */}
      {activeSubTab === 'glossaries' && (
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
              onClick={() => { setEditingGlossary(null); setGlossaryForm({ name: '', sourceLang: 'Portuguese (Brazil)', targetLang: 'English', bidirectional: true, field: 'All Fields', terms: [] }); setTermSearchQuery(''); setShowGlossaryModal(true); }}
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
      )}

      {/* INSTRUCTIONS TAB */}
      {activeSubTab === 'instructions' && (
        <div className="bg-white rounded shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">📋</span>
              <div>
                <h2 className="text-sm font-bold">Translation Instructions</h2>
                <p className="text-xs text-gray-500">Manage custom instructions for specific document types and language pairs</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingInstruction(null);
                setInstructionForm({
                  title: '',
                  sourceLang: 'Portuguese (Brazil)',
                  targetLang: 'English',
                  field: 'All Fields',
                  documentType: 'All Documents',
                  content: ''
                });
                setShowInstructionModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center"
            >
              <span className="mr-1">+</span> Add Instruction
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
                <option>Legal</option>
                <option>Medical</option>
                <option>Technical</option>
                <option>General</option>
                <option>Personal Documents</option>
              </select>
            </div>

            {/* Instructions List */}
            {instructions.filter(instr =>
              (resourcesFilter.language === 'All Languages' || instr.sourceLang === resourcesFilter.language || instr.targetLang === resourcesFilter.language) &&
              (resourcesFilter.field === 'All Fields' || instr.field === resourcesFilter.field)
            ).length > 0 ? (
              <div className="space-y-2">
                {instructions
                  .filter(instr =>
                    (resourcesFilter.language === 'All Languages' || instr.sourceLang === resourcesFilter.language || instr.targetLang === resourcesFilter.language) &&
                    (resourcesFilter.field === 'All Fields' || instr.field === resourcesFilter.field)
                  )
                  .map((instr) => (
                  <div key={instr.id} className="p-3 border rounded hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-800">{instr.title}</span>
                          {instr.isDefault && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">Default</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">
                            {instr.sourceLang || 'PT'} → {instr.targetLang || 'EN'}
                          </span>
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px]">{instr.field || 'General'}</span>
                          {instr.documentType && instr.documentType !== 'All Documents' && (
                            <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px]">{instr.documentType}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{instr.content}</p>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={() => {
                            setEditingInstruction(instr);
                            setInstructionForm({
                              title: instr.title,
                              sourceLang: instr.sourceLang || 'Portuguese (Brazil)',
                              targetLang: instr.targetLang || 'English',
                              field: instr.field || 'All Fields',
                              documentType: instr.documentType || 'All Documents',
                              content: instr.content
                            });
                            setShowInstructionModal(true);
                          }}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete instruction "${instr.title}"?`)) {
                              try {
                                await axios.delete(`${API}/admin/translation-instructions/${instr.id}?admin_key=${adminKey}`);
                                setInstructions(instructions.filter(i => i.id !== instr.id));
                              } catch (err) {
                                alert('Failed to delete instruction');
                              }
                            }
                          }}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm font-medium mb-1">No instructions yet</p>
                <p className="text-xs">Click "Add Instruction" to create custom translation guidelines.</p>
                <p className="text-xs text-gray-400 mt-2">Instructions help the AI follow specific rules for document types, terminology, and formatting.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instruction Modal - Outside all tabs so it's always available */}
      {showInstructionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="font-bold">{editingInstruction ? 'Edit' : 'Add'} Translation Instruction</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={instructionForm.title}
                  onChange={(e) => setInstructionForm({ ...instructionForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g., Birth Certificate Guidelines"
                />
              </div>

              {/* Language Pair */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Source Language</label>
                  <select
                    value={instructionForm.sourceLang}
                    onChange={(e) => setInstructionForm({ ...instructionForm, sourceLang: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  >
                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Target Language</label>
                  <select
                    value={instructionForm.targetLang}
                    onChange={(e) => setInstructionForm({ ...instructionForm, targetLang: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  >
                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>
              </div>

              {/* Field and Document Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Field</label>
                  <select
                    value={instructionForm.field}
                    onChange={(e) => setInstructionForm({ ...instructionForm, field: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  >
                    <option>All Fields</option>
                    <option>Financial</option>
                    <option>Education</option>
                    <option>Legal</option>
                    <option>Medical</option>
                    <option>Technical</option>
                    <option>General</option>
                    <option>Personal Documents</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Document Type</label>
                  <select
                    value={instructionForm.documentType}
                    onChange={(e) => setInstructionForm({ ...instructionForm, documentType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  >
                    <option>All Documents</option>
                    <option>Birth Certificate</option>
                    <option>Marriage Certificate</option>
                    <option>Death Certificate</option>
                    <option>Diploma</option>
                    <option>Academic Transcript</option>
                    <option>Driver's License</option>
                    <option>ID Card</option>
                    <option>Passport</option>
                    <option>Bank Statement</option>
                    <option>Tax Return</option>
                    <option>Contract</option>
                    <option>Power of Attorney</option>
                    <option>Court Document</option>
                    <option>Medical Record</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              {/* Instructions Content */}
              <div>
                <label className="block text-xs font-medium mb-1">Instructions *</label>
                <textarea
                  value={instructionForm.content}
                  onChange={(e) => setInstructionForm({ ...instructionForm, content: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg h-48 font-mono"
                  placeholder="Enter translation guidelines and instructions...

Examples:
- Always translate 'Certidão de Nascimento' as 'Birth Certificate'
- Keep original names in their original form
- Format dates as MM/DD/YYYY
- Use American English spelling
- Preserve all official stamps and seals descriptions"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  These instructions will be included in the AI prompt when translating matching documents.
                </p>
              </div>

              {/* Example Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-2">💡 Suggested Instructions:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Keep names in original form',
                    'Use formal register',
                    'Format dates as MM/DD/YYYY',
                    'American English spelling',
                    'Preserve formatting',
                    'Include [sic] for errors'
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInstructionForm({
                        ...instructionForm,
                        content: instructionForm.content + (instructionForm.content ? '\n- ' : '- ') + suggestion
                      })}
                      className="px-2 py-1 text-[10px] bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-100"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end space-x-2">
              <button
                onClick={() => setShowInstructionModal(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!instructionForm.title || !instructionForm.content) {
                    alert('Please fill in the title and instructions');
                    return;
                  }
                  try {
                    const payload = {
                      title: instructionForm.title,
                      sourceLang: instructionForm.sourceLang,
                      targetLang: instructionForm.targetLang,
                      field: instructionForm.field,
                      documentType: instructionForm.documentType,
                      content: instructionForm.content
                    };

                    if (editingInstruction) {
                      await axios.put(`${API}/admin/translation-instructions/${editingInstruction.id}?admin_key=${adminKey}`, payload);
                      setInstructions(instructions.map(i => i.id === editingInstruction.id ? { ...i, ...payload } : i));
                    } else {
                      const response = await axios.post(`${API}/admin/translation-instructions?admin_key=${adminKey}`, payload);
                      setInstructions([...instructions, { id: response.data.id || Date.now(), ...payload }]);
                    }
                    setShowInstructionModal(false);
                    setProcessingStatus('✅ Instruction saved!');
                    setTimeout(() => setProcessingStatus(''), 3000);
                  } catch (err) {
                    alert('Failed to save instruction: ' + (err.response?.data?.detail || err.message));
                  }
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Instruction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glossary Modal - Outside all tabs so it's always available */}
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

              {/* Terms List with Search */}
              {glossaryForm.terms.length > 0 && (
                <div className="border rounded">
                  {/* Header with count, search and actions */}
                  <div className="px-3 py-2 bg-gray-100 border-b">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-700">📚 {glossaryForm.terms.length} terms loaded</span>
                      <button
                        onClick={() => {
                          if (window.confirm('Clear all terms? This cannot be undone.')) {
                            setGlossaryForm({...glossaryForm, terms: []});
                            setTermSearchQuery('');
                          }
                        }}
                        className="px-2 py-1 text-[10px] text-red-600 bg-red-50 rounded hover:bg-red-100"
                      >
                        🗑️ Clear All
                      </button>
                    </div>
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={termSearchQuery}
                        onChange={(e) => setTermSearchQuery(e.target.value)}
                        placeholder="🔍 Search terms..."
                        className="w-full px-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      />
                      {termSearchQuery && (
                        <button
                          onClick={() => setTermSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {termSearchQuery && (
                      <p className="text-[10px] text-blue-600 mt-1">
                        Showing {glossaryForm.terms.filter(t =>
                          t.source.toLowerCase().includes(termSearchQuery.toLowerCase()) ||
                          t.target.toLowerCase().includes(termSearchQuery.toLowerCase()) ||
                          (t.notes && t.notes.toLowerCase().includes(termSearchQuery.toLowerCase()))
                        ).length} of {glossaryForm.terms.length} terms
                      </p>
                    )}
                  </div>

                  {/* Terms Table */}
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">{glossaryForm.sourceLang}</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">{glossaryForm.targetLang}</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Notes</th>
                          <th className="px-2 py-2 w-20 text-center font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {glossaryForm.terms
                          .map((term, originalIdx) => ({ term, originalIdx }))
                          .filter(({ term }) =>
                            !termSearchQuery ||
                            term.source.toLowerCase().includes(termSearchQuery.toLowerCase()) ||
                            term.target.toLowerCase().includes(termSearchQuery.toLowerCase()) ||
                            (term.notes && term.notes.toLowerCase().includes(termSearchQuery.toLowerCase()))
                          )
                          .map(({ term, originalIdx }) => (
                            <tr key={term.id} className="hover:bg-blue-50 group">
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={term.source}
                                  onChange={(e) => {
                                    const updated = [...glossaryForm.terms];
                                    updated[originalIdx].source = e.target.value;
                                    setGlossaryForm({...glossaryForm, terms: updated});
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-transparent bg-transparent hover:border-gray-300 hover:bg-white focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded transition-all"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={term.target}
                                  onChange={(e) => {
                                    const updated = [...glossaryForm.terms];
                                    updated[originalIdx].target = e.target.value;
                                    setGlossaryForm({...glossaryForm, terms: updated});
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-transparent bg-transparent hover:border-gray-300 hover:bg-white focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded transition-all"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={term.notes || ''}
                                  onChange={(e) => {
                                    const updated = [...glossaryForm.terms];
                                    updated[originalIdx].notes = e.target.value;
                                    setGlossaryForm({...glossaryForm, terms: updated});
                                  }}
                                  className="w-full px-2 py-1 text-xs text-gray-500 border border-transparent bg-transparent hover:border-gray-300 hover:bg-white focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded transition-all"
                                  placeholder="Add notes..."
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete "${term.source} → ${term.target}"?`)) {
                                      removeTermFromGlossary(term.id);
                                    }
                                  }}
                                  className="px-2 py-1 text-red-500 hover:text-white hover:bg-red-500 rounded transition-all opacity-50 group-hover:opacity-100"
                                  title="Delete this term"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* No results message */}
                  {termSearchQuery && glossaryForm.terms.filter(t =>
                    t.source.toLowerCase().includes(termSearchQuery.toLowerCase()) ||
                    t.target.toLowerCase().includes(termSearchQuery.toLowerCase()) ||
                    (t.notes && t.notes.toLowerCase().includes(termSearchQuery.toLowerCase()))
                  ).length === 0 && (
                    <div className="p-4 text-center text-gray-500 text-xs">
                      No terms found matching "{termSearchQuery}"
                    </div>
                  )}
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
  );
};

// ==================== PROJECTS PAGE ====================
const ProjectsPage = ({ adminKey, onTranslate, user }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(50);
  const [assigningTranslator, setAssigningTranslator] = useState(null); // Order ID being assigned
  const [assigningPM, setAssigningPM] = useState(null); // Order ID being assigned PM
  const [openActionsDropdown, setOpenActionsDropdown] = useState(null); // Order ID with open actions dropdown

  // Delivery Modal state
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null);
  const [deliveryTranslationHtml, setDeliveryTranslationHtml] = useState('');
  const [deliverySending, setDeliverySending] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState('');

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
  const [documentFiles, setDocumentFiles] = useState([]);

  // Document viewer state
  const [viewingOrder, setViewingOrder] = useState(null);
  const [orderDocuments, setOrderDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [projectModalTab, setProjectModalTab] = useState('details');
  const [uploadingProjectDoc, setUploadingProjectDoc] = useState(false);
  const [fileTranslatorAssignments, setFileTranslatorAssignments] = useState({}); // { docId: translatorId }
  const [editingNotes, setEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState({ client: '', internal: '' });
  const [editingProject, setEditingProject] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [savingProject, setSavingProject] = useState(false);

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
    client_phone: '',
    translate_from: 'Portuguese',
    translate_to: 'English',
    service_type: 'standard',
    document_type: '',
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
    invoice_custom_date: '',
    document_category: ''
  });

  // Document type filter state
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');

  const REVENUE_SOURCES = [
    { value: 'website', label: 'Website' },
    { value: 'google', label: 'Google' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
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

  // Primary Languages first, then alphabetical
  const PM_LANGUAGES = [
    'English', 'Spanish', 'Portuguese',
    'Afrikaans', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Azerbaijani',
    'Basque', 'Belarusian', 'Bengali', 'Bosnian', 'Bulgarian', 'Burmese',
    'Catalan', 'Chinese', 'Croatian', 'Czech', 'Danish', 'Dutch',
    'Estonian', 'Filipino', 'Finnish', 'French', 'Galician', 'Georgian',
    'German', 'Greek', 'Gujarati', 'Haitian Creole', 'Hebrew', 'Hindi',
    'Hungarian', 'Icelandic', 'Igbo', 'Indonesian', 'Irish', 'Italian',
    'Japanese', 'Kazakh', 'Khmer', 'Korean', 'Lao', 'Latin', 'Latvian',
    'Lithuanian', 'Luxembourgish', 'Macedonian', 'Malay', 'Maltese',
    'Mongolian', 'Nepali', 'Norwegian', 'Papiamento', 'Persian', 'Polish',
    'Punjabi', 'Romanian', 'Russian', 'Serbian', 'Slovak', 'Slovenian',
    'Somali', 'Swahili', 'Swedish', 'Tamil', 'Telugu', 'Thai', 'Turkish',
    'Ukrainian', 'Urdu', 'Uzbek', 'Vietnamese', 'Welsh', 'Yoruba', 'Zulu'
  ];

  useEffect(() => {
    fetchOrders();
    fetchUsers();
    if (isPM) fetchTranslatorStats();
  }, []);

  // Re-fetch orders when status filter changes
  useEffect(() => {
    fetchOrders(1); // Reset to first page when filter changes
  }, [statusFilter]);

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

  const fetchOrders = async (page = currentPage) => {
    setLoading(true);
    try {
      // Build query params for pagination
      const params = new URLSearchParams({
        admin_key: adminKey,
        page: page.toString(),
        limit: pageSize.toString()
      });

      // Add filters if active
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await axios.get(`${API}/admin/orders?${params.toString()}`);
      let allOrders = response.data.orders || [];

      // Update pagination state
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.total_pages || 1);
        setTotalCount(response.data.pagination.total_count || 0);
        setCurrentPage(response.data.pagination.page || 1);
      }

      // PM only sees orders assigned to them (filtered server-side would be better)
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

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchOrders(newPage);
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

  // Open delivery modal with translation preview
  const openDeliveryModal = async (order) => {
    setDeliveryModalOrder(order);
    setDeliveryStatus('');
    setShowDeliveryModal(true);

    // Fetch the translation HTML
    try {
      const response = await axios.get(`${API}/admin/orders/${order.id}?admin_key=${adminKey}`);
      const orderData = response.data.order || response.data;
      setDeliveryTranslationHtml(orderData.translation_html || '');
    } catch (err) {
      console.error('Failed to fetch translation:', err);
      setDeliveryTranslationHtml('<p style="color: red;">Erro ao carregar tradução</p>');
    }
  };

  // Send translation by email
  const sendDeliveryEmail = async () => {
    if (!deliveryModalOrder) return;

    setDeliverySending(true);
    setDeliveryStatus('Enviando email...');

    try {
      await axios.post(`${API}/admin/orders/${deliveryModalOrder.id}/deliver?admin_key=${adminKey}`);
      setDeliveryStatus('✅ Email enviado com sucesso!');
      fetchOrders();

      // Close modal after success
      setTimeout(() => {
        setShowDeliveryModal(false);
        setDeliveryModalOrder(null);
        setDeliveryTranslationHtml('');
        setDeliveryStatus('');
      }, 2000);
    } catch (err) {
      console.error('Failed to send email:', err);
      setDeliveryStatus('❌ Erro ao enviar email: ' + (err.response?.data?.detail || err.message));
    } finally {
      setDeliverySending(false);
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

      let message = '✅ Email enviado para o cliente!\n\n';

      if (response.data.attachment_sent) {
        message += `📎 Anexo: ${response.data.attachment_filename || 'Sim'}\n`;
      } else {
        message += '⚠️ Sem anexo (nenhum arquivo de tradução encontrado)\n';
        // Show debug info if no attachment
        if (response.data.debug) {
          message += `\nDebug: had_file=${response.data.debug.had_file}, had_html=${response.data.debug.had_html}, html_length=${response.data.debug.html_length}`;
        }
      }

      if (response.data.pm_notified) {
        message += '\n📧 PM notificado.';
      }
      if (response.data.bcc_sent) {
        message += '\n📧 Cópia BCC enviada.';
      }

      alert(message);
      setSendingOrder(null);
      setSendBccEmail(''); // Reset BCC field
      fetchOrders();
    } catch (err) {
      console.error('Failed to deliver:', err);
      alert('Erro ao enviar: ' + (err.response?.data?.detail || err.message));
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

  // Upload single document to order (Admin/PM only)
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
        content_type: file.type || 'application/octet-stream',
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

  // Assign translator to specific document
  const assignTranslatorToDocument = async (docId, translatorId, translatorName) => {
    try {
      // Update local state immediately for UI feedback
      setFileTranslatorAssignments(prev => ({
        ...prev,
        [docId]: { id: translatorId, name: translatorName }
      }));

      // Save to backend - update document metadata
      await axios.patch(`${API}/admin/order-documents/${docId}?admin_key=${adminKey}`, {
        assigned_translator_id: translatorId,
        assigned_translator_name: translatorName
      });
    } catch (err) {
      console.error('Failed to assign translator to document:', err);
      // Revert on error
      setFileTranslatorAssignments(prev => {
        const newState = { ...prev };
        delete newState[docId];
        return newState;
      });
    }
  };

  // Upload multiple documents to order (Admin/PM only)
  const uploadDocumentsToOrder = async (orderId, files) => {
    if (!files || files.length === 0) return;
    setUploadingProjectDoc(true);

    const maxFileSize = 100 * 1024 * 1024; // 100MB max per file
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const file of files) {
        // Check file size
        if (file.size > maxFileSize) {
          alert(`File "${file.name}" exceeds 100MB limit and was skipped.`);
          errorCount++;
          continue;
        }

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
            content_type: file.type || 'application/octet-stream',
            source: 'manual_upload'
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
          errorCount++;
        }
      }

      // Show summary
      if (successCount > 0 && errorCount === 0) {
        alert(`Successfully uploaded ${successCount} file(s)!`);
      } else if (successCount > 0 && errorCount > 0) {
        alert(`Uploaded ${successCount} file(s), ${errorCount} failed.`);
      } else {
        alert('Failed to upload files.');
      }

      // Refresh documents
      viewOrderDocuments(viewingOrder);
    } catch (err) {
      console.error('Failed to upload documents:', err);
      alert('Error uploading documents');
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

  // Save edited project
  const saveEditedProject = async () => {
    if (!viewingOrder || !editFormData) return;
    setSavingProject(true);
    try {
      await axios.put(`${API}/admin/orders/${viewingOrder.id}?admin_key=${adminKey}`, editFormData);

      // Update viewing order locally
      const updatedOrder = { ...viewingOrder, ...editFormData };
      setViewingOrder(updatedOrder);

      // Update orders list locally for immediate display
      setOrders(prev => prev.map(o =>
        o.id === viewingOrder.id ? { ...o, ...editFormData } : o
      ));

      setEditingProject(false);

      // Also refresh from server to ensure consistency
      fetchOrders();

      alert('✅ Projeto salvo com sucesso!');
    } catch (err) {
      console.error('Failed to save project:', err);
      alert('Error saving project: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSavingProject(false);
    }
  };

  // Start editing project
  const startEditingProject = () => {
    if (!viewingOrder) return;
    setEditFormData({
      client_name: viewingOrder.client_name || '',
      client_email: viewingOrder.client_email || '',
      translate_from: viewingOrder.translate_from || 'Portuguese',
      translate_to: viewingOrder.translate_to || 'English',
      service_type: viewingOrder.service_type || 'standard',
      page_count: viewingOrder.page_count || 1,
      urgency: viewingOrder.urgency || 'no',
      deadline: viewingOrder.deadline ? new Date(viewingOrder.deadline).toISOString().slice(0, 16) : '',
      document_type: viewingOrder.document_type || '',
      notes: viewingOrder.notes || '',
      internal_notes: viewingOrder.internal_notes || '',
      total_price: viewingOrder.total_price || 0,
      payment_status: viewingOrder.payment_status || 'pending',
      translation_status: viewingOrder.translation_status || 'received'
    });
    setEditingProject(true);
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

    // Validate required fields
    if (!newProject.client_name || !newProject.client_name.trim()) {
      alert('Client name is required');
      return;
    }
    if (!newProject.client_email || !newProject.client_email.trim()) {
      alert('Client email is required');
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newProject.client_email)) {
      alert('Please enter a valid email address');
      return;
    }

    setCreatingProject(true);
    try {
      // Prepare project data with document if uploaded
      let projectData = { ...newProject };

      // Combine deadline date and time FIRST (before removing deadline_time)
      if (projectData.deadline && projectData.deadline_time) {
        projectData.deadline = `${projectData.deadline}T${projectData.deadline_time}`;
      } else if (!projectData.deadline) {
        projectData.deadline = null;
      }

      // Remove fields that shouldn't be sent to backend
      delete projectData.deadline_time; // This is combined into deadline

      // Clean up empty string fields - convert to null or proper types
      if (projectData.assigned_pm_id === '') projectData.assigned_pm_id = null;
      if (projectData.assigned_translator_id === '') projectData.assigned_translator_id = null;
      if (projectData.payment_method === '') projectData.payment_method = null;
      if (projectData.reference === '') projectData.reference = null;
      if (projectData.notes === '') projectData.notes = null;
      if (projectData.internal_notes === '') projectData.internal_notes = null;
      if (projectData.payment_tag === '') projectData.payment_tag = null;
      if (projectData.base_price === '' || projectData.base_price === null) projectData.base_price = 0;
      if (projectData.total_price === '' || projectData.total_price === null) projectData.total_price = 0;
      if (projectData.page_count === '' || projectData.page_count === null) projectData.page_count = 1;
      if (projectData.word_count === '' || projectData.word_count === null) projectData.word_count = 0;

      // Convert numeric fields to numbers
      projectData.base_price = parseFloat(projectData.base_price) || 0;
      projectData.total_price = parseFloat(projectData.total_price) || 0;
      projectData.page_count = parseInt(projectData.page_count) || 1;
      projectData.word_count = parseInt(projectData.word_count) || 0;

      // Convert documents to base64 if provided (multiple files support)
      if (documentFiles.length > 0) {
        const documentsArray = [];
        for (const file of documentFiles) {
          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => {
              const base64 = reader.result.split(',')[1]; // Remove data:...;base64, prefix
              resolve(base64);
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(file);
          const base64Data = await base64Promise;
          documentsArray.push({
            filename: file.name,
            data: base64Data,
            content_type: file.type || 'application/octet-stream'
          });
        }
        projectData.documents = documentsArray;
        // Keep backwards compatibility - first file as main document
        projectData.document_data = documentsArray[0].data;
        projectData.document_filename = documentsArray[0].filename;
      }

      // Set payment status based on received flag
      if (newProject.payment_received) {
        projectData.payment_status = 'paid';
      } else {
        projectData.payment_status = 'pending';
      }

      await axios.post(`${API}/admin/orders/manual?admin_key=${adminKey}`, projectData);
      setShowNewProjectForm(false);
      setNewProject({
        client_name: '',
        client_email: '',
        translate_from: 'Portuguese',
        translate_to: 'English',
        service_type: 'standard',
        document_type: '',
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
        invoice_custom_date: '',
        document_category: ''
      });
      setDocumentFiles([]);
      fetchOrders();
    } catch (err) {
      console.error('Error creating project:', err.response?.data || err);
      const errorMsg = err.response?.data?.detail || 'Error creating project';
      alert(errorMsg.includes('email') ? 'Invalid email format. Please enter a valid email (e.g., name@email.com)' : errorMsg);
    } finally {
      setCreatingProject(false);
    }
  };

  const filtered = orders.filter(o => {
    const matchSearch =
      o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.client_email?.toLowerCase().includes(search.toLowerCase()) ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.document_type?.toLowerCase().includes(search.toLowerCase());
    // Map similar statuses together for filtering
    let matchStatus = statusFilter === 'all' || o.translation_status === statusFilter;
    // "PM Review" filter should include both 'review' and 'pending_pm_review'
    if (statusFilter === 'review' && (o.translation_status === 'pending_pm_review' || o.translation_status === 'pending_review')) {
      matchStatus = true;
    }
    // "Ready" filter should include 'pending_admin_approval' (waiting for admin to send)
    if (statusFilter === 'ready' && o.translation_status === 'pending_admin_approval') {
      matchStatus = true;
    }
    const matchDocType = !documentTypeFilter || o.document_type === documentTypeFilter;
    return matchSearch && matchStatus && matchDocType;
  });

  const totalReceive = filtered.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalPaid = filtered.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalPending = filtered.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + (o.total_price || 0), 0);

  const getStatusLabel = (status) => {
    const labels = {
      'received': 'Quote',
      'in_translation': 'In Progress',
      'review': 'PM Review',
      'pending_pm_review': 'PM Review',
      'pending_admin_approval': 'Pending Admin',
      'client_review': 'Client Review',
      'ready': 'Ready',
      'delivered': 'Delivered',
      'final': 'Final'
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
            {['all', 'received', 'in_translation', 'review', 'client_review', 'ready', 'delivered', 'final'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-[10px] rounded ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {s === 'all' ? 'All' : getStatusLabel(s)}
              </button>
            ))}
          </div>
          {/* Document Type Filter */}
          <select
            value={documentTypeFilter}
            onChange={(e) => setDocumentTypeFilter(e.target.value)}
            className="px-2 py-1 text-[10px] border rounded bg-white"
          >
            <option value="">All Documents</option>
            {DOCUMENT_TYPES.filter(d => d.value).map(doc => (
              <option key={doc.value} value={doc.value}>{doc.label}</option>
            ))}
          </select>
        </div>
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <div className="bg-white rounded-lg shadow mb-4 p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">📝 Create New Project</h3>
          <form onSubmit={createProject}>
            <div className="grid grid-cols-5 gap-3 mb-3">
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
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Client Phone (WhatsApp)</label>
                <input
                  type="tel"
                  value={newProject.client_phone}
                  onChange={(e) => setNewProject({...newProject, client_phone: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">From Language *</label>
                <select
                  value={newProject.translate_from}
                  onChange={(e) => setNewProject({...newProject, translate_from: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  {PM_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">To Language *</label>
                <select
                  value={newProject.translate_to}
                  onChange={(e) => setNewProject({...newProject, translate_to: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  {PM_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
            </div>

            {/* Document Type Row */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Document Type</label>
                <select
                  value={newProject.document_type}
                  onChange={(e) => setNewProject({...newProject, document_type: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border rounded"
                >
                  {DOCUMENT_TYPES.map(doc => <option key={doc.value} value={doc.value}>{doc.label}</option>)}
                </select>
              </div>
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
            </div>

            <div className="grid grid-cols-5 gap-3 mb-3">
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

            {/* Document Upload - Multiple Files */}
            <div className="mb-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">Documents to Translate (Multiple allowed)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setDocumentFiles(Array.from(e.target.files))}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.tiff,.bmp,.gif"
                      className="text-xs"
                    />
                    {documentFiles.length > 0 && (
                      <span className="text-xs text-green-600">✓ {documentFiles.length} file(s) selected</span>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">Accepted: PDF, DOC, DOCX, TXT, JPG, PNG, TIFF, BMP, GIF - Max 100MB per file</p>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">Document Category</label>
                  <select
                    value={newProject.document_category}
                    onChange={(e) => setNewProject({...newProject, document_category: e.target.value})}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                  >
                    {DOCUMENT_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-1">Select the category that best describes your documents</p>
                </div>
              </div>
              {documentFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {documentFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-xs">
                      <span className="truncate max-w-xs">{file.name}</span>
                      <span className="text-gray-400 ml-2">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <button
                        type="button"
                        onClick={() => setDocumentFiles(documentFiles.filter((_, i) => i !== idx))}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-blue-700">Code</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Order Date</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Client</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Doc Type</th>
              {/* PM column - Admin only */}
              {isAdmin && <th className="px-3 py-3 text-left font-semibold text-gray-700">PM</th>}
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Translator</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Deadline</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Notes</th>
              {/* Translation Ready column - shows when translation is complete */}
              <th className="px-3 py-3 text-center font-semibold text-gray-700">Translation</th>
              {/* Total and Payment columns - Admin only */}
              {isAdmin && <th className="px-3 py-3 text-right font-semibold text-gray-700">Total</th>}
              {isAdmin && <th className="px-3 py-3 text-center font-semibold text-gray-700">Payment</th>}
              <th className="px-3 py-3 text-center font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((order) => {
              const created = new Date(order.created_at);
              const orderDeadline = order.deadline ? new Date(order.deadline) : new Date(created.getTime() + 5 * 24 * 60 * 60 * 1000);
              const daysUntil = Math.ceil((orderDeadline - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <tr key={order.id} className="hover:bg-blue-50/50 transition-colors">
                  {/* Code */}
                  <td className="px-3 py-3 font-medium">
                    <button
                      onClick={() => viewOrderDocuments(order)}
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-semibold"
                      title="Ver documento original"
                    >
                      {order.order_number}
                    </button>
                  </td>
                  {/* Order Date */}
                  <td className="px-3 py-3 text-gray-600">
                    {created.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    <span className="text-xs text-gray-400 block">{created.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  {/* Client with email and send buttons */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="font-medium text-gray-800">{order.client_name}</span>
                        <span className="text-gray-400 text-xs block">{order.client_email}</span>
                      </div>
                      {/* Send translation button - Admin only - shows when ready, review, or delivered (for resend) */}
                      {['ready', 'review', 'delivered', 'pending_admin_approval'].includes(order.translation_status) && isAdmin && (
                        <button
                          onClick={() => openSendToClientModal(order)}
                          className={`px-1 py-0.5 rounded text-[9px] ${
                            order.translation_status === 'delivered'
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-teal-500 text-white hover:bg-teal-600'
                          }`}
                          title={order.translation_status === 'delivered' ? 'Resend translation' : 'Send translation to client'}
                        >
                          {order.translation_status === 'delivered' ? '🔄' : '📤'}
                        </button>
                      )}
                    </div>
                  </td>
                  {/* Document Type */}
                  <td className="px-3 py-3">
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                      {DOCUMENT_TYPES.find(d => d.value === order.document_type)?.label?.split('/')[0]?.trim() || order.document_type || '-'}
                    </span>
                  </td>
                  {/* PM - Admin only */}
                  {isAdmin && (
                    <td className={`px-3 py-3 ${(order.assigned_pm_name || order.assigned_pm) ? 'bg-green-50' : ''}`}>
                      {assigningPM === order.id ? (
                        <select
                          autoFocus
                          className="px-2 py-1 text-xs border rounded w-28"
                          onChange={(e) => {
                            if (e.target.value) assignPM(order.id, e.target.value);
                          }}
                          onBlur={() => setAssigningPM(null)}
                        >
                          <option value="">Select...</option>
                          {/* Use registered PMs from database, fallback to static list */}
                          {(pmList.length > 0 ? pmList : PROJECT_MANAGERS).map(pm => (
                            <option key={pm.id || pm.name} value={pm.name}>{pm.name}</option>
                          ))}
                        </select>
                      ) : (order.assigned_pm_name || order.assigned_pm) ? (
                        <span
                          onClick={() => setAssigningPM(order.id)}
                          className="text-xs text-green-700 font-medium cursor-pointer hover:text-green-900 hover:underline"
                          title="Click to change PM"
                        >
                          {order.assigned_pm_name || order.assigned_pm}
                        </span>
                      ) : (
                        <button
                          onClick={() => setAssigningPM(order.id)}
                          className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs hover:bg-gray-200"
                        >
                          Assign
                        </button>
                      )}
                    </td>
                  )}
                  {/* Translator */}
                  <td className={`px-3 py-3 ${(order.assigned_translator_name || order.assigned_translator) ? 'bg-green-50' : ''}`}>
                    {assigningTranslator === order.id ? (
                      <select
                        autoFocus
                        className="px-2 py-1 text-xs border rounded w-28"
                        onChange={(e) => {
                          if (e.target.value) assignTranslator(order.id, e.target.value);
                        }}
                        onBlur={() => setAssigningTranslator(null)}
                      >
                        <option value="">Select...</option>
                        {/* Use registered translators from database, fallback to static list */}
                        {(translatorList.length > 0 ? translatorList : TRANSLATORS).map(t => (
                          <option key={t.id || t.name} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    ) : (order.assigned_translator_name || order.assigned_translator) ? (
                      <div className="flex flex-col">
                        <span
                          onClick={() => (isAdmin || isPM) && openAssignTranslatorModal(order)}
                          className={`text-xs text-green-700 font-medium ${(isAdmin || isPM) ? 'cursor-pointer hover:text-green-900 hover:underline' : ''}`}
                          title={(isAdmin || isPM) ? "Click to change translator" : ""}
                        >
                          {order.assigned_translator_name || order.assigned_translator}
                        </span>
                        {order.translator_assignment_status === 'pending' && (
                          <span className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded mt-1 inline-block w-fit border border-yellow-200">Pending</span>
                        )}
                        {order.translator_assignment_status === 'accepted' && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded mt-1 inline-block w-fit">✓ Accepted</span>
                        )}
                        {order.translator_assignment_status === 'declined' && (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded inline-block w-fit">✕ Declined</span>
                            {(isAdmin || isPM) && (
                              <button
                                onClick={() => openAssignTranslatorModal(order)}
                                className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 flex items-center gap-1"
                              >
                                <RefreshIcon className="w-3 h-3" /> Reassign
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (isAdmin || isPM) ? (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => openAssignTranslatorModal(order)}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 flex items-center gap-1"
                        >
                          <AssignIcon className="w-3 h-3" /> Translator
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  {/* Deadline with date+time */}
                  <td className="px-3 py-3">
                    {editingDeadline === order.id && isAdmin ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="date"
                          value={tempDeadlineValue.date}
                          onChange={(e) => setTempDeadlineValue({...tempDeadlineValue, date: e.target.value})}
                          className="px-2 py-1 text-xs border rounded w-28"
                        />
                        <input
                          type="time"
                          value={tempDeadlineValue.time}
                          onChange={(e) => setTempDeadlineValue({...tempDeadlineValue, time: e.target.value})}
                          className="px-2 py-1 text-xs border rounded w-28"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => saveDeadlineEdit(order.id)} className="px-2 py-1 bg-green-500 text-white rounded text-xs">✓</button>
                          <button onClick={() => setEditingDeadline(null)} className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs">✕</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => isAdmin && startEditingDeadline(order)}
                        className={`${isAdmin ? 'cursor-pointer hover:text-blue-600' : ''}`}
                        title={isAdmin ? "Click to edit deadline" : ""}
                      >
                        {orderDeadline.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        <span className="text-xs text-gray-500 block">{orderDeadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {daysUntil > 0 && order.translation_status !== 'delivered' && (
                          <span className={`text-xs font-medium ${daysUntil <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>({daysUntil}d)</span>
                        )}
                      </div>
                    )}
                  </td>
                  {/* Status */}
                  <td className="px-3 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[order.translation_status] || 'bg-gray-100'}`}>{getStatusLabel(order.translation_status)}</span></td>
                  {/* Notes */}
                  <td className="px-3 py-3">
                    {editingTags === order.id && isAdmin ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          placeholder="Internal note..."
                          value={tempTagValue.notes}
                          onChange={(e) => setTempTagValue({...tempTagValue, notes: e.target.value})}
                          className="px-2 py-1 text-xs border rounded w-32"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => saveTagsEdit(order.id)} className="px-2 py-1 bg-green-500 text-white rounded text-xs">✓</button>
                          <button onClick={() => setEditingTags(null)} className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs">✕</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => isAdmin && startEditingTags(order)}
                        className={`flex items-center gap-1 ${isAdmin ? 'cursor-pointer' : ''}`}
                        title={isAdmin ? "Click to edit notes" : ""}
                      >
                        {order.notes && (
                          <span className="px-1.5 py-1 bg-blue-50 text-blue-500 rounded text-xs cursor-help border border-blue-100" title={`Client message: ${order.notes}`}><NoteIcon className="w-3.5 h-3.5 inline" /></span>
                        )}
                        {order.internal_notes && (
                          <span className="px-1.5 py-1 bg-amber-50 text-amber-500 rounded text-xs cursor-help border border-amber-100" title={`Internal note: ${order.internal_notes}`}><MemoIcon className="w-3.5 h-3.5 inline" /></span>
                        )}
                        {!order.notes && !order.internal_notes && (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </div>
                    )}
                  </td>
                  {/* Translation Ready column - shows when translation is complete */}
                  <td className="px-3 py-3 text-center">
                    {order.translation_ready ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          ✅ Ready
                        </span>
                        {order.translation_ready_at && (
                          <span className="text-xs text-gray-500">
                            {new Date(order.translation_ready_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ) : ['review', 'ready', 'delivered'].includes(order.translation_status) ? (
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium border border-blue-200 flex items-center gap-1">
                        <RefreshIcon className="w-3 h-3" /> Review
                      </span>
                    ) : order.translation_status === 'in_translation' ? (
                      <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded text-xs font-medium border border-yellow-200 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" /> Working
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  {/* Total and Payment columns - Admin only */}
                  {isAdmin && <td className="px-3 py-3 text-right font-semibold text-gray-800">${order.total_price?.toFixed(2)}</td>}
                  {isAdmin && <td className="px-3 py-3 text-center"><span className={`px-2 py-1 rounded text-xs font-medium ${PAYMENT_COLORS[order.payment_status]}`}>{order.payment_status}</span></td>}
                  <td className="px-3 py-3 text-center">
                    <div className="relative">
                      <button
                        onClick={() => setOpenActionsDropdown(openActionsDropdown === order.id ? null : order.id)}
                        className="w-8 h-8 flex items-center justify-center border border-slate-200 text-slate-500 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {openActionsDropdown === order.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                          {/* View Documents */}
                          <button
                            onClick={() => { viewOrderDocuments(order); setOpenActionsDropdown(null); }}
                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <DocumentIcon className="w-4 h-4 text-slate-400" />
                            View Documents
                          </button>

                          {/* Translation Tool */}
                          {(isAdmin || isPM) && ['received', 'in_translation', 'review'].includes(order.translation_status) && (
                            <button
                              onClick={() => { startTranslation(order); setOpenActionsDropdown(null); }}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2"
                            >
                              <WriteIcon className="w-4 h-4 text-blue-500" />
                              Open Translation
                            </button>
                          )}

                          {/* Review Side-by-Side */}
                          {(isAdmin || isPM) && ['review', 'ready', 'client_review'].includes(order.translation_status) && (
                            <button
                              onClick={() => { openReviewModal(order); setOpenActionsDropdown(null); }}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 flex items-center gap-2"
                            >
                              <SearchIcon className="w-4 h-4 text-emerald-500" />
                              Review Side-by-Side
                            </button>
                          )}

                          <div className="border-t border-slate-100 my-1"></div>

                          {/* Status Actions */}
                          {(isAdmin || isPM) && order.translation_status === 'received' && (isAdmin || order.translator_assignment_status === 'accepted') && (
                            <button
                              onClick={() => { updateStatus(order.id, 'in_translation'); setOpenActionsDropdown(null); }}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-amber-50 flex items-center gap-2"
                            >
                              <PlayIcon className="w-4 h-4 text-amber-500" />
                              Start Translation
                            </button>
                          )}

                          {(isAdmin || isPM) && order.translation_status === 'in_translation' && (
                            <button
                              onClick={() => { updateStatus(order.id, 'review'); setOpenActionsDropdown(null); }}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2"
                            >
                              <EyeIcon className="w-4 h-4 text-indigo-500" />
                              Send to PM Review
                            </button>
                          )}

                          {/* Admin only: Approve from PM (pending_admin_approval) */}
                          {isAdmin && order.translation_status === 'pending_admin_approval' && (
                            <>
                              <button
                                onClick={() => { updateStatus(order.id, 'ready'); setOpenActionsDropdown(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-green-50 flex items-center gap-2"
                              >
                                <CheckIcon className="w-4 h-4 text-green-500" />
                                ✅ Approve (Ready for Delivery)
                              </button>
                              <button
                                onClick={() => { updateStatus(order.id, 'review'); setOpenActionsDropdown(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-yellow-50 flex items-center gap-2"
                              >
                                <RefreshIcon className="w-4 h-4 text-yellow-500" />
                                Return to PM Review
                              </button>
                            </>
                          )}

                          {/* Admin only: Send to Client Review and Mark as Final */}
                          {isAdmin && (order.translation_status === 'review' || order.translation_status === 'pending_pm_review') && (
                            <>
                              <button
                                onClick={() => { updateStatus(order.id, 'client_review'); setOpenActionsDropdown(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-orange-50 flex items-center gap-2"
                              >
                                <MailIcon className="w-4 h-4 text-orange-500" />
                                Send to Client Review
                              </button>
                              <button
                                onClick={() => { updateStatus(order.id, 'ready'); setOpenActionsDropdown(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 flex items-center gap-2"
                              >
                                <CheckIcon className="w-4 h-4 text-emerald-500" />
                                Mark as Ready
                              </button>
                            </>
                          )}

                          {/* Admin only: Client review actions */}
                          {isAdmin && order.translation_status === 'client_review' && (
                            <>
                              <button
                                onClick={() => { updateStatus(order.id, 'review'); setOpenActionsDropdown(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-yellow-50 flex items-center gap-2"
                              >
                                <RefreshIcon className="w-4 h-4 text-yellow-500" />
                                Back to Revision
                              </button>
                              <button
                                onClick={() => { updateStatus(order.id, 'ready'); setOpenActionsDropdown(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 flex items-center gap-2"
                              >
                                <CheckIcon className="w-4 h-4 text-emerald-500" />
                                Mark as Final
                              </button>
                            </>
                          )}

                          {/* Admin only: Preview & Send Translation */}
                          {isAdmin && ['ready', 'pending_admin_approval', 'review', 'pending_pm_review'].includes(order.translation_status) && order.translation_html && (
                            <button
                              onClick={() => { openDeliveryModal(order); setOpenActionsDropdown(null); }}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2"
                            >
                              <MailIcon className="w-4 h-4 text-blue-500" />
                              📧 Preview & Send Email
                            </button>
                          )}

                          {/* Admin only: Deliver to Client (quick) */}
                          {isAdmin && order.translation_status === 'ready' && (
                            <button
                              onClick={() => { deliverOrder(order.id); setOpenActionsDropdown(null); }}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-teal-50 flex items-center gap-2"
                            >
                              <SendIcon className="w-4 h-4 text-teal-500" />
                              Deliver to Client (Quick)
                            </button>
                          )}

                          {/* Admin only: Mark as Final (project completed) */}
                          {isAdmin && (order.translation_status === 'delivered' || order.translation_status === 'ready') && (
                            <button
                              onClick={() => { updateStatus(order.id, 'final'); setOpenActionsDropdown(null); }}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-purple-50 flex items-center gap-2"
                            >
                              <CheckIcon className="w-4 h-4 text-purple-500" />
                              Mark as Final
                            </button>
                          )}

                          {/* Admin-only Actions */}
                          {isAdmin && (
                            <>
                              <div className="border-t border-slate-100 my-1"></div>
                              {order.payment_status === 'pending' && (
                                <button
                                  onClick={() => { markPaid(order.id); setOpenActionsDropdown(null); }}
                                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 flex items-center gap-2"
                                >
                                  <span className="w-4 h-4 flex items-center justify-center text-emerald-500 font-semibold">$</span>
                                  Mark as Paid
                                </button>
                              )}
                              <button
                                onClick={() => { deleteOrder(order.id, order.order_number); setOpenActionsDropdown(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <TrashIcon className="w-4 h-4" />
                                Delete Order
                              </button>
                            </>
                          )}
                        </div>
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
            <div className="text-xs text-gray-600">
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} projects
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                ««
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                ‹ Prev
              </button>
              <span className="px-3 py-1 text-xs font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next ›
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                »»
              </button>
            </div>
          </div>
        )}
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
                {(isAdmin || isPM) && !editingProject && (
                  <button
                    onClick={startEditingProject}
                    className="px-3 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30 font-medium"
                  >
                    ✏️ Edit
                  </button>
                )}
                {editingProject && (
                  <>
                    <button
                      onClick={saveEditedProject}
                      disabled={savingProject}
                      className="px-3 py-1 bg-green-500 rounded text-xs hover:bg-green-600 font-medium disabled:opacity-50"
                    >
                      {savingProject ? '...' : '💾 Save'}
                    </button>
                    <button
                      onClick={() => setEditingProject(false)}
                      className="px-3 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30"
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button onClick={() => { setViewingOrder(null); setProjectModalTab('details'); setEditingNotes(false); setEditingProject(false); }} className="text-white hover:text-gray-200 text-xl">×</button>
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
                  {editingProject ? (
                    /* EDIT MODE - Editable form */
                    <>
                      {/* Client Section - Editable */}
                      <div>
                        <h4 className="text-sm font-bold text-blue-600 mb-2">👤 Client</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                            <input
                              type="text"
                              value={editFormData.client_name || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, client_name: e.target.value }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                            <input
                              type="email"
                              value={editFormData.client_email || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, client_email: e.target.value }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Requirements Section - Editable */}
                      <div>
                        <h4 className="text-sm font-bold text-blue-600 mb-2">📋 Requirements</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">From Language</label>
                            <select
                              value={editFormData.translate_from || 'Portuguese'}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, translate_from: e.target.value }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                            >
                              {['Portuguese', 'English', 'Spanish', 'French', 'German', 'Italian', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Arabic', 'Dutch', 'Norwegian', 'Swedish', 'Danish'].map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">To Language</label>
                            <select
                              value={editFormData.translate_to || 'English'}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, translate_to: e.target.value }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                            >
                              {['English', 'Portuguese', 'Spanish', 'French', 'German', 'Italian', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Arabic', 'Dutch', 'Norwegian', 'Swedish', 'Danish'].map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Service Type</label>
                            <select
                              value={editFormData.service_type || 'standard'}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, service_type: e.target.value }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                            >
                              <option value="standard">Standard</option>
                              <option value="certified">Certified</option>
                              <option value="notarized">Notarized</option>
                              <option value="apostille">Apostille</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Pages</label>
                            <input
                              type="number"
                              min="1"
                              value={editFormData.page_count || 1}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, page_count: parseInt(e.target.value) || 1 }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Urgency</label>
                            <select
                              value={editFormData.urgency || 'no'}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, urgency: e.target.value }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                            >
                              <option value="no">Normal</option>
                              <option value="priority">Priority</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Document Type</label>
                            <input
                              type="text"
                              value={editFormData.document_type || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, document_type: e.target.value }))}
                              placeholder="Birth Certificate, Diploma..."
                              className="w-full px-2 py-1.5 border rounded text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Deadline</label>
                            <input
                              type="datetime-local"
                              value={editFormData.deadline || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, deadline: e.target.value }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Financial Section - Editable */}
                      <div>
                        <h4 className="text-sm font-bold text-blue-600 mb-2">💰 Financial</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Total Price ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editFormData.total_price || 0}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, total_price: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
                            <select
                              value={editFormData.payment_status || 'pending'}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="partial">Partial</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Status Section - Editable */}
                      <div>
                        <h4 className="text-sm font-bold text-blue-600 mb-2">📊 Status</h4>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Translation Status</label>
                          <select
                            value={editFormData.translation_status || 'received'}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, translation_status: e.target.value }))}
                            className="w-full px-2 py-1.5 border rounded text-sm"
                          >
                            <option value="received">Received</option>
                            <option value="quote">Quote</option>
                            <option value="in_translation">In Translation</option>
                            <option value="review">Review</option>
                            <option value="pending_review">Pending Review</option>
                            <option value="client_review">Client Review</option>
                            <option value="ready">Ready</option>
                            <option value="delivered">Delivered</option>
                          </select>
                        </div>
                      </div>

                      {/* Notes Section - Editable */}
                      <div>
                        <h4 className="text-sm font-bold text-blue-600 mb-2">📝 Notes</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Client Notes</label>
                            <textarea
                              value={editFormData.notes || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                              rows="2"
                              placeholder="Notes visible to client..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Internal Notes (Admin only)</label>
                            <textarea
                              value={editFormData.internal_notes || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                              rows="2"
                              placeholder="Internal notes..."
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* VIEW MODE - Read only */
                    <>
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
                    </>
                  )}
                </div>
              )}

              {/* Files Tab */}
              {projectModalTab === 'files' && (
                <div className="space-y-4">
                  {/* Upload Section - Admin/PM only */}
                  {(isAdmin || isPM) && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-xs font-medium text-blue-700 mb-2">📤 Upload Documents (Multiple Files Allowed)</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="project-doc-upload"
                          multiple
                          accept="*/*"
                          onChange={(e) => uploadDocumentsToOrder(viewingOrder.id, Array.from(e.target.files))}
                          className="hidden"
                        />
                        <label
                          htmlFor="project-doc-upload"
                          className={`px-3 py-1.5 rounded text-xs cursor-pointer ${uploadingProjectDoc ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          {uploadingProjectDoc ? 'Uploading...' : 'Choose Files'}
                        </label>
                        <span className="text-[10px] text-gray-500">All formats accepted • Max 100MB per file • Multiple files allowed</span>
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

                  {/* Delivery Info & Resend Option - Admin only */}
                  {viewingOrder.translation_status === 'delivered' && (
                    <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
                      <div className="text-xs font-medium text-teal-700 mb-2">📤 Delivery Information</div>
                      {viewingOrder.delivered_at && (
                        <div className="text-xs text-gray-600 mb-2">
                          Delivered: {new Date(viewingOrder.delivered_at).toLocaleString()}
                        </div>
                      )}
                      <div className="text-xs text-gray-600 mb-3">
                        Sent to: {viewingOrder.client_email}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setViewingOrder(null);
                            openSendToClientModal(viewingOrder);
                          }}
                          className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 flex items-center gap-1"
                        >
                          🔄 Resend Translation
                        </button>
                      )}
                    </div>
                  )}

                  {/* Translation Ready - option to send - Admin only */}
                  {viewingOrder.translation_ready && viewingOrder.translation_status !== 'delivered' && isAdmin && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-xs font-medium text-green-700 mb-2">✅ Translation Ready</div>
                      <div className="text-xs text-gray-600 mb-3">
                        {viewingOrder.translation_ready_at && (
                          <span>Completed: {new Date(viewingOrder.translation_ready_at).toLocaleString()}</span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setViewingOrder(null);
                          openSendToClientModal(viewingOrder);
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1"
                      >
                        📤 Send to Client
                      </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className={`p-3 border-b flex justify-between items-center rounded-t-lg flex-shrink-0 ${
              sendingOrder.translation_status === 'delivered' ? 'bg-blue-600' : 'bg-teal-600'
            } text-white`}>
              <div>
                <h3 className="font-bold text-sm">
                  {sendingOrder.translation_status === 'delivered' ? '🔄 Resend Translation' : '📤 Send to Client'}
                </h3>
                <p className="text-[10px] opacity-80">{sendingOrder.order_number} - {sendingOrder.client_name}</p>
              </div>
              <button onClick={() => setSendingOrder(null)} className="text-white hover:text-gray-200 text-xl">×</button>
            </div>

            <div className="p-3 overflow-y-auto flex-1">
              {/* Resend notice for delivered orders */}
              {sendingOrder.translation_status === 'delivered' && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-[10px] text-blue-700">
                    <strong>ℹ️ Resending:</strong> Delivered
                    {sendingOrder.delivered_at && ` on ${new Date(sendingOrder.delivered_at).toLocaleDateString()}`}.
                    Upload new file below if needed.
                  </div>
                </div>
              )}

              {/* Client Info */}
              <div className="mb-3 p-2 bg-gray-50 rounded border">
                <div className="text-[10px] font-medium text-gray-600">Client:</div>
                <div className="text-xs font-medium">{sendingOrder.client_name}</div>
                <div className="text-[10px] text-gray-500">{sendingOrder.client_email}</div>
              </div>

              {/* Translated Document Status */}
              <div className="mb-3">
                <div className="text-[10px] font-medium text-gray-600 mb-1">📄 Tradução para Anexar:</div>
                {!translatedDocInfo ? (
                  <div className="text-center py-2 text-gray-500 text-[10px]">Carregando...</div>
                ) : translatedDocInfo.has_translated_document ? (
                  <div className="space-y-2">
                    {/* Show HTML translation from workspace */}
                    {translatedDocInfo.has_html_translation && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <span className="text-green-600 mr-1">✅</span>
                            <span className="text-[10px] text-green-800 font-medium">Tradução do Workspace</span>
                          </div>
                          <button
                            onClick={() => downloadTranslatedDocument(sendingOrder.id, 'translation.html')}
                            className="px-2 py-0.5 bg-green-600 text-white rounded text-[10px] hover:bg-green-700"
                          >
                            👁️ Preview
                          </button>
                        </div>
                        {translatedDocInfo.translation_settings && (
                          <div className="text-[9px] text-gray-600 space-y-0.5 mt-1 border-t border-green-200 pt-1">
                            <div>📝 Tipo: {translatedDocInfo.translation_settings.document_type || 'N/A'}</div>
                            <div>🌐 {translatedDocInfo.translation_settings.source_language} → {translatedDocInfo.translation_settings.target_language}</div>
                            {translatedDocInfo.translation_settings.translator_name && (
                              <div>👤 Tradutor: {translatedDocInfo.translation_settings.translator_name}</div>
                            )}
                            {translatedDocInfo.translation_settings.submitted_by && (
                              <div>📤 Enviado por: {translatedDocInfo.translation_settings.submitted_by}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show uploaded file */}
                    {translatedDocInfo.has_file_attachment && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-blue-600 mr-1">📎</span>
                            <span className="text-[10px] text-blue-800 font-medium">
                              Arquivo: {translatedDocInfo.translated_filename || 'documento.pdf'}
                            </span>
                          </div>
                          <button
                            onClick={() => downloadTranslatedDocument(sendingOrder.id, translatedDocInfo.translated_filename)}
                            className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700"
                          >
                            ⬇️ Download
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Priority notice */}
                    {translatedDocInfo.has_file_attachment && translatedDocInfo.has_html_translation && (
                      <div className="p-1.5 bg-yellow-50 border border-yellow-200 rounded text-[9px] text-yellow-700">
                        ⚠️ O arquivo PDF terá prioridade sobre a tradução do workspace
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="text-[10px] text-yellow-800">⚠️ Nenhuma tradução anexada</div>
                    <div className="text-[9px] text-yellow-600 mt-1">
                      Faça upload de um arquivo abaixo ou complete a tradução no Workspace
                    </div>
                  </div>
                )}
              </div>

              {/* Upload new document - External translation */}
              <div className="mb-3">
                <div className="text-[10px] font-medium text-gray-600 mb-1">📎 Upload Tradução Externa:</div>
                <input
                  type="file"
                  id="translationFile"
                  accept=".pdf,.doc,.docx,.html"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      uploadTranslatedDocument(sendingOrder.id, e.target.files[0]);
                    }
                  }}
                />
                <label
                  htmlFor="translationFile"
                  className={`block px-2 py-1.5 border-2 border-dashed rounded text-center cursor-pointer hover:bg-gray-50 text-[10px] ${uploadingFile ? 'opacity-50' : ''}`}
                >
                  {uploadingFile ? 'Enviando...' : '📁 Selecionar arquivo (PDF, DOC, HTML)'}
                </label>
                <div className="text-[9px] text-gray-400 mt-1 text-center">
                  Para traduções feitas fora do sistema
                </div>
              </div>

              {/* Notify PM Option */}
              {sendingOrder?.assigned_pm_id && (
                <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyPM}
                      onChange={(e) => setNotifyPM(e.target.checked)}
                      className="w-3 h-3 text-purple-600 rounded"
                    />
                    <span className="text-[10px] text-purple-700">
                      Notify PM ({sendingOrder.assigned_pm_name || 'Assigned'})
                    </span>
                  </label>
                </div>
              )}

              {/* BCC Field */}
              <div className="mb-2">
                <label className="text-[10px] font-medium text-gray-600 mb-1 block">📧 BCC:</label>
                <input
                  type="email"
                  value={sendBccEmail}
                  onChange={(e) => setSendBccEmail(e.target.value)}
                  placeholder="email@example.com (optional)"
                  className="w-full px-2 py-1 border rounded text-xs"
                />
              </div>
            </div>

            {/* Footer - always visible */}
            <div className="p-2 border-t bg-gray-50 flex justify-between rounded-b-lg flex-shrink-0">
              <button
                onClick={() => setSendingOrder(null)}
                className="px-3 py-1.5 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => sendTranslationToClient(sendingOrder.id)}
                disabled={sendingToClient}
                className={`px-3 py-1.5 text-white rounded text-xs disabled:bg-gray-400 ${
                  sendingOrder.translation_status === 'delivered'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {sendingToClient ? 'Sending...' : (sendingOrder.translation_status === 'delivered' ? '🔄 Resend' : '📤 Send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Preview Modal */}
      {showDeliveryModal && deliveryModalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-t-lg">
              <div>
                <h3 className="font-bold text-lg">📧 Preview & Send Translation</h3>
                <p className="text-xs opacity-80">
                  {deliveryModalOrder.order_number} - {deliveryModalOrder.client_name} ({deliveryModalOrder.client_email})
                </p>
              </div>
              <button
                onClick={() => { setShowDeliveryModal(false); setDeliveryModalOrder(null); setDeliveryTranslationHtml(''); }}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Translation Preview */}
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-700">📄 Translation Preview</h4>
                <span className={`px-2 py-1 text-xs rounded ${STATUS_COLORS[deliveryModalOrder.translation_status] || 'bg-gray-100'}`}>
                  {getStatusLabel(deliveryModalOrder.translation_status)}
                </span>
              </div>

              {deliveryTranslationHtml ? (
                <div
                  className="bg-white border rounded-lg p-4 shadow-inner prose max-w-none"
                  style={{ minHeight: '300px' }}
                  dangerouslySetInnerHTML={{ __html: deliveryTranslationHtml }}
                />
              ) : (
                <div className="bg-white border rounded-lg p-8 text-center text-gray-400">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p>Loading translation...</p>
                </div>
              )}
            </div>

            {/* Status Message */}
            {deliveryStatus && (
              <div className={`px-4 py-2 text-sm text-center ${
                deliveryStatus.includes('✅') ? 'bg-green-100 text-green-700' :
                deliveryStatus.includes('❌') ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {deliveryStatus}
              </div>
            )}

            {/* Footer Actions */}
            <div className="p-4 border-t bg-gray-100 rounded-b-lg flex justify-between items-center">
              <div className="text-xs text-gray-500">
                <strong>Client:</strong> {deliveryModalOrder.client_email}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeliveryModal(false); setDeliveryModalOrder(null); }}
                  className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={sendDeliveryEmail}
                  disabled={deliverySending || !deliveryTranslationHtml}
                  className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-300 text-sm font-medium flex items-center gap-2"
                >
                  {deliverySending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>📧 Send to Client</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== NEW QUOTE PAGE ====================
const NewQuotePage = ({ adminKey, user }) => {
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    translate_from: 'Portuguese',
    translate_to: 'English',
    service_type: 'certified',
    turnaround: 'standard',
    delivery_method: 'digital',
    discount: 0,
    special_instructions: '',
    // Editable prices
    custom_price_per_page: 24.99,
    custom_urgency_multiplier: 1.0,
    custom_delivery_fee: 0
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [sending, setSending] = useState(false);
  const [quote, setQuote] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const LANGUAGES = ['Portuguese', 'Spanish', 'English', 'French', 'German', 'Italian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian'];

  const SERVICE_TYPES = {
    certified: { name: 'Certified Translation', price: 24.99, description: 'Official documents, legal, immigration' },
    sworn: { name: 'Sworn Translation (Tradução Juramentada)', price: 34.99, description: 'Court-recognized, notarized by sworn translator' },
    apostille: { name: 'Apostille Service', price: 85.00, description: 'HCCH Apostille authentication', comingSoon: true },
    standard: { name: 'Standard Translation', price: 19.99, description: 'General use, no certification' }
  };

  const TURNAROUND = {
    standard: { name: '2-3 business days', multiplier: 1.0 },
    priority: { name: 'Priority (24 hours)', multiplier: 1.25 },
    urgent: { name: 'Urgent (12 hours)', multiplier: 2.0 }
  };

  const DELIVERY_OPTIONS = {
    digital: { name: 'Digital Delivery (Email/Download)', price: 0, description: 'PDF via email' },
    usps_standard: { name: 'USPS Standard Mail', price: 5.99, description: '5-7 business days' },
    usps_priority: { name: 'USPS Priority Mail', price: 12.99, description: '2-3 business days' },
    usps_express: { name: 'USPS Express Mail', price: 29.99, description: '1-2 business days' },
    fedex_overnight: { name: 'FedEx Overnight', price: 39.99, description: 'Next business day' }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const newFiles = [];

    for (const file of files) {
      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = (e) => {
          newFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            data: e.target.result.split(',')[1], // base64
            pages: 1 // Default, would need OCR/PDF parsing for actual count
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    setUploadedFiles([...uploadedFiles, ...newFiles]);
    setUploading(false);
    setQuote(null); // Reset quote when files change
  };

  // Remove file
  const removeFile = (index) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
    setQuote(null);
  };

  // Calculate quote
  const calculateQuote = () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one document');
      return;
    }

    setCalculating(true);
    setError('');

    // Calculate total pages (simplified - 1 page per file for now)
    const totalPages = uploadedFiles.length || 1;
    // Use custom editable prices
    const pricePerPage = parseFloat(formData.custom_price_per_page) || SERVICE_TYPES[formData.service_type].price;
    const urgencyMultiplier = parseFloat(formData.custom_urgency_multiplier) || TURNAROUND[formData.turnaround].multiplier;
    const deliveryFee = parseFloat(formData.custom_delivery_fee) || DELIVERY_OPTIONS[formData.delivery_method].price;
    const discountPercent = parseFloat(formData.discount) || 0;

    const subtotal = totalPages * pricePerPage;
    const turnaroundFee = subtotal * (urgencyMultiplier - 1);
    const discountAmount = (subtotal + turnaroundFee) * (discountPercent / 100);
    const total = subtotal + turnaroundFee + deliveryFee - discountAmount;

    setTimeout(() => {
      setQuote({
        pages: totalPages,
        base_price: pricePerPage,
        subtotal: subtotal,
        turnaround_fee: turnaroundFee,
        delivery_fee: deliveryFee,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        total: total,
        service: SERVICE_TYPES[formData.service_type].name,
        turnaround: TURNAROUND[formData.turnaround].name,
        delivery: DELIVERY_OPTIONS[formData.delivery_method].name
      });
      setCalculating(false);
    }, 500);
  };

  // Send quote to client
  const sendQuote = async () => {
    if (!quote) {
      setError('Please calculate the quote first');
      return;
    }

    if (!formData.client_email || !formData.client_name) {
      setError('Please fill in client name and email');
      return;
    }

    setSending(true);
    setError('');

    try {
      // Create order in backend
      const orderData = {
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_phone: formData.client_phone,
        translate_from: formData.translate_from,
        translate_to: formData.translate_to,
        service_type: formData.service_type,
        turnaround: formData.turnaround,
        special_instructions: formData.special_instructions,
        pages: quote.pages,
        total_price: quote.total,
        status: 'Quote',
        created_by: user?.name || 'Admin',
        files: uploadedFiles.map(f => ({ filename: f.name, data: f.data, content_type: f.type }))
      };

      const response = await axios.post(`${API}/admin/create-quote?admin_key=${adminKey}`, orderData);

      if (response.data.success || response.data.id) {
        setSuccess(true);
        // Reset form
        setFormData({
          client_name: '',
          client_email: '',
          client_phone: '',
          translate_from: 'Portuguese',
          translate_to: 'English',
          service_type: 'certified',
          turnaround: 'standard',
          special_instructions: ''
        });
        setUploadedFiles([]);
        setQuote(null);
      } else {
        throw new Error(response.data.error || 'Failed to create quote');
      }
    } catch (err) {
      console.error('Failed to send quote:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to send quote');
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">Quote Sent Successfully!</h2>
          <p className="text-gray-600 mb-6">
            The quote has been sent to {formData.client_email || 'the client'}
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Create Another Quote
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create New Quote</h1>
        <p className="text-gray-600">Create a quote for a client and send it via email</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Information */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Client Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  value={formData.client_name}
                  onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  value={formData.client_email}
                  onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                  placeholder="john@example.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  value={formData.client_phone}
                  onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Translation Details */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Translation Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Language</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  value={formData.translate_from}
                  onChange={(e) => setFormData({...formData, translate_from: e.target.value})}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Language</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  value={formData.translate_to}
                  onChange={(e) => setFormData({...formData, translate_to: e.target.value})}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Service Type */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
              <div className="space-y-2">
                {Object.entries(SERVICE_TYPES).map(([key, service]) => (
                  <label
                    key={key}
                    className={`flex items-center p-3 border rounded-lg ${service.comingSoon ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'} ${formData.service_type === key ? 'border-teal-500 bg-teal-50' : 'hover:bg-gray-50'}`}
                  >
                    <input
                      type="radio"
                      name="service_type"
                      value={key}
                      checked={formData.service_type === key}
                      disabled={service.comingSoon}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          service_type: e.target.value,
                          custom_price_per_page: SERVICE_TYPES[e.target.value].price
                        });
                        setQuote(null);
                      }}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {service.name}
                        {service.comingSoon && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">Coming Soon</span>}
                      </div>
                      <div className="text-sm text-gray-500">{service.description}</div>
                    </div>
                    <div className="font-bold text-teal-600">${service.price}/page</div>
                  </label>
                ))}
              </div>
            </div>

            {/* Editable Price per Page */}
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="block text-sm font-medium text-yellow-800 mb-2">Custom Price per Page ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.custom_price_per_page}
                onChange={(e) => { setFormData({...formData, custom_price_per_page: parseFloat(e.target.value) || 0}); setQuote(null); }}
                className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
              <p className="text-xs text-yellow-600 mt-1">Override the default price per page for this quote</p>
            </div>

            {/* Turnaround */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Turnaround Time</label>
              <div className="space-y-2">
                {Object.entries(TURNAROUND).map(([key, option]) => (
                  <label key={key} className={`flex items-center p-3 border rounded-lg cursor-pointer ${formData.turnaround === key ? 'border-teal-500 bg-teal-50' : 'hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="turnaround"
                      value={key}
                      checked={formData.turnaround === key}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          turnaround: e.target.value,
                          custom_urgency_multiplier: TURNAROUND[e.target.value].multiplier
                        });
                        setQuote(null);
                      }}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{option.name}</div>
                    </div>
                    {option.multiplier > 1 && (
                      <div className="text-sm text-orange-600">+{((option.multiplier - 1) * 100).toFixed(0)}%</div>
                    )}
                  </label>
                ))}
              </div>
              {/* Custom Urgency Multiplier */}
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <label className="block text-xs font-medium text-orange-800 mb-1">Custom Urgency Multiplier</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.custom_urgency_multiplier}
                  onChange={(e) => { setFormData({...formData, custom_urgency_multiplier: parseFloat(e.target.value) || 1}); setQuote(null); }}
                  className="w-full px-2 py-1 text-sm border border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-orange-600 mt-1">1.0 = no fee, 1.25 = +25%, 2.0 = +100%</p>
              </div>
            </div>

            {/* Delivery Method */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Method</label>
              <div className="space-y-2">
                {Object.entries(DELIVERY_OPTIONS).map(([key, option]) => (
                  <label key={key} className={`flex items-center p-3 border rounded-lg cursor-pointer ${formData.delivery_method === key ? 'border-teal-500 bg-teal-50' : 'hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="delivery_method"
                      value={key}
                      checked={formData.delivery_method === key}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          delivery_method: e.target.value,
                          custom_delivery_fee: DELIVERY_OPTIONS[e.target.value].price
                        });
                        setQuote(null);
                      }}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{option.name}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                    {option.price > 0 && (
                      <div className="text-sm text-blue-600">+${option.price.toFixed(2)}</div>
                    )}
                  </label>
                ))}
              </div>
              {/* Custom Delivery Fee */}
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-xs font-medium text-blue-800 mb-1">Custom Delivery Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.custom_delivery_fee}
                  onChange={(e) => { setFormData({...formData, custom_delivery_fee: parseFloat(e.target.value) || 0}); setQuote(null); }}
                  className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-blue-600 mt-1">Override the delivery fee for this quote</p>
              </div>
            </div>

            {/* Discount */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.discount}
                onChange={(e) => { setFormData({...formData, discount: parseFloat(e.target.value) || 0}); setQuote(null); }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Enter discount percentage (e.g., 10 for 10% off)</p>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Documents</h2>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-4xl mb-2">📄</div>
                <div className="font-medium text-gray-700">Click to upload documents</div>
                <div className="text-sm text-gray-500">PDF, DOC, DOCX, JPG, PNG</div>
              </label>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">📎</span>
                      <div>
                        <div className="font-medium text-sm">{file.name}</div>
                        <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Special Instructions */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (optional)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                rows={3}
                value={formData.special_instructions}
                onChange={(e) => setFormData({...formData, special_instructions: e.target.value})}
                placeholder="Any special requirements or notes..."
              />
            </div>
          </div>
        </div>

        {/* Right Column - Quote Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow p-6 sticky top-6">
            <h2 className="text-lg font-bold text-teal-700 mb-4">Quote Summary</h2>

            {quote ? (
              <>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service</span>
                    <span className="font-medium">{quote.service}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pages</span>
                    <span className="font-medium">{quote.pages}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Turnaround</span>
                    <span className="font-medium">{quote.turnaround}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-medium">{quote.delivery}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${quote.subtotal.toFixed(2)}</span>
                  </div>
                  {quote.turnaround_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rush Fee</span>
                      <span className="text-orange-600">+${quote.turnaround_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {quote.delivery_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="text-blue-600">+${quote.delivery_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {quote.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount ({quote.discount_percent}%)</span>
                      <span className="text-green-600">-${quote.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-2xl text-teal-600">${quote.total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={sendQuote}
                  disabled={sending}
                  className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 font-medium"
                >
                  {sending ? 'Sending...' : '📧 Send Quote to Client'}
                </button>
              </>
            ) : (
              <>
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">📊</div>
                  <p>Upload documents and click Calculate to see the quote</p>
                </div>

                <button
                  onClick={calculateQuote}
                  disabled={calculating || uploadedFiles.length === 0}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                >
                  {calculating ? 'Calculating...' : '🔢 Calculate Quote'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== FOLLOW-UPS PAGE ====================
const FollowupsPage = ({ adminKey }) => {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [followupData, setFollowupData] = useState(null);
  const [error, setError] = useState('');

  const fetchFollowupStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/quotes/followup-status?admin_key=${adminKey}`);
      setFollowupData(response.data);
    } catch (err) {
      setError('Failed to load follow-up data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const processFollowups = async () => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/admin/quotes/process-followups?admin_key=${adminKey}`);
      const result = response.data;
      alert(`Follow-ups processed!\n\nReminders sent: ${result.reminders_sent}\nMarked as lost: ${result.marked_lost}${result.errors?.length > 0 ? `\nErrors: ${result.errors.length}` : ''}`);
      fetchFollowupStatus();
    } catch (err) {
      alert('Failed to process follow-ups. Check console for details.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchFollowupStatus();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Quote Follow-up System</h1>
            <p className="text-gray-600 text-sm">Automated reminders for unconverted quotes</p>
          </div>
          <button
            onClick={processFollowups}
            disabled={processing}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {processing ? (
              <>
                <span className="animate-spin">⏳</span>
                Processing...
              </>
            ) : (
              <>
                <span>🚀</span>
                Process Follow-ups Now
              </>
            )}
          </button>
        </div>

        {/* Summary Cards */}
        {followupData?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-3xl font-bold text-gray-600">{followupData.summary.total_pending}</div>
              <div className="text-xs text-gray-500">Pending (0-3 days)</div>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow p-4 text-center border border-yellow-200">
              <div className="text-3xl font-bold text-yellow-600">{followupData.summary.needs_first_reminder}</div>
              <div className="text-xs text-yellow-700">Need 1st Reminder</div>
            </div>
            <div className="bg-orange-50 rounded-lg shadow p-4 text-center border border-orange-200">
              <div className="text-3xl font-bold text-orange-600">{followupData.summary.needs_second_reminder}</div>
              <div className="text-xs text-orange-700">Need 2nd Reminder (10%)</div>
            </div>
            <div className="bg-red-50 rounded-lg shadow p-4 text-center border border-red-200">
              <div className="text-3xl font-bold text-red-600">{followupData.summary.needs_third_reminder}</div>
              <div className="text-xs text-red-700">Need 3rd Reminder (15%)</div>
            </div>
            <div className="bg-gray-100 rounded-lg shadow p-4 text-center">
              <div className="text-3xl font-bold text-gray-500">{followupData.summary.marked_lost}</div>
              <div className="text-xs text-gray-500">Marked Lost</div>
            </div>
          </div>
        )}

        {/* Schedule Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Follow-up Schedule</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-blue-600 font-bold">Day 3</div>
              <div className="text-blue-700">1st Reminder</div>
              <div className="text-blue-500 text-xs">No discount</div>
            </div>
            <div className="text-center">
              <div className="text-blue-600 font-bold">Day 7</div>
              <div className="text-blue-700">2nd Reminder</div>
              <div className="text-blue-500 text-xs">10% discount</div>
            </div>
            <div className="text-center">
              <div className="text-blue-600 font-bold">Day 14</div>
              <div className="text-blue-700">3rd Reminder</div>
              <div className="text-blue-500 text-xs">15% discount</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600 font-bold">Day 21</div>
              <div className="text-gray-700">Mark as Lost</div>
              <div className="text-gray-500 text-xs">Close quote</div>
            </div>
          </div>
        </div>

        {/* Quote Orders Table */}
        {followupData?.quote_orders?.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-800">Quote Orders ({followupData.quote_orders.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Quote #</th>
                    <th className="px-4 py-2 text-left">Client</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-center">Days</th>
                    <th className="px-4 py-2 text-center">Reminders</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Next Action</th>
                  </tr>
                </thead>
                <tbody>
                  {followupData.quote_orders.map((order, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{order.order_number}</td>
                      <td className="px-4 py-2">{order.client_name}</td>
                      <td className="px-4 py-2 text-gray-600">{order.client_email}</td>
                      <td className="px-4 py-2 text-right">${(order.total_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">{order.days_since_creation}</td>
                      <td className="px-4 py-2 text-center">{order.followup_count || 0}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'Quote - Lost' ? 'bg-gray-200 text-gray-700' :
                          order.status === 'Quote' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{order.next_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Abandoned Quotes Table */}
        {followupData?.abandoned_quotes?.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-800">Abandoned Quotes ({followupData.abandoned_quotes.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-center">Days</th>
                    <th className="px-4 py-2 text-center">Reminders</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Next Action</th>
                  </tr>
                </thead>
                <tbody>
                  {followupData.abandoned_quotes.map((quote, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{quote.name}</td>
                      <td className="px-4 py-2 text-gray-600">{quote.email}</td>
                      <td className="px-4 py-2 text-right">${(quote.total_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">{quote.days_since_creation}</td>
                      <td className="px-4 py-2 text-center">{quote.reminder_count || 0}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          quote.status === 'lost' ? 'bg-gray-200 text-gray-700' :
                          quote.status === 'recovered' ? 'bg-green-100 text-green-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {quote.status || 'abandoned'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{quote.next_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(!followupData?.quote_orders?.length && !followupData?.abandoned_quotes?.length) && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-gray-700">All caught up!</h3>
            <p className="text-gray-500">No quotes requiring follow-up at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== SETTINGS PAGE ====================
const SettingsPage = ({ adminKey }) => {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // QuickBooks Integration State
  const [qbStatus, setQbStatus] = useState({ connected: false, company_name: null, loading: true });
  const [qbConnecting, setQbConnecting] = useState(false);

  // Check QuickBooks status on mount
  useEffect(() => {
    const checkQBStatus = async () => {
      try {
        const response = await axios.get(`${API}/quickbooks/status?admin_key=${adminKey}`);
        setQbStatus({ ...response.data, loading: false });
      } catch (err) {
        console.error('Failed to check QuickBooks status:', err);
        setQbStatus({ connected: false, loading: false, error: err.message });
      }
    };
    checkQBStatus();

    // Listen for OAuth callback message
    const handleMessage = (event) => {
      if (event.data?.type === 'quickbooks_connected' && event.data?.success) {
        checkQBStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [adminKey]);

  const connectQuickBooks = async () => {
    setQbConnecting(true);
    try {
      const response = await axios.get(`${API}/quickbooks/connect?admin_key=${adminKey}`);
      if (response.data.authorization_url) {
        // Open QuickBooks authorization in a popup
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        window.open(
          response.data.authorization_url,
          'QuickBooks Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    } catch (err) {
      console.error('Failed to connect to QuickBooks:', err);
      alert('Failed to start QuickBooks connection: ' + (err.response?.data?.detail || err.message));
    } finally {
      setQbConnecting(false);
    }
  };

  const disconnectQuickBooks = async () => {
    if (!window.confirm('Are you sure you want to disconnect QuickBooks?')) return;
    try {
      await axios.post(`${API}/quickbooks/disconnect?admin_key=${adminKey}`);
      setQbStatus({ connected: false, company_name: null, loading: false });
    } catch (err) {
      console.error('Failed to disconnect QuickBooks:', err);
      alert('Failed to disconnect: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Export functions
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const exportProjects = async (format = 'csv') => {
    setExporting(true);
    setExportProgress('Fetching projects...');
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      const projects = response.data.orders || response.data || [];
      const exportData = projects.map(p => ({
        order_number: p.order_number,
        client_name: p.client_name,
        client_email: p.client_email,
        document_type: p.document_type || p.service_type,
        source_language: p.translate_from,
        target_language: p.translate_to,
        status: p.translation_status,
        payment_status: p.payment_status,
        total_price: p.total_price,
        deadline: p.deadline,
        created_at: p.created_at,
        assigned_pm: p.assigned_pm_name,
        assigned_translator: p.assigned_translator_name
      }));
      if (format === 'csv') exportToCSV(exportData, 'projects');
      else exportToJSON(exportData, 'projects');
      setExportProgress('✅ Projects exported!');
    } catch (err) {
      setExportProgress('❌ Error exporting projects');
      console.error(err);
    } finally {
      setExporting(false);
      setTimeout(() => setExportProgress(''), 3000);
    }
  };

  const exportClients = async (format = 'csv') => {
    setExporting(true);
    setExportProgress('Fetching client data...');
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      const projects = response.data.orders || response.data || [];
      // Get unique clients
      const clientsMap = new Map();
      projects.forEach(p => {
        if (p.client_email && !clientsMap.has(p.client_email)) {
          clientsMap.set(p.client_email, {
            name: p.client_name,
            email: p.client_email,
            phone: p.client_phone || '',
            total_orders: 0,
            total_spent: 0
          });
        }
        if (p.client_email) {
          const client = clientsMap.get(p.client_email);
          client.total_orders++;
          client.total_spent += p.total_price || 0;
        }
      });
      const clients = Array.from(clientsMap.values());
      if (format === 'csv') exportToCSV(clients, 'clients');
      else exportToJSON(clients, 'clients');
      setExportProgress('✅ Clients exported!');
    } catch (err) {
      setExportProgress('❌ Error exporting clients');
      console.error(err);
    } finally {
      setExporting(false);
      setTimeout(() => setExportProgress(''), 3000);
    }
  };

  const exportTranslators = async (format = 'csv') => {
    setExporting(true);
    setExportProgress('Fetching translators...');
    try {
      const response = await axios.get(`${API}/admin/users/by-role/translator?admin_key=${adminKey}`);
      const translators = response.data || [];
      const exportData = translators.map(t => ({
        name: t.name,
        email: t.email,
        language_pairs: t.language_pairs,
        rate_per_page: t.rate_per_page,
        rate_per_word: t.rate_per_word,
        is_active: t.is_active
      }));
      if (format === 'csv') exportToCSV(exportData, 'translators');
      else exportToJSON(exportData, 'translators');
      setExportProgress('✅ Translators exported!');
    } catch (err) {
      setExportProgress('❌ Error exporting translators');
      console.error(err);
    } finally {
      setExporting(false);
      setTimeout(() => setExportProgress(''), 3000);
    }
  };

  const exportFinancialReport = async (format = 'csv') => {
    setExporting(true);
    setExportProgress('Generating financial report...');
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      const projects = response.data.orders || response.data || [];
      const reportData = projects.map(p => ({
        order_number: p.order_number,
        client_name: p.client_name,
        document_type: p.document_type || p.service_type,
        base_price: p.base_price || 0,
        urgency_fee: p.urgency_fee || 0,
        total_price: p.total_price || 0,
        payment_status: p.payment_status,
        payment_method: p.payment_method,
        created_at: p.created_at,
        delivered_at: p.delivered_at
      }));
      if (format === 'csv') exportToCSV(reportData, 'financial_report');
      else exportToJSON(reportData, 'financial_report');
      setExportProgress('✅ Financial report exported!');
    } catch (err) {
      setExportProgress('❌ Error exporting report');
      console.error(err);
    } finally {
      setExporting(false);
      setTimeout(() => setExportProgress(''), 3000);
    }
  };

  const createFullBackup = async () => {
    setExporting(true);
    setExportProgress('Creating full backup...');
    try {
      // Fetch all data
      setExportProgress('Fetching projects...');
      const ordersRes = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);

      setExportProgress('Fetching users...');
      const usersRes = await axios.get(`${API}/admin/users?admin_key=${adminKey}`);

      setExportProgress('Fetching translators...');
      const translatorsRes = await axios.get(`${API}/admin/users/by-role/translator?admin_key=${adminKey}`);

      const backupData = {
        backup_date: new Date().toISOString(),
        backup_version: '1.0',
        data: {
          projects: ordersRes.data.orders || ordersRes.data || [],
          users: usersRes.data || [],
          translators: translatorsRes.data || []
        },
        stats: {
          total_projects: (ordersRes.data.orders || ordersRes.data || []).length,
          total_users: (usersRes.data || []).length,
          total_translators: (translatorsRes.data || []).length
        }
      };

      exportToJSON(backupData, 'full_backup');
      setExportProgress('✅ Full backup created!');
    } catch (err) {
      setExportProgress('❌ Error creating backup');
      console.error(err);
    } finally {
      setExporting(false);
      setTimeout(() => setExportProgress(''), 3000);
    }
  };

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
              <label className="block text-gray-500 mb-1">API URL</label>
              <input type="text" className="w-full px-2 py-1.5 border rounded bg-gray-50" value={API} readOnly />
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
                <span>Resend Email</span>
              </div>
              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[10px] font-medium">Connected</span>
            </div>
            {/* QuickBooks Integration */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center">
                <span className="mr-2">📊</span>
                <div>
                  <span>QuickBooks Online</span>
                  {qbStatus.connected && qbStatus.company_name && (
                    <span className="text-[10px] text-gray-500 ml-1">({qbStatus.company_name})</span>
                  )}
                </div>
              </div>
              {qbStatus.loading ? (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">Checking...</span>
              ) : qbStatus.connected ? (
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[10px] font-medium">Connected</span>
                  <button
                    onClick={disconnectQuickBooks}
                    className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] hover:bg-red-200"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectQuickBooks}
                  disabled={qbConnecting}
                  className="px-3 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 disabled:bg-gray-300"
                >
                  {qbConnecting ? 'Connecting...' : 'Connect'}
                </button>
              )}
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

      {/* Export & Backup Section */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-sm font-bold text-gray-800">Export & Backup</h2>
          <p className="text-xs text-gray-500 mt-1">Export data or create a full system backup</p>
        </div>
        <div className="p-4">
          {exportProgress && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              {exportProgress}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Export Projects */}
            <div className="border rounded p-3">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Export Projects</h3>
              <p className="text-[10px] text-gray-500 mb-3">Download all project data including status, client info, and pricing</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportProjects('csv')}
                  disabled={exporting}
                  className="flex-1 px-2 py-1.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:bg-gray-300"
                >
                  CSV
                </button>
                <button
                  onClick={() => exportProjects('json')}
                  disabled={exporting}
                  className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                  JSON
                </button>
              </div>
            </div>

            {/* Export Clients */}
            <div className="border rounded p-3">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Export Clients</h3>
              <p className="text-[10px] text-gray-500 mb-3">Download client contact info, phone numbers, and order history</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportClients('csv')}
                  disabled={exporting}
                  className="flex-1 px-2 py-1.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:bg-gray-300"
                >
                  CSV
                </button>
                <button
                  onClick={() => exportClients('json')}
                  disabled={exporting}
                  className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                  JSON
                </button>
              </div>
            </div>

            {/* Export Translators */}
            <div className="border rounded p-3">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Export Translators</h3>
              <p className="text-[10px] text-gray-500 mb-3">Download translator profiles, language pairs, and rates</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportTranslators('csv')}
                  disabled={exporting}
                  className="flex-1 px-2 py-1.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:bg-gray-300"
                >
                  CSV
                </button>
                <button
                  onClick={() => exportTranslators('json')}
                  disabled={exporting}
                  className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                  JSON
                </button>
              </div>
            </div>

            {/* Export Financial Report */}
            <div className="border rounded p-3">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Financial Report</h3>
              <p className="text-[10px] text-gray-500 mb-3">Download financial data including pricing and payment status</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportFinancialReport('csv')}
                  disabled={exporting}
                  className="flex-1 px-2 py-1.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:bg-gray-300"
                >
                  CSV
                </button>
                <button
                  onClick={() => exportFinancialReport('json')}
                  disabled={exporting}
                  className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                  JSON
                </button>
              </div>
            </div>
          </div>

          {/* Full Backup */}
          <div className="mt-4 border-t pt-4">
            <div className="border rounded p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-gray-700">Full System Backup</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Create a complete backup of all projects, users, and translators in JSON format</p>
                </div>
                <button
                  onClick={createFullBackup}
                  disabled={exporting}
                  className="px-4 py-2 bg-slate-700 text-white text-xs rounded hover:bg-slate-800 disabled:bg-gray-300 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Create Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== TRANSLATOR LOGIN (Blue Design) ====================
const TranslatorLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/auth/login`, { email, password });
      if (response.data && response.data.token) {
        // Only allow translators to login here
        if (response.data.role !== 'translator') {
          setError('This portal is for translators only. Please use the admin panel.');
          setLoading(false);
          return;
        }
        onLogin({
          adminKey: response.data.token,
          token: response.data.token,
          role: response.data.role,
          name: response.data.name,
          email: response.data.email,
          id: response.data.id
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await axios.post(`${API}/admin/auth/forgot-password`, { email: resetEmail });
      setResetSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Blue Header with Globe */}
        <div className="bg-gradient-to-b from-blue-500 to-blue-600 py-8 px-4 text-center">
          {/* Globe Icon */}
          <div className="mb-3">
            <div className="w-16 h-16 mx-auto">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="#4FC3F7"/>
                <ellipse cx="50" cy="50" rx="18" ry="45" stroke="white" strokeWidth="1.5" fill="none"/>
                <line x1="5" y1="50" x2="95" y2="50" stroke="white" strokeWidth="1.5"/>
                <ellipse cx="50" cy="28" rx="38" ry="10" stroke="white" strokeWidth="1.5" fill="none"/>
                <ellipse cx="50" cy="72" rx="38" ry="10" stroke="white" strokeWidth="1.5" fill="none"/>
                {/* Land masses */}
                <path d="M28 32 Q34 26 46 30 Q52 34 48 44 Q42 48 34 44 Q28 38 28 32Z" fill="#4CAF50"/>
                <path d="M56 22 Q68 18 76 26 Q80 36 72 42 Q62 40 54 34 Q50 28 56 22Z" fill="#4CAF50"/>
                <path d="M22 54 Q30 50 42 54 Q48 60 44 70 Q34 74 26 68 Q18 62 22 54Z" fill="#4CAF50"/>
                <path d="M58 56 Q70 52 80 60 Q84 70 76 76 Q64 78 56 72 Q52 64 58 56Z" fill="#4CAF50"/>
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-white">Legacy Translations</h1>
        </div>

        {/* Form */}
        <div className="p-8">
          {showForgotPassword ? (
            // Forgot Password Form
            <div>
              <h2 className="text-lg font-medium text-gray-800 text-center mb-6">Reset Password</h2>

              {resetSent ? (
                <div className="text-center">
                  <div className="text-green-600 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">If an account exists with this email, you will receive a password reset link.</p>
                  <button
                    onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(''); }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>

                  {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 font-medium transition-all"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setError(''); }}
                    className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Back to Login
                  </button>
                </form>
              )}
            </div>
          ) : (
            // Login Form
            <div>
              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 font-medium transition-all"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => { setShowForgotPassword(true); setError(''); }}
                  className="text-blue-600 hover:text-blue-700 text-sm hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== TRANSLATION TOOL PAGE (Standalone) ====================
const TranslationToolPage = ({ adminKey, onLogout, user }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 100 100" fill="white">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3"/>
              <ellipse cx="50" cy="50" rx="20" ry="45" stroke="currentColor" strokeWidth="2" fill="none"/>
              <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div>
            <div className="font-bold">Translation Tool</div>
            <div className="text-xs text-blue-200">Legacy Translations</div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-blue-200">
            Welcome, <span className="text-white font-medium">{user?.name || 'Translator'}</span>
          </span>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      {/* Translation Workspace */}
      <TranslationWorkspace adminKey={adminKey} user={user} />
    </div>
  );
};

// ==================== REVIEW PAGE (Pending Translations & Security) ====================
const ReviewPage = ({ adminKey, user }) => {
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [suspiciousUsers, setSuspiciousUsers] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedUserIpHistory, setSelectedUserIpHistory] = useState(null);
  const [ipHistoryData, setIpHistoryData] = useState([]);
  const [activeSection, setActiveSection] = useState('submissions'); // 'submissions' | 'security'
  const [revisionNote, setRevisionNote] = useState('');

  // New states for side-by-side view
  const [fullScreenReview, setFullScreenReview] = useState(false);
  const [editedTranslation, setEditedTranslation] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [filterPM, setFilterPM] = useState('all'); // 'all' or PM id
  const [pmList, setPmList] = useState([]);

  const isAdmin = user?.role === 'admin';
  const isPM = user?.role === 'pm';

  const fetchPendingSubmissions = async () => {
    try {
      // Admin sees all, PM sees only their assigned projects
      const endpoint = isAdmin
        ? `${API}/admin/translations/pending-review?admin_key=${adminKey}`
        : `${API}/admin/translations/pending-review?admin_key=${adminKey}&pm_id=${user?.id}`;
      const response = await axios.get(endpoint);
      setPendingSubmissions(response.data || []);

      // Extract unique PMs for filter dropdown (admin only)
      if (isAdmin && response.data) {
        const pms = [...new Set(response.data.map(s => s.assigned_pm_name).filter(Boolean))];
        setPmList(pms);
      }
    } catch (err) {
      console.error('Failed to fetch pending submissions:', err);
    }
  };

  const fetchSuspiciousUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/security/suspicious-users?admin_key=${adminKey}&token=${user?.token}`);
      setSuspiciousUsers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch suspicious users:', err);
    }
  };

  const fetchLoginAttempts = async () => {
    try {
      const response = await axios.get(`${API}/admin/login-attempts?admin_key=${adminKey}&token=${user?.token}&limit=50`);
      setLoginAttempts(response.data || []);
    } catch (err) {
      console.error('Failed to fetch login attempts:', err);
    }
  };

  const fetchUserIpHistory = async (userId) => {
    try {
      const response = await axios.get(`${API}/admin/users/${userId}/ip-history?admin_key=${adminKey}&token=${user?.token}`);
      setIpHistoryData(response.data || []);
      setSelectedUserIpHistory(userId);
    } catch (err) {
      console.error('Failed to fetch IP history:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchPendingSubmissions();
        if (isAdmin) {
          await Promise.all([
            fetchSuspiciousUsers(),
            fetchLoginAttempts()
          ]);
        }
      } catch (err) {
        console.error('Error loading review data:', err);
      } finally {
        setLoading(false);
      }
    };
    if (adminKey) {
      loadData();
    }
  }, [adminKey]);

  // Load translation content when submission is selected
  useEffect(() => {
    if (selectedSubmission) {
      setEditedTranslation(selectedSubmission.translation_html || selectedSubmission.translated_text || '');
      setCurrentImageIndex(0);
    }
  }, [selectedSubmission]);

  const handleApproveSubmission = async (submissionId) => {
    try {
      // If translation was edited, save it first
      if (editedTranslation !== (selectedSubmission.translation_html || selectedSubmission.translated_text)) {
        await axios.put(`${API}/admin/translations/submission/${submissionId}/update?admin_key=${adminKey}`, {
          translation_html: editedTranslation
        });
      }

      await axios.post(`${API}/admin/translations/submission/${submissionId}/approve?admin_key=${adminKey}&token=${user?.token}`);
      fetchPendingSubmissions();
      setSelectedSubmission(null);
      setFullScreenReview(false);
      alert('Translation approved and sent to client!');
    } catch (err) {
      alert('Error approving: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRequestRevision = async (submissionId) => {
    if (!revisionNote.trim()) {
      alert('Please add a note explaining the corrections needed.');
      return;
    }
    try {
      await axios.post(`${API}/admin/translations/submission/${submissionId}/request-revision?admin_key=${adminKey}&token=${user?.token}`, {
        note: revisionNote
      });
      fetchPendingSubmissions();
      setSelectedSubmission(null);
      setRevisionNote('');
      setFullScreenReview(false);
      alert('Revision requested from translator!');
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSaveEdits = async () => {
    if (!selectedSubmission) return;
    setSaving(true);
    try {
      await axios.put(`${API}/admin/translations/submission/${selectedSubmission._id}/update?admin_key=${adminKey}`, {
        translation_html: editedTranslation
      });
      alert('Changes saved!');
      fetchPendingSubmissions();
    } catch (err) {
      alert('Error saving: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Filter submissions based on selected PM
  const filteredSubmissions = filterPM === 'all'
    ? pendingSubmissions
    : pendingSubmissions.filter(s => s.assigned_pm_name === filterPM);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Full-screen side-by-side review mode
  if (fullScreenReview && selectedSubmission) {
    const originalImages = selectedSubmission.original_images || [];
    const hasMultiplePages = originalImages.length > 1;

    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setFullScreenReview(false)}
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
            >
              ← Back to List
            </button>
            <span className="font-bold">{selectedSubmission.order_number}</span>
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-300">Translator: {selectedSubmission.translator_name}</span>
            {selectedSubmission.assigned_pm_name && (
              <>
                <span className="text-gray-400">|</span>
                <span className="text-sm text-gray-300">PM: {selectedSubmission.assigned_pm_name}</span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveEdits}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 rounded hover:bg-blue-700 text-sm disabled:bg-gray-600"
            >
              {saving ? 'Saving...' : 'Save Edits'}
            </button>
            <button
              onClick={() => handleApproveSubmission(selectedSubmission._id)}
              className="px-4 py-1.5 bg-green-600 rounded hover:bg-green-700 text-sm"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => {
                const note = prompt('Enter revision note for translator:');
                if (note) {
                  setRevisionNote(note);
                  handleRequestRevision(selectedSubmission._id);
                }
              }}
              className="px-4 py-1.5 bg-orange-500 rounded hover:bg-orange-600 text-sm"
            >
              ↻ Request Revision
            </button>
          </div>
        </div>

        {/* Side-by-side content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Original document */}
          <div className="w-1/2 flex flex-col border-r border-gray-700">
            <div className="bg-gray-800 text-white px-4 py-2 text-sm font-medium flex items-center justify-between">
              <span>Original Document</span>
              {hasMultiplePages && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                    disabled={currentImageIndex === 0}
                    className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50"
                  >
                    ←
                  </button>
                  <span className="text-xs">Page {currentImageIndex + 1} of {originalImages.length}</span>
                  <button
                    onClick={() => setCurrentImageIndex(Math.min(originalImages.length - 1, currentImageIndex + 1))}
                    disabled={currentImageIndex === originalImages.length - 1}
                    className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {originalImages.length > 0 ? (
                <img
                  src={originalImages[currentImageIndex]?.data || originalImages[currentImageIndex]}
                  alt={`Original page ${currentImageIndex + 1}`}
                  className="max-w-full mx-auto shadow-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No original images available
                </div>
              )}
            </div>
          </div>

          {/* Right panel - Translation (editable) */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-gray-800 text-white px-4 py-2 text-sm font-medium flex items-center justify-between">
              <span>Translation (Editable)</span>
              <span className="text-xs text-gray-400">Click to edit</span>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              <div
                contentEditable
                className="min-h-full p-6 outline-none prose max-w-none"
                dangerouslySetInnerHTML={{ __html: editedTranslation }}
                onBlur={(e) => setEditedTranslation(e.target.innerHTML)}
                style={{ minHeight: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Footer with notes */}
        {selectedSubmission.translator_notes && (
          <div className="bg-gray-800 text-white px-4 py-2 text-xs">
            <span className="text-gray-400">Translator notes:</span> {selectedSubmission.translator_notes}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Review Panel</h1>
            <p className="text-xs text-gray-500">
              {isAdmin
                ? 'Review translations from all PMs and translators'
                : 'Review translations assigned to you'}
            </p>
          </div>
          {/* PM Filter (Admin only) */}
          {isAdmin && pmList.length > 0 && (
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-500">Filter by PM:</label>
              <select
                value={filterPM}
                onChange={(e) => setFilterPM(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">All PMs ({pendingSubmissions.length})</option>
                {pmList.map(pm => (
                  <option key={pm} value={pm}>
                    {pm} ({pendingSubmissions.filter(s => s.assigned_pm_name === pm).length})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveSection('submissions')}
          className={`px-4 py-2 text-sm font-medium rounded ${activeSection === 'submissions' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        >
          Pending Reviews ({filteredSubmissions.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveSection('security')}
            className={`px-4 py-2 text-sm font-medium rounded ${activeSection === 'security' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Security {suspiciousUsers.length > 0 && <span className="ml-1 bg-red-500 text-white px-1.5 rounded-full text-xs">{suspiciousUsers.length}</span>}
          </button>
        )}
      </div>

      {/* Submissions Section */}
      {activeSection === 'submissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pending submissions list */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Translations to Review</h2>
            {filteredSubmissions.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending translations to review.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredSubmissions.map((sub) => (
                  <div
                    key={sub._id}
                    onClick={() => setSelectedSubmission(sub)}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${selectedSubmission?._id === sub._id ? 'border-teal-500 bg-teal-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{sub.order_number}</div>
                        <div className="text-xs text-gray-500">Translator: {sub.translator_name}</div>
                        {isAdmin && sub.assigned_pm_name && (
                          <div className="text-xs text-blue-600">PM: {sub.assigned_pm_name}</div>
                        )}
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                        Pending
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected submission details */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
            {selectedSubmission ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-gray-700">{selectedSubmission.order_number}</h2>
                  <button
                    onClick={() => setFullScreenReview(true)}
                    className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Open Side-by-Side Review
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2 text-xs">
                    <div><span className="text-gray-500">Translator:</span> {selectedSubmission.translator_name}</div>
                    <div><span className="text-gray-500">Client:</span> {selectedSubmission.client_name || 'N/A'}</div>
                    <div><span className="text-gray-500">Submitted:</span> {new Date(selectedSubmission.submitted_at).toLocaleString()}</div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div><span className="text-gray-500">Pages:</span> {selectedSubmission.pages_count || 'N/A'}</div>
                    {isAdmin && <div><span className="text-gray-500">Assigned PM:</span> {selectedSubmission.assigned_pm_name || 'N/A'}</div>}
                    <div><span className="text-gray-500">Document:</span> {selectedSubmission.document_type || 'N/A'}</div>
                  </div>
                </div>

                {selectedSubmission.translator_notes && (
                  <div className="bg-blue-50 p-3 rounded mb-4">
                    <div className="text-xs font-medium text-blue-700 mb-1">Translator Notes:</div>
                    <div className="text-sm text-blue-800">{selectedSubmission.translator_notes}</div>
                  </div>
                )}

                {/* Preview */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Original preview */}
                  <div className="border rounded p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2">Original (Preview)</div>
                    {selectedSubmission.original_images?.length > 0 ? (
                      <img
                        src={selectedSubmission.original_images[0]?.data || selectedSubmission.original_images[0]}
                        alt="Original"
                        className="w-full h-40 object-contain bg-gray-100"
                      />
                    ) : (
                      <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                        No preview
                      </div>
                    )}
                  </div>
                  {/* Translation preview */}
                  <div className="border rounded p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2">Translation (Preview)</div>
                    <div
                      className="h-40 overflow-hidden bg-gray-50 p-2 text-xs"
                      dangerouslySetInnerHTML={{ __html: selectedSubmission.translation_html || selectedSubmission.translated_text || '<em>No translation content</em>' }}
                    />
                  </div>
                </div>

                {/* Revision note input */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-1">Revision note (if needed):</label>
                  <textarea
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    className="w-full border rounded p-2 text-sm"
                    rows={2}
                    placeholder="Describe corrections needed..."
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveSubmission(selectedSubmission._id)}
                    className="flex-1 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                  >
                    ✓ Approve & Send to Client
                  </button>
                  <button
                    onClick={() => handleRequestRevision(selectedSubmission._id)}
                    className="flex-1 py-2 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600"
                  >
                    ↻ Request Revision
                  </button>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-sm text-center py-16">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Select a translation to review
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Section (Admin only) */}
      {activeSection === 'security' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Suspicious Users */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Suspicious Users (Multiple IPs)</h2>
            <p className="text-xs text-gray-500 mb-3">Users who accessed from more than 3 different IPs.</p>
            {suspiciousUsers.length === 0 ? (
              <p className="text-gray-500 text-sm">No suspicious users detected.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {suspiciousUsers.map((usr) => (
                  <div
                    key={usr._id}
                    className="p-3 border rounded bg-red-50 border-red-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{usr.name}</div>
                        <div className="text-xs text-gray-500">{usr.email}</div>
                      </div>
                      <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded">
                        {usr.unique_ips} IPs
                      </span>
                    </div>
                    <button
                      onClick={() => fetchUserIpHistory(usr._id)}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      View IP history →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* IP History / Login Attempts */}
          <div className="bg-white rounded-lg shadow p-4">
            {selectedUserIpHistory ? (
              <>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-bold text-gray-700">IP History</h2>
                  <button
                    onClick={() => setSelectedUserIpHistory(null)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {ipHistoryData.map((entry, idx) => (
                    <div key={idx} className="p-2 border rounded text-xs">
                      <div className="font-mono">{entry.ip}</div>
                      <div className="text-gray-500">{entry.user_agent}</div>
                      <div className="text-gray-400">{new Date(entry.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-sm font-bold text-gray-700 mb-3">Recent Logins</h2>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {loginAttempts.map((attempt, idx) => (
                    <div key={idx} className="p-2 border rounded text-xs flex justify-between items-center">
                      <div>
                        <div className="font-medium">{attempt.user_name || attempt.email}</div>
                        <div className="font-mono text-gray-500">{attempt.ip}</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded ${attempt.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {attempt.success ? 'OK' : 'Failed'}
                        </span>
                        <div className="text-gray-400 mt-1">{new Date(attempt.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== USERS MANAGEMENT PAGE ====================
const UsersPage = ({ adminKey, user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'translator', rate_per_page: '', rate_per_word: '', language_pairs: '' });
  const [creating, setCreating] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userDocuments, setUserDocuments] = useState({});
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingUser, setSavingUser] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isPM = user?.role === 'pm';

  // Document types for translators
  const TRANSLATOR_DOC_TYPES = [
    { value: 'id_document', label: 'Documento de Identidade (RG/ID)' },
    { value: 'cpf', label: 'CPF' },
    { value: 'address_proof', label: 'Comprovante de Residência' },
    { value: 'contract', label: 'Contrato de Prestação de Serviço' },
    { value: 'bank_info', label: 'Dados Bancários' },
    { value: 'certification', label: 'Certificação/Diploma' },
    { value: 'portfolio', label: 'Portfólio/Amostras' },
    { value: 'other', label: 'Outro Documento' }
  ];

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

  // Fetch documents for a specific user
  const fetchUserDocuments = async (userId) => {
    try {
      const response = await axios.get(`${API}/admin/users/${userId}/documents?admin_key=${adminKey}`);
      setUserDocuments(prev => ({ ...prev, [userId]: response.data.documents || [] }));
    } catch (err) {
      console.error('Error fetching user documents:', err);
      setUserDocuments(prev => ({ ...prev, [userId]: [] }));
    }
  };

  // Start editing a user
  const startEditUser = (u) => {
    setEditingUser(u.id);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      role: u.role || '',
      rate_per_page: u.rate_per_page || '',
      rate_per_word: u.rate_per_word || '',
      language_pairs: u.language_pairs || ''
    });
  };

  // Cancel editing
  const cancelEditUser = () => {
    setEditingUser(null);
    setEditForm({});
  };

  // Save user edits
  const saveUserEdits = async (userId) => {
    setSavingUser(true);
    try {
      const updateData = {};
      if (editForm.name) updateData.name = editForm.name;
      if (editForm.email) updateData.email = editForm.email;
      if (editForm.role) updateData.role = editForm.role;
      if (editForm.rate_per_page !== '') updateData.rate_per_page = parseFloat(editForm.rate_per_page);
      if (editForm.rate_per_word !== '') updateData.rate_per_word = parseFloat(editForm.rate_per_word);
      if (editForm.language_pairs !== undefined) updateData.language_pairs = editForm.language_pairs;

      await axios.put(`${API}/admin/users/${userId}?admin_key=${adminKey}`, updateData);
      await fetchUsers();
      setEditingUser(null);
      setEditForm({});
      alert('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error('Error updating user:', err);
      alert(err.response?.data?.detail || 'Erro ao atualizar perfil');
    } finally {
      setSavingUser(false);
    }
  };

  // Upload document for a user
  const handleUploadDocument = async (userId, file, docType) => {
    if (!file) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);
      await axios.post(`${API}/admin/users/${userId}/documents?admin_key=${adminKey}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchUserDocuments(userId);
      alert('Documento enviado com sucesso!');
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Erro ao enviar documento');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Download document
  const handleDownloadDocument = async (userId, docId, filename) => {
    try {
      const response = await axios.get(`${API}/admin/users/${userId}/documents/${docId}/download?admin_key=${adminKey}`);
      const link = document.createElement('a');
      link.href = `data:${response.data.content_type};base64,${response.data.file_data}`;
      link.download = filename;
      link.click();
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Erro ao baixar documento');
    }
  };

  // Delete document
  const handleDeleteDocument = async (userId, docId) => {
    if (!window.confirm('Excluir este documento?')) return;
    try {
      await axios.delete(`${API}/admin/users/${userId}/documents/${docId}?admin_key=${adminKey}`);
      await fetchUserDocuments(userId);
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Erro ao excluir documento');
    }
  };

  // Toggle expanded user profile
  const toggleExpandUser = async (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userDocuments[userId]) {
        await fetchUserDocuments(userId);
      }
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      // Build user data - password will be set by user via invitation email
      const userData = {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        rate_per_page: newUser.rate_per_page ? parseFloat(newUser.rate_per_page) : null,
        rate_per_word: newUser.rate_per_word ? parseFloat(newUser.rate_per_word) : null,
        language_pairs: newUser.language_pairs || null
      };
      const response = await axios.post(`${API}/admin/auth/register?admin_key=${adminKey}`, userData);

      // Show invitation link for manual sharing (email may go to spam)
      if (response.data?.invitation_link) {
        const copyLink = window.confirm(
          `✅ ${response.data.message}\n\n` +
          `⚠️ O email pode cair no spam. Copiar o link de convite?\n\n` +
          `Link: ${response.data.invitation_link}`
        );
        if (copyLink) {
          navigator.clipboard.writeText(response.data.invitation_link);
          alert('Link copiado! Envie para o usuário por WhatsApp ou outro meio.');
        }
      } else {
        alert(response.data?.message || 'User created!');
      }

      setNewUser({ name: '', email: '', role: 'translator', rate_per_page: '', rate_per_word: '', language_pairs: '' });
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

  const handleResendInvitation = async (userId, userName, userEmail) => {
    if (!window.confirm(`Reenviar convite para "${userName}" (${userEmail})?`)) return;
    try {
      const response = await axios.post(`${API}/admin/auth/resend-invitation?admin_key=${adminKey}`, {
        user_id: userId
      });

      // Show link for manual sharing
      if (response.data?.invitation_link) {
        const copyLink = window.confirm(
          `✅ ${response.data.message}\n\n` +
          `⚠️ O email pode cair no spam. Copiar o link de convite?\n\n` +
          `Link: ${response.data.invitation_link}`
        );
        if (copyLink) {
          navigator.clipboard.writeText(response.data.invitation_link);
          alert('Link copiado! Envie para o usuário por WhatsApp ou outro meio.');
        }
      } else {
        alert(response.data?.message || 'Convite reenviado!');
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao reenviar convite');
    }
  };

  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    pm: 'bg-blue-100 text-blue-800',
    translator: 'bg-green-100 text-green-800',
    sales: 'bg-purple-100 text-purple-800'
  };

  // PM can only see translators
  const baseFilteredUsers = isPM ? users.filter(u => u.role === 'translator') : users;

  // Apply search filter
  const filteredUsers = baseFilteredUsers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.language_pairs?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-6 text-center">Loading users...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{isPM ? '👥 Translators' : '👤 User Management'}</h1>
          {isPM && <p className="text-xs text-gray-500 mt-1">Register and manage translators</p>}
        </div>
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nome, email ou idiomas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 text-sm border rounded-lg w-64 pl-8"
            />
            <SearchIcon className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm"
          >
            + {isPM ? 'Register Translator' : 'Create User'}
          </button>
        </div>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="font-bold text-sm mb-3">{isPM ? 'Register New Translator' : 'Create New User'}</h3>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
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
            <p className="text-xs text-gray-500 mt-1">An invitation email will be sent to set up the password</p>

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
              <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Rate/Page</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Languages</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((u) => (
              <React.Fragment key={u.id}>
                <tr className={`hover:bg-gray-50 ${expandedUser === u.id ? 'bg-teal-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpandUser(u.id)}
                        className={`text-gray-400 hover:text-teal-600 transition-transform ${expandedUser === u.id ? 'rotate-90' : ''}`}
                      >
                        ▶
                      </button>
                      {u.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[u.role]}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {u.rate_per_page ? `$${u.rate_per_page}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {u.language_pairs || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {u.invitation_pending ? (
                      <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                        Pending Invitation
                      </span>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => toggleExpandUser(u.id)}
                      className="text-teal-600 hover:text-teal-800 text-xs"
                    >
                      {expandedUser === u.id ? 'Fechar' : 'Ver Perfil'}
                    </button>
                    {u.invitation_pending && (
                      <button
                        onClick={() => handleResendInvitation(u.id, u.name, u.email)}
                        className="text-orange-600 hover:text-orange-800 text-xs"
                      >
                        Resend Invitation
                      </button>
                    )}
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
                  </td>
                </tr>

                {/* Expanded Profile Section */}
                {expandedUser === u.id && (
                  <tr>
                    <td colSpan="7" className="px-4 py-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Profile Information */}
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                              📋 Informações do Perfil
                            </h4>
                            {isAdmin && editingUser !== u.id && (
                              <button
                                onClick={() => startEditUser(u)}
                                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                              >
                                ✏️ Editar
                              </button>
                            )}
                            {editingUser === u.id && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveUserEdits(u.id)}
                                  disabled={savingUser}
                                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                                >
                                  {savingUser ? '⏳...' : '✓ Salvar'}
                                </button>
                                <button
                                  onClick={cancelEditUser}
                                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                  ✕ Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500 text-xs">Nome Completo:</span>
                              {editingUser === u.id ? (
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                />
                              ) : (
                                <div className="font-medium">{u.name}</div>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Email:</span>
                              {editingUser === u.id ? (
                                <input
                                  type="email"
                                  value={editForm.email}
                                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                />
                              ) : (
                                <div className="font-medium">{u.email}</div>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Função:</span>
                              {editingUser === u.id ? (
                                <select
                                  value={editForm.role}
                                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                >
                                  <option value="translator">Translator</option>
                                  <option value="pm">PM</option>
                                  <option value="admin">Admin</option>
                                  <option value="sales">Sales</option>
                                </select>
                              ) : (
                                <div className="font-medium capitalize">{u.role}</div>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Status:</span>
                              <div className={`font-medium ${u.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                {u.is_active ? 'Ativo' : 'Inativo'}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Valor por Página:</span>
                              {editingUser === u.id ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.rate_per_page}
                                  onChange={(e) => setEditForm({...editForm, rate_per_page: e.target.value})}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                  placeholder="Ex: 25.00"
                                />
                              ) : (
                                <div className="font-medium text-green-600">
                                  {u.rate_per_page ? `$${u.rate_per_page.toFixed(2)}` : 'Não definido'}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Valor por Palavra:</span>
                              {editingUser === u.id ? (
                                <input
                                  type="number"
                                  step="0.001"
                                  value={editForm.rate_per_word}
                                  onChange={(e) => setEditForm({...editForm, rate_per_word: e.target.value})}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                  placeholder="Ex: 0.08"
                                />
                              ) : (
                                <div className="font-medium text-green-600">
                                  {u.rate_per_word ? `$${u.rate_per_word.toFixed(3)}` : 'Não definido'}
                                </div>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500 text-xs">Pares de Idiomas:</span>
                              {editingUser === u.id ? (
                                <input
                                  type="text"
                                  value={editForm.language_pairs}
                                  onChange={(e) => setEditForm({...editForm, language_pairs: e.target.value})}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                  placeholder="Ex: Portuguese → English, Spanish → English"
                                />
                              ) : (
                                <div className="font-medium">
                                  {u.language_pairs ? (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {u.language_pairs.split(',').map((pair, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                          {pair.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  ) : 'Não definido'}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Páginas Traduzidas:</span>
                              <div className="font-medium">{u.pages_translated || 0}</div>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Data de Cadastro:</span>
                              <div className="font-medium">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Documents Section */}
                        <div className="bg-white rounded-lg p-4 border">
                          <h4 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                            📁 Documentos Pessoais
                          </h4>

                          {/* Upload Section */}
                          {isAdmin && (
                            <div className="mb-4 p-3 bg-gray-50 rounded border-dashed border-2 border-gray-200">
                              <div className="flex items-center gap-2">
                                <select
                                  id={`doc-type-${u.id}`}
                                  className="px-2 py-1.5 text-xs border rounded flex-1"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Tipo de documento...</option>
                                  {TRANSLATOR_DOC_TYPES.map(dt => (
                                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                                  ))}
                                </select>
                                <label className="px-3 py-1.5 bg-teal-500 text-white text-xs rounded cursor-pointer hover:bg-teal-600">
                                  {uploadingDoc ? '⏳...' : '📤 Upload'}
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    disabled={uploadingDoc}
                                    onChange={(e) => {
                                      const docType = document.getElementById(`doc-type-${u.id}`).value;
                                      if (!docType) {
                                        alert('Selecione o tipo de documento primeiro');
                                        e.target.value = '';
                                        return;
                                      }
                                      handleUploadDocument(u.id, e.target.files[0], docType);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">PDF, DOC, JPG, PNG (max 10MB)</p>
                            </div>
                          )}

                          {/* Documents List */}
                          <div className="space-y-2 max-h-48 overflow-auto">
                            {userDocuments[u.id]?.length > 0 ? (
                              userDocuments[u.id].map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                      {doc.filename?.endsWith('.pdf') ? '📄' :
                                       doc.filename?.match(/\.(jpg|jpeg|png)$/i) ? '🖼️' : '📎'}
                                    </span>
                                    <div>
                                      <div className="font-medium">{doc.filename}</div>
                                      <div className="text-gray-400">
                                        {TRANSLATOR_DOC_TYPES.find(dt => dt.value === doc.document_type)?.label || doc.document_type}
                                        {doc.uploaded_at && ` • ${new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}`}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleDownloadDocument(u.id, doc.id, doc.filename)}
                                      className="px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                    >
                                      ⬇️
                                    </button>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeleteDocument(u.id, doc.id)}
                                        className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-gray-400 text-xs">
                                <div className="text-2xl mb-1">📭</div>
                                Nenhum documento enviado
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
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
  const [activeView, setActiveView] = useState('overview'); // overview, expenses, payment-proofs, translator-payments, quickbooks
  const [paymentProofs, setPaymentProofs] = useState([]);
  const [selectedProof, setSelectedProof] = useState(null);
  const [proofFilter, setProofFilter] = useState('pending');
  // Translator payments state
  const [translators, setTranslators] = useState([]);
  const [translatorPayments, setTranslatorPayments] = useState([]);
  const [selectedTranslatorForPayment, setSelectedTranslatorForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentReport, setPaymentReport] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  // QuickBooks state
  const [qbConnected, setQbConnected] = useState(false);
  const [qbSyncing, setQbSyncing] = useState({});
  const [paidOrders, setPaidOrders] = useState([]);
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
    google: { label: 'Google', color: '#EA4335' },
    instagram: { label: 'Instagram', color: '#E4405F' },
    facebook: { label: 'Facebook', color: '#1877F2' },
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

  const fetchPaymentProofs = async () => {
    try {
      const statusParam = proofFilter !== 'all' ? `&status=${proofFilter}` : '';
      const response = await axios.get(`${API}/admin/payment-proofs?admin_key=${adminKey}${statusParam}`);
      setPaymentProofs(response.data.payment_proofs || []);
    } catch (err) {
      console.error('Error fetching payment proofs:', err);
    }
  };

  const fetchProofDetail = async (proofId) => {
    try {
      const response = await axios.get(`${API}/admin/payment-proofs/${proofId}?admin_key=${adminKey}`);
      setSelectedProof(response.data.payment_proof);
    } catch (err) {
      console.error('Error fetching proof detail:', err);
    }
  };

  const reviewProof = async (proofId, status, notes = '') => {
    try {
      await axios.put(
        `${API}/admin/payment-proofs/${proofId}/review?admin_key=${adminKey}&status=${status}${notes ? `&admin_notes=${encodeURIComponent(notes)}` : ''}`
      );
      setSelectedProof(null);
      fetchPaymentProofs();
      alert(status === 'approved' ? 'Payment approved!' : 'Payment rejected');
    } catch (err) {
      console.error('Error reviewing proof:', err);
      alert('Error processing review');
    }
  };

  // Translator payments functions
  const fetchTranslatorsForPayment = async () => {
    try {
      const response = await axios.get(`${API}/admin/payments/translators?admin_key=${adminKey}`);
      setTranslators(response.data || []);
    } catch (err) {
      console.error('Error fetching translators:', err);
    }
  };

  const fetchPaymentReport = async () => {
    try {
      const response = await axios.get(`${API}/admin/payments/report?admin_key=${adminKey}`);
      setPaymentReport(response.data);
    } catch (err) {
      console.error('Error fetching payment report:', err);
    }
  };

  const fetchTranslatorPaymentHistory = async (translatorId) => {
    try {
      const response = await axios.get(`${API}/admin/payments/translator/${translatorId}?admin_key=${adminKey}`);
      setTranslatorPayments(response.data.payments || []);
    } catch (err) {
      console.error('Error fetching translator payments:', err);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedTranslatorForPayment || !paymentAmount) {
      alert('Selecione um tradutor e informe o valor do pagamento');
      return;
    }
    try {
      await axios.post(`${API}/admin/payments/register?admin_key=${adminKey}`, {
        translator_id: selectedTranslatorForPayment._id,
        amount: parseFloat(paymentAmount),
        note: paymentNote
      });
      alert('Pagamento registrado com sucesso!');
      setPaymentAmount('');
      setPaymentNote('');
      fetchTranslatorsForPayment();
      fetchPaymentReport();
      if (selectedTranslatorForPayment) {
        fetchTranslatorPaymentHistory(selectedTranslatorForPayment._id);
      }
    } catch (err) {
      alert('Erro ao registrar pagamento: ' + (err.response?.data?.detail || err.message));
    }
  };

  // QuickBooks functions
  const checkQuickBooksStatus = async () => {
    try {
      const response = await axios.get(`${API}/quickbooks/status?admin_key=${adminKey}`);
      setQbConnected(response.data.connected);
    } catch (err) {
      console.error('Failed to check QuickBooks status:', err);
    }
  };

  const fetchPaidOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      const orders = response.data.orders || response.data || [];
      // Filter paid orders that haven't been synced to QuickBooks
      const paid = orders.filter(o => o.payment_status === 'paid');
      setPaidOrders(paid);
    } catch (err) {
      console.error('Failed to fetch paid orders:', err);
    }
  };

  const syncOrderToQuickBooks = async (order) => {
    setQbSyncing(prev => ({ ...prev, [order.id]: true }));
    try {
      const response = await axios.post(`${API}/quickbooks/sync/invoice?admin_key=${adminKey}`, {
        order_id: order.id,
        customer_name: order.client_name,
        customer_email: order.client_email,
        send_email: true
      });

      if (response.data.success) {
        alert(`Invoice #${response.data.invoice_number} created and sent to ${order.client_email || 'client'}!`);
        fetchPaidOrders(); // Refresh the list
      }
    } catch (err) {
      console.error('Failed to sync to QuickBooks:', err);
      alert('Failed to sync: ' + (err.response?.data?.detail || err.message));
    } finally {
      setQbSyncing(prev => ({ ...prev, [order.id]: false }));
    }
  };

  const syncTranslatorPaymentToQuickBooks = async (translator, amount, description) => {
    try {
      const response = await axios.post(`${API}/quickbooks/sync/contractor-payment?admin_key=${adminKey}`, {
        translator_id: translator._id || translator.id,
        translator_name: translator.name,
        translator_email: translator.email,
        amount: amount,
        description: description
      });

      if (response.data.success) {
        alert(`Contractor payment recorded in QuickBooks!`);
      }
    } catch (err) {
      console.error('Failed to sync contractor payment:', err);
      alert('Failed to sync: ' + (err.response?.data?.detail || err.message));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchExpenses(), fetchPaymentProofs(), checkQuickBooksStatus()]);
      setLoading(false);
    };
    loadData();
  }, [adminKey, period]);

  useEffect(() => {
    if (activeView === 'quickbooks') {
      fetchPaidOrders();
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'payment-proofs') {
      fetchPaymentProofs();
    }
    if (activeView === 'translator-payments') {
      fetchTranslatorsForPayment();
      fetchPaymentReport();
    }
  }, [proofFilter, activeView]);

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
            <button
              onClick={() => setActiveView('payment-proofs')}
              className={`px-4 py-2 rounded text-sm flex items-center gap-1 ${activeView === 'payment-proofs' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Comprovantes
              {paymentProofs.filter(p => p.status === 'pending').length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {paymentProofs.filter(p => p.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('translator-payments')}
              className={`px-4 py-2 rounded text-sm ${activeView === 'translator-payments' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              💰 Pagar Tradutores
            </button>
            <button
              onClick={() => setActiveView('quickbooks')}
              className={`px-4 py-2 rounded text-sm flex items-center gap-1 ${activeView === 'quickbooks' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              📊 QuickBooks
              {qbConnected && <span className="w-2 h-2 bg-green-400 rounded-full"></span>}
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

      {/* Payment Proofs View */}
      {activeView === 'payment-proofs' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {['pending', 'approved', 'rejected', 'all'].map((status) => (
                <button
                  key={status}
                  onClick={() => setProofFilter(status)}
                  className={`px-3 py-1.5 rounded text-sm capitalize ${
                    proofFilter === status
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : status === 'approved' ? 'Aprovados' : 'Rejeitados'}
                  {status === 'pending' && paymentProofs.filter(p => p.status === 'pending').length > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
                      {paymentProofs.filter(p => p.status === 'pending').length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={fetchPaymentProofs}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
            >
              Atualizar
            </button>
          </div>

          {/* Proofs List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Método</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paymentProofs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      Nenhum comprovante encontrado
                    </td>
                  </tr>
                ) : (
                  paymentProofs.map((proof) => (
                    <tr key={proof.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {new Date(proof.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{proof.customer_name}</div>
                        <div className="text-xs text-gray-500">{proof.customer_email}</div>
                        {proof.order_number && (
                          <div className="text-xs text-teal-600">Pedido: {proof.order_number}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          proof.payment_method === 'pix'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {proof.payment_method.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {proof.currency === 'BRL' ? 'R$' : '$'} {proof.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          proof.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : proof.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {proof.status === 'pending' ? 'Pendente' : proof.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => fetchProofDetail(proof.id)}
                          className="text-teal-600 hover:text-teal-800 font-medium"
                        >
                          Ver
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

      {/* Payment Proof Detail Modal */}
      {selectedProof && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Comprovante de Pagamento</h3>
              <button onClick={() => setSelectedProof(null)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500">Cliente</label>
                  <div className="font-medium">{selectedProof.customer_name}</div>
                  <div className="text-sm text-gray-600">{selectedProof.customer_email}</div>
                  {selectedProof.customer_phone && (
                    <div className="text-sm text-gray-600">{selectedProof.customer_phone}</div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500">Pagamento</label>
                  <div className="font-medium">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${
                      selectedProof.payment_method === 'pix'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {selectedProof.payment_method.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-lg font-bold mt-1">
                    {selectedProof.currency === 'BRL' ? 'R$' : '$'} {selectedProof.amount.toFixed(2)}
                  </div>
                </div>
              </div>

              {selectedProof.order_number && (
                <div className="mb-4 p-2 bg-teal-50 rounded text-sm">
                  <strong>Pedido vinculado:</strong> {selectedProof.order_number}
                </div>
              )}

              {/* Proof Image/PDF */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-2">Comprovante ({selectedProof.proof_filename})</label>
                <div className="border rounded-lg overflow-hidden bg-gray-100">
                  {selectedProof.proof_file_type?.startsWith('image/') ? (
                    <img
                      src={`data:${selectedProof.proof_file_type};base64,${selectedProof.proof_file_data}`}
                      alt="Payment proof"
                      className="max-w-full h-auto mx-auto"
                      style={{ maxHeight: '400px' }}
                    />
                  ) : selectedProof.proof_file_type === 'application/pdf' ? (
                    <div className="p-4 text-center">
                      <p className="text-gray-600 mb-2">Arquivo PDF</p>
                      <a
                        href={`data:application/pdf;base64,${selectedProof.proof_file_data}`}
                        download={selectedProof.proof_filename}
                        className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
                      >
                        Baixar PDF
                      </a>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      Formato não suportado para visualização
                    </div>
                  )}
                </div>
              </div>

              {/* Status Info */}
              {selectedProof.status !== 'pending' && (
                <div className={`p-3 rounded mb-4 ${
                  selectedProof.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="font-medium">
                    {selectedProof.status === 'approved' ? 'Aprovado' : 'Rejeitado'} por {selectedProof.reviewed_by_name}
                  </div>
                  {selectedProof.reviewed_at && (
                    <div className="text-sm text-gray-600">
                      {new Date(selectedProof.reviewed_at).toLocaleString('pt-BR')}
                    </div>
                  )}
                  {selectedProof.admin_notes && (
                    <div className="text-sm mt-1">Notas: {selectedProof.admin_notes}</div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedProof.status === 'pending' && (
              <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    const notes = prompt('Motivo da rejeição (opcional):');
                    reviewProof(selectedProof.id, 'rejected', notes || '');
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Rejeitar
                </button>
                <button
                  onClick={() => reviewProof(selectedProof.id, 'approved')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Aprovar Pagamento
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Translator Payments View */}
      {activeView === 'translator-payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Translators List */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">👥 Tradutores</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {translators.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum tradutor encontrado.</p>
              ) : (
                translators.map((translator) => (
                  <div
                    key={translator._id}
                    onClick={() => {
                      setSelectedTranslatorForPayment(translator);
                      fetchTranslatorPaymentHistory(translator._id);
                    }}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                      selectedTranslatorForPayment?._id === translator._id ? 'border-teal-500 bg-teal-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{translator.name}</div>
                        <div className="text-xs text-gray-500">{translator.email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Páginas pendentes</div>
                        <div className="font-bold text-lg text-yellow-600">{translator.pending_payment_pages || 0}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>Taxa: ${translator.rate_per_page || 25}/página</span>
                      <span className="font-medium text-green-600">
                        Total: ${((translator.pending_payment_pages || 0) * (translator.rate_per_page || 25)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment Form & History */}
          <div className="space-y-4">
            {/* Payment Form */}
            {selectedTranslatorForPayment && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-sm font-bold text-gray-700 mb-3">💳 Registrar Pagamento: {selectedTranslatorForPayment.name}</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Valor do Pagamento ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                      placeholder={`Sugerido: $${((selectedTranslatorForPayment.pending_payment_pages || 0) * (selectedTranslatorForPayment.rate_per_page || 25)).toFixed(2)}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nota (opcional)</label>
                    <textarea
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                      rows={2}
                      placeholder="Referência de pagamento, período, etc."
                    />
                  </div>
                  <button
                    onClick={handleRegisterPayment}
                    className="w-full py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                  >
                    ✅ Registrar Pagamento
                  </button>
                </div>
              </div>
            )}

            {/* Payment History */}
            {selectedTranslatorForPayment && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-sm font-bold text-gray-700 mb-3">📜 Histórico de Pagamentos</h2>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {translatorPayments.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum pagamento registrado.</p>
                  ) : (
                    translatorPayments.map((payment, idx) => (
                      <div key={idx} className="p-2 border rounded text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-green-600">${payment.amount.toFixed(2)}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(payment.paid_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        {payment.note && (
                          <div className="text-xs text-gray-500 mt-1">{payment.note}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Payment Report Summary */}
            {paymentReport && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-sm font-bold text-gray-700 mb-3">📊 Resumo Geral</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-yellow-50 rounded">
                    <div className="text-xs text-gray-500">Total Pendente</div>
                    <div className="font-bold text-xl text-yellow-600">${paymentReport.total_pending?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <div className="text-xs text-gray-500">Total Pago (Mês)</div>
                    <div className="font-bold text-xl text-green-600">${paymentReport.total_paid_month?.toFixed(2) || '0.00'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QuickBooks Integration View */}
      {activeView === 'quickbooks' && (
        <div className="space-y-6">
          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <h2 className="text-sm font-bold text-gray-700">QuickBooks Online</h2>
                  <p className="text-xs text-gray-500">Sync invoices and payments with QuickBooks</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {qbConnected ? (
                  <>
                    <span className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded text-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Connected
                    </span>
                  </>
                ) : (
                  <span className="flex items-center px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                    Not Connected - Go to Settings to connect
                  </span>
                )}
              </div>
            </div>
          </div>

          {qbConnected ? (
            <>
              {/* Paid Orders - Ready to Invoice */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b bg-gray-50">
                  <h2 className="text-sm font-bold text-gray-700">📄 Paid Orders - Create Invoices</h2>
                  <p className="text-xs text-gray-500 mt-1">Send invoices to clients via QuickBooks</p>
                </div>
                <div className="p-4">
                  {paidOrders.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No paid orders found</p>
                  ) : (
                    <div className="space-y-2">
                      {paidOrders.map(order => (
                        <div key={order.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-medium text-sm text-gray-800">#{order.order_number}</span>
                              <span className="text-xs text-gray-500">{order.client_name}</span>
                              <span className="text-xs text-gray-400">{order.client_email}</span>
                            </div>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-sm font-bold text-green-600">{formatCurrency(order.total_price)}</span>
                              <span className="text-xs text-gray-500">{order.document_type || order.service_type}</span>
                              {order.quickbooks_invoice_id && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                  QB Invoice #{order.quickbooks_invoice_number}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {order.quickbooks_invoice_id ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded">
                                ✓ Synced
                              </span>
                            ) : (
                              <button
                                onClick={() => syncOrderToQuickBooks(order)}
                                disabled={qbSyncing[order.id]}
                                className="px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300 flex items-center"
                              >
                                {qbSyncing[order.id] ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Syncing...
                                  </>
                                ) : (
                                  <>📤 Create Invoice & Send</>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">How QuickBooks Sync Works</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Click "Create Invoice & Send" to create an invoice in QuickBooks</li>
                  <li>• QuickBooks will email the invoice to the client automatically</li>
                  <li>• Client can pay via credit card or bank transfer through the invoice link</li>
                  <li>• Payment will be recorded automatically in QuickBooks</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <span className="text-4xl mb-3 block">🔗</span>
              <h3 className="text-lg font-medium text-yellow-800 mb-2">QuickBooks Not Connected</h3>
              <p className="text-sm text-yellow-700 mb-4">
                Connect your QuickBooks account to automatically create and send invoices to clients.
              </p>
              <p className="text-xs text-yellow-600">
                Go to <strong>Settings → Integrations</strong> to connect QuickBooks
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== SET PASSWORD PAGE (Invitation Acceptance) ====================
const SetPasswordPage = ({ inviteToken, onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [verifying, setVerifying] = useState(true);
  const [step, setStep] = useState(1); // 1: password, 2: translator info (if translator)

  // Translator-specific fields
  const [languagePairs, setLanguagePairs] = useState('');
  const [ratePerPage, setRatePerPage] = useState('');
  const [ratePerWord, setRatePerWord] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [zelleEmail, setZelleEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedEthics, setAcceptedEthics] = useState(false);
  const [acceptedProhibitedUse, setAcceptedProhibitedUse] = useState(false);

  const isTranslator = userInfo?.role === 'translator';
  const isPM = userInfo?.role === 'pm';
  const requiresTerms = isTranslator || isPM; // Both translators and PMs must accept terms

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await axios.get(`${API}/admin/auth/verify-invitation?token=${inviteToken}`);
        setUserInfo(response.data.user);
      } catch (err) {
        setError(err.response?.data?.detail || 'Invalid or expired invitation link');
      } finally {
        setVerifying(false);
      }
    };
    verifyToken();
  }, [inviteToken]);

  const handlePasswordStep = (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // If translator or PM, go to step 2 for terms acceptance, otherwise submit directly
    if (requiresTerms) {
      setStep(2);
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    setError('');

    // Validate terms acceptance for translators and PMs
    if (requiresTerms) {
      if (!acceptedTerms) {
        setError('You must accept the terms and conditions');
        return;
      }
      if (!acceptedProhibitedUse) {
        setError('You must accept the prohibited use clause');
        return;
      }
      // Ethics only required for translators
      if (isTranslator && !acceptedEthics) {
        setError('You must accept the translator ethics guidelines');
        return;
      }
    }

    setLoading(true);
    try {
      const data = {
        token: inviteToken,
        password: password
      };

      // Add terms acceptance data for translators and PMs
      if (requiresTerms) {
        data.accepted_terms = acceptedTerms;
        data.accepted_prohibited_use = acceptedProhibitedUse;
      }

      // Add translator-specific data
      if (isTranslator) {
        data.language_pairs = languagePairs || null;
        data.rate_per_page = ratePerPage ? parseFloat(ratePerPage) : null;
        data.rate_per_word = ratePerWord ? parseFloat(ratePerWord) : null;
        data.payment_method = paymentMethod || null;
        data.bank_name = bankName || null;
        data.account_holder = accountHolder || null;
        data.account_number = accountNumber || null;
        data.routing_number = routingNumber || null;
        data.paypal_email = paypalEmail || null;
        data.zelle_email = zelleEmail || null;
        data.accepted_ethics = acceptedEthics;
      }

      await axios.post(`${API}/admin/auth/accept-invitation`, data);
      setSuccess('Account set up successfully! You can now log in.');
      setTimeout(() => onComplete(), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to set up account');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !userInfo) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl text-white">!</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Invalid Link</h1>
          </div>
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm text-center">
            {error}
          </div>
          <button
            onClick={onComplete}
            className="w-full py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Terms acceptance form (for translators and PMs)
  if (step === 2 && requiresTerms) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center py-8">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg mx-4">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl text-white">📋</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Complete Your Profile</h1>
            <p className="text-xs text-gray-500 mt-1">Welcome, {userInfo?.name}!</p>
            <p className="text-xs text-teal-600">Step 2 of 2 - {isTranslator ? 'Translator Information' : 'Terms Acceptance'}</p>
          </div>

          {error && (
            <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-xs text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-3 p-2 bg-green-100 text-green-700 rounded text-xs text-center">
              {success}
            </div>
          )}

          <div className="space-y-4">
            {/* Language & Rates Section - Translator only */}
            {isTranslator && (
            <div className="border rounded p-3 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Language & Rates</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Language Pairs *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                    value={languagePairs}
                    onChange={(e) => setLanguagePairs(e.target.value)}
                    placeholder="e.g. EN-PT, EN-ES, PT-EN"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate multiple pairs with commas</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rate per Page ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                      value={ratePerPage}
                      onChange={(e) => setRatePerPage(e.target.value)}
                      placeholder="e.g. 15.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rate per Word ($)</label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                      value={ratePerWord}
                      onChange={(e) => setRatePerWord(e.target.value)}
                      placeholder="e.g. 0.08"
                    />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Payment Section - Translator only */}
            {isTranslator && (
            <div className="border rounded p-3 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="">Select payment method</option>
                    <option value="bank_transfer">Bank Transfer (ACH)</option>
                    <option value="wire_transfer">Wire Transfer</option>
                    <option value="paypal">PayPal</option>
                    <option value="zelle">Zelle</option>
                  </select>
                </div>

                {(paymentMethod === 'bank_transfer' || paymentMethod === 'wire_transfer') && (
                  <div className="space-y-3 pt-2 border-t">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Bank name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder="Full name on account"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="Account number"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Routing Number</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                          value={routingNumber}
                          onChange={(e) => setRoutingNumber(e.target.value)}
                          placeholder="9-digit routing"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'paypal' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">PayPal Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="your@paypal.com"
                    />
                  </div>
                )}

                {paymentMethod === 'zelle' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Zelle Email/Phone</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                      value={zelleEmail}
                      onChange={(e) => setZelleEmail(e.target.value)}
                      placeholder="Email or phone for Zelle"
                    />
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Terms & Ethics Section */}
            <div className="border rounded p-3 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Terms Agreement</h3>

              <div className="space-y-3">
                {/* Ethics Guidelines - Translator only */}
                {isTranslator && (
                  <>
                    <div className="bg-white p-3 rounded border text-xs text-gray-600 max-h-32 overflow-y-auto">
                      <strong>Translator Ethics Guidelines (ATA Standards)</strong>
                      <ul className="list-disc ml-4 mt-2 space-y-1">
                        <li>Maintain strict confidentiality of all client documents and information</li>
                        <li>Provide accurate and faithful translations without additions or omissions</li>
                        <li>Only accept work within your area of competence and language expertise</li>
                        <li>Disclose any conflicts of interest before accepting assignments</li>
                        <li>Meet agreed deadlines and communicate promptly about any delays</li>
                        <li>Respect intellectual property rights and copyright laws</li>
                        <li>Maintain professional development and stay current in your field</li>
                        <li>Never use client materials for personal gain or share with third parties</li>
                      </ul>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedEthics}
                        onChange={(e) => setAcceptedEthics(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-xs text-gray-700">
                        I have read and agree to follow the Translator Ethics Guidelines based on ATA (American Translators Association) standards *
                      </span>
                    </label>
                  </>
                )}

                {/* Terms and Conditions */}
                <div className="bg-white p-3 rounded border text-xs text-gray-600 max-h-32 overflow-y-auto">
                  <strong>Terms and Conditions</strong>
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li>Translations remain property of Legacy Translations until delivered to client</li>
                    <li>Payment is processed within 30 days of approved work completion</li>
                    <li>Work quality is subject to review and revision requests</li>
                    <li>Contractor is responsible for their own taxes (1099 contractor status)</li>
                    <li>Non-compete for direct contact with clients for 12 months</li>
                    <li>Confidentiality obligations continue after contract termination</li>
                  </ul>
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-xs text-gray-700">
                    I accept the Terms and Conditions for working as a contractor with Legacy Translations *
                  </span>
                </label>

                {/* Prohibited Use Clause */}
                <div className="bg-red-50 p-3 rounded border border-red-200 text-xs text-gray-700 max-h-48 overflow-y-auto">
                  <strong className="text-red-700">Prohibited Use Clause</strong>
                  <p className="mt-2">
                    It is expressly <strong>PROHIBITED</strong> to use the Legacy Translations platform, its tools,
                    templates, and any company resources for any purposes other than those directly related to
                    authorized work within the Legacy Translations system. This includes, but is not limited to:
                  </p>
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li>Using company tools, templates, or resources for personal or third-party projects</li>
                    <li>Sharing login credentials or access links with unauthorized persons</li>
                    <li>Copying or distributing proprietary templates, formats, or methodologies</li>
                    <li>Using the platform to conduct business outside of Legacy Translations</li>
                    <li>Unauthorized access or sharing of client information</li>
                  </ul>
                  <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded">
                    <strong className="text-red-800">⚠️ IMMEDIATE TERMINATION CLAUSE:</strong>
                    <p className="mt-1 text-red-800">
                      If any unauthorized use of the platform is detected, the contractor will be <strong>IMMEDIATELY TERMINATED</strong> without
                      prior notice or any notice period requirement. Legacy Translations reserves the right to pursue legal action for any
                      damages or losses resulting from such violations.
                    </p>
                  </div>
                  <p className="mt-2 font-medium text-red-700">
                    All rights reserved. © {new Date().getFullYear()} Legacy Translations LLC - legacytranslations.com
                  </p>
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedProhibitedUse}
                    onChange={(e) => setAcceptedProhibitedUse(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-xs text-gray-700">
                    I understand and accept the Prohibited Use Clause, including the Immediate Termination Clause. I acknowledge that unauthorized
                    use of the platform will result in immediate termination without notice. *
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading || success || !acceptedTerms || !acceptedProhibitedUse || (isTranslator && !acceptedEthics)}
                className="flex-1 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400 text-sm font-medium"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Password setup
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-xl text-white">🔐</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Set Up Your Account</h1>
          <p className="text-xs text-gray-500 mt-1">Welcome, {userInfo?.name}!</p>
          <p className="text-xs text-teal-600 mt-1">{userInfo?.role?.toUpperCase()}</p>
          {requiresTerms && <p className="text-xs text-gray-400">Step 1 of 2 - Create Password</p>}
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-xs text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 p-2 bg-green-100 text-green-700 rounded text-xs text-center">
            {success}
          </div>
        )}

        <form onSubmit={handlePasswordStep} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Create Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {requiresTerms ? 'Next Step' : (loading ? 'Setting up...' : 'Set Up Account')}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==================== RESET PASSWORD PAGE ====================
const ResetPasswordPage = ({ resetToken, onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        await axios.get(`${API}/admin/auth/verify-reset-token?token=${resetToken}`);
        setTokenValid(true);
      } catch (err) {
        setError(err.response?.data?.detail || 'Invalid or expired reset link');
      } finally {
        setVerifying(false);
      }
    };
    verifyToken();
  }, [resetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/admin/auth/reset-password`, {
        token: resetToken,
        new_password: password
      });
      setSuccess('Password reset successfully! You can now log in.');
      setTimeout(() => onComplete(), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
          <p className="text-gray-600">Verifying link...</p>
        </div>
      </div>
    );
  }

  if (error && !tokenValid) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl text-white">!</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Invalid Link</h1>
          </div>
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm text-center">
            {error}
          </div>
          <button
            onClick={onComplete}
            className="w-full py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-xl text-white">🔑</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Reset Password</h1>
          <p className="text-xs text-gray-500 mt-1">Create your new password</p>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-xs text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 p-2 bg-green-100 text-green-700 rounded text-xs text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==================== PM DASHBOARD (EXCLUSIVE FOR PROJECT MANAGERS) ====================
const PMDashboard = ({ adminKey, user, onNavigateToTranslation }) => {
  // State
  const [activeSection, setActiveSection] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [translators, setTranslators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);

  // Project files viewing state
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDocuments, setProjectDocuments] = useState([]);
  const [loadingProjectDocs, setLoadingProjectDocs] = useState(false);
  const [fileAssignments, setFileAssignments] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [selectedTranslator, setSelectedTranslator] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [originalContents, setOriginalContents] = useState([]);  // Array for multiple documents
  const [currentDocIndex, setCurrentDocIndex] = useState(0);  // Current document index
  const [translatedContent, setTranslatedContent] = useState(null);
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [sendingAction, setSendingAction] = useState(false);

  // PM Package Generation state
  const [pmTranslationFiles, setPmTranslationFiles] = useState([]);  // Images for translation
  const [pmTranslationHtml, setPmTranslationHtml] = useState('');    // HTML content for translation
  const [pmPackageGenerating, setPmPackageGenerating] = useState(false);

  // Proofreading state
  const [proofreadingResult, setProofreadingResult] = useState(null);
  const [isProofreading, setIsProofreading] = useState(false);
  const [proofreadingError, setProofreadingError] = useState('');

  const [stats, setStats] = useState({
    totalProjects: 0,
    inProgress: 0,
    awaitingReview: 0,
    completed: 0,
    onTime: 0,
    delayed: 0
  });

  // Quote generation state
  const [quoteForm, setQuoteForm] = useState({
    clientName: '',
    clientEmail: '',
    documentType: '',
    sourceLanguage: 'Portuguese',
    targetLanguage: 'English',
    serviceType: 'standard',
    pageCount: 1,
    pricePerPage: 24.99,
    discount: 0,
    urgency: 'no',
    deliveryMethod: 'digital',
    notes: ''
  });

  const PM_DELIVERY_OPTIONS = {
    digital: { name: 'Digital (Email/Download)', price: 0 },
    usps_standard: { name: 'USPS Standard (5-7 days)', price: 5.99 },
    usps_priority: { name: 'USPS Priority (2-3 days)', price: 12.99 },
    usps_express: { name: 'USPS Express (1-2 days)', price: 29.99 },
    fedex_overnight: { name: 'FedEx Overnight', price: 39.99 }
  };
  const [quoteLanguage, setQuoteLanguage] = useState('en'); // en, pt, es
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);

  // Quote translations
  const quoteTranslations = {
    en: {
      title: 'TRANSLATION QUOTE',
      company: 'Legacy Translation Services',
      tagline: 'Professional Certified Translation Services',
      quoteNumber: 'Quote #',
      date: 'Date',
      validUntil: 'Valid Until',
      clientInfo: 'Client Information',
      name: 'Name',
      email: 'Email',
      serviceDetails: 'Service Details',
      documentType: 'Document Type',
      sourceLanguage: 'Source Language',
      targetLanguage: 'Target Language',
      serviceType: 'Service Type',
      certified: 'Certified Translation',
      professional: 'Professional Translation',
      urgency: 'Urgency',
      normal: 'Standard (2-3 business days)',
      priority: 'Priority (24 hours)',
      urgent: 'Urgent (12 hours)',
      pricing: 'Pricing',
      pages: 'Number of Pages',
      pricePerPage: 'Price per Page',
      subtotal: 'Subtotal',
      urgencyFee: 'Urgency Fee',
      discount: 'Discount',
      total: 'TOTAL',
      notes: 'Notes',
      terms: 'Terms & Conditions',
      termsText: 'This quote is valid for 30 days. Payment is due upon completion. Certified translations include notarization.',
      thankYou: 'Thank you for choosing Legacy Translation Services!',
      contact: 'Contact us',
      phone: 'Phone',
      website: 'Website'
    },
    pt: {
      title: 'ORÇAMENTO DE TRADUÇÃO',
      company: 'Legacy Translation Services',
      tagline: 'Serviços Profissionais de Tradução Juramentada',
      quoteNumber: 'Orçamento #',
      date: 'Data',
      validUntil: 'Válido Até',
      clientInfo: 'Informações do Cliente',
      name: 'Nome',
      email: 'E-mail',
      serviceDetails: 'Detalhes do Serviço',
      documentType: 'Tipo de Documento',
      sourceLanguage: 'Idioma de Origem',
      targetLanguage: 'Idioma de Destino',
      serviceType: 'Tipo de Serviço',
      certified: 'Tradução Juramentada',
      professional: 'Tradução Profissional',
      urgency: 'Urgência',
      normal: 'Normal (2-3 dias úteis)',
      priority: 'Prioritário (24 horas)',
      urgent: 'Urgente (12 horas)',
      pricing: 'Valores',
      pages: 'Número de Páginas',
      pricePerPage: 'Preço por Página',
      subtotal: 'Subtotal',
      urgencyFee: 'Taxa de Urgência',
      discount: 'Desconto',
      total: 'TOTAL',
      notes: 'Observações',
      terms: 'Termos e Condições',
      termsText: 'Este orçamento é válido por 30 dias. O pagamento é devido após a conclusão. Traduções juramentadas incluem reconhecimento de firma.',
      thankYou: 'Obrigado por escolher a Legacy Translation Services!',
      contact: 'Entre em contato',
      phone: 'Telefone',
      website: 'Website'
    },
    es: {
      title: 'COTIZACIÓN DE TRADUCCIÓN',
      company: 'Legacy Translation Services',
      tagline: 'Servicios Profesionales de Traducción Certificada',
      quoteNumber: 'Cotización #',
      date: 'Fecha',
      validUntil: 'Válido Hasta',
      clientInfo: 'Información del Cliente',
      name: 'Nombre',
      email: 'Correo Electrónico',
      serviceDetails: 'Detalles del Servicio',
      documentType: 'Tipo de Documento',
      sourceLanguage: 'Idioma de Origen',
      targetLanguage: 'Idioma de Destino',
      serviceType: 'Tipo de Servicio',
      certified: 'Traducción Certificada',
      professional: 'Traducción Profesional',
      urgency: 'Urgencia',
      normal: 'Estándar (2-3 días hábiles)',
      priority: 'Prioritario (24 horas)',
      urgent: 'Urgente (12 horas)',
      pricing: 'Precios',
      pages: 'Número de Páginas',
      pricePerPage: 'Precio por Página',
      subtotal: 'Subtotal',
      urgencyFee: 'Tarifa de Urgencia',
      discount: 'Descuento',
      total: 'TOTAL',
      notes: 'Notas',
      terms: 'Términos y Condiciones',
      termsText: 'Esta cotización es válida por 30 días. El pago se realiza al finalizar. Las traducciones certificadas incluyen notarización.',
      thankYou: '¡Gracias por elegir Legacy Translation Services!',
      contact: 'Contáctenos',
      phone: 'Teléfono',
      website: 'Sitio Web'
    }
  };

  // Calculate quote totals
  const calculateQuote = () => {
    const basePrice = quoteForm.pageCount * quoteForm.pricePerPage;
    let urgencyFee = 0;
    if (quoteForm.urgency === 'priority') urgencyFee = basePrice * 0.25;
    if (quoteForm.urgency === 'urgent') urgencyFee = basePrice * 1.0;
    const deliveryFee = PM_DELIVERY_OPTIONS[quoteForm.deliveryMethod]?.price || 0;
    const discountAmount = (basePrice + urgencyFee) * (quoteForm.discount / 100);
    const total = basePrice + urgencyFee + deliveryFee - discountAmount;
    return { basePrice, urgencyFee, deliveryFee, discountAmount, total };
  };

  // Send quote via email
  const sendQuoteEmail = async () => {
    if (!quoteForm.clientEmail) {
      alert('Por favor, informe o email do cliente.');
      return;
    }
    setSendingQuote(true);
    try {
      const t = quoteTranslations[quoteLanguage];
      const prices = calculateQuote();
      const quoteNumber = `LT-${Date.now().toString().slice(-6)}`;

      await axios.post(`${API}/admin/send-quote-email?admin_key=${adminKey}`, {
        to_email: quoteForm.clientEmail,
        client_name: quoteForm.clientName,
        quote_number: quoteNumber,
        language: quoteLanguage,
        quote_data: {
          ...quoteForm,
          ...prices,
          quoteNumber,
          date: new Date().toLocaleDateString(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
        }
      });

      alert(`✅ Orçamento enviado com sucesso para ${quoteForm.clientEmail}!`);
      setShowQuotePreview(false);
    } catch (err) {
      console.error('Failed to send quote:', err);
      alert('❌ Erro ao enviar orçamento. Tente novamente.');
    } finally {
      setSendingQuote(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch orders assigned to this PM
      const ordersRes = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      const allOrders = ordersRes.data.orders || [];
      const myOrders = allOrders.filter(o =>
        o.assigned_pm_id === user?.id ||
        o.assigned_pm_name === user?.name
      );
      setOrders(myOrders);

      // Fetch translators
      const usersRes = await axios.get(`${API}/admin/users?admin_key=${adminKey}&token=`);
      const allUsers = usersRes.data || [];
      const translatorsList = allUsers.filter(u => u.role === 'translator');
      setTranslators(translatorsList);

      // Build review queue - orders with translation_status 'review' or 'pending_pm_review'
      const reviewOrders = myOrders.filter(o =>
        ['review', 'pending_pm_review'].includes(o.translation_status)
      );
      setReviewQueue(reviewOrders);

      // Calculate stats
      const now = new Date();
      let onTime = 0;
      let delayed = 0;
      myOrders.forEach(o => {
        if (o.deadline) {
          const deadline = new Date(o.deadline);
          if (deadline >= now || o.translation_status === 'delivered') {
            onTime++;
          } else {
            delayed++;
          }
        }
      });

      setStats({
        totalProjects: myOrders.length,
        inProgress: myOrders.filter(o => o.translation_status === 'in_translation').length,
        awaitingReview: reviewOrders.length,
        completed: myOrders.filter(o => ['ready', 'delivered'].includes(o.translation_status)).length,
        onTime,
        delayed
      });

      // Load messages from localStorage (simulated)
      const savedMessages = localStorage.getItem(`pm_messages_${user?.id}`);
      if (savedMessages) setMessages(JSON.parse(savedMessages));

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Send message to translator
  const sendMessage = () => {
    if (!newMessage.trim() || !selectedTranslator) return;

    const msg = {
      id: Date.now(),
      from: user?.name,
      to: selectedTranslator.name,
      toId: selectedTranslator.id,
      content: newMessage,
      timestamp: new Date().toISOString(),
      read: false
    };

    const updatedMessages = [...messages, msg];
    setMessages(updatedMessages);
    localStorage.setItem(`pm_messages_${user?.id}`, JSON.stringify(updatedMessages));
    setNewMessage('');
  };

  // View project files and assign translators
  const viewProjectFiles = async (order) => {
    setSelectedProject(order);
    setLoadingProjectDocs(true);
    setProjectDocuments([]);
    try {
      const response = await axios.get(`${API}/admin/orders/${order.id}/documents?admin_key=${adminKey}`);
      setProjectDocuments(response.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch project documents:', err);
    } finally {
      setLoadingProjectDocs(false);
    }
  };

  // Assign translator to specific document
  const assignTranslatorToFile = async (docId, translatorId, translatorName) => {
    try {
      setFileAssignments(prev => ({
        ...prev,
        [docId]: { id: translatorId, name: translatorName }
      }));

      await axios.patch(`${API}/admin/order-documents/${docId}?admin_key=${adminKey}`, {
        assigned_translator_id: translatorId,
        assigned_translator_name: translatorName
      });
    } catch (err) {
      console.error('Failed to assign translator:', err);
      setFileAssignments(prev => {
        const newState = { ...prev };
        delete newState[docId];
        return newState;
      });
    }
  };

  // Download document
  const downloadProjectDocument = async (docId, filename) => {
    try {
      const response = await axios.get(`${API}/admin/order-documents/${docId}/download?admin_key=${adminKey}`);
      if (response.data.file_data) {
        const link = document.createElement('a');
        link.href = `data:${response.data.content_type || 'application/pdf'};base64,${response.data.file_data}`;
        link.download = filename || 'document.pdf';
        link.click();
      }
    } catch (err) {
      console.error('Failed to download:', err);
      alert('Error downloading document');
    }
  };

  // Handle PM original document upload (with PDF to image conversion)
  const handlePmOriginalUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    setProcessingStatus('Processing uploaded documents...');
    const allDocs = [];

    for (const file of selectedFiles) {
      const fileName = file.name.toLowerCase();

      // PDF - store directly
      if (fileName.endsWith('.pdf')) {
        setProcessingStatus(`Loading PDF: ${file.name}`);
        const reader = new FileReader();
        const result = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        allDocs.push({
          filename: file.name,
          data: result,
          contentType: 'application/pdf'
        });
      }
      // Image - read directly
      else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const result = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        allDocs.push({
          filename: file.name,
          data: result,
          contentType: file.type
        });
      }
    }

    if (allDocs.length > 0) {
      // Replace all original contents with newly uploaded documents
      setOriginalContents(allDocs);
      setCurrentDocIndex(0);
      setProcessingStatus('');
      alert(`✅ ${allDocs.length} document(s) uploaded successfully!`);
    } else {
      setProcessingStatus('');
    }

    // Reset file input
    event.target.value = '';
  };

  // Handle PM translation upload (with PDF to image conversion and HTML/Word support)
  const handlePmTranslationUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    setProcessingStatus('Processing translation files...');
    const allImages = [];
    let htmlContent = '';

    for (const file of selectedFiles) {
      const fileName = file.name.toLowerCase();

      // PDF - store directly
      if (fileName.endsWith('.pdf')) {
        setProcessingStatus(`Loading PDF: ${file.name}`);
        const reader = new FileReader();
        const result = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const base64 = result.split(',')[1] || result;
        allImages.push({
          filename: file.name,
          data: base64,
          type: 'application/pdf'
        });
      }
      // HTML file
      else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        const reader = new FileReader();
        const content = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        htmlContent = content;
      }
      // Word document
      else if (fileName.endsWith('.docx')) {
        try {
          setProcessingStatus(`Converting Word document: ${file.name}`);
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          htmlContent = result.value;
        } catch (err) {
          console.error('Word conversion error:', err);
          alert(`Error converting Word document: ${file.name}`);
        }
      }
      // Plain text
      else if (fileName.endsWith('.txt')) {
        const reader = new FileReader();
        const content = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        htmlContent = `<pre style="white-space: pre-wrap; font-family: 'Times New Roman', serif;">${content}</pre>`;
      }
      // Image files
      else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const result = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const base64 = result.split(',')[1];
        allImages.push({
          filename: file.name,
          data: base64,
          type: file.type
        });
      }
    }

    setPmTranslationFiles(allImages);
    setPmTranslationHtml(htmlContent);

    // Also populate translationResults for the REVIEW editor
    const newResults = [];
    if (htmlContent) {
      newResults.push({
        translatedText: htmlContent,
        originalText: '',
        filename: 'uploaded_translation'
      });
    }
    if (allImages.length > 0) {
      allImages.forEach((img, idx) => {
        const imgHtml = `<div style="text-align:center;"><img src="data:${img.type || 'image/png'};base64,${img.data}" style="max-width:100%; height:auto;" alt="Translation page ${idx + 1}" /></div>`;
        newResults.push({
          translatedText: imgHtml,
          originalText: '',
          filename: img.filename || `page_${idx + 1}`
        });
      });
    }
    if (newResults.length > 0) {
      setTranslationResults(newResults);
    }

    // Also populate Quick Package variables for DELIVER tab
    setQuickTranslationFiles(allImages);
    if (htmlContent) {
      setQuickTranslationHtml(htmlContent);
      setQuickTranslationType('html');
    } else if (allImages.length > 0) {
      setQuickTranslationType('images');
    }

    setProcessingStatus('✅ Translation uploaded successfully!');
    setTimeout(() => setProcessingStatus(''), 3000);

    event.target.value = '';
  };

  // Generate PM Package (same format as Quick Package)
  const handlePmPackageDownload = async () => {
    // Check for any translation source: pmTranslationFiles, pmTranslationHtml, translatedContent, or translationResults
    const hasTranslation = pmTranslationFiles.length > 0 || pmTranslationHtml || translatedContent || translationResults.length > 0;
    // Check for any original source: originalContents or originalImages
    const hasOriginal = originalContents.length > 0 || originalImages.length > 0;

    if (!hasTranslation) {
      alert('Please upload or create a translation first');
      return;
    }

    setPmPackageGenerating(true);
    setProcessingStatus('Generating package...');

    await new Promise(resolve => setTimeout(resolve, 100));

    const order = selectedReview;
    const pageSizeCSS = pageFormat === 'a4' ? 'A4' : 'Letter';
    const certTitle = translationType === 'sworn' ? 'Sworn Translation Certificate' : 'Certification of Translation Accuracy';

    // Cover Letter HTML (same as Quick Package)
    const coverLetterHTML = `
    <!-- COVER LETTER PAGE -->
    <div class="cover-page">
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
        <div class="header-line"></div>

        <div class="order-number">Order # <strong>${order?.order_number || orderNumber || 'P0000'}</strong></div>
        <h1 class="main-title">${certTitle}</h1>
        <div class="subtitle">
            Translation of a <strong>${order?.document_type || documentType || 'Document'}</strong> from <strong>${order?.source_language || sourceLanguage || 'Portuguese'}</strong> to<br>
            <strong>${order?.target_language || targetLanguage || 'English'}</strong>
        </div>

        ${(() => {
          let templateParagraphs;
          if (selectedCertificateTemplate.startsWith('custom-')) {
            const customTemplate = customCertificateTemplates.find(t => `custom-${t.id}` === selectedCertificateTemplate);
            templateParagraphs = customTemplate?.bodyParagraphs || CERTIFICATE_TEMPLATES['default'].bodyParagraphs;
          } else {
            templateParagraphs = CERTIFICATE_TEMPLATES[selectedCertificateTemplate]?.bodyParagraphs || CERTIFICATE_TEMPLATES['default'].bodyParagraphs;
          }
          return templateParagraphs.map(paragraph => {
            const processedParagraph = paragraph
              .replace(/\{\{sourceLanguage\}\}/g, order?.source_language || sourceLanguage || 'Portuguese')
              .replace(/\{\{targetLanguage\}\}/g, order?.target_language || targetLanguage || 'English');
            return `<p class="body-text">${processedParagraph}</p>`;
          }).join('\n        ');
        })()}

        <div class="footer-section">
            <div class="signature-block">
                ${signatureImage
                  ? `<img src="${signatureImage}" alt="Signature" style="max-height: 32px; max-width: 150px; object-fit: contain; margin-bottom: 2px;" />`
                  : `<div style="font-family: 'Rage Italic', cursive; font-size: 20px; color: #1a365d; margin-bottom: 2px;">Beatriz Paiva</div>`}
                <div class="signature-name">${user?.full_name || 'Beatriz Paiva'}</div>
                <div class="signature-title">Legal Representative (Legacy Translations)</div>
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
        </div>
        <div class="header-line"></div>`;

    // Translation pages - use pmTranslationHtml, pmTranslationFiles, or translationResults
    let translationPagesHTML = '';

    // Priority 1: PM uploaded HTML content
    if (pmTranslationHtml) {
      translationPagesHTML = `
    <div class="translation-text-page">
        ${includeLetterhead ? `
        <div class="running-header">
            ${letterheadHTML}
        </div>
        <div class="running-header-spacer"></div>
        ` : ''}
        <div class="translation-content translation-text">
            ${pmTranslationHtml}
        </div>
    </div>`;
    }
    // Priority 2: translatedContent from PM Dashboard (loaded from database)
    else if (translatedContent && pmTranslationFiles.length === 0) {
      const translationHTML = translatedContent.html || translatedContent.data || '';
      translationPagesHTML = `
    <div class="translation-text-page">
        ${includeLetterhead ? `
        <div class="running-header">
            ${letterheadHTML}
        </div>
        <div class="running-header-spacer"></div>
        ` : ''}
        <div class="translation-content translation-text">
            ${translationHTML}
        </div>
    </div>`;
    }
    // Priority 3: translationResults from Translation Workspace
    else if (translationResults.length > 0 && pmTranslationFiles.length === 0) {
      const translationHTML = translationResults.map(r => r.translatedText).join('\n\n');
      translationPagesHTML = `
    <div class="translation-text-page">
        ${includeLetterhead ? `
        <div class="running-header">
            ${letterheadHTML}
        </div>
        <div class="running-header-spacer"></div>
        ` : ''}
        <div class="translation-content translation-text">
            ${translationHTML}
        </div>
    </div>`;
    }

    // Add PM uploaded translation images
    if (pmTranslationFiles.length > 0) {
      translationPagesHTML += pmTranslationFiles.map((file, idx) => `
    <div class="translation-page">
        ${includeLetterhead ? letterheadHTML : ''}
        <div class="translation-content">
            <img src="data:${file.type || 'image/png'};base64,${file.data}" alt="Translation page ${idx + 1}" class="translation-image" />
        </div>
    </div>`).join('');
    }

    // Original document pages - use originalContents or originalImages
    let originalPagesHTML = '';
    const origDocs = originalContents.length > 0 ? originalContents : originalImages;

    if (includeOriginal && origDocs.length > 0) {
      originalPagesHTML = origDocs.map((doc, idx) => {
        const imgSrc = doc.data?.startsWith('data:') ? doc.data : `data:${doc.contentType || doc.type || 'image/png'};base64,${doc.data}`;
        return `
    <div class="original-documents-page">
        ${includeLetterhead ? letterheadHTML : ''}
        ${idx === 0 ? '<div class="page-title">Original Document</div>' : ''}
        <div class="original-image-container">
            <img src="${imgSrc}" alt="Original page ${idx + 1}" class="original-image" />
        </div>
    </div>`;
      }).join('');
    }

    // Complete HTML
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${certTitle} - ${order?.order_number || 'Document'}</title>
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
            margin-bottom: 10px;
            padding-bottom: 10px;
        }
        .header-line {
            height: 2px;
            background: #93C5FD;
            margin-bottom: 15px;
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
        .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
        .signature-block { text-align: left; }
        .signature-name { font-size: 13px; font-weight: bold; margin-top: 5px; }
        .signature-title { font-size: 11px; color: #666; }
        .signature-date { font-size: 11px; color: #666; margin-top: 5px; }
        .stamp-container { text-align: right; }
        .stamp {
            width: 140px; height: 140px; border: 3px solid #1a365d; border-radius: 50%;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: Arial, sans-serif; color: #1a365d;
        }
        .stamp-text-top { font-size: 10px; font-weight: bold; letter-spacing: 1px; }
        .stamp-center { text-align: center; margin: 5px 0; }
        .stamp-company { font-size: 9px; font-weight: bold; }
        .stamp-ata { font-size: 8px; }
        .cover-page { page-break-after: always; padding: 30px 40px; }
        .translation-page { page-break-after: always; }
        .translation-text-page { page-break-after: always; }
        .original-documents-page { page-break-after: always; }
        .translation-content { margin-top: 10px; }
        .translation-image { max-width: 100%; height: auto; }
        .translation-text { font-size: 12px; line-height: 1.6; }
        .translation-text p { margin-bottom: 12px; text-align: justify; orphans: 4; widows: 4; }
        .translation-text table { width: 100%; border-collapse: collapse; margin: 15px 0; page-break-inside: avoid; }
        .translation-text td, .translation-text th { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; }
        .page-title { font-size: 18px; font-weight: bold; color: #1a365d; margin-bottom: 15px; text-align: center; }
        .original-image-container { text-align: center; }
        .original-image { max-width: 100%; height: auto; border: 1px solid #ddd; }
        .running-header { position: running(header); }
        .running-header-spacer { height: 80px; }
        @page { @top-center { content: element(header); } }
        @media print {
            body { padding: 0; }
            .cover-page, .translation-page, .translation-text-page, .original-documents-page { page-break-after: always; }
        }
    </style>
</head>
<body>
    ${includeCover ? coverLetterHTML : ''}
    ${translationPagesHTML}
    ${originalPagesHTML}
</body>
</html>`;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(fullHTML);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }

    setPmPackageGenerating(false);
    setProcessingStatus('');
  };

  // Load review content
  const loadReviewContent = async (order) => {
    setSelectedReview(order);
    setCorrectionNotes('');
    setCurrentDocIndex(0);
    setOriginalContents([]);
    // Reset PM package state
    setPmTranslationFiles([]);
    setPmTranslationHtml('');

    try {
      // Fetch documents for this order
      const docsRes = await axios.get(`${API}/admin/orders/${order.id}/documents?admin_key=${adminKey}`);
      const docs = docsRes.data.documents || [];

      // Load ALL original documents (not just the first one)
      const originalDocs = docs.filter(d => d.document_type === 'original' || !d.document_type || d.source === 'manual_upload' || d.source === 'partner_upload');
      const loadedDocs = [];

      for (const doc of originalDocs) {
        try {
          const origData = await axios.get(`${API}/admin/order-documents/${doc.id}/download?admin_key=${adminKey}`);
          if (origData.data.file_data) {
            const contentType = origData.data.content_type || 'application/pdf';
            const filename = doc.filename || origData.data.filename || 'document';
            const fileData = origData.data.file_data;

            // Check if it's a PDF and convert to images
            if (contentType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
              try {
                // Convert base64 PDF to images
                const pdfData = fileData.startsWith('data:') ? fileData : `data:application/pdf;base64,${fileData}`;
                const base64Content = pdfData.split(',')[1] || fileData;
                const binaryString = atob(base64Content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                const pdf = await pdfjsLib.getDocument(bytes).promise;
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                  const page = await pdf.getPage(pageNum);
                  const scale = 2;
                  const viewport = page.getViewport({ scale });
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;
                  await page.render({ canvasContext: context, viewport }).promise;
                  const imageData = canvas.toDataURL('image/png');

                  loadedDocs.push({
                    id: `${doc.id}_page_${pageNum}`,
                    filename: `${filename}_page_${pageNum}.png`,
                    data: imageData,
                    contentType: 'image/png'
                  });
                }
              } catch (pdfErr) {
                console.error('PDF conversion error:', pdfErr);
                // Fallback: add as PDF if conversion fails
                loadedDocs.push({
                  id: doc.id,
                  filename: filename,
                  data: fileData,
                  contentType: contentType
                });
              }
            } else {
              // Not a PDF, add as-is
              loadedDocs.push({
                id: doc.id,
                filename: filename,
                data: fileData,
                contentType: contentType
              });
            }
          }
        } catch (e) {
          console.error('Failed to load document:', doc.id, e);
        }
      }
      setOriginalContents(loadedDocs);

      // Find and load translated document
      const translatedDoc = docs.find(d => d.document_type === 'translation' || d.filename?.includes('translation'));
      if (translatedDoc) {
        const transData = await axios.get(`${API}/admin/order-documents/${translatedDoc.id}/download?admin_key=${adminKey}`);
        setTranslatedContent({
          filename: translatedDoc.filename,
          data: transData.data.file_data,
          contentType: transData.data.content_type,
          html: transData.data.html_content
        });
      } else if (order.translation_html) {
        // Load translation from order's translation_html field
        setTranslatedContent({
          filename: 'Translation',
          html: order.translation_html,
          contentType: 'text/html'
        });
      } else {
        // Try to fetch order details to get translation_html
        try {
          const orderRes = await axios.get(`${API}/admin/orders/${order.id}?admin_key=${adminKey}`);
          const orderData = orderRes.data.order || orderRes.data;
          if (orderData.translation_html) {
            setTranslatedContent({
              filename: 'Translation',
              html: orderData.translation_html,
              contentType: 'text/html'
            });
          }
        } catch (orderErr) {
          console.error('Failed to fetch order details:', orderErr);
        }
      }
    } catch (err) {
      console.error('Failed to load review content:', err);
    }
  };

  // Approve translation - PM can ONLY send to Admin
  const approveTranslation = async (sendTo) => {
    if (!selectedReview) return;

    // PM can only send to Admin - enforce this
    if (!isAdmin && sendTo !== 'pending_admin_approval') {
      alert('PM can only send translations to Admin for approval');
      return;
    }

    setSendingAction(true);

    try {
      let newStatus;
      let alertMessage;
      let translationReady = false;

      if (sendTo === 'pending_admin_approval') {
        newStatus = 'pending_admin_approval';
        alertMessage = '✅ Translation sent to Admin for approval!';
        translationReady = true; // Now ready for Admin to review and send to client
      } else if (isAdmin && sendTo === 'client_review') {
        // Admin only
        newStatus = 'client_review';
        alertMessage = '✅ Sent to client for review!';
        translationReady = true;
      } else if (isAdmin) {
        // Admin only - mark as ready
        newStatus = 'ready';
        alertMessage = '✅ Translation approved and ready!';
        translationReady = true;
      } else {
        // Fallback for PM - always send to admin
        newStatus = 'pending_admin_approval';
        alertMessage = '✅ Translation sent to Admin for approval!';
        translationReady = true;
      }

      await axios.put(`${API}/admin/orders/${selectedReview.id}?admin_key=${adminKey}`, {
        translation_status: newStatus,
        translation_ready: translationReady,
        pm_approved_at: new Date().toISOString(),
        pm_approved_by: user?.name || 'PM'
      });

      // Update local state
      setOrders(prev => prev.map(o =>
        o.id === selectedReview.id ? { ...o, translation_status: newStatus } : o
      ));
      setReviewQueue(prev => prev.filter(o => o.id !== selectedReview.id));
      setSelectedReview(null);
      setOriginalContents([]);
      setTranslatedContent(null);

      alert(alertMessage);
    } catch (err) {
      console.error('Failed to approve:', err);
      alert('❌ Erro ao aprovar tradução');
    } finally {
      setSendingAction(false);
    }
  };

  // Request correction
  const requestCorrection = async () => {
    if (!selectedReview || !correctionNotes.trim()) {
      alert('Por favor, adicione notas de correção.');
      return;
    }
    setSendingAction(true);

    try {
      await axios.put(`${API}/admin/orders/${selectedReview.id}?admin_key=${adminKey}`, {
        translation_status: 'in_translation',
        pm_notes: correctionNotes
      });

      // Add message to translator
      const translator = translators.find(t =>
        t.id === selectedReview.assigned_translator_id ||
        t.name === selectedReview.assigned_translator
      );

      if (translator) {
        const msg = {
          id: Date.now(),
          from: user?.name,
          to: translator.name,
          toId: translator.id,
          content: `📝 Correção necessária para ${selectedReview.order_number}:\n${correctionNotes}`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'correction'
        };
        const updatedMessages = [...messages, msg];
        setMessages(updatedMessages);
        localStorage.setItem(`pm_messages_${user?.id}`, JSON.stringify(updatedMessages));
      }

      // Update local state
      setOrders(prev => prev.map(o =>
        o.id === selectedReview.id ? { ...o, translation_status: 'in_translation' } : o
      ));
      setReviewQueue(prev => prev.filter(o => o.id !== selectedReview.id));
      setSelectedReview(null);
      setOriginalContents([]);
      setTranslatedContent(null);
      setCorrectionNotes('');

      alert('📨 Solicitação de correção enviada ao tradutor!');
    } catch (err) {
      console.error('Failed to request correction:', err);
      alert('❌ Erro ao solicitar correção');
    } finally {
      setSendingAction(false);
    }
  };

  // Execute automatic proofreading
  const executeProofreading = async () => {
    if (!selectedReview || !translatedContent) {
      setProofreadingError('Nenhuma tradução selecionada para revisão.');
      return;
    }

    // Get original text from the first original document
    const originalText = originalContents.length > 0
      ? (originalContents[0].text || 'Texto original não disponível em formato texto')
      : 'Texto original não disponível';

    // Get translated text (extract from HTML if needed)
    let translatedText = '';
    if (translatedContent.html) {
      // Strip HTML tags for proofreading
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = translatedContent.html;
      translatedText = tempDiv.textContent || tempDiv.innerText || '';
    } else if (translatedContent.data) {
      try {
        translatedText = atob(translatedContent.data);
      } catch (e) {
        translatedText = 'Não foi possível extrair texto da tradução';
      }
    }

    if (!translatedText.trim()) {
      setProofreadingError('Não foi possível extrair o texto da tradução para revisão.');
      return;
    }

    setIsProofreading(true);
    setProofreadingError('');
    setProofreadingResult(null);

    try {
      // Get Claude API key from localStorage or settings
      const claudeApiKey = localStorage.getItem('claude_api_key') || '';

      if (!claudeApiKey) {
        setProofreadingError('Chave API do Claude não configurada. Configure em Configurações.');
        setIsProofreading(false);
        return;
      }

      const response = await axios.post(`${API}/admin/proofread?admin_key=${adminKey}`, {
        original_text: originalText,
        translated_text: translatedText.substring(0, 10000), // Limit text size
        source_language: selectedReview.translate_from || 'Portuguese (Brazil)',
        target_language: selectedReview.translate_to || 'English',
        document_type: selectedReview.document_type || 'General Document',
        claude_api_key: claudeApiKey
      });

      if (response.data.proofreading_result) {
        setProofreadingResult(response.data.proofreading_result);
      } else if (response.data.raw_response) {
        setProofreadingError(`Resposta da IA:\n${response.data.raw_response.substring(0, 500)}...`);
      }
    } catch (error) {
      console.error('Proofreading error:', error);
      setProofreadingError(error.response?.data?.detail || error.message || 'Erro ao executar revisão automática');
    } finally {
      setIsProofreading(false);
    }
  };

  // Get upcoming deadlines for calendar
  const getUpcomingDeadlines = () => {
    const now = new Date();
    const upcoming = orders
      .filter(o => o.deadline && !['delivered', 'ready'].includes(o.translation_status))
      .map(o => ({
        ...o,
        deadlineDate: new Date(o.deadline),
        daysLeft: Math.ceil((new Date(o.deadline) - now) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => a.deadlineDate - b.deadlineDate);
    return upcoming;
  };

  // Section navigation
  const sections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'review', label: 'Review Translations', icon: '✅' },
    { id: 'team', label: 'My Team', icon: '👥' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'messages', label: 'Messages', icon: '💬' }
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🎯 PM Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs flex items-center gap-1"
        >
          <RefreshIcon className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Section Navigation */}
      <div className="flex space-x-1 mb-4 bg-white rounded-lg shadow p-1">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
              activeSection === section.id
                ? 'bg-teal-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="mr-1">{section.icon}</span>
            {section.label}
            {section.id === 'review' && reviewQueue.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {reviewQueue.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW SECTION */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-6 gap-3">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-[10px] text-gray-500 uppercase">Total Projects</div>
              <div className="text-2xl font-bold text-gray-800">{stats.totalProjects}</div>
            </div>
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg shadow p-4 text-white">
              <div className="text-[10px] uppercase opacity-80">In Progress</div>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-4 text-white">
              <div className="text-[10px] uppercase opacity-80">Awaiting Review</div>
              <div className="text-2xl font-bold">{stats.awaitingReview}</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-4 text-white">
              <div className="text-[10px] uppercase opacity-80">Completed</div>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </div>
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg shadow p-4 text-white">
              <div className="text-[10px] uppercase opacity-80">On Time</div>
              <div className="text-2xl font-bold">{stats.onTime}</div>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow p-4 text-white">
              <div className="text-[10px] uppercase opacity-80">Delayed</div>
              <div className="text-2xl font-bold">{stats.delayed}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">⚡ Quick Actions</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSection('review')}
                className="px-4 py-2 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 flex items-center gap-2"
              >
                ✅ Review Translations ({reviewQueue.length})
              </button>
              <button
                onClick={() => setActiveSection('team')}
                className="px-4 py-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 flex items-center gap-2"
              >
                👥 View Team
              </button>
              <button
                onClick={() => setActiveSection('calendar')}
                className="px-4 py-2 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 flex items-center gap-2"
              >
                📅 View Deadlines
              </button>
            </div>
          </div>

          {/* Recent Projects */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">📋 Recent Projects</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Code</th>
                    <th className="text-left py-2 px-2">Client</th>
                    <th className="text-left py-2 px-2">Languages</th>
                    <th className="text-left py-2 px-2">Translator</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map(order => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2">
                        <button
                          onClick={() => viewProjectFiles(order)}
                          className="font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {order.order_number}
                        </button>
                      </td>
                      <td className="py-2 px-2">{order.client_name}</td>
                      <td className="py-2 px-2">{order.translate_from} → {order.translate_to}</td>
                      <td className="py-2 px-2">{order.assigned_translator || '-'}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${STATUS_COLORS[order.translation_status] || 'bg-gray-100'}`}>
                          {order.translation_status}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        {order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QUOTE SECTION - Professional Quote Generator */}
      {activeSection === 'quote' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Quote Form */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-4">💰 Gerar Orçamento Profissional</h3>

              <div className="space-y-3">
                {/* Client Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Nome do Cliente *</label>
                    <input
                      type="text"
                      value={quoteForm.clientName}
                      onChange={(e) => setQuoteForm({...quoteForm, clientName: e.target.value})}
                      className="w-full px-2 py-1.5 text-xs border rounded"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Email do Cliente *</label>
                    <input
                      type="email"
                      value={quoteForm.clientEmail}
                      onChange={(e) => setQuoteForm({...quoteForm, clientEmail: e.target.value})}
                      className="w-full px-2 py-1.5 text-xs border rounded"
                      placeholder="client@email.com"
                    />
                  </div>
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">Tipo de Documento</label>
                  <select
                    value={quoteForm.documentType}
                    onChange={(e) => setQuoteForm({...quoteForm, documentType: e.target.value})}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                  >
                    {DOCUMENT_TYPES.map(doc => <option key={doc.value} value={doc.value}>{doc.label}</option>)}
                  </select>
                </div>

                {/* Languages */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Idioma de Origem</label>
                    <select
                      value={quoteForm.sourceLanguage}
                      onChange={(e) => setQuoteForm({...quoteForm, sourceLanguage: e.target.value})}
                      className="w-full px-2 py-1.5 text-xs border rounded"
                    >
                      {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Idioma de Destino</label>
                    <select
                      value={quoteForm.targetLanguage}
                      onChange={(e) => setQuoteForm({...quoteForm, targetLanguage: e.target.value})}
                      className="w-full px-2 py-1.5 text-xs border rounded"
                    >
                      {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                  </div>
                </div>

                {/* Service Type & Urgency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Tipo de Serviço</label>
                    <select
                      value={quoteForm.serviceType}
                      onChange={(e) => {
                        const prices = { certified: 24.99, sworn: 34.99, apostille: 85.00, standard: 19.50 };
                        setQuoteForm({
                          ...quoteForm,
                          serviceType: e.target.value,
                          pricePerPage: prices[e.target.value] || 24.99
                        });
                      }}
                      className="w-full px-2 py-1.5 text-xs border rounded"
                    >
                      <option value="certified">Tradução Certificada (Certified)</option>
                      <option value="sworn">Tradução Juramentada (Sworn)</option>
                      <option value="apostille" disabled>Apostila (Apostille) - Coming Soon</option>
                      <option value="standard">Tradução Profissional (Standard)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Urgência</label>
                    <select
                      value={quoteForm.urgency}
                      onChange={(e) => setQuoteForm({...quoteForm, urgency: e.target.value})}
                      className="w-full px-2 py-1.5 text-xs border rounded"
                    >
                      <option value="no">Normal (2-3 dias úteis)</option>
                      <option value="priority">Prioritário (24 horas) +25%</option>
                      <option value="urgent">Urgente (12 horas) +100%</option>
                    </select>
                  </div>
                </div>

                {/* Delivery Method */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">Método de Entrega</label>
                  <select
                    value={quoteForm.deliveryMethod}
                    onChange={(e) => setQuoteForm({...quoteForm, deliveryMethod: e.target.value})}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                  >
                    {Object.entries(PM_DELIVERY_OPTIONS).map(([key, opt]) => (
                      <option key={key} value={key}>
                        {opt.name} {opt.price > 0 ? `(+$${opt.price.toFixed(2)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Nº de Páginas</label>
                    <input
                      type="number"
                      value={quoteForm.pageCount}
                      onChange={(e) => setQuoteForm({...quoteForm, pageCount: parseInt(e.target.value) || 1})}
                      min="1"
                      className="w-full px-2 py-1.5 text-xs border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Preço por Página ($)</label>
                    <input
                      type="number"
                      value={quoteForm.pricePerPage}
                      onChange={(e) => setQuoteForm({...quoteForm, pricePerPage: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1.5 text-xs border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Desconto (%)</label>
                    <input
                      type="number"
                      value={quoteForm.discount}
                      onChange={(e) => setQuoteForm({...quoteForm, discount: parseFloat(e.target.value) || 0})}
                      min="0"
                      max="100"
                      className="w-full px-2 py-1.5 text-xs border rounded"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">Observações</label>
                  <textarea
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm({...quoteForm, notes: e.target.value})}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                    rows="2"
                    placeholder="Observações adicionais para o orçamento..."
                  />
                </div>

                {/* Quote Language Selection */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">Idioma do Orçamento</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'en', label: '🇺🇸 English' },
                      { value: 'pt', label: '🇧🇷 Português' },
                      { value: 'es', label: '🇪🇸 Español' }
                    ].map(lang => (
                      <button
                        key={lang.value}
                        onClick={() => setQuoteLanguage(lang.value)}
                        className={`px-3 py-1.5 text-xs rounded ${
                          quoteLanguage === lang.value
                            ? 'bg-teal-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Button */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowQuotePreview(true)}
                    className="w-full px-4 py-2 bg-teal-500 text-white rounded text-sm font-medium hover:bg-teal-600"
                  >
                    👁️ Visualizar Orçamento
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="space-y-4">
              {/* Price Summary */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">📊 Resumo do Orçamento</h3>
                {(() => {
                  const prices = calculateQuote();
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{quoteForm.pageCount} página(s) × ${quoteForm.pricePerPage.toFixed(2)}</span>
                        <span className="font-medium">${prices.basePrice.toFixed(2)}</span>
                      </div>
                      {prices.urgencyFee > 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Taxa de Urgência ({quoteForm.urgency === 'priority' ? '+25%' : '+100%'})</span>
                          <span>+${prices.urgencyFee.toFixed(2)}</span>
                        </div>
                      )}
                      {prices.deliveryFee > 0 && (
                        <div className="flex justify-between text-sm text-blue-600">
                          <span>Taxa de Entrega ({PM_DELIVERY_OPTIONS[quoteForm.deliveryMethod]?.name})</span>
                          <span>+${prices.deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                      {prices.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Desconto ({quoteForm.discount}%)</span>
                          <span>-${prices.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between text-lg font-bold">
                          <span>TOTAL</span>
                          <span className="text-teal-600">${prices.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Recent Clients */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">👤 Recent Clients</h3>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {orders.slice(0, 5).map(order => (
                    <div
                      key={order.id}
                      onClick={() => setQuoteForm({
                        ...quoteForm,
                        clientName: order.client_name,
                        clientEmail: order.client_email
                      })}
                      className="p-2 border rounded cursor-pointer hover:bg-teal-50 text-xs"
                    >
                      <div className="font-medium">{order.client_name}</div>
                      <div className="text-gray-500">{order.client_email}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quote Preview Modal */}
          {showQuotePreview && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
                {/* Quote Document */}
                <div className="p-8" id="quote-preview">
                  {(() => {
                    const t = quoteTranslations[quoteLanguage];
                    const prices = calculateQuote();
                    const quoteNumber = `LT-${Date.now().toString().slice(-6)}`;
                    const today = new Date().toLocaleDateString(quoteLanguage === 'pt' ? 'pt-BR' : quoteLanguage === 'es' ? 'es-ES' : 'en-US');
                    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(quoteLanguage === 'pt' ? 'pt-BR' : quoteLanguage === 'es' ? 'es-ES' : 'en-US');

                    return (
                      <>
                        {/* Header with Logo */}
                        <div className="text-center border-b pb-4 mb-6">
                          <div className="text-3xl font-bold text-teal-600 mb-1">LEGACY</div>
                          <div className="text-sm text-gray-500">{t.tagline}</div>
                        </div>

                        {/* Quote Title */}
                        <div className="text-center mb-6">
                          <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
                          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                            <div>
                              <span className="text-gray-500">{t.quoteNumber}</span>
                              <div className="font-bold text-teal-600">{quoteNumber}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">{t.date}</span>
                              <div className="font-medium">{today}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">{t.validUntil}</span>
                              <div className="font-medium">{validUntil}</div>
                            </div>
                          </div>
                        </div>

                        {/* Client Info */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                          <h3 className="font-bold text-gray-700 mb-2">{t.clientInfo}</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">{t.name}:</span>
                              <span className="ml-2 font-medium">{quoteForm.clientName || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">{t.email}:</span>
                              <span className="ml-2 font-medium">{quoteForm.clientEmail || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Service Details */}
                        <div className="mb-6">
                          <h3 className="font-bold text-gray-700 mb-3">{t.serviceDetails}</h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex justify-between border-b pb-2">
                              <span className="text-gray-500">{t.documentType}:</span>
                              <span className="font-medium">{DOCUMENT_TYPES.find(d => d.value === quoteForm.documentType)?.label || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                              <span className="text-gray-500">{t.serviceType}:</span>
                              <span className="font-medium">{quoteForm.serviceType === 'standard' ? t.certified : t.professional}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                              <span className="text-gray-500">{t.sourceLanguage}:</span>
                              <span className="font-medium">{quoteForm.sourceLanguage}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                              <span className="text-gray-500">{t.targetLanguage}:</span>
                              <span className="font-medium">{quoteForm.targetLanguage}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2 col-span-2">
                              <span className="text-gray-500">{t.urgency}:</span>
                              <span className="font-medium">
                                {quoteForm.urgency === 'no' ? t.normal : quoteForm.urgency === 'priority' ? t.priority : t.urgent}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Pricing Table */}
                        <div className="mb-6">
                          <h3 className="font-bold text-gray-700 mb-3">{t.pricing}</h3>
                          <table className="w-full text-sm">
                            <tbody>
                              <tr className="border-b">
                                <td className="py-2 text-gray-600">{t.pages}</td>
                                <td className="py-2 text-right">{quoteForm.pageCount}</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 text-gray-600">{t.pricePerPage}</td>
                                <td className="py-2 text-right">${quoteForm.pricePerPage.toFixed(2)}</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 text-gray-600">{t.subtotal}</td>
                                <td className="py-2 text-right">${prices.basePrice.toFixed(2)}</td>
                              </tr>
                              {prices.urgencyFee > 0 && (
                                <tr className="border-b text-orange-600">
                                  <td className="py-2">{t.urgencyFee}</td>
                                  <td className="py-2 text-right">+${prices.urgencyFee.toFixed(2)}</td>
                                </tr>
                              )}
                              {prices.deliveryFee > 0 && (
                                <tr className="border-b text-blue-600">
                                  <td className="py-2">{quoteLanguage === 'pt' ? 'Taxa de Entrega' : quoteLanguage === 'es' ? 'Tarifa de Envío' : 'Delivery Fee'}</td>
                                  <td className="py-2 text-right">+${prices.deliveryFee.toFixed(2)}</td>
                                </tr>
                              )}
                              {prices.discountAmount > 0 && (
                                <tr className="border-b text-green-600">
                                  <td className="py-2">{t.discount} ({quoteForm.discount}%)</td>
                                  <td className="py-2 text-right">-${prices.discountAmount.toFixed(2)}</td>
                                </tr>
                              )}
                              <tr className="bg-teal-50 font-bold text-lg">
                                <td className="py-3 text-teal-700">{t.total}</td>
                                <td className="py-3 text-right text-teal-700">${prices.total.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Notes */}
                        {quoteForm.notes && (
                          <div className="mb-6 bg-yellow-50 rounded-lg p-4">
                            <h3 className="font-bold text-gray-700 mb-2">{t.notes}</h3>
                            <p className="text-sm text-gray-600">{quoteForm.notes}</p>
                          </div>
                        )}

                        {/* Terms */}
                        <div className="mb-6 text-xs text-gray-500 border-t pt-4">
                          <h4 className="font-bold mb-1">{t.terms}</h4>
                          <p>{t.termsText}</p>
                        </div>

                        {/* Footer */}
                        <div className="text-center border-t pt-4">
                          <p className="font-medium text-teal-600 mb-3 text-base">{t.thankYou}</p>
                          <div className="bg-gray-50 rounded-lg p-4 inline-block">
                            <p className="text-gray-700 font-medium mb-1">Legacy Translation Services</p>
                            <p className="text-gray-600 text-sm">legacytranslations.com | {t.phone}: +1(857)316-7770</p>
                            <p className="text-gray-600 text-sm">{t.website}: www.legacytranslation.com</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Modal Actions */}
                <div className="border-t p-4 flex justify-between items-center bg-gray-50">
                  <button
                    onClick={() => setShowQuotePreview(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ← Voltar
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 flex items-center gap-1"
                    >
                      🖨️ Imprimir
                    </button>
                    <button
                      onClick={sendQuoteEmail}
                      disabled={sendingQuote || !quoteForm.clientEmail}
                      className="px-4 py-2 bg-teal-500 text-white rounded text-sm hover:bg-teal-600 disabled:bg-gray-400 flex items-center gap-1"
                    >
                      {sendingQuote ? '⏳ Enviando...' : '📧 Enviar por Email'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REVIEW SECTION - Side by Side View */}
      {activeSection === 'review' && (
        <div className="space-y-4">
          {!selectedReview ? (
            /* Review Queue List */
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">📥 Review Queue ({reviewQueue.length})</h3>
              {reviewQueue.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✅</div>
                  <p>No translations awaiting review</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reviewQueue.map(order => (
                    <div
                      key={order.id}
                      onClick={() => onNavigateToTranslation(order)}
                      className="p-3 border rounded-lg hover:bg-teal-50 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <div>
                        <div className="font-mono text-blue-600 font-medium">{order.order_number}</div>
                        <div className="text-xs text-gray-500">{order.client_name}</div>
                        <div className="text-[10px] text-gray-400">
                          {order.translate_from} → {order.translate_to} • Translator: {order.assigned_translator || 'N/A'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-600">
                          {order.deadline ? new Date(order.deadline).toLocaleDateString('en-US') : 'No deadline'}
                        </div>
                        <button className="mt-1 px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600">
                          Review →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Side-by-Side Review View */
            <div className="bg-white rounded-lg shadow">
              {/* Review Header */}
              <div className="p-4 border-b">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <button
                      onClick={() => { setSelectedReview(null); setOriginalContents([]); setTranslatedContent(null); }}
                      className="text-gray-500 hover:text-gray-700 text-sm mb-1"
                    >
                      ← Back to queue
                    </button>
                    <h3 className="text-lg font-bold text-gray-800">
                      Review: {selectedReview.order_number}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Client: {selectedReview.client_name} • {selectedReview.translate_from} → {selectedReview.translate_to}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={requestCorrection}
                      disabled={sendingAction}
                      className="px-4 py-2 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:bg-gray-400 flex items-center gap-1"
                    >
                      ❌ Request Correction
                    </button>
                    <button
                      onClick={() => approveTranslation('pending_admin_approval')}
                      disabled={sendingAction}
                      className="px-4 py-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-1"
                    >
                      {sendingAction ? '⏳ Sending...' : '📤 Send to Admin'}
                    </button>
                    <button
                      onClick={handlePmPackageDownload}
                      disabled={pmPackageGenerating || (!translatedContent && pmTranslationFiles.length === 0 && !pmTranslationHtml)}
                      className="px-4 py-2 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-1"
                    >
                      {pmPackageGenerating ? '⏳ Generating...' : '📦 Generate Package'}
                    </button>
                  </div>
                </div>
                {/* Processing Status for PM */}
                {(sendingAction || processingStatus) && (
                  <div className={`mx-4 mb-2 p-2 rounded text-sm ${
                    processingStatus?.includes('❌') ? 'bg-red-100 text-red-700' :
                    processingStatus?.includes('✅') ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {sendingAction && !processingStatus ? '⏳ Processing...' : processingStatus}
                  </div>
                )}
              </div>

              {/* Side by Side Content */}
              <div className="grid grid-cols-2 divide-x" style={{ height: 'calc(100vh - 300px)' }}>
                {/* Original Document(s) */}
                <div className="p-4 overflow-auto">
                  <div className="sticky top-0 bg-white py-1 z-10">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-gray-700">
                        📄 Original Documents ({originalContents.length})
                      </h4>
                      <label className="px-2 py-1 bg-orange-500 text-white text-xs rounded cursor-pointer hover:bg-orange-600">
                        📤 Upload
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          multiple
                          onChange={handlePmOriginalUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {originalContents.length > 1 && (
                      <div className="flex items-center justify-between mb-2 bg-gray-100 rounded p-2">
                        <button
                          onClick={() => setCurrentDocIndex(Math.max(0, currentDocIndex - 1))}
                          disabled={currentDocIndex === 0}
                          className="px-2 py-1 text-xs bg-white rounded border disabled:opacity-50"
                        >
                          ◀ Previous
                        </button>
                        <span className="text-xs font-medium">
                          {currentDocIndex + 1} / {originalContents.length}
                        </span>
                        <button
                          onClick={() => setCurrentDocIndex(Math.min(originalContents.length - 1, currentDocIndex + 1))}
                          disabled={currentDocIndex >= originalContents.length - 1}
                          className="px-2 py-1 text-xs bg-white rounded border disabled:opacity-50"
                        >
                          Next ▶
                        </button>
                      </div>
                    )}
                    {originalContents[currentDocIndex] && (
                      <p className="text-xs text-gray-500 mb-2 truncate">
                        📎 {originalContents[currentDocIndex].filename}
                      </p>
                    )}
                  </div>
                  {originalContents.length > 0 && originalContents[currentDocIndex] ? (
                    originalContents[currentDocIndex].contentType?.includes('image') || originalContents[currentDocIndex].data?.startsWith('data:image') ? (
                      <img
                        src={originalContents[currentDocIndex].data?.startsWith('data:')
                          ? originalContents[currentDocIndex].data
                          : `data:${originalContents[currentDocIndex].contentType};base64,${originalContents[currentDocIndex].data}`}
                        alt="Original"
                        className="max-w-full border rounded"
                      />
                    ) : originalContents[currentDocIndex].contentType?.includes('pdf') ? (
                      <iframe
                        src={originalContents[currentDocIndex].data?.startsWith('data:')
                          ? originalContents[currentDocIndex].data
                          : `data:application/pdf;base64,${originalContents[currentDocIndex].data}`}
                        className="w-full h-full border rounded"
                        title="Original PDF"
                      />
                    ) : (
                      <div className="p-4 bg-gray-50 rounded border text-sm whitespace-pre-wrap">
                        {atob(originalContents[currentDocIndex].data)}
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-2xl mb-2">📄</div>
                      <p className="text-xs">Original document not found</p>
                    </div>
                  )}
                </div>

                {/* Translated Document */}
                <div className="p-4 overflow-auto">
                  <div className="sticky top-0 bg-white py-1 z-10">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-gray-700">
                        ✍️ Translation {(pmTranslationFiles.length > 0 || pmTranslationHtml) &&
                          <span className="text-green-600 text-xs ml-2">
                            ({pmTranslationFiles.length} images{pmTranslationHtml ? ' + HTML' : ''})
                          </span>
                        }
                      </h4>
                      <label className="px-2 py-1 bg-green-500 text-white text-xs rounded cursor-pointer hover:bg-green-600">
                        📤 Upload Translation
                        <input
                          type="file"
                          accept="image/*,.pdf,.docx,.html,.htm,.txt"
                          multiple
                          onChange={handlePmTranslationUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  {translatedContent ? (
                    translatedContent.html ? (
                      <div
                        className="border rounded p-4 bg-white"
                        dangerouslySetInnerHTML={{ __html: translatedContent.html }}
                      />
                    ) : translatedContent.contentType?.includes('image') ? (
                      <img
                        src={translatedContent.data?.startsWith('data:')
                          ? translatedContent.data
                          : `data:${translatedContent.contentType};base64,${translatedContent.data}`}
                        alt="Translation"
                        className="max-w-full border rounded"
                      />
                    ) : translatedContent.contentType?.includes('pdf') ? (
                      <iframe
                        src={translatedContent.data?.startsWith('data:')
                          ? translatedContent.data
                          : `data:application/pdf;base64,${translatedContent.data}`}
                        className="w-full h-full border rounded"
                        title="Translation PDF"
                      />
                    ) : (
                      <div className="p-4 bg-gray-50 rounded border text-sm whitespace-pre-wrap">
                        {atob(translatedContent.data)}
                      </div>
                    )
                  ) : (pmTranslationFiles.length > 0 || pmTranslationHtml) ? (
                    <div>
                      {/* Show PM uploaded HTML content */}
                      {pmTranslationHtml && (
                        <div
                          className="border rounded p-4 bg-white mb-4"
                          dangerouslySetInnerHTML={{ __html: pmTranslationHtml }}
                        />
                      )}
                      {/* Show PM uploaded images */}
                      {pmTranslationFiles.map((file, idx) => (
                        <div key={idx} className="mb-4">
                          <p className="text-xs text-gray-500 mb-1">📎 {file.filename}</p>
                          <img
                            src={`data:${file.type || 'image/png'};base64,${file.data}`}
                            alt={`Translation page ${idx + 1}`}
                            className="max-w-full border rounded"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-2xl mb-2">✍️</div>
                      <p className="text-xs">Translation not found</p>
                      <p className="text-xs mt-2">Use "Upload Translation" to add files</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Correction Notes */}
              <div className="p-4 border-t bg-gray-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  📝 Correction Notes (to send to translator):
                </label>
                <textarea
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  placeholder="Describe necessary corrections..."
                  className="w-full p-2 border rounded text-xs h-20 resize-none"
                />
              </div>

              {/* Proofreading Section */}
              <div className="p-4 border-t bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-purple-700 flex items-center gap-2">
                    🔍 Proofreading (Revisão de Qualidade)
                  </h4>
                  <button
                    onClick={executeProofreading}
                    disabled={isProofreading || !translatedContent}
                    className="px-4 py-2 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {isProofreading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analisando...
                      </>
                    ) : (
                      <>🔍 Executar Proofreading</>
                    )}
                  </button>
                </div>

                {/* Error Message */}
                {proofreadingError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded mb-3">
                    <p className="text-xs text-red-600">❌ {proofreadingError}</p>
                  </div>
                )}

                {/* Results */}
                {proofreadingResult && (
                  <div className="space-y-3">
                    {/* Summary */}
                    <div className={`p-3 rounded border ${
                      proofreadingResult.resumo?.qualidade === 'APROVADO' ? 'bg-green-50 border-green-200' :
                      proofreadingResult.resumo?.qualidade === 'APROVADO_COM_OBSERVACOES' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold">
                          {proofreadingResult.resumo?.qualidade === 'APROVADO' ? '✅ APROVADO' :
                           proofreadingResult.resumo?.qualidade === 'APROVADO_COM_OBSERVACOES' ? '⚠️ APROVADO COM OBSERVAÇÕES' :
                           '❌ REPROVADO'}
                        </span>
                        <span className="text-xs text-gray-600">
                          {proofreadingResult.resumo?.total_erros || 0} erro(s) encontrado(s)
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-[10px]">
                        <div className="text-center p-1 bg-red-100 rounded">
                          <div className="font-bold text-red-600">{proofreadingResult.resumo?.criticos || 0}</div>
                          <div className="text-gray-600">Críticos</div>
                        </div>
                        <div className="text-center p-1 bg-orange-100 rounded">
                          <div className="font-bold text-orange-600">{proofreadingResult.resumo?.altos || 0}</div>
                          <div className="text-gray-600">Altos</div>
                        </div>
                        <div className="text-center p-1 bg-yellow-100 rounded">
                          <div className="font-bold text-yellow-600">{proofreadingResult.resumo?.medios || 0}</div>
                          <div className="text-gray-600">Médios</div>
                        </div>
                        <div className="text-center p-1 bg-blue-100 rounded">
                          <div className="font-bold text-blue-600">{proofreadingResult.resumo?.baixos || 0}</div>
                          <div className="text-gray-600">Baixos</div>
                        </div>
                      </div>
                    </div>

                    {/* Error List */}
                    {proofreadingResult.erros && proofreadingResult.erros.length > 0 && (
                      <div className="max-h-60 overflow-y-auto border rounded">
                        <table className="w-full text-[10px]">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Tipo</th>
                              <th className="p-2 text-left">Original</th>
                              <th className="p-2 text-left">Encontrado</th>
                              <th className="p-2 text-left">Sugerido</th>
                              <th className="p-2 text-center">Gravidade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {proofreadingResult.erros.map((erro, idx) => (
                              <tr key={idx} className={`border-t ${
                                erro.gravidade === 'CRÍTICO' ? 'bg-red-50' :
                                erro.gravidade === 'ALTO' ? 'bg-orange-50' :
                                erro.gravidade === 'MÉDIO' ? 'bg-yellow-50' :
                                'bg-blue-50'
                              }`}>
                                <td className="p-2">{erro.tipo}</td>
                                <td className="p-2 font-mono">{erro.original || '-'}</td>
                                <td className="p-2 font-mono text-red-600">{erro.encontrado || '-'}</td>
                                <td className="p-2 font-mono text-green-600">{erro.sugerido || '-'}</td>
                                <td className="p-2 text-center">
                                  <span className={`px-1 py-0.5 rounded text-white ${
                                    erro.gravidade === 'CRÍTICO' ? 'bg-red-500' :
                                    erro.gravidade === 'ALTO' ? 'bg-orange-500' :
                                    erro.gravidade === 'MÉDIO' ? 'bg-yellow-500' :
                                    'bg-blue-500'
                                  }`}>
                                    {erro.gravidade}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Observations */}
                    {proofreadingResult.observacoes && proofreadingResult.observacoes.length > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <h5 className="text-xs font-bold text-blue-700 mb-2">📌 Observações:</h5>
                        <ul className="text-[10px] text-gray-700 space-y-1">
                          {proofreadingResult.observacoes.map((obs, idx) => (
                            <li key={idx}>• {obs}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* No review yet message */}
                {!proofreadingResult && !proofreadingError && !isProofreading && (
                  <div className="text-center py-4 text-gray-400 text-xs">
                    Clique em "Executar Proofreading" para analisar a tradução automaticamente
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TEAM SECTION */}
      {activeSection === 'team' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">👥 My Translator Team</h3>
            <div className="grid grid-cols-3 gap-3">
              {translators.map(translator => {
                const translatorOrders = orders.filter(o =>
                  o.assigned_translator_id === translator.id ||
                  o.assigned_translator === translator.name
                );
                const activeOrders = translatorOrders.filter(o =>
                  ['in_translation', 'review'].includes(o.translation_status)
                );
                const completedOrders = translatorOrders.filter(o =>
                  ['ready', 'delivered'].includes(o.translation_status)
                );
                const isBusy = activeOrders.length > 0;

                return (
                  <div
                    key={translator.id}
                    className={`p-4 rounded-lg border-2 ${isBusy ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${isBusy ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                        <span className="font-medium text-sm">{translator.name}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${isBusy ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'}`}>
                        {isBusy ? 'Ocupado' : 'Disponível'}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mb-2">{translator.email}</div>

                    <div className="grid grid-cols-2 gap-2 text-center mt-3">
                      <div className="bg-white rounded p-2">
                        <div className="text-lg font-bold text-yellow-600">{activeOrders.length}</div>
                        <div className="text-[9px] text-gray-500">In Progress</div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-lg font-bold text-green-600">{completedOrders.length}</div>
                        <div className="text-[9px] text-gray-500">Completed</div>
                      </div>
                    </div>

                    {activeOrders.length > 0 && (
                      <div className="mt-3 pt-2 border-t">
                        <div className="text-[10px] font-medium text-gray-600 mb-1">Active Projects:</div>
                        {activeOrders.slice(0, 3).map((order, idx) => (
                          <div key={idx} className="flex justify-between text-[10px] py-0.5">
                            <span className="text-blue-600 font-mono">{order.order_number}</span>
                            <span className="text-gray-500">
                              {order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => { setSelectedTranslator(translator); setActiveSection('messages'); }}
                      className="mt-3 w-full px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600"
                    >
                      💬 Enviar Mensagem
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR SECTION */}
      {activeSection === 'calendar' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">📅 Deadline Calendar</h3>
            <div className="space-y-2">
              {getUpcomingDeadlines().map(order => (
                <div
                  key={order.id}
                  className={`p-3 rounded-lg border flex justify-between items-center ${
                    order.daysLeft < 0 ? 'bg-red-50 border-red-200' :
                    order.daysLeft <= 2 ? 'bg-orange-50 border-orange-200' :
                    order.daysLeft <= 5 ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
                  }`}
                >
                  <div>
                    <div className="font-mono text-blue-600 font-medium">{order.order_number}</div>
                    <div className="text-xs text-gray-600">{order.client_name}</div>
                    <div className="text-[10px] text-gray-500">
                      {order.translate_from} → {order.translate_to} • {order.assigned_translator || 'Sem tradutor'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      order.daysLeft < 0 ? 'text-red-600' :
                      order.daysLeft <= 2 ? 'text-orange-600' :
                      order.daysLeft <= 5 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {order.daysLeft < 0
                        ? `${Math.abs(order.daysLeft)} dias atrasado`
                        : order.daysLeft === 0
                        ? 'HOJE'
                        : `${order.daysLeft} dias`
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.deadlineDate.toLocaleDateString('pt-BR')}
                    </div>
                    <span className={`mt-1 inline-block px-2 py-0.5 rounded text-[10px] ${STATUS_COLORS[order.translation_status] || 'bg-gray-100'}`}>
                      {order.translation_status}
                    </span>
                  </div>
                </div>
              ))}
              {getUpcomingDeadlines().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📅</div>
                  <p>Nenhum prazo pendente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REPORTS SECTION */}
      {activeSection === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">📈 PM Reports</h3>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.totalProjects}</div>
                <div className="text-xs text-gray-600">Total de Projetos</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.totalProjects > 0 ? Math.round((stats.completed / stats.totalProjects) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-600">Taxa de Conclusão</div>
              </div>
              <div className="bg-teal-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-teal-600">
                  {stats.totalProjects > 0 ? Math.round((stats.onTime / stats.totalProjects) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-600">On-Time Delivery</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{translators.length}</div>
                <div className="text-xs text-gray-600">Team Translators</div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="mb-6">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Status Distribution</h4>
              <div className="flex h-6 rounded-lg overflow-hidden">
                {[
                  { status: 'received', color: 'bg-gray-400', count: orders.filter(o => o.translation_status === 'received').length },
                  { status: 'in_translation', color: 'bg-yellow-500', count: stats.inProgress },
                  { status: 'review', color: 'bg-purple-500', count: stats.awaitingReview },
                  { status: 'ready', color: 'bg-green-500', count: orders.filter(o => o.translation_status === 'ready').length },
                  { status: 'delivered', color: 'bg-teal-500', count: orders.filter(o => o.translation_status === 'delivered').length }
                ].map(item => (
                  item.count > 0 && (
                    <div
                      key={item.status}
                      className={`${item.color} flex items-center justify-center text-white text-[10px]`}
                      style={{ width: `${(item.count / stats.totalProjects) * 100}%` }}
                      title={`${item.status}: ${item.count}`}
                    >
                      {item.count}
                    </div>
                  )
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                <span>Received</span>
                <span>In Translation</span>
                <span>Review</span>
                <span>Ready</span>
                <span>Delivered</span>
              </div>
            </div>

            {/* Translator Performance */}
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Translator Performance</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2">Translator</th>
                    <th className="text-center py-2 px-2">Active</th>
                    <th className="text-center py-2 px-2">Completed</th>
                    <th className="text-center py-2 px-2">On Time</th>
                  </tr>
                </thead>
                <tbody>
                  {translators.map(translator => {
                    const tOrders = orders.filter(o =>
                      o.assigned_translator_id === translator.id ||
                      o.assigned_translator === translator.name
                    );
                    const active = tOrders.filter(o => ['in_translation', 'review'].includes(o.translation_status)).length;
                    const completed = tOrders.filter(o => ['ready', 'delivered'].includes(o.translation_status)).length;
                    const onTimeCount = tOrders.filter(o => {
                      if (!o.deadline) return true;
                      return new Date(o.deadline) >= new Date() || ['ready', 'delivered'].includes(o.translation_status);
                    }).length;

                    return (
                      <tr key={translator.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{translator.name}</td>
                        <td className="py-2 px-2 text-center">
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">{active}</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">{completed}</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded">
                            {tOrders.length > 0 ? Math.round((onTimeCount / tOrders.length) * 100) : 100}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES SECTION */}
      {activeSection === 'messages' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">💬 Comunicação com Tradutores</h3>

            <div className="grid grid-cols-3 gap-4">
              {/* Translator List */}
              <div className="border rounded-lg p-3">
                <h4 className="text-xs font-medium text-gray-600 mb-2">Selecionar Tradutor</h4>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {translators.length > 0 ? (
                    translators.map(translator => (
                      <button
                        key={translator.id}
                        onClick={() => setSelectedTranslator(translator)}
                        className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                          selectedTranslator?.id === translator.id
                            ? 'bg-teal-500 text-white'
                            : 'hover:bg-gray-100 border border-gray-100'
                        }`}
                      >
                        <div className="font-medium">{translator.name}</div>
                        <div className="text-[10px] opacity-70">{translator.email}</div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      <p>Nenhum tradutor cadastrado.</p>
                      <p className="mt-1">Cadastre tradutores na aba "Translators".</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Message Area */}
              <div className="col-span-2 border rounded-lg p-3">
                {selectedTranslator ? (
                  <>
                    <h4 className="text-xs font-medium text-gray-600 mb-2">
                      Conversa com {selectedTranslator.name}
                    </h4>

                    {/* Messages */}
                    <div className="h-64 overflow-y-auto border rounded p-2 mb-2 bg-gray-50">
                      {messages
                        .filter(m => m.toId === selectedTranslator.id || m.from === selectedTranslator.name)
                        .map(msg => (
                          <div
                            key={msg.id}
                            className={`mb-2 p-2 rounded text-xs ${
                              msg.from === user?.name
                                ? 'bg-teal-100 ml-8'
                                : 'bg-white mr-8 border'
                            }`}
                          >
                            <div className="font-medium text-[10px] text-gray-500 mb-1">
                              {msg.from} • {new Date(msg.timestamp).toLocaleString('pt-BR')}
                            </div>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          </div>
                        ))}
                      {messages.filter(m => m.toId === selectedTranslator.id || m.from === selectedTranslator.name).length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-xs">
                          Nenhuma mensagem ainda
                        </div>
                      )}
                    </div>

                    {/* Send Message */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 px-3 py-2 border rounded text-xs"
                      />
                      <button
                        onClick={sendMessage}
                        className="px-4 py-2 bg-teal-500 text-white rounded text-xs hover:bg-teal-600"
                      >
                        Enviar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="text-3xl mb-2">👈</div>
                      <p className="text-xs">Selecione um tradutor para iniciar conversa</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT FILES MODAL - For assigning translators to files */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-t-lg">
              <div>
                <h3 className="font-bold">📁 Arquivos do Projeto {selectedProject.order_number}</h3>
                <p className="text-xs opacity-80">{selectedProject.client_name} • {selectedProject.translate_from} → {selectedProject.translate_to}</p>
              </div>
              <button onClick={() => setSelectedProject(null)} className="text-white hover:text-gray-200 text-xl">×</button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-xs text-gray-500 mb-3">Selecione um tradutor para cada arquivo. Arquivos diferentes podem ser atribuídos a tradutores diferentes.</p>

              {loadingProjectDocs ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-2"></div>
                  Carregando arquivos...
                </div>
              ) : projectDocuments.length > 0 ? (
                <div className="space-y-3">
                  {projectDocuments.map((doc, idx) => (
                    <div key={doc.id || idx} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {doc.filename?.endsWith('.pdf') ? '📕' : doc.filename?.match(/\.(jpg|jpeg|png)$/i) ? '🖼️' : '📄'}
                          </span>
                          <div>
                            <div className="text-sm font-medium">{doc.filename || 'Documento'}</div>
                            <div className="text-[10px] text-gray-500">
                              {doc.source === 'manual_upload' ? 'Upload manual' : 'Portal do parceiro'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadProjectDocument(doc.id, doc.filename)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          ⬇️ Download
                        </button>
                      </div>

                      {/* Translator Assignment */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-500">Atribuir para:</span>
                        <select
                          value={fileAssignments[doc.id]?.id || doc.assigned_translator_id || ''}
                          onChange={(e) => {
                            const selected = translators.find(t => t.id === e.target.value);
                            if (selected) {
                              assignTranslatorToFile(doc.id, selected.id, selected.name);
                            }
                          }}
                          className="flex-1 px-2 py-1.5 text-xs border rounded bg-white"
                        >
                          <option value="">-- Selecione o Tradutor --</option>
                          {translators.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        {(fileAssignments[doc.id] || doc.assigned_translator_name) && (
                          <span className="text-xs text-green-600 font-medium">✓ Atribuído</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm">Nenhum arquivo encontrado neste projeto</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
              >
                Fechar
              </button>
            </div>
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

  // Check for invite_token or reset_token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('invite_token');
  const resetToken = urlParams.get('reset_token');

  // Clear URL parameters after reading
  const clearUrlParams = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  };

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
    } else if (userData.role === 'pm') {
      setActiveTab('pm-dashboard');
    }
  };

  const handleLogout = () => {
    // Clear local state immediately (don't wait for server)
    setAdminKey(null);
    setUser(null);
    localStorage.removeItem('admin_key');
    localStorage.removeItem('admin_user');

    // Try to notify server in background (fire and forget)
    if (user?.token) {
      axios.post(`${API}/admin/auth/logout?token=${user.token}`).catch(() => {});
    }

    window.location.href = '/#/admin';
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
      case 'pm-dashboard':
        return ['admin', 'pm'].includes(userRole)
          ? <PMDashboard adminKey={adminKey} user={user} onNavigateToTranslation={navigateToTranslation} />
          : <div className="p-6 text-center text-gray-500">Access denied</div>;
      case 'projects':
        return userRole !== 'translator'
          ? <ProjectsPage adminKey={adminKey} onTranslate={navigateToTranslation} user={user} />
          : <div className="p-6 text-center text-gray-500">Access denied</div>;
      case 'new-quote':
        return userRole !== 'translator'
          ? <NewQuotePage adminKey={adminKey} user={user} />
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
      case 'followups':
        return ['admin', 'pm'].includes(userRole)
          ? <FollowupsPage adminKey={adminKey} />
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

  // Handle invitation token - show set password page
  if (inviteToken) {
    return <SetPasswordPage inviteToken={inviteToken} onComplete={clearUrlParams} />;
  }

  // Handle reset token - show reset password page
  if (resetToken) {
    return <ResetPasswordPage resetToken={resetToken} onComplete={clearUrlParams} />;
  }

  // If not logged in
  if (!adminKey) {
    // Use TranslatorLogin for translation-tool route
    if (isTranslationTool) {
      return <TranslatorLogin onLogin={handleLogin} />;
    }
    return <AdminLogin onLogin={handleLogin} />;
  }

  // If translation-tool route, render standalone page
  if (isTranslationTool) {
    return <TranslationToolPage adminKey={adminKey} onLogout={handleLogout} user={user} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <TopBar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} user={user} adminKey={adminKey} />
      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default AdminApp;
