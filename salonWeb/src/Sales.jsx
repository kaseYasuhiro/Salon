import { useState, useEffect, useRef } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Download, Printer, RefreshCw,
  AlertTriangle, CheckCircle, FileText, Users, Scissors, X,
  Filter, ChevronLeft, ChevronRight, Footprints,
  Banknote, Smartphone,
} from 'lucide-react';
import api from '../api/axios';

// ─────────────────────────────────────────────────────────────
// Design tokens (mirrors Dashboard.jsx)
// ─────────────────────────────────────────────────────────────
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
    <div className="flex flex-col items-center justify-center text-center py-12">
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
  const Icon = type === 'success' ? CheckCircle : AlertTriangle;

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

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
function Sales() {
  const [salesData, setSalesData] = useState({
    totalRevenue: 0,
    totalAppointments: 0,
    averageRevenue: 0,
    dailyData: [],
    weeklyData: [],
    monthlyData: [],
    totalWrittenOff: 0,
    grossProfit: 0,
    netProfit: 0,
    totalExpenses: 0,
    totalCommissions: 0,
    totalWalkInRevenue: 0,
    totalWalkInCount: 0,
    totalWalkInCommissions: 0,
  });

  const [paymentBreakdown, setPaymentBreakdown] = useState({
    cash: 0,
    gcash: 0,
    other: 0,
    total: 0,
    apptTotal: 0,
    walkInTotal: 0,
    walkInCash: 0,
    walkInGcash: 0,
    walkInOther: 0,
  });

  const [paymentRows, setPaymentRows] = useState([]);
  const [paymentPage, setPaymentPage] = useState(1);

  const [profitFilter, setProfitFilter] = useState('weekly');
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isLoadingProfit, setIsLoadingProfit] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [staffList, setStaffList] = useState([]);
  const [services, setServices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [commissionsData, setCommissionsData] = useState([]);
  const [walkIns, setWalkIns] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedService, setSelectedService] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const commissionsRef = useRef([]);
  const expensesRef = useRef([]);
  const reportsRef = useRef([]);
  const walkInsRef = useRef([]);
  const servicesRef = useRef([]);
  const staffRef = useRef([]);
  const paymentsRef = useRef(new Map());

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // ============================================================
  // DATE HELPERS
  // ============================================================

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const normalizeDateStr = (dateStr) => {
    if (!dateStr && dateStr !== 0) return null;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}[T ]/.test(dateStr)) return dateStr.slice(0, 10);
    if (typeof dateStr === 'number') {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return getLocalDateString(d);
      return null;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return getLocalDateString(d);
    if (typeof dateStr === 'string' && dateStr.length >= 10) return dateStr.slice(0, 10);
    return null;
  };

  const getTodayString = () => getLocalDateString(new Date());

  const getWeekStartStr = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(start.getDate() - day);
    return getLocalDateString(start);
  };

  const getMonthKey = (dateStr) => dateStr.slice(0, 7);

  const getWeekRange = (startDate) => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDate(getLocalDateString(start))} - ${formatDate(getLocalDateString(end))}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDailyLabel = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount) =>
    parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatNumber = (num) => num.toLocaleString();

  // ============================================================
  // REVENUE HELPERS
  // ============================================================

  const groupByAppointment = (transactions) => {
    const map = new Map();

    transactions.forEach(tx => {
      const apptId = tx.appointment_id ?? tx.id;
      if (!apptId) return;

      if (!map.has(apptId)) {
        map.set(apptId, {
          appointment_id: apptId,
          id: tx.id,
          appointment_date: tx.appointment_date,
          appointment_time: tx.appointment_time,
          status: tx.status,
          assigned_employee_id: tx.assigned_employee_id,
          customer_name: tx.customer_name,
          billing_total_amount: tx.billing_total_amount != null ? parseFloat(tx.billing_total_amount) : null,
          billing_paid_amount: tx.billing_paid_amount != null ? parseFloat(tx.billing_paid_amount) : null,
          billing_balance: tx.billing_balance != null ? parseFloat(tx.billing_balance) : null,
          billing_payment_type: tx.billing_payment_type ?? null,
          services: [],
          priceSum: 0,
        });
      }

      const grouped = map.get(apptId);
      grouped.services.push({
        service_id: tx.service_id,
        service_name: tx.service_name,
        price: parseFloat(tx.price) || 0,
      });
      grouped.priceSum += parseFloat(tx.price) || 0;
    });

    return Array.from(map.values());
  };

  const getAppointmentRevenue = (appointment) => {
    if (appointment.billing_total_amount != null && appointment.billing_total_amount > 0) {
      return appointment.billing_total_amount;
    }
    return appointment.priceSum;
  };

  const getWalkInRevenue = (walkIn) => {
    if (walkIn.amount_paid != null) return parseFloat(walkIn.amount_paid) || 0;
    if (walkIn.total_amount != null) return parseFloat(walkIn.total_amount) || 0;
    if (walkIn.price != null) return parseFloat(walkIn.price) || 0;
    return 0;
  };

  const getWalkInDate = (walkIn) =>
    normalizeDateStr(walkIn.created_at || walkIn.walk_in_date || walkIn.date);

  // ============================================================
  // FETCHERS
  // ============================================================

  const fetchReports = async () => {
    try {
      const response = await api.get('/report');
      if (Array.isArray(response.data)) {
        reportsRef.current = response.data;
      }
    } catch {}
  };

  const getWrittenOffAmountForDate = (dateStr) => {
    const rows = reportsRef.current.filter(r => r.status === 'written-off' && normalizeDateStr(r.date) === dateStr);
    return rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  };

  const getWrittenOffAmountForRange = (startDate, endDate) => {
    const rows = reportsRef.current.filter(r => {
      if (r.status !== 'written-off') return false;
      const reportDate = normalizeDateStr(r.date);
      return reportDate && reportDate >= startDate && reportDate <= endDate;
    });
    return rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  };

  const fetchStaffList = async () => {
    try {
      const response = await api.get('/staff-list');
      if (Array.isArray(response.data)) {
        staffRef.current = response.data;
        setStaffList(response.data);
      }
    } catch {}
  };

  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      if (Array.isArray(response.data)) {
        servicesRef.current = response.data;
        setServices(response.data);
      }
    } catch {}
  };

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/expenses');
      if (Array.isArray(response.data)) {
        expensesRef.current = response.data;
        setExpenses(response.data);
        const total = response.data.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        setSalesData(prev => ({ ...prev, totalExpenses: total }));
      }
    } catch {}
  };

  const fetchCommissions = async () => {
    try {
      const response = await api.get('/employee/commission');
      const data = Array.isArray(response.data) ? response.data : [];
      commissionsRef.current = data;
      setCommissionsData(data);
    } catch {
      commissionsRef.current = [];
      setCommissionsData([]);
    }
  };

  const fetchWalkIns = async () => {
    try {
      const response = await api.get('/walk-in');
      const data = Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
      walkInsRef.current = data;
      setWalkIns(data);
    } catch {
      walkInsRef.current = [];
      setWalkIns([]);
    }
  };

  // ============================================================
  // PAYMENT METHOD HELPERS (appointments + walk-ins)
  // ============================================================

  const normalizePaymentMethod = (m) => {
    const v = String(m || '').toLowerCase().replace(/\s+/g, '');
    if (v.includes('gcash')) return 'gcash';
    if (v.includes('cash')) return 'cash';
    return 'other';
  };

  const fetchPayments = async () => {
    try {
      const response = await api.get('/appointment/payment');
      const rows = Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
      const map = new Map();
      rows.forEach(r => {
        const apptId = r.billing?.appointment_id ?? r.appointment_id;
        if (apptId == null || !r.payment_method) return;
        const key = String(apptId);
        if (!map.has(key)) map.set(key, new Set());
        map.get(key).add(normalizePaymentMethod(r.payment_method));
      });
      paymentsRef.current = map;
    } catch {
      paymentsRef.current = new Map();
    }
  };

  const getWalkInPaymentMethods = (w) => {
    const set = new Set();
    const add = (v) => { if (v) set.add(normalizePaymentMethod(v)); };
    add(w.walkin_payment_method);
    add(w.payment_method);
    add(w.mode_of_payment);
    if (Array.isArray(w.payment_methods)) w.payment_methods.forEach(add);
    if (Array.isArray(w.payments)) w.payments.forEach(p => add(p?.payment_method));
    return set;
  };

  const getAppointmentPaymentMethods = (appt) =>
    paymentsRef.current.get(String(appt.appointment_id)) || null;

  const tallyMethods = (methods, bucket) => {
    const hasCash = !!methods && methods.has('cash');
    const hasGcash = !!methods && methods.has('gcash');
    if (hasCash) bucket.cash += 1;
    if (hasGcash) bucket.gcash += 1;
    if (!hasCash && !hasGcash) bucket.other += 1;
  };

  const calculatePaymentBreakdown = (appointments, walkInList = []) => {
    const appt = { cash: 0, gcash: 0, other: 0 };
    const walk = { cash: 0, gcash: 0, other: 0 };

    appointments.forEach(a => tallyMethods(getAppointmentPaymentMethods(a), appt));
    walkInList.forEach(w => tallyMethods(getWalkInPaymentMethods(w), walk));

    return {
      cash: appt.cash + walk.cash,
      gcash: appt.gcash + walk.gcash,
      other: appt.other + walk.other,
      total: appointments.length + walkInList.length,
      apptTotal: appointments.length,
      walkInTotal: walkInList.length,
      walkInCash: walk.cash,
      walkInGcash: walk.gcash,
      walkInOther: walk.other,
    };
  };

  // ---------- Name helpers ----------

  const getUserFullName = (u) =>
    u ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() : '';

  const getStaffNameById = (id) => {
    if (id == null) return '';
    const s = staffRef.current.find(s => parseInt(s.id, 10) === parseInt(id, 10));
    return s?.name || '';
  };

  const getWalkInServiceNames = (w) => {
    const rel = w.services ?? w.service;
    if (Array.isArray(rel)) {
      const names = rel.map(s => s?.service_name || s?.name).filter(Boolean);
      if (names.length > 0) return names;
    } else if (rel && (rel.service_name || rel.name)) {
      return [rel.service_name || rel.name];
    }
    if (w.service_name) return [w.service_name];
    if (w.service_id != null) {
      const svc = servicesRef.current.find(s => String(s.id) === String(w.service_id));
      if (svc?.service_name) return [svc.service_name];
    }
    return [];
  };

  const getWalkInStaffName = (w) =>
    getUserFullName(w.user) || getUserFullName(w.stylist) || getStaffNameById(w.stylist_id);

  const getWalkInCustomerName = (w) =>
    w.customer_name || w.client_name || w.name || 'Walk-in Customer';

  const buildPaymentRows = (appointments, walkInList = []) => {
    const apptRows = appointments.map(appt => {
      const methods = getAppointmentPaymentMethods(appt);
      return {
        key: `appt-${appt.appointment_id}`,
        type: 'appointment',
        refLabel: `#${appt.appointment_id}`,
        sortId: Number(appt.appointment_id) || 0,
        date: normalizeDateStr(appt.appointment_date),
        customer: appt.customer_name || 'N/A',
        services: appt.services.map(s => s.service_name).filter(Boolean),
        staff: getStaffNameById(appt.assigned_employee_id),
        methods: methods ? ['cash', 'gcash', 'other'].filter(x => methods.has(x)) : [],
        amount: appt.billing_paid_amount != null
          ? appt.billing_paid_amount
          : getAppointmentRevenue(appt),
      };
    });

    const walkInRows = walkInList.map(w => {
      const methods = getWalkInPaymentMethods(w);
      return {
        key: `walkin-${w.id}`,
        type: 'walk-in',
        refLabel: `Walk-in #${w.id}`,
        sortId: Number(w.id) || 0,
        date: getWalkInDate(w),
        customer: getWalkInCustomerName(w),
        services: getWalkInServiceNames(w),
        staff: getWalkInStaffName(w),
        methods: ['cash', 'gcash', 'other'].filter(x => methods.has(x)),
        amount: getWalkInRevenue(w),
      };
    });

    return [...apptRows, ...walkInRows].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '') || b.sortId - a.sortId
    );
  };

  // ============================================================
  // COMMISSION HELPERS
  // ============================================================

  const getEmployeeCommissionRate = (employeeId) => {
    const c = commissionsRef.current.find(c => c.employee_id === employeeId);
    return c ? parseFloat(c.commission_amount) : 0;
  };

  const calculateCommissionsForGroupedAppointments = (appointments) => {
    let total = 0;
    appointments.forEach(appt => {
      const empId = appt.assigned_employee_id;
      if (!empId) return;
      const rate = getEmployeeCommissionRate(empId);
      appt.services.forEach(svc => {
        total += (svc.price || 0) * rate;
      });
    });
    return total;
  };

  const calculateCommissionsForWalkIns = (walkInList) => {
    let total = 0;
    walkInList.forEach(w => {
      const empId = w.stylist_id;
      if (!empId) return;
      const rate = getEmployeeCommissionRate(empId);
      const svcRevenue =
        w.service_revenue != null ? parseFloat(w.service_revenue) || 0
        : w.amount_paid != null ? parseFloat(w.amount_paid) || 0
        : w.total_amount != null ? parseFloat(w.total_amount) || 0
        : 0;
      total += svcRevenue * rate;
    });
    return total;
  };

  // ============================================================
  // FILTER HELPERS
  // ============================================================

  const applyStaffFilter = (appointments, staffValue) => {
    if (!staffValue || staffValue === 'all') return appointments;
    const target = parseInt(staffValue, 10);
    if (isNaN(target)) return appointments;
    return appointments.filter(appt => {
      const id = appt.assigned_employee_id;
      return id != null && parseInt(id, 10) === target;
    });
  };

  const applyWalkInStaffFilter = (list, staffValue) => {
    if (!staffValue || staffValue === 'all') return list;
    const target = parseInt(staffValue, 10);
    if (isNaN(target)) return list;
    return list.filter(w => {
      const id = w.stylist_id;
      return id != null && parseInt(id, 10) === target;
    });
  };

  const filterWalkIns = (list, startDate, endDate) => {
    if (!startDate || !endDate) return list;
    return list.filter(w => {
      const d = getWalkInDate(w);
      return d && d >= startDate && d <= endDate;
    });
  };

  // ============================================================
  // BUCKET BUILDERS
  // ============================================================

  const buildDailyBuckets = (appointments, walkInList = [], daysBack = 30, isAllStaff = true) => {
    const map = {};
    const today = new Date();
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getLocalDateString(d);
      map[key] = {
        key, date: key, label: formatDailyLabel(key),
        revenue: 0, count: 0, walkInCount: 0, writtenOff: 0, expenses: 0,
        commissions: 0, grossProfit: 0, netProfit: 0,
        appointments: [], walkIns: [],
      };
    }

    appointments.forEach(appt => {
      const dateStr = normalizeDateStr(appt.appointment_date);
      if (!dateStr) return;
      if (!map[dateStr]) {
        map[dateStr] = {
          key: dateStr, date: dateStr, label: formatDailyLabel(dateStr),
          revenue: 0, count: 0, walkInCount: 0, writtenOff: 0, expenses: 0,
          commissions: 0, grossProfit: 0, netProfit: 0,
          appointments: [], walkIns: [],
        };
      }
      map[dateStr].revenue += getAppointmentRevenue(appt);
      map[dateStr].count += 1;
      map[dateStr].appointments.push(appt);
    });

    walkInList.forEach(w => {
      const dateStr = getWalkInDate(w);
      if (!dateStr) return;
      if (!map[dateStr]) {
        map[dateStr] = {
          key: dateStr, date: dateStr, label: formatDailyLabel(dateStr),
          revenue: 0, count: 0, walkInCount: 0, writtenOff: 0, expenses: 0,
          commissions: 0, grossProfit: 0, netProfit: 0,
          appointments: [], walkIns: [],
        };
      }
      map[dateStr].revenue += getWalkInRevenue(w);
      map[dateStr].walkInCount += 1;
      map[dateStr].walkIns.push(w);
    });

    const globalExpenses = expensesRef.current.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalRevenue = appointments.reduce((s, a) => s + getAppointmentRevenue(a), 0)
      + walkInList.reduce((s, w) => s + getWalkInRevenue(w), 0);

    Object.keys(map).forEach(key => {
      const b = map[key];
      const w = getWrittenOffAmountForDate(key);
      const apptComm = calculateCommissionsForGroupedAppointments(b.appointments);
      const walkInComm = calculateCommissionsForWalkIns(b.walkIns);
      const totalComm = apptComm + walkInComm;
      const e = totalRevenue > 0 ? globalExpenses * (b.revenue / totalRevenue) : 0;
      b.writtenOff = w;
      b.commissions = totalComm;
      b.expenses = isAllStaff ? e : 0;
      b.grossProfit = b.revenue - w;
      b.netProfit = isAllStaff
        ? b.revenue - w - e - totalComm
        : b.revenue - w - totalComm;
    });

    return Object.values(map)
      .filter(b => b.count > 0 || b.walkInCount > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const buildWeeklyBuckets = (appointments, walkInList = [], weeksBack = 7, isAllStaff = true) => {
    const map = {};
    const today = new Date();

    for (let i = weeksBack - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - (i * 7));
      const ws = new Date(d);
      ws.setDate(ws.getDate() - ws.getDay());
      const key = getLocalDateString(ws);
      map[key] = {
        key, week: `Week ${weeksBack - i}`,
        weekRange: getWeekRange(key), label: getWeekRange(key),
        revenue: 0, count: 0, walkInCount: 0, writtenOff: 0, expenses: 0,
        commissions: 0, grossProfit: 0, netProfit: 0,
        appointments: [], walkIns: [],
      };
    }

    appointments.forEach(appt => {
      const dateStr = normalizeDateStr(appt.appointment_date);
      if (!dateStr) return;
      const ws = getWeekStartStr(dateStr);
      if (!map[ws]) {
        map[ws] = {
          key: ws, week: ws,
          weekRange: getWeekRange(ws), label: getWeekRange(ws),
          revenue: 0, count: 0, walkInCount: 0, writtenOff: 0, expenses: 0,
          commissions: 0, grossProfit: 0, netProfit: 0,
          appointments: [], walkIns: [],
        };
      }
      map[ws].revenue += getAppointmentRevenue(appt);
      map[ws].count += 1;
      map[ws].appointments.push(appt);
    });

    walkInList.forEach(w => {
      const dateStr = getWalkInDate(w);
      if (!dateStr) return;
      const ws = getWeekStartStr(dateStr);
      if (!map[ws]) {
        map[ws] = {
          key: ws, week: ws,
          weekRange: getWeekRange(ws), label: getWeekRange(ws),
          revenue: 0, count: 0, walkInCount: 0, writtenOff: 0, expenses: 0,
          commissions: 0, grossProfit: 0, netProfit: 0,
          appointments: [], walkIns: [],
        };
      }
      map[ws].revenue += getWalkInRevenue(w);
      map[ws].walkInCount += 1;
      map[ws].walkIns.push(w);
    });

    const globalExpenses = expensesRef.current.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalRevenue = appointments.reduce((s, a) => s + getAppointmentRevenue(a), 0)
      + walkInList.reduce((s, w) => s + getWalkInRevenue(w), 0);

    Object.keys(map).forEach(key => {
      const b = map[key];
      const we = getLocalDateString(new Date(new Date(key + 'T00:00:00').getTime() + 6 * 86400000));
      const w = getWrittenOffAmountForRange(key, we);
      const apptComm = calculateCommissionsForGroupedAppointments(b.appointments);
      const walkInComm = calculateCommissionsForWalkIns(b.walkIns);
      const totalComm = apptComm + walkInComm;
      const e = totalRevenue > 0 ? globalExpenses * (b.revenue / totalRevenue) : 0;
      b.writtenOff = w;
      b.commissions = totalComm;
      b.expenses = isAllStaff ? e : 0;
      b.grossProfit = b.revenue - w;
      b.netProfit = isAllStaff
        ? b.revenue - w - e - totalComm
        : b.revenue - w - totalComm;
    });

    return Object.values(map)
      .filter(b => b.count > 0 || b.walkInCount > 0)
      .sort((a, b) => a.key.localeCompare(b.key));
  };

  const buildMonthlyBuckets = (appointments, walkInList = [], monthsBack = 6, isAllStaff = true) => {
    const map = {};
    const today = new Date();

    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = {
        key,
        month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: 0, count: 0, walkInCount: 0, writtenOff: 0, expenses: 0,
        commissions: 0, grossProfit: 0, netProfit: 0,
        appointments: [], walkIns: [],
      };
    }

    appointments.forEach(appt => {
      const dateStr = normalizeDateStr(appt.appointment_date);
      if (!dateStr) return;
      const mk = getMonthKey(dateStr);
      if (!map[mk]) {
        const [y, m] = mk.split('-').map(Number);
        const d = new Date(y, m - 1, 1);
        map[mk] = {
          key: mk,
          month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: 0, count: 0, walkInCount: 0, writtenOff: 0, expenses: 0,
          commissions: 0, grossProfit: 0, netProfit: 0,
          appointments: [], walkIns: [],
        };
      }
      map[mk].revenue += getAppointmentRevenue(appt);
      map[mk].count += 1;
      map[mk].appointments.push(appt);
    });

    walkInList.forEach(w => {
      const dateStr = getWalkInDate(w);
      if (!dateStr) return;
      const mk = getMonthKey(dateStr);
      if (!map[mk]) {
        const [y, m] = mk.split('-').map(Number);
        const d = new Date(y, m - 1, 1);
        map[mk] = {
          key: mk,
          month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: 0, count: 0, walkInCount: 0, writtenOff: 0, expenses: 0,
          commissions: 0, grossProfit: 0, netProfit: 0,
          appointments: [], walkIns: [],
        };
      }
      map[mk].revenue += getWalkInRevenue(w);
      map[mk].walkInCount += 1;
      map[mk].walkIns.push(w);
    });

    const globalExpenses = expensesRef.current.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalRevenue = appointments.reduce((s, a) => s + getAppointmentRevenue(a), 0)
      + walkInList.reduce((s, w) => s + getWalkInRevenue(w), 0);

    Object.keys(map).forEach(key => {
      const b = map[key];
      const [year, month] = key.split('-').map(Number);
      const ms = `${key}-01`;
      const me = getLocalDateString(new Date(year, month, 0));
      const w = getWrittenOffAmountForRange(ms, me);
      const apptComm = calculateCommissionsForGroupedAppointments(b.appointments);
      const walkInComm = calculateCommissionsForWalkIns(b.walkIns);
      const totalComm = apptComm + walkInComm;
      const e = totalRevenue > 0 ? globalExpenses * (b.revenue / totalRevenue) : 0;
      b.writtenOff = w;
      b.commissions = totalComm;
      b.expenses = isAllStaff ? e : 0;
      b.grossProfit = b.revenue - w;
      b.netProfit = isAllStaff
        ? b.revenue - w - e - totalComm
        : b.revenue - w - totalComm;
    });

    return Object.values(map)
      .filter(b => b.count > 0 || b.walkInCount > 0)
      .sort((a, b) => a.key.localeCompare(b.key));
  };

  // ============================================================
  // FETCH SALES DATA
  // ============================================================

  const fetchSalesData = async (staffOverride) => {
    const activeStaff = staffOverride !== undefined ? staffOverride : selectedStaff;
    const isAllStaff = activeStaff === 'all';

    setIsLoadingSales(true);
    try {
      const response = await api.get('/all-appointments');
      if (Array.isArray(response.data)) {
        const allCompletedGrouped = groupByAppointment(
          response.data.filter(app => app.status === 'completed')
        );

        let filtered = allCompletedGrouped;
        if (dateRange.startDate && dateRange.endDate) {
          filtered = allCompletedGrouped.filter(appt => {
            const d = normalizeDateStr(appt.appointment_date);
            return d && d >= dateRange.startDate && d <= dateRange.endDate;
          });
        }

        filtered = applyStaffFilter(filtered, activeStaff);

        if (selectedService !== 'all') {
          filtered = filtered.filter(appt =>
            appt.services.some(s =>
              s.service_id === parseInt(selectedService) ||
              s.service_name === selectedService
            )
          );
        }

        const scopedWalkIns = applyWalkInStaffFilter(
          filterWalkIns(walkInsRef.current, dateRange.startDate, dateRange.endDate),
          activeStaff
        );

        const apptRevenue = filtered.reduce((s, a) => s + getAppointmentRevenue(a), 0);
        const walkInRevenue = scopedWalkIns.reduce((s, w) => s + getWalkInRevenue(w), 0);
        const totalRevenue = apptRevenue + walkInRevenue;

        const totalAppointments = filtered.length;
        const totalWalkInCount = scopedWalkIns.length;
        const averageRevenue =
          totalAppointments + totalWalkInCount > 0
            ? totalRevenue / (totalAppointments + totalWalkInCount)
            : 0;

        const totalWrittenOff = reportsRef.current
          .filter(r => r.status === 'written-off')
          .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

        const globalExpenses = expensesRef.current.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const totalExpenses = isAllStaff ? globalExpenses : 0;

        const totalApptCommissions = calculateCommissionsForGroupedAppointments(filtered);
        const totalWalkInCommissions = calculateCommissionsForWalkIns(scopedWalkIns);
        const totalCommissions = totalApptCommissions + totalWalkInCommissions;

        const grossProfit = totalRevenue - totalWrittenOff;
        const netProfit = isAllStaff
          ? grossProfit - globalExpenses - totalCommissions
          : grossProfit - totalCommissions;

        setSalesData(prev => ({
          ...prev,
          totalRevenue,
          totalAppointments,
          averageRevenue,
          dailyData: buildDailyBuckets(filtered, scopedWalkIns, 30, isAllStaff),
          weeklyData: buildWeeklyBuckets(filtered, scopedWalkIns, 7, isAllStaff),
          monthlyData: buildMonthlyBuckets(filtered, scopedWalkIns, 6, isAllStaff),
          totalWrittenOff,
          grossProfit,
          netProfit,
          totalExpenses,
          totalCommissions,
          totalWalkInRevenue: walkInRevenue,
          totalWalkInCount,
          totalWalkInCommissions,
        }));
      }
    } catch {
      showToast('Failed to fetch sales data', 'error');
    } finally {
      setIsLoadingSales(false);
    }
  };

  // ============================================================
  // FETCH PROFIT DATA
  // ============================================================

  const fetchProfitData = async (staffOverride) => {
    const activeStaff = staffOverride !== undefined ? staffOverride : selectedStaff;
    const isAllStaff = activeStaff === 'all';

    setIsLoadingProfit(true);
    try {
      const response = await api.get('/all-appointments');
      if (Array.isArray(response.data)) {
        const allCompletedGrouped = groupByAppointment(
          response.data.filter(app => app.status === 'completed')
        );

        let filtered = allCompletedGrouped;
        if (dateRange.startDate && dateRange.endDate) {
          filtered = allCompletedGrouped.filter(appt => {
            const d = normalizeDateStr(appt.appointment_date);
            return d && d >= dateRange.startDate && d <= dateRange.endDate;
          });
        }

        filtered = applyStaffFilter(filtered, activeStaff);

        const scopedWalkIns = applyWalkInStaffFilter(
          filterWalkIns(walkInsRef.current, dateRange.startDate, dateRange.endDate),
          activeStaff
        );

        setPaymentBreakdown(calculatePaymentBreakdown(filtered, scopedWalkIns));
        setPaymentRows(buildPaymentRows(filtered, scopedWalkIns));
        setPaymentPage(1);

        const apptRevenue = filtered.reduce((s, a) => s + getAppointmentRevenue(a), 0);
        const walkInRevenue = scopedWalkIns.reduce((s, w) => s + getWalkInRevenue(w), 0);
        const totalRevenue = apptRevenue + walkInRevenue;

        const totalAppointments = filtered.length;
        const totalWalkInCount = scopedWalkIns.length;

        const totalWrittenOff = reportsRef.current
          .filter(r => r.status === 'written-off')
          .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

        const globalExpenses = expensesRef.current.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const totalExpenses = isAllStaff ? globalExpenses : 0;

        const totalApptCommissions = calculateCommissionsForGroupedAppointments(filtered);
        const totalWalkInCommissions = calculateCommissionsForWalkIns(scopedWalkIns);
        const totalCommissions = totalApptCommissions + totalWalkInCommissions;

        const grossProfit = totalRevenue - totalWrittenOff;
        const netProfit = isAllStaff
          ? grossProfit - globalExpenses - totalCommissions
          : grossProfit - totalCommissions;

        let profitData = [];
        if (profitFilter === 'daily') profitData = buildDailyBuckets(filtered, scopedWalkIns, 7, isAllStaff);
        else if (profitFilter === 'weekly') profitData = buildWeeklyBuckets(filtered, scopedWalkIns, 7, isAllStaff);
        else profitData = buildMonthlyBuckets(filtered, scopedWalkIns, 6, isAllStaff);

        setSalesData(prev => ({
          ...prev,
          totalRevenue,
          totalAppointments,
          totalWrittenOff,
          grossProfit,
          netProfit,
          totalExpenses,
          totalCommissions,
          totalWalkInRevenue: walkInRevenue,
          totalWalkInCount,
          totalWalkInCommissions,
          dailyData: profitFilter === 'daily' ? profitData : prev.dailyData,
          weeklyData: profitFilter === 'weekly' ? profitData : prev.weeklyData,
          monthlyData: profitFilter === 'monthly' ? profitData : prev.monthlyData,
        }));

        setCurrentPage(1);
      }
    } catch {
      showToast('Failed to fetch profit data', 'error');
    } finally {
      setIsLoadingProfit(false);
    }
  };

  // ============================================================
  // UI HELPERS
  // ============================================================

  const getProfitData = () => {
    if (profitFilter === 'weekly') return salesData.weeklyData;
    if (profitFilter === 'monthly') return salesData.monthlyData;
    return salesData.dailyData.slice(-7);
  };

  const getSelectedStaffName = () => {
    if (selectedStaff === 'all') return 'All Staff';
    const staff = staffList.find(s => s.id === parseInt(selectedStaff));
    return staff?.name || `Staff #${selectedStaff}`;
  };

  const clearDateFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
    setShowDateFilter(false);
  };

  const resetFilters = () => {
    setProfitFilter('weekly');
    setSelectedStaff('all');
    setSelectedService('all');
    setDateRange({ startDate: '', endDate: '' });
    setShowDateFilter(false);
    setCurrentPage(1);
    showToast('Filters reset', 'success');
    fetchProfitData('all');
  };

  const handleStaffFilterChange = (value) => {
    setSelectedStaff(value);
    setCurrentPage(1);
    fetchProfitData(value);
  };

  const handleProfitFilterChange = (value) => {
    setProfitFilter(value);
    setCurrentPage(1);
    setTimeout(() => fetchProfitData(), 0);
  };

  // ============================================================
  // PAGINATION
  // ============================================================

  const allProfitData = getProfitData();
  const totalPages = Math.ceil(allProfitData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = allProfitData.slice(startIndex, startIndex + itemsPerPage);

  const paymentTotalPages = Math.ceil(paymentRows.length / itemsPerPage);
  const paymentStartIndex = (paymentPage - 1) * itemsPerPage;
  const paginatedPayments = paymentRows.slice(paymentStartIndex, paymentStartIndex + itemsPerPage);
  const paymentTotalAmount = paymentRows.reduce((sum, r) => sum + r.amount, 0);

  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };

  // ============================================================
  // FOOTER TOTALS (computed from the CURRENTLY DISPLAYED bucket set)
  // ============================================================
  // These make the "Total" row match whatever filter (daily/weekly/monthly)
  // is active, instead of always showing the all-time global totals.
  const profitTotals = allProfitData.reduce((acc, item) => {
    acc.revenue += item.revenue || 0;
    acc.count += item.count || 0;
    acc.walkInCount += item.walkInCount || 0;
    acc.writtenOff += item.writtenOff || 0;
    acc.expenses += item.expenses || 0;
    acc.commissions += item.commissions || 0;
    acc.netProfit += item.netProfit || 0;
    return acc;
  }, { revenue: 0, count: 0, walkInCount: 0, writtenOff: 0, expenses: 0, commissions: 0, netProfit: 0 });

  // ============================================================
  // EXPORTS
  // ============================================================

  const exportAsPDF = () => {
    const printContent = document.getElementById('sales-report-content');
    if (!printContent) return;

    const originalTitle = document.title;
    document.title = 'Sales Report';

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      showToast('Please allow popups to print', 'error');
      return;
    }

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: white; color: #000; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 24px; color: #000; }
        .header p { margin: 5px 0; color: #666; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section h2 { background: #f3f4f6; padding: 10px; margin: 0; font-size: 16px; border: 1px solid #d1d5db; border-bottom: none; color: #000; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #f3f4f6; font-weight: bold; padding: 8px 10px; border: 1px solid #d1d5db; text-align: left; font-size: 12px; color: #000; }
        td { padding: 6px 10px; border: 1px solid #d1d5db; font-size: 12px; color: #000; }
        .total-row { background-color: #f9fafb; font-weight: bold; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        .currency { text-align: right; color: #000; }
        .summary-box { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; flex-wrap: wrap; gap: 10px; border: 1px solid #e5e7eb; }
        .summary-item { text-align: center; min-width: 100px; }
        .summary-item .label { font-size: 12px; color: #666; }
        .summary-item .value { font-size: 16px; font-weight: bold; color: #000; }
      </style>
    `;

    const profitData = getProfitData();

    let profitRows = '';
    profitData.forEach(item => {
      const label = item.weekRange || item.month || item.label || item.date || item.week;
      profitRows += `
        <tr>
          <td>${label}</td>
          <td class="currency">₱${formatCurrency(item.revenue)}</td>
          <td class="currency">${item.count}</td>
          <td class="currency">${item.walkInCount || 0}</td>
          <td class="currency">₱${formatCurrency(item.writtenOff || 0)}</td>
          <td class="currency">₱${formatCurrency(item.expenses || 0)}</td>
          <td class="currency">₱${formatCurrency(item.commissions || 0)}</td>
          <td class="currency">₱${formatCurrency(item.netProfit || 0)}</td>
        </tr>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Sales Report</title>${styles}</head>
        <body>
          <div id="sales-report-content">
            <div class="header">
              <h1>Sales Report</h1>
              <p>Generated: ${new Date().toLocaleString()}</p>
              <p>Staff: ${getSelectedStaffName()}</p>
            </div>
            <div class="summary-box">
              <div class="summary-item"><div class="label">Total Revenue</div><div class="value">₱${formatCurrency(profitTotals.revenue)}</div></div>
              <div class="summary-item"><div class="label">Appointments</div><div class="value">${formatNumber(profitTotals.count)}</div></div>
              <div class="summary-item"><div class="label">Walk-ins</div><div class="value">${formatNumber(profitTotals.walkInCount)}</div></div>
              <div class="summary-item"><div class="label">Incidents</div><div class="value">₱${formatCurrency(profitTotals.writtenOff)}</div></div>
              <div class="summary-item"><div class="label">Total Expenses</div><div class="value">₱${formatCurrency(profitTotals.expenses)}</div></div>
              <div class="summary-item"><div class="label">Commissions</div><div class="value">₱${formatCurrency(profitTotals.commissions)}</div></div>
              <div class="summary-item"><div class="label">Net Profit</div><div class="value">₱${formatCurrency(profitTotals.netProfit)}</div></div>
            </div>
            <div class="section">
              <h2>Profit Report (${profitFilter.charAt(0).toUpperCase() + profitFilter.slice(1)})</h2>
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th style="text-align:right;">Revenue (₱)</th>
                    <th style="text-align:right;">Appointments</th>
                    <th style="text-align:right;">Walk-ins (#)</th>
                    <th style="text-align:right;">Incidents (₱)</th>
                    <th style="text-align:right;">Expenses (₱)</th>
                    <th style="text-align:right;">Commissions (₱)</th>
                    <th style="text-align:right;">Net Profit (₱)</th>
                  </tr>
                </thead>
                <tbody>
                  ${profitRows || '<tr><td colspan="8" style="text-align:center;color:#999;">No data available</td></tr>'}
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td>Total</td>
                    <td class="currency">₱${formatCurrency(profitTotals.revenue)}</td>
                    <td class="currency">${formatNumber(profitTotals.count)}</td>
                    <td class="currency">${formatNumber(profitTotals.walkInCount)}</td>
                    <td class="currency">₱${formatCurrency(profitTotals.writtenOff)}</td>
                    <td class="currency">₱${formatCurrency(profitTotals.expenses)}</td>
                    <td class="currency">₱${formatCurrency(profitTotals.commissions)}</td>
                    <td class="currency">₱${formatCurrency(profitTotals.netProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div class="footer">
              <p>This report was generated automatically. All amounts are in Philippine Pesos (₱).</p>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    document.title = originalTitle;
  };

  const downloadSalesReport = () => {
    const profitData = getProfitData();
    if (profitData.length === 0) {
      showToast('No data to download', 'error');
      return;
    }

    let csv = '';
    csv += `"SALES REPORT"\n`;
    csv += `"Generated:",${new Date().toLocaleString()}\n`;
    csv += `"Period:",${profitFilter.charAt(0).toUpperCase() + profitFilter.slice(1)}\n`;
    csv += `"Staff:",${getSelectedStaffName()}\n`;
    csv += `\n`;
    csv += `"=== SUMMARY ==="\n`;
    csv += `"Total Revenue","₱${formatCurrency(profitTotals.revenue)}"\n`;
    csv += `"Total Appointments","${formatNumber(profitTotals.count)}"\n`;
    csv += `"Total Walk-ins","${formatNumber(profitTotals.walkInCount)}"\n`;
    csv += `"Total Incidents","₱${formatCurrency(profitTotals.writtenOff)}"\n`;
    csv += `"Total Expenses","₱${formatCurrency(profitTotals.expenses)}"\n`;
    csv += `"Commissions","₱${formatCurrency(profitTotals.commissions)}"\n`;
    csv += `"Net Profit","₱${formatCurrency(profitTotals.netProfit)}"\n`;
    csv += `\n`;
    csv += `"=== PROFIT REPORT (${profitFilter.charAt(0).toUpperCase() + profitFilter.slice(1)}) ==="\n`;
    csv += `"Period","Revenue","Appointments","Walk-ins (#)","Incidents","Expenses","Commissions","Net Profit"\n`;
    profitData.forEach(item => {
      const label = item.weekRange || item.month || item.label || item.date || item.week;
      csv += `"${label}","${item.revenue}","${item.count}","${item.walkInCount || 0}","${item.writtenOff || 0}","${item.expenses || 0}","${item.commissions || 0}","${item.netProfit || 0}"\n`;
    });
    csv += `"TOTAL","${profitTotals.revenue}","${formatNumber(profitTotals.count)}","${formatNumber(profitTotals.walkInCount)}","${profitTotals.writtenOff}","${profitTotals.expenses}","${profitTotals.commissions}","${profitTotals.netProfit}"\n`;
    csv += `\n\n`;
    csv += `"Report generated on:",${new Date().toLocaleString()}\n`;
    csv += `"All amounts are in Philippine Pesos (₱)"\n`;

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${getTodayString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ============================================================
  // LIFECYCLE
  // ============================================================

  useEffect(() => {
    (async () => {
      await Promise.all([
        fetchReports(),
        fetchStaffList(),
        fetchServices(),
        fetchExpenses(),
        fetchCommissions(),
        fetchWalkIns(),
        fetchPayments(),
      ]);
      await Promise.all([fetchSalesData(), fetchProfitData()]);
    })();
  }, []);

  const handleRefresh = async () => {
    await Promise.all([
      fetchReports(),
      fetchStaffList(),
      fetchExpenses(),
      fetchCommissions(),
      fetchWalkIns(),
      fetchPayments(),
    ]);
    await Promise.all([fetchSalesData(), fetchProfitData()]);
    showToast('Data refreshed successfully!', 'success');
  };

  if (isLoadingSales && salesData.totalAppointments === 0 && salesData.totalWalkInCount === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Income Report</h2>
            <p className="text-xs text-slate-500">
              Revenue and appointment statistics{selectedStaff !== 'all' && ` — ${getSelectedStaffName()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all text-xs font-semibold"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all text-xs font-semibold"
          >
            <X size={14} />
            <span>Reset Filters</span>
          </button>
          <button
            onClick={downloadSalesReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all text-xs font-semibold"
            title="Download CSV"
          >
            <Download size={14} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={exportAsPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-sm shadow-blue-500/30 hover:shadow-md transition-all text-xs font-semibold"
            title="Export as PDF"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-slate-200/70">
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"
        >
          <Filter size={14} />
          <span>Date Range</span>
          {(dateRange.startDate || dateRange.endDate) && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
        </button>
        {(dateRange.startDate || dateRange.endDate) && (
          <span className="text-xs text-slate-500">
            {dateRange.startDate && `From: ${formatDate(dateRange.startDate)}`}
            {dateRange.startDate && dateRange.endDate && ' | '}
            {dateRange.endDate && `To: ${formatDate(dateRange.endDate)}`}
          </span>
        )}
      </div>

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
          <button onClick={clearDateFilter} className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors">
            Clear
          </button>
          <button
            onClick={() => { setShowDateFilter(false); fetchProfitData(); }}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl shadow-sm shadow-pink-500/25 hover:shadow-md transition-all"
          >
            Apply
          </button>
        </div>
      )}

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label="Total Revenue"
          value={`₱${formatCurrency(salesData.totalRevenue)}`}
          sub={`${formatNumber(salesData.totalAppointments)} appts · ${formatNumber(salesData.totalWalkInCount)} walk-ins`}
          icon={TrendingUp}
          color="from-emerald-500 to-emerald-600"
        />
        <StatCard
          label="Incidents / Write-offs"
          value={`₱${formatCurrency(salesData.totalWrittenOff)}`}
          sub="Deducted from gross"
          icon={AlertTriangle}
          color="from-amber-500 to-amber-600"
          badge={salesData.totalWrittenOff > 0 ? 'Attention' : null}
          badgeClass="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Net Profit"
          value={`₱${formatCurrency(salesData.netProfit)}`}
          sub={`Gross ₱${formatCurrency(salesData.grossProfit)} − costs`}
          icon={salesData.netProfit >= 0 ? TrendingUp : TrendingDown}
          color={salesData.netProfit >= 0 ? 'from-pink-500 to-fuchsia-600' : 'from-red-500 to-rose-600'}
        />
      </div>

      {/* Payment Methods */}
      {(() => {
        const { cash, gcash, other, total, apptTotal, walkInTotal, walkInCash, walkInGcash, walkInOther } = paymentBreakdown;
        const pct = (v) => (total > 0 ? (v / total) * 100 : 0);

        const rows = [
          { key: 'cash',  label: 'Paid with Cash',  icon: Banknote,   count: cash,  walkInCount: walkInCash,  grad: 'from-emerald-500 to-emerald-600', bar: 'bg-emerald-500' },
          { key: 'gcash', label: 'Paid with GCash', icon: Smartphone, count: gcash, walkInCount: walkInGcash, grad: 'from-blue-500 to-indigo-600',     bar: 'bg-blue-500' },
        ];
        if (other > 0) {
          rows.push({ key: 'other', label: 'No payment record', icon: FileText, count: other, walkInCount: walkInOther, grad: 'from-slate-400 to-slate-500', bar: 'bg-slate-400' });
        }
        const hasOverlap = cash + gcash + other > total;

        return (
          <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Payment Methods</h3>
                <p className="text-[11px] text-slate-500">Completed appointments + walk-ins</p>
              </div>
              <p className="text-xs text-slate-500">
                Total visits: <span className="font-bold text-slate-800">{formatNumber(total)}</span>
                <span className="text-slate-400"> ({formatNumber(apptTotal)} appts · {formatNumber(walkInTotal)} walk-ins)</span>
              </p>
            </div>

            <div className={`grid grid-cols-1 gap-4 ${rows.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              {rows.map(({ key, label, icon: Icon, count, walkInCount, grad, bar }) => (
                <div key={key} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md flex-shrink-0`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">{label}</p>
                      <p className="text-2xl font-bold text-slate-800 tracking-tight">
                        {formatNumber(count)}
                        <span className="text-xs font-medium text-slate-400 ml-1.5">
                          visit{count === 1 ? '' : 's'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${bar}`} style={{ width: `${pct(count)}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {pct(count).toFixed(1)}% of visits · {formatNumber(count - walkInCount)} appt{count - walkInCount === 1 ? '' : 's'} + {formatNumber(walkInCount)} walk-in{walkInCount === 1 ? '' : 's'}
                  </p>
                </div>
              ))}
            </div>

            {hasOverlap && (
              <p className="text-[11px] text-slate-400 mt-3">
                Visits paid with both methods (e.g. GCash downpayment + cash balance) are counted under each.
              </p>
            )}
          </section>
        );
      })()}

      <div id="sales-report-content">
        {/* Profit Report Panel */}
        <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText size={17} className="text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Profit Report</h3>
                <p className="text-[11px] text-slate-500">
                  {profitFilter.charAt(0).toUpperCase() + profitFilter.slice(1)} breakdown · {allProfitData.length} entries
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                <Users size={14} className="text-slate-400" />
                <select
                  value={selectedStaff}
                  onChange={(e) => handleStaffFilterChange(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">All Staff</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>

              <div className="inline-flex bg-slate-100 rounded-xl p-1">
                {['daily', 'weekly', 'monthly'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleProfitFilterChange(mode)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                      profitFilter === mode
                        ? 'bg-white text-pink-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoadingProfit ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : allProfitData.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No sales data available"
                subtitle="Try adjusting the date range or filters"
              />
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-slate-50/80">
                    <tr>
                      {[
                        'Period',
                        'Revenue (₱)',
                        'Appointments',
                        'Walk-ins (#)',
                        'Incidents (₱)',
                        'Costs (₱)',
                        'Commissions (₱)',
                        'Net Profit (₱)',
                      ].map((h, i) => (
                        <th
                          key={h}
                          className={`px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((item, index) => {
                      const label = item.weekRange || item.month || item.label || item.date || item.week;
                      return (
                        <tr key={index} className="hover:bg-pink-50/40 transition-colors">
                          <td className="px-4 py-3 text-xs font-semibold text-black whitespace-nowrap">{label}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-black text-right tabular-nums">{formatCurrency(item.revenue)}</td>
                          <td className="px-4 py-3 text-xs text-black text-right tabular-nums">{item.count}</td>
                          <td className="px-4 py-3 text-xs text-black text-right tabular-nums">{item.walkInCount || 0}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-black text-right tabular-nums">{formatCurrency(item.writtenOff || 0)}</td>
                          <td className="px-4 py-3 text-xs text-black text-right tabular-nums">{formatCurrency(item.expenses || 0)}</td>
                          <td className="px-4 py-3 text-xs text-black text-right tabular-nums">{formatCurrency(item.commissions || 0)}</td>
                          <td className={`px-4 py-3 text-xs font-bold text-right tabular-nums ${(item.netProfit || 0) >= 0 ? 'text-black' : 'text-red-600'}`}>
                            {formatCurrency(item.netProfit || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-xs font-bold text-black uppercase tracking-wider">Total</td>
                      <td className="px-4 py-3 text-xs font-bold text-black text-right tabular-nums">{formatCurrency(profitTotals.revenue)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-black text-right tabular-nums">{formatNumber(profitTotals.count)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-black text-right tabular-nums">{formatNumber(profitTotals.walkInCount)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-black text-right tabular-nums">{formatCurrency(profitTotals.writtenOff)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-black text-right tabular-nums">{formatCurrency(profitTotals.expenses)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-black text-right tabular-nums">{formatCurrency(profitTotals.commissions)}</td>
                      <td className={`px-4 py-3 text-xs font-bold text-right tabular-nums ${profitTotals.netProfit >= 0 ? 'text-black' : 'text-red-600'}`}>
                        {formatCurrency(profitTotals.netProfit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-100 flex-wrap gap-3">
                  <div className="text-[11px] text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold text-slate-700">{Math.min(startIndex + itemsPerPage, allProfitData.length)}</span> of{' '}
                    <span className="font-semibold text-slate-700">{allProfitData.length}</span> entries
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-slate-600 px-3 font-semibold">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Payment Details Table */}
        <section className="mt-6 bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Banknote size={17} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Payment Details</h3>
              <p className="text-[11px] text-slate-500">
                Completed appointments + walk-ins · {paymentRows.length} entries
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoadingProfit ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : paymentRows.length === 0 ? (
              <EmptyState
                icon={Banknote}
                title="No payments to show"
                subtitle="Try adjusting the date range or filters"
              />
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-slate-50/80">
                    <tr>
                      {['Type', 'Customer', 'Service', 'Staff', 'Payment Method', 'Amount (₱)'].map((h, i) => (
                        <th
                          key={h}
                          className={`px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider ${i === 5 ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPayments.map((row) => (
                      <tr key={row.key} className="hover:bg-pink-50/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.type === 'walk-in' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-50 text-cyan-700">
                              <Footprints size={11} />
                              Walk-in
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                              <Scissors size={11} />
                              Appointment
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-black">{row.customer}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px]">
                          {row.services.length === 0 ? (
                            <span className="text-[11px] text-slate-400">—</span>
                          ) : (
                            <span className="line-clamp-2" title={row.services.join(', ')}>
                              {row.services.join(', ')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                          {row.staff || <span className="text-[11px] text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {row.methods.length === 0 ? (
                            <span className="text-[11px] text-slate-400">No record</span>
                          ) : (
                            <div className="flex items-center gap-1 flex-wrap">
                              {row.methods.map((m) => (
                                <span
                                  key={m}
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    m === 'cash'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : m === 'gcash'
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {m === 'cash' ? 'Cash' : m === 'gcash' ? 'GCash' : 'Other'}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-black text-right tabular-nums">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-xs font-bold text-black uppercase tracking-wider">Total</td>
                      <td className="px-4 py-3 text-xs font-bold text-black text-right tabular-nums">
                        {formatCurrency(paymentTotalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-100 flex-wrap gap-3">
                  <div className="text-[11px] text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{paymentStartIndex + 1}</span> to{' '}
                    <span className="font-semibold text-slate-700">{Math.min(paymentStartIndex + itemsPerPage, paymentRows.length)}</span> of{' '}
                    <span className="font-semibold text-slate-700">{paymentRows.length}</span> entries
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPaymentPage(p => Math.max(1, p - 1))}
                      disabled={paymentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-slate-600 px-3 font-semibold">
                      Page {paymentPage} of {paymentTotalPages || 1}
                    </span>
                    <button
                      onClick={() => setPaymentPage(p => Math.min(paymentTotalPages, p + 1))}
                      disabled={paymentPage >= paymentTotalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Sales;