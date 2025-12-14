import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

// Translation status options
const TRANSLATION_STATUSES = [
  { value: 'received', label: 'Received', color: 'bg-gray-100 text-gray-800' },
  { value: 'in_translation', label: 'In Translation', color: 'bg-blue-100 text-blue-800' },
  { value: 'review', label: 'Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'ready', label: 'Ready', color: 'bg-green-100 text-green-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-purple-100 text-purple-800' }
];

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' }
];

// ==================== ADMIN LOGIN ====================
const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isFirstAdmin, setIsFirstAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;
      if (isFirstAdmin) {
        response = await axios.post(`${API}/admin/create-first`, {
          email,
          password,
          name
        });
      } else {
        response = await axios.post(`${API}/admin/login`, {
          email,
          password
        });
      }
      onLogin(response.data);
    } catch (err) {
      if (err.response?.data?.detail === 'Admin already exists. Use admin login.') {
        setIsFirstAdmin(false);
        setError('Admin exists. Please login.');
      } else {
        setError(err.response?.data?.detail || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Legacy Translations Management</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isFirstAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border rounded-md"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Administrator"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border rounded-md"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border rounded-md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
          >
            {loading ? 'Please wait...' : (isFirstAdmin ? 'Create Admin Account' : 'Login')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsFirstAdmin(!isFirstAdmin)}
            className="text-gray-600 hover:underline text-sm"
          >
            {isFirstAdmin ? 'Already have an account? Login' : 'First time? Create admin account'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== DASHBOARD ====================
const Dashboard = ({ stats, recentOrders, onViewOrder }) => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Total Orders</div>
          <div className="text-3xl font-bold text-gray-800">{stats?.total_orders || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Pending</div>
          <div className="text-3xl font-bold text-yellow-600">{stats?.pending_orders || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">In Progress</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.in_progress || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Completed</div>
          <div className="text-3xl font-bold text-green-600">{stats?.completed || 0}</div>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="text-green-100 text-sm">Total Revenue</div>
          <div className="text-3xl font-bold">${(stats?.total_revenue || 0).toFixed(2)}</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow p-6 text-white">
          <div className="text-yellow-100 text-sm">Pending Payments</div>
          <div className="text-3xl font-bold">${(stats?.pending_revenue || 0).toFixed(2)}</div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="text-blue-100 text-sm">Active Translators</div>
          <div className="text-3xl font-bold">{stats?.total_translators || 0}</div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Languages</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentOrders?.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-blue-600">{order.order_number}</td>
                  <td className="px-4 py-3">{order.client_name}</td>
                  <td className="px-4 py-3 text-sm">{order.translate_from} → {order.translate_to}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      TRANSLATION_STATUSES.find(s => s.value === order.translation_status)?.color || 'bg-gray-100'
                    }`}>
                      {TRANSLATION_STATUSES.find(s => s.value === order.translation_status)?.label || order.translation_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">${order.total_price?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onViewOrder(order)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==================== ORDERS LIST ====================
const OrdersList = ({ token, onViewOrder }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const params = filter ? `&status=${filter}` : '';
      const response = await axios.get(`${API}/admin/orders?token=${token}${params}`);
      setOrders(response.data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading orders...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="">All Status</option>
            {TRANSLATION_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Languages</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pages</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-blue-600">{order.order_number}</td>
                <td className="px-4 py-3">
                  <div>{order.client_name}</div>
                  <div className="text-xs text-gray-500">{order.client_email}</div>
                </td>
                <td className="px-4 py-3 text-sm">{order.partner_company}</td>
                <td className="px-4 py-3 text-sm">{order.translate_from} → {order.translate_to}</td>
                <td className="px-4 py-3">{order.page_count}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    TRANSLATION_STATUSES.find(s => s.value === order.translation_status)?.color || 'bg-gray-100'
                  }`}>
                    {TRANSLATION_STATUSES.find(s => s.value === order.translation_status)?.label || order.translation_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    PAYMENT_STATUSES.find(s => s.value === order.payment_status)?.color || 'bg-gray-100'
                  }`}>
                    {PAYMENT_STATUSES.find(s => s.value === order.payment_status)?.label || order.payment_status}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">${order.total_price?.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onViewOrder(order)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==================== ORDER DETAIL ====================
const OrderDetail = ({ order, token, translators, onBack, onUpdate }) => {
  const [status, setStatus] = useState(order.translation_status);
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status);
  const [selectedTranslator, setSelectedTranslator] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/orders/${order.id}?token=${token}`, {
        translation_status: status,
        payment_status: paymentStatus
      });
      onUpdate();
    } catch (err) {
      alert('Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTranslator) return;
    try {
      await axios.post(`${API}/admin/orders/${order.id}/assign?translator_id=${selectedTranslator}&token=${token}`);
      alert('Translator assigned successfully');
      onUpdate();
    } catch (err) {
      alert('Failed to assign translator');
    }
  };

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 text-blue-600 hover:underline">&larr; Back to Orders</button>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{order.order_number}</h1>
            <p className="text-gray-500">Created: {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">${order.total_price?.toFixed(2)}</div>
            <div className="text-sm text-gray-500">{order.page_count} pages</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Client Info */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Client Information</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Name:</span> {order.client_name}</div>
              <div><span className="text-gray-500">Email:</span> {order.client_email}</div>
              <div><span className="text-gray-500">Partner:</span> {order.partner_company}</div>
            </div>
          </div>

          {/* Translation Info */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Translation Details</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">From:</span> {order.translate_from}</div>
              <div><span className="text-gray-500">To:</span> {order.translate_to}</div>
              <div><span className="text-gray-500">Service:</span> {order.service_type === 'standard' ? 'Certified' : 'Professional'}</div>
              <div><span className="text-gray-500">Urgency:</span> {order.urgency}</div>
            </div>
          </div>
        </div>

        {/* Status Management */}
        <div className="border rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Status Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Translation Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {TRANSLATION_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {PAYMENT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Assign Translator */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Assign Translator</h3>
          <div className="flex gap-4">
            <select
              value={selectedTranslator}
              onChange={(e) => setSelectedTranslator(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
            >
              <option value="">Select translator...</option>
              {translators?.map(t => (
                <option key={t.id} value={t.id}>{t.name} - {t.languages?.join(', ')}</option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={!selectedTranslator}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== TRANSLATORS ====================
const TranslatorsList = ({ token }) => {
  const [translators, setTranslators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    languages: '',
    specializations: '',
    rate_per_word: 0.05
  });

  useEffect(() => {
    fetchTranslators();
  }, []);

  const fetchTranslators = async () => {
    try {
      const response = await axios.get(`${API}/admin/translators?token=${token}`);
      setTranslators(response.data.translators || []);
    } catch (err) {
      console.error('Failed to fetch translators:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/translators?token=${token}`, {
        ...formData,
        languages: formData.languages.split(',').map(l => l.trim()),
        specializations: formData.specializations.split(',').map(s => s.trim())
      });
      setShowForm(false);
      setFormData({ name: '', email: '', phone: '', languages: '', specializations: '', rate_per_word: 0.05 });
      fetchTranslators();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create translator');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading translators...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Translators</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Add Translator
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">New Translator</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border rounded-md"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border rounded-md"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Rate per Word ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.rate_per_word}
                onChange={(e) => setFormData({...formData, rate_per_word: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Languages (comma separated)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="English, Portuguese, Spanish"
                value={formData.languages}
                onChange={(e) => setFormData({...formData, languages: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Specializations (comma separated)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="certified, legal, medical"
                value={formData.specializations}
                onChange={(e) => setFormData({...formData, specializations: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                Save Translator
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="ml-4 px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Languages</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {translators.map((translator) => (
              <tr key={translator.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{translator.name}</td>
                <td className="px-4 py-3 text-sm">{translator.email}</td>
                <td className="px-4 py-3 text-sm">{translator.languages?.join(', ')}</td>
                <td className="px-4 py-3">${translator.rate_per_word}/word</td>
                <td className="px-4 py-3">{translator.orders_completed || 0}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    translator.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {translator.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==================== MAIN ADMIN APP ====================
function AdminApp() {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({ stats: {}, recent_orders: [] });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [translators, setTranslators] = useState([]);

  useEffect(() => {
    const savedAdmin = localStorage.getItem('admin');
    const savedToken = localStorage.getItem('admin_token');
    if (savedAdmin && savedToken) {
      setAdmin(JSON.parse(savedAdmin));
      setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchDashboard();
      fetchTranslators();
    }
  }, [token]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/admin/dashboard?token=${token}`);
      setDashboardData(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  };

  const fetchTranslators = async () => {
    try {
      const response = await axios.get(`${API}/admin/translators?token=${token}`);
      setTranslators(response.data.translators || []);
    } catch (err) {
      console.error('Failed to fetch translators:', err);
    }
  };

  const handleLogin = (data) => {
    setAdmin(data);
    setToken(data.token);
    localStorage.setItem('admin', JSON.stringify(data));
    localStorage.setItem('admin_token', data.token);
  };

  const handleLogout = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem('admin');
    localStorage.removeItem('admin_token');
  };

  if (!admin) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'orders', label: 'Orders', icon: '📋' },
    { id: 'translators', label: 'Translators', icon: '👥' },
  ];

  const renderContent = () => {
    if (selectedOrder) {
      return (
        <OrderDetail
          order={selectedOrder}
          token={token}
          translators={translators}
          onBack={() => setSelectedOrder(null)}
          onUpdate={() => {
            fetchDashboard();
            setSelectedOrder(null);
          }}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            stats={dashboardData.stats}
            recentOrders={dashboardData.recent_orders}
            onViewOrder={setSelectedOrder}
          />
        );
      case 'orders':
        return <OrdersList token={token} onViewOrder={setSelectedOrder} />;
      case 'translators':
        return <TranslatorsList token={token} />;
      default:
        return <Dashboard stats={dashboardData.stats} recentOrders={dashboardData.recent_orders} onViewOrder={setSelectedOrder} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white min-h-screen">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-gray-400 text-sm">Legacy Translations</p>
        </div>

        <nav className="mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSelectedOrder(null); }}
              className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                activeTab === item.id
                  ? 'bg-gray-800 border-l-4 border-blue-500'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-2">{admin.email}</div>
          <button
            onClick={handleLogout}
            className="w-full py-2 text-red-400 hover:bg-gray-800 rounded-md"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 capitalize">{activeTab}</h2>
            <div className="text-sm text-gray-600">
              Welcome, {admin.name}
            </div>
          </div>
        </header>
        {renderContent()}
      </div>
    </div>
  );
}

export default AdminApp;
