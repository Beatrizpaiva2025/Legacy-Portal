import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const B2BLandingPage = () => {
  // Check for reset_token, verify route, or orders path and redirect appropriately
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset_token');
    const pathname = window.location.pathname;

    // Check for verification route in hash
    const hash = window.location.hash;
    const verifyMatch = hash.match(/^#\/verify\/(.+)$/);

    // Redirect /orders/* paths to customer portal
    if (pathname.startsWith('/orders')) {
      window.location.href = '/#/customer';
      return;
    }

    // Redirect /customer path to customer portal (hash route)
    if (pathname.startsWith('/customer')) {
      window.location.href = '/#/customer';
      return;
    }

    if (resetToken) {
      // Redirect to partner portal with reset token
      window.location.href = `/#/partner?reset_token=${resetToken}`;
      return;
    }

    if (verifyMatch) {
      // Already handled by hash router, but ensure it stays
      return;
    }
  }, []);

  // Scroll to section helper (avoids HashRouter conflict)
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
      // No automatic redirect - user will receive email with registration link
    } catch (err) {
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
        // No automatic redirect - user will receive email with registration link
      } catch (err2) {
        setError('Failed to send request. Please try again or contact us directly.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <img
            src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
            alt="Legacy Translations"
            className="h-10 md:h-12"
          />
          <nav className="flex items-center space-x-6">
            <a href="https://legacytranslations.com" className="text-gray-600 hover:text-blue-900 text-sm font-medium hidden md:block">
              Home
            </a>
            <a href="https://legacytranslations.com/services" className="text-gray-600 hover:text-blue-900 text-sm font-medium hidden md:block">
              Services
            </a>
            <a href="#/partner/login" className="bg-blue-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-blue-800 transition-colors">
              Partner Login
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section - Clean Professional */}
      <section className="pt-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-900 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                15+ Years of Experience
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
                Certified Excellence
                <span className="block text-blue-900 italic">Powered by Technology</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Enterprise-grade translation services powered by certified professionals and cutting-edge technology. Trusted by law firms and immigration agencies.
              </p>
              <div className="flex flex-wrap gap-4 mb-8">
                <button onClick={() => scrollToSection('contact-form')} className="bg-blue-900 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-800 transition-colors shadow-lg shadow-blue-900/25">
                  Request Partnership
                </button>
                <button onClick={() => scrollToSection('benefits')} className="border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-lg font-semibold hover:border-blue-900 hover:text-blue-900 transition-colors">
                  View Benefits
                </button>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  USCIS Accepted
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  ATA Member
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  24h Turnaround
                </div>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-slate-100 rounded-3xl transform rotate-3"></div>
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663028493717/GnDnCrLJEsQqGTWB.png"
                alt="Global technology with international flags"
                className="relative rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Free Translation Offer Banner */}
      <section className="py-8 bg-gradient-to-r from-green-600 to-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-white text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold">First Certified Translation FREE!</div>
                <div className="text-green-100 text-sm md:text-base">1 page - No commitment required</div>
              </div>
            </div>
            <button
              onClick={() => scrollToSection('contact-form')}
              className="px-6 py-3 bg-white text-green-600 rounded-full font-semibold hover:bg-green-50 transition-colors shadow-lg"
            >
              Claim Your Free Translation
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-bold text-white">15+</div>
              <div className="text-slate-400 mt-2 text-sm uppercase tracking-wide">Years Experience</div>
            </div>
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-bold text-white">50+</div>
              <div className="text-slate-400 mt-2 text-sm uppercase tracking-wide">Languages</div>
            </div>
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-bold text-white">100%</div>
              <div className="text-slate-400 mt-2 text-sm uppercase tracking-wide">USCIS Accepted</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-4">
              Partnership Benefits
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join our B2B program and enjoy exclusive advantages designed for businesses with ongoing translation needs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">Monthly Invoicing</h3>
              <p className="text-gray-600">Net 30 payment terms for approved partners. Simplify your accounting with consolidated monthly billing.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">Volume Discounts</h3>
              <p className="text-gray-600">Special pricing based on your monthly translation volume. The more you translate, the more you save.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">Priority Processing</h3>
              <p className="text-gray-600">Your projects receive priority in our queue. Fast turnaround times to meet your business deadlines.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">Dedicated Support</h3>
              <p className="text-gray-600">Direct access to your account manager for personalized service and quick issue resolution.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">Online Dashboard</h3>
              <p className="text-gray-600">Track all your orders, download completed translations, and manage your account from one place.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">Certified Quality</h3>
              <p className="text-gray-600">ATA member. Certified translations in full compliance with strict USCIS standards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Getting started is simple
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">Submit Interest</h3>
              <p className="text-gray-600">Fill out the form below with your company information and translation needs.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">Get Approved</h3>
              <p className="text-gray-600">Our team will review your application and set up your corporate account within 24 hours.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">Start Translating</h3>
              <p className="text-gray-600">Access your dashboard, submit orders, and enjoy all partnership benefits.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-20 bg-gradient-to-br from-blue-900 to-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Fill out the form and our partnership team will contact you within 24 hours to discuss your company's needs.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-blue-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-blue-100">No commitment required</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-blue-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-blue-100">Free consultation</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-blue-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-blue-100">Custom pricing available</span>
                </div>
                <div className="flex items-start bg-gradient-to-r from-blue-800/50 to-purple-800/50 rounded-lg p-3 border border-blue-400/30">
                  <svg className="w-6 h-6 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <span className="text-yellow-200 font-bold block">Exclusive: Digital Verification System</span>
                    <span className="text-blue-200 text-sm">Each document includes QR code & unique serial number for instant authenticity verification by any institution</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-yellow-300 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  <div>
                    <span className="text-yellow-200 font-semibold block">First Certified Translation FREE (1 page)</span>
                    <span className="text-blue-200 text-xs">We trust our quality — enjoy one free certified page of any document type</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email!</h3>
                  <p className="text-gray-600 mb-4">
                    Your partnership request has been submitted successfully!
                  </p>
                  <p className="text-blue-600 font-medium mb-4">
                    We've sent you an email with a link to complete your registration.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Our team will also contact you within 24 hours to discuss your needs.
                  </p>
                  <a
                    href="/#/partner"
                    className="inline-block px-6 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 transition-colors"
                  >
                    Go to Partner Login
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-2xl font-bold text-blue-900 mb-6">Partnership Inquiry</h3>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                        value={formData.company_name}
                        onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                        placeholder="Your Company Inc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                        value={formData.contact_name}
                        onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                        placeholder="John Smith"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Email *</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="john@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Monthly Volume</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Tell us about your translation needs..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-400 font-semibold text-lg transition-colors"
                  >
                    {loading ? 'Submitting...' : 'Submit Partnership Request'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {/* ATA Member Logo */}
            <div className="text-center">
              <div className="h-24 md:h-28 mx-auto flex items-center justify-center">
                <img
                  src="/images/ata_member_hq.png"
                  alt="ATA Member - American Translators Association - Member #275993"
                  className="h-full object-contain"
                />
              </div>
            </div>

            {/* BBB Accredited Business A+ Logo */}
            <div className="text-center">
              <div className="h-24 md:h-28 mx-auto flex items-center justify-center">
                <img
                  src="/images/bbb-accredited-logo.png"
                  alt="BBB Accredited Business A+"
                  className="h-full object-contain"
                />
              </div>
            </div>

            {/* NETA Logo */}
            <div className="text-center">
              <div className="h-24 md:h-28 mx-auto flex items-center justify-center">
                <img
                  src="/images/neta-logo.jpg"
                  alt="NETA - New England Translators Association"
                  className="h-full object-contain"
                />
              </div>
            </div>

            {/* USCIS Logo */}
            <div className="text-center">
              <div className="h-16 md:h-20 mx-auto flex items-center justify-center">
                <img
                  src="/images/uscis-logo.png"
                  alt="USCIS - U.S. Citizenship and Immigration Services"
                  className="h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Already a Partner */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 mb-4">Already a partner?</p>
          <a
            href="#/partner/login"
            className="inline-block px-8 py-3 border-2 border-blue-900 text-blue-900 rounded-full hover:bg-blue-900 hover:text-white font-semibold transition-colors"
          >
            Access Partner Portal
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <img
                src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
                alt="Legacy Translations"
                className="h-10 mb-4 brightness-0 invert"
              />
              <p className="text-blue-200">
                Professional Certified Translation Services
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <p className="text-blue-200">contact@legacytranslations.com</p>
              <a href="https://wa.me/18573167770" className="flex items-center gap-2 text-blue-200 hover:text-green-400 transition-colors">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                +1 (857) 316-7770
              </a>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <a href="https://legacytranslations.com" className="block text-blue-200 hover:text-white">Home</a>
                <a href="https://legacytranslations.com/services" className="block text-blue-200 hover:text-white">Services</a>
                <a href="#/partner/login" className="block text-blue-200 hover:text-white">Partner Portal</a>
              </div>
            </div>
          </div>
          <div className="border-t border-blue-800 mt-8 pt-8 text-center text-blue-300">
            <p>&copy; {new Date().getFullYear()} Legacy Translations. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default B2BLandingPage;
