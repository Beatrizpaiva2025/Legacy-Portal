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
            <a href="#/partner" className="bg-blue-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-blue-800 transition-colors">
              Partner Login
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section with Image */}
      <section className="pt-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900"></div>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Business Partnership Program
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                Streamline your company's translation needs with exclusive corporate benefits and dedicated support.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#contact-form" className="bg-white text-blue-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-50 transition-colors shadow-lg">
                  Become a Partner
                </a>
                <a href="#benefits" className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-colors">
                  Learn More
                </a>
              </div>
            </div>
            <div className="hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="Business professionals collaborating"
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-blue-900">10+</div>
              <div className="text-gray-600 mt-2">Years Experience</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-blue-900">50+</div>
              <div className="text-gray-600 mt-2">Languages</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-blue-900">500+</div>
              <div className="text-gray-600 mt-2">Corporate Clients</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-blue-900">100%</div>
              <div className="text-gray-600 mt-2">USCIS Accepted</div>
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
              <p className="text-gray-600">ATA member since 2015. All certified translations are 100% guaranteed accepted by USCIS.</p>
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
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3>
                  <p className="text-gray-600 mb-6">
                    Your request has been submitted. Our team will contact you within 24 hours.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="text-blue-900 font-medium hover:underline"
                  >
                    Submit another request
                  </button>
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
          <div className="text-center mb-10">
            <p className="text-gray-500 text-sm uppercase tracking-wide font-medium">Trusted by businesses nationwide</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-12">
            <div className="text-center">
              <img src="https://www.atanet.org/wp-content/themes/developer/images/logo.svg" alt="ATA" className="h-12 mx-auto mb-2 opacity-70" />
              <div className="text-sm text-gray-500">Corporate Member #275993</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">USCIS</div>
              <div className="text-sm text-gray-500">100% Acceptance Guaranteed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">BBB</div>
              <div className="text-sm text-gray-500">A+ Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Already a Partner */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 mb-4">Already a partner?</p>
          <a
            href="#/partner"
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
                Leader in Portuguese and Spanish Translations since 2015.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <p className="text-blue-200">info@legacytranslations.com</p>
              <p className="text-blue-200">(857) 208-1139</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <a href="https://legacytranslations.com" className="block text-blue-200 hover:text-white">Home</a>
                <a href="https://legacytranslations.com/services" className="block text-blue-200 hover:text-white">Services</a>
                <a href="#/partner" className="block text-blue-200 hover:text-white">Partner Portal</a>
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
