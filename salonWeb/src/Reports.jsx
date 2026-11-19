import { useState, useEffect } from 'react';
import {
  FileText, AlertCircle, CheckCircle, Clock, Eye, X,
  Search, AlertTriangle
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/auth-context';

// ─────────────────────────────────────────────────────────────
// Design tokens (mirrors Dashboard.jsx)
// ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  reported:      { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Clock },
  'written-off': { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', icon: AlertTriangle },
  resolved:      { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
};

const INCIDENT_STYLES = {
  damage:         'bg-red-50 text-red-700 border-red-200',
  inventory_loss: 'bg-orange-50 text-orange-700 border-orange-200',
  theft:          'bg-purple-50 text-purple-700 border-purple-200',
};

function StatusPill({ status }) {
  const style = STATUS_STYLES[status] || { pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border capitalize ${style.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {String(status).replace('-', ' ')}
    </span>
  );
}

function IncidentPill({ type }) {
  const style = INCIDENT_STYLES[type] || 'bg-slate-100 text-slate-600 border-slate-200';
  const label = type === 'inventory_loss' ? 'Inventory Loss' : type;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full border capitalize ${style}`}>
      {label}
    </span>
  );
}

function Panel({ title, subtitle, icon: Icon, iconClass = 'bg-pink-50 text-pink-500', action, children, className = '', bodyClassName = 'p-5' }) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(236,72,153,0.35)] transition-shadow duration-300 overflow-hidden ${className}`}>
      <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
              <Icon size={17} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, badge, badgeClass }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition-all duration-300 p-5 overflow-hidden">
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.08] bg-gradient-to-br ${color} group-hover:scale-125 transition-transform duration-500`} />
      <div className="relative flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
          <Icon size={20} className="text-white" />
        </div>
        {badge && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="relative text-xs font-medium text-slate-500 mt-4">{label}</p>
      <p className="relative text-3xl font-bold text-slate-800 mt-0.5 tracking-tight">{value}</p>
      {sub && <p className="relative text-[11px] text-slate-400 mt-2">{sub}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
        <Icon size={26} className="text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
    </div>
  );
}

function Toast({ message, type = 'success', onClose }) {
  const accent =
    type === 'success' ? { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600' } :
    type === 'warning' ? { bar: 'bg-amber-500', icon: 'bg-amber-100 text-amber-600' } :
    { bar: 'bg-red-500', icon: 'bg-red-100 text-red-600' };
  const Icon = type === 'success' ? CheckCircle : type === 'warning' ? AlertTriangle : AlertCircle;

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-100 p-3.5 pl-5 flex items-center gap-3 min-w-[300px] max-w-md overflow-hidden">
        <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${accent.bar}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${accent.icon}`}>
          <Icon size={16} />
        </div>
        <span className="text-sm font-medium text-slate-700 flex-1">{message}</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1 flex-shrink-0 transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

const inputClass =
  'w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all';

