import { useState, useEffect } from 'react';
import { 
  Calendar, Scissors, Plus, Filter,
  ChevronLeft, ChevronRight, Search,
  User, Clock, Phone, Edit, Trash2, MoreVertical,
  CheckCircle, XCircle, AlertCircle, Eye, X, Save
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
  const [selectedDay, setSelectedDay] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editFormData, setEditFormData] = useState({
    appointment_time: '',
    assigned_employee_id: '',
    status: '',
    service_status: '',
    notes: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

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

  // Fetch all appointments
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/all-appointments');
      console.log('Fetched appointments:', response.data);
      
      if (Array.isArray(response.data)) {
        // Transform the data to include staff info from transactions
        const appointmentsWithStaff = response.data.map(app => {
          // Get staff name from the transaction relationship
          let staffName = 'Unassigned';
          let assignedEmployeeId = null;
          
          if (app.transaction) {
            assignedEmployeeId = app.transaction.assigned_employee_id;
            
            // Try to get staff name from different possible locations
            if (app.transaction.user) {
              // If user relationship is loaded directly
              staffName = `${app.transaction.user.first_name || ''} ${app.transaction.user.last_name || ''}`.trim();
              if (!staffName) staffName = app.transaction.user.name || 'Staff';
            } else if (app.transaction.assigned_employee) {
              // Alternative relationship name
              staffName = `${app.transaction.assigned_employee.first_name || ''} ${app.transaction.assigned_employee.last_name || ''}`.trim();
              if (!staffName) staffName = app.transaction.assigned_employee.name || 'Staff';
            } else if (app.staff_name) {
              // If backend already provided staff_name
              staffName = app.staff_name;
            } else if (assignedEmployeeId) {
              // If we have ID but no name, try to find it in staffList
              const staff = staffList.find(s => s.id == assignedEmployeeId);
              if (staff) {
                staffName = staff.name;
              }
            }
          }
          
          return {
            ...app,
            assigned_employee_id: assignedEmployeeId,
            staff_name: staffName,
            service_status: app.transaction?.service_status || 'pending',
            transaction_notes: app.transaction?.notes,
            price: app.transaction?.services?.price || app.price || 0,
            service_name: app.transaction?.services?.name || app.service_name || 'Service',
            duration_minutes: app.transaction?.services?.duration_minutes || app.duration_minutes || 60
          };
        });
        
        setAppointments(appointmentsWithStaff);
        
        const total = appointmentsWithStaff.length;
        const pending = appointmentsWithStaff.filter(a => a.status === 'pending').length;
        const completed = appointmentsWithStaff.filter(a => a.status === 'completed').length;
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = appointmentsWithStaff.filter(a => a.appointment_date === today).length;
        
        setStats([
          { ...stats[0], value: total.toString(), change: `+${total}` },
          { ...stats[1], value: todayAppointments.toString(), change: `+${todayAppointments}` },
          { ...stats[2], value: pending.toString(), change: `-${pending}` },
          { ...stats[3], value: completed.toString(), change: `+${completed}` },
        ]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch staff list
  const fetchStaff = async () => {
    try {
      const response = await api.get('/staff');
      console.log('Fetched staff:', response.data);
      if (Array.isArray(response.data)) {
        setStaffList(response.data);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchStaff();
  }, []);

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

  const getDayStatus = (day) => {
    const count = getAppointmentsForDay(day).length;
    if (count >= 3) return 'busy';
    if (count >= 1) return 'moderate';
    return 'free';
  };

  const handleDayClick = (day) => {
    const dayAppointments = getAppointmentsForDay(day);
    if (dayAppointments.length > 0) {
      setSelectedDay(day);
      setSelectedDayAppointments(dayAppointments);
      setShowModal(true);
    }
  };

  const handleEditClick = (appointment) => {
    setEditingAppointment(appointment);
    setEditFormData({
      appointment_time: appointment.appointment_time || '',
      assigned_employee_id: appointment.assigned_employee_id || '',
      status: appointment.status || 'pending',
      service_status: appointment.service_status || 'pending',
      notes: appointment.notes || appointment.transaction_notes || ''
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
      // Format the time to include seconds (H:i:s format)
      let formattedTime = editFormData.appointment_time;
      if (formattedTime && !formattedTime.includes(':')) {
        formattedTime = formattedTime;
      } else if (formattedTime) {
        // Add seconds to the time (convert from H:i to H:i:s)
        formattedTime = `${formattedTime}:00`;
      }
      
      const updateData = {
        appointment_time: formattedTime,
        assigned_employee_id: editFormData.assigned_employee_id || null,
        status: editFormData.status,
        service_status: editFormData.service_status,
        notes: editFormData.notes
      };
      
      // Remove undefined or null values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === '') {
          delete updateData[key];
        }
      });
      
      console.log('Sending update data:', updateData);
      
      const response = await api.put(`/appointments/update/${editingAppointment.id}`, updateData);
      console.log('Appointment updated:', response.data);
      
      // Get the updated staff name from the response or find it in staffList
      let updatedStaffName = 'Unassigned';
      if (editFormData.assigned_employee_id) {
        const selectedStaff = staffList.find(s => s.id == editFormData.assigned_employee_id);
        if (selectedStaff) {
          updatedStaffName = selectedStaff.name;
        }
      }
      
      // Update the appointment in the local state immediately
      setAppointments(prevAppointments => 
        prevAppointments.map(app => 
          app.id === editingAppointment.id 
            ? { 
                ...app, 
                appointment_time: formattedTime || app.appointment_time,
                status: editFormData.status,
                service_status: editFormData.service_status,
                notes: editFormData.notes,
                assigned_employee_id: editFormData.assigned_employee_id || null,
                staff_name: updatedStaffName
              }
            : app
        )
      );
      
      // Also update the selected day appointments if the modal is open
      if (showModal && selectedDayAppointments.length > 0) {
        setSelectedDayAppointments(prev => 
          prev.map(app => 
            app.id === editingAppointment.id 
              ? { 
                  ...app, 
                  appointment_time: formattedTime || app.appointment_time,
                  status: editFormData.status,
                  service_status: editFormData.service_status,
                  notes: editFormData.notes,
                  assigned_employee_id: editFormData.assigned_employee_id || null,
                  staff_name: updatedStaffName
                }
              : app
          )
        );
      }
      
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

  const getServiceStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    if (status === 'confirmed') return <CheckCircle size={14} />;
    if (status === 'pending') return <AlertCircle size={14} />;
    if (status === 'completed') return <CheckCircle size={14} />;
    return null;
  };

  const getCalendarCellStyle = (status) => {
    const styles = {
      busy: 'bg-pink-50 border-pink-200 hover:bg-pink-100 cursor-pointer',
      moderate: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 cursor-pointer',
      free: 'bg-green-50 border-green-200 hover:bg-green-100'
    };
    return styles[status] || 'bg-white border-gray-200 hover:bg-gray-50';
  };

  const formatTime = (time) => {
    if (!time) return 'TBA';
    // Handle both H:i and H:i:s formats
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <stat.icon size={22} className="text-pink-600" />
              </div>
              <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                stat.changeType === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'calendar' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Calendar View
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
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
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm w-48"
            />
          </div>
          
          <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
            <option>All Services</option>
            <option>Haircut</option>
            <option>Hair Color</option>
            <option>Manicure</option>
            <option>Hair Rebound</option>
          </select>
          
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium">
            <Plus size={16} />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-lg font-semibold text-gray-800">{getCurrentMonthYear()}</h3>
              <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight size={20} />
              </button>
              <button onClick={goToCurrentMonth} className="px-3 py-1 text-sm bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100">
                Today
              </button>
            </div>
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-pink-100 rounded border border-pink-200"></div>
                <span className="text-gray-600">Busy (3+ apps)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-yellow-50 rounded border border-yellow-200"></div>
                <span className="text-gray-600">Moderate (1-2 apps)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-50 rounded border border-green-200"></div>
                <span className="text-gray-600">Available</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-7 gap-3 mb-4">
              {weekDays.map((day, index) => (
                <div key={index} className="text-center font-semibold text-gray-600 text-sm py-2">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-3">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="bg-gray-50 rounded-xl p-3 min-h-[110px] border border-gray-100"></div>;
                }
                
                const dayStatus = getDayStatus(day);
                const dayAppointments = getAppointmentsForDay(day);
                const hasAppointments = dayAppointments.length > 0;
                
                return (
                  <div 
                    key={day}
                    onClick={() => hasAppointments && handleDayClick(day)}
                    className={`${getCalendarCellStyle(dayStatus)} rounded-xl p-3 min-h-[110px] border transition-all duration-200 ${hasAppointments ? 'cursor-pointer hover:shadow-md' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold text-sm ${
                        dayStatus === 'busy' ? 'text-pink-700' : dayStatus === 'moderate' ? 'text-yellow-700' : 'text-green-700'
                      }`}>
                        {day}
                      </span>
                      {dayAppointments.length > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          dayStatus === 'busy' ? 'bg-pink-200 text-pink-800' : 
                          dayStatus === 'moderate' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
                        }`}>
                          {dayAppointments.length} app{dayAppointments.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {dayAppointments.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <div className="text-xs text-gray-600 truncate">
                          {dayAppointments[0]?.customer_name} - {formatTime(dayAppointments[0]?.appointment_time)}
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

      {/* Appointment Details Modal */}
      {showModal && selectedDayAppointments.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Appointments for {formatDate(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`)}
                </h2>
                <p className="text-pink-100 text-sm mt-1">{selectedDayAppointments.length} appointment(s) scheduled</p>
              </div>
              <button onClick={() => { setShowModal(false); setSelectedDayAppointments([]); setSelectedDay(null); }} className="text-white hover:bg-white/20 rounded-lg p-1">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {selectedDayAppointments.map((appointment) => (
                  <div key={appointment.id} className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center">
                          <User size={18} className="text-pink-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 text-lg">{appointment.customer_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone size={12} className="text-gray-400" />
                            <span className="text-xs text-gray-500">{appointment.customer_phone || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className={`px-3 py-1 rounded-full ${getStatusColor(appointment.status)}`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(appointment.status)}
                            <span className="text-xs font-semibold capitalize">{appointment.status}</span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full ${getServiceStatusColor(appointment.service_status)}`}>
                          <span className="text-xs font-semibold capitalize">{appointment.service_status?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 ml-12">
                      <div className="flex items-center gap-2">
                        <Scissors size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{appointment.service_name || 'Service'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{formatTime(appointment.appointment_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">Staff: {appointment.staff_name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">Duration: {appointment.duration_minutes} mins</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 ml-12">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">Total Amount</span>
                        <span className="text-pink-500 font-bold text-lg">₱{parseFloat(appointment.price).toLocaleString()}</span>
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="mt-2 ml-12">
                        <p className="text-xs text-gray-500 italic">Notes: {appointment.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3 ml-12">
                      <button 
                        onClick={() => handleEditClick(appointment)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <Edit size={14} />
                        Edit Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal - WIDER and BETTER FORMATTED */}
      {showEditModal && editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-auto overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-white">Edit Appointment</h2>
              <button 
                onClick={() => { setShowEditModal(false); setEditingAppointment(null); }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Customer</label>
                  <input
                    type="text"
                    value={editingAppointment.customer_name || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Service</label>
                  <input
                    type="text"
                    value={editingAppointment.service_name || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Appointment Time *</label>
                  <input
                    type="time"
                    name="appointment_time"
                    value={editFormData.appointment_time ? editFormData.appointment_time.substring(0, 5) : ''}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Select time (will be saved with seconds format)</p>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Assign Staff</label>
                  <select
                    name="assigned_employee_id"
                    value={editFormData.assigned_employee_id || ''}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">Select Staff</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name} - {staff.role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Appointment Status</label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Service Status</label>
                  <select
                    name="service_status"
                    value={editFormData.service_status}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingAppointment(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAppointment}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Update Appointment
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-pink-50/30 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center">
                          <User size={14} className="text-pink-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{appointment.customer_name || 'Customer'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Scissors size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{appointment.service_name || 'Service'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(appointment.appointment_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{formatTime(appointment.appointment_time)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{appointment.staff_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                        {getStatusIcon(appointment.status)}
                        {appointment.status?.charAt(0).toUpperCase() + appointment.status?.slice(1) || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getServiceStatusColor(appointment.service_status)}`}>
                        {appointment.service_status?.replace('_', ' ') || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-500">{appointment.customer_phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditClick(appointment)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                          <Edit size={16} className="text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-gray-500">Showing {filteredAppointments.length} of {appointments.length} appointments</p>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
              <button className="px-3 py-1.5 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600">1</button>
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">2</button>
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">3</button>
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredAppointments.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No appointments found</h3>
          <p className="text-gray-500 text-sm mb-4">Try adjusting your search or filter criteria</p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600">
            <Plus size={16} />
            <span>Create New Appointment</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Appointments;