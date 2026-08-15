import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Sparkles, CheckCircle2, 
  Trash2, Edit3, X, AlertCircle, RefreshCw, UserCheck, User
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { t, lang } = useI18n();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New user form state
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('WRITER');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error('Failed to load admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.createAdminUser({ username, name, email, password, role });
      alert(lang === 'en' ? 'User created successfully' : '用户创建成功');
      setShowAddModal(false);
      setUsername('');
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUserRole = async (targetUserId, newRole) => {
    try {
      await api.updateAdminUser(targetUserId, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`${lang === 'en' ? 'Delete user profile' : '确定要删除用户'}【${targetUser.name} (${targetUser.username})】?`)) return;
    try {
      await api.deleteAdminUser(targetUser.id);
      fetchUsers();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'ADMIN':
        return <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded-full flex items-center gap-1"><Shield className="w-3 h-3"/> ADMIN</span>;
      case 'REVIEWER':
        return <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1"><UserCheck className="w-3 h-3"/> REVIEWER</span>;
      case 'WRITER':
      case 'TEACHER':
        return <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3"/> CREATOR</span>;
      case 'VIEWER':
      default:
        return <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-full flex items-center gap-1"><User className="w-3 h-3"/> VIEWER</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            {t('navAdminUsers')} (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure certification team roles: ADMIN (Director), REVIEWER (Lead Auditor), CREATOR (SME), VIEWER (Auditor)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-600/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>{lang === 'en' ? 'Add New User' : '添加新用户'}</span>
          </button>

          <button
            type="button"
            onClick={fetchUsers}
            className="p-2 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">User Profile</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Active Role</th>
                <th className="px-6 py-3.5">Role Authorization</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs">
                          {u.name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">@{u.username} {isSelf && '(You)'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">{u.email}</td>
                    <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                    <td className="px-6 py-4">
                      <select
                        disabled={isSelf}
                        value={u.role}
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="REVIEWER">REVIEWER</option>
                        <option value="WRITER">WRITER</option>
                        <option value="TEACHER">TEACHER (legacy)</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-600" />
                <span>{lang === 'en' ? 'Add New User Profile' : '添加新用户'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. john_architect"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe (Lead SME)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@cert-eqms.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="WRITER">WRITER (Exam Creator / SME)</option>
                  <option value="REVIEWER">REVIEWER (Lead Auditor)</option>
                  <option value="ADMIN">ADMIN (Director)</option>
                  <option value="VIEWER">VIEWER (Auditor)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs"
                >
                  {submitting ? 'Creating...' : t('confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
