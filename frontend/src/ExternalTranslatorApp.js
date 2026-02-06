import React, { useState, useEffect } from 'react';
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
const ExternalLogin = ({ onLogin }) => {
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
          setError('This portal is for external translators only.');
          setLoading(false);
          return;
        }
        if (response.data.translator_type !== 'external') {
          setError('This portal is for external translators only. Please use the main translator portal at /#/admin.');
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-b from-emerald-500 to-teal-600 py-8 px-4 text-center">
          <div className="mb-3">
            <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-white">Legacy Translations</h1>
          <p className="text-emerald-100 text-sm mt-1">External Translator Portal</p>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="Your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
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
const ExternalPortal = ({ user, adminKey, onLogout }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [downloading, setDownloading] = useState({});

  // Fetch assigned projects
  useEffect(() => {
    fetchProjects();
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
      showToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
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
    setUploadFile(null);
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

  // Upload translation
  const handleUpload = async () => {
    if (!uploadFile || !selectedProject) return;

    setUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result.split(',')[1];
          const contentType = uploadFile.type || 'application/pdf';

          // Upload as translated document
          await axios.post(`${API}/admin/orders/${selectedProject.id}/documents?admin_key=${adminKey}`, {
            filename: uploadFile.name,
            file_data: base64Data,
            content_type: contentType,
            source: 'translated_document'
          });

          // Notify PM about the upload
          try {
            await axios.post(`${API}/external-translator/notify-upload?admin_key=${adminKey}`, {
              order_id: selectedProject.id,
              order_number: selectedProject.order_number,
              translator_name: user.name,
              translator_id: user.id,
              filename: uploadFile.name
            });
          } catch (notifyErr) {
            // Notification failure is non-critical
            console.warn('PM notification failed (non-critical):', notifyErr);
          }

          setUploadSuccess(true);
          setUploadFile(null);
          showToast('Translation uploaded successfully! The PM has been notified.', 'success');

          // Refresh projects
          fetchProjects();
        } catch (uploadErr) {
          console.error('Upload failed:', uploadErr);
          showToast('Failed to upload translation. Please try again.', 'error');
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        showToast('Failed to read file', 'error');
        setUploading(false);
      };
      reader.readAsDataURL(uploadFile);
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Upload failed', 'error');
      setUploading(false);
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
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-3 shadow-md">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <svg className="w-7 h-7 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <div>
              <h1 className="text-lg font-semibold">Legacy Translations</h1>
              <p className="text-emerald-200 text-xs">External Translator Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-emerald-200">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded text-sm transition-colors"
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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3"></div>
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
                <div className="px-4 py-3 border-b bg-gray-50 rounded-t-xl">
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
                              ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
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
                          <span className="font-bold text-emerald-700 text-sm">{project.order_number}</span>
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
                          <div className="text-[10px] text-emerald-600 mt-1 font-medium">
                            Due: {formatDate(project.translator_deadline || project.deadline)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
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
                        <span className="font-medium text-emerald-700">
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
                    <div className="px-5 py-3 border-b bg-gray-50 rounded-t-xl flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <h4 className="text-sm font-semibold text-gray-700">Source Files (Download)</h4>
                    </div>
                    <div className="p-5">
                      {loadingFiles ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                        </div>
                      ) : projectFiles.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No source files available for download.</p>
                      ) : (
                        <div className="space-y-2">
                          {projectFiles.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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
                    <div className="px-5 py-3 border-b bg-gray-50 rounded-t-xl flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <h4 className="text-sm font-semibold text-gray-700">Upload Translation</h4>
                    </div>
                    <div className="p-5">
                      {uploadSuccess ? (
                        <div className="text-center py-6">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h4 className="text-lg font-medium text-green-700 mb-1">Translation Uploaded!</h4>
                          <p className="text-sm text-gray-500 mb-4">The Project Manager has been notified and will review your work.</p>
                          <button
                            onClick={() => { setUploadSuccess(false); setUploadFile(null); }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                          >
                            Upload another file
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600 mb-4">
                            Upload your completed translation file. Accepted formats: PDF, DOCX, DOC, TXT.
                          </p>

                          {/* Drop zone */}
                          <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                              uploadFile
                                ? 'border-emerald-400 bg-emerald-50'
                                : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                            }`}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (e.dataTransfer.files?.length > 0) {
                                setUploadFile(e.dataTransfer.files[0]);
                              }
                            }}
                          >
                            {uploadFile ? (
                              <div>
                                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <p className="text-sm font-medium text-emerald-700">{uploadFile.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                <button
                                  onClick={() => setUploadFile(null)}
                                  className="text-xs text-red-500 hover:text-red-700 mt-2"
                                >
                                  Remove file
                                </button>
                              </div>
                            ) : (
                              <div>
                                <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-sm text-gray-600 mb-1">Drag and drop your file here, or</p>
                                <label className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg cursor-pointer transition-colors">
                                  Browse Files
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.docx,.doc,.txt,.html"
                                    onChange={(e) => {
                                      if (e.target.files?.length > 0) {
                                        setUploadFile(e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>

                          {uploadFile && (
                            <button
                              onClick={handleUpload}
                              disabled={uploading}
                              className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {uploading ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                  Upload Translation
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
function ExternalTranslatorApp() {
  const [user, setUser] = useState(null);
  const [adminKey, setAdminKey] = useState(null);

  // Check for invite_token or reset_token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('invite_token');
  const resetToken = urlParams.get('reset_token');

  useEffect(() => {
    const savedKey = localStorage.getItem('external_translator_key');
    const savedUser = localStorage.getItem('external_translator_user');
    if (savedKey && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Verify it's an external translator
        if (parsedUser.translator_type === 'external') {
          setAdminKey(savedKey);
          setUser(parsedUser);
        } else {
          // Clear invalid session
          localStorage.removeItem('external_translator_key');
          localStorage.removeItem('external_translator_user');
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
    localStorage.setItem('external_translator_key', key);
    localStorage.setItem('external_translator_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setAdminKey(null);
    setUser(null);
    localStorage.removeItem('external_translator_key');
    localStorage.removeItem('external_translator_user');
    window.location.href = '/#/external';
  };

  // Handle invitation - redirect to admin for password setup
  if (inviteToken || resetToken) {
    window.location.href = `/#/admin?${inviteToken ? 'invite_token=' + inviteToken : 'reset_token=' + resetToken}`;
    return null;
  }

  if (!adminKey || !user) {
    return <ExternalLogin onLogin={handleLogin} />;
  }

  return <ExternalPortal user={user} adminKey={adminKey} onLogout={handleLogout} />;
}

export default ExternalTranslatorApp;
