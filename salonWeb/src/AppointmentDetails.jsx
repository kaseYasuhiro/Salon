import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, User, Phone, Mail, Calendar as CalendarIcon, 
  Clock, Scissors, CheckCircle, XCircle, AlertCircle, 
  Image as ImageIcon, CreditCard, RefreshCw, FileText,
  DollarSign, Users, Eye, Search, ChevronRight,
  Star, X
} from 'lucide-react';
import api from '../api/axios';

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 
                  type === 'error' ? 'bg-red-500' : 
                  type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
  
  const icon = type === 'success' ? <CheckCircle size={18} /> :
               type === 'error' ? <XCircle size={18} /> :
               type === 'warning' ? <AlertCircle size={18} /> : <AlertCircle size={18} />;

  return (
    <div className={`fixed top-4 right-4 z-50 animate-slide-in ${bgColor} text-white rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[300px] max-w-md`}>
      {icon}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-auto hover:bg-white/20 rounded-lg p-1">
        <X size={16} />
      </button>
    </div>
  );
};

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
  setShowCancelModal 
}) => {
  if (!showCancelModal) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Cancel Appointment & Refund</h2>
          <button 
            onClick={() => { 
              setShowCancelModal(false); 
              resetCancelForm(); 
            }} 
            className="text-white hover:bg-white/20 rounded-lg p-1"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCancelWithRefund} className="p-6 space-y-4">
          <div>
            <label className="block text-gray-700 text-xs font-semibold mb-1">
              Refund Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">₱</span>
              <input
                type="number"
                value={cancelFormData.refund_amount}
                onChange={(e) => setCancelFormData(prev => ({ ...prev, refund_amount: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                step="0.01"
                min="0"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Enter the amount to refund to the customer</p>
          </div>

          <div>
            <label className="block text-gray-700 text-xs font-semibold mb-1">
              Refund Method *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCancelFormData(prev => ({ ...prev, refund_method: 'cash' }))}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                  cancelFormData.refund_method === 'cash'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <CreditCard size={18} />
                <span className="font-medium text-sm">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setCancelFormData(prev => ({ ...prev, refund_method: 'gcash' }))}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                  cancelFormData.refund_method === 'gcash'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <Phone size={18} />
                <span className="font-medium text-sm">GCash</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Select how the refund will be processed</p>
          </div>

          <div>
            <label className="block text-gray-700 text-xs font-semibold mb-1">
              Cancellation Reason *
            </label>
            <textarea
              value={cancelFormData.cancellation_reason}
              onChange={(e) => setCancelFormData(prev => ({ ...prev, cancellation_reason: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="Provide a reason for cancelling this appointment..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">This reason will be visible to the customer</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-700">
                <span className="font-semibold">Note:</span> This action will cancel the appointment and process a refund to the customer. This cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { 
                setShowCancelModal(false); 
                resetCancelForm(); 
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessingCancel}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessingCancel ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Process Cancellation & Refund
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
  const payment_type = billing?.payment_type || 'N/A';
  
  const proofUrl = payment_proof ? `http://192.168.100.73:8000${payment_proof}` : null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Payment Proof</h2>
          <button 
            onClick={() => { 
              setShowPaymentProofModal(false); 
              setSelectedPaymentData(null); 
            }} 
            className="text-white hover:bg-white/20 rounded-lg p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Appointment ID</p>
                <p className="text-sm font-semibold text-gray-800">#{appointment_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Type</p>
                <p className="text-sm font-semibold text-gray-800 capitalize">{payment_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="text-sm font-bold text-pink-600">
                  ₱{parseFloat(total_amount).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Method</p>
                <p className="text-sm font-semibold text-gray-800">{payment_method || 'N/A'}</p>
              </div>
            </div>

            {/* ✅ Show paid / balance from the billing row */}
            <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Paid</p>
                <p className="text-sm font-semibold text-green-600">
                  ₱{parseFloat(paid_amount).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Balance</p>
                <p className="text-sm font-semibold text-orange-600">
                  ₱{parseFloat(balance).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-semibold">
                  {parseFloat(balance) <= 0 ? (
                    <span className="text-green-600">Paid in Full</span>
                  ) : parseFloat(paid_amount) > 0 ? (
                    <span className="text-yellow-600">Partial</span>
                  ) : (
                    <span className="text-red-600">Unpaid</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {proofUrl ? (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Payment Proof Screenshot</p>
              <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200 h-80 flex items-center justify-center">
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
                          <p class="text-gray-500 text-sm">Failed to load image</p>
                          <p class="text-gray-400 text-xs mt-1 break-all">${proofUrl}</p>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center mb-4 h-64 flex flex-col items-center justify-center">
              <FileText size={48} className="text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No payment proof uploaded</p>
            </div>
          )}

          <button
            onClick={() => { 
              setShowPaymentProofModal(false); 
              setSelectedPaymentData(null); 
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
  formatDate 
}) => {
  if (!showRescheduleModal) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Reschedule Appointment</h2>
          <button 
            onClick={() => { 
              setShowRescheduleModal(false); 
              resetRescheduleForm(); 
            }} 
            className="text-white hover:bg-white/20 rounded-lg p-1"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleReschedule} className="p-6 space-y-4">
          <div>
            <label className="block text-gray-700 text-xs font-semibold mb-1">
              New Date *
            </label>
            {isLoadingDates ? (
              <div className="w-full px-3 py-2 text-sm text-gray-400 bg-gray-50 rounded-lg border border-gray-200">
                Loading available dates...
              </div>
            ) : openScheduleDates.length === 0 ? (
              <div className="w-full px-3 py-2 text-sm text-yellow-600 bg-yellow-50 rounded-lg border border-yellow-200">
                No future open dates available. Please check business schedule.
              </div>
            ) : (
              <select
                value={rescheduleFormData.appointment_date}
                onChange={(e) => setRescheduleFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select an available date...</option>
                {openScheduleDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">Select a date when the salon is open</p>
          </div>

          <div>
            <label className="block text-gray-700 text-xs font-semibold mb-1">
              New Time *
            </label>
            <input
              type="time"
              value={rescheduleFormData.appointment_time}
              onChange={(e) => setRescheduleFormData(prev => ({ ...prev, appointment_time: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="900"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Select the new time for this appointment</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-700">
                <span className="font-semibold">Note:</span> Rescheduling will update the appointment date and time. The customer will be notified of the change.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { 
                setShowRescheduleModal(false); 
                resetRescheduleForm(); 
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRescheduling || isLoadingDates || openScheduleDates.length === 0}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isRescheduling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CalendarIcon size={16} />
                  Reschedule Appointment
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
  const [toast, setToast] = useState(null);
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDateFiltered, setIsDateFiltered] = useState(false);
  
  // Cancel/Refund state
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [selectedPaymentData, setSelectedPaymentData] = useState(null);
  const [cancelFormData, setCancelFormData] = useState({
    appointment_id: '',
    payment_id: '',
    cancellation_reason: '',
    refund_method: 'cash',
    refund_amount: 0
  });

  // Reschedule state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleFormData, setRescheduleFormData] = useState({
    appointment_date: '',
    appointment_time: ''
  });
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [openScheduleDates, setOpenScheduleDates] = useState([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  // ── Fetch future open schedule dates ──
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
    } catch (error) {
      showToast('Failed to fetch available dates', 'error');
    } finally {
      setIsLoadingDates(false);
    }
  };

  // ── Fetch all appointments ──
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
              services: [],
              total_price: 0,             // base sum (kept for fallback)
              total_duration: 0,
              service_names: [],
              created_at: transaction.created_at,
              updated_at: transaction.updated_at,
              // ✅ Billing fields from the backend
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
          if (appointment.assigned_employee_id) {
            staffName = `Staff ID: ${appointment.assigned_employee_id}`;
          }

          // ✅ Prefer the billing total when available
          const billingTotal = appointment.billing_total_amount != null && appointment.billing_total_amount > 0
            ? appointment.billing_total_amount
            : null;
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
            services: appointment.services,
            service_names: appointment.service_names,
            base_price: appointment.total_price,          // base sum, unchanged
            total_price: grandTotal,                       // ✅ grand total (for display)
            total_duration: appointment.total_duration,
            service_name: appointment.service_names.join(' + ') || 'No Service',
            duration_minutes: appointment.total_duration,
            price: grandTotal.toString(),
            // ✅ Billing fields for the detail view
            billing_total_amount: appointment.billing_total_amount,
            billing_paid_amount: appointment.billing_paid_amount,
            billing_balance: appointment.billing_balance,
            billing_payment_type: appointment.billing_payment_type,
            created_at: appointment.created_at,
            updated_at: appointment.updated_at
          };
        });
        
        setAppointments(groupedAppointments);
        
        const queryParams = new URLSearchParams(location.search);
        const dateParam = queryParams.get('date');
        
        if (dateParam) {
          setSelectedDate(dateParam);
          setIsDateFiltered(true);
        } else {
          setIsDateFiltered(false);
          setSelectedDate(null);
        }
        
        const isListView = window.location.pathname === '/dashboard/appointments/list';
        
        if (id && !isListView) {
          const found = groupedAppointments.find(a => a.id === parseInt(id));
          if (found) {
            setSelectedAppointment(found);
            setShowAppointmentDetail(true);
          } else {
            await fetchAppointmentDetail(parseInt(id));
          }
        } else {
          setShowAppointmentDetail(false);
        }
      }
    } catch (error) {
      setError('Failed to fetch appointments');
      showToast('Failed to fetch appointments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Fetch single appointment details ──
  const fetchAppointmentDetail = async (appointmentId) => {
    setIsLoadingDetail(true);
    try {
      const response = await api.get(`/appointment/${appointmentId}`);
      setSelectedAppointment(response.data);
      setShowAppointmentDetail(true);
      
      navigate(`/dashboard/appointments/${appointmentId}`, { replace: true });
    } catch (error) {
      showToast('Failed to fetch appointment details', 'error');
      const found = appointments.find(a => a.id === appointmentId);
      if (found) {
        setSelectedAppointment(found);
        setShowAppointmentDetail(true);
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // ── Fetch payment details for cancellation ──
  const fetchPaymentDetails = async (appointmentId) => {
    try {
      const response = await api.get(`/appointment/payment-details/${appointmentId}`);
      return response.data;
    } catch (error) {
      showToast('Failed to fetch payment details', 'error');
      return null;
    }
  };

  // ── Fetch payment proof ──
  const fetchPaymentProof = async (appointmentId) => {
    try {
      const response = await api.get(`/appointment/payment?appointment_id=${appointmentId}`);
      
      if (response.data && response.data.length > 0) {
        const payment = response.data.find(p => p.billing?.appointment_id === appointmentId);
        
        if (payment) {
          setSelectedPaymentData(payment);
          setShowPaymentProofModal(true);
        } else {
          showToast('No payment record found for this appointment.', 'warning');
        }
      } else {
        showToast('No payment record found for this appointment.', 'warning');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch payment data', 'error');
    }
  };

  // ── Update appointment status ──
  const handleUpdateStatus = async (appointmentId, newStatus) => {
    if (newStatus === 'cancelled') {
      await handleOpenCancelModal(appointmentId);
      return;
    }
    
    setIsUpdating(true);
    try {
      const response = await api.put(`/appointments/update/${appointmentId}`, {
        status: newStatus
      });
      
      showToast(`Appointment ${newStatus === 'confirmed' ? 'confirmed' : 'updated'} successfully!`, 'success');
      
      await fetchAllAppointments();
      if (selectedAppointment) {
        await fetchAppointmentDetail(appointmentId);
      }
      
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update appointment status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Open cancel modal ──
  const handleOpenCancelModal = async (appointmentId) => {
    try {
      const paymentData = await fetchPaymentDetails(appointmentId);
      
      if (!paymentData) {
        showToast('No payment record found for this appointment', 'warning');
        return;
      }
      
      // ✅ Refund only the amount actually paid, not the grand total
      const billing = paymentData.billing || {};
      const paidAmount = parseFloat(billing.paid_amount ?? 0);
      const grandTotal = parseFloat(billing.total_amount ?? 0);
      const refundAmount = paidAmount > 0 ? paidAmount : (grandTotal / 2);
      
      setCancelFormData({
        appointment_id: appointmentId,
        payment_id: paymentData.id,
        cancellation_reason: '',
        refund_method: 'cash',
        refund_amount: refundAmount
      });
      
      setShowCancelModal(true);
    } catch (error) {
      showToast('Failed to load payment details', 'error');
    }
  };

  // ── Cancel with refund ──
  const handleCancelWithRefund = async (e) => {
    e.preventDefault();
    
    if (!cancelFormData.cancellation_reason.trim()) {
      showToast('Please provide a reason for cancellation', 'warning');
      return;
    }
    
    if (!cancelFormData.refund_method) {
      showToast('Please select a refund method', 'warning');
      return;
    }
    
    if (cancelFormData.refund_amount <= 0) {
      showToast('Refund amount must be greater than 0', 'warning');
      return;
    }
    
    setIsProcessingCancel(true);
    try {
      const response = await api.post('/appointment/cancel-with-refund', {
        appointment_id: cancelFormData.appointment_id,
        payment_id: cancelFormData.payment_id,
        cancellation_reason: cancelFormData.cancellation_reason,
        refund_method: cancelFormData.refund_method,
        refund_amount: cancelFormData.refund_amount
      });
      
      showToast('Appointment cancelled and refund processed successfully!', 'success');
      
      setShowCancelModal(false);
      resetCancelForm();
      await fetchAllAppointments();
      if (selectedAppointment) {
        await fetchAppointmentDetail(cancelFormData.appointment_id);
      }
      
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to cancel appointment', 'error');
    } finally {
      setIsProcessingCancel(false);
    }
  };

  // ── Reschedule ──
  const handleReschedule = async (e) => {
    e.preventDefault();
    
    if (!rescheduleFormData.appointment_date) {
      showToast('Please select a new date', 'warning');
      return;
    }
    
    if (!rescheduleFormData.appointment_time) {
      showToast('Please select a new time', 'warning');
      return;
    }
    
    setIsRescheduling(true);
    try {
      const response = await api.put(`/appointments/update/${selectedAppointment.id}`, {
        appointment_date: rescheduleFormData.appointment_date,
        appointment_time: rescheduleFormData.appointment_time + ':00'
      });
      
      showToast('Appointment rescheduled successfully!', 'success');
      
      setShowRescheduleModal(false);
      resetRescheduleForm();
      await fetchAllAppointments();
      if (selectedAppointment) {
        await fetchAppointmentDetail(selectedAppointment.id);
      }
      
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to reschedule appointment', 'error');
    } finally {
      setIsRescheduling(false);
    }
  };

  const resetRescheduleForm = () => {
    setRescheduleFormData({
      appointment_date: '',
      appointment_time: ''
    });
    setOpenScheduleDates([]);
  };

  const handleOpenRescheduleModal = async () => {
    await fetchOpenScheduleDates();
    
    setRescheduleFormData({
      appointment_date: selectedAppointment?.appointment_date || '',
      appointment_time: selectedAppointment?.appointment_time ? selectedAppointment.appointment_time.slice(0, 5) : ''
    });
    setShowRescheduleModal(true);
  };

  const resetCancelForm = () => {
    setCancelFormData({
      appointment_id: '',
      payment_id: '',
      cancellation_reason: '',
      refund_method: 'cash',
      refund_amount: 0
    });
  };

  // ── Formatting helpers ──
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

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    if (status === 'confirmed') return <CheckCircle size={16} />;
    if (status === 'pending') return <AlertCircle size={16} />;
    if (status === 'completed') return <CheckCircle size={16} />;
    if (status === 'cancelled') return <XCircle size={16} />;
    return null;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
      confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700' },
      completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  const goBackToList = () => {
    setSelectedAppointment(null);
    setShowAppointmentDetail(false);
    const queryParams = new URLSearchParams(location.search);
    const dateParam = queryParams.get('date');
    if (dateParam) {
      navigate(`/dashboard/appointments/list?date=${dateParam}`);
    } else {
      navigate('/dashboard/appointments/list');
    }
  };

  const clearDateFilter = () => {
    setIsDateFiltered(false);
    setSelectedDate(null);
    navigate('/dashboard/appointments/list');
  };

  const getFilteredAppointments = () => {
    if (isDateFiltered && selectedDate) {
      return appointments.filter(app => app.appointment_date === selectedDate);
    }
    return appointments;
  };

  const filteredAppointments = getFilteredAppointments().filter(app => {
    if (selectedStatus !== 'all' && app.status !== selectedStatus) return false;
    if (searchTerm && !app.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    fetchAllAppointments();
  }, [location.search]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading appointments...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">Failed to load appointments</h3>
          <p className="text-gray-500 text-sm">{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Detail view ──
  if (showAppointmentDetail && selectedAppointment) {
    const statusBadge = getStatusBadge(selectedAppointment.status);
    const isPending = selectedAppointment.status === 'pending';
    const isCancelled = selectedAppointment.status === 'cancelled';
    const isMultipleServices = selectedAppointment.services && selectedAppointment.services.length > 1;
    const services = selectedAppointment.services || [];

    // ✅ Billing values
    const basePriceSum = selectedAppointment.base_price ?? services.reduce(
      (sum, s) => sum + (parseFloat(s.price) || 0), 0
    );
    const grandTotal = selectedAppointment.billing_total_amount
      ?? selectedAppointment.total_price
      ?? basePriceSum;
    const paidAmount = selectedAppointment.billing_paid_amount ?? (grandTotal / 2);
    const balance = selectedAppointment.billing_balance ?? (grandTotal - paidAmount);
    const hasAdjustments = grandTotal > basePriceSum + 0.01;

    return (
      <div className="space-y-6">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={hideToast} />
        )}

        {/* Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={goBackToList}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">Appointment Details</h1>
            <p className="text-gray-500 text-sm">View and manage appointment information</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge.color}`}>
            {statusBadge.label}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User size={20} className="text-pink-500" />
                Customer Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="text-sm font-medium text-gray-800">{selectedAppointment.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone Number</p>
                  <p className="text-sm font-medium text-gray-800">{selectedAppointment.customer_phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-800">{selectedAppointment.customer_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Assigned Staff</p>
                  <p className="text-sm font-medium text-gray-800">{selectedAppointment.staff_name || 'Unassigned'}</p>
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Scissors size={20} className="text-pink-500" />
                Service Details
              </h2>
              
              {isMultipleServices ? (
                <div className="space-y-3">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{service.service_name}</p>
                        <p className="text-xs text-gray-500">{service.duration_minutes} mins</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">
                        ₱{parseFloat(service.price).toLocaleString()}
                      </p>
                    </div>
                  ))}

                  {/* Subtotal (base price sum) */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-600">Subtotal (Base Price)</p>
                    <p className="text-sm font-semibold text-gray-700">
                      ₱{basePriceSum.toLocaleString()}
                    </p>
                  </div>

                  {/* ✅ Show adjustment line if there's a difference */}
                  {hasAdjustments && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-purple-600">Hair Adjustments</p>
                      <p className="text-sm font-semibold text-purple-600">
                        +₱{(grandTotal - basePriceSum).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* ✅ Grand total */}
                  <div className="flex items-center justify-between pt-2 border-t-2 border-pink-200">
                    <p className="text-base font-bold text-gray-800">Grand Total</p>
                    <p className="text-xl font-bold text-pink-600">
                      ₱{grandTotal.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Total Duration</p>
                    <p className="text-sm font-medium text-gray-700">{selectedAppointment.total_duration} mins</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800">{selectedAppointment.service_name}</p>
                    <p className="text-sm font-semibold text-gray-700">
                      ₱{parseFloat(selectedAppointment.price || '0').toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="text-sm font-medium text-gray-700">{selectedAppointment.duration_minutes} mins</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <p className="text-base font-bold text-gray-800">Total</p>
                    <p className="text-lg font-bold text-pink-600">
                      ₱{grandTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ Payment Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-pink-500" />
                Payment Summary
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Amount</span>
                  <span className="text-sm font-bold text-gray-800">
                    ₱{grandTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Amount Paid</span>
                  <span className="text-sm font-semibold text-green-600">
                    ₱{paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Remaining Balance</span>
                  <span className={`text-sm font-semibold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {balance > 0 ? `₱${balance.toLocaleString()}` : 'Paid in Full'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Payment Status</span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    balance <= 0
                      ? 'bg-green-100 text-green-700'
                      : paidAmount > 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}>
                    {balance <= 0 ? 'Paid in Full' : paidAmount > 0 ? 'Partial' : 'Unpaid'}
                  </span>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarIcon size={20} className="text-pink-500" />
                Appointment Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(selectedAppointment.appointment_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="text-sm font-medium text-gray-800">{formatTime(selectedAppointment.appointment_time)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedAppointment.status)}
                    <span className={`text-sm font-medium ${getStatusColor(selectedAppointment.status)}`}>
                      {selectedAppointment.status?.charAt(0).toUpperCase() + selectedAppointment.status?.slice(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Appointment ID</p>
                  <p className="text-sm font-medium text-gray-800">#{selectedAppointment.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Actions</h2>
              
              {isPending && (
                <div className="space-y-3">
                  <button
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'confirmed')}
                    disabled={isUpdating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle size={18} />
                    )}
                    Approve & Confirm Appointment
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'cancelled')}
                    disabled={isUpdating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    <XCircle size={18} />
                    Reject & Refund
                  </button>
                  <button
                    onClick={handleOpenRescheduleModal}
                    disabled={isUpdating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    <CalendarIcon size={18} />
                    Reschedule Appointment
                  </button>
                </div>
              )}

              {!isPending && !isCancelled && (
                <div className="space-y-3">
                  <div className="text-center py-3">
                    <p className="text-sm text-gray-500">
                      {selectedAppointment.status === 'confirmed' ? '✅ This appointment has been confirmed' :
                       selectedAppointment.status === 'completed' ? '✅ This appointment has been completed' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">No further actions available</p>
                  </div>
                  <button
                    onClick={handleOpenRescheduleModal}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                  >
                    <CalendarIcon size={18} />
                    Reschedule Appointment
                  </button>
                </div>
              )}

              {isCancelled && (
                <div className="text-center py-3">
                  <p className="text-sm text-red-500">❌ This appointment has been rejected and cancelled</p>
                  <p className="text-xs text-gray-400 mt-1">A refund has been processed</p>
                </div>
              )}

              <button
                onClick={() => fetchPaymentProof(selectedAppointment.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium mt-3"
              >
                <ImageIcon size={18} />
                View Payment Proof
              </button>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total Amount</span>
                  <span className="text-sm font-bold text-pink-600">
                    ₱{grandTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Paid</span>
                  <span className="text-sm font-semibold text-green-600">
                    ₱{paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Balance</span>
                  <span className={`text-sm font-semibold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    ₱{balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Services</span>
                  <span className="text-sm font-medium text-gray-700">{services.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Staff Assigned</span>
                  <span className="text-sm font-medium text-gray-700">{selectedAppointment.staff_name || 'None'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isDateFiltered && selectedDate ? `Appointments for ${formatDate(selectedDate)}` : 'All Appointments'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isDateFiltered && selectedDate 
              ? `Showing appointments for ${formatDate(selectedDate)}` 
              : 'View and manage all appointments'}
          </p>
        </div>
        <div className="flex gap-2">
          {isDateFiltered && (
            <button 
              onClick={clearDateFilter}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              <X size={16} />
              Clear Filter
            </button>
          )}
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-800">{filteredAppointments.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{filteredAppointments.filter(a => a.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Confirmed</p>
          <p className="text-xl font-bold text-green-600">{filteredAppointments.filter(a => a.status === 'confirmed').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-xl font-bold text-blue-600">{filteredAppointments.filter(a => a.status === 'completed').length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm w-48"
            />
          </div>
          
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CalendarIcon size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">
            {isDateFiltered ? 'No appointments for this date' : 'No appointments found'}
          </h3>
          <p className="text-sm text-gray-500">
            {isDateFiltered ? 'Try selecting a different date' : 'There are no appointments to display'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAppointments.map((appointment) => {
            const isMultipleServices = appointment.services && appointment.services.length > 1;
            const statusBadge = getStatusBadge(appointment.status);
            const grandTotal = appointment.billing_total_amount ?? appointment.total_price ?? 0;
            const paidAmount = appointment.billing_paid_amount ?? (grandTotal / 2);
            const balance = appointment.billing_balance ?? (grandTotal - paidAmount);

            return (
              <div 
                key={appointment.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center">
                      <User size={14} className="text-pink-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">
                        {appointment.customer_name}
                      </p>
                      <p className="text-xs text-gray-500">{appointment.customer_phone || 'N/A'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </div>

                <div className="px-4 py-3 space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Services</p>
                    {isMultipleServices ? (
                      <div className="mt-1 space-y-0.5">
                        {appointment.services.slice(0, 2).map((service, idx) => (
                          <p key={idx} className="text-sm text-gray-700 truncate">
                            • {service.service_name}
                          </p>
                        ))}
                        {appointment.services.length > 2 && (
                          <p className="text-xs text-pink-600 font-semibold">
                            +{appointment.services.length - 2} more services
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700">{appointment.service_name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <CalendarIcon size={14} className="text-gray-400" />
                      <span>{formatShortDate(appointment.appointment_date)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock size={14} className="text-gray-400" />
                      <span>{formatTime(appointment.appointment_time)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-500">Total Amount</span>
                    <span className="text-sm font-bold text-pink-600">
                      ₱{grandTotal.toLocaleString()}
                    </span>
                  </div>

                  {balance > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Balance</span>
                      <span className="text-xs font-semibold text-orange-600">
                        ₱{balance.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => fetchAppointmentDetail(appointment.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Eye size={16} />
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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