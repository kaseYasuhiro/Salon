import { useState, useEffect } from 'react';
import { 
  Calendar, Scissors, Plus, Filter,
  ChevronLeft, ChevronRight, Search,
  User, Clock, Phone, Edit, Trash2, MoreVertical,
  CheckCircle, XCircle, AlertCircle, Eye, X, Save,
  Settings, Clock as ClockIcon, Sun, Moon, Users as UsersIcon,
  Image as ImageIcon, FileText
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState('calendar');
  const [searchTerm, setSearchTerm] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
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
  const [assignStaffFormData, setAssignStaffFormData] = useState({
    staff_id: '',
    business_date_id: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);
  const [businessSchedules, setBusinessSchedules] = useState([]);
  const [assignedStaff, setAssignedStaff] = useState([]);
  
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
      console.log('Fetched business schedules:', response.data);
      if (Array.isArray(response.data)) {
        setBusinessSchedules(response.data);
      }
    } catch (error) {
      console.error('Error fetching business schedules:', error);
      showToast('Failed to fetch business schedules', 'error');
    }
  };

  // Fetch assigned staff schedules
  const fetchAssignedStaff = async () => {
    try {
      const response = await api.get('/assign');
      console.log('Fetched assigned staff:', response.data);
      if (Array.isArray(response.data)) {
        setAssignedStaff(response.data);
      }
    } catch (error) {
      console.error('Error fetching assigned staff:', error);
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

  // Add/Update business schedule
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    try {
      const response = await api.post('/daysched/add', {
        business_date: scheduleFormData.business_date,
        open_time: scheduleFormData.open_time,
        close_time: scheduleFormData.close_time,
        is_open: scheduleFormData.is_open ? 1 : 0
      });
      
      console.log('Schedule saved:', response.data);
      showToast('Schedule saved successfully!', 'success');
      setShowScheduleModal(false);
      setSelectedDateSchedule(null);
      resetScheduleForm();
      fetchBusinessSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      showToast(error.response?.data?.message || 'Error saving schedule', 'error');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Assign staff to schedule
  const handleAssignStaff = async (e) => {
    e.preventDefault();
    if (!assignStaffFormData.staff_id) {
      showToast('Please select a staff member', 'warning');
      return;
    }
    
    setIsAssigningStaff(true);
    try {
      const response = await api.post('/assign/add', {
        staff_id: parseInt(assignStaffFormData.staff_id),
        business_date_id: parseInt(assignStaffFormData.business_date_id)
      });
      
      console.log('Staff assigned:', response.data);
      showToast('Staff assigned successfully!', 'success');
      setShowAssignStaffModal(false);
      resetAssignStaffForm();
      fetchAssignedStaff();
    } catch (error) {
      console.error('Error assigning staff:', error);
      showToast(error.response?.data?.message || 'Error assigning staff', 'error');
    } finally {
      setIsAssigningStaff(false);
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
    
    // If no schedule exists, show default (no highlight)
    if (!schedule) {
      return 'default';
    }
    
    // If schedule exists and is closed
    if (!schedule.is_open) {
      return 'closed';
    }
    
    // If schedule exists and is open
    return 'open';
  };

  // Fetch staff list
  const fetchStaffList = async () => {
    try {
      const response = await api.get('/staff-list');
      console.log('Fetched staff list:', response.data);
      if (Array.isArray(response.data)) {
        setStaffList(response.data);
      }
    } catch (error) {
      console.error('Error fetching staff list:', error);
      setStaffList([]);
      showToast('Failed to fetch staff list', 'error');
    }
  };

  // Fetch all appointments - GROUPED BY APPOINTMENT ID
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/all-appointments');
      console.log('Fetched appointments (raw):', response.data);
      
      if (Array.isArray(response.data)) {
        const staffNameMap = new Map();
        staffList.forEach(staff => {
          staffNameMap.set(staff.id, staff.name);
        });
        
        // Group transactions by appointment_id
        const appointmentMap = new Map();
        
        response.data.forEach((transaction) => {
          const appointmentId = transaction.appointment_id;
          
          if (!appointmentMap.has(appointmentId)) {
            // Create a new appointment entry
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
          
          // Add the service to the appointment
          const appointment = appointmentMap.get(appointmentId);
          appointment.services.push({
            id: transaction.id,
            service_id: transaction.service_id,
            service_name: transaction.service_name || 'Unknown Service',
            duration_minutes: transaction.duration_minutes || 0,
            price: transaction.price || '0',
            service_status: transaction.service_status || 'pending'
          });
          
          // Accumulate totals
          appointment.total_price += parseFloat(transaction.price || '0');
          appointment.total_duration += parseInt(transaction.duration_minutes || 0);
          appointment.service_names.push(transaction.service_name || 'Unknown Service');
        });
        
        // Convert the map to an array and format the data
        const groupedAppointments = Array.from(appointmentMap.values()).map((appointment) => {
          // Get staff name
          let staffName = 'Unassigned';
          if (appointment.assigned_employee_id) {
            staffName = staffNameMap.get(appointment.assigned_employee_id) || `Staff ID: ${appointment.assigned_employee_id}`;
          }
          
          // Determine overall status
          const hasPending = appointment.services.some(s => s.service_status === 'pending');
          const allCompleted = appointment.services.every(s => s.service_status === 'completed');
          let overallStatus = appointment.status;
          
          // If all services are completed, mark appointment as completed
          if (allCompleted && appointment.services.length > 0) {
            overallStatus = 'completed';
          } else if (hasPending && overallStatus !== 'cancelled') {
            overallStatus = 'pending';
          }
          
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
        
        console.log('Grouped appointments:', groupedAppointments);
        setAppointments(groupedAppointments);
        
        // Calculate stats
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
      console.error('Error fetching appointments:', error);
      showToast('Failed to fetch appointments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch payment proof by appointment ID
  const fetchPaymentProof = async (appointmentId) => {
    try {
      const response = await api.get(`/appointment/payment?appointment_id=${appointmentId}`);
      console.log('Full payment response:', response);
      console.log('Payment data:', response.data);
      
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
      console.error('Error fetching payment proof:', error);
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
    
    // Show options modal
    setShowModal(true);
  };

  const handleViewAppointments = () => {
    const dayAppointments = getAppointmentsForDay(selectedDay);
    setSelectedDayAppointments(dayAppointments);
    setShowModal(false);
    setTimeout(() => {
      setShowModal(true);
    }, 100);
  };

  const handleEditSchedule = () => {
    const schedule = getScheduleForDate(selectedDateSchedule.date);
    setScheduleFormData({
      business_date: selectedDateSchedule.date,
      open_time: schedule?.open_time || '09:00',
      close_time: schedule?.close_time || '17:00',
      is_open: schedule?.is_open === 1
    });
    setShowModal(false);
    setShowScheduleModal(true);
  };

  const handleAssignStaffToSchedule = () => {
    if (!selectedDateSchedule.businessScheduleId) {
      showToast('Please save the business schedule first before assigning staff.', 'warning');
      return;
    }
    setAssignStaffFormData({
      staff_id: '',
      business_date_id: selectedDateSchedule.businessScheduleId
    });
    setShowModal(false);
    setShowAssignStaffModal(true);
  };

  const resetScheduleForm = () => {
    setScheduleFormData({
      business_date: '',
      open_time: '09:00',
      close_time: '17:00',
      is_open: true
    });
  };

  const resetAssignStaffForm = () => {
    setAssignStaffFormData({
      staff_id: '',
      business_date_id: ''
    });
  };

  // Update appointment status - Updates all services in the appointment
  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
    setIsUpdating(true);
    try {
      const response = await api.put(`/appointments/update/${appointmentId}`, {
        status: newStatus
      });
      
      console.log('Appointment status updated:', response.data);
      
      // Update the appointment in the local state
      setAppointments(prevAppointments => 
        prevAppointments.map(app => 
          app.appointment_id === appointmentId 
            ? { ...app, status: newStatus }
            : app
        )
      );
      
      // Also update the selected day appointments if they're being viewed
      if (selectedDayAppointments.length > 0) {
        setSelectedDayAppointments(prev => 
          prev.map(app => 
            app.appointment_id === appointmentId 
              ? { ...app, status: newStatus }
              : app
          )
        );
      }
      
      showToast(`Appointment ${newStatus === 'confirmed' ? 'confirmed' : 'cancelled'} successfully!`, 'success');
      
      // Refresh stats
      const total = appointments.length;
      const pending = appointments.filter(a => a.status === 'pending').length;
      const completed = appointments.filter(a => a.status === 'completed').length;
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = appointments.filter(a => a.appointment_date === today).length;
      
      setStats([
        { ...stats[0], value: total.toString(), change: `+${total}`, changeType: 'up' },
        { ...stats[1], value: todayAppointments.toString(), change: `+${todayAppointments}`, changeType: 'up' },
        { ...stats[2], value: pending.toString(), change: `${pending}`, changeType: pending > 0 ? 'up' : 'down' },
        { ...stats[3], value: completed.toString(), change: `+${completed}`, changeType: 'up' },
      ]);
      
    } catch (error) {
      console.error('Error updating appointment status:', error);
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
    
    console.log('Selected Payment Data:', selectedPaymentData);
    
    const { id, payment_method, payment_proof, billing } = selectedPaymentData;
    const appointment_id = billing?.appointment_id || 'N/A';
    const total_amount = billing?.total_amount || '0.00';
    const payment_type = billing?.payment_type || 'N/A';
    
    const proofUrl = payment_proof ? `http://192.168.100.73:8000${payment_proof}` : null;
    
    console.log('Extracted values:', { id, appointment_id, total_amount, payment_type, payment_method, proofUrl });
    
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
                      console.error('Image failed to load:', proofUrl);
                      e.target.style.display = 'none';
                      const parent = e.target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="flex flex-col items-center justify-center p-8">
                            <FileText size={48} class="text-gray-400 mb-2" />
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
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
              viewMode === 'calendar' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Calendar View
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
              viewMode === 'list' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            List View
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
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={goToPreviousMonth} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-base font-semibold text-gray-800">{getCurrentMonthYear()}</h3>
              <button onClick={goToNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <ChevronRight size={18} />
              </button>
              <button onClick={goToCurrentMonth} className="px-2 py-1 text-xs bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100">
                Today
              </button>
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
      )}

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
                  <p className="font-semibold">Edit Schedule</p>
                  <p className="text-xs text-gray-500">Set open/close hours for this day</p>
                </div>
              </button>

              <button
                onClick={handleAssignStaffToSchedule}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <UsersIcon size={18} />
                <div className="text-left">
                  <p className="font-semibold">Assign Staff</p>
                  <p className="text-xs text-gray-500">Assign staff to work on this day</p>
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

      {/* Appointment Details Modal - WITH HIDDEN SCROLLBAR using Tailwind v4 arbitrary values */}
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

            {/* Scrollable content with hidden scrollbar */}
            <div 
              className="p-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: 'calc(80vh - 60px)' }}
            >
              <div className="space-y-3">
                {selectedDayAppointments.map((appointment) => {
                  const isPending = appointment.status === 'pending';
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

                      {/* Service Details */}
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

                      {/* Action Buttons */}
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
                              Cancel
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
                        
                        {!isPending && (
                          <div className="w-full text-center text-xs text-gray-500 bg-gray-100 rounded-md py-1.5 mt-1">
                            {appointment.status === 'confirmed' ? '✅ Appointment confirmed' : 
                             appointment.status === 'completed' ? '✅ Appointment completed' : 
                             appointment.status === 'cancelled' ? '❌ Appointment cancelled' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Edit Business Schedule</h2>
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

            <form onSubmit={handleSaveSchedule} className="p-5 space-y-4">
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Business Date *
                </label>
                <input
                  type="date"
                  name="business_date"
                  value={scheduleFormData.business_date}
                  disabled
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Open Time *
                </label>
                <input
                  type="time"
                  name="open_time"
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
                  name="close_time"
                  value={scheduleFormData.close_time}
                  onChange={(e) => setScheduleFormData(prev => ({ ...prev, close_time: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_open"
                    checked={scheduleFormData.is_open}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, is_open: e.target.checked }))}
                    className="w-3.5 h-3.5 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                  />
                  <span className="text-gray-700 text-sm font-semibold">
                    Salon Open on this day
                  </span>
                </label>
                <p className="text-[10px] text-gray-500 mt-1 ml-5">
                  Uncheck if the salon is closed on this day
                </p>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { 
                    setShowScheduleModal(false); 
                    resetScheduleForm();
                  }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="flex-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingSchedule ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Schedule
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Staff Modal */}
      {showAssignStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Assign Staff to Schedule</h2>
              <button 
                onClick={() => { 
                  setShowAssignStaffModal(false); 
                  resetAssignStaffForm();
                }} 
                className="text-white hover:bg-white/20 rounded-lg p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignStaff} className="p-5 space-y-4">
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Select Staff *
                </label>
                <select
                  name="staff_id"
                  value={assignStaffFormData.staff_id}
                  onChange={(e) => setAssignStaffFormData(prev => ({ ...prev, staff_id: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                >
                  <option value="">Select a staff member...</option>
                  {staffList.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose which staff member will work on this day
                </p>
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Business Date
                </label>
                <input
                  type="text"
                  value={formatFullDate(selectedDateSchedule?.date)}
                  disabled
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { 
                    setShowAssignStaffModal(false); 
                    resetAssignStaffForm();
                  }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningStaff}
                  className="flex-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isAssigningStaff ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UsersIcon size={14} />
                      Assign Staff
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

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Services</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAppointments.map((appointment) => {
                  const isPending = appointment.status === 'pending';
                  const isMultipleServices = appointment.services && appointment.services.length > 1;
                  
                  return (
                    <tr key={appointment.appointment_id} className="hover:bg-pink-50/30 transition-colors duration-200">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center">
                            <User size={12} className="text-pink-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{appointment.customer_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-gray-800">
                            {appointment.service_name}
                          </span>
                          {isMultipleServices && (
                            <span className="text-[10px] text-pink-600 font-semibold bg-pink-50 px-2 py-0.5 rounded-full inline-block w-fit">
                              {appointment.services.length} services • ₱{appointment.total_price.toLocaleString()}
                            </span>
                          )}
                          {isMultipleServices && appointment.services && (
                            <div className="text-[10px] text-gray-400 space-y-0.5 mt-0.5">
                              {appointment.services.map((service, idx) => (
                                <div key={idx} className="truncate">
                                  • {service.service_name} ({service.duration_minutes} min)
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(appointment.appointment_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-gray-400" />
                          <span className="text-sm text-gray-600">{formatTime(appointment.appointment_time)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-gray-400" />
                          <span className="text-sm text-gray-600">{appointment.staff_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                          {getStatusIcon(appointment.status)}
                          {appointment.status?.charAt(0).toUpperCase() + appointment.status?.slice(1) || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} className="text-gray-400" />
                          <span className="text-xs text-gray-500">{appointment.customer_phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isPending ? (
                            <>
                              <button 
                                onClick={() => handleUpdateAppointmentStatus(appointment.appointment_id, 'confirmed')}
                                disabled={isUpdating}
                                className="p-1 hover:bg-green-100 rounded-lg transition-colors text-green-600 disabled:opacity-50"
                                title="Confirm Appointment"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button 
                                onClick={() => handleUpdateAppointmentStatus(appointment.appointment_id, 'cancelled')}
                                disabled={isUpdating}
                                className="p-1 hover:bg-red-100 rounded-lg transition-colors text-red-600 disabled:opacity-50"
                                title="Cancel Appointment"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {appointment.status === 'confirmed' ? 'Confirmed' : 
                               appointment.status === 'completed' ? 'Completed' : 
                               appointment.status === 'cancelled' ? 'Cancelled' : ''}
                            </span>
                          )}
                          <button 
                            onClick={() => fetchPaymentProof(appointment.appointment_id)}
                            className="p-1 hover:bg-purple-100 rounded-lg transition-colors text-purple-600"
                            title="View Payment Proof"
                          >
                            <ImageIcon size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-500">Showing {filteredAppointments.length} of {appointments.length} appointments</p>
            <div className="flex gap-1.5">
              <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
              <button className="px-2 py-1 text-xs bg-pink-500 text-white rounded-lg hover:bg-pink-600">1</button>
              <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">2</button>
              <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">3</button>
              <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>
      )}

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