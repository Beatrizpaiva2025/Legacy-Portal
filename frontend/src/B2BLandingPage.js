import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const B2BLandingPage = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    estimated_volume: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API}/b2b-interest`, formData);
      setSuccess(true);
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        estimated_volume: '',
        message: ''
      });
    } catch (err) {
      // If endpoint doesn't exist, send via email endpoint
      try {
        await axios.post(`${API}/support-request`, {
          email: formData.email,
          category: 'B2B Partnership Interest',
          description: `
Company: ${formData.company_name}
Contact: ${formData.contact_name}
Email: ${formData.email}
Phone: ${formData.phone}
Estimated Monthly Volume: ${formData.estimated_volume}
Message: ${formData.message}
          `.trim()
        });
        setSuccess(true);
        setFormData({
          company_name: '',
          contact_name: '',
          email: '',
          phone: '',
          estimated_volume: '',
          message: ''
        });
      } catch (err2) {
        setError('Failed to send request. Please try again or contact us directly.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <img
            src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
            alt="Legacy Translations"
            className="h-12"
          />
          <a
            href="https://legacytranslations.com"
            className="text-blue-900 hover:text-blue-700 font-medium"
          >
            Back to Main Site
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">
            Business Partnership Program
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Exclusive benefits for companies with regular translation needs
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">
            Partner Benefits
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-xl bg-blue-50">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="font-bold text-blue-900 mb-2">Monthly Invoicing</h3>
              <p className="text-gray-600 text-sm">Net 30 payment terms for approved partners</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-blue-50">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="font-bold text-blue-900 mb-2">Volume Discounts</h3>
              <p className="text-gray-600 text-sm">Special pricing based on monthly volume</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-blue-50">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="font-bold text-blue-900 mb-2">Priority Processing</h3>
              <p className="text-gray-600 text-sm">Your projects get priority in our queue</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-blue-50">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-bold text-blue-900 mb-2">Dedicated Support</h3>
              <p className="text-gray-600 text-sm">Direct access to your account manager</p>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-blue-900 mb-2 text-center">
              Request Partnership Information
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Fill out the form below and our team will contact you within 24 hours
            </p>

            {success ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-green-700 mb-2">Request Sent!</h3>
                <p className="text-gray-600 mb-6">
                  Thank you for your interest. Our team will contact you soon.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Send another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      placeholder="Your Company Inc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                      placeholder="John Smith"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Email *
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="john@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Monthly Volume
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.estimated_volume}
                    onChange={(e) => setFormData({...formData, estimated_volume: e.target.value})}
                  >
                    <option value="">Select estimated volume</option>
                    <option value="1-10 pages">1-10 pages per month</option>
                    <option value="11-50 pages">11-50 pages per month</option>
                    <option value="51-100 pages">51-100 pages per month</option>
                    <option value="100+ pages">100+ pages per month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tell us about your needs
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="What types of documents do you need translated? What languages?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-400 font-semibold text-lg transition-colors"
                >
                  {loading ? 'Sending...' : 'Request Partnership Information'}
                </button>
              </form>
            )}
          </div>

          {/* Already have account */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">Already a partner?</p>
            <a
              href="#/partner"
              className="inline-block px-8 py-3 border-2 border-blue-900 text-blue-900 rounded-lg hover:bg-blue-900 hover:text-white font-semibold transition-colors"
            >
              Partner Login
            </a>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
            <div className="text-center">
              <div className="font-bold text-gray-700">ATA Member</div>
              <div className="text-sm text-gray-500">#275993 since 2015</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-700">USCIS Accepted</div>
              <div className="text-sm text-gray-500">100% Guaranteed</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-700">BBB Accredited</div>
              <div className="text-sm text-gray-500">A+ Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-blue-900 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-blue-200">
            © {new Date().getFullYear()} Legacy Translations. All rights reserved.
          </p>
          <p className="text-blue-300 mt-2">
            <a href="mailto:contact@legacytranslations.com" className="hover:text-white">
              contact@legacytranslations.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default B2BLandingPage;
