import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

// Translation Program URL (external)
const TRANSLATION_PROGRAM_URL = 'https://translation-program-c0dnb4idq-beatriz-paivas-projects.vercel.app';

// ==================== CONSTANTS ====================
const STATUS_COLORS = {
  'Quote': 'bg-gray-100 text-gray-700',
  'Confirmed': 'bg-blue-100 text-blue-700',
  'In progress': 'bg-yellow-100 text-yellow-700',
  'Completed': 'bg-green-100 text-green-700',
  'Client Review': 'bg-purple-100 text-purple-700',
  'Delivered': 'bg-teal-100 text-teal-700',
  'received': 'bg-gray-100 text-gray-700',
  'in_translation': 'bg-yellow-100 text-yellow-700',
  'review': 'bg-purple-100 text-purple-700',
  'ready': 'bg-green-100 text-green-700',
  'delivered': 'bg-teal-100 text-teal-700'
};

const PAYMENT_COLORS = {
  'pending': 'bg-yellow-100 text-yellow-700',
  'paid': 'bg-green-100 text-green-700',
  'overdue': 'bg-red-100 text-red-700'
};

const FLAGS = {
  'english': '🇺🇸', 'spanish': '🇪🇸', 'french': '🇫🇷', 'german': '🇩🇪',
  'portuguese': '🇧🇷', 'italian': '🇮🇹', 'chinese': '🇨🇳', 'japanese': '🇯🇵',
  'korean': '🇰🇷', 'arabic': '🇸🇦', 'russian': '🇷🇺', 'dutch': '🇳🇱',
  'Portuguese (Brazil)': '🇧🇷', 'English (USA)': '🇺🇸', 'French': '🇫🇷',
  'Arabic (Saudi Arabia)': '🇸🇦', 'Spanish': '🇪🇸'
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-xl text-white">🔐</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-xs text-gray-500">Legacy Translations</p>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Admin Key</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin key..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {loading ? 'Verifying...' : 'Access'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/" className="text-teal-600 hover:underline text-xs">← Back to Partner Portal</a>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPACT SIDEBAR ====================
const Sidebar = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'projects', label: 'Projects', icon: '📋' },
    { id: 'translators', label: 'Translators', icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="w-48 bg-slate-800 text-white min-h-screen flex flex-col text-xs">
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center text-sm">🌐</div>
          <div>
            <div className="font-bold text-sm">Legacy Admin</div>
            <div className="text-[10px] text-slate-400">Management</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-3 py-2 text-left transition-colors ${
              activeTab === item.id
                ? 'bg-teal-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span className="mr-2">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <a
          href={TRANSLATION_PROGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center px-3 py-2 text-left text-slate-300 hover:bg-slate-700 mt-2 border-t border-slate-700 pt-2"
        >
          <span className="mr-2">✍️</span>
          <span>Translation Tool</span>
          <span className="ml-1 text-[10px]">↗</span>
        </a>
      </nav>

      <div className="p-2 border-t border-slate-700">
        <button
          onClick={onLogout}
          className="w-full py-1.5 text-red-400 hover:bg-red-900/30 rounded text-xs"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

// ==================== SEARCH BAR ====================
const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Search by name or email..."}
      className="w-64 px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 pl-8"
    />
    <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">🔍</span>
  </div>
);

// ==================== PROJECTS PAGE (Protemos Style with Legacy Data) ====================
const ProjectsPage = ({ adminKey }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/orders?admin_key=${adminKey}`);
      setOrders(response.data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}?admin_key=${adminKey}`, {
        translation_status: newStatus
      });
      fetchOrders();
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const markPaid = async (orderId) => {
    try {
      await axios.post(`${API}/admin/orders/${orderId}/mark-paid?admin_key=${adminKey}`);
      fetchOrders();
    } catch (err) {
      console.error('Failed to mark paid:', err);
    }
  };

  const deliverOrder = async (orderId) => {
    try {
      await axios.post(`${API}/admin/orders/${orderId}/deliver?admin_key=${adminKey}`);
      fetchOrders();
    } catch (err) {
      console.error('Failed to deliver:', err);
    }
  };

  // Filter orders
  const filtered = orders.filter(o => {
    const matchSearch =
      o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.client_email?.toLowerCase().includes(search.toLowerCase()) ||
      o.order_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.translation_status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate totals
  const totalReceive = filtered.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalPaid = filtered.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalPending = filtered.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + (o.total_price || 0), 0);

  // Status to Protemos-style
  const getStatusLabel = (status) => {
    const labels = {
      'received': 'Quote',
      'in_translation': 'In progress',
      'review': 'Client Review',
      'ready': 'Completed',
      'delivered': 'Delivered'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Financial Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded shadow p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Total Orders</div>
              <div className="text-xl font-bold text-gray-800">{orders.length}</div>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span>📋</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded shadow p-3 text-white">
          <div className="text-[10px] uppercase opacity-80">Total Revenue</div>
          <div className="text-xl font-bold">${totalReceive.toFixed(2)}</div>
        </div>
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded shadow p-3 text-white">
          <div className="text-[10px] uppercase opacity-80">Paid</div>
          <div className="text-xl font-bold">${totalPaid.toFixed(2)}</div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded shadow p-3 text-white">
          <div className="text-[10px] uppercase opacity-80">Pending Payment</div>
          <div className="text-xl font-bold">${totalPending.toFixed(2)}</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-bold text-blue-600">PROJECTS</h1>
          <div className="flex space-x-1">
            {['all', 'received', 'in_translation', 'review', 'ready', 'delivered'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-[10px] rounded ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s === 'all' ? 'All' : getStatusLabel(s)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <SearchBar value={search} onChange={setSearch} />
          <button className="px-3 py-1.5 border text-xs rounded hover:bg-gray-50">
            Export to Excel
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-2">
        Showing 1-{filtered.length} of {filtered.length} items.
      </p>

      {/* Protemos-style Table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-blue-600 cursor-pointer hover:bg-gray-100">Code ↕</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">Name</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">Client</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">Start at</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">Deadline at</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">Status</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">Assigned</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">Tags</th>
              <th className="px-2 py-2 text-right font-medium text-gray-600">Total, USD</th>
              <th className="px-2 py-2 text-right font-medium text-gray-600">Payment</th>
              <th className="px-2 py-2 text-center font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((order) => {
              const createdDate = new Date(order.created_at);
              const now = new Date();
              const daysAgo = Math.ceil((now - createdDate) / (1000 * 60 * 60 * 24));
              // Estimate deadline as 5 days after creation
              const deadline = new Date(createdDate);
              deadline.setDate(deadline.getDate() + 5);
              const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2">
                    <a href="#" className="text-blue-600 hover:underline font-medium">{order.order_number}</a>
                  </td>
                  <td className="px-2 py-2 font-medium max-w-[150px] truncate" title={order.client_name}>
                    {order.client_name}
                  </td>
                  <td className="px-2 py-2">
                    <a href="#" className="text-blue-600 hover:underline">{order.client_name}</a>
                    <span className="text-gray-400 text-[10px] block">{order.client_email}</span>
                  </td>
                  <td className="px-2 py-2 text-gray-500">
                    {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <span className="text-gray-400 text-[10px] block">{daysAgo}d ago</span>
                  </td>
                  <td className="px-2 py-2">
                    {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {daysUntil > 0 && order.translation_status !== 'delivered' && (
                      <span className={`text-[10px] block ${daysUntil <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>
                        in {daysUntil}d
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[order.translation_status] || 'bg-gray-100'}`}>
                      {getStatusLabel(order.translation_status)}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    {order.assigned_translator || (
                      <span className="text-gray-400 text-[10px]">Unassigned</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span className="inline-block px-1 py-0.5 bg-gray-100 border rounded text-[10px]">
                      {order.translation_type === 'certified' ? 'CERT' : 'PROF'}
                    </span>
                    <span className="ml-1 text-[10px]">{FLAGS[order.translate_to] || '🌐'}</span>
                  </td>
                  <td className="px-2 py-2 text-right font-medium">{order.total_price?.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${PAYMENT_COLORS[order.payment_status]}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {order.translation_status === 'received' && (
                        <button
                          onClick={() => updateStatus(order.id, 'in_translation')}
                          className="px-1.5 py-0.5 bg-yellow-500 text-white rounded text-[10px] hover:bg-yellow-600"
                          title="Start"
                        >
                          ▶
                        </button>
                      )}
                      {order.translation_status === 'in_translation' && (
                        <button
                          onClick={() => updateStatus(order.id, 'review')}
                          className="px-1.5 py-0.5 bg-purple-500 text-white rounded text-[10px] hover:bg-purple-600"
                          title="Review"
                        >
                          👁
                        </button>
                      )}
                      {order.translation_status === 'review' && (
                        <button
                          onClick={() => updateStatus(order.id, 'ready')}
                          className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[10px] hover:bg-green-600"
                          title="Complete"
                        >
                          ✓
                        </button>
                      )}
                      {order.translation_status === 'ready' && (
                        <button
                          onClick={() => deliverOrder(order.id)}
                          className="px-1.5 py-0.5 bg-teal-500 text-white rounded text-[10px] hover:bg-teal-600"
                          title="Deliver"
                        >
                          📤
                        </button>
                      )}
                      {order.payment_status === 'pending' && (
                        <button
                          onClick={() => markPaid(order.id)}
                          className="px-1.5 py-0.5 bg-green-600 text-white rounded text-[10px] hover:bg-green-700"
                          title="Mark Paid"
                        >
                          $
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t font-medium">
            <tr>
              <td colSpan="8" className="px-2 py-2 text-right text-gray-600">Totals:</td>
              <td className="px-2 py-2 text-right font-bold">{totalReceive.toFixed(2)}</td>
              <td colSpan="2" className="px-2 py-2 text-right text-green-600">
                Paid: ${totalPaid.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">
            No projects found
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== TRANSLATORS PAGE (Compact) ====================
const TranslatorsPage = ({ adminKey }) => {
  const [translators, setTranslators] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newTranslator, setNewTranslator] = useState({ name: '', email: '', languages: '', specialization: '' });

  useEffect(() => {
    // Mock translators - in real app, fetch from API
    setTranslators([
      { id: '1', name: 'Yasmin Costa', email: 'yasmin@legacy.com', languages: 'PT-BR, EN, ES', specialization: 'Legal, Certificates', status: 'available', orders: 89 },
      { id: '2', name: 'Noemi Santos', email: 'noemi@legacy.com', languages: 'PT-BR, EN', specialization: 'Certificates', status: 'busy', orders: 67 },
      { id: '3', name: 'Ana Clara', email: 'anaclara@legacy.com', languages: 'PT-BR, EN, FR', specialization: 'Legal, Technical', status: 'available', orders: 45 },
      { id: '4', name: 'Maria Silva', email: 'maria@legacy.com', languages: 'PT-BR, EN', specialization: 'Medical', status: 'available', orders: 32 },
    ]);
  }, []);

  const filtered = translators.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  const addTranslator = () => {
    setTranslators([...translators, { ...newTranslator, id: Date.now().toString(), status: 'available', orders: 0 }]);
    setShowAdd(false);
    setNewTranslator({ name: '', email: '', languages: '', specialization: '' });
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold text-blue-600">TRANSLATORS</h1>
        <div className="flex items-center space-x-2">
          <SearchBar value={search} onChange={setSearch} />
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            + Add Translator
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded shadow p-3 flex items-center">
          <div className="w-2 h-10 bg-blue-500 rounded mr-3"></div>
          <div>
            <div className="text-xl font-bold">{translators.length}</div>
            <div className="text-[10px] text-gray-500 uppercase">Total</div>
          </div>
        </div>
        <div className="bg-white rounded shadow p-3 flex items-center">
          <div className="w-2 h-10 bg-green-500 rounded mr-3"></div>
          <div>
            <div className="text-xl font-bold">{translators.filter(t => t.status === 'available').length}</div>
            <div className="text-[10px] text-gray-500 uppercase">Available</div>
          </div>
        </div>
        <div className="bg-white rounded shadow p-3 flex items-center">
          <div className="w-2 h-10 bg-yellow-500 rounded mr-3"></div>
          <div>
            <div className="text-xl font-bold">{translators.filter(t => t.status === 'busy').length}</div>
            <div className="text-[10px] text-gray-500 uppercase">Busy</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Languages</th>
              <th className="px-3 py-2 text-left font-medium">Specialization</th>
              <th className="px-3 py-2 text-center font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Orders</th>
              <th className="px-3 py-2 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2 text-gray-500">{t.email}</td>
                <td className="px-3 py-2">{t.languages}</td>
                <td className="px-3 py-2">{t.specialization}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{t.orders}</td>
                <td className="px-3 py-2 text-center">
                  <button className="text-blue-600 hover:underline text-[10px] mr-2">Edit</button>
                  <button className="text-red-600 hover:underline text-[10px]">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-xl w-full max-w-sm p-4">
            <h2 className="text-sm font-bold mb-3">Add New Translator</h2>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Name"
                className="w-full px-2 py-1.5 text-xs border rounded"
                value={newTranslator.name}
                onChange={(e) => setNewTranslator({...newTranslator, name: e.target.value})}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full px-2 py-1.5 text-xs border rounded"
                value={newTranslator.email}
                onChange={(e) => setNewTranslator({...newTranslator, email: e.target.value})}
              />
              <input
                type="text"
                placeholder="Languages (e.g., PT-BR, EN)"
                className="w-full px-2 py-1.5 text-xs border rounded"
                value={newTranslator.languages}
                onChange={(e) => setNewTranslator({...newTranslator, languages: e.target.value})}
              />
              <input
                type="text"
                placeholder="Specialization"
                className="w-full px-2 py-1.5 text-xs border rounded"
                value={newTranslator.specialization}
                onChange={(e) => setNewTranslator({...newTranslator, specialization: e.target.value})}
              />
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-1.5 bg-gray-100 text-gray-700 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={addTranslator}
                className="flex-1 py-1.5 bg-blue-600 text-white rounded text-xs"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== SETTINGS PAGE (Compact) ====================
const SettingsPage = ({ adminKey }) => {
  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-blue-600 mb-4">SETTINGS</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">API Configuration</h2>
          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-gray-500 mb-1">Backend URL</label>
              <input type="text" className="w-full px-2 py-1.5 border rounded bg-gray-50" value={BACKEND_URL} readOnly />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Admin Key</label>
              <input type="password" className="w-full px-2 py-1.5 border rounded bg-gray-50" value={adminKey} readOnly />
            </div>
          </div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Pricing</h2>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Certified Translation</span>
              <span className="font-bold text-teal-600">$24.99/page</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Professional Translation</span>
              <span className="font-bold text-teal-600">$19.50/page</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Priority Fee</span>
              <span className="font-bold text-orange-600">+25%</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Urgent Fee</span>
              <span className="font-bold text-red-600">+100%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Integrations</h2>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center">
                <span className="mr-2">💳</span>
                <span>Stripe</span>
              </div>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">Connected</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center">
                <span className="mr-2">📧</span>
                <span>SendGrid</span>
              </div>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">Connected</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">External Tools</h2>
          <div className="space-y-2 text-xs">
            <a
              href={TRANSLATION_PROGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 bg-blue-50 rounded hover:bg-blue-100"
            >
              <div className="flex items-center">
                <span className="mr-2">✍️</span>
                <span>Translation Program</span>
              </div>
              <span className="text-blue-600">Open ↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
function AdminApp() {
  const [adminKey, setAdminKey] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');

  useEffect(() => {
    const savedKey = localStorage.getItem('admin_key');
    if (savedKey) setAdminKey(savedKey);
  }, []);

  const handleLogin = (key) => {
    setAdminKey(key);
    localStorage.setItem('admin_key', key);
  };

  const handleLogout = () => {
    setAdminKey(null);
    localStorage.removeItem('admin_key');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return <ProjectsPage adminKey={adminKey} />;
      case 'translators':
        return <TranslatorsPage adminKey={adminKey} />;
      case 'settings':
        return <SettingsPage adminKey={adminKey} />;
      default:
        return <ProjectsPage adminKey={adminKey} />;
    }
  };

  if (!adminKey) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}

export default AdminApp;
