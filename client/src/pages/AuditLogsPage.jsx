import React, { useState, useEffect } from 'react';
import { 
  History, Search, RefreshCw, Shield, Clock, 
  User, Filter, ArrowRight, Activity
} from 'lucide-react';
import { api } from '../api/client';
import { useI18n } from '../context/I18nContext';

export default function AuditLogsPage() {
  const { t, lang } = useI18n();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [keyword, setKeyword] = useState('');
  const [action, setAction] = useState('');

  const fetchLogs = async (pageToFetch = pagination.page) => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        keyword,
        action,
        page: pageToFetch,
        limit: pagination.limit
      });
      setLogs(res.logs || []);
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [action]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const getActionBadge = (act) => {
    if (act.includes('APPROVE')) return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">APPROVE</span>;
    if (act.includes('REJECT')) return <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-md">REJECT</span>;
    if (act.includes('CREATE')) return <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-md">CREATE</span>;
    if (act.includes('UPDATE')) return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-md">UPDATE</span>;
    if (act.includes('DELETE')) return <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded-md">DELETE</span>;
    return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-md">{act}</span>;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            {t('navAdminAudit')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audit log trace for exam changes, reviewer actions, version snapshots & RBAC compliance
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchLogs()}
          className="p-2 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search audit trail by actor, resource ID or details..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-slate-800 text-white font-bold rounded-xl"
          >
            {t('searchBtn')}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Filter Action:</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          >
            <option value="">All Audit Actions</option>
            <option value="CREATE_QUESTION">Create Question</option>
            <option value="UPDATE_QUESTION">Update Question</option>
            <option value="SUBMIT_REVIEW">Submit for Review</option>
            <option value="REVIEW_QUESTION">Review Question</option>
            <option value="ROLLBACK_VERSION">Rollback Version</option>
            <option value="ADD_TO_EXAM">Assign to Exam Folder</option>
            <option value="CREATE_EXAM_FOLDER">Create Exam Folder</option>
            <option value="UPDATE_USER">Update User Role</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Actor Profile</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Resource</th>
                <th className="px-6 py-3.5">Audit Log Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-6 py-3.5 text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3.5 font-sans font-bold text-slate-900">
                    @{log.username || 'system'}
                  </td>
                  <td className="px-6 py-3.5 font-sans">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                      {log.resource_type}
                    </span>
                    {log.resource_id && (
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({log.resource_id.slice(0, 8)}...)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 font-sans text-slate-700">
                    {log.details || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200 text-xs text-slate-600">
          <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} logs)</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              {t('prevPage')}
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchLogs(pagination.page + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              {t('nextPage')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
