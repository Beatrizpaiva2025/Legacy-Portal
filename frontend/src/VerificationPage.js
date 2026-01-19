import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://legacyportalbackend.onrender.com';

const VerificationPage = () => {
  const [certificationId, setCertificationId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Extract certification ID from URL
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Professional Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg p-2">
                <img
                  src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
                  alt="Legacy Translations"
                  className="h-8"
                />
              </div>
              <div className="hidden md:block border-l border-slate-600 pl-4">
                <p className="text-slate-300 text-xs uppercase tracking-wider">Official</p>
                <p className="text-white font-semibold">Document Verification Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-slate-400 text-xs">ATA Corporate Member</p>
                <p className="text-white font-mono text-sm">#275993</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        {loading ? (
          <div className="bg-white rounded-lg shadow-xl p-16 text-center border border-slate-200">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-slate-700 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-slate-600 font-medium">Verifying Document Authenticity</p>
            <p className="text-slate-400 text-sm mt-2">Please wait while we check our secure database...</p>
          </div>
        ) : error && !verificationResult ? (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-red-600 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">System Error</h1>
            </div>
            <div className="p-8 text-center">
              <p className="text-slate-600">{error}</p>
            </div>
          </div>
        ) : verificationResult?.is_valid ? (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200">
            {/* Verified Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-8">
              <div className="flex items-center justify-center gap-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-white">
                  <p className="text-emerald-200 text-sm uppercase tracking-wider font-medium">Verification Status</p>
                  <h1 className="text-3xl font-bold">AUTHENTIC DOCUMENT</h1>
                  <p className="text-emerald-100 mt-1">This translation has been verified as genuine</p>
                </div>
              </div>
            </div>

            {/* Certificate ID Section */}
            <div className="bg-slate-50 border-b border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-1">Certification ID</p>
                  <p className="text-2xl font-mono font-bold text-slate-800 tracking-wide">{verificationResult.certification_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-1">Verification Time</p>
                  <p className="text-sm text-slate-600">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Document Details */}
            <div className="p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200">
                Document Information
              </h2>

              <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                {/* Left Column */}
                <div className="space-y-5">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Document Type</p>
                    <p className="text-lg font-semibold text-slate-800">{verificationResult.document_type || 'Certified Translation'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Language Pair</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-slate-800">{verificationResult.source_language}</span>
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <span className="text-lg font-semibold text-slate-800">{verificationResult.target_language}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Page Count</p>
                    <p className="text-lg font-semibold text-slate-800">{verificationResult.page_count || 1} {(verificationResult.page_count || 1) === 1 ? 'page' : 'pages'}</p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Certification Date</p>
                    <p className="text-lg font-semibold text-slate-800">{formatDate(verificationResult.certified_at)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Certified By</p>
                    <p className="text-lg font-semibold text-slate-800">{verificationResult.certifier_name || 'Legacy Translations'}</p>
                    {verificationResult.certifier_credentials && (
                      <p className="text-sm text-slate-500">{verificationResult.certifier_credentials}</p>
                    )}
                  </div>

                  {verificationResult.order_number && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Order Reference</p>
                      <p className="text-lg font-semibold text-slate-800">{verificationResult.order_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Notice */}
              <div className="mt-8 bg-slate-800 rounded-lg p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Digital Security Verification</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      This document has been digitally certified and cryptographically secured. The certification
                      record is stored in our tamper-proof database with a unique document hash that ensures
                      the translation has not been altered since certification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <img
                    src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
                    alt="Legacy Translations"
                    className="h-10"
                  />
                  <div className="border-l border-slate-300 pl-4">
                    <p className="font-bold text-slate-800">Legacy Translations Inc.</p>
                    <p className="text-sm text-slate-500">Professional Translation Services</p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm text-slate-600">867 Boylston Street, 5th Floor, #2073</p>
                  <p className="text-sm text-slate-600">Boston, MA 02116</p>
                  <p className="text-sm text-slate-500 mt-1">(857) 316-7770 | contact@legacytranslations.com</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200">
            {/* Invalid Banner */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-8">
              <div className="flex items-center justify-center gap-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="text-white">
                  <p className="text-red-200 text-sm uppercase tracking-wider font-medium">Verification Status</p>
                  <h1 className="text-3xl font-bold">VERIFICATION FAILED</h1>
                  <p className="text-red-100 mt-1">This certification could not be verified</p>
                </div>
              </div>
            </div>

            {/* Failed Details */}
            <div className="p-8">
              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Certification ID Checked</p>
                <p className="text-xl font-mono font-bold text-slate-800">{certificationId}</p>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-slate-800 mb-3">Possible Reasons</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3 text-slate-600">
                    <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    The certification ID was entered incorrectly
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    The document was not certified by Legacy Translations
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    The certification has been revoked or expired
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-800 mb-1">Important Notice</h3>
                    <p className="text-amber-700 text-sm leading-relaxed">
                      If you received a document claiming to be certified by Legacy Translations that cannot be verified,
                      please contact us immediately. We take document authenticity very seriously.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="mailto:contact@legacytranslations.com?subject=Certification Verification Issue"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Support
                </a>
                <a
                  href="tel:+18573167770"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call (857) 316-7770
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Manual Verification Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Manual Verification</h2>
          <p className="text-sm text-slate-500 mb-4">Enter a certification ID to verify document authenticity</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={certificationId}
              onChange={(e) => setCertificationId(e.target.value.toUpperCase())}
              placeholder="Enter Certification ID (e.g., LT-20260119-A1B2C3D4)"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 font-mono text-sm"
            />
            <button
              onClick={() => verifyCertification(certificationId)}
              disabled={!certificationId || loading}
              className="px-8 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
            >
              {loading ? 'Verifying...' : 'Verify Document'}
            </button>
          </div>
        </div>
      </main>

      {/* Professional Footer */}
      <footer className="bg-slate-900 text-white py-10 mt-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg p-2">
                <img
                  src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
                  alt="Legacy Translations"
                  className="h-8"
                />
              </div>
              <div>
                <p className="font-bold">Legacy Translations Inc.</p>
                <p className="text-slate-400 text-sm">Professional Translation Services Since 2015</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-slate-400 text-xs uppercase tracking-wider">ATA Member</p>
                <p className="font-mono font-bold">#275993</p>
              </div>
              <div className="w-px h-10 bg-slate-700"></div>
              <div className="text-center">
                <p className="text-slate-400 text-xs uppercase tracking-wider">Certified</p>
                <p className="font-bold">Translations</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 text-center">
            <p className="text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} Legacy Translations Inc. All rights reserved.
            </p>
            <p className="text-slate-500 text-xs mt-2">
              This verification system is a secure service provided to authenticate certified translations issued by Legacy Translations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VerificationPage;
