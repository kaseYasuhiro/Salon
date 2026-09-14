import { useState, useEffect } from 'react';
import { 
  DollarSign, Search, Calendar, Download, Printer,
  TrendingUp, TrendingDown, CheckCircle, Clock,
  XCircle, Eye, X, User, AlertCircle, RefreshCw,
  BarChart3, ChevronDown, Users
} from 'lucide-react';
import api from '../api/axios';

function Remittances() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedRemittance, setSelectedRemittance] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Real data states
  const [remittances, setRemittances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalize a raw API remittance record into the shape the table expects
  const normalizeRemittance = (item) => {
    const businessDate =
      item.business_schedules?.business_date ||
      item.business_date ||
      (item.created_at ? item.created_at.split('T')[0] : null);

    const staffName =
      item.employees?.name ||
      item.employee?.name ||
      item.staff?.name ||
      item.remitted_by_name ||
      item.remitted_by ||
      'Unknown Staff';

    const staffId =
      item.employee_id ||
      item.remitted_by_id ||
      item.employees?.id ||
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

  // Fetch remittances from API
  const fetchRemittances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/remittance');
      console.log('Remittances:', response.data);

      const raw = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      const normalized = raw
        .map(normalizeRemittance)
        .sort((a, b) => {
          if (!a.business_date) return 1;
          if (!b.business_date) return -1;
          return b.business_date.localeCompare(a.business_date);
        });

      setRemittances(normalized);
    } catch (err) {
      console.error('Error fetching remittances:', err);
      setError('Failed to load remittance records. Please try again.');
      setRemittances([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRemittances();
  }, []);

  // ---- Period helpers ----
  const getPeriodStart = (period) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (period === 'daily') {
      return now;
    }

    if (period === 'weekly') {
      // Start of current week (Sunday)
      const day = now.getDay();
      const diff = now.getDate() - day;
      const start = new Date(now);
      start.setDate(diff);
      return start;
    }

    if (period === 'monthly') {
      // Start of current month
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

  // Remittances filtered by the selected period (daily/weekly/monthly)
  const periodRemittances = (() => {
    const start = getPeriodStart(filterPeriod);
    if (!start) return remittances;
    const startStr = toDateStr(start);
    return remittances.filter(r => r.business_date && r.business_date >= startStr);
  })();

  // Compute summary stats from the PERIOD-filtered data
  const summaryStats = (() => {
    const stats = {
      totalRemitted: 0,
      totalEarnings: 0,
      totalCommission: 0,
      totalExpenses: 0,
      totalServices: 0,
      pendingCount: 0,
      partialCount: 0,
      completedCount: 0,
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

  // Apply all filters (search, status, date range) on top of the period filter
  const filteredRemittances = periodRemittances.filter(item => {
    if (searchTerm && !item.remitted_by.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (dateRange.startDate && item.business_date < dateRange.startDate) return false;
    if (dateRange.endDate && item.business_date > dateRange.endDate) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'remitted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-pink-100 text-pink-700 border border-pink-200">
            <CheckCircle size={10} />
            Remitted
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
            <Clock size={10} />
            Pending
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-100 text-orange-700 border border-orange-200">
            <AlertCircle size={10} />
            Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            <XCircle size={10} />
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not submitted';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleViewDetails = (item) => {
    setSelectedRemittance(item);
    setShowDetailModal(true);
  };

  // Label for the currently selected period
  const periodLabel = (() => {
    if (filterPeriod === 'daily') return 'Today';
    if (filterPeriod === 'weekly') return 'This Week';
    if (filterPeriod === 'monthly') return 'This Month';
    return '';
  })();

  // Detail Modal
  const DetailModal = () => {
    if (!selectedRemittance) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Remittance Details</h2>
            <button 
              onClick={() => {
                setShowDetailModal(false);
                setSelectedRemittance(null);
              }}
              className="text-white hover:bg-white/20 rounded-lg p-1"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Header info */}
            <div className="bg-pink-50/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{selectedRemittance.remitted_by}</p>
                    <p className="text-[10px] text-gray-500">Staff Member</p>
                  </div>
                </div>
                {getStatusBadge(selectedRemittance.status)}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                <span className="font-semibold">Business Date:</span> {formatDate(selectedRemittance.business_date)}
              </p>
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Submitted:</span> {formatDateTime(selectedRemittance.submitted_at)}
              </p>
            </div>

            {/* Financial Breakdown */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Financial Breakdown
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Total Earnings</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {formatCurrency(selectedRemittance.total_earnings)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Commission</span>
                  <span className="text-sm font-semibold text-pink-600">
                    -{formatCurrency(selectedRemittance.commission)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Expenses</span>
                  <span className="text-sm font-semibold text-red-600">
                    -{formatCurrency(selectedRemittance.expenses)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 bg-pink-50 rounded-lg px-3 mt-2">
                  <span className="text-xs font-semibold text-gray-700">Amount Remitted</span>
                  <span className="text-base font-bold text-pink-700">
                    {formatCurrency(selectedRemittance.amount_remitted)}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-pink-50/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Services Completed</span>
                <span className="font-semibold text-gray-800">{selectedRemittance.services_count}</span>
              </div>
            </div>

            {selectedRemittance.notes && (
              <div className="bg-pink-50 rounded-lg p-3 border border-pink-100">
                <p className="text-[10px] text-gray-500 mb-1">Notes:</p>
                <p className="text-xs text-gray-700 italic">"{selectedRemittance.notes}"</p>
              </div>
            )}

            <button
              onClick={() => {
                setShowDetailModal(false);
                setSelectedRemittance(null);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium"
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
      {/* Period Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          {[
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilterPeriod(opt.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                filterPeriod === opt.key
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">
          Showing: <span className="font-semibold text-gray-700">{periodLabel}</span>
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-pink-50 p-2 rounded-lg">
              <DollarSign className="text-pink-600" size={18} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Remitted</p>
          <p className="text-xl font-bold text-pink-700 mt-0.5">
            {formatCurrency(summaryStats.totalRemitted)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">{periodLabel}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-pink-50 p-2 rounded-lg">
              <TrendingUp className="text-pink-600" size={18} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Earnings</p>
          <p className="text-xl font-bold text-pink-700 mt-0.5">
            {formatCurrency(summaryStats.totalEarnings)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {summaryStats.totalServices} services
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-pink-50 p-2 rounded-lg">
              <Users className="text-pink-600" size={18} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Commission</p>
          <p className="text-xl font-bold text-pink-700 mt-0.5">
            {formatCurrency(summaryStats.totalCommission)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Paid to staff</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-red-50 p-2 rounded-lg">
              <TrendingDown className="text-red-600" size={18} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Expenses</p>
          <p className="text-xl font-bold text-red-700 mt-0.5">
            {formatCurrency(summaryStats.totalExpenses)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">From remittances</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by staff name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 w-52"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="remitted">Remitted</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
          </select>

          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar size={14} />
            <span>Date Range</span>
            {(dateRange.startDate || dateRange.endDate) && (
              <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
            <Download size={16} />
            <span>CSV</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors">
            <Printer size={16} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Date Filter */}
      {showDateFilter && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">From:</span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">To:</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <button
            onClick={() => {
              setDateRange({ startDate: '', endDate: '' });
              setShowDateFilter(false);
            }}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Remittance Records</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {filterPeriod === 'daily' && 'Daily remittance submissions from staff'}
              {filterPeriod === 'weekly' && 'Weekly remittance submissions from staff'}
              {filterPeriod === 'monthly' && 'Monthly remittance submissions from staff'}
            </p>
          </div>
          <button 
            onClick={fetchRemittances}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-pink-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Business Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Remitted By</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Earnings</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Commission</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Expenses</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Remitted</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="w-6 h-6 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading remittances...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <AlertCircle size={40} className="text-red-300 mx-auto mb-2" />
                    <p className="text-sm text-red-500">{error}</p>
                    <button
                      onClick={fetchRemittances}
                      className="mt-3 px-3 py-1.5 text-xs bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                    >
                      Try Again
                    </button>
                  </td>
                </tr>
              ) : filteredRemittances.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <DollarSign size={40} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No remittance records found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      No records for {periodLabel.toLowerCase()}. Try a different period or adjust your filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRemittances.map((item) => (
                  <tr 
                    key={item.id}
                    className="hover:bg-pink-50/30 transition-colors duration-200"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-pink-50 p-1.5 rounded-lg">
                          <Calendar size={12} className="text-pink-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {formatDate(item.business_date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold">
                            {item.remitted_by.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-700">{item.remitted_by}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-pink-600">
                        {formatCurrency(item.total_earnings)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-orange-600">
                        -{formatCurrency(item.commission)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-red-600">
                        -{formatCurrency(item.expenses)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-pink-700">
                        {formatCurrency(item.amount_remitted)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="p-1.5 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-gray-500">
            Showing {filteredRemittances.length} of {periodRemittances.length} remittances ({periodLabel})
          </p>
          <div className="flex gap-1.5">
            <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50" disabled>
              Prev
            </button>
            <button className="px-2 py-1 text-xs bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors">
              1
            </button>
            <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && <DetailModal />}
    </div>
  );
}

export default Remittances;