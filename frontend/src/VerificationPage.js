import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://legacyportalbackend.onrender.com';

// Global toast function
if (!window.showAppToast) {
  window.showAppToast = (message, type = 'info') => {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
  };
}

// Toast Container Component
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
        const icon = toast.type === 'success' ? '\u2713' : toast.type === 'error' ? '\u2717' : '\u2139';
        return (
          <div key={toast.id} className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 max-w-md`}>
            <span className="text-xl font-bold">{icon}</span>
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-white/80 hover:text-white text-xl font-bold ml-2">&times;</button>
          </div>
        );
      })}
    </div>
  );
};

const VerificationPage = () => {
  const [certificationId, setCertificationId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // PDF verification states
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfVerificationResult, setPdfVerificationResult] = useState(null);
  const [verifyingPdf, setVerifyingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/\/verify\/([A-Za-z0-9-]+)/);
    if (match) {
      const certId = match[1];
      setCertificationId(certId);
      verifyCertification(certId);
    } else {
      setLoading(false);
      setError('No certification ID provided');
    }
  }, []);

  const verifyCertification = async (certId) => {
    setLoading(true);
    setError('');
    setPdfVerificationResult(null);
    setSelectedFile(null);
    try {
      const response = await axios.get(`${API}/certifications/verify/${certId}`);
      setVerificationResult(response.data);
    } catch (err) {
      console.error('Verification error:', err);
      setError('Unable to verify certification. Please try again later.');
      setVerificationResult({ is_valid: false });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setPdfVerificationResult(null);
    } else if (file) {
      window.showAppToast('Please select a PDF file.', 'error');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const verifyPdfDocument = async () => {
    if (!selectedFile || !certificationId) return;
    setVerifyingPdf(true);
    setPdfVerificationResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await axios.post(
        `${API}/certifications/verify-pdf/${certificationId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setPdfVerificationResult(response.data);
    } catch (err) {
      console.error('PDF verification error:', err);
      setPdfVerificationResult({
        is_authentic: false,
        pdf_matches: false,
        message: 'Error verifying PDF document. Please try again.'
      });
    } finally {
      setVerifyingPdf(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York'
    });
  };

  const v = verificationResult;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>

      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-lg p-2 shadow-lg">
              <img
                src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
                alt="Legacy Translations"
                className="h-7"
              />
            </div>
            <div className="hidden sm:block border-l border-white/20 pl-4">
              <p className="text-white/50 text-[10px] uppercase tracking-[0.2em] font-medium">Official</p>
              <p className="text-white font-semibold text-sm">Document Verification Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">ATA Corporate Member</p>
              <p className="text-white font-mono text-sm font-bold">#275993</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d4a853 0%, #b8860b 100%)' }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        {loading ? (
          /* Loading State */
          <div className="text-center py-20">
            <div className="relative w-16 h-16 mx-auto mb-8">
              <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-white font-medium text-lg">Verifying Document Authenticity</p>
            <p className="text-white/40 text-sm mt-2">Checking our secure database...</p>
          </div>

        ) : error && !verificationResult ? (
          /* Error State */
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Connection Error</h1>
            <p className="text-white/60">{error}</p>
          </div>

        ) : v?.is_valid ? (
          /* ========== VALID CERTIFICATE ========== */
          <div>
            {/* Status Badge */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-emerald-400/30" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Verified Authentic</span>
              </div>
            </div>

            {/* Main Certificate Card */}
            <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>

              {/* Gold Top Bar */}
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #b8860b, #d4a853, #b8860b)' }}></div>

              {/* Certificate Header */}
              <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
                <div className="flex justify-center mb-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {/* Gold ring */}
                    <div className="absolute -inset-1 rounded-full border-2 opacity-40" style={{ borderColor: '#d4a853' }}></div>
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Certificate of Authenticity</h1>
                <p className="text-slate-500 text-sm mt-1.5">This certified translation has been verified as genuine</p>
              </div>

              {/* Certification ID Banner */}
              <div className="mx-8 my-6 rounded-xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-semibold">Certification ID</p>
                  <p className="text-xl font-mono font-bold text-slate-800 tracking-wide mt-0.5">{v.certification_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-semibold">Verified</p>
                  <p className="text-sm text-slate-600 mt-0.5">{new Date().toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* Document Details Grid */}
              <div className="px-8 pb-2">
                <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                  {[
                    { label: 'Document Type', value: v.document_type || 'Certified Translation' },
                    { label: 'Certification Date', value: formatDate(v.certified_at) },
                    { label: 'Language Pair', value: `${v.source_language || ''}  \u2192  ${v.target_language || ''}` },
                    { label: 'Page Count', value: `${v.page_count || 1} ${(v.page_count || 1) === 1 ? 'page' : 'pages'}` },
                    { label: 'Certified By', value: v.certifier_name || 'Legacy Translations', sub: v.certifier_credentials },
                    ...(v.order_number ? [{ label: 'Order Reference', value: v.order_number }] : [{ label: 'Company', value: 'Legacy Translations Inc.' }]),
                  ].map((item, i) => (
                    <div key={i} className="py-4 border-b border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-semibold mb-1">{item.label}</p>
                      <p className="text-[15px] font-semibold text-slate-800">{item.value}</p>
                      {item.sub && <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Section */}
              <div className="mx-8 my-6 rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-sm mb-1">Cryptographic Security</h3>
                    <p className="text-white/60 text-xs leading-relaxed">
                      This document is digitally certified and cryptographically secured with a SHA-256 hash.
                      The certification record is stored in our tamper-proof database.
                    </p>
                    {v.document_hash && (
                      <p className="text-white/30 text-[11px] mt-2 font-mono">
                        Hash: {v.document_hash.substring(0, 24)}...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
                    alt="Legacy Translations"
                    className="h-7 opacity-60"
                  />
                </div>
                <button
                  onClick={() => { setShowPdfModal(true); setSelectedFile(null); setPdfVerificationResult(null); }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verify PDF integrity
                </button>
              </div>

              {/* Gold Bottom Bar */}
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #b8860b, #d4a853, #b8860b)' }}></div>
            </div>

            {/* PDF Verification Modal */}
            {showPdfModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowPdfModal(false)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">PDF Integrity Check</h3>
                      <p className="text-slate-500 text-xs mt-0.5">Advanced file verification</p>
                    </div>
                    <button onClick={() => setShowPdfModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">&times;</button>
                  </div>

                  <div className="p-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                      <h4 className="font-semibold text-slate-700 text-sm mb-2">How does this work?</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-3">
                        When your document was certified, we calculated a unique digital fingerprint (SHA-256 hash) of the PDF file.
                        This check compares your file's fingerprint against the original.
                      </p>
                      <div className="space-y-1.5">
                        {[
                          'Only works with the original downloaded PDF file',
                          'Opening and re-saving a PDF changes its fingerprint, even without editing',
                          'Printing and scanning also changes the fingerprint',
                        ].map((text, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-slate-500">{text}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-emerald-700 font-medium">A mismatch does NOT invalidate the certification - the verification shown on the main page confirms authenticity.</p>
                      </div>
                    </div>

                    {/* Upload Zone */}
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                        dragActive ? 'border-slate-400 bg-slate-50 scale-[1.01]'
                          : selectedFile ? 'border-emerald-300 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    >
                      {selectedFile ? (
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                            </svg>
                          </div>
                          <p className="font-medium text-slate-800 text-sm">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <button onClick={() => { setSelectedFile(null); setPdfVerificationResult(null); }} className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium">Remove</button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="font-medium text-slate-600 text-sm">Drop your PDF here</p>
                          <label className="mt-3 cursor-pointer">
                            <span className="px-5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs font-medium">Browse Files</span>
                            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => handleFileSelect(e.target.files[0])} />
                          </label>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={verifyPdfDocument}
                      disabled={!selectedFile || verifyingPdf}
                      className="mt-4 w-full px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                    >
                      {verifyingPdf ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verifying...
                        </span>
                      ) : 'Check File Integrity'}
                    </button>

                    {/* Result */}
                    {pdfVerificationResult && (
                      <div className={`mt-4 p-4 rounded-xl ${
                        pdfVerificationResult.pdf_matches ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            pdfVerificationResult.pdf_matches ? 'bg-emerald-100' : 'bg-amber-100'
                          }`}>
                            {pdfVerificationResult.pdf_matches ? (
                              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" /></svg>
                            )}
                          </div>
                          <div>
                            <h4 className={`font-bold text-sm ${pdfVerificationResult.pdf_matches ? 'text-emerald-800' : 'text-amber-800'}`}>
                              {pdfVerificationResult.pdf_matches ? 'File Integrity Confirmed' : 'File Fingerprint Mismatch'}
                            </h4>
                            <p className={`text-xs mt-1 leading-relaxed ${pdfVerificationResult.pdf_matches ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {pdfVerificationResult.pdf_matches
                                ? 'The uploaded file is identical to the certified original.'
                                : 'The file fingerprint does not match. This is normal if the PDF was opened and re-saved, or saved from Print Preview. The certification itself remains valid.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        ) : (
          /* ========== INVALID / NOT FOUND ========== */
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-red-400/30" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>
                <span className="text-red-400 text-sm font-semibold uppercase tracking-wider">Verification Failed</span>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden shadow-2xl bg-white">
              <div className="h-1.5 bg-red-500"></div>

              <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-800">Certification Not Found</h1>
                <p className="text-slate-500 text-sm mt-1.5">This certification could not be verified in our system</p>
              </div>

              <div className="px-8 py-6">
                <div className="rounded-xl p-4 mb-6" style={{ background: '#f8fafc' }}>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-semibold mb-1">Certification ID Checked</p>
                  <p className="text-lg font-mono font-bold text-slate-800">{certificationId}</p>
                </div>

                <h3 className="font-semibold text-slate-700 text-sm mb-3">Possible Reasons</h3>
                <div className="space-y-2.5 mb-6">
                  {[
                    'The certification ID was entered incorrectly',
                    'The document was not certified by Legacy Translations',
                    'The certification has been revoked',
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0"></div>
                      <p className="text-sm text-slate-600">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <p className="text-amber-800 text-sm font-medium mb-1">Suspect a fraudulent document?</p>
                  <p className="text-amber-700 text-xs leading-relaxed">
                    If you received a document claiming to be certified by Legacy Translations that cannot be verified,
                    please contact us immediately.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="mailto:contact@legacytranslations.com?subject=Certification Verification Issue"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Contact Support
                  </a>
                  <a
                    href="tel:+18573167770"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    (857) 316-7770
                  </a>
                </div>
              </div>

              <div className="h-1.5 bg-red-500"></div>
            </div>
          </div>
        )}

        {/* Manual Verification */}
        <div className="mt-10 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-bold text-sm mb-1">Manual Verification</h2>
          <p className="text-white/40 text-xs mb-4">Enter a certification ID to verify document authenticity</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={certificationId}
              onChange={(e) => setCertificationId(e.target.value.toUpperCase())}
              placeholder="LT-20260119-A1B2C3D4"
              className="flex-1 px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder:text-white/30 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
            />
            <button
              onClick={() => verifyCertification(certificationId)}
              disabled={!certificationId || loading}
              className="px-8 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-slate-900"
              style={{ background: 'linear-gradient(135deg, #d4a853 0%, #b8860b 100%)' }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-lg p-1.5">
                <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" className="h-6" />
              </div>
              <div>
                <p className="text-white/80 font-semibold text-sm">Legacy Translations Inc.</p>
                <p className="text-white/30 text-xs">Professional Translation Services</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-white/30 text-xs">
              <span>867 Boylston St, 5th Floor, Boston, MA 02116</span>
              <span className="hidden sm:inline">|</span>
              <span>(857) 316-7770</span>
            </div>
          </div>
          <div className="border-t border-white/5 pt-5 text-center">
            <p className="text-white/20 text-xs">
              &copy; {new Date().getFullYear()} Legacy Translations Inc. All rights reserved. This is a secure verification service.
            </p>
          </div>
        </div>
      </footer>
      <ToastContainer />
    </div>
  );
};

export default VerificationPage;
