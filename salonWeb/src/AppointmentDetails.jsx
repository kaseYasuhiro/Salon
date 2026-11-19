import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, Mail, Calendar as CalendarIcon,
  Clock, Scissors, CheckCircle, XCircle, AlertCircle,
  Image as ImageIcon, RefreshCw, FileText, Eye, Search, X,
} from 'lucide-react';
import api from '../api/axios';

// ─────────────────────────────────────────────────────────────
// Design tokens (mirrors Dashboard.jsx)
// ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  confirmed: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Confirmed' },
  pending:   { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Pending' },
  completed: { pill: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Completed' },
  cancelled: { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Cancelled' },
};

const PAYMENT_STYLES = {
  full:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  unpaid:  'bg-red-50 text-red-700 border-red-200',
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || { pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function PaymentPill({ variant }) {
  const map = {
    full:    { label: 'PAID IN FULL', cls: PAYMENT_STYLES.full },
    partial: { label: 'PARTIAL', cls: PAYMENT_STYLES.partial },
    unpaid:  { label: 'UNPAID', cls: PAYMENT_STYLES.unpaid },
  };
  const v = map[variant] || map.unpaid;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${v.cls}`}>
      {v.label}
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

function InfoCard({ icon: Icon, iconClass = 'text-pink-500', title, children }) {
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
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const accent =
    type === 'success' ? { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600' } :
    type === 'warning' ? { bar: 'bg-amber-500', icon: 'bg-amber-100 text-amber-600' } :
    type === 'info' ? { bar: 'bg-blue-500', icon: 'bg-blue-100 text-blue-600' } :
    { bar: 'bg-red-500', icon: 'bg-red-100 text-red-600' };
  const Icon = type === 'success' ? CheckCircle : type === 'warning' ? AlertCircle : type === 'info' ? AlertCircle : XCircle;

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
// Helpers (unchanged logic)
// ─────────────────────────────────────────────────────────────
const getPaymentTypeLabel = (paymentType) => {
  if (!paymentType) return 'N/A';
  if (paymentType === 'full') return 'Full Payment';
  if (paymentType === 'downpayment') return 'Downpayment (50%)';
  if (paymentType === 'remaining') return 'Remaining Balance';
  return paymentType;
};

const computePaymentTotals = (appointment) => {
  const grandTotal = appointment.billing_total_amount ?? appointment.total_price ?? 0;
  const paymentType = appointment.billing_payment_type;

  const hasBillingPaid = appointment.billing_paid_amount != null;
  const hasBillingBalance = appointment.billing_balance != null;

  let paidAmount;
  if (hasBillingPaid) paidAmount = Number(appointment.billing_paid_amount);
  else paidAmount = paymentType === 'full' ? grandTotal : grandTotal / 2;

  let balance;
  if (hasBillingBalance) balance = Number(appointment.billing_balance);
  else balance = grandTotal - paidAmount;

  if (Math.abs(balance) < 0.01) balance = 0;

  const isFullyPaid = grandTotal > 0 && balance <= 0;
  const isPartial = !isFullyPaid && paidAmount > 0;
  const isUnpaid = !isFullyPaid && paidAmount <= 0;

  return { grandTotal, paymentType, paidAmount, balance, isFullyPaid, isPartial, isUnpaid };
};

// ─────────────────────────────────────────────────────────────
// Cancel Modal
// ─────────────────────────────────────────────────────────────
const CancelModal = ({ showCancelModal, cancelFormData, setCancelFormData, isProcessingCancel, handleCancel, resetCancelForm, setShowCancelModal }) => {
  if (!showCancelModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="relative bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4 flex items-center justify-between overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <XCircle size={18} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Cancel Appointment</h2>
          </div>
          <button
            onClick={() => { setShowCancelModal(false); resetCancelForm(); }}
            className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCancel} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Cancellation Reason <span className="text-pink-500">*</span></label>
            <textarea
              value={cancelFormData.cancellation_reason}
              onChange={(e) => setCancelFormData(prev => ({ ...prev, cancellation_reason: e.target.value }))}
              rows="4"
              className={`${inputClass} resize-none`}
              placeholder="Provide a reason for cancelling this appointment..."
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">This reason will be visible to the customer</p>
          </div>

          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700">
                <span className="font-semibold">Note:</span> This action will cancel the appointment. This cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => { setShowCancelModal(false); resetCancelForm(); }}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessingCancel}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 rounded-xl shadow-md shadow-red-500/25 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {isProcessingCancel ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Cancel Appointment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Payment Proof Modal
// ─────────────────────────────────────────────────────────────
const PaymentProofModal = ({ selectedPaymentData, setSelectedPaymentData, setShowPaymentProofModal }) => {
  if (!selectedPaymentData) return null;

  const { payment_method, payment_proof, billing } = selectedPaymentData;
  const appointment_id = billing?.appointment_id || 'N/A';
  const total_amount = billing?.total_amount || '0.00';
  const paid_amount = billing?.paid_amount || '0.00';
  const balance = billing?.balance || '0.00';
  const payment_type = billing?.payment_type || null;

  const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.100.73:8000/api';
  const BASE_URL = API_URL.replace(/\/api\/?$/, '');
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/storage/')) return `${BASE_URL}${path}`;
    return `${BASE_URL}/storage/${path}`;
  };
  const proofUrl = getImageUrl(payment_proof);

  const { isFullyPaid, isPartial } = computePaymentTotals({
    id: appointment_id,
    total_price: parseFloat(total_amount) || 0,
    billing_total_amount: parseFloat(total_amount) || 0,
    billing_paid_amount: parseFloat(paid_amount) || 0,
    billing_balance: parseFloat(balance) || 0,
    billing_payment_type: payment_type,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between overflow-hidden flex-shrink-0">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <ImageIcon size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Payment Proof</h2>
              <p className="text-[11px] text-pink-100">Appointment #{appointment_id}</p>
            </div>
          </div>
          <button
            onClick={() => { setShowPaymentProofModal(false); setSelectedPaymentData(null); }}
            className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] text-slate-500">Appointment ID</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">#{appointment_id}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Payment Type</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{getPaymentTypeLabel(payment_type)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Total Amount</p>
                <p className="text-sm font-bold text-pink-600 mt-0.5">₱{parseFloat(total_amount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Payment Method</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{payment_method || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-200/70">
              <div>
                <p className="text-[11px] text-slate-500">Paid</p>
                <p className="text-sm font-semibold text-emerald-600 mt-0.5">₱{parseFloat(paid_amount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Balance</p>
                <p className={`text-sm font-semibold mt-0.5 ${parseFloat(balance) > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                  ₱{parseFloat(balance).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Status</p>
                <div className="mt-1">
                  {isFullyPaid ? <PaymentPill variant="full" /> : isPartial ? <PaymentPill variant="partial" /> : <PaymentPill variant="unpaid" />}
                </div>
              </div>
            </div>

            {isFullyPaid && (
              <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" />
                <span className="text-emerald-700 text-xs font-semibold">Fully paid — no balance remaining</span>
              </div>
            )}
          </div>

          {proofUrl ? (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-700 mb-2">Payment Proof Screenshot</p>
              <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 h-80 flex items-center justify-center">
                <img
                  src={proofUrl}
                  alt="Payment Proof"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const parent = e.target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="flex flex-col items-center justify-center p-8">
                          <p class="text-slate-500 text-sm">Failed to load image</p>
                          <p class="text-slate-400 text-xs mt-1 break-all">${proofUrl}</p>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 rounded-xl p-8 text-center mb-4 h-64 flex flex-col items-center justify-center">
              <FileText size={48} className="text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No payment proof uploaded</p>
            </div>
          )}

          <button
            onClick={() => { setShowPaymentProofModal(false); setSelectedPaymentData(null); }}
            className="w-full py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Reschedule Modal
// ─────────────────────────────────────────────────────────────
const RescheduleModal = ({ showRescheduleModal, rescheduleFormData, setRescheduleFormData, isRescheduling, isLoadingDates, openScheduleDates, handleReschedule, resetRescheduleForm, setShowRescheduleModal, formatDate }) => {
  if (!showRescheduleModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <CalendarIcon size={18} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Reschedule Appointment</h2>
          </div>
          <button
            onClick={() => { setShowRescheduleModal(false); resetRescheduleForm(); }}
            className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleReschedule} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>New Date <span className="text-pink-500">*</span></label>
            {isLoadingDates ? (
              <div className="w-full px-3.5 py-2.5 text-sm text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                Loading available dates...
              </div>
            ) : openScheduleDates.length === 0 ? (
              <div className="w-full px-3.5 py-2.5 text-sm text-amber-600 bg-amber-50 rounded-xl border border-amber-200">
                No future open dates available. Please check business schedule.
              </div>
            ) : (
              <select
                value={rescheduleFormData.appointment_date}
                onChange={(e) => setRescheduleFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                className={inputClass}
                required
              >
                <option value="">Select an available date...</option>
                {openScheduleDates.map((date) => (
                  <option key={date} value={date}>{formatDate(date)}</option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Select a date when the salon is open</p>
          </div>

          <div>
            <label className={labelClass}>New Time <span className="text-pink-500">*</span></label>
            <input
              type="time"
              value={rescheduleFormData.appointment_time}
              onChange={(e) => setRescheduleFormData(prev => ({ ...prev, appointment_time: e.target.value }))}
              className={inputClass}
              step="900"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">Select the new time for this appointment</p>
          </div>

          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700">
                <span className="font-semibold">Note:</span> Rescheduling will update the appointment date and time. The customer will be notified.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => { setShowRescheduleModal(false); resetRescheduleForm(); }}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRescheduling || isLoadingDates || openScheduleDates.length === 0}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {isRescheduling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CalendarIcon size={14} />
                  Reschedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const AppointmentDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDateFiltered, setIsDateFiltered] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [selectedPaymentData, setSelectedPaymentData] = useState(null);
  const [cancelFormData, setCancelFormData] = useState({ appointment_id: '', cancellation_reason: '' });

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleFormData, setRescheduleFormData] = useState({ appointment_date: '', appointment_time: '' });
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [openScheduleDates, setOpenScheduleDates] = useState([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const hideToast = () => setToast(null);

  const fetchOpenScheduleDates = async () => {
    setIsLoadingDates(true);
    try {
      const response = await api.get('/daysched');
      if (Array.isArray(response.data)) {
        const today = new Date().toISOString().split('T')[0];
        const futureOpenDates = response.data
          .filter(schedule => schedule.is_open === 1 && schedule.business_date >= today)
          .map(schedule => schedule.business_date)
          .sort();
        setOpenScheduleDates(futureOpenDates);
      }
    } catch {
      showToast('Failed to fetch available dates', 'error');
    } finally {
      setIsLoadingDates(false);
    }
  };

  const fetchAllAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/all-appointments');
      if (Array.isArray(response.data)) {
        const appointmentMap = new Map();

        response.data.forEach((transaction) => {
          const appointmentId = transaction.appointment_id;
          if (!appointmentMap.has(appointmentId)) {
            appointmentMap.set(appointmentId, {
              id: appointmentId,
              appointment_id: appointmentId,
              customer_name: transaction.customer_name || 'Walk-in Customer',
              customer_phone: transaction.customer_phone || 'N/A',
              customer_email: transaction.customer_email || 'N/A',
              appointment_date: transaction.appointment_date,
              appointment_time: transaction.appointment_time,
              status: transaction.status || 'pending',
              assigned_employee_id: transaction.assigned_employee_id,
              assigned_staff_name: transaction.assigned_staff_name || null,
              staff: transaction.staff || null,
              employee_first_name: transaction.employee_first_name || null,
              employee_last_name: transaction.employee_last_name || null,
              services: [],
              total_price: 0,
              total_duration: 0,
              service_names: [],
              created_at: transaction.created_at,
              updated_at: transaction.updated_at,
              billing_total_amount: transaction.billing_total_amount ?? null,
              billing_paid_amount: transaction.billing_paid_amount ?? null,
              billing_balance: transaction.billing_balance ?? null,
              billing_payment_type: transaction.billing_payment_type ?? null,
            });
          }
          const appointment = appointmentMap.get(appointmentId);
          appointment.services.push({
            id: transaction.id,
            service_id: transaction.service_id,
            service_name: transaction.service_name || 'Unknown Service',
            duration_minutes: transaction.duration_minutes || 0,
            price: transaction.price || '0',
            service_status: transaction.service_status || 'pending',
          });
          appointment.total_price += parseFloat(transaction.price || '0');
          appointment.total_duration += parseInt(transaction.duration_minutes || 0);
          appointment.service_names.push(transaction.service_name || 'Unknown Service');
        });

        const groupedAppointments = Array.from(appointmentMap.values()).map((appointment) => {
          let staffName = 'Unassigned';
          if (appointment.assigned_staff_name) staffName = appointment.assigned_staff_name;
          else if (appointment.staff) {
            const full = `${appointment.staff.first_name || ''} ${appointment.staff.last_name || ''}`.trim();
            if (full) staffName = full;
          } else if (appointment.employee_first_name || appointment.employee_last_name) {
            staffName = `${appointment.employee_first_name || ''} ${appointment.employee_last_name || ''}`.trim();
          } else if (appointment.assigned_employee_id) {
            staffName = `Staff ID: ${appointment.assigned_employee_id}`;
          }

          const billingTotal = appointment.billing_total_amount != null && appointment.billing_total_amount > 0
            ? appointment.billing_total_amount : null;
          const grandTotal = billingTotal ?? appointment.total_price;

          return {
            id: appointment.id,
            appointment_id: appointment.appointment_id,
            customer_name: appointment.customer_name,
            customer_phone: appointment.customer_phone,
            customer_email: appointment.customer_email,
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            status: appointment.status,
            assigned_employee_id: appointment.assigned_employee_id,
            staff_name: staffName,
            staff: appointment.staff,
            assigned_staff_name: appointment.assigned_staff_name,
            employee_first_name: appointment.employee_first_name,
            employee_last_name: appointment.employee_last_name,
            services: appointment.services,
            service_names: appointment.service_names,
            base_price: appointment.total_price,
            total_price: grandTotal,
            total_duration: appointment.total_duration,
            service_name: appointment.service_names.join(' + ') || 'No Service',
            duration_minutes: appointment.total_duration,
            price: grandTotal.toString(),
            billing_total_amount: appointment.billing_total_amount,
            billing_paid_amount: appointment.billing_paid_amount,
            billing_balance: appointment.billing_balance,
            billing_payment_type: appointment.billing_payment_type,
            created_at: appointment.created_at,
            updated_at: appointment.updated_at,
          };
        });

        setAppointments(groupedAppointments);

        const queryParams = new URLSearchParams(location.search);
        const dateParam = queryParams.get('date');
        if (dateParam) { setSelectedDate(dateParam); setIsDateFiltered(true); }
        else { setIsDateFiltered(false); setSelectedDate(null); }

        const isListView = window.location.pathname === '/dashboard/appointments/list';
        if (id && !isListView) {
          const found = groupedAppointments.find(a => a.id === parseInt(id));
          if (found) { setSelectedAppointment(found); setShowAppointmentDetail(true); }
          else await fetchAppointmentDetail(parseInt(id));
        } else {
          setShowAppointmentDetail(false);
        }
      }
    } catch {
      setError('Failed to fetch appointments');
      showToast('Failed to fetch appointments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointmentDetail = async (appointmentId) => {
    setIsLoadingDetail(true);
    try {
      const response = await api.get(`/appointment/${appointmentId}`);
      setSelectedAppointment(response.data);
      setShowAppointmentDetail(true);
      navigate(`/dashboard/appointments/${appointmentId}`, { replace: true });
    } catch {
      showToast('Failed to fetch appointment details', 'error');
      const found = appointments.find(a => a.id === appointmentId);
      if (found) { setSelectedAppointment(found); setShowAppointmentDetail(true); }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const fetchPaymentProof = async (appointmentId) => {
    try {
      const response = await api.get(`/appointment/payment?appointment_id=${appointmentId}`);
      if (response.data && response.data.length > 0) {
        const payment = response.data.find(p => p.billing?.appointment_id === appointmentId);
        if (payment) { setSelectedPaymentData(payment); setShowPaymentProofModal(true); }
        else showToast('No payment record found for this appointment.', 'warning');
      } else {
        showToast('No payment record found for this appointment.', 'warning');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch payment data', 'error');
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    if (newStatus === 'cancelled') { handleOpenCancelModal(appointmentId); return; }
    setIsUpdating(true);
    try {
      await api.put(`/appointments/update/${appointmentId}`, { status: newStatus });
      showToast(`Appointment ${newStatus === 'confirmed' ? 'confirmed' : 'updated'} successfully!`, 'success');
      await fetchAllAppointments();
      if (selectedAppointment) await fetchAppointmentDetail(appointmentId);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update appointment status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenCancelModal = (appointmentId) => {
    setCancelFormData({ appointment_id: appointmentId, cancellation_reason: '' });
    setShowCancelModal(true);
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    if (!cancelFormData.cancellation_reason.trim()) {
      showToast('Please provide a reason for cancellation', 'warning');
      return;
    }
    setIsProcessingCancel(true);
    try {
      await api.post('/appointment/cancel', {
        appointment_id: cancelFormData.appointment_id,
        cancellation_reason: cancelFormData.cancellation_reason,
      });
      showToast('Appointment cancelled successfully!', 'success');
      setShowCancelModal(false);
      resetCancelForm();
      await fetchAllAppointments();
      if (selectedAppointment) await fetchAppointmentDetail(cancelFormData.appointment_id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to cancel appointment', 'error');
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleFormData.appointment_date) return showToast('Please select a new date', 'warning');
    if (!rescheduleFormData.appointment_time) return showToast('Please select a new time', 'warning');
    setIsRescheduling(true);
    try {
      await api.put(`/appointments/update/${selectedAppointment.id}`, {
        appointment_date: rescheduleFormData.appointment_date,
        appointment_time: rescheduleFormData.appointment_time + ':00',
      });
      showToast('Appointment rescheduled successfully!', 'success');
      setShowRescheduleModal(false);
      resetRescheduleForm();
      await fetchAllAppointments();
      if (selectedAppointment) await fetchAppointmentDetail(selectedAppointment.id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to reschedule appointment', 'error');
    } finally {
      setIsRescheduling(false);
    }
  };

  const resetRescheduleForm = () => {
    setRescheduleFormData({ appointment_date: '', appointment_time: '' });
    setOpenScheduleDates([]);
  };

  const handleOpenRescheduleModal = async () => {
    await fetchOpenScheduleDates();
    setRescheduleFormData({
      appointment_date: selectedAppointment?.appointment_date || '',
      appointment_time: selectedAppointment?.appointment_time ? selectedAppointment.appointment_time.slice(0, 5) : '',
    });
    setShowRescheduleModal(true);
  };

  const resetCancelForm = () => {
    setCancelFormData({ appointment_id: '', cancellation_reason: '' });
  };

  const formatTime = (time) => {
    if (!time) return 'TBA';
    const timeParts = time.split(':');
    const hour = parseInt(timeParts[0]);
    const minute = timeParts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const formatDate = (date) => {
    if (!date) return 'TBA';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatShortDate = (date) => {
    if (!date) return 'TBA';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const goBackToList = () => {
    setSelectedAppointment(null);
    setShowAppointmentDetail(false);
    const queryParams = new URLSearchParams(location.search);
    const dateParam = queryParams.get('date');
    if (dateParam) navigate(`/dashboard/appointments/list?date=${dateParam}`);
    else navigate('/dashboard/appointments/list');
  };

  const clearDateFilter = () => {
    setIsDateFiltered(false);
    setSelectedDate(null);
    navigate('/dashboard/appointments/list');
  };

  const getFilteredAppointments = () => {
    if (isDateFiltered && selectedDate) return appointments.filter(app => app.appointment_date === selectedDate);
    return appointments;
  };

  const filteredAppointments = getFilteredAppointments().filter(app => {
    if (selectedStatus !== 'all' && app.status !== selectedStatus) return false;
    if (searchTerm && !app.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (paymentFilter !== 'all') {
      const { isFullyPaid, isPartial, isUnpaid } = computePaymentTotals(app);
      if (paymentFilter === 'full' && !isFullyPaid) return false;
      if (paymentFilter === 'partial' && !isPartial) return false;
      if (paymentFilter === 'unpaid' && !isUnpaid) return false;
    }
    return true;
  });

  useEffect(() => { fetchAllAppointments(); }, [location.search]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading appointments...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={26} className="text-red-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Failed to load appointments</p>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-sm shadow-pink-500/30 hover:shadow-md transition-all text-xs font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Detail view ──
  if (showAppointmentDetail && selectedAppointment) {
    const isPending = selectedAppointment.status === 'pending';
    const isCancelled = selectedAppointment.status === 'cancelled';
    const isMultipleServices = selectedAppointment.services && selectedAppointment.services.length > 1;
    const services = selectedAppointment.services || [];

    const basePriceSum = selectedAppointment.base_price ?? services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);

    const { grandTotal, paymentType, paidAmount, balance, isFullyPaid, isPartial } = computePaymentTotals(selectedAppointment);
    const hasAdjustments = grandTotal > basePriceSum + 0.01;

    const resolveStaffName = () => {
      if (selectedAppointment.assigned_staff_name) return selectedAppointment.assigned_staff_name;
      if (selectedAppointment.staff) {
        const full = `${selectedAppointment.staff.first_name || ''} ${selectedAppointment.staff.last_name || ''}`.trim();
        if (full) return full;
      }
      if (selectedAppointment.employee_first_name || selectedAppointment.employee_last_name) {
        const full = `${selectedAppointment.employee_first_name || ''} ${selectedAppointment.employee_last_name || ''}`.trim();
        if (full) return full;
      }
      if (selectedAppointment.staff_name && selectedAppointment.staff_name !== 'Unassigned') return selectedAppointment.staff_name;
      if (selectedAppointment.assigned_employee_id) return `Staff ID: ${selectedAppointment.assigned_employee_id}`;
      return 'Unassigned';
    };
    const staffDisplayName = resolveStaffName();

    return (
      <div className="space-y-6">
        {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={goBackToList}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft size={18} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Appointment Details</h1>
              <p className="text-xs text-slate-500">View and manage appointment information</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isFullyPaid && <PaymentPill variant="full" />}
            <StatusPill status={selectedAppointment.status} />
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Customer info */}
            <Panel title="Customer Information" icon={User} iconClass="bg-pink-50 text-pink-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center text-white font-bold shadow-sm">
                  {(selectedAppointment.customer_name || '?').charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-slate-800">{selectedAppointment.customer_name}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" />{selectedAppointment.customer_phone || 'N/A'}</p>
                <p className="flex items-center gap-2 min-w-0"><Mail size={14} className="text-slate-400 flex-shrink-0" /><span className="truncate">{selectedAppointment.customer_email || 'N/A'}</span></p>
                <p className="flex items-center gap-2"><User size={14} className="text-slate-400" />{staffDisplayName}</p>
              </div>
            </Panel>

            {/* Service details */}
            <Panel title="Service Details" icon={Scissors} iconClass="bg-pink-50 text-pink-500">
              {isMultipleServices ? (
                <div className="space-y-3">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{service.service_name}</p>
                        <p className="text-[10px] text-slate-500">{service.duration_minutes} mins</p>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">₱{parseFloat(service.price).toLocaleString()}</p>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-600">Subtotal (Base Price)</p>
                    <p className="text-xs font-semibold text-slate-700">₱{basePriceSum.toLocaleString()}</p>
                  </div>

                  {hasAdjustments && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-purple-600">Hair Adjustments</p>
                      <p className="text-xs font-semibold text-purple-600">+₱{(grandTotal - basePriceSum).toLocaleString()}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t-2 border-pink-200">
                    <p className="text-sm font-bold text-slate-800">Grand Total</p>
                    <p className="text-lg font-bold text-pink-600">₱{grandTotal.toLocaleString()}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">Total Duration</p>
                    <p className="text-xs font-medium text-slate-700">{selectedAppointment.total_duration} mins</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-800">{selectedAppointment.service_name}</p>
                    <p className="text-xs font-semibold text-slate-700">₱{parseFloat(selectedAppointment.price || '0').toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">Duration</p>
                    <p className="text-xs font-medium text-slate-700">{selectedAppointment.duration_minutes} mins</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <p className="text-sm font-bold text-slate-800">Total</p>
                    <p className="text-lg font-bold text-pink-600">₱{grandTotal.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </Panel>

            {/* Payment summary */}
            <Panel
              title="Payment Summary"
              icon={null}
              action={isFullyPaid ? <PaymentPill variant="full" /> : null}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-600">Total Amount</span>
                  <span className="text-sm font-bold text-slate-800">₱{grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-600">Amount Paid</span>
                  <span className="text-sm font-semibold text-emerald-600">₱{paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-600">Remaining Balance</span>
                  <span className={`text-sm font-semibold ${balance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {balance > 0 ? `₱${balance.toLocaleString()}` : '₱0.00'}
                  </span>
                </div>
                {paymentType && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-600">Payment Type</span>
                    <span className="text-xs font-semibold text-slate-800">{getPaymentTypeLabel(paymentType)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-600">Payment Status</span>
                  <PaymentPill variant={isFullyPaid ? 'full' : isPartial ? 'partial' : 'unpaid'} />
                </div>
              </div>
            </Panel>

            {/* Appointment details */}
            <Panel title="Appointment Details" icon={CalendarIcon} iconClass="bg-pink-50 text-pink-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-slate-500">Date</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{formatDate(selectedAppointment.appointment_date)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Time</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{formatTime(selectedAppointment.appointment_time)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Status</p>
                  <div className="mt-1"><StatusPill status={selectedAppointment.status} /></div>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Appointment ID</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">#{selectedAppointment.id}</p>
                </div>
              </div>
            </Panel>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <Panel title="Actions" icon={CheckCircle} iconClass="bg-pink-50 text-pink-500">
              {isPending && (
                <div className="space-y-2.5">
                  <button
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'confirmed')}
                    disabled={isUpdating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/25 hover:shadow-lg disabled:opacity-50 transition-all text-xs font-semibold"
                  >
                    {isUpdating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={16} />}
                    Approve & Confirm
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'cancelled')}
                    disabled={isUpdating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl shadow-md shadow-red-500/25 hover:shadow-lg disabled:opacity-50 transition-all text-xs font-semibold"
                  >
                    <XCircle size={16} />
                    Cancel Appointment
                  </button>
                  <button
                    onClick={handleOpenRescheduleModal}
                    disabled={isUpdating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50 transition-all text-xs font-semibold"
                  >
                    <CalendarIcon size={16} />
                    Reschedule
                  </button>
                </div>
              )}

              {!isPending && !isCancelled && (
                <div className="space-y-2.5">
                  <div className="text-center py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-600">
                      {selectedAppointment.status === 'confirmed' ? 'This appointment has been confirmed'
                        : selectedAppointment.status === 'completed' ? 'This appointment has been completed' : ''}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">No further actions available</p>
                  </div>
                  <button
                    onClick={handleOpenRescheduleModal}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg transition-all text-xs font-semibold"
                  >
                    <CalendarIcon size={16} />
                    Reschedule
                  </button>
                </div>
              )}

              {isCancelled && (
                <div className="text-center py-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-xs font-semibold text-red-600">This appointment has been cancelled</p>
                </div>
              )}

              <button
                onClick={() => fetchPaymentProof(selectedAppointment.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all text-xs font-semibold mt-2.5"
              >
                <ImageIcon size={16} />
                View Payment Proof
              </button>
            </Panel>

            <Panel title="Quick Stats" icon={RefreshCw} iconClass="bg-pink-50 text-pink-500">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Total Amount</span>
                  <span className="text-sm font-bold text-pink-600">₱{grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Paid</span>
                  <span className="text-sm font-semibold text-emerald-600">₱{paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Balance</span>
                  <span className={`text-sm font-semibold ${balance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                    ₱{balance.toLocaleString()}
                  </span>
                </div>
                {paymentType && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Payment</span>
                    <span className={`text-[11px] font-semibold ${isFullyPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isFullyPaid ? 'Paid in Full' : isPartial ? 'Partial' : 'Unpaid'}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Services</span>
                  <span className="text-xs font-medium text-slate-700">{services.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Staff Assigned</span>
                  <span className="text-xs font-medium text-slate-700">{staffDisplayName}</span>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <PaymentProofModal selectedPaymentData={selectedPaymentData} setSelectedPaymentData={setSelectedPaymentData} setShowPaymentProofModal={setShowPaymentProofModal} />
        <CancelModal
          showCancelModal={showCancelModal}
          cancelFormData={cancelFormData}
          setCancelFormData={setCancelFormData}
          isProcessingCancel={isProcessingCancel}
          handleCancel={handleCancel}
          resetCancelForm={resetCancelForm}
          setShowCancelModal={setShowCancelModal}
        />
        <RescheduleModal
          showRescheduleModal={showRescheduleModal}
          rescheduleFormData={rescheduleFormData}
          setRescheduleFormData={setRescheduleFormData}
          isRescheduling={isRescheduling}
          isLoadingDates={isLoadingDates}
          openScheduleDates={openScheduleDates}
          handleReschedule={handleReschedule}
          resetRescheduleForm={resetRescheduleForm}
          setShowRescheduleModal={setShowRescheduleModal}
          formatDate={formatDate}
        />
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-md">
            <CalendarIcon size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {isDateFiltered && selectedDate ? `Appointments for ${formatDate(selectedDate)}` : 'All Appointments'}
            </h2>
            <p className="text-xs text-slate-500">
              {isDateFiltered && selectedDate ? `Showing appointments for ${formatDate(selectedDate)}` : 'View and manage all appointments'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isDateFiltered && (
            <button
              onClick={clearDateFilter}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all text-xs font-semibold"
            >
              <X size={14} />
              Clear Filter
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-sm shadow-pink-500/30 hover:shadow-md transition-all text-xs font-semibold"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: filteredAppointments.length, color: 'text-slate-800', bg: 'from-slate-500 to-slate-600', icon: CalendarIcon },
          { label: 'Pending', value: filteredAppointments.filter(a => a.status === 'pending').length, color: 'text-amber-600', bg: 'from-amber-500 to-amber-600', icon: AlertCircle },
          { label: 'Confirmed', value: filteredAppointments.filter(a => a.status === 'confirmed').length, color: 'text-emerald-600', bg: 'from-emerald-500 to-emerald-600', icon: CheckCircle },
          { label: 'Paid in Full', value: filteredAppointments.filter(a => computePaymentTotals(a).isFullyPaid).length, color: 'text-pink-600', bg: 'from-pink-500 to-fuchsia-600', icon: CheckCircle },
        ].map(({ label, value, bg, icon: Icon }) => (
          <div key={label} className="group relative bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition-all duration-300 p-4 overflow-hidden">
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.08] bg-gradient-to-br ${bg} group-hover:scale-125 transition-transform duration-500`} />
            <div className="relative flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center shadow-md`}>
                <Icon size={18} className="text-white" />
              </div>
            </div>
            <p className="relative text-xs font-medium text-slate-500 mt-3">{label}</p>
            <p className="relative text-2xl font-bold text-slate-800 mt-0.5 tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent w-52 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex bg-slate-100 rounded-xl p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'confirmed', label: 'Confirmed' },
              { key: 'completed', label: 'Completed' },
              { key: 'cancelled', label: 'Cancelled' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedStatus === key ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="inline-flex bg-slate-100 rounded-xl p-1">
            {[
              { key: 'all', label: 'All Pay' },
              { key: 'full', label: 'Full' },
              { key: 'partial', label: 'Partial' },
              { key: 'unpaid', label: 'Unpaid' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPaymentFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  paymentFilter === key ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards grid / empty */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-8">
          <EmptyState
            icon={CalendarIcon}
            title={isDateFiltered ? 'No appointments for this date' : 'No appointments found'}
            subtitle={isDateFiltered ? 'Try selecting a different date' : 'There are no appointments to display'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAppointments.map((appointment) => {
            const isMultipleServices = appointment.services && appointment.services.length > 1;
            const { grandTotal, paidAmount, balance, isFullyPaid, isPartial } = computePaymentTotals(appointment);

            return (
              <div
                key={appointment.id}
                className="bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(236,72,153,0.35)] transition-all duration-300 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-white text-xs font-bold">
                        {(appointment.customer_name || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">{appointment.customer_name}</p>
                      <p className="text-[10px] text-slate-500">{appointment.customer_phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusPill status={appointment.status} />
                    <PaymentPill variant={isFullyPaid ? 'full' : isPartial ? 'partial' : 'unpaid'} />
                  </div>
                </div>

                <div className="px-4 py-3 space-y-2">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Services</p>
                    {isMultipleServices ? (
                      <div className="mt-1 space-y-0.5">
                        {appointment.services.slice(0, 2).map((service, idx) => (
                          <p key={idx} className="text-xs text-slate-700 truncate">• {service.service_name}</p>
                        ))}
                        {appointment.services.length > 2 && (
                          <p className="text-[10px] text-pink-600 font-semibold">+{appointment.services.length - 2} more services</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-700">{appointment.service_name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-slate-600">
                      <CalendarIcon size={12} className="text-slate-400" />
                      <span>{formatShortDate(appointment.appointment_date)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock size={12} className="text-slate-400" />
                      <span>{formatTime(appointment.appointment_time)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500">Total Amount</span>
                    <span className="text-xs font-bold text-pink-600">₱{grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Paid</span>
                    <span className="text-[11px] font-semibold text-emerald-600">₱{paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Balance</span>
                    <span className={`text-[11px] font-semibold ${isFullyPaid ? 'text-emerald-600' : 'text-orange-600'}`}>
                      ₱{balance.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100">
                  <button
                    onClick={() => fetchAppointmentDetail(appointment.id)}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-sm shadow-pink-500/30 hover:shadow-md transition-all text-xs font-semibold"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PaymentProofModal selectedPaymentData={selectedPaymentData} setSelectedPaymentData={setSelectedPaymentData} setShowPaymentProofModal={setShowPaymentProofModal} />
      <CancelModal
        showCancelModal={showCancelModal}
        cancelFormData={cancelFormData}
        setCancelFormData={setCancelFormData}
        isProcessingCancel={isProcessingCancel}
        handleCancel={handleCancel}
        resetCancelForm={resetCancelForm}
        setShowCancelModal={setShowCancelModal}
      />
      <RescheduleModal
        showRescheduleModal={showRescheduleModal}
        rescheduleFormData={rescheduleFormData}
        setRescheduleFormData={setRescheduleFormData}
        isRescheduling={isRescheduling}
        isLoadingDates={isLoadingDates}
        openScheduleDates={openScheduleDates}
        handleReschedule={handleReschedule}
        resetRescheduleForm={resetRescheduleForm}
        setShowRescheduleModal={setShowRescheduleModal}
        formatDate={formatDate}
      />
    </div>
  );
};

export default AppointmentDetails;