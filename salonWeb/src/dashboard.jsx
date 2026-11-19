import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import echo from './echo';
import ROHSLogo from "/src/assets/ROHS Logo.png";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

import {
  Calendar, Scissors, Package, Users,
  TrendingUp, CheckCircle, Clock, XCircle,
  Eye, LogOut, Menu, X,
  User, Phone, Star, Award,
  ChevronRight, ChevronDown, Activity, PieChart as PieChartIcon,
  AlertCircle, Bell, Search, Crown,
  FileText,
  Box,
  BarChart3,
  Image as ImageIcon,
  Upload,
  CloudUpload,
  Loader,
  Settings,
  Save,
  Lock,
  Mail,
  Eye as EyeIcon,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles
} from 'lucide-react';
import { useAuth } from "../contexts/auth-context";
import api from '../api/axios';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const groupByAppointment = (transactions) => {
  const map = new Map();
  transactions.forEach(tx => {
    const apptId = tx.appointment_id ?? tx.id;
    if (!apptId) return;
    if (!map.has(apptId)) {
      map.set(apptId, {
        appointment_id: apptId,
        id: tx.id,
        customer_name: tx.customer_name,
        customer_email: tx.customer_email,
        customer_phone: tx.customer_phone,
        appointment_date: tx.appointment_date,
        appointment_time: tx.appointment_time,
        status: tx.status,
        assigned_employee_id: tx.assigned_employee_id,
        billing_total_amount: tx.billing_total_amount != null ? parseFloat(tx.billing_total_amount) : null,
        billing_paid_amount: tx.billing_paid_amount != null ? parseFloat(tx.billing_paid_amount) : null,
        billing_balance: tx.billing_balance != null ? parseFloat(tx.billing_balance) : null,
        billing_payment_type: tx.billing_payment_type ?? null,
        services: [],
        priceSum: 0,
        durationSum: 0,
      });
    }
    const g = map.get(apptId);
    g.services.push({
      service_id: tx.service_id,
      service_name: tx.service_name,
      price: parseFloat(tx.price) || 0,
      duration_minutes: parseInt(tx.duration_minutes) || 0,
    });
    g.priceSum += parseFloat(tx.price) || 0;
    g.durationSum += parseInt(tx.duration_minutes) || 0;
  });
  return Array.from(map.values());
};

const getAppointmentRevenue = (appt) => {
  if (appt.billing_total_amount != null && appt.billing_total_amount > 0) {
    return appt.billing_total_amount;
  }
  return appt.priceSum || 0;
};

// Walk-in revenue helper
const getWalkInRevenue = (walkIn) => {
  if (walkIn.amount_paid != null) return parseFloat(walkIn.amount_paid) || 0;
  if (walkIn.total_amount != null) return parseFloat(walkIn.total_amount) || 0;
  if (walkIn.price != null) return parseFloat(walkIn.price) || 0;
  return 0;
};

// ✅ FIXED: backend returns WalkIn::with(['services', 'user'])
// `services` can be:
//   • a SINGLE object  → { id, service_name, price, ... }   ← actual shape
//   • an array of rows → [{ ... }, { ... }]
// Normalize either into a flat array of { service_id, service_name, price }.
const getWalkInServiceLines = (walkIn) => {
  const raw = walkIn?.services;
  if (!raw) return [];

  const rows = Array.isArray(raw) ? raw : [raw];

  return rows
    .filter(Boolean)
    .map(s => ({
      service_id: s.service_id ?? s.id ?? s.service?.id ?? null,
      service_name: s.service_name ?? s.name ?? s.service?.service_name ?? s.service?.name ?? null,
      price: s.price ?? s.service?.price ?? s.amount ?? 0,
    }))
    .filter(s => s.service_name || s.service_id != null);
};

// ─────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  confirmed: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  pending: { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  completed: { pill: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  cancelled: { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};
const DEFAULT_STATUS_STYLE = { pill: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };

