import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

// ==================== CONSTANTS ====================
const TRANSLATION_STAGES = {
  'received': { id: 1, name: 'Received', icon: '📥', color: 'bg-gray-100 text-gray-800' },
  'in_translation': { id: 2, name: 'In Translation', icon: '✍️', color: 'bg-blue-100 text-blue-800' },
  'review': { id: 3, name: 'Review', icon: '🔍', color: 'bg-yellow-100 text-yellow-800' },
  'ready': { id: 4, name: 'Ready', icon: '📦', color: 'bg-green-100 text-green-800' },
  'delivered': { id: 5, name: 'Delivered', icon: '🎉', color: 'bg-purple-100 text-purple-800' }
};

const PAYMENT_STATUS = {
  'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  'paid': { color: 'bg-green-100 text-green-800', label: 'Paid' },
  'overdue': { color: 'bg-red-100 text-red-800', label: 'Overdue' }
};

const LANGUAGES = {
  'english': { name: 'English', flag: '🇺🇸' },
  'spanish': { name: 'Spanish', flag: '🇪🇸' },
  'french': { name: 'French', flag: '🇫🇷' },
  'german': { name: 'German', flag: '🇩🇪' },
  'portuguese': { name: 'Portuguese', flag: '🇧🇷' },
  'italian': { name: 'Italian', flag: '🇮🇹' },
  'chinese': { name: 'Chinese', flag: '🇨🇳' },
  'japanese': { name: 'Japanese', flag: '🇯🇵' },
  'korean': { name: 'Korean', flag: '🇰🇷' },
  'arabic': { name: 'Arabic', flag: '🇸🇦' },
  'russian': { name: 'Russian', flag: '🇷🇺' },
  'dutch': { name: 'Dutch', flag: '🇳🇱' }
};

// ==================== ADMIN LOGIN ====================
const AdminLogin = ({ onLogin }) => {
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify admin key by fetching orders
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      if (response.data) {
        onLogin(adminKey);
      }
    } catch (err) {
      setError('Invalid admin key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-gray-600">Legacy Translations Management</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Key</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin key..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 font-semibold transition-colors"
          >
            {loading ? 'Verifying...' : 'Access Admin Panel'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-teal-600 hover:underline text-sm">
            ← Back to Partner Portal
          </a>
        </div>
      </div>
    </div>
  );
};

// ==================== ADMIN SIDEBAR ====================
const AdminSidebar = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'orders', label: 'Orders', icon: '📋' },
    { id: 'translators', label: 'Translators', icon: '👥' },
    { id: 'translator-workspace', label: 'Translation', icon: '✍️' },
    { id: 'glossaries', label: 'Glossaries', icon: '📚' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
            <span className="text-xl">🌐</span>
          </div>
          <div>
            <div className="font-bold">Legacy Admin</div>
            <div className="text-xs text-slate-400">Management System</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
              activeTab === item.id
                ? 'bg-teal-600 text-white border-r-4 border-teal-400'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onLogout}
          className="w-full py-2 text-red-400 hover:bg-red-900/30 rounded-md transition-colors"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

