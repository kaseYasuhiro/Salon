import { useState, useEffect } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { getToken } from '../services/auth-storage';

import { 
  Calendar, Scissors, Package, Users, 
  TrendingUp, CheckCircle, Clock, XCircle,
  Eye, LogOut, Menu, X, DollarSign,
  User, Phone, MapPin, Star, 
  ChevronRight, Activity, PieChart,
  AlertCircle, Bell, Search, Crown,
  FileText, // Added for Reports icon
  Box, // Added for Products icon
  BarChart3 // Added for Sales icon
} from 'lucide-react';
import { useAuth } from "../contexts/auth-context";
import api from '../api/axios';

function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
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
  
  // Appointment status counts - using real data
  const [appointmentStatusCounts, setAppointmentStatusCounts] = useState({
    confirmed: 0,
    pending: 0,
    completed: 0,
    cancelled: 0
  });
  
  // Remittance states
  const [remittances, setRemittances] = useState([]);
  const [weeklyRemittanceData, setWeeklyRemittanceData] = useState([]);
  const [totalWeeklyRemittance, setTotalWeeklyRemittance] = useState(0);

  useEffect(() => {
    const storedToken = getToken();
    setToken(storedToken);
    
    console.log('User from store:', user);
    console.log('Token from storage:', storedToken);
    
    if (!user || !storedToken) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token || !user || (user.role !== 'admin' && user.role !== 'owner')) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch all appointments
  const fetchAllAppointments = async () => {
    try {
      const response = await api.get('/all-appointments');
      console.log('All appointments:', response.data);
      
      if (Array.isArray(response.data)) {
        // Count appointments by status
        const counts = {
          confirmed: 0,
          pending: 0,
          completed: 0,
          cancelled: 0
        };
        
        response.data.forEach(app => {
          if (app.status === 'confirmed') counts.confirmed++;
          else if (app.status === 'pending') counts.pending++;
          else if (app.status === 'completed') counts.completed++;
          else if (app.status === 'cancelled') counts.cancelled++;
        });
        
        setAppointmentStatusCounts(counts);
        console.log('Appointment status counts:', counts);
        
        // Filter completed appointments
        const completed = response.data.filter(app => app.status === 'completed');
        
        // Get last 5 completed appointments
        const recentCompleted = completed.slice(0, 5);
        setRecentCompletedAppointments(recentCompleted);
        
        // Update stats
        setDashboardStats(prev => ({
          ...prev,
          totalAppointments: response.data.length
        }));
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  // Fetch services count
  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      console.log('Services:', response.data);
      if (Array.isArray(response.data)) {
        const activeServices = response.data.filter(s => s.service_status === 'active').length;
        setDashboardStats(prev => ({
          ...prev,
          activeServices: activeServices
        }));
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  // Fetch inventory count
  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      console.log('Inventory:', response.data);
      if (Array.isArray(response.data)) {
        setDashboardStats(prev => ({
          ...prev,
          inventoryItems: response.data.length
        }));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  // Fetch staff count
  const fetchStaff = async () => {
    try {
      const response = await api.get('/employees');
      console.log('Staff:', response.data);
      if (Array.isArray(response.data)) {
        setDashboardStats(prev => ({
          ...prev,
          staffMembers: response.data.length
        }));
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  // Fetch feedbacks
  const fetchFeedbacks = async () => {
    try {
      const response = await api.get('/feedbacks');
      console.log('Feedbacks:', response.data);
      if (Array.isArray(response.data)) {
        setFeedbacks(response.data);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    }
  };

  // Fetch remittances
  const fetchRemittances = async () => {
    try {
      const response = await api.get('/remittance');
      console.log('Remittances:', response.data);
      if (Array.isArray(response.data)) {
        setRemittances(response.data);
        processWeeklyRemittances(response.data);
      }
    } catch (error) {
      console.error('Error fetching remittances:', error);
    }
  };

  // Process remittances for weekly view
  const processWeeklyRemittances = (data) => {
    // Get last 7 days (including today)
    const days = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        dayName: dayNames[date.getDay()],
        amount: 0,
        hasRemittance: false
      });
    }
    
    // Map remittances to days
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
    
    // Calculate total weekly remittance
    const total = days.reduce((sum, day) => sum + day.amount, 0);
    setTotalWeeklyRemittance(total);
  };

  // Get feedback for a specific appointment
  const getFeedbackForAppointment = (appointmentId) => {
    return feedbacks.find(f => f.appointment_id === appointmentId);
  };

  // Fetch all data on mount
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchAllAppointments(),
        fetchServices(),
        fetchInventory(),
        fetchStaff(),
        fetchFeedbacks(),
        fetchRemittances()
      ]);
      setIsLoading(false);
    };
    
    fetchAllData();
  }, []);

  // Check current routes
  const isDashboardRoute = location.pathname === '/dashboard';
  const isAppointmentsRoute = location.pathname === '/dashboard/appointments' || location.pathname === '/dashboard/appointments/list' || location.pathname.startsWith('/dashboard/appointments/');
  const isServicesRoute = location.pathname === '/dashboard/services';
  const isEmployeesRoute = location.pathname === '/dashboard/employees';
  const isInventoryRoute = location.pathname === '/dashboard/inventory';
  const isReportsRoute = location.pathname === '/dashboard/reports';
  const isProductsRoute = location.pathname === '/dashboard/products';
  const isSalesRoute = location.pathname === '/dashboard/sales';

  const isNestedRoute = isAppointmentsRoute || isServicesRoute || isEmployeesRoute || isInventoryRoute || isReportsRoute || isProductsRoute || isSalesRoute;

  const stats = [
    { label: 'Total Appointments', value: dashboardStats.totalAppointments.toString(), icon: Calendar, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-600', trend: '+12%' },
    { label: 'Active Services', value: dashboardStats.activeServices.toString(), icon: Scissors, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-600', trend: '+5%' },
    { label: 'Inventory Items', value: dashboardStats.inventoryItems.toString(), icon: Package, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', textColor: 'text-green-600', trend: '-3%' },
    { label: 'Staff Members', value: dashboardStats.staffMembers.toString(), icon: Users, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-600', trend: '+0%' },
  ];

  // Get appointment status counts from real data
  const getAppointmentStatusCounts = () => {
    const total = dashboardStats.totalAppointments || 1; // Prevent division by zero
    
    return [
      { 
        label: 'Confirmed', 
        count: appointmentStatusCounts.confirmed, 
        color: 'bg-green-500', 
        icon: CheckCircle, 
        bgColor: 'bg-green-50', 
        textColor: 'text-green-700',
        percentage: total > 0 ? Math.round((appointmentStatusCounts.confirmed / total) * 100) : 0
      },
      { 
        label: 'Pending', 
        count: appointmentStatusCounts.pending, 
        color: 'bg-yellow-500', 
        icon: Clock, 
        bgColor: 'bg-yellow-50', 
        textColor: 'text-yellow-700',
        percentage: total > 0 ? Math.round((appointmentStatusCounts.pending / total) * 100) : 0
      },
      { 
        label: 'Completed', 
        count: appointmentStatusCounts.completed, 
        color: 'bg-blue-500', 
        icon: CheckCircle, 
        bgColor: 'bg-blue-50', 
        textColor: 'text-blue-700',
        percentage: total > 0 ? Math.round((appointmentStatusCounts.completed / total) * 100) : 0
      },
      { 
        label: 'Cancelled', 
        count: appointmentStatusCounts.cancelled, 
        color: 'bg-red-500', 
        icon: XCircle, 
        bgColor: 'bg-red-50', 
        textColor: 'text-red-700',
        percentage: total > 0 ? Math.round((appointmentStatusCounts.cancelled / total) * 100) : 0
      },
    ];
  };

  const appointmentStatus = getAppointmentStatusCounts();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.log("Logout Error.", error);
      navigate('/');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  // Appointment Details Modal - UPDATED: Removed service_status
  const AppointmentModal = () => {
    if (!selectedAppointment) return null;
    
    const feedback = getFeedbackForAppointment(selectedAppointment.id);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] overflow-y-auto scrollbar-hide">
          <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between sticky top-0">
            <h2 className="text-lg font-bold text-white">Appointment Details</h2>
            <button onClick={closeModal} className="text-white hover:bg-white/20 rounded-lg p-1">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-5">
            {/* Customer Information */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <User size={16} className="text-pink-500" />
                Customer Information
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Name:</span> {selectedAppointment.customer_name}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Phone:</span> {selectedAppointment.customer_phone || 'N/A'}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Email:</span> {selectedAppointment.customer_email || 'N/A'}
                </p>
              </div>
            </div>
            
            {/* Appointment Details */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-pink-500" />
                Appointment Details
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Service:</span> {selectedAppointment.service_name || 'N/A'}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Date:</span> {formatDate(selectedAppointment.appointment_date)}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Time:</span> {formatTime(selectedAppointment.appointment_time)}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Duration:</span> {selectedAppointment.duration_minutes} mins
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getStatusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status}
                  </span>
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Total Amount:</span>
                  <span className="ml-2 text-pink-600 font-bold">₱{parseFloat(selectedAppointment.price || 0).toLocaleString()}</span>
                </p>
              </div>
            </div>
            
            {/* Customer Feedback */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Star size={16} className="text-yellow-500" />
                Customer Feedback
              </h3>
              <div className="bg-gray-50 rounded-lg p-3">
                {feedback ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={star <= feedback.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{feedback.rating}/5</span>
                    </div>
                    {feedback.comments && (
                      <p className="text-sm text-gray-600 italic">"{feedback.comments}"</p>
                    )}
                    {!feedback.comments && (
                      <p className="text-sm text-gray-500 italic">No comments provided</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No feedback yet for this appointment</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-md transition-all duration-300 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render dashboard content
  const renderDashboardContent = () => (
    <>
      {/* Stats Grid - Smaller Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <stat.icon className={`${stat.textColor}`} size={16} />
              </div>
              <span className={`text-[10px] font-semibold ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'} bg-green-50 px-1.5 py-0.5 rounded-full`}>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-gray-500 text-xs font-medium">{stat.label}</h3>
            <p className="text-xl font-bold text-gray-800 mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Weekly Revenue / Remittance - Compact */}
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Weekly Remittance</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Last 7 days remitted profits</p>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="text-green-500" size={16} />
              <span className="text-xs font-semibold text-gray-700">₱{totalWeeklyRemittance.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-3">
            {weeklyRemittanceData.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No remittance data available</p>
              </div>
            ) : (
              weeklyRemittanceData.map((day, index) => (
                <div key={day.dayName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-gray-600">
                      {day.dayName}
                      <span className="text-[10px] text-gray-400 ml-1">
                        {day.hasRemittance ? '✓' : ''}
                      </span>
                    </span>
                    <span className={`font-bold ${day.amount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {day.amount > 0 ? `₱${day.amount.toFixed(0)}` : '—'}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                          day.amount > 0 
                            ? 'bg-gradient-to-r from-green-500 to-green-600' 
                            : 'bg-gray-200'
                        }`}
                        style={{ 
                          width: day.amount > 0 
                            ? `${Math.min((day.amount / Math.max(...weeklyRemittanceData.map(d => d.amount))) * 100, 100)}%` 
                            : '0%' 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Appointment Status - Compact */}
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Appointment Status</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Current overview</p>
            </div>
            <PieChart size={16} className="text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {appointmentStatus.map((status, index) => (
              <div 
                key={index} 
                onClick={() => navigate('/dashboard/appointments')}
                className={`${status.bgColor} rounded-lg p-3 transition-all hover:scale-105 duration-300 cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`${status.color} p-1.5 rounded-lg text-white`}>
                    <status.icon size={12} />
                  </div>
                  <span className="text-lg font-bold text-gray-800">{status.count}</span>
                </div>
                <p className={`${status.textColor} font-semibold text-xs`}>{status.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {dashboardStats.totalAppointments > 0 
                    ? `${status.percentage}% of total` 
                    : '0% of total'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Appointments Table - Without Staff Column */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Recent Completed Appointments</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Latest customer bookings</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent w-36"
              />
            </div>
            <Link 
              to="/dashboard/appointments"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-md transition-all duration-300 text-xs font-medium"
            >
              <Eye size={12} />
              <span>View All</span>
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">
                    Loading appointments...
                  </td>
                </tr>
              ) : recentCompletedAppointments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">
                    No completed appointments found
                  </td>
                </tr>
              ) : (
                recentCompletedAppointments.map((appointment) => {
                  const feedback = getFeedbackForAppointment(appointment.id);
                  return (
                    <tr 
                      key={appointment.id} 
                      onClick={() => handleAppointmentClick(appointment)}
                      className="hover:bg-pink-50/30 transition-colors duration-200 group cursor-pointer"
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <User size={11} className="text-pink-600" />
                          </div>
                          <div className="ml-2">
                            <p className="text-xs font-semibold text-gray-900">{appointment.customer_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Scissors size={11} className="text-gray-400" />
                          <span className="text-xs text-gray-600">{appointment.service_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-xs text-gray-600">{formatDate(appointment.appointment_date)}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-gray-400" />
                          <span className="text-xs text-gray-600">{formatTime(appointment.appointment_time)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {feedback ? (
                          <div className="flex items-center gap-0.5">
                            <Star size={11} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-semibold text-gray-700">{feedback.rating}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No rating</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-500">
              Showing {recentCompletedAppointments.length} of {dashboardStats.totalAppointments} appointments
            </p>
            <Link 
              to="/dashboard/appointments"
              className="flex items-center gap-0.5 text-[10px] text-pink-600 hover:text-pink-700 font-medium"
            >
              <span>View All</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Appointment Details Modal */}
      {showModal && <AppointmentModal />}
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Compact */}
      <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
                  Reshel Oco Hair Salon
                </h2>
                <p className="text-[10px] text-gray-500 mt-0.5">Salon Management System</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="mt-3 p-2.5 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Crown size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Logged in as</p>
                  <p className="text-xs font-semibold text-gray-800">Owner</p>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            <Link 
              to="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isDashboardRoute 
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Activity size={18} />
              <span>Dashboard</span>
            </Link>
            <Link 
              to="/dashboard/appointments"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isAppointmentsRoute 
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar size={18} />
              <span>Appointments</span>
            </Link>
            <Link 
              to="/dashboard/services"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isServicesRoute
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Scissors size={18} />
              <span>Services</span>
            </Link>
            <Link 
              to="/dashboard/inventory"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isInventoryRoute
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Package size={18} />
              <span>Inventory</span>
            </Link>
            <Link 
              to="/dashboard/products"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isProductsRoute
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Box size={18} />
              <span>Products</span>
            </Link>
            <Link 
              to="/dashboard/employees"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isEmployeesRoute                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users size={18} />
              <span>Employees</span>
            </Link>
            {/* Reports Link */}
            <Link 
              to="/dashboard/reports"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isReportsRoute
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText size={18} />
              <span>Reports</span>
            </Link>
            {/* Sales Link */}
            <Link 
              to="/dashboard/sales"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isSalesRoute
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BarChart3 size={18} />
              <span>Transactions</span>
            </Link>
          </nav>

          <div className="p-3 border-t border-gray-100">
            <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all text-sm">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header - Compact */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 border-b border-gray-100">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
                  <Menu size={20} className="text-gray-600" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-gray-800">
                    {isAppointmentsRoute && 'Appointments'}
                    {isServicesRoute && 'Services'}
                    {isEmployeesRoute && 'Employees'}
                    {isInventoryRoute && 'Inventory'}
                    {isProductsRoute && 'Products'}
                    {isReportsRoute && 'Reports'}
                    {isSalesRoute && 'Sales'}
                    {isDashboardRoute && 'Dashboard'}
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    {isAppointmentsRoute && 'Manage and schedule client appointments'}
                    {isServicesRoute && 'Browse and manage salon services'}
                    {isEmployeesRoute && 'Manage your team members'}
                    {isInventoryRoute && 'Track and manage salon inventory'}
                    {isProductsRoute && 'Manage salon products'}
                    {isReportsRoute && 'View and manage incident reports'}
                    {isSalesRoute && 'View sales performance and revenue statistics'}
                    {isDashboardRoute && 'Welcome back! Here\'s your overview'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="relative p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                  <Bell size={18} />
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                </button>
                <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                  <div className="w-7 h-7 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-gray-800">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-[10px] text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-4 sm:p-5 lg:p-6">
          {isNestedRoute ? (
            <Outlet />
          ) : (
            renderDashboardContent()
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;