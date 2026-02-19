import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { THEMES, getTheme } from './themes';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ==================== UTC DATE HELPER - NEW YORK TIMEZONE ====================
const NY_TIMEZONE = 'America/New_York';

const parseUTCDate = (dateStr) => {
  if (!dateStr) return null;
  if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
    return new Date(dateStr + 'Z');
  }
  return new Date(dateStr);
};

const formatDateTimeLocal = (dateStr) => {
  if (!dateStr) return '-';
  const date = parseUTCDate(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', { timeZone: NY_TIMEZONE });
};

// ==================== TRADUX ADMIN APP ====================
const TraduxAdminApp = () => {
  const theme = getTheme('tradux');

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [loginError, setLoginError] = useState('');

  // Orders state
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  // Translation settings
  const [sourceLanguage, setSourceLanguage] = useState('Portuguese (Brazil)');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [documentType, setDocumentType] = useState('general');
  const [pageFormat, setPageFormat] = useState('letter');
  const [convertCurrency, setConvertCurrency] = useState(false);

  // TRADUX status
  const [traduxStatus, setTraduxStatus] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');

  // Check for saved admin key
  useEffect(() => {
    const savedKey = localStorage.getItem('tradux_admin_key');
    if (savedKey) {
      setAdminKey(savedKey);
      setIsAuthenticated(true);
    }
  }, []);

  // Load orders when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    try {
      // Verify admin key with backend
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}&brand=tradux`);
      if (response.data) {
        localStorage.setItem('tradux_admin_key', adminKey);
        setIsAuthenticated(true);
        setLoginError('');
      }
    } catch (error) {
      setLoginError('Invalid admin key');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tradux_admin_key');
    setIsAuthenticated(false);
    setAdminKey('');
    setOrders([]);
    setSelectedOrder(null);
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}&brand=tradux`);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
    setLoading(false);
  };

  const startAutoTranslation = async () => {
    if (!selectedOrder) {
      setProcessingStatus('Please select an order first');
      return;
    }

    setProcessingStatus('Starting TRADUX auto-translation...');
    setTraduxStatus({ progress_percent: 0, current_step: 'initializing' });

    try {
      const response = await axios.post(`${API}/admin/tradux/auto-translate?admin_key=${adminKey}`, {
        order_id: selectedOrder.id,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        document_type: documentType,
        page_format: pageFormat,
        convert_currency: convertCurrency,
        use_glossary: true,
        auto_correct_errors: true
      });

      setProcessingStatus('TRADUX translation started! Monitoring progress...');

      // Start polling for status updates
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(`${API}/admin/tradux/status/${selectedOrder.id}?admin_key=${adminKey}`);
          setTraduxStatus(statusResponse.data);

          if (statusResponse.data.current_step === 'ready_for_client' ||
              statusResponse.data.current_step === 'completed' ||
              statusResponse.data.has_error) {
            clearInterval(pollInterval);
            if (statusResponse.data.current_step === 'ready_for_client') {
              setProcessingStatus('Translation complete! Ready for client approval.');
            }
          }
        } catch (err) {
          console.error('Error polling status:', err);
          clearInterval(pollInterval);
          setProcessingStatus('Error checking translation status. Please refresh and try again.');
        }
      }, 3000);

    } catch (error) {
      console.error('TRADUX error:', error);
      setProcessingStatus('Error: ' + (error.response?.data?.detail || error.message));
      setTraduxStatus(null);
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradients.header }}>
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
          <div className="text-center mb-6">
            <div dangerouslySetInnerHTML={{ __html: theme.logo.htmlLight }} />
            <p className="text-gray-600 mt-2">Admin Portal</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Key</label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter admin key"
              />
            </div>

            {loginError && (
              <div className="text-red-500 text-sm text-center">{loginError}</div>
            )}

            <button
              onClick={handleLogin}
              className="w-full py-3 text-white font-bold rounded-lg transition-all"
              style={{ background: theme.gradients.button }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Admin Interface
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="text-white p-4 shadow-lg" style={{ background: theme.gradients.header }}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div dangerouslySetInnerHTML={{ __html: theme.logo.html }} />
            <span className="text-sm opacity-80">Admin Portal</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Orders List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">TRADUX Orders</h2>
              <button
                onClick={loadOrders}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No TRADUX orders found
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedOrder?.id === order.id
                        ? 'bg-orange-100 border-2 border-orange-500'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="font-medium text-gray-800">{order.client_name}</div>
                    <div className="text-sm text-gray-600">{order.service_type}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDateTimeLocal(order.created_at)}
                    </div>
                    <div className={`mt-1 inline-block px-2 py-0.5 rounded text-xs ${
                      order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'In progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Translation Panel */}
          <div className="lg:col-span-2 space-y-6">

            {/* TRADUX Header */}
            <div className="rounded-lg p-4 text-white" style={{ background: theme.gradients.button }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    TRADUX Auto-Translation
                  </h3>
                  <p className="text-sm opacity-90 mt-1">100% AI-powered translation - No human intervention required</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">~5 min</div>
                  <div className="text-xs opacity-80">Average processing time</div>
                </div>
              </div>
            </div>

            {/* Process Steps */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-bold text-orange-800 mb-3">Automated Workflow:</h4>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { icon: '1', label: 'OCR', desc: 'Extract text' },
                  { icon: '2', label: 'Translate', desc: 'AI + Glossary' },
                  { icon: '3', label: 'Layout', desc: 'Optimize' },
                  { icon: '4', label: 'Proofread', desc: 'Auto-correct' },
                  { icon: '5', label: 'Client', desc: 'Approval' }
                ].map((step, idx) => (
                  <div key={idx} className="text-center p-3 bg-white rounded-lg border">
                    <div className="w-8 h-8 mx-auto mb-1 rounded-full flex items-center justify-center text-white font-bold" style={{ background: theme.colors.secondary }}>
                      {step.icon}
                    </div>
                    <div className="text-xs font-medium">{step.label}</div>
                    <div className="text-[10px] text-gray-500">{step.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3">Translation Settings:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Source Language</label>
                  <select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  >
                    <option value="Portuguese (Brazil)">Portuguese (Brazil)</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Italian">Italian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Target Language</label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  >
                    <option value="English">English</option>
                    <option value="Portuguese (Brazil)">Portuguese (Brazil)</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Document Type</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  >
                    <option value="general">General Document</option>
                    <option value="birth_certificate">Birth Certificate</option>
                    <option value="marriage_certificate">Marriage Certificate</option>
                    <option value="diploma">Diploma / Academic</option>
                    <option value="bank_statement">Bank Statement</option>
                    <option value="power_of_attorney">Power of Attorney</option>
                    <option value="medical">Medical Record</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Page Format</label>
                  <select
                    value={pageFormat}
                    onChange={(e) => setPageFormat(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  >
                    <option value="letter">US Letter (8.5" x 11")</option>
                    <option value="a4">A4 (210mm x 297mm)</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={convertCurrency}
                    onChange={(e) => setConvertCurrency(e.target.checked)}
                    className="rounded"
                  />
                  <span>Enable Currency Conversion (BRL to USD)</span>
                </label>
              </div>
            </div>

            {/* Status Display */}
            {traduxStatus && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-blue-800">Translation Progress</h4>
                  <span className="text-lg font-bold text-blue-600">{traduxStatus.progress_percent || 0}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3 mb-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${traduxStatus.progress_percent || 0}%`,
                      background: theme.gradients.button
                    }}
                  ></div>
                </div>
                <div className="text-sm text-blue-700">
                  <span className="font-medium">Current Step:</span> {traduxStatus.current_step || 'Initializing...'}
                </div>
                {traduxStatus.has_error && (
                  <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                    Error: {traduxStatus.error_message}
                  </div>
                )}
                {traduxStatus.current_step === 'ready_for_client' && (
                  <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded">
                    <div className="text-green-800 font-medium mb-2">Translation Complete!</div>
                    <div className="text-sm text-green-700">
                      Client approval link: <a href={`/client/translation-approval/${traduxStatus.client_approval_token}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open Approval Page</a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Start Button */}
            <div className="flex justify-center">
              <button
                onClick={startAutoTranslation}
                disabled={!selectedOrder || (traduxStatus && traduxStatus.progress_percent > 0 && traduxStatus.progress_percent < 100)}
                className={`px-8 py-4 text-lg font-bold rounded-lg shadow-lg transition-all flex items-center gap-3 ${
                  !selectedOrder || (traduxStatus && traduxStatus.progress_percent > 0 && traduxStatus.progress_percent < 100)
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'text-white hover:scale-105'
                }`}
                style={selectedOrder && !(traduxStatus && traduxStatus.progress_percent > 0 && traduxStatus.progress_percent < 100) ? { background: theme.gradients.button } : {}}
              >
                <span className="text-2xl">⚡</span>
                <span>Start TRADUX Auto-Translation</span>
              </button>
            </div>

            {/* Processing Status */}
            {processingStatus && (
              <div className={`p-3 rounded text-sm font-medium text-center ${
                processingStatus.includes('Error') ? 'bg-red-100 text-red-700' :
                processingStatus.includes('complete') ? 'bg-green-100 text-green-700' :
                processingStatus.includes('select') ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {processingStatus}
              </div>
            )}

            {/* Selected Order Info */}
            {selectedOrder && (
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Selected Order Details:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Client:</span>
                    <span className="ml-2 font-medium">{selectedOrder.client_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 font-medium">{selectedOrder.client_email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Service:</span>
                    <span className="ml-2 font-medium">{selectedOrder.service_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2 font-medium">{selectedOrder.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Languages:</span>
                    <span className="ml-2 font-medium">{selectedOrder.source_language} to {selectedOrder.target_language}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pages:</span>
                    <span className="ml-2 font-medium">{selectedOrder.page_count || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-gray-500 text-sm mt-8">
        <div dangerouslySetInnerHTML={{ __html: theme.logo.htmlLight }} className="inline-block mb-2" />
        <p>{theme.company.website}</p>
      </footer>
    </div>
  );
};

export default TraduxAdminApp;