const labelClass = 'block text-xs font-semibold text-slate-700 mb-1.5';

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
function Reports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const statusOptions = ['reported', 'written-off', 'resolved'];

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/report');
      if (Array.isArray(response.data)) {
        setReports(response.data);
        setFilteredReports(response.data);
      }
    } catch (error) {
      showToast('Failed to fetch reports', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    if (!selectedReport) return;
    setIsUpdating(true);
    try {
      const report = selectedReport;
      await api.post(`/report/update/${reportId}`, {
        date: report.date,
        incident_type: report.incident_type,
        category: report.category,
        amount: report.amount,
        description: report.description,
        staff_id: report.staff_id,
        inventory_id: report.inventory_id || null,
        transaction_id: report.transaction_id || null,
        status: newStatus,
      });
      showToast(`Report status updated to ${newStatus.replace('-', ' ')} successfully!`, 'success');
      setShowModal(false);
      setSelectedReport(null);
      await fetchReports();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update report', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReportClick = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  useEffect(() => {
    let filtered = reports;
    if (filterStatus !== 'all') filtered = filtered.filter(r => r.status === filterStatus);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.description?.toLowerCase().includes(term) ||
        r.incident_type?.toLowerCase().includes(term) ||
        r.category?.toLowerCase().includes(term) ||
        r.user?.first_name?.toLowerCase().includes(term) ||
        r.user?.last_name?.toLowerCase().includes(term)
      );
    }
    setFilteredReports(filtered);
  }, [searchTerm, filterStatus, reports]);

  useEffect(() => { fetchReports(); }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount) =>
    `₱${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusIcon = (status) => {
    const cfg = STATUS_STYLES[status];
    if (!cfg) return <AlertCircle size={14} className="text-slate-500" />;
    const Icon = cfg.icon;
    return <Icon size={14} className={cfg.pill.includes('amber') ? 'text-amber-500' : cfg.pill.includes('red') ? 'text-red-500' : 'text-emerald-500'} />;
  };

  // ── Report Modal (kept inline to preserve local `selectedStatus` state) ──
  const ReportModal = () => {
    if (!selectedReport) return null;
    const [selectedStatus, setSelectedStatus] = useState(selectedReport.status);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="relative bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4 flex items-center justify-between overflow-hidden flex-shrink-0">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">Report Details</h2>
                <p className="text-[11px] text-red-100">Report #{selectedReport.id}</p>
              </div>
            </div>
            <button
              onClick={() => { setShowModal(false); setSelectedReport(null); }}
              className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Meta row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-slate-500">Submitted</p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDate(selectedReport.created_at?.split('T')[0])}
                </p>
              </div>
              <StatusPill status={selectedReport.status} />
            </div>

            {/* Reported by */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 mb-4">
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Reported By</h3>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-xs font-bold">
                    {selectedReport.user?.first_name?.charAt(0)}{selectedReport.user?.last_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedReport.user?.first_name} {selectedReport.user?.last_name}
                  </p>
                  <p className="text-[11px] text-slate-500">Staff Member</p>
                </div>
              </div>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[11px] text-slate-500">Incident Type</p>
                <p className="text-sm font-semibold text-slate-800 capitalize mt-0.5">
                  {selectedReport.incident_type === 'inventory_loss' ? 'Inventory Loss' : selectedReport.incident_type}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[11px] text-slate-500">Category</p>
                <p className="text-sm font-semibold text-slate-800 capitalize mt-0.5">{selectedReport.category}</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
                <p className="text-[11px] text-slate-500">Amount</p>
                <p className="text-sm font-bold text-red-600 mt-0.5">{formatCurrency(selectedReport.amount)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[11px] text-slate-500">Date of Incident</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{formatDate(selectedReport.date)}</p>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 mb-4">
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{selectedReport.description}</p>
            </div>

            {/* Related IDs */}
            {(selectedReport.transaction_id || selectedReport.inventory_id) && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {selectedReport.transaction_id && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <p className="text-[11px] text-slate-500">Transaction ID</p>
                    <p className="text-sm font-semibold text-blue-700 mt-0.5">#{selectedReport.transaction_id}</p>
                  </div>
                )}
                {selectedReport.inventory_id && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <p className="text-[11px] text-slate-500">Inventory ID</p>
                    <p className="text-sm font-semibold text-emerald-700 mt-0.5">#{selectedReport.inventory_id}</p>
                  </div>
                )}
              </div>
            )}

            {/* Status update */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Update Status</h3>
              <div className="inline-flex bg-slate-100 rounded-xl p-1">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                      selectedStatus === status
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {status.replace('-', ' ')}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => { setShowModal(false); setSelectedReport(null); }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedReport.id, selectedStatus)}
                  disabled={isUpdating || selectedStatus === selectedReport.status}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 rounded-xl shadow-md shadow-red-500/25 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Status'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Incident Reports</h2>
            <p className="text-xs text-slate-500">View and manage staff incident reports</p>
          </div>
        </div>
        <button
          onClick={fetchReports}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all text-xs font-semibold"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Reports"
          value={reports.length}
          sub="All incident reports"
          icon={FileText}
          color="from-pink-500 to-pink-600"
        />
        <StatCard
          label="Pending Reports"
          value={reports.filter(r => r.status === 'reported').length}
          sub="Awaiting resolution"
          icon={Clock}
          color="from-amber-500 to-amber-600"
          badge={reports.filter(r => r.status === 'reported').length > 0 ? 'Attention' : null}
          badgeClass="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Resolved Reports"
          value={reports.filter(r => r.status === 'resolved').length}
          sub="Successfully resolved"
          icon={CheckCircle}
          color="from-emerald-500 to-emerald-600"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all"
          />
        </div>
        <div className="inline-flex bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'all' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All
          </button>
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                filterStatus === status ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {status.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80">
              <tr>
                {['ID', 'Incident Type', 'Category', 'Amount', 'Reported By', 'Date', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10">
                    <EmptyState
                      icon={FileText}
                      title={reports.length === 0 ? 'No incident reports found' : 'No reports match your filters'}
                      subtitle={reports.length === 0 ? 'Reports submitted by staff will appear here' : 'Try adjusting your search or filter'}
                    />
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => handleReportClick(report)}
                    className="hover:bg-pink-50/40 transition-colors duration-200 cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700 whitespace-nowrap">#{report.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <IncidentPill type={report.incident_type} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 capitalize whitespace-nowrap">{report.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold text-red-600">{formatCurrency(report.amount)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-pink-500 to-fuchsia-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm group-hover:scale-110 transition-transform">
                          {report.user?.first_name?.charAt(0)}{report.user?.last_name?.charAt(0)}
                        </div>
                        <span className="text-xs text-slate-700">
                          {report.user?.first_name} {report.user?.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{formatDate(report.date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusPill status={report.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReportClick(report); }}
                        className="p-1.5 text-pink-600 bg-pink-50 border border-pink-100 rounded-lg hover:bg-pink-100 transition-colors"
                        title="View details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] text-slate-500">
            Showing {filteredReports.length} of {reports.length} incident reports
          </p>
        </div>
      </section>

      {showModal && <ReportModal />}
    </div>
  );
}

export default Reports;