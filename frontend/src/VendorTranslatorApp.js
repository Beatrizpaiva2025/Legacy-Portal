import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ==================== TOAST NOTIFICATION ====================
const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { message, type } = e.detail;
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    };
    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => {
        const bgColor = toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        const icon = toast.type === 'success' ? '\u2713' : toast.type === 'error' ? '\u2715' : '\u2139';
        return (
          <div key={toast.id} className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 max-w-md`}
            style={{ animation: 'slideIn 0.3s ease-out' }}>
            <span className="text-xl font-bold">{icon}</span>
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-white/80 hover:text-white text-xl font-bold ml-2">&times;</button>
          </div>
        );
      })}
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
};

const showToast = (message, type = 'info') => {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
};

// ==================== LOGIN PAGE ====================
const VendorLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/auth/login`, { email, password });
      if (response.data && response.data.token) {
        if (response.data.role !== 'translator') {
          setError('This portal is for vendor translators only.');
          setLoading(false);
          return;
        }
        if (response.data.translator_type !== 'vendor') {
          setError('This portal is for vendor translators only. Please use the main translator portal at /#/admin.');
          setLoading(false);
          return;
        }
        onLogin({
          adminKey: response.data.token,
          token: response.data.token,
          role: response.data.role,
          name: response.data.name,
          email: response.data.email,
          id: response.data.id,
          translator_type: response.data.translator_type
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header with Logo */}
        <div className="bg-white py-8 px-4 text-center border-b border-gray-200">
          <div className="mb-1">
            <img
              src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
              alt="Legacy Translations"
              className="h-14 mx-auto object-contain"
            />
          </div>
          <p className="text-blue-600 text-sm mt-1 font-medium">Vendor Translator Portal</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <h2 className="text-lg font-medium text-gray-800 text-center mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN PORTAL ====================
const VendorPortal = ({ user, adminKey, onLogout }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadedFileNames, setUploadedFileNames] = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [sentToPM, setSentToPM] = useState(false);
  const [downloading, setDownloading] = useState({});
  // Logo
  const [companyLogo, setCompanyLogo] = useState(null);
  // Messaging (per-project inline)
  const [messages, setMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [adminPmList, setAdminPmList] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const chatEndRef = useRef(null);

  // Fetch assigned projects + logo + recipients
  useEffect(() => {
    fetchProjects();
    fetchCompanyLogo();
    fetchAdminPmList();
    fetchMessages();
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/orders/my-projects?admin_key=${adminKey}&token=${adminKey}`);
      const orders = (response.data.orders || []).filter(order =>
        !['delivered', 'final', 'cancelled'].includes(order.translation_status)
      );
      setProjects(orders);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      const detail = err.response?.data?.detail || err.response?.statusText || err.message || 'Unknown error';
      showToast(`Failed to load projects: ${detail}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load company logo from shared assets
  const fetchCompanyLogo = async () => {
    try {
      const response = await axios.get(`${API}/admin/shared-assets?admin_key=${adminKey}`);
      if (response.data?.logo_left) {
        setCompanyLogo(response.data.logo_left);
      }
    } catch (err) {
      console.log('Could not load company logo');
    }
  };

  // Load admin/PM list for messaging
  const fetchAdminPmList = async () => {
    try {
      const pmsRes = await axios.get(`${API}/admin/users/by-role/pm?admin_key=${adminKey}`);
      const pms = (Array.isArray(pmsRes.data) ? pmsRes.data : pmsRes.data.users || []).map(u => ({ ...u, role: 'pm' }));
      setAdminPmList(pms);
      // Auto-select first PM
      if (pms.length > 0) setSelectedRecipient(pms[0].id);
    } catch (err) {
      console.log('Could not load PM list');
    }
  };

  // Fetch messages for this translator
  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/translator/messages?admin_key=${adminKey}&translator_id=${user.id}`);
      setMessages(response.data.messages || []);
    } catch (err) {
      // Silent fail for polling
    }
  };

  // Send message to PM (project-specific)
  const handleSendProjectMessage = async () => {
    if (!chatMessage.trim() || !selectedRecipient || !selectedProject) return;
    setSendingMessage(true);
    try {
      const recipient = adminPmList.find(u => u.id === selectedRecipient);
      await axios.post(`${API}/translator/send-message?admin_key=${adminKey}`, {
        translator_id: user.id,
        translator_name: user.name,
        recipient_id: selectedRecipient,
        recipient_name: recipient?.name || 'Admin/PM',
        recipient_role: recipient?.role || 'admin',
        content: chatMessage.trim(),
        order_number: selectedProject.order_number
      });
      setChatMessage('');
      showToast('Message sent!', 'success');
      fetchMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
      showToast('Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  // Mark message as read
  const markAsRead = async (messageId) => {
    try {
      await axios.put(`${API}/translator/messages/${messageId}/read?admin_key=${adminKey}`);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
    } catch (err) {
      console.error('Failed to mark message as read');
    }
  };

  // Fetch files for selected project
  const selectProject = async (project) => {
    // Check if assignment is pending
    if (project.translator_assignment_status === 'pending' &&
      (project.assigned_translator_id === user.id || project.assigned_translator_name === user.name)) {
      showToast('Please accept this assignment first. Check your email for the assignment link.', 'error');
      return;
    }

    setSelectedProject(project);
    setUploadSuccess(false);
    setUploadFiles([]);
    setUploadedFileNames([]);
    setSentToPM(false);
    setLoadingFiles(true);

    try {
      const docsResponse = await axios.get(`${API}/admin/orders/${project.id}/documents?admin_key=${adminKey}`);
      const docs = docsResponse.data.documents || [];

      // For file-level assignments, only show files assigned to this translator
      const isFileLevel = project.file_translator_ids && project.file_translator_ids.includes(user.id)
        && project.assigned_translator_id !== user.id;

      const filteredDocs = isFileLevel
        ? docs.filter(doc => !doc.assigned_translator_id || doc.assigned_translator_id === user.id)
        : docs;

      // Separate source files from translated files
      const sourceFiles = filteredDocs.filter(doc => doc.source !== 'translated_document');
      setProjectFiles(sourceFiles);
    } catch (err) {
      console.error('Failed to fetch project files:', err);
      showToast('Failed to load project files', 'error');
    } finally {
      setLoadingFiles(false);
    }
  };

  // Download a file
  const downloadFile = async (doc) => {
    setDownloading(prev => ({ ...prev, [doc.id]: true }));
    try {
      const response = await axios.get(`${API}/admin/order-documents/${doc.id}/download?admin_key=${adminKey}`);
      if (response.data && response.data.file_data) {
        const byteCharacters = atob(response.data.file_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: response.data.content_type || 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename || doc.filename || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast('File downloaded successfully', 'success');
      }
    } catch (err) {
      console.error('Failed to download file:', err);
      showToast('Failed to download file', 'error');
    } finally {
      setDownloading(prev => ({ ...prev, [doc.id]: false }));
    }
  };

  // Read file as base64
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Upload all selected translations (without notifying PM yet)
  const handleUpload = async () => {
    if (uploadFiles.length === 0 || !selectedProject) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of uploadFiles) {
        const base64Data = await readFileAsBase64(file);
        const contentType = file.type || 'application/pdf';

        await axios.post(`${API}/admin/orders/${selectedProject.id}/documents?admin_key=${adminKey}`, {
          filename: file.name,
          file_data: base64Data,
          content_type: contentType,
          source: 'translated_document'
        });
        uploaded.push(file.name);
      }

      setUploadedFileNames(uploaded);
      setUploadSuccess(true);
      setUploadFiles([]);
      showToast(`${uploaded.length} file(s) uploaded successfully!`, 'success');
    } catch (err) {
      console.error('Upload failed:', err);
      showToast('Failed to upload files. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Send notification to PM
  const handleSendToPM = async () => {
    if (!selectedProject) return;

    try {
      await axios.post(`${API}/vendor-translator/notify-upload?admin_key=${adminKey}`, {
        order_id: selectedProject.id,
        order_number: selectedProject.order_number,
        translator_name: user.name,
        translator_id: user.id,
        filename: uploadedFileNames.join(', ')
      });
      setSentToPM(true);
      showToast('PM has been notified! They will review your translation.', 'success');
      fetchProjects();
    } catch (err) {
      console.error('Failed to notify PM:', err);
      showToast('Failed to notify PM. Please try again.', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar with Company Logo */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img src={companyLogo} alt="Legacy Translations" className="h-10 object-contain" />
            ) : (
              <img
                src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
                alt="Legacy Translations"
                className="h-10 object-contain"
              />
            )}
            <p className="text-slate-400 text-[10px] ml-1">Vendor Portal</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-medium text-slate-700">{user.name}</p>
              <p className="text-[10px] text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Assignments</h2>
          <p className="text-sm text-gray-500 mt-1">Download source files, translate, and upload your completed work</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-500">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No assignments yet</h3>
            <p className="text-sm text-gray-500">You will see your assigned projects here once a PM assigns work to you.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="px-4 py-3 border-b bg-slate-50 rounded-t-xl">
                  <h3 className="text-sm font-semibold text-gray-700">Projects ({projects.length})</h3>
                </div>
                <div className="divide-y max-h-[70vh] overflow-y-auto">
                  {projects.map(project => {
                    const isPending = project.translator_assignment_status === 'pending'
                      && (project.assigned_translator_id === user.id || project.assigned_translator_name === user.name);

                    return (
                      <div
                        key={project.id}
                        onClick={() => selectProject(project)}
                        className={`p-4 cursor-pointer transition-colors ${
                          isPending
                            ? 'bg-yellow-50 opacity-80'
                            : selectedProject?.id === project.id
                              ? 'bg-blue-50 border-l-4 border-l-blue-500'
                              : 'hover:bg-gray-50'
                        }`}
                      >
                        {isPending && (
                          <div className="bg-yellow-100 border border-yellow-300 rounded px-2 py-1 mb-2 text-center">
                            <span className="text-[10px] text-yellow-800 font-medium">
                              Accept via email to start
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-blue-700 text-sm">{project.order_number}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            project.translation_status === 'in_translation' ? 'bg-blue-100 text-blue-700' :
                            project.translation_status === 'received' ? 'bg-yellow-100 text-yellow-700' :
                            project.translation_status === 'review' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {project.translation_status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">{project.translate_from} &rarr; {project.translate_to}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {project.document_type || 'Document'} &bull; {project.page_count || 1} page(s)
                        </div>
                        {(project.translator_deadline || project.deadline) && (
                          <div className="text-[10px] text-blue-600 mt-1 font-medium">
                            Due: {formatDate(project.translator_deadline || project.deadline)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Messages - below Projects, same width */}
              {selectedProject && (
                <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 mt-4">
                  <div className="px-4 py-3 border-b border-blue-200 bg-blue-100/50 rounded-t-xl flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h4 className="text-xs font-semibold text-blue-800">Messages</h4>
                    {messages.filter(m => m.order_number === selectedProject.order_number && m.type === 'admin_to_translator' && !m.read).length > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {messages.filter(m => m.order_number === selectedProject.order_number && m.type === 'admin_to_translator' && !m.read).length}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    {/* Messages list */}
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                      {messages.filter(m => m.order_number === selectedProject.order_number).length === 0 ? (
                        <p className="text-[11px] text-blue-400 text-center py-2">No messages yet</p>
                      ) : (
                        messages.filter(m => m.order_number === selectedProject.order_number).reverse().map(msg => {
                          const isFromMe = msg.type === 'translator_to_admin';
                          const isUnread = msg.type === 'admin_to_translator' && !msg.read;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                              onClick={() => isUnread && markAsRead(msg.id)}
                            >
                              <div className={`max-w-[90%] rounded-lg px-2.5 py-1.5 ${
                                isFromMe
                                  ? 'bg-blue-600 text-white'
                                  : isUnread
                                    ? 'bg-white border-2 border-blue-300'
                                    : 'bg-white/70'
                              }`}>
                                <p className={`text-[9px] font-medium mb-0.5 ${isFromMe ? 'text-blue-200' : 'text-gray-500'}`}>
                                  {isFromMe ? 'You' : (msg.from_admin_name || 'PM')}
                                </p>
                                <p className={`text-[11px] ${isFromMe ? 'text-white' : 'text-gray-800'}`}>{msg.content}</p>
                                <p className={`text-[8px] mt-0.5 ${isFromMe ? 'text-blue-300' : 'text-gray-400'}`}>
                                  {msg.created_at ? new Date(msg.created_at).toLocaleString('en-US', {
                                    timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                  }) : ''}
                                  {isUnread && <span className="ml-1 text-blue-600 font-medium">(new)</span>}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    {/* Send message */}
                    {adminPmList.length > 1 && (
                      <select
                        value={selectedRecipient}
                        onChange={(e) => setSelectedRecipient(e.target.value)}
                        className="w-full mb-2 px-2 py-1.5 text-[11px] border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Send to...</option>
                        {adminPmList.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role === 'pm' ? 'PM' : 'Admin'})
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendProjectMessage(); } }}
                        placeholder="Message..."
                        className="flex-1 px-2.5 py-1.5 text-xs border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        onClick={handleSendProjectMessage}
                        disabled={sendingMessage || !chatMessage.trim() || !selectedRecipient}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors disabled:opacity-50"
                      >
                        {sendingMessage ? (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Project Detail */}
            <div className="lg:col-span-2">
              {selectedProject ? (
                <div className="space-y-4">
                  {/* Project Info Card */}
                  <div className="bg-white rounded-xl shadow-sm border p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800">
                        {selectedProject.order_number}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedProject.translation_status === 'in_translation' ? 'bg-blue-100 text-blue-700' :
                        selectedProject.translation_status === 'received' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedProject.translation_status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs block">Language Pair</span>
                        <span className="font-medium">{selectedProject.translate_from} &rarr; {selectedProject.translate_to}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block">Document Type</span>
                        <span className="font-medium">{selectedProject.document_type || 'Document'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block">Pages</span>
                        <span className="font-medium">{selectedProject.page_count || 1}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block">Deadline</span>
                        <span className="font-medium text-blue-700">
                          {formatDate(selectedProject.translator_deadline || selectedProject.deadline)}
                        </span>
                      </div>
                    </div>
                    {selectedProject.internal_notes && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-xs font-medium text-blue-700 block mb-1">Instructions from PM:</span>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">{selectedProject.internal_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Source Files - Download */}
                  <div className="bg-white rounded-xl shadow-sm border">
                    <div className="px-5 py-3 border-b bg-slate-50 rounded-t-xl flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <h4 className="text-sm font-semibold text-gray-700">Source Files (Download)</h4>
                    </div>
                    <div className="p-5">
                      {loadingFiles ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : projectFiles.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No source files available for download.</p>
                      ) : (
                        <div className="space-y-2">
                          {projectFiles.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{doc.filename}</p>
                                  <p className="text-xs text-gray-500">{doc.content_type || 'PDF'}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => downloadFile(doc)}
                                disabled={downloading[doc.id]}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                {downloading[doc.id] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Downloading...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                  </>
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Translation */}
                  <div className="bg-white rounded-xl shadow-sm border">
                    <div className="px-5 py-3 border-b bg-slate-50 rounded-t-xl flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <h4 className="text-sm font-semibold text-gray-700">Upload Translation</h4>
                    </div>
                    <div className="p-5">
                      {sentToPM ? (
                        <div className="text-center py-6">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h4 className="text-lg font-medium text-green-700 mb-1">Sent to PM!</h4>
                          <p className="text-sm text-gray-500 mb-2">Your translation has been sent for review.</p>
                          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left max-w-sm mx-auto">
                            {uploadedFileNames.map((name, idx) => (
                              <p key={idx} className="text-xs text-gray-600 flex items-center gap-2 py-0.5">
                                <span className="text-green-500">&#10003;</span> {name}
                              </p>
                            ))}
                          </div>
                          <button
                            onClick={() => { setUploadSuccess(false); setUploadFiles([]); setUploadedFileNames([]); setSentToPM(false); }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                          >
                            Upload more files
                          </button>
                        </div>
                      ) : uploadSuccess ? (
                        <div className="text-center py-6">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h4 className="text-lg font-medium text-blue-700 mb-1">Files Uploaded!</h4>
                          <p className="text-sm text-gray-500 mb-3">
                            {uploadedFileNames.length} file(s) uploaded. Now send to the PM for review.
                          </p>
                          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left max-w-sm mx-auto">
                            {uploadedFileNames.map((name, idx) => (
                              <p key={idx} className="text-xs text-gray-600 flex items-center gap-2 py-0.5">
                                <span className="text-blue-500">&#10003;</span> {name}
                              </p>
                            ))}
                          </div>
                          <button
                            onClick={handleSendToPM}
                            className="w-full max-w-xs mx-auto py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Send to PM
                          </button>
                          <button
                            onClick={() => { setUploadSuccess(false); setUploadFiles([]); setUploadedFileNames([]); }}
                            className="mt-2 px-4 py-2 text-gray-500 hover:text-gray-700 text-xs transition-colors"
                          >
                            Upload more files first
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600 mb-3">
                            Upload your completed translation files. You can select multiple files.
                          </p>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800">
                            <p className="font-medium mb-1">Formatting Guidelines:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                              <li><strong>Preferred format: DOCX</strong> - best for review and package generation</li>
                              <li>Use standard page size Letter (8.5&quot; x 11&quot;) with normal margins</li>
                            </ul>
                          </div>

                          {/* Drop zone */}
                          <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                              uploadFiles.length > 0
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                            }`}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (e.dataTransfer.files?.length > 0) {
                                setUploadFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                              }
                            }}
                          >
                            {uploadFiles.length > 0 ? (
                              <div>
                                <div className="space-y-2 mb-4">
                                  {uploadFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                          </svg>
                                        </div>
                                        <div className="text-left">
                                          <p className="text-xs font-medium text-gray-800">{file.name}</p>
                                          <p className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-red-400 hover:text-red-600 text-lg font-bold px-1"
                                      >
                                        &times;
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <label className="inline-block px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded-lg cursor-pointer transition-colors">
                                  + Add more files
                                  <input
                                    type="file"
                                    className="hidden"
                                    multiple
                                    accept=".pdf,.docx,.doc,.txt,.html"
                                    onChange={(e) => {
                                      if (e.target.files?.length > 0) {
                                        setUploadFiles(prev => [...prev, ...Array.from(e.target.files)]);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            ) : (
                              <div>
                                <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-sm text-gray-600 mb-1">Drag and drop your files here, or</p>
                                <label className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg cursor-pointer transition-colors">
                                  Browse Files
                                  <input
                                    type="file"
                                    className="hidden"
                                    multiple
                                    accept=".pdf,.docx,.doc,.txt,.html"
                                    onChange={(e) => {
                                      if (e.target.files?.length > 0) {
                                        setUploadFiles(prev => [...prev, ...Array.from(e.target.files)]);
                                      }
                                    }}
                                  />
                                </label>
                                <p className="text-xs text-gray-400 mt-2">You can select multiple files at once</p>
                              </div>
                            )}
                          </div>

                          {uploadFiles.length > 0 && (
                            <button
                              onClick={handleUpload}
                              disabled={uploading}
                              className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {uploading ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                  Uploading {uploadFiles.length} file(s)...
                                </>
                              ) : (
                                <>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                  Upload {uploadFiles.length} File(s)
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <div className="text-5xl mb-4">📂</div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Select a project</h3>
                  <p className="text-sm text-gray-500">Choose a project from the left to view files and upload your translation.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
};

// ==================== MAIN APP ====================
function VendorTranslatorApp() {
  const [user, setUser] = useState(null);
  const [adminKey, setAdminKey] = useState(null);

  // Check for invite_token or reset_token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('invite_token');
  const resetToken = urlParams.get('reset_token');

  useEffect(() => {
    const savedKey = localStorage.getItem('vendor_translator_key');
    const savedUser = localStorage.getItem('vendor_translator_user');
    if (savedKey && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Verify it's a vendor translator
        if (parsedUser.translator_type === 'vendor') {
          setAdminKey(savedKey);
          setUser(parsedUser);
        } else {
          // Clear invalid session
          localStorage.removeItem('vendor_translator_key');
          localStorage.removeItem('vendor_translator_user');
        }
      } catch (e) {
        console.error('Error parsing saved user:', e);
      }
    }
  }, []);

  const handleLogin = (userData) => {
    const key = userData.adminKey || userData.token;
    setAdminKey(key);
    setUser(userData);
    localStorage.setItem('vendor_translator_key', key);
    localStorage.setItem('vendor_translator_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setAdminKey(null);
    setUser(null);
    localStorage.removeItem('vendor_translator_key');
    localStorage.removeItem('vendor_translator_user');
    window.location.href = '/#/vendor';
  };

  // Handle invitation - redirect to admin for password setup
  if (inviteToken || resetToken) {
    window.location.href = `/#/admin?${inviteToken ? 'invite_token=' + inviteToken : 'reset_token=' + resetToken}`;
    return null;
  }

  if (!adminKey || !user) {
    return <VendorLogin onLogin={handleLogin} />;
  }

  return <VendorPortal user={user} adminKey={adminKey} onLogout={handleLogout} />;
}

export default VendorTranslatorApp;
