import { useState, useEffect } from 'react';
import {
  Search, Calendar, Download, Printer, CheckCircle, Clock,
  XCircle, Eye, X, User, AlertCircle, RefreshCw, Users,
} from 'lucide-react';
import api from '../api/axios';

// ─────────────────────────────────────────────────────────────
// Design tokens (mirrors Dashboard.jsx)
// ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  remitted: { pill: 'bg-pink-50 text-pink-700 border-pink-200', dot: 'bg-pink-500' },
  pending:  { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  partial:  { pill: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
};

function StatusPill({ status }) {
  const style = STATUS_STYLES[status] || { pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border capitalize ${style.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status || 'Unknown'}
    </span>
  );
}

function Panel({ title, subtitle, icon: Icon, iconClass = 'bg-pink-50 text-pink-500', action, children, className = '', bodyClassName = 'p-5' }) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(236,72,153,0.35)] transition-shadow duration-300 overflow-hidden ${className}`}>
      <header className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
        <Icon size={26} className="text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Toast({ message, type = 'success', onClose }) {
  const accent =
    type === 'success' ? { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600' } :
    type === 'warning' ? { bar: 'bg-amber-500', icon: 'bg-amber-100 text-amber-600' } :
    { bar: 'bg-red-500', icon: 'bg-red-100 text-red-600' };
  const Icon = type === 'success' ? CheckCircle : type === 'warning' ? AlertCircle : XCircle;

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

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
function Remittances() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('daily');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedRemittance, setSelectedRemittance] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [remittances, setRemittances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const normalizeRemittance = (item) => {
    const businessDate =
      item.business_schedules?.business_date ||
      item.business_schedule?.business_date ||
      item.business_date ||
      (item.created_at ? item.created_at.split('T')[0] : null);

    const relatedUser = item.user || item.users || null;
    const staffName = relatedUser
      ? `${relatedUser.first_name || ''} ${relatedUser.last_name || ''}`.trim() ||
        relatedUser.name ||
        'Unknown Staff'
      : item.remitted_by_name ||
        item.remitted_by ||
        item.employee?.name ||
        'Unknown Staff';

    const staffId =
      item.user_id ??
      relatedUser?.id ??
      item.employee_id ??
      item.remitted_by_id ??
      null;

    const amountRemitted = parseFloat(item.remittance_amount) || 0;
    const commission = parseFloat(item.commission) || 0;
    const expenses = parseFloat(item.expenses) || 0;

    const totalEarnings =
      parseFloat(item.total_earnings) ||
      amountRemitted + commission + expenses;

    let status = (item.status || '').toLowerCase();
    if (!status) {
      status = item.submitted_at || item.created_at ? 'remitted' : 'pending';
    }

    return {
      id: item.id,
      business_date: businessDate,
      remitted_by: staffName,
      remitted_by_id: staffId,
      total_earnings: totalEarnings,
      commission,
      expenses,
      amount_remitted: amountRemitted,
      status,
      services_count:
        item.services_count ||
        item.services?.length ||
        item.total_services ||
        0,
      submitted_at: item.submitted_at || item.created_at || null,
      notes: item.notes || item.remarks || '',
    };
  };

  const fetchRemittances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/remittance');
      const raw = Array.isArray(response.data) ? response.data
        : Array.isArray(response.data?.data) ? response.data.data : [];

      const normalized = raw
        .map(normalizeRemittance)
        .sort((a, b) => {
          if (!a.business_date) return 1;
          if (!b.business_date) return -1;
          return b.business_date.localeCompare(a.business_date);
        });

      setRemittances(normalized);
    } catch {
      setError('Failed to load remittance records. Please try again.');
      setRemittances([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRemittances(); }, []);

  const getPeriodStart = (period) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (period === 'daily') return now;
    if (period === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day;
      const start = new Date(now);
      start.setDate(diff);
      return start;
    }
    if (period === 'monthly') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return null;
  };

  const toDateStr = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const periodRemittances = (() => {
    const start = getPeriodStart(filterPeriod);
    if (!start) return remittances;
    const startStr = toDateStr(start);
    return remittances.filter(r => r.business_date && r.business_date >= startStr);
  })();

  const summaryStats = (() => {
    const stats = {
      totalRemitted: 0, totalEarnings: 0, totalCommission: 0, totalExpenses: 0,
      totalServices: 0, pendingCount: 0, partialCount: 0, completedCount: 0,
    };
    periodRemittances.forEach((r) => {
      stats.totalRemitted += r.amount_remitted || 0;
      stats.totalEarnings += r.total_earnings || 0;
      stats.totalCommission += r.commission || 0;
      stats.totalExpenses += r.expenses || 0;
      stats.totalServices += r.services_count || 0;
      if (r.status === 'pending') stats.pendingCount += 1;
      else if (r.status === 'partial') stats.partialCount += 1;
      else stats.completedCount += 1;
    });
    return stats;
  })();

  const filteredRemittances = periodRemittances.filter(item => {
    if (searchTerm && !item.remitted_by.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (dateRange.startDate && item.business_date < dateRange.startDate) return false;
    if (dateRange.endDate && item.business_date > dateRange.endDate) return false;
    return true;
  });

  // Use this for cards and detail modal (includes the Peso sign)
  const formatCurrencyWithSymbol = (amount) =>
    `₱${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Use this for table cells (no Peso sign, as the column header shows it)
  const formatCurrency = (amount) =>
    `${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not submitted';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  const handleViewDetails = (item) => {
    setSelectedRemittance(item);
    setShowDetailModal(true);
  };

  const periodLabel = (() => {
    if (filterPeriod === 'daily') return 'Today';
    if (filterPeriod === 'weekly') return 'This Week';
    if (filterPeriod === 'monthly') return 'This Month';
    return '';
  })();

  const DetailModal = () => {
    if (!selectedRemittance) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
          <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-4 flex items-center justify-between overflow-hidden flex-shrink-0">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">Remittance Details</h2>
                <p className="text-[11px] text-pink-100">Record #{selectedRemittance.id}</p>
              </div>
            </div>
            <button
              onClick={() => { setShowDetailModal(false); setSelectedRemittance(null); }}
              className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Staff info */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-sm">
                    <span className="text-white text-sm font-bold">
                      {selectedRemittance.remitted_by.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{selectedRemittance.remitted_by}</p>
                    <p className="text-[11px] text-slate-500">Staff Member</p>
                  </div>
                </div>
                <StatusPill status={selectedRemittance.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400">Business Date</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{formatDate(selectedRemittance.business_date)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Submitted</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{formatDateTime(selectedRemittance.submitted_at)}</p>
                </div>
              </div>
            </div>

            {/* Financial breakdown */}
            <div>
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Financial Breakdown
              </h3>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200/70">
                  <span className="text-xs text-slate-600">Total Earnings</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {formatCurrencyWithSymbol(selectedRemittance.total_earnings)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200/70">
                  <span className="text-xs text-slate-600">Commission</span>
                  <span className="text-sm font-semibold text-pink-600">
                    -{formatCurrencyWithSymbol(selectedRemittance.commission)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200/70">
                  <span className="text-xs text-slate-600">Expenses</span>
                  <span className="text-sm font-semibold text-red-600">
                    -{formatCurrencyWithSymbol(selectedRemittance.expenses)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 bg-pink-50/80 border border-pink-100 rounded-lg px-3 mt-2">
                  <span className="text-xs font-semibold text-slate-700">Amount Remitted</span>
                  <span className="text-base font-bold text-pink-700">
                    {formatCurrencyWithSymbol(selectedRemittance.amount_remitted)}
                  </span>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Services Completed</span>
                <span className="font-semibold text-slate-800">{selectedRemittance.services_count}</span>
              </div>
            </div>

            {/* Notes */}
            {selectedRemittance.notes && (
              <div className="rounded-xl border border-pink-100 bg-pink-50/70 p-3">
                <p className="text-[10px] text-slate-500 mb-1">Notes:</p>
                <p className="text-xs text-slate-700 italic">"{selectedRemittance.notes}"</p>
              </div>
            )}

            <button
              onClick={() => { setShowDetailModal(false); setSelectedRemittance(null); }}
              className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg transition-all text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}

      {/* Period toggle + label */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex bg-slate-100 rounded-xl p-1">
          {[
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilterPeriod(opt.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterPeriod === opt.key ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500">
          Showing: <span className="font-semibold text-slate-700">{periodLabel}</span>
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Remitted"
          value={formatCurrencyWithSymbol(summaryStats.totalRemitted)}
          sub={periodLabel}
          icon={CheckCircle}
          color="from-pink-500 to-fuchsia-600"
        />
        <StatCard
          label="Total Earnings"
          value={formatCurrencyWithSymbol(summaryStats.totalEarnings)}
          sub={`${summaryStats.totalServices} services`}
          icon={Users}
          color="from-blue-500 to-indigo-600"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by staff name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent w-52 transition-all"
            />
          </div>

          <div className="inline-flex bg-slate-100 rounded-xl p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'remitted', label: 'Remitted' },
              { key: 'pending', label: 'Pending' },
              { key: 'partial', label: 'Partial' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === key ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"
          >
            <Calendar size={14} />
            <span>Date Range</span>
            {(dateRange.startDate || dateRange.endDate) && <span className="w-1.5 h-1.5 bg-pink-500 rounded-full" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast('CSV export coming soon', 'warning')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all text-xs font-semibold"
          >
            <Download size={14} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={() => showToast('Print coming soon', 'warning')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-sm shadow-pink-500/30 hover:shadow-md transition-all text-xs font-semibold"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Date filter panel */}
      {showDateFilter && (
        <div className="flex items-center gap-3 p-4 bg-slate-50/60 rounded-2xl border border-slate-200 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">From:</span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">To:</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <button
            onClick={() => { setDateRange({ startDate: '', endDate: '' }); setShowDateFilter(false); }}
            className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <Panel
        title="Remittance Records"
        subtitle={
          filterPeriod === 'daily' ? 'Daily remittance submissions from staff'
            : filterPeriod === 'weekly' ? 'Weekly remittance submissions from staff'
              : 'Monthly remittance submissions from staff'
        }
        icon={Calendar}
        iconClass="bg-pink-50 text-pink-500"
        bodyClassName=""
        action={
          <button
            onClick={fetchRemittances}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-all"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80">
              <tr>
                {['Business Date', 'Remitted By', 'Remitted (₱)', 'Status'].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider ${
                    h === 'Remitted (₱)' ? 'text-right' : ''
                  }`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs text-slate-500">Loading remittances...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="4" className="px-4 py-10">
                    <EmptyState
                      icon={AlertCircle}
                      title="Failed to load remittances"
                      subtitle={error}
                      action={
                        <button
                          onClick={fetchRemittances}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-sm shadow-pink-500/30 hover:shadow-md transition-all text-xs font-semibold"
                        >
                          <RefreshCw size={12} />
                          Try Again
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : filteredRemittances.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-10">
                    <EmptyState
                      icon={Calendar}
                      title="No remittance records found"
                      subtitle={`No records for ${periodLabel.toLowerCase()}. Try a different period or adjust your filters.`}
                    />
                  </td>
                </tr>
              ) : (
                filteredRemittances.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleViewDetails(item)}
                    className="hover:bg-pink-50/40 transition-colors duration-200 group cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center flex-shrink-0">
                          <Calendar size={12} className="text-pink-600" />
                        </div>
                        <span className="text-xs font-semibold text-slate-800">
                          {formatDate(item.business_date)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold shadow-sm group-hover:scale-110 transition-transform">
                          {item.remitted_by.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-xs font-semibold text-slate-800">{item.remitted_by}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-bold text-pink-700">
                        {formatCurrency(item.amount_remitted)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <StatusPill status={item.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] text-slate-500">
            Showing {filteredRemittances.length} of {periodRemittances.length} remittances ({periodLabel})
          </p>
          <div className="flex gap-1.5">
            <button className="px-2 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50" disabled>
              Prev
            </button>
            <button className="px-2.5 py-1 text-xs bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg shadow-sm shadow-pink-500/30">
              1
            </button>
            <button className="px-2 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Next
            </button>
          </div>
        </div>
      </Panel>

      {showDetailModal && <DetailModal />}
    </div>
  );
}

export default Remittances;