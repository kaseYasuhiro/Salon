import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Scissors, Plus, Filter,
  ChevronLeft, ChevronRight, Search,
  User, Clock, Phone, Edit, Trash2, MoreVertical,
  CheckCircle, XCircle, AlertCircle, Eye, X, Save,
  Settings, Clock as ClockIcon, Sun, Moon, Users as UsersIcon,
  Image as ImageIcon, FileText, CreditCard, RefreshCw,
  CalendarClock, CalendarX2, Inbox, Sparkles, TrendingUp,
  ArrowUpRight, ArrowDownRight, Minus, Crown, Award
} from 'lucide-react';
import api from '../api/axios';

// ─────────────────────────────────────────────────────────────
// Design tokens (mirrors Dashboard.jsx)
// ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  confirmed: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700' },
  pending:   { pill: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   soft: 'bg-amber-50 text-amber-700' },
  completed: { pill: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500',    soft: 'bg-blue-50 text-blue-700' },
  cancelled: { pill: 'bg-red-50 text-red-700 border-red-200',           dot: 'bg-red-500',     soft: 'bg-red-50 text-red-700' },
};
const DEFAULT_STATUS = { pill: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400', soft: 'bg-slate-100 text-slate-700' };

const inputClass = (hasError) =>
  `w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50/60 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white focus:border-transparent transition-all ${
    hasError ? 'border-red-300 focus:ring-red-400' : 'border-slate-200 focus:ring-pink-500'
  }`;

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const accent =
    type === 'success' ? { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600', Icon: CheckCircle } :
    type === 'error'   ? { bar: 'bg-red-500',     icon: 'bg-red-100 text-red-600',         Icon: XCircle } :
    type === 'warning' ? { bar: 'bg-amber-500',   icon: 'bg-amber-100 text-amber-600',     Icon: AlertCircle } :
                         { bar: 'bg-blue-500',    icon: 'bg-blue-100 text-blue-600',       Icon: AlertCircle };
  const { bar, icon, Icon } = accent;

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-100 p-3.5 pl-5 flex items-center gap-3 min-w-[300px] max-w-md overflow-hidden">
        <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${bar}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${icon}`}>
          <Icon size={16} />
        </div>
        <span className="text-sm font-medium text-slate-700 flex-1">{message}</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1 flex-shrink-0 transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Small building blocks
// ─────────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const style = STATUS_STYLES[status] || DEFAULT_STATUS;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border capitalize ${style.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
};

const Spinner = ({ className = 'border-pink-500' }) => (
  <div className={`w-6 h-6 border-[3px] border-t-transparent rounded-full animate-spin ${className}`} />
);

// ─────────────────────────────────────────────────────────────
// Cancel/Refund Modal
// ─────────────────────────────────────────────────────────────
const CancelModal = ({
  showCancelModal,
  cancelFormData,
  setCancelFormData,
  isProcessingCancel,
  handleCancelWithRefund,
  resetCancelForm,
  setShowCancelModal,
  clearPendingApproval,
}) => {
  if (!showCancelModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="relative bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4 flex items-center justify-between overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <RefreshCw size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cancel & Refund</h2>
              <p className="text-[11px] text-red-100">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={() => { setShowCancelModal(false); resetCancelForm(); clearPendingApproval?.(); }}
            className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCancelWithRefund} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5">Refund Amount <span className="text-pink-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₱</span>
              <input
                type="number"
                value={cancelFormData.refund_amount}
                onChange={(e) => setCancelFormData(prev => ({ ...prev, refund_amount: parseFloat(e.target.value) || 0 }))}
                className={`${inputClass(false)} pl-8`}
                step="0.01"
                min="0"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Enter the amount to refund to the customer</p>
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5">Refund Method <span className="text-pink-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCancelFormData(prev => ({ ...prev, refund_method: 'cash', reference_number: '' }))}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  cancelFormData.refund_method === 'cash'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'border-slate-200 hover:border-emerald-300 bg-white'
                }`}
              >
                <CreditCard size={18} />
                <span className="font-semibold text-sm">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setCancelFormData(prev => ({ ...prev, refund_method: 'gcash' }))}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  cancelFormData.refund_method === 'gcash'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 hover:border-blue-300 bg-white'
                }`}
              >
                <Phone size={18} />
                <span className="font-semibold text-sm">GCash</span>
              </button>
            </div>
          </div>

          {cancelFormData.refund_method === 'gcash' && (
            <div>
              <label className="block text-slate-700 text-xs font-semibold mb-1.5">Reference Number <span className="text-pink-500">*</span></label>
              <input
                type="text"
                value={cancelFormData.reference_number || ''}
                onChange={(e) => setCancelFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                className={`${inputClass(false)} pl-3`}
                placeholder="e.g. 1234567890123"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Enter the GCash transaction reference number</p>
            </div>
          )}

          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5">Cancellation Reason <span className="text-pink-500">*</span></label>
            <textarea
              value={cancelFormData.cancellation_reason}
              onChange={(e) => setCancelFormData(prev => ({ ...prev, cancellation_reason: e.target.value }))}
              rows="3"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white focus:border-transparent resize-none transition-all"
              placeholder="Provide a reason for cancelling this appointment..."
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">This reason will be visible to the customer</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <span className="font-semibold">Note:</span> This action will cancel the appointment and process a refund. This cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowCancelModal(false); resetCancelForm(); clearPendingApproval?.(); }}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessingCancel}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl shadow-md shadow-red-500/25 hover:shadow-lg transition-all text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessingCancel ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Processing...</>
              ) : (
                <><RefreshCw size={16} />Cancel & Refund</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Reschedule Modal
// ─────────────────────────────────────────────────────────────
const RescheduleModal = ({
  showRescheduleModal,
  rescheduleFormData,
  setRescheduleFormData,
  isRescheduling,
  isLoadingDates,
  openScheduleDates,
  handleReschedule,
  resetRescheduleForm,
  setShowRescheduleModal,
  formatDate,
  clearPendingApproval,
}) => {
  if (!showRescheduleModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <CalendarClock size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Reschedule</h2>
              <p className="text-[11px] text-blue-100">Move this appointment to a new date</p>
            </div>
          </div>
          <button
            onClick={() => { setShowRescheduleModal(false); resetRescheduleForm(); clearPendingApproval?.(); }}
            className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleReschedule} className="p-6 space-y-4">
          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5">New Date <span className="text-pink-500">*</span></label>
            {isLoadingDates ? (
              <div className="w-full px-3.5 py-2.5 text-sm text-slate-400 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <Spinner className="border-blue-500 w-4 h-4 border-2" />Loading dates...
              </div>
            ) : openScheduleDates.length === 0 ? (
              <div className="w-full px-3.5 py-2.5 text-sm text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                No future open dates available. Please check business schedule.
              </div>
            ) : (
              <select
                value={rescheduleFormData.appointment_date}
                onChange={(e) => setRescheduleFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
                required
              >
                <option value="">Select an available date...</option>
                {openScheduleDates.map((date) => (
                  <option key={date} value={date}>{formatDate(date)}</option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Select a date when the salon is open</p>
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5">New Time <span className="text-pink-500">*</span></label>
            <input
              type="time"
              value={rescheduleFormData.appointment_time}
              onChange={(e) => setRescheduleFormData(prev => ({ ...prev, appointment_time: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
              step="900"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">Select the new time for this appointment</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <span className="font-semibold">Note:</span> Rescheduling will update the appointment date and time. The customer will be notified.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowRescheduleModal(false); resetRescheduleForm(); clearPendingApproval?.(); }}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRescheduling || isLoadingDates || openScheduleDates.length === 0}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg transition-all text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isRescheduling ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Processing...</>
              ) : (
                <><Calendar size={16} />Reschedule</>
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
  const payment_type = billing?.payment_type || 'N/A';

  const API_URL = import.meta.env.VITE_API_URL || "http://192.168.100.73:8000/api";
  const BASE_URL = API_URL.replace(/\/api\/?$/, "");
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/storage/")) return `${BASE_URL}${path}`;
    return `${BASE_URL}/storage/${path}`;
  };
  const proofUrl = getImageUrl(payment_proof);

  const bal = parseFloat(balance);
  const statusPill = bal <= 0
    ? { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'PAID IN FULL' }
    : parseFloat(paid_amount) > 0
      ? { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PARTIAL' }
      : { bg: 'bg-red-100', text: 'text-red-700', label: 'UNPAID' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <ImageIcon size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Payment Proof</h2>
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

        <div className="p-6 max-h-[75vh] overflow-y-auto scrollbar-hide">
          <div className={`rounded-xl p-3 mb-4 flex items-center gap-2 border ${
            bal <= 0 ? 'bg-emerald-50 border-emerald-200' : parseFloat(paid_amount) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
          }`}>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${statusPill.bg} ${statusPill.text}`}>
              {statusPill.label}
            </span>
            <span className="text-xs text-slate-600">
              {bal <= 0 ? 'Customer has settled the full amount' : parseFloat(paid_amount) > 0 ? 'Customer still has an outstanding balance' : 'No payment received yet'}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Appointment</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">#{appointment_id}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Payment Type</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 capitalize">{payment_type}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total</p>
                <p className="text-sm font-bold text-pink-600 mt-0.5">₱{parseFloat(total_amount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Method</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{payment_method || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Paid</p>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">₱{parseFloat(paid_amount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Balance</p>
                <p className="text-sm font-bold text-orange-600 mt-0.5">₱{parseFloat(balance).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {proofUrl ? (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">Payment Proof Screenshot</p>
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
            <div className="bg-slate-100 rounded-xl p-8 text-center mb-4 h-64 flex flex-col items-center justify-center border border-dashed border-slate-300">
              <FileText size={40} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No payment proof uploaded</p>
            </div>
          )}

          <button
            onClick={() => { setShowPaymentProofModal(false); setSelectedPaymentData(null); }}
            className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg transition-all text-sm font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Appointment Requests Panel
// ─────────────────────────────────────────────────────────────
const AppointmentRequestsPanel = ({
  appointmentRequests,
  isLoadingRequests,
  processingRequestId,
  onRefresh,
  onApprove,
  onReject,
  formatShortDate,
  formatTime,
}) => {
  const pendingRequests = appointmentRequests.filter(r => r.request_status === 'pending');

  return (
    <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center">
            <Inbox size={17} className="text-pink-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Cancellation / Reschedule Requests</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Customer requests to cancel or reschedule</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200">
            <AlertCircle size={12} />{pendingRequests.length} pending
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoadingRequests}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Refresh requests"
          >
            <RefreshCw size={14} className={isLoadingRequests ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="p-5">
        {isLoadingRequests ? (
          <div className="py-10 flex justify-center"><Spinner /></div>
        ) : pendingRequests.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <Inbox size={26} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">No pending requests</p>
            <p className="text-xs text-slate-400 mt-1">Requests from customers will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => {
              const isCancel = req.request_type === 'cancel';
              const isProcessing = processingRequestId === req.id;

              return (
                <div
                  key={req.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isCancel
                      ? 'border-red-100 bg-red-50/50 hover:border-red-200'
                      : 'border-blue-100 bg-blue-50/50 hover:border-blue-200'
                  }`}
                >
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCancel ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {isCancel ? <CalendarX2 size={18} /> : <CalendarClock size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">
                            {req.customer?.first_name
                              ? `${req.customer.first_name} ${req.customer.last_name}`
                              : req.appointment?.customer_name || 'Customer'}
                          </p>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isCancel ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isCancel ? 'CANCEL' : 'RESCHEDULE'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Appointment #{req.appointment_id}
                          {req.appointment?.appointment_date && (
                            <> · Original: {formatShortDate(req.appointment.appointment_date)} {formatTime(req.appointment.appointment_time)}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {req.created_at
                        ? new Date(req.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>

                  {!isCancel && req.preferred_date && (
                    <div className="mt-3 bg-white rounded-lg p-2.5 border border-blue-100">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Requested new schedule</p>
                      <p className="text-xs font-semibold text-blue-700 mt-0.5">
                        {formatShortDate(req.preferred_date)}
                        {req.preferred_time && ` at ${formatTime(req.preferred_time)}`}
                      </p>
                    </div>
                  )}

                  {req.reason && (
                    <div className="mt-2 bg-white rounded-lg p-2.5 border border-slate-100">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Reason</p>
                      <p className="text-xs text-slate-700 italic mt-0.5">"{req.reason}"</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => onApprove(req)}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-md text-white rounded-lg transition-all text-xs font-semibold disabled:opacity-50 shadow-sm shadow-emerald-500/25"
                    >
                      <CheckCircle size={14} />
                      {isCancel ? 'Approve & Refund' : 'Approve & Reschedule'}
                    </button>
                    <button
                      onClick={() => onReject(req)}
                      disabled={isProcessing}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-semibold disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
function Appointments() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPaymentData, setSelectedPaymentData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDateSchedule, setSelectedDateSchedule] = useState(null);
  const [scheduleFormData, setScheduleFormData] = useState({
    business_date: '',
    open_time: '09:00',
    close_time: '17:00',
    is_open: true
  });
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [businessSchedules, setBusinessSchedules] = useState([]);
  const [assignedStaff, setAssignedStaff] = useState([]);

  const [cancelFormData, setCancelFormData] = useState({
    appointment_id: '',
    payment_id: '',
    cancellation_reason: '',
    refund_method: 'cash',
    refund_amount: 0,
    reference_number: ''
  });
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);

  const [appointmentRequests, setAppointmentRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [pendingApprovalRequestId, setPendingApprovalRequestId] = useState(null);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleFormData, setRescheduleFormData] = useState({
    appointment_date: '',
    appointment_time: ''
  });
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [openScheduleDates, setOpenScheduleDates] = useState([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [rescheduleTargetAppointmentId, setRescheduleTargetAppointmentId] = useState(null);

  const [toast, setToast] = useState(null);

  const [stats, setStats] = useState([
    { label: 'Total Appointments', value: '0', change: '+0%', changeType: 'up', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', icon: Calendar },
    { label: "Today's Appointments", value: '0', change: '+0', changeType: 'up', color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-50', icon: Clock },
    { label: 'Pending Appointments', value: '0', change: '-0', changeType: 'down', color: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-50', icon: AlertCircle },
    { label: 'Completed Appointments', value: '0', change: '+0%', changeType: 'up', color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', icon: CheckCircle },
  ]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const hideToast = useCallback(() => setToast(null), []);

  const getCurrentMonthYear = () => currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToCurrentMonth = () => setCurrentDate(new Date());

  const getTodayStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getDateStrForDay = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const isPastDate = (day) => {
    if (!day) return false;
    return getDateStrForDay(day) < getTodayStr();
  };

  const fetchBusinessSchedules = useCallback(async () => {
    try {
      const response = await api.get('/daysched');
      if (Array.isArray(response.data)) setBusinessSchedules(response.data);
    } catch { showToast('Failed to fetch business schedules', 'error'); }
  }, [showToast]);

  const fetchAssignedStaff = useCallback(async () => {
    try {
      const response = await api.get('/assign');
      if (Array.isArray(response.data)) setAssignedStaff(response.data);
    } catch { showToast('Failed to fetch assigned staff', 'error'); }
  }, [showToast]);

  const fetchStaffList = useCallback(async () => {
    try {
      const response = await api.get('/staff-list');
      if (Array.isArray(response.data)) setStaffList(response.data);
    } catch {
      setStaffList([]);
      showToast('Failed to fetch staff list', 'error');
    }
  }, [showToast]);

  const getAssignedStaffForDate = (businessDateId) =>
    assignedStaff.filter(a => a.business_date_id === businessDateId);

  const getBusinessScheduleId = (dateStr) => {
    const schedule = businessSchedules.find(s => s.business_date === dateStr);
    return schedule?.id || null;
  };

  const getScheduleForDate = (dateStr) => businessSchedules.find(s => s.business_date === dateStr);

  const getDayStatus = (day) => {
    const dateStr = getDateStrForDay(day);
    const schedule = getScheduleForDate(dateStr);
    if (!schedule) return 'default';
    if (!schedule.is_open) return 'closed';
    return 'open';
  };

  const fetchAppointmentRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const response = await api.get('/appointment/requests');
      let data = [];
      if (Array.isArray(response.data)) data = response.data;
      data.sort((a, b) => (b.id - a.id));
      setAppointmentRequests(data);
      return data;
    } catch {
      setAppointmentRequests([]);
      return [];
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  const approveRequestById = useCallback(async (requestId) => {
    try {
      await api.post(`/appointment/requests/approve/${requestId}`);
      await fetchAppointmentRequests();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to approve request', 'error');
    }
  }, [fetchAppointmentRequests, showToast]);

  const handleRejectRequest = useCallback(async (request) => {
    setProcessingRequestId(request.id);
    try {
      await api.post(`/appointment/requests/reject/${request.id}`);
      showToast('Request rejected.', 'success');
      await fetchAppointmentRequests();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to reject request', 'error');
    } finally {
      setProcessingRequestId(null);
    }
  }, [fetchAppointmentRequests, showToast]);

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    try {
      await api.post('/daysched-staff/add', {
        business_date: scheduleFormData.business_date,
        open_time: scheduleFormData.open_time,
        close_time: scheduleFormData.close_time,
        is_open: scheduleFormData.is_open ? 1 : 0,
        staff_ids: selectedStaffIds,
      });
      showToast('Schedule and staff saved successfully!', 'success');
      setShowScheduleModal(false);
      setSelectedDateSchedule(null);
      resetScheduleForm();
      await Promise.all([fetchBusinessSchedules(), fetchAssignedStaff()]);
    } catch (error) {
      showToast(error.response?.data?.message || 'Error saving schedule', 'error');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const fetchPaymentDetails = async (appointmentId) => {
    try {
      const response = await api.get(`/appointment/payment-details/${appointmentId}`);
      return response.data;
    } catch {
      showToast('Failed to fetch payment details', 'error');
      return null;
    }
  };

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

  const handleCancelWithRefund = async (e) => {
    e.preventDefault();

    if (!cancelFormData.cancellation_reason.trim()) return showToast('Please provide a reason for cancellation', 'warning');
    if (!cancelFormData.refund_method) return showToast('Please select a refund method', 'warning');
    if (cancelFormData.refund_amount <= 0) return showToast('Refund amount must be greater than 0', 'warning');
    if (cancelFormData.refund_method === 'gcash' && !cancelFormData.reference_number?.trim()) {
      return showToast('Please enter the reference number', 'warning');
    }

    setIsProcessingCancel(true);
    try {
      await api.post('/appointment/cancel-with-refund', {
        appointment_id: cancelFormData.appointment_id,
        payment_id: cancelFormData.payment_id,
        cancellation_reason: cancelFormData.cancellation_reason,
        refund_method: cancelFormData.refund_method,
        refund_amount: cancelFormData.refund_amount,
        reference_number: cancelFormData.refund_method === 'gcash' ? cancelFormData.reference_number.trim() : null,
        refund_status: 'completed'
      });

      if (pendingApprovalRequestId) {
        await approveRequestById(pendingApprovalRequestId);
        setPendingApprovalRequestId(null);
      }

      showToast('Appointment cancelled and refund processed successfully!', 'success');
      setShowCancelModal(false);
      resetCancelForm();
      await Promise.all([fetchAppointments(), fetchAppointmentRequests()]);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to cancel appointment', 'error');
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const handleOpenCancelModal = async (appointment) => {
    try {
      const paymentData = await fetchPaymentDetails(appointment.appointment_id);
      if (!paymentData) return showToast('No payment record found for this appointment', 'warning');

      const billing = paymentData.billing || {};
      const paidAmount = parseFloat(billing.paid_amount ?? 0);
      const grandTotal = parseFloat(billing.total_amount ?? 0);
      const refundAmount = paidAmount > 0 ? paidAmount : (grandTotal / 2);

      setCancelFormData({
        appointment_id: appointment.appointment_id,
        payment_id: paymentData.id,
        cancellation_reason: '',
        refund_method: 'cash',
        refund_amount: refundAmount,
        reference_number: ''
      });
      setShowCancelModal(true);
    } catch {
      showToast('Failed to load payment details', 'error');
    }
  };

  const resetCancelForm = () => {
    setCancelFormData({
      appointment_id: '',
      payment_id: '',
      cancellation_reason: '',
      refund_method: 'cash',
      refund_amount: 0,
      reference_number: ''
    });
  };

  const handleReschedule = async (e) => {
    e.preventDefault();

    if (!rescheduleFormData.appointment_date) return showToast('Please select a new date', 'warning');
    if (!rescheduleFormData.appointment_time) return showToast('Please select a new time', 'warning');

    let targetId = rescheduleTargetAppointmentId;
    if (pendingApprovalRequestId) {
      const request = appointmentRequests.find(r => r.id === pendingApprovalRequestId);
      if (request?.appointment_id) targetId = request.appointment_id;
    }
    if (!targetId) return showToast('Appointment not found', 'error');

    setIsRescheduling(true);
    try {
      await api.put(`/appointments/update/${targetId}`, {
        appointment_date: rescheduleFormData.appointment_date,
        appointment_time: rescheduleFormData.appointment_time + ':00'
      });

      if (pendingApprovalRequestId) {
        await approveRequestById(pendingApprovalRequestId);
        setPendingApprovalRequestId(null);
      }

      showToast('Appointment rescheduled successfully!', 'success');
      setShowRescheduleModal(false);
      resetRescheduleForm();
      setRescheduleTargetAppointmentId(null);
      await Promise.all([fetchAppointments(), fetchAppointmentRequests()]);
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

  const handleOpenRescheduleModal = async (appointment) => {
    await fetchOpenScheduleDates();
    setRescheduleTargetAppointmentId(appointment.appointment_id);
    setPendingApprovalRequestId(null);
    setRescheduleFormData({
      appointment_date: appointment.appointment_date || '',
      appointment_time: appointment.appointment_time ? appointment.appointment_time.slice(0, 5) : ''
    });
    setShowRescheduleModal(true);
  };

  const handleOpenRescheduleModalForRequest = async (request) => {
    await fetchOpenScheduleDates();
    setRescheduleTargetAppointmentId(request.appointment_id);
    setRescheduleFormData({
      appointment_date: request.preferred_date || '',
      appointment_time: (request.preferred_time || '').slice(0, 5)
    });
    setShowRescheduleModal(true);
  };

  const handleApproveRequest = useCallback(async (request) => {
    setPendingApprovalRequestId(request.id);
    if (request.request_type === 'cancel') {
      const appointment = appointments.find(a => a.appointment_id === request.appointment_id);
      await handleOpenCancelModal(appointment || { appointment_id: request.appointment_id });
    } else if (request.request_type === 'reschedule') {
      await handleOpenRescheduleModalForRequest(request);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/all-appointments');
      if (Array.isArray(response.data)) {
        const staffNameMap = new Map();
        staffList.forEach(staff => staffNameMap.set(staff.id, staff.name));
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
            service_status: transaction.service_status || 'pending'
          });
          appointment.total_price += parseFloat(transaction.price || '0');
          appointment.total_duration += parseInt(transaction.duration_minutes || 0);
          appointment.service_names.push(transaction.service_name || 'Unknown Service');
        });

        const groupedAppointments = Array.from(appointmentMap.values()).map((appointment) => {
          let staffName = 'Unassigned';
          if (appointment.assigned_staff_name) staffName = appointment.assigned_staff_name;
          else if (appointment.staff) {
            const first = appointment.staff.first_name || '';
            const last = appointment.staff.last_name || '';
            const full = `${first} ${last}`.trim();
            if (full) staffName = full;
          } else if (appointment.employee_first_name || appointment.employee_last_name) {
            staffName = `${appointment.employee_first_name || ''} ${appointment.employee_last_name || ''}`.trim();
          } else if (appointment.assigned_employee_id) {
            staffName = staffNameMap.get(appointment.assigned_employee_id) || `Staff ID: ${appointment.assigned_employee_id}`;
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
            updated_at: appointment.updated_at
          };
        });

        setAppointments(groupedAppointments);

        const total = groupedAppointments.length;
        const pending = groupedAppointments.filter(a => a.status === 'pending').length;
        const completed = groupedAppointments.filter(a => a.status === 'completed').length;
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = groupedAppointments.filter(a => a.appointment_date === today).length;

        setStats(prev => [
          { ...prev[0], value: total.toString(), change: `+${total}`, changeType: 'up' },
          { ...prev[1], value: todayAppointments.toString(), change: `+${todayAppointments}`, changeType: 'up' },
          { ...prev[2], value: pending.toString(), change: `${pending}`, changeType: pending > 0 ? 'up' : 'down' },
          { ...prev[3], value: completed.toString(), change: `+${completed}`, changeType: 'up' },
        ]);
      }
    } catch {
      showToast('Failed to fetch appointments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentProof = async (appointmentId) => {
    try {
      const response = await api.get(`/appointment/payment?appointment_id=${appointmentId}`);
      if (response.data && response.data.length > 0) {
        const payment = response.data.find(p => p.billing?.appointment_id === appointmentId);
        if (payment) {
          setSelectedPaymentData(payment);
          setShowPaymentProofModal(true);
        } else showToast('No payment record found for this appointment.', 'warning');
      } else showToast('No payment record found for this appointment.', 'warning');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch payment data', 'error');
    }
  };

  useEffect(() => {
    fetchStaffList();
    fetchBusinessSchedules();
    fetchAssignedStaff();
    fetchAppointmentRequests();
  }, [fetchStaffList, fetchBusinessSchedules, fetchAssignedStaff, fetchAppointmentRequests]);

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffList]);

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getAppointmentsForDay = (day) => {
    if (!day) return [];
    const dateStr = getDateStrForDay(day);
    return appointments.filter(app => app.appointment_date === dateStr);
  };

  const getAppointmentStatusCounts = (day) => {
    const dayAppointments = getAppointmentsForDay(day);
    const counts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    dayAppointments.forEach(app => { if (counts[app.status] !== undefined) counts[app.status]++; });
    return counts;
  };

  const handleDayClick = (day) => {
    const dateStr = getDateStrForDay(day);
    const schedule = getScheduleForDate(dateStr);

    if (isPastDate(day) && !schedule) return;
    if (schedule && schedule.is_open !== 1) return;

    const businessScheduleId = getBusinessScheduleId(dateStr);
    const assignedStaffForDate = businessScheduleId ? getAssignedStaffForDate(businessScheduleId) : [];

    setSelectedDay(day);
    setSelectedDateSchedule({
      date: dateStr,
      schedule,
      businessScheduleId,
      assignedStaff: assignedStaffForDate
    });
    setShowModal(true);
  };

  const handleViewAppointments = () => {
    const dateStr = getDateStrForDay(selectedDay);
    setShowModal(false);
    setSelectedDay(null);
    navigate(`/dashboard/appointments/list?date=${dateStr}`);
  };

  const handleEditSchedule = () => {
    const schedule = getScheduleForDate(selectedDateSchedule.date);
    const businessScheduleId = selectedDateSchedule.businessScheduleId;
    const alreadyAssigned = businessScheduleId
      ? assignedStaff.filter(a => a.business_date_id === businessScheduleId).map(a => a.staff_id)
      : [];

    setScheduleFormData({
      business_date: selectedDateSchedule.date,
      open_time: schedule?.open_time?.substring(0, 5) || '09:00',
      close_time: schedule?.close_time?.substring(0, 5) || '17:00',
      is_open: schedule?.is_open === 1
    });
    setSelectedStaffIds(alreadyAssigned);
    setShowModal(false);
    setShowScheduleModal(true);
  };

  const resetScheduleForm = () => {
    setScheduleFormData({ business_date: '', open_time: '09:00', close_time: '17:00', is_open: true });
    setSelectedStaffIds([]);
  };

  const toggleStaffSelection = (staffId) => {
    setSelectedStaffIds(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const selectAllStaff = () => setSelectedStaffIds(staffList.map(s => s.id));
  const clearAllStaff = () => setSelectedStaffIds([]);

  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
    if (newStatus === 'cancelled') {
      const appointment = appointments.find(a => a.appointment_id === appointmentId);
      if (appointment) await handleOpenCancelModal(appointment);
      return;
    }
    setIsUpdating(true);
    try {
      await api.put(`/appointments/update/${appointmentId}`, { status: newStatus });
      setAppointments(prev => prev.map(app =>
        app.appointment_id === appointmentId ? { ...app, status: newStatus } : app
      ));
      showToast(`Appointment ${newStatus === 'confirmed' ? 'confirmed' : 'updated'} successfully!`, 'success');
      await fetchAppointments();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update appointment status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const calendarDays = generateCalendarDays();

  const getCalendarCellStyle = (status) => {
    const styles = {
      closed: 'bg-red-50 border-red-200 hover:border-red-300',
      open: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300',
      default: 'bg-white border-slate-200 hover:border-pink-300'
    };
    return styles[status] || 'bg-white border-slate-200';
  };

  const getCalendarCellTextColor = (status) => {
    const colors = { closed: 'text-red-700', open: 'text-emerald-700', default: 'text-slate-700' };
    return colors[status] || 'text-slate-700';
  };

  const formatTime = (time) => {
    if (!time) return 'TBA';
    const parts = time.split(':');
    const hour = parseInt(parts[0]);
    const minute = parts[1];
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

  const formatFullDate = (date) => {
    if (!date) return 'TBA';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const filteredAppointments = appointments.filter(app => {
    if (selectedStatus !== 'all' && app.status !== selectedStatus) return false;
    if (searchTerm && !app.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (isLoading && appointments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Spinner className="border-pink-500 w-12 h-12 border-4 mx-auto mb-4" />
          <p className="text-slate-500">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const isNegative = stat.changeType === 'down';
          const isNeutral = stat.change === '+0%' || stat.change === '0%';
          const trendClass = isNeutral
            ? 'bg-slate-100 text-slate-500'
            : isNegative
              ? 'bg-red-50 text-red-600'
              : 'bg-emerald-50 text-emerald-600';
          const TrendIcon = isNeutral ? Minus : isNegative ? ArrowDownRight : ArrowUpRight;

          return (
            <div
              key={index}
              className="group relative bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition-all duration-300 p-5 overflow-hidden"
            >
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.08] bg-gradient-to-br ${stat.color} group-hover:scale-125 transition-transform duration-500`} />
              <div className="relative flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                  <stat.icon size={20} className="text-white" />
                </div>
                <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${trendClass}`}>
                  <TrendIcon size={12} />
                  {stat.change}
                </span>
              </div>
              <p className="relative text-xs font-medium text-slate-500 mt-4">{stat.label}</p>
              <p className="relative text-3xl font-bold text-slate-800 mt-0.5 tracking-tight">{stat.value}</p>
              <div className={`relative mt-3 h-1 rounded-full ${stat.bgColor} overflow-hidden`}>
                <div className={`h-full w-2/3 rounded-full bg-gradient-to-r ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={goToCurrentMonth}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md shadow-pink-500/25 hover:shadow-lg transition-all text-sm font-semibold"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent w-48 transition-all"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Calendar */}
      <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center">
              <Calendar size={17} className="text-pink-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{getCurrentMonthYear()}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Click a day to view appointments or manage schedule</p>
            </div>
          </div>
          <div className="flex gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-emerald-50 rounded border border-emerald-300"></div>
              <span className="text-slate-500">Open</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-red-50 rounded border border-red-300"></div>
              <span className="text-slate-500">Closed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-white rounded border border-slate-200"></div>
              <span className="text-slate-500">No Schedule</span>
            </div>
          </div>
        </header>

        <div className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day, index) => (
              <div key={index} className="text-center font-semibold text-slate-500 text-[10px] uppercase tracking-wider py-1">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="bg-slate-50/50 rounded-xl p-2 min-h-[88px] border border-slate-100"></div>;
              }
              const dayStatus = getDayStatus(day);
              const dayAppointments = getAppointmentsForDay(day);
              const hasAppointments = dayAppointments.length > 0;
              const statusCounts = getAppointmentStatusCounts(day);
              const isClosed = dayStatus === 'closed';
              const isPastWithNoSchedule = isPastDate(day) && dayStatus === 'default';
              const isDisabled = isClosed || isPastWithNoSchedule;

              return (
                <div
                  key={day}
                  onClick={() => !isDisabled && handleDayClick(day)}
                  className={`${getCalendarCellStyle(dayStatus)} rounded-xl p-2 min-h-[88px] border transition-all duration-200 ${
                    isDisabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-bold text-sm ${getCalendarCellTextColor(dayStatus)}`}>{day}</span>
                    {hasAppointments && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {statusCounts.pending > 0 && (
                      <div className="flex items-center gap-0.5 bg-amber-100 rounded-full px-1.5 py-0.5">
                        <AlertCircle size={8} className="text-amber-600" />
                        <span className="text-[8px] font-bold text-amber-700">{statusCounts.pending}</span>
                      </div>
                    )}
                    {statusCounts.confirmed > 0 && (
                      <div className="flex items-center gap-0.5 bg-emerald-100 rounded-full px-1.5 py-0.5">
                        <CheckCircle size={8} className="text-emerald-600" />
                        <span className="text-[8px] font-bold text-emerald-700">{statusCounts.confirmed}</span>
                      </div>
                    )}
                    {statusCounts.completed > 0 && (
                      <div className="flex items-center gap-0.5 bg-blue-100 rounded-full px-1.5 py-0.5">
                        <CheckCircle size={8} className="text-blue-600" />
                        <span className="text-[8px] font-bold text-blue-700">{statusCounts.completed}</span>
                      </div>
                    )}
                    {statusCounts.cancelled > 0 && (
                      <div className="flex items-center gap-0.5 bg-red-100 rounded-full px-1.5 py-0.5">
                        <XCircle size={8} className="text-red-600" />
                        <span className="text-[8px] font-bold text-red-700">{statusCounts.cancelled}</span>
                      </div>
                    )}
                  </div>
                  {hasAppointments && (
                    <div className="space-y-0.5 mt-1.5">
                      <div className="text-[10px] text-slate-600 truncate">
                        {dayAppointments[0]?.customer_name?.split(' ')[0]} · {formatTime(dayAppointments[0]?.appointment_time)}
                      </div>
                      {dayAppointments.length > 1 && (
                        <div className="text-[10px] text-slate-400">+{dayAppointments.length - 1} more</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Requests panel */}
      <AppointmentRequestsPanel
        appointmentRequests={appointmentRequests}
        isLoadingRequests={isLoadingRequests}
        processingRequestId={processingRequestId}
        onRefresh={fetchAppointmentRequests}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        formatShortDate={formatShortDate}
        formatTime={formatTime}
      />

      {/* Day Options Modal */}
      {showModal && selectedDay && (() => {
        const hasSchedule = !!selectedDateSchedule?.schedule;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-4 flex items-center justify-between overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
                <div className="relative">
                  <h2 className="text-lg font-bold text-white">{formatFullDate(selectedDateSchedule?.date)}</h2>
                  <p className="text-[11px] text-pink-100 mt-0.5">Choose an action for this day</p>
                </div>
                <button onClick={() => { setShowModal(false); setSelectedDay(null); }} className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-3">
                {hasSchedule && (
                  <button
                    onClick={handleViewAppointments}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                      <Eye size={18} className="text-blue-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-sm">View Appointments</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">See all appointments for this day</p>
                    </div>
                    <ChevronRight size={16} className="text-blue-400" />
                  </button>
                )}

                {!hasSchedule && (
                  <button
                    onClick={handleEditSchedule}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors border border-purple-100"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                      <Settings size={18} className="text-purple-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-sm">Edit Schedule & Staff</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Set hours and assign staff</p>
                    </div>
                    <ChevronRight size={16} className="text-purple-400" />
                  </button>
                )}
              </div>
              {selectedDateSchedule?.assignedStaff?.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Assigned Staff:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDateSchedule.assignedStaff.map((assignment) => (
                      <span key={assignment.id} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs">
                        <User size={12} />
                        {assignment.user?.first_name} {assignment.user?.last_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh]">
            <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between overflow-hidden sticky top-0 z-10">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Settings size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Schedule & Staff</h2>
                  <p className="text-[11px] text-pink-100">{formatFullDate(scheduleFormData.business_date)}</p>
                </div>
              </div>
              <button onClick={() => { setShowScheduleModal(false); resetScheduleForm(); }} className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSchedule} className="overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(90vh - 76px)' }}>
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Business Hours</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1.5">Open Time <span className="text-pink-500">*</span></label>
                      <input
                        type="time"
                        value={scheduleFormData.open_time}
                        onChange={(e) => setScheduleFormData(prev => ({ ...prev, open_time: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1.5">Close Time <span className="text-pink-500">*</span></label>
                      <input
                        type="time"
                        value={scheduleFormData.close_time}
                        onChange={(e) => setScheduleFormData(prev => ({ ...prev, close_time: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-3">
                    <input
                      type="checkbox"
                      checked={scheduleFormData.is_open}
                      onChange={(e) => setScheduleFormData(prev => ({ ...prev, is_open: e.target.checked }))}
                      className="w-4 h-4 text-pink-500 border-slate-300 rounded focus:ring-pink-500"
                    />
                    <span className="text-slate-700 text-sm font-semibold">Salon open on this day</span>
                  </label>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Staff ({selectedStaffIds.length} selected)</h3>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAllStaff} className="text-[10px] font-semibold text-pink-600 hover:text-pink-700">Select All</button>
                      <span className="text-slate-300">|</span>
                      <button type="button" onClick={clearAllStaff} className="text-[10px] font-semibold text-slate-500 hover:text-slate-700">Clear</button>
                    </div>
                  </div>
                  {staffList.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <UsersIcon size={24} className="text-slate-300 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">No staff members available</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-hide">
                      {staffList.map((staff) => {
                        const isSelected = selectedStaffIds.includes(staff.id);
                        return (
                          <button
                            type="button"
                            key={staff.id}
                            onClick={() => toggleStaffSelection(staff.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                              isSelected ? 'border-pink-500 bg-pink-50 shadow-sm' : 'border-slate-200 bg-white hover:border-pink-200'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-pink-500 border-pink-500' : 'border-slate-300'
                            }`}>
                              {isSelected && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-pink-700' : 'text-slate-800'}`}>{staff.name}</p>
                              {staff.specialties && (
                                <p className="text-[10px] text-slate-500 truncate">
                                  {Array.isArray(staff.specialties) ? staff.specialties.join(', ') : staff.specialties}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-slate-100 px-5 py-3 flex gap-2 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => { setShowScheduleModal(false); resetScheduleForm(); }}
                  className="flex-1 px-3 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg transition-all text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingSchedule ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...</>
                  ) : (
                    <><Save size={14} />Save Schedule</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top-level Modals */}
      <PaymentProofModal
        selectedPaymentData={selectedPaymentData}
        setSelectedPaymentData={setSelectedPaymentData}
        setShowPaymentProofModal={setShowPaymentProofModal}
      />
      <CancelModal
        showCancelModal={showCancelModal}
        cancelFormData={cancelFormData}
        setCancelFormData={setCancelFormData}
        isProcessingCancel={isProcessingCancel}
        handleCancelWithRefund={handleCancelWithRefund}
        resetCancelForm={resetCancelForm}
        setShowCancelModal={setShowCancelModal}
        clearPendingApproval={() => setPendingApprovalRequestId(null)}
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
        clearPendingApproval={() => {
          setPendingApprovalRequestId(null);
          setRescheduleTargetAppointmentId(null);
        }}
      />

      {/* Empty State */}
      {filteredAppointments.length === 0 && !isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <Calendar size={28} className="text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">No appointments found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}

export default Appointments;