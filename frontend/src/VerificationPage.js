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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
              alt="Legacy Translations"
              className="h-10"
            />
          </div>
          <div className="text-sm text-gray-500">
            Document Verification System
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying certification...</p>
          </div>
        ) : error && !verificationResult ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Verification Error</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        ) : verificationResult?.is_valid ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur">
                <span className="text-5xl">✓</span>
              </div>
              <h1 className="text-2xl font-bold mb-2">Verified Authentic</h1>
              <p className="text-green-100">This certified translation is genuine and was issued by Legacy Translations Inc.</p>
            </div>

            {/* Certificate Details */}
            <div className="p-8">
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span>🔐</span>
                  <span>Certification ID</span>
                </div>
                <p className="text-xl font-mono font-bold text-gray-800">{verificationResult.certification_id}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">📄 Document Type</div>
                    <p className="font-medium text-gray-800">{verificationResult.document_type || 'Certified Translation'}</p>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">🌐 Language Pair</div>
                    <p className="font-medium text-gray-800">
                      {verificationResult.source_language} → {verificationResult.target_language}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">📑 Page Count</div>
                    <p className="font-medium text-gray-800">{verificationResult.page_count || 1} page(s)</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">📅 Certified Date</div>
                    <p className="font-medium text-gray-800">{formatDate(verificationResult.certified_at)}</p>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">✍️ Certified By</div>
                    <p className="font-medium text-gray-800">{verificationResult.certifier_name || 'Legacy Translations'}</p>
                    <p className="text-sm text-gray-500">{verificationResult.certifier_credentials}</p>
                  </div>
                  {verificationResult.order_number && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">📋 Order Reference</div>
                      <p className="font-medium text-gray-800">{verificationResult.order_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Notice */}
              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl">🛡️</span>
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-1">Security Verification</h3>
                    <p className="text-sm text-blue-700">
                      This document has been digitally certified and is stored in our secure database.
                      The certification includes a unique hash that verifies the document has not been altered
                      since certification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Footer */}
            <div className="bg-gray-50 p-6 border-t border-gray-100">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <p className="font-semibold text-gray-800">Legacy Translations Inc.</p>
                  <p className="text-sm text-gray-500">867 Boylston Street, 5th Floor, #2073, Boston, MA 02116</p>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm text-gray-500">(857) 316-7770</p>
                  <p className="text-sm text-gray-500">contact@legacytranslations.com</p>
                  <p className="text-sm font-medium text-teal-600">ATA Member #275993</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Invalid Header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-8 text-center text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur">
                <span className="text-5xl">✗</span>
              </div>
              <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
              <p className="text-red-100">This certification could not be verified</p>
            </div>

            <div className="p-8 text-center">
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  The certification ID <span className="font-mono font-bold">{certificationId}</span> was not found in our system.
                </p>
                <p className="text-sm text-gray-500">
                  This could mean:
                </p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                  <li>• The certification ID was entered incorrectly</li>
                  <li>• The document was not certified by Legacy Translations</li>
                  <li>• The certification has been revoked</li>
                </ul>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-3">
                  <span className="text-amber-500 text-xl">⚠️</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-amber-800 mb-1">Warning</h3>
                    <p className="text-sm text-amber-700">
                      If you received this document claiming to be certified by Legacy Translations,
                      please contact us immediately to verify its authenticity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <a
                  href="mailto:contact@legacytranslations.com?subject=Certification Verification Request"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <span>📧</span>
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Manual Verification */}
        <div className="mt-8 bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Manual Verification</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={certificationId}
              onChange={(e) => setCertificationId(e.target.value)}
              placeholder="Enter Certification ID (e.g., LT-20260119-A1B2C3D4)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <button
              onClick={() => verifyCertification(certificationId)}
              disabled={!certificationId || loading}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Legacy Translations Inc. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            This verification system confirms the authenticity of certified translations issued by Legacy Translations.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default VerificationPage;
