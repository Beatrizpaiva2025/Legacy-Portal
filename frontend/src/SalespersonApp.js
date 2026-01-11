import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || '';

// ==================== SALESPERSON LOGIN ====================
const SalespersonLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const res = await fetch(`${API_URL}/salesperson/login`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('salesperson_token', data.token);
        localStorage.setItem('salesperson', JSON.stringify(data.salesperson));
        onLogin(data.token, data.salesperson);
      } else {
        setError(data.detail || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💼</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Sales Portal</h1>
          <p className="text-gray-500 mt-2">Legacy Translation Services</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account? Contact your administrator.
        </p>
      </div>
    </div>
  );
};

// ==================== SET PASSWORD PAGE (from invite) ====================
const SetPasswordPage = ({ inviteToken, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('invite_token', inviteToken);
      formData.append('password', password);

      const res = await fetch(`${API_URL}/salesperson/set-password`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('salesperson_token', data.token);
        localStorage.setItem('salesperson', JSON.stringify(data.salesperson));
        onSuccess(data.token, data.salesperson);
      } else {
        setError(data.detail || 'Failed to set password');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome to the Team!</h1>
          <p className="text-gray-500 mt-2">Set up your password to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Min. 6 characters"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Confirm your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==================== MAIN SALESPERSON PORTAL ====================
const SalespersonPortal = ({ token, salesperson, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [commissionInfo, setCommissionInfo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState({ payments: [], paid_acquisitions: [], total_paid: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRegisterPartner, setShowRegisterPartner] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Register partner form
  const [newPartner, setNewPartner] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    partner_tier: 'bronze',
    notes: ''
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(null);
  const [registerError, setRegisterError] = useState('');

  useEffect(() => {
    fetchDashboard();
    fetchCommissionInfo();
    fetchNotifications();
    fetchPaymentHistory();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/salesperson/dashboard`, {
        headers: { 'salesperson-token': token }
      });
      if (res.ok) {
        setDashboard(await res.json());
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    }
    setLoading(false);
  };

  const fetchCommissionInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/salesperson/commission-info`, {
        headers: { 'salesperson-token': token }
      });
      if (res.ok) {
        setCommissionInfo(await res.json());
      }
    } catch (err) {
      console.error('Error fetching commission info:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/salesperson/notifications`, {
        headers: { 'salesperson-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount((data.notifications || []).filter(n => !n.read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/salesperson/payment-history`, {
        headers: { 'salesperson-token': token }
      });
      if (res.ok) {
        setPaymentHistory(await res.json());
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API_URL}/salesperson/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'salesperson-token': token }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch(`${API_URL}/salesperson/notifications/read-all`, {
        method: 'PUT',
        headers: { 'salesperson-token': token }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleRegisterPartner = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess(null);

    try {
      const formData = new FormData();
      Object.entries(newPartner).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const res = await fetch(`${API_URL}/salesperson/register-partner`, {
        method: 'POST',
        headers: { 'salesperson-token': token },
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRegisterSuccess(data);
        setNewPartner({
          company_name: '',
          contact_name: '',
          email: '',
          phone: '',
          partner_tier: 'bronze',
          notes: ''
        });
        fetchDashboard(); // Refresh stats
        setTimeout(() => {
          setShowRegisterPartner(false);
          setRegisterSuccess(null);
        }, 3000);
      } else {
        setRegisterError(data.detail || 'Failed to register partner');
      }
    } catch (err) {
      setRegisterError('Connection error. Please try again.');
    }
    setRegisterLoading(false);
  };

  const tierColors = {
    bronze: 'bg-amber-500',
    silver: 'bg-gray-400',
    gold: 'bg-yellow-500',
    platinum: 'bg-purple-500'
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💼</span>
            <div>
              <h1 className="text-xl font-bold">Portal do Vendedor</h1>
              <p className="text-indigo-200 text-sm">Legacy Translation Services</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors relative"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b flex justify-between items-center">
                    <h4 className="font-semibold text-gray-800">Notificações</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  {notifications.length > 0 ? (
                    <div className="divide-y">
                      {notifications.slice(0, 10).map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => !notif.read && markNotificationRead(notif.id)}
                          className={`p-3 cursor-pointer hover:bg-gray-50 ${!notif.read ? 'bg-indigo-50' : ''}`}
                        >
                          <div className="flex gap-3">
                            <span className="text-2xl">
                              {notif.type === 'commission_approved' ? '✅' : notif.type === 'commission_paid' ? '💰' : '🔔'}
                            </span>
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{notif.title}</p>
                              <p className="text-xs text-gray-500">{notif.message}</p>
                              {notif.amount > 0 && (
                                <p className="text-sm font-semibold text-green-600 mt-1">${notif.amount}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(notif.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-400">
                      <p className="text-3xl mb-2">🔔</p>
                      <p className="text-sm">Nenhuma notificação</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="font-medium">{salesperson.name}</p>
              <p className="text-indigo-200 text-sm">{salesperson.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'register', label: 'Registrar Parceiro', icon: '➕' },
              { id: 'commissions', label: 'Minhas Comissões', icon: '💰' },
              { id: 'payments', label: 'Histórico de Pagamentos', icon: '📜' },
              { id: 'howto', label: 'Como Funciona', icon: '📖' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 font-medium transition-colors rounded-t-lg whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gray-100 text-indigo-600'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-indigo-500">
                <p className="text-gray-500 text-sm">This Month</p>
                <p className="text-3xl font-bold text-indigo-600">{dashboard.stats.month_acquisitions}</p>
                <p className="text-xs text-gray-400">partners registered</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
                <p className="text-gray-500 text-sm">Pending Commission</p>
                <p className="text-3xl font-bold text-green-600">${dashboard.stats.pending_commission}</p>
                <p className="text-xs text-gray-400">awaiting payment</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
                <p className="text-gray-500 text-sm">Total Earned</p>
                <p className="text-3xl font-bold text-purple-600">${dashboard.stats.total_paid}</p>
                <p className="text-xs text-gray-400">all time</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-500">
                <p className="text-gray-500 text-sm">Total Partners</p>
                <p className="text-3xl font-bold text-gray-800">{dashboard.stats.total_acquisitions}</p>
                <p className="text-xs text-gray-400">registered by you</p>
              </div>
            </div>

            {/* Goal Progress */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>🎯</span> Monthly Goal Progress
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium">{dashboard.current_goal.achieved} / {dashboard.current_goal.target} partners</span>
                  </div>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        dashboard.current_goal.achieved >= dashboard.current_goal.target
                          ? 'bg-green-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min((dashboard.current_goal.achieved / dashboard.current_goal.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {dashboard.current_goal.achieved >= dashboard.current_goal.target && (
                  <span className="text-3xl">🏆</span>
                )}
              </div>
            </div>

            {/* Recent Acquisitions */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>📋</span> Recent Registrations
              </h3>
              {dashboard.recent_acquisitions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Partner</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tier</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Commission</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recent_acquisitions.map(acq => (
                        <tr key={acq.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-600">{acq.acquisition_date}</td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-800">{acq.partner_name}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-white text-xs ${tierColors[acq.partner_tier]}`}>
                              {acq.partner_tier}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-green-600">${acq.commission_paid}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${statusColors[acq.commission_status]}`}>
                              {acq.commission_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">No registrations yet. Start by registering your first partner!</p>
              )}
            </div>
          </div>
        )}

        {/* Register Partner Tab */}
        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <span>➕</span> Register New Partner
              </h2>

              {registerSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <span className="text-5xl mb-4 block">🎉</span>
                  <h3 className="text-xl font-semibold text-green-800 mb-2">Partner Registered!</h3>
                  <p className="text-green-600 mb-4">
                    {registerSuccess.partner.company_name} has been added successfully.
                  </p>
                  <div className="bg-white rounded-lg p-4 inline-block">
                    <p className="text-sm text-gray-500">Your commission</p>
                    <p className="text-3xl font-bold text-green-600">${registerSuccess.acquisition.commission}</p>
                    <p className="text-xs text-gray-400">{registerSuccess.acquisition.tier} tier</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegisterPartner} className="space-y-5">
                  {registerError && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                      {registerError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                      <input
                        type="text"
                        value={newPartner.company_name}
                        onChange={(e) => setNewPartner({...newPartner, company_name: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="ABC Immigration Law"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                      <input
                        type="text"
                        value={newPartner.contact_name}
                        onChange={(e) => setNewPartner({...newPartner, contact_name: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="John Smith"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={newPartner.email}
                        onChange={(e) => setNewPartner({...newPartner, email: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={newPartner.phone}
                        onChange={(e) => setNewPartner({...newPartner, phone: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Partner Tier *</label>
                    <select
                      value={newPartner.partner_tier}
                      onChange={(e) => setNewPartner({...newPartner, partner_tier: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="bronze">🥉 Bronze (10-29 pages/month) - $50 commission</option>
                      <option value="silver">🥈 Silver (30-59 pages/month) - $75 commission</option>
                      <option value="gold">🥇 Gold (60-99 pages/month) - $100 commission</option>
                      <option value="platinum">💎 Platinum (100+ pages/month) - $150 commission</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={newPartner.notes}
                      onChange={(e) => setNewPartner({...newPartner, notes: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                      placeholder="Any additional notes about this partner..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                  >
                    {registerLoading ? 'Registering...' : 'Register Partner'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && dashboard && (
          <div className="space-y-6">
            {/* Monthly Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>📈</span> Monthly Earnings
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Month</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Partners</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.monthly_breakdown.map((month, idx) => (
                      <tr key={month.month} className={`border-b ${idx === dashboard.monthly_breakdown.length - 1 ? 'bg-indigo-50' : ''}`}>
                        <td className="py-3 px-4 font-medium">{month.month}</td>
                        <td className="py-3 px-4">{month.acquisitions}</td>
                        <td className="py-3 px-4 font-semibold text-green-600">${month.commission}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Commission Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                <h4 className="text-green-100 mb-2">Total Earned (All Time)</h4>
                <p className="text-4xl font-bold">${dashboard.stats.total_paid}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-6 text-white">
                <h4 className="text-yellow-100 mb-2">Pending Payment</h4>
                <p className="text-4xl font-bold">${dashboard.stats.pending_commission}</p>
                <p className="text-yellow-100 text-sm mt-2">Will be paid on the next payment cycle</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment History Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                <h4 className="text-green-100 mb-2">Total Recebido</h4>
                <p className="text-4xl font-bold">${paymentHistory.total_paid?.toFixed(2) || '0.00'}</p>
                <p className="text-green-100 text-sm mt-2">desde o início</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
                <h4 className="text-blue-100 mb-2">Pagamentos</h4>
                <p className="text-4xl font-bold">{paymentHistory.payments?.length || 0}</p>
                <p className="text-blue-100 text-sm mt-2">transações realizadas</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
                <h4 className="text-purple-100 mb-2">Parceiros Pagos</h4>
                <p className="text-4xl font-bold">{paymentHistory.paid_acquisitions?.length || 0}</p>
                <p className="text-purple-100 text-sm mt-2">comissões pagas</p>
              </div>
            </div>

            {/* Payment History Table */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>📜</span> Histórico de Pagamentos Recebidos
              </h3>
              {paymentHistory.payments?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Método</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Referência</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Parceiros</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paymentHistory.payments.map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(payment.paid_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-lg font-semibold text-green-600">${payment.total_amount?.toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                              {payment.payment_method?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{payment.payment_reference || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{payment.acquisition_ids?.length || 0} parceiros</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">📜</p>
                  <p>Nenhum pagamento recebido ainda.</p>
                  <p className="text-sm mt-2">Seus pagamentos aparecerão aqui quando forem processados.</p>
                </div>
              )}
            </div>

            {/* Paid Acquisitions Detail */}
            {paymentHistory.paid_acquisitions?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span>✅</span> Detalhamento de Comissões Pagas
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Parceiro</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tier</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Comissão</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data Aquisição</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data Pagamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paymentHistory.paid_acquisitions.map(acq => (
                        <tr key={acq.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{acq.partner_name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-white text-xs ${tierColors[acq.partner_tier]}`}>
                              {acq.partner_tier}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-green-600">${acq.commission_paid}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{acq.acquisition_date}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {acq.paid_at ? new Date(acq.paid_at).toLocaleDateString('pt-BR') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* How It Works Tab */}
        {activeTab === 'howto' && commissionInfo && (
          <div className="space-y-6">
            {/* Commission Structure */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <span>💰</span> Estrutura de Comissões
              </h2>

              {/* Your Commission Type */}
              <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-indigo-800 mb-2">Seu Tipo de Comissão:</h4>
                <p className="text-indigo-600 text-lg font-bold capitalize">
                  {commissionInfo.commission_type === 'tier' && 'Por Tier do Parceiro'}
                  {commissionInfo.commission_type === 'fixed' && `Valor Fixo: $${commissionInfo.commission_rate} por parceiro`}
                  {commissionInfo.commission_type === 'percentage' && `Percentual: ${commissionInfo.commission_rate}% das vendas`}
                </p>
                {commissionInfo.commission_type === 'percentage' && commissionInfo.percentage_commission && (
                  <p className="text-indigo-500 text-sm mt-1">{commissionInfo.percentage_commission.example}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(commissionInfo.tier_commissions).map(([tier, info]) => (
                  <div key={tier} className={`p-5 rounded-xl text-white ${tierColors[tier]}`}>
                    <h4 className="text-lg font-bold capitalize mb-2">
                      {tier === 'bronze' ? '🥉' : tier === 'silver' ? '🥈' : tier === 'gold' ? '🥇' : '💎'} {tier}
                    </h4>
                    <p className="text-white/80 text-sm mb-3">{info.pages}</p>
                    <p className="text-3xl font-bold">${info.commission}</p>
                    <p className="text-white/80 text-sm">per partner</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <span>💳</span> Payment Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-blue-50 rounded-xl">
                  <h4 className="font-semibold text-blue-800 mb-2">Payment Method</h4>
                  <p className="text-blue-600">{commissionInfo.payment_info.method}</p>
                </div>
                <div className="p-5 bg-green-50 rounded-xl">
                  <h4 className="font-semibold text-green-800 mb-2">Payment Schedule</h4>
                  <p className="text-green-600 text-sm">{commissionInfo.payment_info.schedule}</p>
                </div>
                <div className="p-5 bg-purple-50 rounded-xl">
                  <h4 className="font-semibold text-purple-800 mb-2">Minimum Payout</h4>
                  <p className="text-purple-600">${commissionInfo.payment_info.minimum_payout}</p>
                </div>
              </div>
            </div>

            {/* Bonuses */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <span>🎁</span> Bonus Opportunities
              </h2>
              <div className="space-y-4">
                {Object.entries(commissionInfo.bonuses).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <span className="text-2xl">
                      {key.includes('retention') ? '🔄' : key.includes('platinum') ? '💎' : '🎯'}
                    </span>
                    <div>
                      <h4 className="font-medium text-gray-800 capitalize">
                        {key.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-gray-600">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* How Partner Tiers Work */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <span>📖</span> How Partner Tiers Work
              </h2>
              <div className="prose max-w-none">
                <p className="text-gray-600 mb-4">
                  Partner tiers are based on their expected monthly translation volume. When you register a partner,
                  estimate their tier based on their business needs:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-amber-500 text-xl">🥉</span>
                    <div>
                      <strong>Bronze (10-29 pages/month)</strong>
                      <p className="text-gray-600 text-sm">Small businesses, individual attorneys, occasional needs</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-gray-400 text-xl">🥈</span>
                    <div>
                      <strong>Silver (30-59 pages/month)</strong>
                      <p className="text-gray-600 text-sm">Growing firms, small immigration offices, regular volume</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-yellow-500 text-xl">🥇</span>
                    <div>
                      <strong>Gold (60-99 pages/month)</strong>
                      <p className="text-gray-600 text-sm">Medium offices, accounting firms in tax season, steady volume</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-purple-500 text-xl">💎</span>
                    <div>
                      <strong>Platinum (100+ pages/month)</strong>
                      <p className="text-gray-600 text-sm">Large firms, universities, high-volume clients</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ==================== MAIN APP COMPONENT ====================
function SalespersonApp() {
  const [token, setToken] = useState(null);
  const [salesperson, setSalesperson] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);

  useEffect(() => {
    // Check for invite token in URL
    const hash = window.location.hash;
    if (hash.includes('sales-invite')) {
      const params = new URLSearchParams(hash.split('?')[1]);
      const invite = params.get('token');
      if (invite) {
        setInviteToken(invite);
        return;
      }
    }

    // Check for saved session
    const savedToken = localStorage.getItem('salesperson_token');
    const savedSalesperson = localStorage.getItem('salesperson');
    if (savedToken && savedSalesperson) {
      setToken(savedToken);
      setSalesperson(JSON.parse(savedSalesperson));
    }
  }, []);

  const handleLogin = (newToken, newSalesperson) => {
    setToken(newToken);
    setSalesperson(newSalesperson);
    setInviteToken(null);
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname + '#/sales');
  };

  const handleLogout = () => {
    localStorage.removeItem('salesperson_token');
    localStorage.removeItem('salesperson');
    setToken(null);
    setSalesperson(null);
  };

  // Show set password page if invite token
  if (inviteToken) {
    return <SetPasswordPage inviteToken={inviteToken} onSuccess={handleLogin} />;
  }

  // Show login if not authenticated
  if (!token || !salesperson) {
    return <SalespersonLogin onLogin={handleLogin} />;
  }

  // Show main portal
  return <SalespersonPortal token={token} salesperson={salesperson} onLogout={handleLogout} />;
}

export default SalespersonApp;
