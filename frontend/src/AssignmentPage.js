import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const AssignmentPage = () => {
  const { token, action } = useParams();
  const [status, setStatus] = useState('loading'); // loading, success, error, already_responded
  const [message, setMessage] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    const processAssignment = async () => {
      if (!token || !action) {
        setStatus('error');
        setMessage('Invalid link. Missing token or action.');
        return;
      }

      if (!['accept', 'decline'].includes(action)) {
        setStatus('error');
        setMessage('Invalid action. Must be accept or decline.');
        return;
      }

      try {
        const response = await axios.post(`${API}/translator/assignment/${token}/${action}`);
        setStatus(action === 'accept' ? 'accepted' : 'declined');
        setMessage(response.data.message);
        setOrderNumber(response.data.order_number || '');
      } catch (err) {
        const errorDetail = err.response?.data?.detail || 'An error occurred';
        if (errorDetail.includes('already')) {
          setStatus('already_responded');
          setMessage(errorDetail);
        } else {
          setStatus('error');
          setMessage(errorDetail);
        }
      }
    };

    processAssignment();
  }, [token, action]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
        );
      case 'accepted':
        return (
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'declined':
        return (
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'already_responded':
        return (
          <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Processing...';
      case 'accepted':
        return 'Assignment Accepted!';
      case 'declined':
        return 'Assignment Declined';
      case 'already_responded':
        return 'Already Responded';
      default:
        return 'Error';
    }
  };

  const getSubtitle = () => {
    switch (status) {
      case 'loading':
        return 'Please wait while we process your response...';
      case 'accepted':
        return `Thank you! You have accepted the assignment${orderNumber ? ` for project ${orderNumber}` : ''}.`;
      case 'declined':
        return `You have declined the assignment${orderNumber ? ` for project ${orderNumber}` : ''}. The team will be notified.`;
      case 'already_responded':
        return message;
      default:
        return message || 'Something went wrong. Please try again or contact support.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        {/* Logo */}
        <div className="mb-6">
          <img
            src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png"
            alt="Legacy Translations"
            className="h-12 mx-auto"
          />
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          {getIcon()}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          {getTitle()}
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-8">
          {getSubtitle()}
        </p>

        {/* Action Button - Only show when not loading */}
        {status !== 'loading' && (
          <div className="space-y-3">
            {status === 'accepted' && (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  You can now access the project in your translator portal.
                </p>
                <button
                  onClick={() => {
                    // Clear any existing session to force fresh login
                    localStorage.removeItem('admin_key');
                    localStorage.removeItem('admin_user');
                    window.location.href = '/#/admin';
                  }}
                  className="w-full py-3 px-6 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:from-teal-600 hover:to-teal-700 transition-all duration-200"
                >
                  Go to Translator Portal
                </button>
              </>
            )}

            {status === 'declined' && (
              <p className="text-sm text-gray-500">
                Thank you for letting us know. We will assign another translator.
              </p>
            )}

            {(status === 'error' || status === 'already_responded') && (
              <button
                onClick={() => {
                  // Clear any existing session to force fresh login
                  localStorage.removeItem('admin_key');
                  localStorage.removeItem('admin_user');
                  window.location.href = '/#/admin';
                }}
                className="w-full py-3 px-6 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-lg shadow-md hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
              >
                Go to Portal
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Legacy Translations - Professional Translation Services
          </p>
          <p className="text-xs text-gray-400 mt-1">
            legacytranslations.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssignmentPage;