// ==================== DASHBOARD ====================
const Dashboard = ({ adminKey }) => {
  const [stats, setStats] = useState({
    total_orders: 0,
    pending_orders: 0,
    in_progress: 0,
    completed: 0,
    total_revenue: 0,
    pending_payment: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      const orders = response.data.orders || [];

      // Calculate stats
      const total = orders.length;
      const pending = orders.filter(o => o.translation_status === 'received').length;
      const inProgress = orders.filter(o => ['in_translation', 'review'].includes(o.translation_status)).length;
      const completed = orders.filter(o => ['ready', 'delivered'].includes(o.translation_status)).length;
      const revenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.total_price || 0), 0);
      const pendingPayment = orders.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + (o.total_price || 0), 0);

      setStats({
        total_orders: total,
        pending_orders: pending,
        in_progress: inProgress,
        completed: completed,
        total_revenue: revenue,
        pending_payment: pendingPayment
      });

      setRecentOrders(orders.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 font-medium">Total Orders</div>
              <div className="text-3xl font-bold text-gray-800">{stats.total_orders}</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 font-medium">Pending</div>
              <div className="text-3xl font-bold text-gray-800">{stats.pending_orders}</div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 font-medium">In Progress</div>
              <div className="text-3xl font-bold text-gray-800">{stats.in_progress}</div>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✍️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 font-medium">Completed</div>
              <div className="text-3xl font-bold text-gray-800">{stats.completed}</div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80 font-medium">Total Revenue</div>
              <div className="text-3xl font-bold">${stats.total_revenue.toFixed(2)}</div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80 font-medium">Pending Payment</div>
              <div className="text-3xl font-bold">${stats.pending_payment.toFixed(2)}</div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Languages</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-teal-600">#{order.order_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{order.client_name}</div>
                    <div className="text-sm text-gray-500">{order.client_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">
                      {LANGUAGES[order.translate_from]?.flag} → {LANGUAGES[order.translate_to]?.flag}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${TRANSLATION_STAGES[order.translation_status]?.color}`}>
                      {TRANSLATION_STAGES[order.translation_status]?.icon} {TRANSLATION_STAGES[order.translation_status]?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold">${order.total_price?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==================== ORDERS MANAGEMENT ====================
const OrdersManagement = ({ adminKey, onOpenTranslation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [translators, setTranslators] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchTranslators();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      let filteredOrders = response.data.orders || [];

      if (filter !== 'all') {
        filteredOrders = filteredOrders.filter(o => o.translation_status === filter);
      }

      setOrders(filteredOrders);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTranslators = async () => {
    try {
      const response = await axios.get(`${API}/admin/translators?admin_key=${adminKey}`);
      setTranslators(response.data.translators || []);
    } catch (err) {
      // Translators endpoint might not exist yet
      setTranslators([
        { id: '1', name: 'Maria Silva', languages: ['portuguese', 'english'], status: 'available' },
        { id: '2', name: 'John Smith', languages: ['spanish', 'english'], status: 'available' },
        { id: '3', name: 'Sophie Dubois', languages: ['french', 'english'], status: 'busy' }
      ]);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}?admin_key=${adminKey}`, {
        translation_status: newStatus
      });
      fetchOrders();
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  const markAsPaid = async (orderId) => {
    try {
      await axios.post(`${API}/admin/orders/${orderId}/mark-paid?admin_key=${adminKey}`);
      fetchOrders();
    } catch (err) {
      console.error('Failed to mark as paid:', err);
    }
  };

  const deliverOrder = async (orderId) => {
    try {
      await axios.post(`${API}/admin/orders/${orderId}/deliver?admin_key=${adminKey}`);
      fetchOrders();
    } catch (err) {
      console.error('Failed to deliver order:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Orders Management</h1>
        <div className="flex gap-2">
          {['all', 'received', 'in_translation', 'review', 'ready', 'delivered'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : TRANSLATION_STAGES[f]?.name || f}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No orders found</h2>
          <p className="text-gray-600">Orders will appear here when partners submit them</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-xl font-bold text-teal-600">#{order.order_number}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${TRANSLATION_STAGES[order.translation_status]?.color}`}>
                        {TRANSLATION_STAGES[order.translation_status]?.icon} {TRANSLATION_STAGES[order.translation_status]?.name}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS[order.payment_status]?.color}`}>
                        {PAYMENT_STATUS[order.payment_status]?.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Client</div>
                        <div className="font-medium">{order.client_name}</div>
                        <div className="text-gray-400 text-xs">{order.client_email}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Languages</div>
                        <div className="font-medium">
                          {LANGUAGES[order.translate_from]?.flag} {LANGUAGES[order.translate_from]?.name} → {LANGUAGES[order.translate_to]?.flag} {LANGUAGES[order.translate_to]?.name}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Words/Pages</div>
                        <div className="font-medium">{order.word_count} words ({order.page_count || Math.ceil(order.word_count / 250)} pages)</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Total</div>
                        <div className="font-bold text-lg text-teal-600">${order.total_price?.toFixed(2)}</div>
                      </div>
                    </div>

                    {order.assigned_translator && (
                      <div className="mt-3 p-2 bg-blue-50 rounded-lg inline-flex items-center">
                        <span className="text-blue-600 mr-2">👤</span>
                        <span className="text-sm font-medium text-blue-800">Assigned: {order.assigned_translator}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {order.translation_status === 'received' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowAssignModal(true);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          👤 Assign
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'in_translation')}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
                        >
                          ▶️ Start
                        </button>
                      </>
                    )}

                    {order.translation_status === 'in_translation' && (
                      <button
                        onClick={() => onOpenTranslation(order)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                      >
                        ✍️ Translate
                      </button>
                    )}

                    {order.translation_status === 'review' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        ✅ Approve
                      </button>
                    )}

                    {order.translation_status === 'ready' && (
                      <button
                        onClick={() => deliverOrder(order.id)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                      >
                        📤 Deliver
                      </button>
                    )}

                    {order.payment_status === 'pending' && (
                      <button
                        onClick={() => markAsPaid(order.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        💳 Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Assign Translator</h2>
            <p className="text-gray-600 mb-4">Order #{selectedOrder.order_number}</p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {translators.map((translator) => (
                <button
                  key={translator.id}
                  onClick={async () => {
                    try {
                      await axios.put(`${API}/admin/orders/${selectedOrder.id}?admin_key=${adminKey}`, {
                        assigned_translator: translator.name
                      });
                      fetchOrders();
                      setShowAssignModal(false);
                    } catch (err) {
                      console.error('Failed to assign:', err);
                    }
                  }}
                  className="w-full p-4 border rounded-lg hover:bg-gray-50 text-left flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{translator.name}</div>
                    <div className="text-sm text-gray-500">
                      {translator.languages?.map(l => LANGUAGES[l]?.flag).join(' ')}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    translator.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {translator.status}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAssignModal(false)}
              className="w-full mt-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== TRANSLATORS MANAGEMENT ====================
const TranslatorsManagement = ({ adminKey }) => {
  const [translators, setTranslators] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTranslator, setNewTranslator] = useState({
    name: '',
    email: '',
    languages: [],
    specializations: []
  });

  useEffect(() => {
    fetchTranslators();
  }, []);

  const fetchTranslators = async () => {
    try {
      const response = await axios.get(`${API}/admin/translators?admin_key=${adminKey}`);
      setTranslators(response.data.translators || []);
    } catch (err) {
      // Mock data if endpoint doesn't exist
      setTranslators([
        { id: '1', name: 'Maria Silva', email: 'maria@legacy.com', languages: ['portuguese', 'english'], specializations: ['legal', 'medical'], status: 'available', completed_orders: 45 },
        { id: '2', name: 'John Smith', email: 'john@legacy.com', languages: ['spanish', 'english'], specializations: ['business', 'technical'], status: 'available', completed_orders: 32 },
        { id: '3', name: 'Sophie Dubois', email: 'sophie@legacy.com', languages: ['french', 'english'], specializations: ['legal', 'financial'], status: 'busy', completed_orders: 28 }
      ]);
    }
  };

  const addTranslator = async () => {
    try {
      await axios.post(`${API}/admin/translators?admin_key=${adminKey}`, newTranslator);
      fetchTranslators();
      setShowAddModal(false);
      setNewTranslator({ name: '', email: '', languages: [], specializations: [] });
    } catch (err) {
      // If endpoint doesn't exist, add locally
      setTranslators([...translators, { ...newTranslator, id: Date.now().toString(), status: 'available', completed_orders: 0 }]);
      setShowAddModal(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Translators</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
        >
          + Add Translator
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {translators.map((translator) => (
          <div key={translator.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {translator.name?.charAt(0)}
                </div>
                <div className="ml-3">
                  <div className="font-semibold text-gray-800">{translator.name}</div>
                  <div className="text-sm text-gray-500">{translator.email}</div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                translator.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {translator.status}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Languages</div>
                <div className="flex flex-wrap gap-1">
                  {translator.languages?.map((lang) => (
                    <span key={lang} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {LANGUAGES[lang]?.flag} {LANGUAGES[lang]?.name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Specializations</div>
                <div className="flex flex-wrap gap-1">
                  {translator.specializations?.map((spec) => (
                    <span key={spec} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs capitalize">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-800">{translator.completed_orders}</span> orders completed
                </div>
                <button className="text-teal-600 hover:text-teal-800 text-sm font-medium">
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Translator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add New Translator</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={newTranslator.name}
                  onChange={(e) => setNewTranslator({...newTranslator, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={newTranslator.email}
                  onChange={(e) => setNewTranslator({...newTranslator, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Languages</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(LANGUAGES).map(([code, lang]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        const langs = newTranslator.languages.includes(code)
                          ? newTranslator.languages.filter(l => l !== code)
                          : [...newTranslator.languages, code];
                        setNewTranslator({...newTranslator, languages: langs});
                      }}
                      className={`px-2 py-1 rounded text-xs ${
                        newTranslator.languages.includes(code)
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={addTranslator}
                className="flex-1 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Add Translator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== TRANSLATOR WORKSPACE (TRANSLATION PROGRAM) ====================
const TranslatorWorkspace = ({ adminKey, order, onBack }) => {
  const [activeStep, setActiveStep] = useState('ocr');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [segments, setSegments] = useState([]);
  const [glossary, setGlossary] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [selectedSegment, setSelectedSegment] = useState(null);

  const steps = [
    { id: 'ocr', name: 'OCR', icon: '📄' },
    { id: 'review', name: 'Review', icon: '🔍' },
    { id: 'translate', name: 'Translate', icon: '✍️' },
    { id: 'approval', name: 'Approval', icon: '✅' },
    { id: 'export', name: 'Export', icon: '📤' }
  ];

  useEffect(() => {
    if (order?.extracted_text) {
      setSourceText(order.extracted_text);
      splitIntoSegments(order.extracted_text);
    }
    loadGlossary();
  }, [order]);

  const splitIntoSegments = (text) => {
    const sentences = text.split(/(?<=[.!?])\s+/);
    setSegments(sentences.map((sentence, index) => ({
      id: index,
      source: sentence.trim(),
      translation: '',
      status: 'pending',
      locked: false
    })));
  };

  const loadGlossary = async () => {
    try {
      const response = await axios.get(`${API}/admin/glossary?admin_key=${adminKey}&from=${order?.translate_from}&to=${order?.translate_to}`);
      setGlossary(response.data.terms || []);
    } catch (err) {
      // Mock glossary
      setGlossary([
        { source: 'birth certificate', target: 'certidão de nascimento', notes: 'Official document' },
        { source: 'notarized', target: 'autenticado', notes: 'Legal term' },
        { source: 'sworn translation', target: 'tradução juramentada', notes: 'Certified translation' }
      ]);
    }
  };

  const runOCR = async () => {
    setIsProcessing(true);
    try {
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      const sampleText = `BIRTH CERTIFICATE

This is to certify that John Doe was born on January 15, 1990, in New York City, New York, United States of America.

Parents:
Father: Robert Doe
Mother: Mary Jane Doe (née Smith)

This document is a true copy of the original record on file.

Issued by the Department of Health
Date: March 1, 2024

[Official Seal]
Registrar's Signature`;

      setSourceText(sampleText);
      splitIntoSegments(sampleText);
      setActiveStep('review');
    } catch (err) {
      console.error('OCR failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const translateWithAI = async (segment) => {
    setIsProcessing(true);
    setSelectedSegment(segment.id);
    setShowAI(true);

    try {
      // Simulate AI translation
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock AI response based on source language
      const translations = {
        'BIRTH CERTIFICATE': 'CERTIDÃO DE NASCIMENTO',
        'This is to certify': 'Certificamos que',
        'was born on': 'nasceu em',
        'Parents:': 'Filiação:',
        'Father:': 'Pai:',
        'Mother:': 'Mãe:',
        'This document is a true copy': 'Este documento é uma cópia fiel',
        'Issued by': 'Emitido por',
        'Department of Health': 'Departamento de Saúde',
        'Official Seal': 'Selo Oficial',
        "Registrar's Signature": 'Assinatura do Registrador'
      };

      let suggestion = segment.source;
      Object.entries(translations).forEach(([eng, port]) => {
        suggestion = suggestion.replace(eng, port);
      });

      setAiSuggestion(suggestion);
    } catch (err) {
      console.error('AI translation failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyAISuggestion = () => {
    if (selectedSegment !== null) {
      const updatedSegments = segments.map(seg =>
        seg.id === selectedSegment
          ? { ...seg, translation: aiSuggestion, status: 'translated' }
          : seg
      );
      setSegments(updatedSegments);
      setShowAI(false);
      setAiSuggestion('');
      setSelectedSegment(null);
    }
  };

  const updateSegmentTranslation = (segmentId, translation) => {
    const updatedSegments = segments.map(seg =>
      seg.id === segmentId
        ? { ...seg, translation, status: translation ? 'translated' : 'pending' }
        : seg
    );
    setSegments(updatedSegments);
  };

  const approveAllSegments = () => {
    const updatedSegments = segments.map(seg => ({ ...seg, status: 'approved', locked: true }));
    setSegments(updatedSegments);
    setActiveStep('export');
  };

  const exportTranslation = async () => {
    const finalTranslation = segments.map(s => s.translation).join('\n\n');
    setTranslatedText(finalTranslation);

    try {
      // Upload translation to order
      await axios.post(`${API}/admin/orders/${order.id}/upload-translation?admin_key=${adminKey}`, {
        translated_text: finalTranslation,
        filename: `translation_${order.order_number}.txt`
      });

      // Update order status to review
      await axios.put(`${API}/admin/orders/${order.id}?admin_key=${adminKey}`, {
        translation_status: 'review'
      });

      alert('Translation exported and order updated to Review status!');
    } catch (err) {
      console.error('Export failed:', err);
      // Still show the translation even if API fails
    }
  };

  const progress = Math.round((segments.filter(s => s.status !== 'pending').length / Math.max(segments.length, 1)) * 100);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Translation Workspace</h1>
              <p className="text-sm text-gray-500">Order #{order?.order_number} | {LANGUAGES[order?.translate_from]?.flag} → {LANGUAGES[order?.translate_to]?.flag}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-500">Progress:</span>
              <span className="ml-2 font-bold text-teal-600">{progress}%</span>
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div className="bg-teal-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-3 flex items-center space-x-2 border-t bg-gray-50">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeStep === step.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{step.icon}</span>
                {step.name}
              </button>
              {index < steps.length - 1 && (
                <span className="text-gray-300">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* OCR Step */}
        {activeStep === 'ocr' && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Document OCR</h2>
            <p className="text-gray-600 mb-6">Extract text from the uploaded document using OCR technology</p>

            {order?.document_filename && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg inline-block">
                <span className="text-gray-500">Document:</span>
                <span className="ml-2 font-medium">{order.document_filename}</span>
              </div>
            )}

            <button
              onClick={runOCR}
              disabled={isProcessing}
              className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 font-semibold"
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span>
                  Processing OCR...
                </span>
              ) : (
                '🔍 Run OCR'
              )}
            </button>
          </div>
        )}

        {/* Review Step */}
        {activeStep === 'review' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Review Source Text</h2>
              <button
                onClick={() => setActiveStep('translate')}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Continue to Translation →
              </button>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <pre className="whitespace-pre-wrap font-sans text-gray-800">{sourceText}</pre>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              {segments.length} segments detected
            </div>
          </div>
        )}

        {/* Translate Step */}
        {activeStep === 'translate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Panel */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-bold text-gray-800">
                  {LANGUAGES[order?.translate_from]?.flag} Source ({LANGUAGES[order?.translate_from]?.name})
                </h2>
                <button
                  onClick={() => setShowGlossary(!showGlossary)}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200"
                >
                  📚 Glossary
                </button>
              </div>
              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSegment === segment.id
                        ? 'border-teal-500 bg-teal-50'
                        : segment.status === 'approved'
                        ? 'border-green-300 bg-green-50'
                        : segment.status === 'translated'
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSegment(segment.id)}
                  >
                    <div className="text-sm text-gray-800">{segment.source}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        segment.status === 'approved' ? 'bg-green-100 text-green-700' :
                        segment.status === 'translated' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {segment.status}
                      </span>
                      {!segment.locked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            translateWithAI(segment);
                          }}
                          className="text-xs text-purple-600 hover:text-purple-800"
                        >
                          🤖 AI Translate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Translation Panel */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-bold text-gray-800">
                  {LANGUAGES[order?.translate_to]?.flag} Translation ({LANGUAGES[order?.translate_to]?.name})
                </h2>
                <button
                  onClick={() => setActiveStep('approval')}
                  className="px-3 py-1 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
                >
                  Review All →
                </button>
              </div>
              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={`p-3 rounded-lg border ${
                      selectedSegment === segment.id ? 'border-teal-500' : 'border-gray-200'
                    }`}
                  >
                    <textarea
                      value={segment.translation}
                      onChange={(e) => updateSegmentTranslation(segment.id, e.target.value)}
                      disabled={segment.locked}
                      placeholder="Enter translation..."
                      className="w-full min-h-[60px] text-sm border-0 focus:ring-0 resize-none bg-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Approval Step */}
        {activeStep === 'approval' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Review & Approve Translation</h2>
              <button
                onClick={approveAllSegments}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ✅ Approve All
              </button>
            </div>

            <div className="space-y-4">
              {segments.map((segment) => (
                <div key={segment.id} className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Source</div>
                    <div className="text-sm">{segment.source}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Translation</div>
                    <div className="text-sm">{segment.translation || <span className="text-red-500">Missing translation</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Step */}
        {activeStep === 'export' && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">📤</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Export Translation</h2>
            <p className="text-gray-600 mb-6">Your translation is ready to be exported and delivered</p>

            <div className="max-w-2xl mx-auto mb-6 p-4 bg-gray-50 rounded-lg text-left">
              <div className="text-sm font-medium text-gray-500 mb-2">Preview:</div>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 max-h-64 overflow-y-auto">
                {segments.map(s => s.translation).join('\n\n')}
              </pre>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={exportTranslation}
                className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold"
              >
                📤 Export & Send to Review
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([segments.map(s => s.translation).join('\n\n')], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `translation_${order?.order_number || 'export'}.txt`;
                  a.click();
                }}
                className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
              >
                💾 Download File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Glossary Sidebar */}
      {showGlossary && (
        <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold">📚 Glossary</h3>
            <button onClick={() => setShowGlossary(false)} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-60px)]">
            {glossary.map((term, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-sm">{term.source}</div>
                <div className="text-teal-600 text-sm">→ {term.target}</div>
                {term.notes && <div className="text-xs text-gray-500 mt-1">{term.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestion Modal */}
      {showAI && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-2">🤖</span>
              <h2 className="text-xl font-bold">AI Translation Suggestion</h2>
            </div>

            {isProcessing ? (
              <div className="text-center py-8">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Generating translation...</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-purple-50 rounded-lg mb-4">
                  <div className="text-sm text-purple-600 mb-1">Suggested translation:</div>
                  <div className="text-gray-800">{aiSuggestion}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAI(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyAISuggestion}
                    className="flex-1 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    Apply Suggestion
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== GLOSSARY MANAGEMENT ====================
const GlossaryManagement = ({ adminKey }) => {
  const [glossaries, setGlossaries] = useState([]);
  const [selectedGlossary, setSelectedGlossary] = useState(null);
  const [terms, setTerms] = useState([]);
  const [showAddTerm, setShowAddTerm] = useState(false);
  const [newTerm, setNewTerm] = useState({ source: '', target: '', notes: '' });

  useEffect(() => {
    // Mock glossaries
    setGlossaries([
      { id: '1', name: 'Legal Terms', from: 'english', to: 'portuguese', terms_count: 150 },
      { id: '2', name: 'Medical Terms', from: 'english', to: 'spanish', terms_count: 200 },
      { id: '3', name: 'Business Terms', from: 'english', to: 'french', terms_count: 100 }
    ]);
  }, []);

  const selectGlossary = (glossary) => {
    setSelectedGlossary(glossary);
    // Mock terms
    setTerms([
      { id: '1', source: 'affidavit', target: 'declaração juramentada', notes: 'Legal document' },
      { id: '2', source: 'notary public', target: 'tabelião', notes: 'Official who can certify documents' },
      { id: '3', source: 'power of attorney', target: 'procuração', notes: 'Legal authorization' }
    ]);
  };

  const addTerm = () => {
    setTerms([...terms, { ...newTerm, id: Date.now().toString() }]);
    setNewTerm({ source: '', target: '', notes: '' });
    setShowAddTerm(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Glossary Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Glossary List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-bold text-gray-800">Glossaries</h2>
          </div>
          <div className="p-4 space-y-2">
            {glossaries.map((glossary) => (
              <button
                key={glossary.id}
                onClick={() => selectGlossary(glossary)}
                className={`w-full p-4 rounded-lg text-left transition-colors ${
                  selectedGlossary?.id === glossary.id
                    ? 'bg-teal-50 border-2 border-teal-500'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="font-medium">{glossary.name}</div>
                <div className="text-sm text-gray-500">
                  {LANGUAGES[glossary.from]?.flag} → {LANGUAGES[glossary.to]?.flag} | {glossary.terms_count} terms
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Terms List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-bold text-gray-800">
              {selectedGlossary ? selectedGlossary.name : 'Select a Glossary'}
            </h2>
            {selectedGlossary && (
              <button
                onClick={() => setShowAddTerm(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
              >
                + Add Term
              </button>
            )}
          </div>

          {selectedGlossary ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {terms.map((term) => (
                    <tr key={term.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{term.source}</td>
                      <td className="px-6 py-4 text-teal-600">{term.target}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{term.notes}</td>
                      <td className="px-6 py-4">
                        <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="text-4xl mb-4">📚</div>
              <p>Select a glossary to view and manage terms</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Term Modal */}
      {showAddTerm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add New Term</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Term</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={newTerm.source}
                  onChange={(e) => setNewTerm({...newTerm, source: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Translation</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={newTerm.target}
                  onChange={(e) => setNewTerm({...newTerm, target: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={newTerm.notes}
                  onChange={(e) => setNewTerm({...newTerm, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddTerm(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={addTerm}
                className="flex-1 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Add Term
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== SETTINGS ====================
const SettingsPage = ({ adminKey }) => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">API Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Backend URL</label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                value={BACKEND_URL}
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Key</label>
              <input
                type="password"
                className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                value={adminKey}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Pricing Configuration</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span>Certified Translation</span>
              <span className="font-bold text-teal-600">$24.99/page</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span>Professional Translation</span>
              <span className="font-bold text-teal-600">$19.50/page</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span>Priority Fee</span>
              <span className="font-bold text-orange-600">+25%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span>Urgent Fee</span>
              <span className="font-bold text-red-600">+100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN ADMIN APP ====================
function AdminApp() {
  const [adminKey, setAdminKey] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Check for saved session
  useEffect(() => {
    const savedAdminKey = localStorage.getItem('admin_key');
    if (savedAdminKey) {
      setAdminKey(savedAdminKey);
    }
  }, []);

  const handleLogin = (key) => {
    setAdminKey(key);
    localStorage.setItem('admin_key', key);
  };

  const handleLogout = () => {
    setAdminKey(null);
    localStorage.removeItem('admin_key');
  };

  const openTranslationWorkspace = (order) => {
    setSelectedOrder(order);
    setActiveTab('translator-workspace');
  };

  const renderContent = () => {
    // If in translator workspace with selected order, show that
    if (activeTab === 'translator-workspace' && selectedOrder) {
      return (
        <TranslatorWorkspace
          adminKey={adminKey}
          order={selectedOrder}
          onBack={() => {
            setSelectedOrder(null);
            setActiveTab('orders');
          }}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard adminKey={adminKey} />;
      case 'orders':
        return <OrdersManagement adminKey={adminKey} onOpenTranslation={openTranslationWorkspace} />;
      case 'translators':
        return <TranslatorsManagement adminKey={adminKey} />;
      case 'translator-workspace':
        return (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">✍️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Translation Workspace</h2>
            <p className="text-gray-600 mb-4">Select an order from the Orders tab to start translating</p>
            <button
              onClick={() => setActiveTab('orders')}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Go to Orders
            </button>
          </div>
        );
      case 'glossaries':
        return <GlossaryManagement adminKey={adminKey} />;
      case 'settings':
        return <SettingsPage adminKey={adminKey} />;
      default:
        return <Dashboard adminKey={adminKey} />;
    }
  };

  if (!adminKey) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  // Full screen for translator workspace
  if (activeTab === 'translator-workspace' && selectedOrder) {
    return renderContent();
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'translator-workspace') {
            setSelectedOrder(null);
          }
          setActiveTab(tab);
        }}
        onLogout={handleLogout}
      />
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}

export default AdminApp;
