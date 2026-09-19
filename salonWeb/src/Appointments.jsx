import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Scissors, Plus, Filter,
  ChevronLeft, ChevronRight, Search,
  User, Clock, Phone, Edit, Trash2, MoreVertical,
  CheckCircle, XCircle, AlertCircle, Eye, X, Save,
  Settings, Clock as ClockIcon, Sun, Moon, Users as UsersIcon,
  Image as ImageIcon, FileText, CreditCard, RefreshCw
} from 'lucide-react';
import api from '../api/axios';

// Toast notification component
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

function Appointments() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPaymentData, setSelectedPaymentData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [selectedDateSchedule, setSelectedDateSchedule] = useState(null);
  const [editFormData, setEditFormData] = useState({
    appointment_time: '',
    assigned_employee_id: '',
    status: '',
    notes: ''
  });
  const [scheduleFormData, setScheduleFormData] = useState({
    business_date: '',
    open_time: '09:00',
    close_time: '17:00',
    is_open: true
  });
  // ✅ Unified modal state — holds the multi-select staff list
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [businessSchedules, setBusinessSchedules] = useState([]);
  const [assignedStaff, setAssignedStaff] = useState([]);
  
  // Cancel/Refund state
  const [cancelFormData, setCancelFormData] = useState({
    appointment_id: '',
    payment_id: '',
    cancellation_reason: '',
    refund_method: 'cash',
    refund_amount: 0
  });
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState(null);

  const [stats, setStats] = useState([
    { label: 'Total Appointments', value: '0', change: '+0%', changeType: 'up', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', icon: Calendar },
    { label: "Today's Appointments", value: '0', change: '+0', changeType: 'up', color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', icon: Clock },
    { label: 'Pending Appointments', value: '0', change: '-0', changeType: 'down', color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', icon: AlertCircle },
    { label: 'Completed Appointments', value: '0', change: '+0%', changeType: 'up', color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', icon: CheckCircle },
  ]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Toast helper functions
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  // Get current month and year
  const getCurrentMonthYear = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get days in current month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month
  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Fetch business schedules
  const fetchBusinessSchedules = async () => {
    try {
      const response = await api.get('/daysched');
      if (Array.isArray(response.data)) {
        setBusinessSchedules(response.data);
      }
    } catch (error) {
      showToast('Failed to fetch business schedules', 'error');
    }
  };

  // Fetch assigned staff schedules
  const fetchAssignedStaff = async () => {
    try {
      const response = await api.get('/assign');
      if (Array.isArray(response.data)) {
        setAssignedStaff(response.data);
      }
    } catch (error) {
      showToast('Failed to fetch assigned staff', 'error');
    }
  };

  // Get assigned staff for a specific business date
  const getAssignedStaffForDate = (businessDateId) => {
    return assignedStaff.filter(assignment => assignment.business_date_id === businessDateId);
  };

  // Get business schedule ID by date
  const getBusinessScheduleId = (dateStr) => {
    const schedule = businessSchedules.find(s => s.business_date === dateStr);
    return schedule?.id || null;
  };

  // ✅ Unified handler: saves schedule + staff in one request
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    try {
      const response = await api.post('/daysched-staff/add', {
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

  // Get schedule for a specific date
  const getScheduleForDate = (dateStr) => {
    return businessSchedules.find(schedule => schedule.business_date === dateStr);
  };

  // Get day status based on schedule only (no appointments considered for color)
  const getDayStatus = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    const schedule = getScheduleForDate(dateStr);
    
    if (!schedule) {
      return 'default';
    }
    
    if (!schedule.is_open) {
      return 'closed';
    }
    
    return 'open';
  };

  // Fetch staff list
  const fetchStaffList = async () => {
    try {
      const response = await api.get('/staff-list');
      if (Array.isArray(response.data)) {
        setStaffList(response.data);
      }
    } catch (error) {
      setStaffList([]);
      showToast('Failed to fetch staff list', 'error');
    }
  };

  // Fetch payment details for an appointment
  const fetchPaymentDetails = async (appointmentId) => {
    try {
      const response = await api.get(`/appointment/payment-details/${appointmentId}`);
      return response.data;
    } catch (error) {
      showToast('Failed to fetch payment details', 'error');
      return null;
    }
  };

  // Cancel appointment with refund
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
      await fetchAppointments();
      
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to cancel appointment', 'error');
    } finally {
      setIsProcessingCancel(false);
    }
  };

  // Open cancel modal
  const handleOpenCancelModal = async (appointment) => {
    try {
      const paymentData = await fetchPaymentDetails(appointment.appointment_id);
      
      if (!paymentData) {
        showToast('No payment record found for this appointment', 'warning');
        return;
      }
      
      const refundAmount = paymentData.billing?.total_amount || 0;
      
      setCancelFormData({
        appointment_id: appointment.appointment_id,
        payment_id: paymentData.id,
        cancellation_reason: '',
        refund_method: 'cash',
        refund_amount: parseFloat(refundAmount)
      });
      
      setShowCancelModal(true);
    } catch (error) {
      showToast('Failed to load payment details', 'error');
    }
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

  // Fetch all appointments - GROUPED BY APPOINTMENT ID
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/all-appointments');
      
      if (Array.isArray(response.data)) {
        const staffNameMap = new Map();
        staffList.forEach(staff => {
          staffNameMap.set(staff.id, staff.name);
        });
        
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
              total_price: 0,
              total_duration: 0,
              service_names: [],
              created_at: transaction.created_at,
              updated_at: transaction.updated_at
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
            staffName = staffNameMap.get(appointment.assigned_employee_id) || `Staff ID: ${appointment.assigned_employee_id}`;
          }
          
          let overallStatus = appointment.status;
          
          return {
            id: appointment.id,
            appointment_id: appointment.appointment_id,
            customer_name: appointment.customer_name,
            customer_phone: appointment.customer_phone,
            customer_email: appointment.customer_email,
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            status: overallStatus,
            assigned_employee_id: appointment.assigned_employee_id,
            staff_name: staffName,
            services: appointment.services,
            service_names: appointment.service_names,
            total_price: appointment.total_price,
            total_duration: appointment.total_duration,
            service_name: appointment.service_names.join(' + ') || 'No Service',
            duration_minutes: appointment.total_duration,
            price: appointment.total_price.toString(),
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
        
        setStats([
          { ...stats[0], value: total.toString(), change: `+${total}`, changeType: 'up' },
          { ...stats[1], value: todayAppointments.toString(), change: `+${todayAppointments}`, changeType: 'up' },
          { ...stats[2], value: pending.toString(), change: `${pending}`, changeType: pending > 0 ? 'up' : 'down' },
          { ...stats[3], value: completed.toString(), change: `+${completed}`, changeType: 'up' },
        ]);
      }
    } catch (error) {
      showToast('Failed to fetch appointments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch payment proof by appointment ID
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

  useEffect(() => {
    fetchStaffList();
    fetchBusinessSchedules();
    fetchAssignedStaff();
  }, []);

  useEffect(() => {
    if (staffList.length > 0) {
      fetchAppointments();
    } else {
      fetchAppointments();
    }
  }, [staffList]);

  // Generate calendar days
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
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    return appointments.filter(app => app.appointment_date === dateStr);
  };

  // Get appointment status counts for a specific day
  const getAppointmentStatusCounts = (day) => {
    const dayAppointments = getAppointmentsForDay(day);
    const counts = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    };
    
    dayAppointments.forEach(app => {
      if (counts[app.status] !== undefined) {
        counts[app.status]++;
      }
    });
    
    return counts;
  };

  const handleDayClick = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    const schedule = getScheduleForDate(dateStr);
    const businessScheduleId = getBusinessScheduleId(dateStr);
    const assignedStaffForDate = businessScheduleId ? getAssignedStaffForDate(businessScheduleId) : [];
    
    setSelectedDay(day);
    setSelectedDateSchedule({
      date: dateStr,
      schedule: schedule,
      businessScheduleId: businessScheduleId,
      assignedStaff: assignedStaffForDate
    });
    
    setShowModal(true);
  };

  // Navigate to AppointmentDetails when "View Appointments" is clicked
  const handleViewAppointments = () => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(selectedDay).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    setShowModal(false);
    setSelectedDay(null);
    navigate(`/dashboard/appointments/list?date=${dateStr}`);
  };

  // ✅ Unified open-schedule modal: pre-fills form + pre-checks assigned staff
  const handleEditSchedule = () => {
    const schedule = getScheduleForDate(selectedDateSchedule.date);
    const businessScheduleId = selectedDateSchedule.businessScheduleId;

    const alreadyAssigned = businessScheduleId
      ? assignedStaff
          .filter(a => a.business_date_id === businessScheduleId)
          .map(a => a.staff_id)
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
    setScheduleFormData({
      business_date: '',
      open_time: '09:00',
      close_time: '17:00',
      is_open: true
    });
    setSelectedStaffIds([]);
  };

  // ✅ Multi-select helpers
  const toggleStaffSelection = (staffId) => {
    setSelectedStaffIds(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const selectAllStaff = () => {
    setSelectedStaffIds(staffList.map(s => s.id));
  };

  const clearAllStaff = () => {
    setSelectedStaffIds([]);
  };

  // Update appointment status - Updates all services in the appointment
  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
    if (newStatus === 'cancelled') {
      const appointment = appointments.find(a => a.appointment_id === appointmentId);
      if (appointment) {
        await handleOpenCancelModal(appointment);
      }
      return;
    }
    
    setIsUpdating(true);
    try {
      const response = await api.put(`/appointments/update/${appointmentId}`, {
        status: newStatus
      });
      
      setAppointments(prevAppointments => 
        prevAppointments.map(app => 
          app.appointment_id === appointmentId 
            ? { ...app, status: newStatus }
            : app
        )
      );
      
      if (selectedDayAppointments.length > 0) {
        setSelectedDayAppointments(prev => 
          prev.map(app => 
            app.appointment_id === appointmentId 
              ? { ...app, status: newStatus }
              : app
          )
        );
      }
      
      showToast(`Appointment ${newStatus === 'confirmed' ? 'confirmed' : 'updated'} successfully!`, 'success');
      
      await fetchAppointments();
      
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update appointment status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const calendarDays = generateCalendarDays();

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
    if (status === 'confirmed') return <CheckCircle size={12} />;
    if (status === 'pending') return <AlertCircle size={12} />;
    if (status === 'completed') return <CheckCircle size={12} />;
    if (status === 'cancelled') return <XCircle size={12} />;
    return null;
  };

  const getCalendarCellStyle = (status) => {
    const styles = {
      closed: 'bg-red-100 border-red-300 cursor-pointer',
      open: 'bg-green-100 border-green-300 cursor-pointer',
      default: 'bg-white border-gray-200 cursor-pointer hover:bg-gray-50'
    };
    return styles[status] || 'bg-white border-gray-200 hover:bg-gray-50';
  };

  const getCalendarCellTextColor = (status) => {
    const colors = {
      closed: 'text-red-700',
      open: 'text-green-700',
      default: 'text-gray-700'
    };
    return colors[status] || 'text-gray-700';
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

  // Payment Proof Modal
  const PaymentProofModal = () => {
    if (!selectedPaymentData) return null;
    
    const { id, payment_method, payment_proof, billing } = selectedPaymentData;
    const appointment_id = billing?.appointment_id || 'N/A';
    const total_amount = billing?.total_amount || '0.00';
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

  // Cancel/Refund Modal
  const CancelModal = () => {
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

  if (isLoading && appointments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.bgColor} p-2 rounded-xl`}>
                <stat.icon size={18} className="text-pink-600" />
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                stat.changeType === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2">
          <button 
            onClick={goToPreviousMonth} 
            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={goToCurrentMonth}
            className="px-4 py-2 rounded-lg bg-pink-500 text-white shadow-md hover:bg-pink-600 transition-all duration-200 text-sm font-medium"
          >
            Today
          </button>
          <button 
            onClick={goToNextMonth}
            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        
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

      {/* Calendar View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-800">{getCurrentMonthYear()}</h3>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 bg-green-100 rounded border border-green-300"></div>
              <span className="text-gray-500">Open</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 bg-red-100 rounded border border-red-300"></div>
              <span className="text-gray-500">Closed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 bg-white rounded border border-gray-200"></div>
              <span className="text-gray-500">No Schedule</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day, index) => (
              <div key={index} className="text-center font-semibold text-gray-500 text-xs py-1">{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="bg-gray-50 rounded-lg p-2 min-h-[80px] border border-gray-100"></div>;
              }
              
              const dayStatus = getDayStatus(day);
              const dayAppointments = getAppointmentsForDay(day);
              const hasAppointments = dayAppointments.length > 0;
              const statusCounts = getAppointmentStatusCounts(day);
              
              return (
                <div 
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`${getCalendarCellStyle(dayStatus)} rounded-lg p-2 min-h-[80px] border transition-all duration-200 cursor-pointer hover:shadow-md`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold text-sm ${getCalendarCellTextColor(dayStatus)}`}>
                      {day}
                    </span>
                    {hasAppointments && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {statusCounts.pending > 0 && (
                      <div className="flex items-center gap-0.5 bg-yellow-100 rounded-full px-1.5 py-0.5">
                        <AlertCircle size={8} className="text-yellow-600" />
                        <span className="text-[8px] font-medium text-yellow-700">{statusCounts.pending}</span>
                      </div>
                    )}
                    {statusCounts.confirmed > 0 && (
                      <div className="flex items-center gap-0.5 bg-green-100 rounded-full px-1.5 py-0.5">
                        <CheckCircle size={8} className="text-green-600" />
                        <span className="text-[8px] font-medium text-green-700">{statusCounts.confirmed}</span>
                      </div>
                    )}
                    {statusCounts.completed > 0 && (
                      <div className="flex items-center gap-0.5 bg-blue-100 rounded-full px-1.5 py-0.5">
                        <CheckCircle size={8} className="text-blue-600" />
                        <span className="text-[8px] font-medium text-blue-700">{statusCounts.completed}</span>
                      </div>
                    )}
                    {statusCounts.cancelled > 0 && (
                      <div className="flex items-center gap-0.5 bg-red-100 rounded-full px-1.5 py-0.5">
                        <XCircle size={8} className="text-red-600" />
                        <span className="text-[8px] font-medium text-red-700">{statusCounts.cancelled}</span>
                      </div>
                    )}
                  </div>
                  
                  {hasAppointments && (
                    <div className="space-y-0.5 mt-1">
                      <div className="text-xs text-gray-600 truncate">
                        {dayAppointments[0]?.customer_name?.split(' ')[0]} - {formatTime(dayAppointments[0]?.appointment_time)}
                      </div>
                      {dayAppointments.length > 1 && (
                        <div className="text-xs text-gray-400">+{dayAppointments.length - 1} more</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day Options Modal */}
      {showModal && selectedDay && !selectedDayAppointments.length && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {formatFullDate(selectedDateSchedule?.date)}
              </h2>
              <button onClick={() => { setShowModal(false); setSelectedDay(null); }} className="text-white hover:bg-white/20 rounded-lg p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <button
                onClick={handleViewAppointments}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Eye size={18} />
                <div className="text-left">
                  <p className="font-semibold">View Appointments</p>
                  <p className="text-xs text-gray-500">See all appointments for this day</p>
                </div>
              </button>
              
              <button
                onClick={handleEditSchedule}
                className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Settings size={18} />
                <div className="text-left">
                  <p className="font-semibold">Edit Schedule & Staff</p>
                  <p className="text-xs text-gray-500">Set hours and assign staff in one step</p>
                </div>
              </button>
            </div>

            {selectedDateSchedule?.assignedStaff && selectedDateSchedule.assignedStaff.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Assigned Staff:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDateSchedule.assignedStaff.map((assignment) => (
                    <span 
                      key={assignment.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
                    >
                      <User size={12} />
                      {assignment.user?.first_name} {assignment.user?.last_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {showModal && selectedDayAppointments.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh]">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Appointments for {formatFullDate(selectedDayAppointments[0]?.appointment_date)}
                </h2>
                <p className="text-pink-100 text-xs mt-0.5">{selectedDayAppointments.length} appointment(s)</p>
              </div>
              <button 
                onClick={() => { 
                  setShowModal(false); 
                  setSelectedDayAppointments([]); 
                  setSelectedDay(null); 
                }} 
                className="text-white hover:bg-white/20 rounded-lg p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div 
              className="p-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: 'calc(80vh - 60px)' }}
            >
              <div className="space-y-3">
                {selectedDayAppointments.map((appointment) => {
                  const isPending = appointment.status === 'pending';
                  const isCancelled = appointment.status === 'cancelled';
                  const isMultipleServices = appointment.services && appointment.services.length > 1;
                  const services = appointment.services || [];
                  
                  return (
                    <div key={appointment.appointment_id} className="bg-gray-50 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center">
                            <User size={14} className="text-pink-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800 text-sm">{appointment.customer_name}</h3>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Phone size={10} className="text-gray-400" />
                              <span className="text-xs text-gray-500">{appointment.customer_phone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(appointment.status)}`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(appointment.status)}
                            <span className="text-xs capitalize">{appointment.status}</span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-10">
                        {isMultipleServices ? (
                          <div className="space-y-1">
                            {services.map((service, index) => (
                              <div key={index} className="flex items-center gap-1.5">
                                <Scissors size={12} className="text-gray-400" />
                                <span className="text-xs text-gray-600">
                                  {service.service_name} ({service.duration_minutes} mins) - ₱{parseFloat(service.price).toLocaleString()}
                                </span>
                              </div>
                            ))}
                            <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-gray-200">
                              <Clock size={12} className="text-gray-400" />
                              <span className="text-xs font-semibold text-gray-700">
                                Total: {appointment.total_duration} mins | ₱{appointment.total_price.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Scissors size={12} className="text-gray-400" />
                            <span className="text-xs text-gray-600">{appointment.service_name || 'Service'}</span>
                            <span className="text-xs text-gray-400">|</span>
                            <Clock size={12} className="text-gray-400" />
                            <span className="text-xs text-gray-600">{formatTime(appointment.appointment_time)}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1.5 mt-1">
                          <User size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-600">Staff: {appointment.staff_name || 'Unassigned'}</span>
                        </div>
                      </div>

                      <div className="mt-3 ml-10 flex gap-2 flex-wrap">
                        {isPending && (
                          <>
                            <button 
                              onClick={() => handleUpdateAppointmentStatus(appointment.appointment_id, 'confirmed')}
                              disabled={isUpdating}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors text-xs font-medium disabled:opacity-50"
                            >
                              <CheckCircle size={14} />
                              Confirm
                            </button>
                            <button 
                              onClick={() => handleUpdateAppointmentStatus(appointment.appointment_id, 'cancelled')}
                              disabled={isUpdating}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-xs font-medium disabled:opacity-50"
                            >
                              <XCircle size={14} />
                              Cancel & Refund
                            </button>
                          </>
                        )}
                        
                        <button 
                          onClick={() => fetchPaymentProof(appointment.appointment_id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors text-xs font-medium ${!isPending ? 'w-full' : ''}`}
                        >
                          <ImageIcon size={14} />
                          View Payment Proof
                        </button>
                        
                        {!isPending && !isCancelled && (
                          <div className="w-full text-center text-xs text-gray-500 bg-gray-100 rounded-md py-1.5 mt-1">
                            {appointment.status === 'confirmed' ? '✅ Appointment confirmed' : 
                             appointment.status === 'completed' ? '✅ Appointment completed' : ''}
                          </div>
                        )}
                        
                        {isCancelled && (
                          <div className="w-full text-center text-xs text-red-500 bg-red-50 rounded-md py-1.5 mt-1">
                            ❌ Appointment cancelled
                          </div>
                        )}

                        <button 
                          onClick={() => navigate(`/dashboard/appointments/${appointment.appointment_id}`)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-md transition-colors text-xs font-medium"
                        >
                          <Eye size={14} />
                          View Full Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Unified Schedule + Staff Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh]">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold text-white">Schedule & Staff</h2>
                <p className="text-pink-100 text-xs mt-0.5">
                  {formatFullDate(scheduleFormData.business_date)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  resetScheduleForm();
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 60px)' }}>
              <div className="p-5 space-y-4">
                {/* Business Hours */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Business Hours
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1">
                        Open Time *
                      </label>
                      <input
                        type="time"
                        value={scheduleFormData.open_time}
                        onChange={(e) => setScheduleFormData(prev => ({ ...prev, open_time: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1">
                        Close Time *
                      </label>
                      <input
                        type="time"
                        value={scheduleFormData.close_time}
                        onChange={(e) => setScheduleFormData(prev => ({ ...prev, close_time: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        required
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer mt-3">
                    <input
                      type="checkbox"
                      checked={scheduleFormData.is_open}
                      onChange={(e) => setScheduleFormData(prev => ({ ...prev, is_open: e.target.checked }))}
                      className="w-3.5 h-3.5 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                    />
                    <span className="text-gray-700 text-sm font-semibold">
                      Salon open on this day
                    </span>
                  </label>
                  <p className="text-[10px] text-gray-500 mt-1 ml-5">
                    Uncheck if the salon is closed on this day
                  </p>
                </div>

                {/* Staff Assignment — multi-select */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Staff ({selectedStaffIds.length} selected)
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllStaff}
                        className="text-[10px] font-semibold text-pink-600 hover:text-pink-700"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={clearAllStaff}
                        className="text-[10px] font-semibold text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {staffList.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <UsersIcon size={24} className="text-gray-300 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">No staff members available</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {staffList.map((staff) => {
                        const isSelected = selectedStaffIds.includes(staff.id);
                        return (
                          <button
                            type="button"
                            key={staff.id}
                            onClick={() => toggleStaffSelection(staff.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-all text-left ${
                              isSelected
                                ? 'border-pink-500 bg-pink-50'
                                : 'border-gray-200 bg-white hover:border-pink-200'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-pink-700' : 'text-gray-800'}`}>
                                {staff.name}
                              </p>
                              {staff.specialties && (
                                <p className="text-[10px] text-gray-500 truncate">
                                  {Array.isArray(staff.specialties)
                                    ? staff.specialties.join(', ')
                                    : staff.specialties}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedStaffIds.length > 0 && (
                    <p className="text-[10px] text-gray-500 mt-2">
                      {selectedStaffIds.length} staff member{selectedStaffIds.length !== 1 ? 's' : ''} will be assigned to this date
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 px-5 py-3 flex gap-2 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    resetScheduleForm();
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingSchedule ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Schedule & Staff
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Proof Modal */}
      <PaymentProofModal />

      {/* Cancel/Refund Modal */}
      <CancelModal />

      {/* Empty State */}
      {filteredAppointments.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">No appointments found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}

export default Appointments;