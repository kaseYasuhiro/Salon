import { useState, useEffect } from 'react';
import { 
  Calendar, Scissors, Plus, Filter,
  ChevronLeft, ChevronRight, Search,
  User, Clock, Phone, Edit, Trash2, MoreVertical,
  CheckCircle, XCircle, AlertCircle, Eye, X, Save,
  Settings, Clock as ClockIcon, Sun, Moon
} from 'lucide-react';
import api from '../api/axios';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [businessSchedules, setBusinessSchedules] = useState([]);

  const [stats, setStats] = useState([
    { label: 'Total Appointments', value: '0', change: '+0%', changeType: 'up', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', icon: Calendar },
    { label: "Today's Appointments", value: '0', change: '+0', changeType: 'up', color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', icon: Clock },
    { label: 'Pending Appointments', value: '0', change: '-0', changeType: 'down', color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', icon: AlertCircle },
    { label: 'Completed Appointments', value: '0', change: '+0%', changeType: 'up', color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', icon: CheckCircle },
  ]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    }
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
      alert('Schedule saved successfully!');
      setShowScheduleModal(false);
      setSelectedDateSchedule(null);
      resetScheduleForm();
      fetchBusinessSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert(error.response?.data?.message || 'Error saving schedule');
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
    }
  };

  // Fetch all appointments
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/all-appointments');
      console.log('Fetched appointments:', response.data);
      
      if (Array.isArray(response.data)) {
        const staffNameMap = new Map();
        staffList.forEach(staff => {
          staffNameMap.set(staff.id, staff.name);
        });
        
        const appointmentsWithStaff = response.data.map(app => {
          let staffName = 'Unassigned';
          if (app.assigned_employee_id) {
            staffName = staffNameMap.get(app.assigned_employee_id) || `Staff ID: ${app.assigned_employee_id}`;
          }
          
          return {
            id: app.id,
            appointment_id: app.appointment_id,
            service_id: app.service_id,
            customer_name: app.customer_name,
            customer_phone: app.customer_phone,
            customer_email: app.customer_email,
            appointment_date: app.appointment_date,
            appointment_time: app.appointment_time,
            status: app.status,
            assigned_employee_id: app.assigned_employee_id,
            staff_name: staffName,
            service_name: app.service_name,
            duration_minutes: app.duration_minutes,
            price: app.price,
            created_at: app.created_at,
            updated_at: app.updated_at
          };
        });
        
        setAppointments(appointmentsWithStaff);
        
        const total = appointmentsWithStaff.length;
        const pending = appointmentsWithStaff.filter(a => a.status === 'pending').length;
        const completed = appointmentsWithStaff.filter(a => a.status === 'completed').length;
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = appointmentsWithStaff.filter(a => a.appointment_date === today).length;
        
        setStats([
          { ...stats[0], value: total.toString(), change: `+${total}`, changeType: 'up' },
          { ...stats[1], value: todayAppointments.toString(), change: `+${todayAppointments}`, changeType: 'up' },
          { ...stats[2], value: pending.toString(), change: `${pending}`, changeType: pending > 0 ? 'up' : 'down' },
          { ...stats[3], value: completed.toString(), change: `+${completed}`, changeType: 'up' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
    fetchBusinessSchedules();
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

  const handleDayClick = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    const schedule = getScheduleForDate(dateStr);
    
    setSelectedDay(day);
    setSelectedDateSchedule({
      date: dateStr,
      schedule: schedule
    });
    
    // Show options modal
    setShowModal(true);
  };

  const handleViewAppointments = () => {
    const dayAppointments = getAppointmentsForDay(selectedDay);
    setSelectedDayAppointments(dayAppointments);
    setShowModal(false);
    // Show appointments in a separate modal view
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

  const resetScheduleForm = () => {
    setScheduleFormData({
      business_date: '',
      open_time: '09:00',
      close_time: '17:00',
      is_open: true
    });
  };

  const handleEditClick = (appointment) => {
    setEditingAppointment(appointment);
    setEditFormData({
      appointment_time: appointment.appointment_time ? appointment.appointment_time.substring(0, 5) : '',
      assigned_employee_id: appointment.assigned_employee_id || '',
      status: appointment.status || 'pending',
      notes: appointment.notes || ''
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateAppointment = async () => {
    setIsUpdating(true);
    try {
      let formattedTime = editFormData.appointment_time;
      if (formattedTime && formattedTime.includes(':')) {
        formattedTime = `${formattedTime}:00`;
      }
      
      const updateData = {
        appointment_time: formattedTime,
        assigned_employee_id: editFormData.assigned_employee_id || null,
        status: editFormData.status,
        notes: editFormData.notes
      };
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === '') {
          delete updateData[key];
        }
      });
      
      console.log('Sending update data:', updateData);
      
      const response = await api.put(`/appointments/update/${editingAppointment.appointment_id}`, updateData);
      console.log('Appointment updated:', response.data);
      
      let updatedStaffName = 'Unassigned';
      if (editFormData.assigned_employee_id) {
        const selectedStaff = staffList.find(s => s.id == editFormData.assigned_employee_id);
        if (selectedStaff) {
          updatedStaffName = selectedStaff.name;
        } else {
          updatedStaffName = `Staff ID: ${editFormData.assigned_employee_id}`;
        }
      }
      
      setAppointments(prevAppointments => 
        prevAppointments.map(app => 
          app.appointment_id === editingAppointment.appointment_id 
            ? { 
                ...app, 
                appointment_time: formattedTime || app.appointment_time,
                status: editFormData.status,
                assigned_employee_id: editFormData.assigned_employee_id || null,
                staff_name: updatedStaffName
              }
            : app
        )
      );
      
      alert('Appointment updated successfully!');
      setShowEditModal(false);
      setEditingAppointment(null);
      
    } catch (error) {
      console.error('Error updating appointment:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.appointment_time?.[0] || 'Failed to update appointment';
      alert(errorMessage);
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

      {/* Calendar View - Schedule Based Highlight Only */}
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

      {/* Day Options Modal (Appointments or Edit Schedule) */}
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
            </div>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {showModal && selectedDayAppointments.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between sticky top-0">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Appointments for {formatFullDate(selectedDayAppointments[0]?.appointment_date)}
                </h2>
                <p className="text-pink-100 text-xs mt-0.5">{selectedDayAppointments.length} appointment(s)</p>
              </div>
              <button onClick={() => { setShowModal(false); setSelectedDayAppointments([]); setSelectedDay(null); }} className="text-white hover:bg-white/20 rounded-lg p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="space-y-3">
                {selectedDayAppointments.map((appointment) => (
                  <div key={appointment.id} className="bg-gray-50 rounded-lg p-3 hover:shadow-md transition-shadow">
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

                    <div className="grid grid-cols-2 gap-2 ml-10">
                      <div className="flex items-center gap-1.5">
                        <Scissors size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-600">{appointment.service_name || 'Service'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-600">{formatTime(appointment.appointment_time)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-600">Staff: {appointment.staff_name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-600">{appointment.duration_minutes} min</span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-200 ml-10">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-700">Total</span>
                        <span className="text-pink-600 font-bold text-sm">₱{parseFloat(appointment.price).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="mt-2 ml-10">
                      <button 
                        onClick={() => handleEditClick(appointment)}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-xs font-medium"
                      >
                        <Edit size={12} />
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
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

      {/* Edit Appointment Modal */}
      {showEditModal && editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-white">Edit Appointment</h2>
              <button 
                onClick={() => { setShowEditModal(false); setEditingAppointment(null); }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">Customer</label>
                  <input
                    type="text"
                    value={editingAppointment.customer_name || ''}
                    disabled
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">Service</label>
                  <input
                    type="text"
                    value={editingAppointment.service_name || ''}
                    disabled
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">Appointment Time *</label>
                  <input
                    type="time"
                    name="appointment_time"
                    value={editFormData.appointment_time}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">Assign Staff</label>
                  <select
                    name="assigned_employee_id"
                    value={editFormData.assigned_employee_id || ''}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">Select Staff</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">Appointment Status</label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={editFormData.notes || ''}
                    onChange={handleEditFormChange}
                    rows="2"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    placeholder="Add notes..."
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingAppointment(null); }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAppointment}
                  disabled={isUpdating}
                  className="flex-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Update
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-pink-50/30 transition-colors duration-200">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center">
                          <User size={12} className="text-pink-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{appointment.customer_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Scissors size={12} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{appointment.service_name}</span>
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
                        <button onClick={() => handleEditClick(appointment)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit size={14} className="text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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