const RANK_STYLES = [
  { badge: 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-sm', bar: 'from-yellow-400 to-yellow-500' },
  { badge: 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-sm', bar: 'from-slate-400 to-slate-500' },
  { badge: 'bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-sm', bar: 'from-orange-400 to-orange-500' },
];
const getRankStyle = (index, fallback) => RANK_STYLES[index] || fallback;
const PINK_RANK_FALLBACK = { badge: 'bg-pink-50 text-pink-600', bar: 'from-pink-400 to-pink-500' };
const GREEN_RANK_FALLBACK = { badge: 'bg-emerald-50 text-emerald-600', bar: 'from-emerald-400 to-emerald-500' };

const inputClass = (hasError) =>
  `w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50/60 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white focus:border-transparent transition-all ${
    hasError ? 'border-red-300 focus:ring-red-400' : 'border-slate-200 focus:ring-pink-500'
  }`;

// ─────────────────────────────────────────────────────────────
// Small UI building blocks
// ─────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const style = STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border capitalize ${style.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
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

function ViewAllLink({ to, label = 'View All', className = 'text-pink-600 hover:text-pink-700' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-0.5 text-xs font-semibold whitespace-nowrap group ${className}`}>
      <span>{label}</span>
      <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
        <Icon size={26} className="text-slate-300" />
      </div>
      <p className="text-xs text-slate-400">{text}</p>
    </div>
  );
}

function Spinner({ className = 'border-pink-500' }) {
  return <div className={`w-6 h-6 border-[3px] border-t-transparent rounded-full animate-spin ${className}`} />;
}

function StatCard({ label, value, icon: Icon, color, bgColor, textColor, trend, loading }) {
  const isNegative = trend.startsWith('-');
  const isNeutral = trend === '+0%' || trend === '0%';
  const trendClass = isNeutral
    ? 'bg-slate-100 text-slate-500'
    : isNegative
      ? 'bg-red-50 text-red-600'
      : 'bg-emerald-50 text-emerald-600';
  const TrendIcon = isNeutral ? Minus : isNegative ? ArrowDownRight : ArrowUpRight;

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition-all duration-300 p-5 overflow-hidden">
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.08] bg-gradient-to-br ${color} group-hover:scale-125 transition-transform duration-500`} />
      <div className="relative flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
          <Icon size={20} className="text-white" />
        </div>
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${trendClass}`}>
          <TrendIcon size={12} />
          {trend}
        </span>
      </div>
      <p className="relative text-xs font-medium text-slate-500 mt-4">{label}</p>
      {loading ? (
        <div className="relative h-8 w-16 mt-1 rounded-lg bg-slate-100 animate-pulse" />
      ) : (
        <p className="relative text-3xl font-bold text-slate-800 mt-0.5 tracking-tight">{value}</p>
      )}
      <div className={`relative mt-3 h-1 rounded-full ${bgColor} overflow-hidden`}>
        <div className={`h-full w-2/3 rounded-full bg-gradient-to-r ${color}`} />
      </div>
    </div>
  );
}

function NavItem({ to, icon: Icon, glyph, label, active, onClick, compact = false }) {
  if (compact) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-xs ${
          active ? 'bg-pink-50 text-pink-600 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        {Icon ? <Icon size={14} /> : <span className="w-[14px] text-center font-bold text-sm leading-none">{glyph}</span>}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-pink-50 to-pink-100/70 text-pink-600 font-semibold'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-pink-500 to-pink-600" />}
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        active ? 'bg-white text-pink-600 shadow-sm' : 'bg-slate-100/80 text-slate-500 group-hover:bg-white'
      }`}>
        {Icon ? <Icon size={16} /> : <span className="font-bold text-sm leading-none">{glyph}</span>}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function NavGroupLabel({ children }) {
  return <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{children}</p>;
}

function InfoCard({ icon: Icon, title, iconClass = 'text-pink-500', children }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        {Icon ? <Icon size={16} className={iconClass} /> : null}
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const accent =
    type === 'success' ? { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600' } :
    type === 'warning' ? { bar: 'bg-amber-500', icon: 'bg-amber-100 text-amber-600' } :
    type === 'error' ? { bar: 'bg-red-500', icon: 'bg-red-100 text-red-600' } :
    { bar: 'bg-blue-500', icon: 'bg-blue-100 text-blue-600' };

  const Icon =
    type === 'success' ? CheckCircle :
    type === 'warning' ? AlertCircle :
    type === 'error' ? XCircle : AlertCircle;

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
// Notification icon helper
// ─────────────────────────────────────────────────────────────
function getNotificationIcon(type) {
  switch (type) {
    case 'new_appointment':      return Calendar;
    case 'appointment_confirmed':return CheckCircle;
    case 'appointment_cancelled':return XCircle;
    case 'appointment_rescheduled': return Clock;
    case 'appointment_request':  return AlertCircle;
    case 'low_stock':            return Package;
    case 'upcoming_appointment': return Bell;
    default:                     return Bell;
  }
}

// ─────────────────────────────────────────────────────────────
// QR Code Modal
// ─────────────────────────────────────────────────────────────
function QrCodeModal({ open, qrData, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [gcashNumber, setGcashNumber] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setPreviewUrl(null);
      setGcashNumber(qrData?.gcash_number || '');
      setIsUploading(false);
    }
  }, [open, qrData?.gcash_number]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!open) return null;

  const handlePickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(f.type)) { alert('Please upload a PNG or JPG image.'); return; }
    if (f.size > 4 * 1024 * 1024) { alert('Image must be 4MB or smaller.'); return; }
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { alert('Please select a QR code image.'); return; }
    if (!/^09\d{9}$/.test(gcashNumber.trim())) { alert('GCash number must be 11 digits starting with 09.'); return; }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('qr_image', file);
      formData.append('gcash_number', gcashNumber.trim());
      await api.post('/qr-code', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded?.();
    } catch (error) {
      const msg = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join('\n')
        : error.response?.data?.message || 'Failed to upload QR code.';
      alert(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <ImageIcon size={18} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {qrData?.qr_image ? 'Update Payment QR' : 'Upload Payment QR'}
            </h2>
          </div>
          <button onClick={onClose} className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors" disabled={isUploading}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">QR Code Image <span className="text-pink-500">*</span></label>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-pink-300 rounded-2xl bg-pink-50/60 cursor-pointer hover:bg-pink-50 hover:border-pink-400 transition-colors">
              {previewUrl ? (
                <img src={previewUrl} alt="QR preview" className="w-full h-full object-contain rounded-2xl p-2" />
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                    <CloudUpload size={24} className="text-pink-500" />
                  </div>
                  <p className="text-sm font-medium text-pink-600">Click to upload</p>
                  <p className="text-xs text-slate-500 mt-1">PNG or JPG, max 4MB</p>
                </div>
              )}
              <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handlePickImage} disabled={isUploading} />
            </label>
            {file && <p className="text-xs text-slate-500 mt-2">Selected: <span className="font-medium">{file.name}</span></p>}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">GCash Number <span className="text-pink-500">*</span></label>
            <input type="text" inputMode="numeric" value={gcashNumber} onChange={(e) => setGcashNumber(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="09171234567" maxLength={11} autoComplete="off" className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all" disabled={isUploading} />
            <p className="text-xs text-slate-500 mt-1.5">11 digits, must start with 09</p>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} disabled={isUploading} className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isUploading || !file} className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all">
              {isUploading ? (<><Loader size={14} className="animate-spin" />Uploading...</>) : (<><Upload size={14} />{qrData?.qr_image ? 'Update QR' : 'Upload QR'}</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────
function Dashboard() {
  const auth = useAuth();
  const logout = auth?.logout;
  const updateUser = auth?.updateUser;
  const user = auth?.user;
  const isHydrated = auth?.isHydrated;

  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [token, setToken] = useState(null);

  const [dashboardStats, setDashboardStats] = useState({
    totalAppointments: 0,
    activeServices: 0,
    inventoryItems: 0,
    staffMembers: 0
  });

  const [recentCompletedAppointments, setRecentCompletedAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [appointmentStatusCounts, setAppointmentStatusCounts] = useState({
    confirmed: 0,
    pending: 0,
    completed: 0,
    cancelled: 0
  });

  const [revenueChartData, setRevenueChartData] = useState([]);

  const [remittances, setRemittances] = useState([]);
  const [weeklyRemittanceData, setWeeklyRemittanceData] = useState([]);
  const [totalWeeklyRemittance, setTotalWeeklyRemittance] = useState(0);

  const [staffPerformance, setStaffPerformance] = useState([]);
  const [servicePerformance, setServicePerformance] = useState([]);
  const [frequentCustomers, setFrequentCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [commissionsData, setCommissionsData] = useState([]);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(true);

  const [qrData, setQrData] = useState(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const [settingsForm, setSettingsForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirmation: '',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showSettingsPassword, setShowSettingsPassword] = useState(false);
  const [showSettingsConfirmPassword, setShowSettingsConfirmPassword] = useState(false);
  const [settingsErrors, setSettingsErrors] = useState({});

  const [walkIns, setWalkIns] = useState([]);

  useEffect(() => {
    if (!isHydrated) return;
    const storedToken = localStorage.getItem('token');
    if (!storedToken || !user || (user.role !== 'admin' && user.role !== 'owner')) {
      navigate('/');
      return;
    }
    setToken(storedToken);
  }, [user, navigate, isHydrated]);

  useEffect(() => {
    const isTransactionsRoute =
      location.pathname === '/dashboard/sales' ||
      location.pathname === '/dashboard/inventoryReports' ||
      location.pathname === '/dashboard/remittances';
    if (isTransactionsRoute) setTransactionsOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/dashboard/settings' && user) {
      setSettingsForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        password: '',
        password_confirmation: '',
      });
      setSettingsErrors({});
    }
  }, [location.pathname, user]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        if (!cancelled && Array.isArray(response.data)) setNotifications(response.data);
      } catch (err) {}
    };
    loadNotifications();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channelName = `App.Models.User.${user.id}`;
    const channel = echo.private(channelName).notification((notification) => {
      const entry = {
        id: notification.id ?? `local-${Date.now()}`,
        type: notification.type ?? 'notification',
        data: notification.data ?? notification,
        read_at: null,
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [entry, ...prev]);
      const title = entry.data?.title || 'Notification';
      const message = entry.data?.message || '';
      setToast({ message: `${title}: ${message}`, type: 'success' });
    });
    return () => { echo.leave(channelName); };
  }, [user?.id]);

  const fetchAllAppointments = async () => {
    try {
      const response = await api.get('/all-appointments');
      if (Array.isArray(response.data)) {
        const grouped = groupByAppointment(response.data);

        const counts = { confirmed: 0, pending: 0, completed: 0, cancelled: 0 };
        grouped.forEach(appt => {
          if (appt.status === 'confirmed') counts.confirmed++;
          else if (appt.status === 'pending') counts.pending++;
          else if (appt.status === 'completed') counts.completed++;
          else if (appt.status === 'cancelled') counts.cancelled++;
        });
        setAppointmentStatusCounts(counts);

        const completed = grouped.filter(a => a.status === 'completed');
        setRecentCompletedAppointments(completed.slice(0, 5));

        const chartMap = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          chartMap[dateStr] = {
            date: dateStr,
            label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: 0
          };
        }

        completed.forEach(appt => {
          if (appt.appointment_date && chartMap[appt.appointment_date]) {
             chartMap[appt.appointment_date].revenue += getAppointmentRevenue(appt);
          }
        });

        setRevenueChartData(Object.values(chartMap));

        setDashboardStats(prev => ({ ...prev, totalAppointments: grouped.length }));
        return grouped;
      }
    } catch (error) { return []; }
  };

  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      if (Array.isArray(response.data)) {
        const activeServices = response.data.filter(s => s.service_status === 'active').length;
        setDashboardStats(prev => ({ ...prev, activeServices }));
      }
    } catch (error) {}
  };

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      if (Array.isArray(response.data)) setDashboardStats(prev => ({ ...prev, inventoryItems: response.data.length }));
    } catch (error) {}
  };

  const fetchStaff = async () => {
    try {
      const response = await api.get('/employees');
      if (Array.isArray(response.data)) setDashboardStats(prev => ({ ...prev, staffMembers: response.data.length }));
    } catch (error) {}
  };

  const fetchFeedbacks = async () => {
    try {
      const response = await api.get('/feedbacks');
      if (Array.isArray(response.data)) setFeedbacks(response.data);
    } catch (error) {}
  };

  const fetchRemittances = async () => {
    try {
      const response = await api.get('/remittance');
      if (Array.isArray(response.data)) {
        setRemittances(response.data);
        processWeeklyRemittances(response.data);
      }
    } catch (error) {}
  };

  const fetchStaffList = async () => {
    try {
      const response = await api.get('/staff-list');
      if (Array.isArray(response.data)) setStaffList(response.data);
    } catch (error) {}
  };

  const fetchCommissions = async () => {
    try {
      const response = await api.get('/employee/commission');
      if (Array.isArray(response.data)) setCommissionsData(response.data);
    } catch (error) { setCommissionsData([]); }
  };

  const fetchQrCode = async () => {
    setIsLoadingQr(true);
    try {
      const response = await api.get('/qr-code');
      setQrData(response.data);
      return response.data;
    } catch (error) { setQrData(null); return null; } finally { setIsLoadingQr(false); }
  };

  const fetchWalkIns = async () => {
    try {
      const response = await api.get('/walk-in');
      if (Array.isArray(response.data)) setWalkIns(response.data);
    } catch (error) {}
  };

  const getEmployeeCommissionRate = (employeeId) => {
    const commission = commissionsData.find(c => c.employee_id === employeeId);
    return commission ? parseFloat(commission.commission_amount) : 0;
  };

  // ✅ FIXED: staff performance — walk-ins attributed by stylist_id
  const calculateStaffPerformance = (groupedAppointments, walkInRows = []) => {
    const staffMap = {};

    const ensureStaff = (staffId) => {
      if (!staffMap[staffId]) {
        const staff = staffList.find(s => s.id === staffId);
        staffMap[staffId] = {
          staff_id: staffId,
          staff_name: staff?.name || `Staff ${staffId}`,
          totalRevenue: 0,
          appointmentCount: 0,
          walkInCount: 0,
          totalCommission: 0,
          commissionRate: getEmployeeCommissionRate(staffId),
        };
      }
      return staffMap[staffId];
    };

    // Appointments — revenue + commission from services
    groupedAppointments.forEach(appt => {
      const staffId = appt.assigned_employee_id;
      if (!staffId) return;
      const entry = ensureStaff(staffId);
      entry.totalRevenue += getAppointmentRevenue(appt);
      entry.appointmentCount += 1;
      appt.services.forEach(svc => {
        entry.totalCommission += (svc.price || 0) * entry.commissionRate;
      });
    });

    // Walk-ins — attributed by stylist_id
    walkInRows.forEach(w => {
      const staffId = w.stylist_id;
      if (!staffId) return;
      const entry = ensureStaff(staffId);

      const walkInRevenue = getWalkInRevenue(w);
      entry.totalRevenue += walkInRevenue;
      entry.walkInCount += 1;

      const lines = getWalkInServiceLines(w);
      const svcRevenue = lines.length > 0
        ? lines.reduce((s, svc) => s + (parseFloat(svc.price) || 0), 0)
        : (w.service_revenue != null ? parseFloat(w.service_revenue) || 0 : walkInRevenue);
      entry.totalCommission += svcRevenue * entry.commissionRate;
    });

    return Object.values(staffMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  // Service performance — appointments + walk-ins (normalized service lines)
  const calculateServicePerformance = (serviceRows, walkInRows = []) => {
    const serviceMap = {};

    const push = (name, price) => {
      if (!name) return;
      if (!serviceMap[name]) {
        serviceMap[name] = { service_name: name, totalRevenue: 0, count: 0 };
      }
      serviceMap[name].totalRevenue += parseFloat(price) || 0;
      serviceMap[name].count += 1;
    };

    serviceRows.forEach(row => push(row.service_name, row.price));

    walkInRows.forEach(w => {
      getWalkInServiceLines(w).forEach(svc => {
        if (!svc.service_name) return;
        push(svc.service_name, svc.price);
      });
    });

    return Object.values(serviceMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const fetchPerformanceData = async () => {
    setIsLoadingPerformance(true);
    try {
      const [apptResponse, walkInResponse] = await Promise.all([
        api.get('/all-appointments'),
        api.get('/walk-in'),
      ]);

      const walkInRows = Array.isArray(walkInResponse.data) ? walkInResponse.data : [];

      if (Array.isArray(apptResponse.data)) {
        const grouped = groupByAppointment(apptResponse.data);
        const completedGrouped = grouped.filter(a => a.status === 'completed');

        let staffResult = [];
        let serviceResult = [];

        try {
          staffResult = calculateStaffPerformance(completedGrouped, walkInRows);
        } catch (staffErr) {
          console.error('Staff performance calculation failed:', staffErr);
        }

        try {
          const serviceRows = [];
          completedGrouped.forEach(appt => {
            appt.services.forEach(svc => serviceRows.push({
              service_name: svc.service_name,
              price: svc.price,
            }));
          });
          serviceResult = calculateServicePerformance(serviceRows, walkInRows);
        } catch (serviceErr) {
          console.error('Service performance calculation failed:', serviceErr);
        }

        setStaffPerformance(staffResult);
        setServicePerformance(serviceResult);
      }
    } catch (error) {
      console.error('fetchPerformanceData failed:', error);
    } finally {
      setIsLoadingPerformance(false);
    }
  };

  const fetchFrequentCustomers = async () => {
    try {
      const appointmentsResponse = await api.get('/all-appointments');
      const walkInsResponse = await api.get('/walk-in');
      const customerMap = {};

      if (Array.isArray(appointmentsResponse.data)) {
        const grouped = groupByAppointment(appointmentsResponse.data);
        const completedAppointments = grouped.filter(appt => appt.status === 'completed');
        completedAppointments.forEach(appt => {
          const customerName = appt.customer_name || 'Unknown Customer';
          if (!customerMap[customerName]) {
            customerMap[customerName] = {
              name: customerName,
              email: appt.customer_email || 'N/A',
              phone: appt.customer_phone || 'N/A',
              appointmentCount: 0,
              walkInCount: 0,
              totalVisits: 0,
              totalSpent: 0,
              lastVisit: appt.appointment_date || null,
            };
          }
          customerMap[customerName].appointmentCount += 1;
          customerMap[customerName].totalVisits += 1;
          customerMap[customerName].totalSpent += getAppointmentRevenue(appt);
          if (appt.appointment_date && (!customerMap[customerName].lastVisit || appt.appointment_date > customerMap[customerName].lastVisit)) {
            customerMap[customerName].lastVisit = appt.appointment_date;
          }
        });
      }

      if (Array.isArray(walkInsResponse.data)) {
        walkInsResponse.data.forEach(walkIn => {
          const customerName = walkIn.customer_name || 'Walk-in Customer';
          if (!customerMap[customerName]) {
            customerMap[customerName] = {
              name: customerName,
              email: 'N/A',
              phone: 'N/A',
              appointmentCount: 0,
              walkInCount: 0,
              totalVisits: 0,
              totalSpent: 0,
              lastVisit: walkIn.created_at ? walkIn.created_at.split('T')[0] : null,
            };
          }
          customerMap[customerName].walkInCount += 1;
          customerMap[customerName].totalVisits += 1;
          customerMap[customerName].totalSpent += getWalkInRevenue(walkIn);
          if (walkIn.created_at) {
            const visitDate = walkIn.created_at.split('T')[0];
            if (!customerMap[customerName].lastVisit || visitDate > customerMap[customerName].lastVisit) {
              customerMap[customerName].lastVisit = visitDate;
            }
          }
        });
      }

      setFrequentCustomers(
        Object.values(customerMap)
          .sort((a, b) => b.totalVisits - a.totalVisits || b.totalSpent - a.totalSpent)
          .slice(0, 5)
      );
    } catch (error) {}
  };

  const processWeeklyRemittances = (data) => {
    const days = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({ date: dateStr, dayName: dayNames[date.getDay()], amount: 0, hasRemittance: false });
    }
    data.forEach(remittance => {
      const businessDate = remittance.business_schedules?.business_date;
      if (businessDate) {
        const dayIndex = days.findIndex(d => d.date === businessDate);
        if (dayIndex !== -1) {
          days[dayIndex].amount = parseFloat(remittance.remittance_amount) || 0;
          days[dayIndex].hasRemittance = true;
        }
      }
    });
    setWeeklyRemittanceData(days);
    setTotalWeeklyRemittance(days.reduce((sum, day) => sum + day.amount, 0));
  };

  const getFeedbackForAppointment = (appointmentId) => feedbacks.find(f => f.appointment_id === appointmentId);

  const handleQrClose = useCallback(() => setIsQrModalOpen(false), []);
  const handleQrUploaded = useCallback(async () => {
    await fetchQrCode();
    setIsQrModalOpen(false);
    setToast({ message: 'QR code updated successfully!', type: 'success' });
  }, []);

  const refetchAllData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    await Promise.all([
      fetchAllAppointments(), fetchServices(), fetchInventory(), fetchStaff(),
      fetchFeedbacks(), fetchRemittances(), fetchStaffList(), fetchCommissions(),
      fetchQrCode(), fetchWalkIns(),
    ]);
    if (!silent) setIsLoading(false);
  }, []);

  useEffect(() => {
    if (location.pathname === '/dashboard') refetchAllData();
  }, [location.pathname, refetchAllData]);

  useEffect(() => {
    const onFocus = () => { if (location.pathname === '/dashboard') refetchAllData(true); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [location.pathname, refetchAllData]);

  useEffect(() => {
    if (staffList.length > 0 || commissionsData.length > 0) {
      fetchPerformanceData();
      fetchFrequentCustomers();
    }
  }, [staffList, commissionsData]);

  const isDashboardRoute = location.pathname === '/dashboard';
  const isAppointmentsRoute = location.pathname === '/dashboard/appointments' || location.pathname === '/dashboard/appointments/list' || location.pathname.startsWith('/dashboard/appointments/');
  const isServicesRoute = location.pathname === '/dashboard/services';
  const isEmployeesRoute = location.pathname === '/dashboard/employees';
  const isInventoryRoute = location.pathname === '/dashboard/inventory';
  const isReportsRoute = location.pathname === '/dashboard/reports';
  const isProductsRoute = location.pathname === '/dashboard/products';
  const isSettingsRoute = location.pathname === '/dashboard/settings';
  const isSalesRoute = location.pathname === '/dashboard/sales';
  const isInventoryReportsRoute = location.pathname === '/dashboard/inventoryReports';
  const isRemittancesRoute = location.pathname === '/dashboard/remittances';
  const isAnyTransactionsRoute = isSalesRoute || isInventoryReportsRoute || isRemittancesRoute;
  const isNestedRoute = isAppointmentsRoute || isServicesRoute || isEmployeesRoute || isInventoryRoute || isReportsRoute || isProductsRoute || isAnyTransactionsRoute;

  const stats = [
    { label: 'Total Appointments', value: dashboardStats.totalAppointments.toString(), icon: Calendar, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-600', trend: '+12%' },
    { label: 'Active Services', value: dashboardStats.activeServices.toString(), icon: Scissors, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-600', trend: '+5%' },
    { label: 'Inventory Items', value: dashboardStats.inventoryItems.toString(), icon: Package, color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600', trend: '-3%' },
    { label: 'Staff Members', value: dashboardStats.staffMembers.toString(), icon: Users, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-600', trend: '+0%' },
  ];

  const pieData = [
    { name: 'Confirmed', value: appointmentStatusCounts.confirmed, color: '#10b981' },
    { name: 'Pending', value: appointmentStatusCounts.pending, color: '#eab308' },
    { name: 'Completed', value: appointmentStatusCounts.completed, color: '#3b82f6' },
    { name: 'Cancelled', value: appointmentStatusCounts.cancelled, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const pieTotal =
    appointmentStatusCounts.confirmed +
    appointmentStatusCounts.pending +
    appointmentStatusCounts.completed +
    appointmentStatusCounts.cancelled;

  const weeklyRevenueTotal = revenueChartData.reduce((sum, d) => sum + d.revenue, 0);

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const handleLogout = async () => {
    try { if (typeof logout === 'function') await logout(); navigate('/'); } catch (error) { navigate('/'); }
  };

  const handleMarkAsRead = async (notification) => {
    if (!notification || notification.read_at) return;
    try {
      await api.post(`/notifications/${notification.id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch (err) {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    } catch (err) {}
  };

  const handleNotificationClick = (notification) => {
    handleMarkAsRead(notification);
    setNotificationsOpen(false);
    const type = notification.data?.type || notification.type;
    if (type === 'new_appointment' || type === 'appointment_request') navigate('/dashboard/appointments');
    else if (type === 'low_stock') navigate('/dashboard/inventory');
  };

  const getStatusColor = (status) => (STATUS_STYLES[status] || DEFAULT_STATUS_STYLE).pill;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minutes} ${ampm}`;
  };
  const formatCurrency = (amount) => `₱${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleAppointmentClick = (appointment) => { setSelectedAppointment(appointment); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setSelectedAppointment(null); };

  const handleSettingsChange = (field) => (e) => {
    setSettingsForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSettingsErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validateSettings = () => {
    const newErrors = {};
    if (!settingsForm.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!settingsForm.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!settingsForm.email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(settingsForm.email)) newErrors.email = 'Enter a valid email';
    if (!settingsForm.phone_number.trim()) newErrors.phone_number = 'Phone number is required';
    if (settingsForm.password) {
      if (settingsForm.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (settingsForm.password !== settingsForm.password_confirmation) newErrors.password_confirmation = 'Passwords do not match';
    }
    setSettingsErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    if (!validateSettings() || !user?.id) return;
    setIsSavingSettings(true);
    try {
      const payload = { first_name: settingsForm.first_name.trim(), last_name: settingsForm.last_name.trim(), email: settingsForm.email.trim(), phone_number: settingsForm.phone_number.trim() };
      if (settingsForm.password) {
        payload.password = settingsForm.password;
        payload.password_confirmation = settingsForm.password_confirmation;
      }
      const response = await api.post(`/owner/update/${user.id}`, payload);
      setToast({ message: response.data?.message || 'Profile updated successfully!', type: 'success' });
      setSettingsForm((prev) => ({ ...prev, password: '', password_confirmation: '' }));
      if (typeof updateUser === 'function' && response.data?.user) updateUser(response.data.user);
    } catch (error) {
      if (error.response?.data?.errors) {
        const backendErrors = {};
        Object.entries(error.response.data.errors).forEach(([key, messages]) => backendErrors[key] = Array.isArray(messages) ? messages[0] : messages);
        setSettingsErrors(backendErrors);
        setToast({ message: 'Please fix the errors in the form.', type: 'error' });
      } else setToast({ message: error.response?.data?.message || 'Failed to update profile.', type: 'error' });
    } finally { setIsSavingSettings(false); }
  };

  // ───────────────────────────────────────────────────────────
  // Appointment details modal
  // ───────────────────────────────────────────────────────────
  const AppointmentModal = () => {
    if (!selectedAppointment) return null;
    const services = selectedAppointment.services || [];
    const grandTotal = selectedAppointment.billing_total_amount ?? selectedAppointment.priceSum ?? 0;
    const paidAmount = selectedAppointment.billing_paid_amount ?? 0;
    const balance = selectedAppointment.billing_balance ?? (grandTotal - paidAmount);
    const serviceNames = services.map(s => s.service_name).join(' + ') || 'N/A';
    const durationSum = selectedAppointment.durationSum ?? 0;
    const feedback = getFeedbackForAppointment(selectedAppointment.id) || getFeedbackForAppointment(selectedAppointment.appointment_id);
    const paidPercent = grandTotal > 0 ? Math.min(100, Math.round((paidAmount / grandTotal) * 100)) : 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={closeModal}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between overflow-hidden flex-shrink-0">
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Calendar size={18} className="text-white" /></div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">Appointment Details</h2>
                <p className="text-[11px] text-pink-100">{formatDate(selectedAppointment.appointment_date)} · {formatTime(selectedAppointment.appointment_time)}</p>
              </div>
            </div>
            <button onClick={closeModal} className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto scrollbar-hide">
            <InfoCard icon={User} title="Customer Information">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold shadow-sm">
                  {(selectedAppointment.customer_name || '?').charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-slate-800">{selectedAppointment.customer_name}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" />{selectedAppointment.customer_phone || 'N/A'}</p>
                <p className="flex items-center gap-2 min-w-0"><Mail size={14} className="text-slate-400 flex-shrink-0" /><span className="truncate">{selectedAppointment.customer_email || 'N/A'}</span></p>
              </div>
            </InfoCard>

            <InfoCard icon={Scissors} title={`Appointment Details`}>
              <div className="space-y-2 text-sm text-slate-700">
                <p><span className="font-medium text-slate-500">Service{services.length > 1 ? 's' : ''}:</span> {serviceNames}</p>
                {services.length > 1 && (
                  <div className="pl-3 space-y-1 border-l-2 border-pink-200">
                    {services.map((svc, idx) => (
                      <p key={idx} className="text-xs text-slate-600">{svc.service_name} — ₱{svc.price.toLocaleString()} ({svc.duration_minutes} mins)</p>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <p><span className="font-medium text-slate-500">Date:</span> {formatDate(selectedAppointment.appointment_date)}</p>
                  <p><span className="font-medium text-slate-500">Time:</span> {formatTime(selectedAppointment.appointment_time)}</p>
                  <p><span className="font-medium text-slate-500">Duration:</span> {durationSum} mins</p>
                  <p className="flex items-center gap-2"><span className="font-medium text-slate-500">Status:</span><StatusPill status={selectedAppointment.status} /></p>
                </div>
              </div>
            </InfoCard>

            <InfoCard icon={null} title="Payment">
              <div className="-mt-9 mb-0" />
              <div className="space-y-2 text-sm">
                <p className="flex justify-between"><span className="font-medium text-slate-500">Total Amount</span><span className="text-pink-600 font-bold">₱{grandTotal.toLocaleString()}</span></p>
                <p className="flex justify-between"><span className="font-medium text-slate-500">Paid</span><span className="text-emerald-600 font-semibold">₱{paidAmount.toLocaleString()}</span></p>
                <p className="flex justify-between"><span className="font-medium text-slate-500">Balance</span><span className={`font-semibold ${balance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{balance > 0 ? `₱${balance.toLocaleString()}` : 'Paid in Full'}</span></p>
                <div className="pt-1">
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700" style={{ width: `${paidPercent}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 text-right">{paidPercent}% paid</p>
                </div>
              </div>
            </InfoCard>

            <InfoCard icon={Star} title="Customer Feedback" iconClass="text-yellow-500">
              {feedback ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={16} className={star <= feedback.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'} />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{feedback.rating}/5</span>
                  </div>
                  <p className="text-sm text-slate-600 italic bg-white rounded-lg border border-slate-100 p-3">{feedback.comments ? `"${feedback.comments}"` : 'No comments provided'}</p>
                </div>
              ) : <p className="text-sm text-slate-500 italic">No feedback yet</p>}
            </InfoCard>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end flex-shrink-0">
            <button onClick={closeModal} className="px-5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg transition-all text-sm font-semibold">Close</button>
          </div>
        </div>
      </div>
    );
  };

  // ───────────────────────────────────────────────────────────
  // Settings
  // ───────────────────────────────────────────────────────────
  const renderSettingsContent = () => {
    const initials = `${settingsForm.first_name?.[0] || ''}${settingsForm.last_name?.[0] || ''}`.toUpperCase();
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden mb-5">
          <div className="h-24 bg-gradient-to-r from-pink-500 via-pink-500 to-fuchsia-600 relative">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute right-24 -bottom-12 w-28 h-28 rounded-full bg-white/10" />
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-9">
              <div className="w-[72px] h-[72px] bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white">
                <span className="text-white text-2xl font-bold">{initials || <User size={26} />}</span>
              </div>
              <div className="pb-1">
                <h2 className="text-lg font-bold text-slate-800">{settingsForm.first_name} {settingsForm.last_name}</h2>
                <p className="text-xs text-slate-500 capitalize flex items-center gap-1 mt-0.5"><Crown size={12} className="text-yellow-500" />{user?.role || 'owner'}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5"><Mail size={12} />{settingsForm.email}</p>
          </div>
        </div>

        <form onSubmit={handleSettingsSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="bg-pink-50 w-9 h-9 rounded-xl flex items-center justify-center"><Settings size={16} className="text-pink-500" /></div>
            <div><h3 className="text-sm font-semibold text-slate-800">Personal Information</h3><p className="text-[11px] text-slate-500 mt-0.5">Update your account details and password</p></div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name <span className="text-pink-500">*</span></label>
                  <div className="relative"><User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={settingsForm.first_name} onChange={handleSettingsChange('first_name')} className={inputClass(settingsErrors.first_name)} placeholder="Enter first name" /></div>
                  {settingsErrors.first_name && <p className="text-[11px] text-red-500 mt-1">{settingsErrors.first_name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name <span className="text-pink-500">*</span></label>
                  <div className="relative"><User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={settingsForm.last_name} onChange={handleSettingsChange('last_name')} className={inputClass(settingsErrors.last_name)} placeholder="Enter last name" /></div>
                  {settingsErrors.last_name && <p className="text-[11px] text-red-500 mt-1">{settingsErrors.last_name}</p>}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address <span className="text-pink-500">*</span></label>
                  <div className="relative"><Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" value={settingsForm.email} onChange={handleSettingsChange('email')} className={inputClass(settingsErrors.email)} placeholder="you@example.com" /></div>
                  {settingsErrors.email && <p className="text-[11px] text-red-500 mt-1">{settingsErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number <span className="text-pink-500">*</span></label>
                  <div className="relative"><Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={settingsForm.phone_number} onChange={(e) => setSettingsForm((prev) => ({ ...prev, phone_number: e.target.value.replace(/[^\d+\-\s()]/g, '') }))} className={inputClass(settingsErrors.phone_number)} placeholder="09171234567" /></div>
                  {settingsErrors.phone_number && <p className="text-[11px] text-red-500 mt-1">{settingsErrors.phone_number}</p>}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Change Password</h4>
              <p className="text-[11px] text-slate-400 mb-3">Leave blank to keep your current password</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
                  <div className="relative"><Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type={showSettingsPassword ? 'text' : 'password'} value={settingsForm.password} onChange={handleSettingsChange('password')} className={`${inputClass(settingsErrors.password)} pr-10`} placeholder="Min. 8 characters" autoComplete="new-password" /><button type="button" onClick={() => setShowSettingsPassword((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>{showSettingsPassword ? <EyeOff size={15} /> : <EyeIcon size={15} />}</button></div>
                  {settingsErrors.password && <p className="text-[11px] text-red-500 mt-1">{settingsErrors.password}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                  <div className="relative"><Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type={showSettingsConfirmPassword ? 'text' : 'password'} value={settingsForm.password_confirmation} onChange={handleSettingsChange('password_confirmation')} className={`${inputClass(settingsErrors.password_confirmation)} pr-10`} placeholder="Re-enter new password" autoComplete="new-password" /><button type="button" onClick={() => setShowSettingsConfirmPassword((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>{showSettingsConfirmPassword ? <EyeOff size={15} /> : <EyeIcon size={15} />}</button></div>
                  {settingsErrors.password_confirmation && <p className="text-[11px] text-red-500 mt-1">{settingsErrors.password_confirmation}</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-2 bg-slate-50/60">
            <button type="submit" disabled={isSavingSettings} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isSavingSettings ? (<><Loader size={14} className="animate-spin" />Saving...</>) : (<><Save size={14} />Save Changes</>)}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // ───────────────────────────────────────────────────────────
  // Dashboard home
  // ───────────────────────────────────────────────────────────
  const renderDashboardContent = () => (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 via-pink-500 to-fuchsia-600 p-6 sm:p-7 text-white shadow-lg shadow-pink-500/20">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute right-32 -bottom-16 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute left-1/3 -top-10 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-pink-100 text-xs font-medium flex items-center gap-1.5"><Sparkles size={14} />{todayLabel}</p>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1.5 tracking-tight">Welcome back, {user?.first_name || 'Owner'}!</h2>
            <p className="text-pink-100 text-sm mt-1">Here's what's happening at Reshel Oco Hair Salon.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />{appointmentStatusCounts.pending} pending
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />{appointmentStatusCounts.confirmed} confirmed
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />{appointmentStatusCounts.completed} completed
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/appointments" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-pink-600 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <Calendar size={16} />View Appointments
            </Link>
            <button onClick={() => setIsQrModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 border border-white/30 text-white rounded-xl text-sm font-semibold hover:bg-white/25 transition-all">
              <Upload size={16} />{qrData?.qr_image ? 'Change QR' : 'Upload QR'}
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} loading={isLoading} />
        ))}
      </div>

      {/* Revenue + Status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Panel
          title="Revenue Trend"
          subtitle="Completed appointments (Last 7 Days)"
          icon={TrendingUp}
          iconClass="bg-pink-50 text-pink-500"
          className="xl:col-span-2"
          action={
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] text-slate-400 leading-none">7-day total</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{formatCurrency(weeklyRevenueTotal)}</p>
              </div>
              <ViewAllLink to="/dashboard/sales" label="View Report" />
            </div>
          }
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => (value >= 1000 ? `₱${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : `₱${value}`)}
                />
                <RechartsTooltip
                  cursor={{ stroke: '#f9a8d4', strokeWidth: 1, strokeDasharray: '4 4' }}
                  formatter={(value) => [`₱${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #fce7f3', boxShadow: '0 10px 25px -5px rgb(236 72 153 / 0.2)', padding: '10px 14px' }}
                  labelStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ec4899"
                  strokeWidth={3}
                  fill="url(#revenueFill)"
                  dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#db2777', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Appointment Status"
          subtitle="Current overview"
          icon={PieChartIcon}
          iconClass="bg-blue-50 text-blue-500"
          className="flex flex-col"
          bodyClassName="p-5 flex-1 flex flex-col"
        >
          {pieTotal === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[220px]">
              <EmptyState icon={PieChartIcon} text="No data available" />
            </div>
          ) : (
            <>
              <div className="relative h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={84}
                      paddingAngle={4}
                      cornerRadius={6}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(15 23 42 / 0.15)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-bold text-slate-800 leading-none">{pieTotal}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Appointments</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs rounded-lg bg-slate-50 px-2.5 py-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600 font-medium">{entry.name}</span>
                    <span className="text-slate-800 font-bold ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* Service performance + Staff performance + QR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        <Panel
          title="Service Performance"
          subtitle="Top performing services"
          icon={Scissors}
          iconClass="bg-pink-50 text-pink-500"
          action={<ViewAllLink to="/dashboard/sales" />}
        >
          {isLoadingPerformance ? (
            <div className="flex items-center justify-center h-48"><Spinner className="border-pink-500" /></div>
          ) : servicePerformance.length === 0 ? (
            <EmptyState icon={Scissors} text="No service data available" />
          ) : (
            <div className="space-y-4">
              {servicePerformance.slice(0, 5).map((service, index) => {
                const maxRevenue = servicePerformance[0]?.totalRevenue || 1;
                const percentage = (service.totalRevenue / maxRevenue) * 100;
                const rank = getRankStyle(index, PINK_RANK_FALLBACK);
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${rank.badge}`}>{index + 1}</div>
                        <p className="text-xs font-semibold text-slate-700 truncate">{service.service_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-slate-800">{formatCurrency(service.totalRevenue)}</p>
                        <p className="text-[10px] text-slate-500">{service.count} booking{service.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full bg-gradient-to-r transition-all duration-700 ${rank.bar}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="Staff Performance"
          subtitle="Top performing staff"
          icon={Users}
          iconClass="bg-emerald-50 text-emerald-500"
          action={<ViewAllLink to="/dashboard/sales" className="text-emerald-600 hover:text-emerald-700" />}
        >
          {isLoadingPerformance ? (
            <div className="flex items-center justify-center h-48"><Spinner className="border-emerald-500" /></div>
          ) : staffPerformance.length === 0 ? (
            <EmptyState icon={Users} text="No staff data available" />
          ) : (
            <div className="space-y-4">
              {staffPerformance.slice(0, 5).map((staff, index) => {
                const maxRevenue = staffPerformance[0]?.totalRevenue || 1;
                const percentage = (staff.totalRevenue / maxRevenue) * 100;
                const initials = staff.staff_name.split(' ').map(n => n[0]).join('').slice(0, 2);
                const rank = getRankStyle(index, GREEN_RANK_FALLBACK);
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${rank.badge}`}>{initials}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700 truncate">{staff.staff_name}</p>
                          <p className="text-[10px] text-slate-500">
                            {staff.appointmentCount} appointment{staff.appointmentCount !== 1 ? 's' : ''}
                            {staff.walkInCount > 0 && ` · ${staff.walkInCount} walk-in${staff.walkInCount !== 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-slate-800">{formatCurrency(staff.totalRevenue)}</p>
                        <p className="text-[10px] text-amber-600 font-semibold">{formatCurrency(staff.totalCommission || 0)} comm.</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full bg-gradient-to-r transition-all duration-700 ${rank.bar}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="Payment QR Code"
          subtitle="Shown to customers for downpayments & balances"
          icon={ImageIcon}
          iconClass="bg-fuchsia-50 text-fuchsia-500"
          className="lg:col-span-2 xl:col-span-1"
          action={
            <button onClick={() => setIsQrModalOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg shadow-sm shadow-pink-500/30 hover:shadow-md transition-all">
              <Upload size={13} /><span>{qrData?.qr_image ? 'Change' : 'Upload'}</span>
            </button>
          }
        >
          {isLoadingQr ? (
            <div className="flex items-center justify-center py-12"><Spinner className="border-pink-500" /></div>
          ) : !qrData?.qr_image ? (
            <div onClick={() => setIsQrModalOpen(true)} className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-pink-200 rounded-2xl bg-pink-50/50 cursor-pointer hover:bg-pink-50 hover:border-pink-300 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3"><ImageIcon size={26} className="text-pink-400" /></div>
              <p className="text-sm font-medium text-pink-600">No QR code uploaded yet</p>
              <p className="text-xs text-slate-500 mt-1">Click to upload one</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative p-4 bg-white rounded-2xl border border-pink-100 shadow-[0_8px_24px_-12px_rgba(236,72,153,0.4)]">
                <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-pink-400 rounded-tl-lg" />
                <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-pink-400 rounded-tr-lg" />
                <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-pink-400 rounded-bl-lg" />
                <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-pink-400 rounded-br-lg" />
                <img src={qrData.qr_image} alt="Payment QR" className="w-40 h-40 object-contain" />
              </div>
              <div className="mt-4 text-center bg-blue-50/70 border border-blue-100 rounded-xl px-5 py-2">
                <p className="text-[10px] text-slate-500">GCash Number</p>
                <p className="text-sm font-bold text-slate-800 tracking-wider">{qrData.gcash_number || 'Not set'}</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Top customers */}
      <Panel
        title="Top Customers"
        subtitle="Most frequent customers"
        icon={Users}
        iconClass="bg-yellow-50 text-yellow-500"
        action={<ViewAllLink to="/dashboard/sales" className="text-yellow-600 hover:text-yellow-700" />}
      >
        {isLoadingPerformance ? (
          <div className="flex items-center justify-center h-48"><Spinner className="border-yellow-500" /></div>
        ) : frequentCustomers.length === 0 ? (
          <EmptyState icon={User} text="No customer data available" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {frequentCustomers.map((customer, index) => (
              <div
                key={customer.name}
                className={`relative p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200'
                  : index === 1 ? 'bg-gradient-to-br from-slate-50 to-slate-100/60 border-slate-200'
                  : index === 2 ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-amber-200'
                  : 'bg-white border-slate-100'
                }`}
              >
                {index < 3 && (
                  <Award
                    size={16}
                    className={`absolute top-3 right-3 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : 'text-amber-600'}`}
                  />
                )}
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500'
                  : index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                  : index === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                  : 'bg-gradient-to-br from-pink-400 to-pink-500'
                }`}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate mt-3">{customer.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-blue-50 text-blue-600 rounded-full px-1.5 py-0.5">
                    <Calendar size={9} />{customer.appointmentCount} appt{customer.appointmentCount !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 rounded-full px-1.5 py-0.5">
                    <Users size={9} />{customer.walkInCount} walk-in{customer.walkInCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-emerald-600 font-bold mt-1.5">{formatCurrency(customer.totalSpent)}</p>
                <p className="text-[10px] text-slate-400 mt-1">Last: {formatDate(customer.lastVisit)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Recent completed appointments */}
      <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><CheckCircle size={17} className="text-blue-500" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Recent Completed Appointments</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Latest customer bookings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search..." className="pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent w-40 transition-all" />
            </div>
            <Link to="/dashboard/appointments" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-sm shadow-pink-500/30 hover:shadow-md transition-all text-xs font-semibold">
              <Eye size={13} /><span>View All</span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="6" className="px-5 py-4"><div className="h-4 rounded-lg bg-slate-100 animate-pulse" /></td>
                  </tr>
                ))
              ) : recentCompletedAppointments.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-10"><EmptyState icon={Calendar} text="No completed appointments found" /></td></tr>
              ) : (
                recentCompletedAppointments.map((appointment) => {
                  const feedback = getFeedbackForAppointment(appointment.id) || getFeedbackForAppointment(appointment.appointment_id);
                  const serviceNames = (appointment.services || []).map(s => s.service_name).join(' + ') || 'N/A';
                  return (
                    <tr key={appointment.id} onClick={() => handleAppointmentClick(appointment)} className="hover:bg-pink-50/40 transition-colors duration-200 group cursor-pointer">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center text-pink-700 text-xs font-bold group-hover:scale-110 transition-transform">
                            {(appointment.customer_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <p className="text-xs font-semibold text-slate-800">{appointment.customer_name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><Scissors size={12} className="text-slate-400" /><span className="text-xs text-slate-600 truncate max-w-[220px]">{serviceNames}</span></div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap"><span className="text-xs text-slate-600">{formatDate(appointment.appointment_date)}</span></td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400" /><span className="text-xs text-slate-600">{formatTime(appointment.appointment_time)}</span></div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap"><StatusPill status={appointment.status} /></td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {feedback ? (
                          <span className="inline-flex items-center gap-1 bg-yellow-50 border border-yellow-100 rounded-full px-2 py-0.5">
                            <Star size={11} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-semibold text-slate-700">{feedback.rating}</span>
                          </span>
                        ) : (<span className="text-xs text-slate-400">No rating</span>)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">Showing {recentCompletedAppointments.length} of {dashboardStats.totalAppointments} appointments</p>
          <ViewAllLink to="/dashboard/appointments" />
        </div>
      </section>
    </div>
  );

  // ───────────────────────────────────────────────────────────
  // Layout
  // ───────────────────────────────────────────────────────────
  const pageTitle =
    isAppointmentsRoute ? 'Appointments' :
    isServicesRoute ? 'Services' :
    isEmployeesRoute ? 'Employees' :
    isInventoryRoute ? 'Inventory' :
    isProductsRoute ? 'Products' :
    isReportsRoute ? 'Incidents' :
    isSalesRoute ? 'Income' :
    isInventoryReportsRoute ? 'Inventory Reports' :
    isRemittancesRoute ? 'Remittances' :
    isSettingsRoute ? 'Settings' :
    isDashboardRoute ? 'Dashboard' : '';

  const pageSubtitle =
    isAppointmentsRoute ? 'Manage and schedule client appointments' :
    isServicesRoute ? 'Browse and manage salon services' :
    isEmployeesRoute ? 'Manage your team members' :
    isInventoryRoute ? 'Track and manage salon inventory' :
    isProductsRoute ? 'Manage salon products' :
    isReportsRoute ? 'View and manage incident reports' :
    isSalesRoute ? 'View income performance and revenue statistics' :
    isInventoryReportsRoute ? 'View inventory usage and stock reports' :
    isRemittancesRoute ? 'View remittance records and history' :
    isSettingsRoute ? 'Manage your personal account details' :
    isDashboardRoute ? "Welcome back! Here's your overview" : '';

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50/40">
      {showModal && <AppointmentModal />}
      <QrCodeModal open={isQrModalOpen} qrData={qrData} onClose={handleQrClose} onUploaded={handleQrUploaded} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={closeSidebar} />}

      {/* ── Sidebar ── */}
      <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-white border-r border-slate-200/70 shadow-xl lg:shadow-none flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-pink-100 flex-shrink-0 flex items-center justify-center">
                <img src={ROHSLogo} alt="Reshel Oco Hair Salon" className="w-full h-full object-contain p-0.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold bg-gradient-to-r from-pink-600 to-fuchsia-500 bg-clip-text text-transparent leading-tight truncate">Reshel Oco</h2>
                <p className="text-[10px] text-slate-500 leading-tight tracking-wide">Hair Salon</p>
              </div>
            </div>
            <button onClick={closeSidebar} className="lg:hidden flex-shrink-0 p-1 rounded-lg hover:bg-slate-100 transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="p-3 bg-gradient-to-r from-pink-50 to-fuchsia-50 border border-pink-100/70 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-xs font-bold">
                  {user?.first_name?.charAt(0) || <Crown size={13} />}{user?.last_name?.charAt(0) || ''}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500">Logged in as</p>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Owner'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <NavGroupLabel>Overview</NavGroupLabel>
          <div className="space-y-0.5">
            <NavItem to="/dashboard" icon={Activity} label="Dashboard" active={isDashboardRoute} onClick={closeSidebar} />
          </div>

          <NavGroupLabel>Manage</NavGroupLabel>
          <div className="space-y-0.5">
            <NavItem to="/dashboard/appointments" icon={Calendar} label="Appointments" active={isAppointmentsRoute} onClick={closeSidebar} />
            <NavItem to="/dashboard/services" icon={Scissors} label="Services" active={isServicesRoute} onClick={closeSidebar} />
            <NavItem to="/dashboard/inventory" icon={Package} label="Inventory" active={isInventoryRoute} onClick={closeSidebar} />
            <NavItem to="/dashboard/products" icon={Box} label="Products" active={isProductsRoute} onClick={closeSidebar} />
            <NavItem to="/dashboard/employees" icon={Users} label="Employees" active={isEmployeesRoute} onClick={closeSidebar} />
            <NavItem to="/dashboard/reports" icon={FileText} label="Incidents" active={isReportsRoute} onClick={closeSidebar} />
          </div>

          <NavGroupLabel>Finance</NavGroupLabel>
          <div>
            <button
              onClick={() => setTransactionsOpen(!transactionsOpen)}
              className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm ${
                isAnyTransactionsRoute
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100/70 text-pink-600 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {isAnyTransactionsRoute && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-pink-500 to-pink-600" />}
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isAnyTransactionsRoute ? 'bg-white text-pink-600 shadow-sm' : 'bg-slate-100/80 text-slate-500 group-hover:bg-white'
              }`}><BarChart3 size={16} /></span>
              <span className="flex-1 text-left">Transactions</span>
              <ChevronDown size={16} className={`transition-transform duration-200 ${transactionsOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${transactionsOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <div className="ml-6 pl-3 border-l-2 border-pink-200 space-y-0.5">
                <NavItem compact to="/dashboard/sales" glyph="₱" label="Income" active={isSalesRoute} onClick={closeSidebar} />
                <NavItem compact to="/dashboard/inventoryReports" icon={Package} label="Inventory Reports" active={isInventoryReportsRoute} onClick={closeSidebar} />
                <NavItem compact to="/dashboard/remittances" glyph="₱" label="Remittances" active={isRemittancesRoute} onClick={closeSidebar} />
              </div>
            </div>
          </div>

          <NavGroupLabel>Account</NavGroupLabel>
          <div className="space-y-0.5 pb-2">
            <NavItem to="/dashboard/settings" icon={Settings} label="Settings" active={isSettingsRoute} onClick={closeSidebar} />
          </div>
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-medium">
            <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><LogOut size={16} /></span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="lg:pl-64">
        <header className="bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-10 border-b border-slate-200/70">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors"><Menu size={20} className="text-slate-600" /></button>
                <div>
                  <h1 className="text-lg font-bold text-slate-800 leading-tight">{pageTitle}</h1>
                  <p className="text-xs text-slate-500 hidden sm:block">{pageSubtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative">
                  <button onClick={() => setNotificationsOpen((v) => !v)} className={`relative p-2 rounded-xl transition-colors ${notificationsOpen ? 'bg-pink-50 text-pink-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                    <Bell size={19} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-br from-red-500 to-pink-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setNotificationsOpen(false)} />
                      <div className="absolute right-0 mt-2 w-96 max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-100 z-30 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50/70 to-white">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                            {unreadCount > 0 && <span className="text-[10px] font-bold text-pink-600 bg-pink-100 rounded-full px-1.5 py-0.5">{unreadCount} new</span>}
                          </div>
                          {unreadCount > 0 && (<button onClick={handleMarkAllAsRead} className="text-[11px] text-pink-600 hover:text-pink-700 font-semibold">Mark all as read</button>)}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <EmptyState icon={Bell} text="No notifications yet" />
                          ) : (
                            notifications.slice(0, 20).map((n) => {
                              const data = n.data ?? n; const isUnread = !n.read_at; const IconComponent = getNotificationIcon(data.type || n.type);
                              return (
                                <button key={n.id} onClick={() => handleNotificationClick(n)} className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-pink-50/40 transition-colors ${isUnread ? 'bg-pink-50/30' : ''}`}>
                                  <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isUnread ? 'bg-pink-100' : 'bg-slate-100'}`}>
                                      <IconComponent size={16} className={isUnread ? 'text-pink-600' : 'text-slate-500'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className={`text-xs truncate ${isUnread ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>{data.title || 'Notification'}</p>
                                        {isUnread && (<span className="mt-1 w-2 h-2 bg-pink-500 rounded-full flex-shrink-0" />)}
                                      </div>
                                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{data.message || ''}</p>
                                      <p className="text-[10px] text-slate-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'}</p>
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 text-center">
                            <button onClick={() => setNotificationsOpen(false)} className="text-[11px] text-slate-500 hover:text-slate-700 font-medium">Close</button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
                  <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center shadow-sm ring-2 ring-pink-100">
                    <span className="text-white text-xs font-semibold">{user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}</span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.first_name} {user?.last_name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {isSettingsRoute ? renderSettingsContent() : isNestedRoute ? <Outlet /> : renderDashboardContent()}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;